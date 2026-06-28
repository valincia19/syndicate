"use client"

import { useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AuthLayout } from "@/components/auth/auth-layout"
import { useLanguage } from "@/components/providers/language-provider"
import { useAuth } from "@/context/auth-context"
import { RegisterForm } from "@/components/auth/register-form"

function RegisterRedirectHandler() {
  const { isAuthenticated, isLoading, signOut } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get("error")
  const reasonParam = searchParams.get("reason")

  useEffect(() => {
    // If there is an explicit error or reason param, clear stale session and replace route to clean searchParams
    if (errorParam || reasonParam) {
      if (isAuthenticated) {
        signOut()
      }
      router.replace("/register")
      return
    }

    // Only redirect to portal if authenticated AND not loading
    if (!isLoading && isAuthenticated) {
      router.push("/portal/overview")
    }
  }, [isAuthenticated, isLoading, errorParam, reasonParam, router, signOut])

  return null
}

export default function RegisterPage() {
  const { t } = useLanguage()

  return (
    <AuthLayout title="VALINC SYNDICATE" description={t("loginDesc")}>
      <Suspense fallback={<div className="text-sm font-mono text-center text-muted-foreground animate-pulse py-8">Loading register...</div>}>
        <RegisterRedirectHandler />
        <RegisterForm />
      </Suspense>
    </AuthLayout>
  )
}
