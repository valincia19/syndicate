"use client"

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react"
import { tokenManager, ApiError } from "@/lib/api"
import { authService, type UserResponse } from "@/services/auth"
import { logger } from "@/lib/logger"
import { obfuscate, deobfuscate } from "@/lib/obfuscate"

export interface AuthUser {
  id: string
  username: string
  name: string
  email: string
  role: string
  initials: string
  discord_id?: string | null
  verified: boolean
  avatar?: string | null
  balance: number
  in_discord_guild?: boolean
}

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: AuthUser | null) => void
  signOut: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_USER_STORAGE_KEY = "auth_user"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const isRefreshingRef = useRef(false)
  const hasSignedOutRef = useRef(false)

  const signOut = useCallback(() => {
    logger.info('STUDIO:AUTH', 'signOut called - clearing user state and tokens')
    hasSignedOutRef.current = true
    setUser(null)
    tokenManager.clearToken()
    if (typeof window !== "undefined") {
      localStorage.removeItem(AUTH_USER_STORAGE_KEY)
      // Call backend to clear httpOnly cookie
      authService.logout().catch((err) => {
        logger.warn('STUDIO:AUTH', 'Failed to clear server-side session', { error: String(err) })
      })
    }
  }, [])

  const mapUserResponseToAuthUser = useCallback((apiUser: UserResponse): AuthUser => {
    const displayName = apiUser.name || apiUser.username || "User"
    const initials = displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase()

    return {
      id: apiUser.id,
      username: apiUser.username || apiUser.name || "User",
      name: apiUser.name || apiUser.username || "User",
      email: apiUser.email,
      role: apiUser.role || "user",
      initials,
      discord_id: apiUser.discord_id,
      verified: apiUser.verified === true || apiUser.verified === 1,
      avatar: apiUser.avatar,
      balance: apiUser.balance !== undefined ? Number(apiUser.balance) : 0,
      in_discord_guild: apiUser.in_discord_guild,
    }
  }, [])

  const refreshUser = useCallback(async () => {
    // Prevent concurrent refresh calls (StrictMode, multiple mounts, etc.)
    if (isRefreshingRef.current) {
      logger.debug('STUDIO:AUTH', 'refreshUser already in progress - skipping')
      return
    }
    // Don't refresh after explicit signout
    if (hasSignedOutRef.current) {
      logger.debug('STUDIO:AUTH', 'User has signed out - skipping refresh')
      return
    }
    isRefreshingRef.current = true
    logger.debug('STUDIO:AUTH', 'refreshUser called - fetching profile from API')

    try {
      // Always attempt getProfile - browser will send httpOnly cookie automatically
      // via credentials: 'include'. Do NOT gate this on tokenManager.getToken()
      // because the httpOnly cookie is NOT readable by JS (that's the point of httpOnly).
      const response = await authService.getProfile()
      const authUser = mapUserResponseToAuthUser(response.data.user)
      logger.info('STUDIO:AUTH', 'User profile loaded successfully', { userId: authUser.id })
      setUser(authUser)
      // Mirror user in localStorage for instant paint on next load
      if (typeof window !== "undefined") {
        localStorage.setItem(AUTH_USER_STORAGE_KEY, obfuscate(JSON.stringify(authUser)))
      }
      // Persist JWT from profile response for WebSocket sub-protocol auth.
      // The backend now returns a fresh token alongside the user profile.
      const profileToken = (response.data as { token?: string }).token
      if (profileToken) {
        tokenManager.setToken(profileToken)
      }
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        // Exclude payment pages from automatic redirect
        const isPaymentPage = typeof window !== 'undefined' && window.location.pathname.includes('/portal/payment');
        if (isPaymentPage) {
          logger.warn('STUDIO:AUTH', '401 Unauthorized on payment page - ignoring redirect')
        } else {
          // Token truly invalid/expired - hard sign out
          logger.warn('STUDIO:AUTH', '401 Unauthorized - clearing session')
          signOut()
        }
      } else {
        // Network error / backend down - do NOT clear user.
        // The cookie is still valid; user will recover on next navigation.
        logger.debug('STUDIO:AUTH', 'Profile fetch failed with non-401 - keeping cached user', {
          error: error instanceof Error ? error.message : String(error),
        })
      }
    } finally {
      isRefreshingRef.current = false
      setIsLoading(false)
    }
  }, [mapUserResponseToAuthUser, signOut])

  // Initialize Auth state on mount
  useEffect(() => {
    logger.debug('STUDIO:AUTH', 'AuthProvider mounted - initializing auth state')

    Promise.resolve().then(() => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(AUTH_USER_STORAGE_KEY)
        if (stored) {
          try {
            const cachedUser = deobfuscate(stored)
            const parsed = JSON.parse(cachedUser) as AuthUser
            logger.debug('STUDIO:AUTH', 'Loaded cached user from localStorage', { userId: parsed.id })
            setUser(parsed)
          } catch {
            logger.warn('STUDIO:AUTH', 'Failed to parse cached user - clearing')
            localStorage.removeItem(AUTH_USER_STORAGE_KEY)
          }
        }
      }

      // Always validate session on mount to sync cookie state and avoid redirect loops.
      refreshUser().catch(() => {
        logger.debug('STUDIO:AUTH', 'Background token validation failed')
        setIsLoading(false)
      })
    })
  }, [refreshUser])

  const handleSetUser = useCallback((newUser: AuthUser | null) => {
    setUser(newUser)
    if (typeof window !== "undefined") {
      if (newUser) {
        localStorage.setItem(AUTH_USER_STORAGE_KEY, obfuscate(JSON.stringify(newUser)))
      } else {
        localStorage.removeItem(AUTH_USER_STORAGE_KEY)
      }
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        setUser: handleSetUser,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
