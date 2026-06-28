"use client"

import { useState } from "react"
import Link from "next/link"
import { useLanguage } from "@/components/providers/language-provider"
import { useAuthActions } from "@/hooks/use-auth-actions"
import { registerSchema } from "@/lib/validation/auth-schemas"
import { FormField, FieldGroup, Field, FieldSeparator, FieldDescription } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { DiscordOAuthButton } from "./auth-layout"

export function RegisterForm() {
  const { t } = useLanguage()
  const { isLoading, error, handleRegister } = useAuthActions()

  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [validationErrors, setValidationErrors] = useState<{
    username?: string
    email?: string
    password?: string
    confirmPassword?: string
  }>({})

  const getUsernameLabel = () => {
    try {
      const savedLang = typeof window !== "undefined" ? localStorage.getItem("language") : "EN"
      if (savedLang === "ID") return "Username"
      if (savedLang === "FR") return "Nom d'utilisateur"
    } catch {}
    return "Username"
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationErrors({})

    const result = registerSchema.safeParse({
      username,
      email,
      password,
      confirmPassword,
    })

    if (!result.success) {
      const fieldErrors: typeof validationErrors = {}
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof typeof validationErrors
        fieldErrors[path] = issue.message
      })
      setValidationErrors(fieldErrors)
      return
    }

    await handleRegister(result.data)
  }

  const apiError = error?.api
  const usernameError = validationErrors.username || error?.username
  const emailError = validationErrors.email || error?.email
  const passwordError = validationErrors.password || error?.password
  const confirmPasswordError = validationErrors.confirmPassword || error?.confirmPassword

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {apiError && (
        <div className="p-3 text-xs bg-destructive/15 text-destructive border border-destructive/20 rounded-md">
          {apiError}
        </div>
      )}

      <FieldGroup>
        <FormField
          id="register-username"
          name="username"
          autoComplete="username"
          label={getUsernameLabel()}
          type="text"
          placeholder="username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value)
            if (validationErrors.username) setValidationErrors((prev) => ({ ...prev, username: undefined }))
          }}
          error={usernameError}
          required
          disabled={isLoading}
        />

        <FormField
          id="register-email"
          name="email"
          autoComplete="email"
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

        <FormField
          id="register-password"
          name="password"
          autoComplete="new-password"
          label={t("password")}
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

        <FormField
          id="register-confirm-password"
          name="confirmPassword"
          autoComplete="new-password"
          label={t("confirmPassword")}
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value)
            if (validationErrors.confirmPassword) {
              setValidationErrors((prev) => ({ ...prev, confirmPassword: undefined }))
            }
          }}
          error={confirmPasswordError}
          required
          disabled={isLoading}
        />

        <Field>
          <Button type="submit" className="w-full h-9" disabled={isLoading}>
            {isLoading ? "Signing up..." : t("signUp")}
          </Button>
        </Field>

        <FieldSeparator>{t("orContinueWith")}</FieldSeparator>

        <Field>
          <DiscordOAuthButton label={t("connectDiscord")} />
          <FieldDescription className="text-center mt-4">
            {t("alreadyHaveAccount")}{" "}
            <Link href="/login" className="underline underline-offset-4 font-medium hover:text-primary">
              {t("login")}
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
