"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth, type AuthUser } from "@/context/auth-context"
import { authService } from "@/services/auth"
import { tokenManager, ApiError } from "@/lib/api"
import type { LoginInput, RegisterInput } from "@/lib/validation/auth-schemas"

export interface AuthActionsError {
  email?: string
  username?: string
  password?: string
  confirmPassword?: string
  api?: string
}

export interface ApiUser {
  id: string
  name?: string | null
  username?: string | null
  email?: string
  role?: string
  discord_id?: string | null
  verified?: boolean | number | null
  avatar?: string | null
  balance?: number | string | null
}

function buildAuthUser(apiUser: ApiUser): AuthUser {
  const displayName = apiUser.name || apiUser.username || "User"
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase()

  return {
    id: apiUser.id,
    username: apiUser.username || apiUser.name || "User",
    name: apiUser.name || apiUser.username || "User",
    email: apiUser.email || "",
    role: apiUser.role || "user",
    initials,
    discord_id: apiUser.discord_id,
    verified: apiUser.verified === true || apiUser.verified === 1,
    avatar: apiUser.avatar,
    balance: apiUser.balance !== undefined && apiUser.balance !== null ? Number(apiUser.balance) : 0,
  }
}

export function useAuthActions() {
  const router = useRouter()
  const { setUser } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<AuthActionsError | null>(null)

  const handleLogin = useCallback(
    async (data: LoginInput) => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await authService.login(data)
        const { user: apiUser, token } = response.data

        // Store token in memory for Authorization header fallback.
        // The real auth mechanism is the httpOnly cookie set by the backend.
        // Browser sends it automatically via credentials: 'include'.
        if (token) tokenManager.setToken(token)

        const authUser = buildAuthUser(apiUser as ApiUser)
        setUser(authUser)

        // Push AFTER user is set so portal layout sees user immediately
        router.push("/portal/overview")
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          const msg = err.message.toLowerCase()
          if (msg.includes("email") && msg.includes("invalid")) {
            setError({ email: err.message })
          } else if (msg.includes("password") && msg.includes("invalid")) {
            setError({ password: err.message })
          } else {
            setError({ api: err.message })
          }
        } else {
          const msg = err instanceof Error ? err.message : "An unexpected error occurred during login."
          setError({ api: msg })
        }
      } finally {
        setIsLoading(false)
      }
    },
    [router, setUser]
  )

  const handleRegister = useCallback(
    async (data: RegisterInput) => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await authService.register(data)
        const { user: apiUser, token } = response.data

        if (token) tokenManager.setToken(token)

        const authUser = buildAuthUser(apiUser as ApiUser)
        setUser(authUser)

        router.push("/portal/overview")
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          const msg = err.message.toLowerCase()
          if (msg.includes("email") && msg.includes("already")) {
            setError({ email: err.message })
          } else if (msg.includes("username") && msg.includes("already")) {
            setError({ username: err.message })
          } else if (msg.includes("password")) {
            setError({ password: err.message })
          } else {
            setError({ api: err.message })
          }
        } else {
          const msg = err instanceof Error ? err.message : "An unexpected error occurred during registration."
          setError({ api: msg })
        }
      } finally {
        setIsLoading(false)
      }
    },
    [router, setUser]
  )

  const handleDiscordLogin = useCallback(() => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
    window.location.href = `${backendUrl}/v1/auth/discord`
  }, [])

  return {
    isLoading,
    error,
    setError,
    handleLogin,
    handleRegister,
    handleDiscordLogin,
  }
}
