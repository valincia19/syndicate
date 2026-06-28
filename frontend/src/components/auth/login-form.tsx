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

export function LoginForm() {
  const { t } = useLanguage()
  const { isLoading, error, handleLogin } = useAuthActions()
  const searchParams = useSearchParams()
  const reasonParam = searchParams.get("reason")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({})

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
                alert(t("forgotPasswordAlert"))
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
