"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AuthLayout } from "@/components/auth/auth-layout"
import { FormField, FieldGroup, Field, FieldDescription } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { authService } from "@/services/auth"
import { useLanguage } from "@/components/providers/language-provider"

function ResetPasswordFormContent() {
  const { t } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [isValidatingToken, setIsValidatingToken] = useState(true)
  const [isTokenValid, setIsTokenValid] = useState(false)

  useEffect(() => {
    const checkToken = async () => {
      if (!token) {
        setIsValidatingToken(false)
        return
      }
      try {
        await authService.validateResetToken(token)
        setIsTokenValid(true)
      } catch (err: unknown) {
        setIsTokenValid(false)
        const errMsg = err instanceof Error ? err.message : t("invalidResetLink")
        setError(errMsg)
      } finally {
        setIsValidatingToken(false)
      }
    }
    checkToken()
  }, [token, t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!token) {
      setError("Reset token is missing from the URL.")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setIsLoading(true)
    try {
      await authService.resetPassword(token, password)
      setSuccess("success")
      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to reset password. The link might be expired."
      setError(errMsg)
    } finally {
      setIsLoading(false)
    }
  }

  if (isValidatingToken) {
    return (
      <div className="text-sm font-mono text-center text-muted-foreground animate-pulse py-8">
        Checking reset link validity...
      </div>
    )
  }

  if (!token || !isTokenValid) {
    return (
      <div className="flex flex-col gap-4">
        <div className="p-3 text-sm bg-destructive/15 text-destructive border border-destructive/20 rounded-md font-medium">
          {error || t("invalidResetLink")}
        </div>
        <Button onClick={() => router.push("/login")}>{t("backToLogin")}</Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight text-foreground">{t("resetPasswordTitle")}</h2>
        <p className="text-xs text-muted-foreground">{t("resetPasswordDesc")}</p>
      </div>

      {error && (
        <div className="p-3 text-xs bg-destructive/15 text-destructive border border-destructive/20 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 text-xs bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-md font-medium">
          {t("redirectingToLogin")}
        </div>
      )}

      <FieldGroup>
        <FormField
          id="reset-password"
          name="password"
          label={t("newPassword")}
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading || !!success}
        />

        <FormField
          id="reset-confirm-password"
          name="confirmPassword"
          label={t("confirmNewPassword")}
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={isLoading || !!success}
        />

        <Field>
          <Button type="submit" className="w-full h-9" disabled={isLoading || !!success}>
            {isLoading ? t("resetting") : t("resetPasswordTitle")}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout title="VALINC SYNDICATE" description="Advanced LUA Execution & Account Sync">
      <Suspense fallback={<div className="text-sm font-mono text-center text-muted-foreground animate-pulse py-8">Loading reset page...</div>}>
        <ResetPasswordFormContent />
      </Suspense>
    </AuthLayout>
  )
}
