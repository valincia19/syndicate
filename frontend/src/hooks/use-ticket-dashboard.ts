'use client'

import { useEffect, useRef, useCallback } from 'react'
import { tokenManager } from '@/lib/api'

/**
 * useTicketDashboard - Lightweight WebSocket hook for ticket LIST pages.
 *
 * Connects to the WS server as a "dashboard" subscriber so it receives
 * new_message and status_update events for ALL tickets the user has access
 * to, without subscribing to each one individually.
 *
 * @param onUpdate - Called with { ticketId, type, data } when an event arrives.
 */

const PROTOCOL_CHANNEL = 'ticket-ws.v1'
// ponytail: default to 4s base delay for lazy reconnects to prevent rate-limit spamming
const RECONNECT_BASE_MS = 4000
const RECONNECT_MAX_MS = 30_000
const MAX_ATTEMPTS = 5

interface DashboardEvent {
  type: string
  ticketId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

export function useTicketDashboard(
  onUpdate?: (event: DashboardEvent) => void
) {
  const onUpdateRef = useRef(onUpdate)

  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  const wsRef = useRef<WebSocket | null>(null)
  const mountedRef = useRef(true)
  const tokenWatchRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptRef = useRef(0)

  const connectRef = useRef<() => void>(() => {})

  const connect = useCallback(() => {
    if (!mountedRef.current) return

    // Clean up existing
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.onopen = null
      wsRef.current.onmessage = null
      wsRef.current.onclose = null
      wsRef.current.onerror = null
      wsRef.current.close()
      wsRef.current = null
    }

    const token = tokenManager.getToken()
    if (!token) {
      // Token not ready yet - retry
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
            if (tokenWatchRef.current) {
              clearInterval(tokenWatchRef.current)
              tokenWatchRef.current = null
            }
            connectRef.current()
          }
        }, 250)
      }
      return
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
    let wsUrl: string
    if (apiUrl) {
      const wsProtocol = apiUrl.startsWith('https') ? 'wss:' : 'ws:'
      const host = apiUrl.replace(/^https?:\/\//, '')
      wsUrl = `${wsProtocol}//${host}/ws`
    } else {
      const locProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      wsUrl = `${locProtocol}//${window.location.host}/ws`
    }

    // Append token as query parameter to bypass Cloudflare/Nginx subprotocol header constraints
    wsUrl = `${wsUrl}?token=${encodeURIComponent(token)}`

    try {
      const ws = new WebSocket(wsUrl, [`${PROTOCOL_CHANNEL}`])
      wsRef.current = ws

      ws.onopen = () => {
        attemptRef.current = 0
        // Subscribe to the dashboard channel
        ws.send(JSON.stringify({ type: 'subscribe_dashboard' }))
      }

      ws.onmessage = (event: MessageEvent) => {
        let parsed: DashboardEvent
        try {
          parsed = JSON.parse(event.data)
        } catch {
          return
        }

        // Forward relevant events to the callback
        if (
          (parsed.type === 'new_message' || parsed.type === 'status_update') &&
          parsed.ticketId
        ) {
          onUpdateRef.current?.(parsed)
        }
      }

      ws.onclose = () => {
        // Don't reconnect if unmounted
        if (!mountedRef.current) return

        if (attemptRef.current >= MAX_ATTEMPTS) {
          return
        }

        // ponytail: same backoff formula as useTicketSocket
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
        // onclose will follow
      }
    } catch {
      // Connection failed, retry with backoff
      const delay = Math.min(
        RECONNECT_BASE_MS * Math.pow(2, attemptRef.current),
        RECONNECT_MAX_MS
      )
      attemptRef.current++
      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connectRef.current()
      }, delay)
    }
  }, [])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    mountedRef.current = true
    attemptRef.current = 0
    connect()

    return () => {
      mountedRef.current = false
      if (tokenWatchRef.current) {
        clearInterval(tokenWatchRef.current)
        tokenWatchRef.current = null
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.onerror = null
        wsRef.current.onmessage = null
        wsRef.current.close(1000, 'Component unmounted')
        wsRef.current = null
      }
    }
  }, [connect])
}
