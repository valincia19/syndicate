"use client"

import { useState, useEffect, useCallback } from "react"
import { Cookie, X, ShieldCheck, Lock, Fingerprint } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/providers/language-provider"
import Link from "next/link"

export function CookieConsent() {
  const { t } = useLanguage()
  const tKey = (key: string) => t(key as Parameters<typeof t>[0])
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem("cookieConsent")
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 1200)
      return () => clearTimeout(timer)
    }
  }, [])

  const dismiss = useCallback((value: "accepted" | "declined") => {
    setIsExiting(true)
    setTimeout(() => {
      localStorage.setItem("cookieConsent", value)
      setIsVisible(false)
    }, 300)
  }, [])

  if (!isVisible) return null

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-[420px] z-50 transition-all duration-300 ${
        isExiting
          ? "translate-y-4 opacity-0 scale-95"
          : "animate-in slide-in-from-bottom-8 fade-in-0 duration-500"
      }`}
    >
      <div className="relative rounded-2xl border border-border/60 bg-card/80 dark:bg-[#09090b]/90 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.4)] backdrop-blur-xl overflow-hidden">
        {/* === Ambient glow effects === */}
        <div className="absolute -top-20 -left-20 h-40 w-40 rounded-full bg-primary/8 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 h-32 w-32 rounded-full bg-violet-500/6 blur-3xl pointer-events-none" />

        {/* === Top edge highlight === */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        {/* === Content === */}
        <div className="relative p-5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              {/* Icon container with subtle animation */}
              <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 shrink-0">
                <Cookie className="h-4 w-4 text-primary" />
                {/* Pulse ring */}
                <div className="absolute inset-0 rounded-xl border border-primary/20 animate-ping opacity-30" />
              </div>
              <div>
                <h3 className="text-[13px] font-bold text-foreground tracking-tight leading-none">
                  {tKey("cookieTitle")}
                </h3>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="flex items-center gap-1 text-[9px] text-emerald-500 font-mono font-bold uppercase tracking-wider">
                    <ShieldCheck className="h-2.5 w-2.5" />
                    <span>GDPR</span>
                  </div>
                  <span className="text-border">·</span>
                  <div className="flex items-center gap-1 text-[9px] text-blue-400 font-mono font-bold uppercase tracking-wider">
                    <Lock className="h-2.5 w-2.5" />
                    <span>SSL</span>
                  </div>
                  <span className="text-border">·</span>
                  <div className="flex items-center gap-1 text-[9px] text-violet-400 font-mono font-bold uppercase tracking-wider">
                    <Fingerprint className="h-2.5 w-2.5" />
                    <span>E2E</span>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => dismiss("declined")}
              className="p-1.5 text-muted-foreground/50 hover:text-foreground hover:bg-muted/30 rounded-lg transition-all duration-200 cursor-pointer shrink-0 -mt-0.5 -mr-0.5"
              aria-label="Close cookie banner"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Description */}
          <p className="text-[11px] text-muted-foreground/80 leading-[1.7] mb-4 pl-[3.25rem]">
            {tKey("cookieDesc")}
          </p>

          {/* Divider with gradient */}
          <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent mb-4" />

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-2.5">
            <Link
              href="/cookie"
              className="text-[10px] font-mono text-muted-foreground/60 hover:text-primary underline underline-offset-2 decoration-muted-foreground/30 hover:decoration-primary/50 transition-colors cursor-pointer"
            >
              {tKey("cookiePolicyTitle")}
            </Link>
            <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dismiss("declined")}
              className="h-8 px-3.5 text-[10px] font-mono font-semibold text-muted-foreground hover:text-foreground tracking-wider uppercase cursor-pointer rounded-lg transition-all duration-200"
            >
              {tKey("cookieDecline")}
            </Button>
            <Button
              size="sm"
              onClick={() => dismiss("accepted")}
              className="h-8 px-5 text-[10px] font-mono font-bold tracking-wider uppercase cursor-pointer rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_16px_-4px] shadow-primary/30 transition-all duration-200"
            >
              {tKey("cookieAccept")}
            </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
