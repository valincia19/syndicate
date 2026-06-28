"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AuthLayout } from "@/components/auth/auth-layout"
import { useLanguage } from "@/components/providers/language-provider"
import { useAuth } from "@/context/auth-context"
import { RegisterForm } from "@/components/auth/register-form"

export default function RegisterPage() {
  const { t } = useLanguage()
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  // Redirect to portal if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/portal/overview")
    }
  }, [isAuthenticated, router])

  return (
    <AuthLayout title="VALINC SYNDICATE" description={t("loginDesc")}>
      <RegisterForm />
    </AuthLayout>
  )
}
