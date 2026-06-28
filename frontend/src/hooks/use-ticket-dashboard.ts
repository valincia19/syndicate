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

  const connectRef = useRef<() => void>(() => {})

  const connect = useCallback(() => {
    if (!mountedRef.current) return

    // Clean up existing
    if (wsRef.current) {
      wsRef.current.onopen = null
      wsRef.current.onmessage = null
      wsRef.current.onclose = null
      wsRef.current.onerror = null
      wsRef.current.close()
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

    try {
      const ws = new WebSocket(wsUrl, [`${PROTOCOL_CHANNEL}`, `bearer_${token}`])
      wsRef.current = ws

      ws.onopen = () => {
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
        // Retry after a delay
        setTimeout(() => {
          connectRef.current()
        }, 5000)
      }

      ws.onerror = () => {
        // onclose will follow
      }
    } catch {
      // Connection failed, retry later
      setTimeout(() => {
        if (mountedRef.current) connectRef.current()
      }, 5000)
    }
  }, [])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false

      if (tokenWatchRef.current) {
        clearInterval(tokenWatchRef.current)
        tokenWatchRef.current = null
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
