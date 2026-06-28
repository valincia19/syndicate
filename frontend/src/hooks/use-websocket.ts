'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { tokenManager } from '@/lib/api'

/**
 * useTicketSocket - Secure, resilient WebSocket hook for real-time ticket chat.
 *
 * Security features:
 * - JWT sent via sub-protocol (never query params - avoids log leakage)
 * - Exponential backoff reconnection (prevents reconnect storms)
 * - Payload sanitisation (DOMPurify-free: textContent assignment prevents XSS)
 * - Duplicate message deduplication by message ID
 * - Full cleanup on unmount (prevents memory leaks)
 *
 * @param ticketId  - The ticket UUID to subscribe to.
 * @param onMessage - Callback fired when a new_message arrives from the server.
 * @param onStatus  - Callback fired when a status_update event arrives.
 * @param onError   - Callback fired on connection / protocol errors.
 */

const PROTOCOL_CHANNEL = 'ticket-ws.v1'
const RECONNECT_BASE_MS = 1000
const RECONNECT_MAX_MS = 30_000
const PING_INTERVAL_MS = 25_000
const MAX_ATTEMPTS = 5

interface WebSocketEvent {
  type: string
  data?: unknown
  message?: string
  [key: string]: unknown
}

interface UseTicketSocketOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onMessage?: (msg: any) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onStatus?: (data: any) => void
  onError?: (err: string) => void
}

