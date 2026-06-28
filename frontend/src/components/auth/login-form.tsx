"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useLanguage } from "@/components/providers/language-provider"
import { useAuthActions } from "@/hooks/use-auth-actions"
import { loginSchema } from "@/lib/validation/auth-schemas"
import { FormField, FieldGroup, Field, FieldSeparator, FieldDescription } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { DiscordOAuthButton } from "./auth-layout"
import { authService } from "@/services/auth"

export function LoginForm() {
  const { t } = useLanguage()
  const { isLoading, error, handleLogin } = useAuthActions()
  const searchParams = useSearchParams()
  const reasonParam = searchParams.get("reason")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({})

  const [view, setView] = useState<"login" | "forgot">("login")
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotSuccess, setForgotSuccess] = useState("")
  const [forgotError, setForgotError] = useState("")
  const [isSubmittingForgot, setIsSubmittingForgot] = useState(false)

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError("")
    setForgotSuccess("")
    setIsSubmittingForgot(true)
    try {
      const response = await authService.forgotPassword(forgotEmail)
      setForgotSuccess(response.message || "Reset link has been sent to your email.")
      setForgotEmail("")
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to request password reset link."
      setForgotError(errMsg)
    } finally {
      setIsSubmittingForgot(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationErrors({})

    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {}
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as "email" | "password"
        fieldErrors[path] = issue.message
      })
      setValidationErrors(fieldErrors)
      return
    }

    await handleLogin(result.data)
  }

  const apiError = error?.api
  const emailError = validationErrors.email || error?.email
  const passwordError = validationErrors.password || error?.password

  const isSuspendedError = reasonParam === "suspended" || (apiError && apiError.toLowerCase().includes("suspended"))
  const isDeletedError = reasonParam === "deleted" || (apiError && (apiError.toLowerCase().includes("no longer exist") || apiError.toLowerCase().includes("deleted")))
  const displayApiError = apiError && !isSuspendedError && !isDeletedError

  if (view === "forgot") {
    return (
      <form onSubmit={handleForgotSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Forgot Password</h2>
          <p className="text-xs text-muted-foreground">{"Enter your email address and we'll send you a link to reset your password."}</p>
        </div>

        {forgotError && (
          <div className="p-3 text-xs bg-destructive/15 text-destructive border border-destructive/20 rounded-md">
            {forgotError}
          </div>
        )}

        {forgotSuccess && (
          <div className="p-3 text-xs bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-md font-medium">
            {forgotSuccess}
          </div>
        )}

        <FieldGroup>
          <FormField
            id="forgot-email"
            name="email"
            label={t("email")}
            type="email"
            placeholder="m@example.com"
            value={forgotEmail}
            onChange={(e) => {
              setForgotEmail(e.target.value)
              if (forgotError) setForgotError("")
            }}
            required
            disabled={isSubmittingForgot}
          />

          <Field>
            <Button type="submit" className="w-full h-9" disabled={isSubmittingForgot}>
              {isSubmittingForgot ? "Sending..." : "Send Reset Link"}
            </Button>
          </Field>

          <Field>
            <Button 
              type="button" 
              variant="outline" 
              className="w-full h-9" 
              onClick={() => {
                setView("login")
                setForgotError("")
                setForgotSuccess("")
              }}
              disabled={isSubmittingForgot}
            >
              Back to Login
            </Button>
          </Field>
        </FieldGroup>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {isSuspendedError && (
        <div className="p-3 text-xs bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 rounded-md font-medium">
          Your account has been suspended by an administrator. Please contact support.
        </div>
      )}
      {isDeletedError && (
        <div className="p-3 text-xs bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 rounded-md font-medium">
          Your account no longer exists or was deleted.
        </div>
      )}
      {displayApiError && (
        <div className="p-3 text-xs bg-destructive/15 text-destructive border border-destructive/20 rounded-md">
          {apiError}
        </div>
      )}

      <FieldGroup>
        <FormField
          id="login-email"
          name="email"
          autoComplete="username"
          label={t("email")}
          type="email"
          placeholder="m@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (validationErrors.email) setValidationErrors((prev) => ({ ...prev, email: undefined }))
          }}
          error={emailError}
          required
          disabled={isLoading}
        />

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="text-sm font-medium leading-none">
              {t("password")}
            </label>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                setView("forgot")
              }}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              {t("forgotPassword")}
            </a>
          </div>
          <FormField
            id="login-password"
            name="password"
            autoComplete="current-password"
            label="" // Hide secondary label as it's custom styled above
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (validationErrors.password) setValidationErrors((prev) => ({ ...prev, password: undefined }))
            }}
            error={passwordError}
            required
            disabled={isLoading}
          />
        </div>

        <Field>
          <Button type="submit" className="w-full h-9" disabled={isLoading}>
            {isLoading ? "Logging in..." : t("login")}
          </Button>
        </Field>

        <FieldSeparator>{t("orContinueWith")}</FieldSeparator>

        <Field>
          <DiscordOAuthButton label={t("connectDiscord")} />
          <FieldDescription className="text-center mt-4">
            {t("dontHaveAccount")}{" "}
            <Link href="/register" className="underline underline-offset-4 font-medium hover:text-primary">
              {t("signUp")}
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>

      <FieldSeparator>{t("needAssistance")}</FieldSeparator>
      <FieldDescription className="text-center">
        {t("noWhitelist")}{" "}
        <a href="https://discord.gg/valinc" className="underline underline-offset-4 font-medium hover:text-primary">
          {t("joinDiscord")}
        </a>
      </FieldDescription>
    </form>
  )
}
