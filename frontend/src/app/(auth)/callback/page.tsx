"use client"

import { useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { tokenManager } from "@/lib/api"
import { logger } from "@/lib/logger"

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshUser } = useAuth()
  const processedRef = useRef(false)

  useEffect(() => {
    if (processedRef.current) return
    processedRef.current = true

    const token = searchParams.get("token")
    if (token) {
      // Store token secure in-memory cache if provided in URL
      tokenManager.setToken(token)
    }

    // Always attempt to sync context/verify session (whether via cookie or URL token)
    refreshUser()
      .then(() => {
        router.push("/portal/overview")
      })
      .catch((err) => {
        logger.error('OAUTH:CALLBACK', 'Session verification failed', { error: String(err) })
        router.push("/login?error=oauth_failed")
      })
  }, [searchParams, router, refreshUser])

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {/* Loading Spinner */}
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <h2 className="text-xl font-bold tracking-tight">Authenticating...</h2>
      <p className="text-muted-foreground text-sm">
        Please wait while we set up your secure session.
      </p>
    </div>
  )
}

export default function CallbackPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <h2 className="text-xl font-bold tracking-tight">Loading...</h2>
        </div>
      }>
        <CallbackHandler />
      </Suspense>
    </div>
  )
}