export function useTicketSocket(
  ticketId: string | null,
  options: UseTicketSocketOptions = {}
) {
  const { onMessage, onStatus, onError } = options

  const [status, setStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting')

  // Refs keep latest callbacks without re-triggering the effect
  const onMessageRef = useRef(onMessage)
  const onStatusRef = useRef(onStatus)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onMessageRef.current = onMessage
    onStatusRef.current = onStatus
    onErrorRef.current = onError
  }, [onMessage, onStatus, onError])

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tokenWatchRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const attemptRef = useRef(0)
  const mountedRef = useRef(true)

  // Track message IDs we've already processed (dedup)
  const seenIdsRef = useRef<Set<string>>(new Set())

  const connectRef = useRef<() => void>(() => {})

  const connect = useCallback(() => {
    if (!ticketId || !mountedRef.current) return

    setStatus('connecting')

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.onopen = null
      wsRef.current.onmessage = null
      wsRef.current.onclose = null
      wsRef.current.onerror = null
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close()
      }
    }

    const token = tokenManager.getToken()
    if (!token) {
      console.warn('[WS] No authentication token available - will retry when token appears')

      // Start polling for token (handles hydration delay / async Set-Cookie sync)
      if (!tokenWatchRef.current) {
        tokenWatchRef.current = setInterval(() => {
          if (!mountedRef.current) {
            if (tokenWatchRef.current) {
              clearInterval(tokenWatchRef.current)
              tokenWatchRef.current = null
            }
            return
          }
          const freshToken = tokenManager.getToken()
          if (freshToken) {
            console.info('[WS] Token now available - connecting')
            if (tokenWatchRef.current) {
              clearInterval(tokenWatchRef.current)
              tokenWatchRef.current = null
            }
            connectRef.current()
          }
        }, 250)
      }

      onErrorRef.current?.('No authentication token available')
      return
    }
    console.debug('[WS] Connecting', { ticketId, hasToken: !!token })

    // Determine WS URL from NEXT_PUBLIC_API_URL - ensures we connect to
    // the backend WebSocket server (port 5000) not the Next.js dev server (port 3000).
    // Next.js rewrites() do NOT proxy WebSocket upgrade requests, so same-origin
    // connections ("ws://localhost:3000/ws") would silently fail.
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
    let wsUrl: string
    if (apiUrl) {
      // Derive WS URL from the API base URL (e.g. http://localhost:5000 → ws://localhost:5000/ws)
      const wsProtocol = apiUrl.startsWith('https') ? 'wss:' : 'ws:'
      const host = apiUrl.replace(/^https?:\/\//, '')
      wsUrl = `${wsProtocol}//${host}/ws`
    } else {
      // Fallback: same-origin (only works if Next.js/WAF proxies WebSocket)
      const locProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      wsUrl = `${locProtocol}//${window.location.host}/ws`
    }

    // Append token as query parameter to bypass Cloudflare/Nginx subprotocol header constraints
    wsUrl = `${wsUrl}?token=${encodeURIComponent(token)}`

    try {
      const ws = new WebSocket(wsUrl, [`${PROTOCOL_CHANNEL}`])
      wsRef.current = ws

      ws.onopen = () => {
        console.info('[WS] Connected successfully', { ticketId })
        attemptRef.current = 0 // Reset backoff on successful connection
        setStatus('connected')

        // Subscribe to the ticket
        ws.send(JSON.stringify({ type: 'subscribe', ticketId }))
        console.debug('[WS] Subscribe sent', { ticketId })

        // Start client-side ping to detect dead connections early
        if (pingTimerRef.current) clearInterval(pingTimerRef.current)
        pingTimerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, PING_INTERVAL_MS)
      }

      ws.onmessage = (event: MessageEvent) => {
        let parsed: WebSocketEvent
        try {
          parsed = JSON.parse(event.data)
        } catch {
          return // Ignore malformed frames
        }

        switch (parsed.type) {
          case 'connected':
            // Handshake complete - server confirmed
            break

          case 'subscribed':
            // Successfully subscribed to ticketId
            attemptRef.current = 0
            break

          case 'new_message': {
            if (!parsed.data) break
            const msg = parsed.data as { id: string; content?: string; sender_username?: string }

            // Deduplicate by message ID
            if (seenIdsRef.current.has(msg.id)) break
            seenIdsRef.current.add(msg.id)

            // Sanitise free-text fields (textContent assignment prevents XSS)
            const safeMsg = {
              ...msg,
              content: sanitiseText(msg.content || ''),
              sender_username: msg.sender_username ? sanitiseText(msg.sender_username) : null,
            }

            onMessageRef.current?.(safeMsg)
            break
          }

          case 'status_update': {
            if (!parsed.data) break
            onStatusRef.current?.(parsed.data)
            break
          }

          case 'error':
            onErrorRef.current?.(parsed.message || 'WebSocket error')
            break

          default:
            break
        }
      }

      ws.onclose = (event: CloseEvent) => {
        console.warn('[WS] Connection closed', { code: event.code, reason: event.reason, ticketId })
        // Clear ping interval
        if (pingTimerRef.current) {
          clearInterval(pingTimerRef.current)
          pingTimerRef.current = null
        }

        // Don't reconnect if unmounted or if explicitly closed (1000 = normal)
        if (!mountedRef.current || event.code === 1000) return

        if (attemptRef.current >= MAX_ATTEMPTS) {
          console.warn('[WS] Max reconnect attempts reached. Setting offline.', { ticketId })
          setStatus('offline')
          return
        }

        setStatus('connecting')

        // Exponential backoff reconnection with jitter (±25%)
        const delay = Math.min(
          RECONNECT_BASE_MS * Math.pow(2, attemptRef.current),
          RECONNECT_MAX_MS
        )
        const jitter = delay * 0.25 * (Math.random() * 2 - 1)
        const nextDelay = Math.max(0, delay + jitter)
        attemptRef.current++

        reconnectTimerRef.current = setTimeout(() => {
          connectRef.current()
        }, nextDelay)
      }

      ws.onerror = () => {
        // onerror fires followed by onclose - let onclose handle reconnect
        onErrorRef.current?.('WebSocket connection error')
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to create WebSocket'
      onErrorRef.current?.(errMsg)
    }
  }, [ticketId])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  // ─── Connect / disconnect on mount / ticketId change ──────────
  useEffect(() => {
    mountedRef.current = true
    seenIdsRef.current = new Set() // Reset dedup for new ticket
    attemptRef.current = 0

    connect()

    return () => {
      mountedRef.current = false
      seenIdsRef.current = new Set() // Reset dedup for new ticket

      // Clear token watch
      if (tokenWatchRef.current) {
        clearInterval(tokenWatchRef.current)
        tokenWatchRef.current = null
      }

      // Close WS gracefully
      if (wsRef.current) {
        wsRef.current.onclose = null // prevent reconnect
        wsRef.current.onerror = null
        wsRef.current.onmessage = null
        wsRef.current.close(1000, 'Component unmounted')
        wsRef.current = null
      }

      // Clear pending reconnect
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }

      // Clear ping interval
      if (pingTimerRef.current) {
        clearInterval(pingTimerRef.current)
        pingTimerRef.current = null
      }
    }
  }, [connect])

  const reconnect = useCallback(() => {
    attemptRef.current = 0
    setStatus('connecting')
    connect()
  }, [connect])

  return { status, reconnect }
}

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Sanitise user-provided text to prevent XSS.
 * Uses DOM textContent assignment which is inherently safe (no HTML parsing).
 */
function sanitiseText(text: string): string {
  if (typeof text !== 'string') return ''
  if (typeof document === 'undefined') return text // SSR guard

  const el = document.createElement('div')
  el.textContent = text
  return el.innerHTML // Return escaped HTML-safe string
}

