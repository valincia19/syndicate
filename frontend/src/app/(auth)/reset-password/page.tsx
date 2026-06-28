"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AuthLayout } from "@/components/auth/auth-layout"
import { FormField, FieldGroup, Field, FieldDescription } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { authService } from "@/services/auth"

function ResetPasswordFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!token) {
      setError("Reset token is missing from the URL.")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.")
      return
    }

    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must contain at least one letter and one number.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setIsLoading(true)
    try {
      const response = await authService.resetPassword(token, password)
      setSuccess(response.message || "Your password has been reset successfully.")
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

  if (!token) {
    return (
      <div className="flex flex-col gap-4">
        <div className="p-3 text-sm bg-destructive/15 text-destructive border border-destructive/20 rounded-md font-medium">
          Invalid password reset link. Please request a new link from the login page.
        </div>
        <Button onClick={() => router.push("/login")}>Back to Login</Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Reset Password</h2>
        <p className="text-xs text-muted-foreground">Enter a new secure password below to update your account.</p>
      </div>

      {error && (
        <div className="p-3 text-xs bg-destructive/15 text-destructive border border-destructive/20 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 text-xs bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-md font-medium">
          {success} Redirecting to login in 3 seconds...
        </div>
      )}

      <FieldGroup>
        <FormField
          id="reset-password"
          name="password"
          label="New Password"
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
          label="Confirm New Password"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={isLoading || !!success}
        />

        <Field>
          <Button type="submit" className="w-full h-9" disabled={isLoading || !!success}>
            {isLoading ? "Resetting..." : "Reset Password"}
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
