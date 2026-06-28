"use client"

import { Header } from "@/components/layout/header"
import FooterSection from "@/components/layout/footer"
import CTASection from "@/components/landing/cta-section"
import { useLanguage } from "@/components/providers/language-provider"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, ExternalLink, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function ContactPage() {
  const { t } = useLanguage()
  const tKey = (key: string) => t(key as Parameters<typeof t>[0])

  // Replace with actual Discord invite link when available
  const DISCORD_URL = "https://discord.gg"

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-start overflow-x-hidden">
      <div className="relative flex w-full flex-col items-center justify-start">
        <div className="relative flex min-h-screen w-full max-w-7xl flex-col items-start justify-start">
          {/* Side rails */}
          <div className="bg-muted absolute top-0 left-4 z-0 h-full w-px sm:left-6 md:left-8 lg:left-0" />
          <div className="bg-muted absolute top-0 right-4 z-0 h-full w-px sm:right-6 md:right-8 lg:right-0" />

          <div className="relative z-10 flex flex-col items-center justify-center self-stretch overflow-hidden border-x">
            {/* Decorative top pattern */}
            <div className="relative h-8 self-stretch overflow-hidden shrink-0">
              <div className="absolute inset-0 h-full w-full overflow-hidden">
                <div className="relative h-full w-full">
                  {Array.from({ length: 300 }).map((_, i) => (
                    <div
                      key={i}
                      className="outline-primary/40 absolute h-4 w-full origin-top-left -rotate-45 outline-[0.5px] outline-offset-[-0.25px]"
                      style={{
                        top: `${i * 16 - 120}px`,
                        left: "-100%",
                        width: "300%",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <Header />

            {/* ═══════════════════════════════════════════════════
                CONTACT HERO - Pure Discord Focus
                ═══════════════════════════════════════════════════ */}
            <div className="flex w-full flex-col items-center justify-center border-b overflow-hidden">
              <div className="relative flex items-center justify-center gap-6 self-stretch px-4 py-16 sm:px-6 md:px-24 md:py-24 overflow-hidden">
                <div className="relative flex w-full max-w-3xl flex-col items-center justify-start gap-4 text-center overflow-hidden">
                  <Badge variant={"secondary"} className="gap-1.5 px-3 py-1">
                    <MessageSquare className="h-3.5 w-3.5 text-primary" />
                    {tKey("contactBadge")}
                  </Badge>
                  <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground uppercase font-outfit">
                    {tKey("contactTitle")}
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
                    {tKey("contactIntro")}
                  </p>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                CENTRAL DISCORD HUB CARD
                ═══════════════════════════════════════════════════ */}
            <div className="flex w-full items-center justify-center border-b px-4 py-16 md:px-12 md:py-20">
              <div className="w-full max-w-2xl rounded-xl border border-border bg-card/40 backdrop-blur-md p-8 sm:p-12 text-center flex flex-col items-center gap-6 shadow-sm relative overflow-hidden">
                {/* Status Indicator */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/40 text-[11px] font-mono text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span>{tKey("contactStatus")}</span>
                </div>

                {/* Discord Icon Box */}
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted/40 text-foreground shadow-inner">
                  <MessageSquare className="h-8 w-8" />
                </div>

                <div className="space-y-2 max-w-lg">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">{tKey("contactCardTitle")}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {tKey("contactCardDesc")}
                  </p>
                </div>

                {/* Discord Action Button */}
                <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto mt-2">
                  <Button size="lg" className="w-full sm:w-auto h-12 px-8 gap-2.5 text-sm font-bold uppercase tracking-wider cursor-pointer">
                    <MessageSquare className="h-4 w-4" />
                    {tKey("contactJoinBtn")}
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            </div>

            {/* Back to Home Navigation */}
            <div className="w-full py-8 border-b flex justify-center">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2 text-xs text-muted-foreground hover:text-foreground font-mono uppercase tracking-wider cursor-pointer">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {tKey("cookiePolicyBackHome")}
                </Button>
              </Link>
            </div>

            <CTASection />
            <FooterSection />
          </div>
        </div>
      </div>
    </div>
  )
}
