"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AuthLayout } from "@/components/auth/auth-layout"
import { FormField, FieldGroup, Field, FieldDescription } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { authService } from "@/services/auth"

export default function VerifyEmailPage() {
  const { user, setUser, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [code, setCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [resendSuccess, setResendSuccess] = useState("")
  const [isResending, setIsResending] = useState(false)

  // Redirect if not logged in or already verified
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace("/login")
      } else if (user.verified || user.discord_id) {
        router.replace("/portal/overview")
      }
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setResendSuccess("")

    if (!code || code.trim().length === 0) {
      setError("Verification code is required.")
      return
    }

    setIsLoading(true)
    try {
      const response = await authService.verifyEmail(code.trim())
      setSuccess(response.message || "Email verified successfully!")
      
      // Update local user state
      if (user) {
        setUser({ ...user, verified: true })
      }
      
      setTimeout(() => {
        router.push("/portal/overview")
      }, 2000)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Invalid or expired verification code."
      setError(errMsg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    setError("")
    setSuccess("")
    setResendSuccess("")
    setIsResending(true)
    try {
      const response = await authService.sendVerification()
      setResendSuccess(response.message || "A new verification code has been sent to your email.")
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to resend verification code. Please try again."
      setError(errMsg)
    } finally {
      setIsResending(false)
    }
  }

  if (authLoading || !user) {
    return (
      <AuthLayout title="VALINC SYNDICATE" description="Advanced LUA Execution & Account Sync">
        <div className="text-sm font-mono text-center text-muted-foreground animate-pulse py-8">
          Loading verification page...
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="VALINC SYNDICATE" description="Verify Your Email Address">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Verify Your Email</h2>
          <p className="text-xs text-muted-foreground">
            We have sent a verification code to <span className="font-semibold text-primary">{user.email}</span>. Please enter it below to verify your account.
          </p>
        </div>

        {error && (
          <div className="p-3 text-xs bg-destructive/15 text-destructive border border-destructive/20 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 text-xs bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-md font-medium">
            {success}
          </div>
        )}

        {resendSuccess && (
          <div className="p-3 text-xs bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-md font-medium">
            {resendSuccess}
          </div>
        )}

        <FieldGroup>
          <FormField
            id="verification-code"
            name="code"
            label="Verification Code"
            type="text"
            placeholder="Enter 6-digit code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              if (error) setError("")
            }}
            required
            disabled={isLoading || !!success}
          />

          <Field>
            <Button type="submit" className="w-full h-9" disabled={isLoading || !!success}>
              {isLoading ? "Verifying..." : "Verify Code"}
            </Button>
          </Field>

          <FieldDescription className="text-center mt-2">
            {"Didn't receive the code? "}
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending || !!success}
              className="underline underline-offset-4 font-medium hover:text-primary disabled:opacity-50"
            >
              {isResending ? "Resending..." : "Resend Code"}
            </button>
          </FieldDescription>
        </FieldGroup>
      </form>
    </AuthLayout>
  )
}
