/**
 * Centralized Type-Safe API Client
 *
 * BASE_URL is intentionally empty - all /v1/* requests are proxied
 * through Next.js rewrites (next.config.ts) to the backend.
 * This makes every request same-origin so cookies always travel correctly.
 */

import { logger } from './logger'
import { obfuscate, deobfuscate } from './obfuscate'
import { getBackendUrl } from './config'

const BASE_URL = getBackendUrl()

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

// ─── Silent Refresh Token Infrastructure ─────────────────────────────────────
// Prevents a race condition where multiple concurrent 401 responses each try
// to call POST /v1/auth/refresh independently, causing N simultaneous refresh
// requests instead of one. Pattern: one refresh in flight at a time, all other
// callers queue their retry callbacks and are resolved/rejected together.

let isRefreshing = false
// Permanent latch: once set true (failed refresh / explicit logout), ALL future
// requests are rejected immediately without hitting the network. This is the
// circuit-breaker that stops the 401 → refresh → 401 → … infinite loop.
// Only a full page navigation (hard redirect) resets this in-memory flag.
let isLoggedOut = false
type RefreshCallback = (newToken: string) => void
type RefreshRejectCallback = (error: ApiError) => void
const refreshQueue: Array<{ resolve: RefreshCallback; reject: RefreshRejectCallback }> = []

/** Drain the queue: notify all waiting callers with the new token or an error. */
function drainQueue(newToken: string | null, error: ApiError | null) {
  for (const cb of refreshQueue) {
    if (newToken) cb.resolve(newToken)
    else if (error) cb.reject(error)
  }
  refreshQueue.length = 0
}

/** Redirect user to /login and clean up all auth state. */
function forceLogout(reason: 'expired' | 'suspended' | 'deleted' = 'expired') {
  // ── 1. Engage circuit-breaker FIRST so any in-flight or queued request
  //        that wakes up after this point gets rejected immediately, not retried.
  isLoggedOut = true
  isRefreshing = false

  // ── 2. Clear all persisted auth state synchronously.
  tokenManager.clearToken()
  try {
    localStorage.removeItem('auth_user')
    localStorage.removeItem('valinc_jwt')
  } catch { /* ignore storage errors */ }

  // ── 3. Hard redirect — breaks React's render loop. window.location.href is
  //        intentionally used over router.push: it unloads the current JS
  //        runtime, so no useEffect / query can fire another request after this.
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.href = `/login?reason=${reason}`
  }
}

/**
 * Attempt a silent refresh by calling POST /v1/auth/refresh.
 * The backend reads the `refresh_token` httpOnly cookie automatically
 * (no request body needed — credentials: "include" forwards the cookie).
 *
 * On success → stores new access token, drains queue with new token.
 * On failure → drains queue with error, triggers forceLogout.
 *
 * @returns The new access token string, or throws ApiError.
 */
async function attemptSilentRefresh(): Promise<string> {
  try {
    const response = await fetch(`${BASE_URL}/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({})) as { message?: string }
      throw new ApiError(
        data.message || 'Session expired. Please log in again.',
        response.status,
        'error'
      )
    }

    const data = await response.json() as { data?: { token?: string } }
    const newToken = data?.data?.token

    if (!newToken) {
      throw new ApiError('Refresh response missing token', 500, 'error')
    }

    tokenManager.setToken(newToken)
    logger.debug('API:Refresh', 'Silent token refresh successful')
    drainQueue(newToken, null)
    isRefreshing = false
    return newToken
  } catch (error) {
    const refreshError = error instanceof ApiError
      ? error
      : new ApiError('Silent refresh failed', 401, 'error')

    // Drain the queue with the error BEFORE forceLogout so waiting callers
    // reject immediately rather than hanging until the redirect fires.
    drainQueue(null, refreshError)
    // forceLogout sets isLoggedOut=true and isRefreshing=false before redirecting.
    forceLogout('expired')
    throw refreshError
  }
  // NOTE: No finally block — isRefreshing is managed explicitly above so the
  // flag cannot be reset to false between drainQueue and forceLogout.
}

/**
 * If a refresh is already in flight, enqueue the retry and wait.
 * Returns the new token once the refresh settles.
 */
function waitForRefresh(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    refreshQueue.push({ resolve, reject })
  })
}

// ─── Core Request Function ────────────────────────────────────────────────────

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // ── Circuit-breaker: refuse all requests once a session has been invalidated.
  //    This kills any in-flight React query / useEffect that fires between
  //    forceLogout() and the hard redirect completing.
  if (isLoggedOut) {
    throw new ApiError('Session ended. Redirecting to login...', 401, 'error')
  }

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

    // ── 401 Interceptor: attempt silent refresh before giving up ──────────────
    if (response.status === 401) {
      // Do not attempt to refresh the refresh endpoint itself — that would loop.
      if (endpoint === '/v1/auth/refresh') {
        forceLogout('expired')
        throw new ApiError('Session expired. Please log in again.', 401, 'error', data)
      }

      let freshToken: string

      if (isRefreshing) {
        // Another call already kicked off a refresh — queue and wait for it.
        freshToken = await waitForRefresh()
      } else {
        // This is the first 401 — we own the refresh.
        isRefreshing = true
        freshToken = await attemptSilentRefresh()
      }

      // Retry the original request with the new token.
      const retryHeaders = new Headers(options.headers)
      if (!retryHeaders.has("Content-Type")) retryHeaders.set("Content-Type", "application/json")
      retryHeaders.set("Authorization", `Bearer ${freshToken}`)

      const retryResponse = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: retryHeaders,
        credentials: "include",
      })

      if (retryResponse.status === 204) return {} as T

      let retryData: unknown
      try { retryData = await retryResponse.json() } catch { retryData = {} }

      if (!retryResponse.ok) {
        const retryObj = retryData as { message?: string; status?: string } | null
        throw new ApiError(
          retryObj?.message || `Request failed with status ${retryResponse.status}`,
          retryResponse.status,
          retryObj?.status || 'error',
          retryData
        )
      }

      return retryData as T
    }

    // ── Other non-OK responses ────────────────────────────────────────────────
    if (!response.ok) {
      const dataObj = data as { message?: string; status?: string } | null
      const msg = String(dataObj?.message || '').toLowerCase()

      // Handle suspensions and account deletions (403 from business logic)
      const isSuspendedOrDeleted = msg.includes('suspend') || msg.includes('no longer exist') || msg.includes('account')
      if (response.status === 403 && isSuspendedOrDeleted) {
        const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
        const isProtectedRoute =
          pathname.startsWith('/portal') ||
          pathname.startsWith('/studio') ||
          pathname.startsWith('/verify')

        if (typeof window !== 'undefined' && isProtectedRoute) {
          let reason: 'expired' | 'suspended' | 'deleted' = 'expired'
          if (msg.includes('suspend')) reason = 'suspended'
          else if (msg.includes('no longer exist') || msg.includes('not found')) reason = 'deleted'
          forceLogout(reason)
        }
      }

      throw new ApiError(
        dataObj?.message || `Request failed with status ${response.status}`,
        response.status,
        dataObj?.status || "error",
        dataObj
      )
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
