"use client"

import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/components/providers/language-provider"
import { User, Mail, Calendar, Shield, ArrowLeft, CheckCircle, XCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { authService } from "@/services/auth"
import { logger } from "@/lib/logger"

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const { t } = useLanguage()
  const tKey = (key: string) => t(key as Parameters<typeof t>[0])

  const [isVerifying, setIsVerifying] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [code, setCode] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [successMsg, setSuccessMsg] = useState("")
  const [avatarError, setAvatarError] = useState(false)

  const handleSendCode = async () => {
    setIsSendingCode(true)
    setErrorMsg("")
    setSuccessMsg("")
    try {
      await authService.sendVerification()
      setSuccessMsg("Verification code sent! Check your email (simulated in backend logs).")
      setShowModal(true)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      logger.error('PROFILE:VERIFICATION', 'Failed to send verification code', { error: errMsg })
      setErrorMsg(errMsg)
    } finally {
      setIsSendingCode(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code || code.length !== 6) {
      setErrorMsg("Please enter a valid 6-digit code")
      return
    }

    setIsVerifying(true)
    setErrorMsg("")
    try {
      await authService.verifyEmail(code)
      await refreshUser()
      setSuccessMsg("Email verified successfully!")
      setTimeout(() => {
        setShowModal(false)
        setCode("")
        setSuccessMsg("")
      }, 2000)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      logger.error('PROFILE:VERIFICATION', 'Invalid verification code', { error: errMsg })
      setErrorMsg(errMsg)
    } finally {
      setIsVerifying(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <User className="h-16 w-16 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Please log in to view your profile</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Back Button */}
      <Link
        href="/portal/overview"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {tKey("backToDashboard")}
      </Link>

      {/* Profile Header */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary/60 overflow-hidden flex items-center justify-center text-2xl font-bold text-primary-foreground shrink-0">
            {user.avatar && user.avatar !== "null" && user.avatar !== "undefined" && !avatarError ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img 
                src={user.avatar} 
                alt={user.username} 
                className="h-full w-full object-cover" 
                onError={() => setAvatarError(true)}
              />
            ) : (
              user.initials
            )}
          </div>
          <div className="flex-1 space-y-1">
            <h1 className="text-2xl font-bold text-foreground">{user.name}</h1>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              <Mail className="h-4 w-4" />
              {user.email}
            </p>
          </div>
        </div>
      </div>

      {/* Profile Details */}
      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <User className="h-5 w-5" />
            {tKey("accountInfo")}
          </h2>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">
                {tKey("nameLabel")}
              </label>
              <p className="text-sm font-medium text-foreground">{user.name}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">
                {tKey("usernameLabel")}
              </label>
              <p className="text-sm font-medium text-foreground">@{user.username}</p>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">
                {tKey("emailAddressLabel")}
              </label>
              <p className="text-sm font-medium text-foreground">{user.email}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">
                {tKey("emailVerification")}
              </label>
              <div className="flex items-center gap-2 mt-0.5">
                {user.verified ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <CheckCircle className="h-3 w-3" />
                    {tKey("verifiedStatus")}
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                      <XCircle className="h-3 w-3" />
                      {tKey("unverifiedStatus")}
                    </span>
                    <button
                      onClick={handleSendCode}
                      disabled={isSendingCode}
                      className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
                    >
                      {isSendingCode && <Loader2 className="h-3 w-3 animate-spin" />}
                      {tKey("verifyNowBtn")}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">
                {tKey("initialsLabel")}
              </label>
              <p className="text-sm font-medium text-foreground">{user.initials}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">
                {tKey("loginProviderLabel")}
              </label>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                {user.discord_id ? (
                  <>
                    <span className="inline-block w-2 h-2 rounded-full bg-indigo-500" />
                    Discord
                  </>
                ) : (
                  <>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                    Email & Password
                  </>
                )}
              </p>
            </div>

            {user.discord_id && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Discord ID
                </label>
                <p className="text-sm font-mono font-medium text-foreground">{user.discord_id}</p>
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">
                {tKey("accountTypeLabel")}
              </label>
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                {tKey("standardUser")}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {tKey("accountActivity")}
          </h2>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">
                {tKey("memberSinceLabel")}
              </label>
              <p className="text-sm font-medium text-foreground">
                {new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">
                {tKey("lastLoginLabel")}
              </label>
              <p className="text-sm font-medium text-foreground">{tKey("todayLabel")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Code Dialog */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#121214] border border-[#222226] rounded-xl w-full max-w-md p-6 shadow-2xl relative space-y-4 animate-in zoom-in-95 duration-200">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-foreground">{tKey("verifyEmailModalTitle")}</h3>
              <p className="text-sm text-muted-foreground">
                We&apos;ve simulated sending a 6-digit verification code to <span className="text-foreground font-medium">{user.email}</span>.
              </p>
              <p className="text-xs text-yellow-500/80 bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 rounded-lg">
                💡 Check your <strong>backend console logs</strong> to retrieve the simulated verification code.
              </p>
            </div>

            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">
                  {tKey("verificationCodeLabel")}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="w-full text-center tracking-[0.5em] text-2xl font-mono py-3 px-4 bg-[#18181b] border border-border rounded-lg text-foreground focus:outline-none focus:border-primary transition-colors uppercase"
                  autoFocus
                />
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-500 font-medium bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg">
                  {errorMsg}
                </p>
              )}

              {successMsg && (
                <p className="text-xs text-emerald-500 font-medium bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
                  {successMsg}
                </p>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setCode("")
                    setErrorMsg("")
                    setSuccessMsg("")
                  }}
                  className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  {tKey("cancelBtn")}
                </button>
                <button
                  type="submit"
                  disabled={isVerifying || code.length !== 6}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {isVerifying && <Loader2 className="h-4 w-4 animate-spin" />}
                  {tKey("verifyBtn")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
