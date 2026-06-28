/**
 * Centralized Type-Safe API Client
 *
 * BASE_URL is intentionally empty - all /v1/* requests are proxied
 * through Next.js rewrites (next.config.ts) to the backend.
 * This makes every request same-origin so cookies always travel correctly.
 */

import { logger } from './logger'
import { obfuscate, deobfuscate } from './obfuscate'

// Empty = same-origin proxy via next.config.ts → http://localhost:5000
// In production, set NEXT_PUBLIC_API_URL to the real backend URL.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || ""

// Persistent token store - backed by localStorage so it survives page reloads.
// The httpOnly cookie (auth_token) cannot be read by JS, so we mirror the JWT
// here for two purposes: Authorization header on REST calls, and sub-protocol
// authentication on WebSocket upgrade. Clearing on logout/signout keeps this safe.
const LS_TOKEN_KEY = 'valinc_jwt'
let inMemoryToken: string | null = null

export const tokenManager = {
  setToken(token: string) {
    inMemoryToken = token
    try { localStorage.setItem(LS_TOKEN_KEY, obfuscate(token)) } catch { /* storage full / disabled */ }
  },
  getToken(): string | null {
    if (inMemoryToken) return inMemoryToken
    // Hydrate from localStorage on first call after page reload
    try {
      const stored = localStorage.getItem(LS_TOKEN_KEY)
      if (stored) {
        const token = deobfuscate(stored)
        inMemoryToken = token
        return token
      }
    } catch { /* SSR or storage unavailable */ }
    return null
  },
  clearToken() {
    inMemoryToken = null
    try { localStorage.removeItem(LS_TOKEN_KEY) } catch { /* ignore */ }
  },
  /** Re-hydrate token from localStorage on app mount (called once in layout). */
  init() {
    if (!inMemoryToken) {
      try {
        const stored = localStorage.getItem(LS_TOKEN_KEY)
        if (stored) inMemoryToken = deobfuscate(stored)
      } catch { /* ignore */ }
    }
  },
}

export interface ApiErrorResponse {
  status: string
  statusCode: number
  message: string
  error?: unknown
}

export class ApiError extends Error {
  statusCode: number
  status: string
  details?: unknown

  constructor(message: string, statusCode: number, status: string, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.statusCode = statusCode
    this.status = status
    this.details = details
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = tokenManager.getToken()

  const headers = new Headers(options.headers)
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  // Send token as Authorization header if available (right after login before reload)
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const config: RequestInit = {
    ...options,
    headers,
    // same-origin proxy - credentials still needed so Next.js forwards cookies to backend
    credentials: "include",
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config)

    if (response.status === 204) {
      return {} as T
    }

    let data: unknown
    try {
      data = await response.json()
    } catch {
      data = {}
    }

    if (!response.ok) {
      const dataObj = data as { message?: string; status?: string } | null
      const msg = String(dataObj?.message || '').toLowerCase()

      const isSuspendedOrDeleted = msg.includes('suspend') || msg.includes('no longer exist') || msg.includes('account');
      if (response.status === 401 || (response.status === 403 && isSuspendedOrDeleted)) {
        tokenManager.clearToken()

        const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
        const isProtectedRoute = 
          pathname.startsWith('/portal') || 
          pathname.startsWith('/studio') || 
          pathname.startsWith('/verify')

        if (typeof window !== 'undefined' && isProtectedRoute) {
          let reason = 'expired'
          if (msg.includes('suspend')) {
            reason = 'suspended'
          } else if (msg.includes('no longer exist') || msg.includes('not found')) {
            reason = 'deleted'
          }

          try {
            localStorage.removeItem('auth_user')
            localStorage.removeItem(LS_TOKEN_KEY)
          } catch { /* ignore storage errors */ }

          window.location.href = `/login?reason=${reason}`
        }
      }

      throw new ApiError(
        dataObj?.message || `Request failed with status ${response.status}`,
        response.status,
        dataObj?.status || "error",
        dataObj
      )
    }

    // ── Auto-sync JWT from Set-Cookie to localStorage ──────────
    // When the backend sets/refreshes the httpOnly auth_token cookie
    // (login, register, or any endpoint that re-issues the cookie),
    // extract the token value and persist it so WebSocket auth via
    // sub-protocol (which needs the raw JWT) keeps working across
    // page reloads without requiring a re-login.
    try {
      const setCookie = response.headers.get('Set-Cookie')
      if (setCookie) {
        const match = setCookie.match(/auth_token=([^;]+)/)
        if (match) {
          const cookieToken = decodeURIComponent(match[1])
          // Only persist if we don't already have a token in memory
          // (avoids unnecessary localStorage writes on every request)
          if (cookieToken && !tokenManager.getToken()) {
            tokenManager.setToken(cookieToken)
          }
        }
      }
    } catch {
      // Silently ignore header parsing errors
    }

    return data as T
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error
    const errMessage = error instanceof Error ? error.message : "Network connection error"
    logger.error('API:NETWORK', 'Network or fetch failure', { endpoint, message: errMessage })
    throw new ApiError(errMessage, 500, "error")
  }
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { method: "GET", ...options }),
  post: <T>(endpoint: string, body: unknown, options?: RequestInit) =>
    request<T>(endpoint, { method: "POST", body: JSON.stringify(body), ...options }),
  put: <T>(endpoint: string, body: unknown, options?: RequestInit) =>
    request<T>(endpoint, { method: "PUT", body: JSON.stringify(body), ...options }),
  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, { method: "PATCH", body: body ? JSON.stringify(body) : undefined, ...options }),
  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { method: "DELETE", ...options }),
}
