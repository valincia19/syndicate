"use client"

import { Header } from "@/components/layout/header"
import FooterSection from "@/components/layout/footer"
import CTASection from "@/components/landing/cta-section"
import { useLanguage } from "@/components/providers/language-provider"
import { Badge } from "@/components/ui/badge"

import {
  Cookie,
  ShieldCheck,
  Settings2,
  BarChart3,
  HardDrive,
  SlidersHorizontal,
  Globe,
  Clock,
  MessageSquare,
  ArrowLeft,
  AlertTriangle,
  Terminal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

function splitItems(raw: string): string[] {
  return raw.split("|").map((s) => s.trim()).filter(Boolean)
}

const COOKIE_TYPES: {
  icon: React.ReactNode
  titleKey: string
  descKey: string
  itemsKey?: string
}[] = [
  {
    icon: <ShieldCheck className="h-4 w-4" />,
    titleKey: "cookiePolicyEssentialTitle",
    descKey: "cookiePolicyEssentialDesc",
    itemsKey: "cookiePolicyEssentialItems",
  },
  {
    icon: <Settings2 className="h-4 w-4" />,
    titleKey: "cookiePolicyFunctionalTitle",
    descKey: "cookiePolicyFunctionalDesc",
    itemsKey: "cookiePolicyFunctionalItems",
  },
  {
    icon: <BarChart3 className="h-4 w-4" />,
    titleKey: "cookiePolicyAnalyticsTitle",
    descKey: "cookiePolicyAnalyticsDesc",
    itemsKey: "cookiePolicyAnalyticsItems",
  },
  {
    icon: <HardDrive className="h-4 w-4" />,
    titleKey: "cookiePolicyLocalStorageTitle",
    descKey: "cookiePolicyLocalStorageDesc",
    itemsKey: "cookiePolicyLocalStorageItems",
  },
]

export default function CookiePolicyPage() {
  const { t } = useLanguage()
  const tKey = (key: string) => t(key as Parameters<typeof t>[0])

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-start overflow-x-hidden">
      <div className="relative flex w-full flex-col items-center justify-start">
        <div className="relative flex min-h-screen w-full max-w-7xl flex-col items-start justify-start">
          {/* Side rails - same as landing */}
          <div className="bg-muted absolute top-0 left-4 z-0 h-full w-px sm:left-6 md:left-8 lg:left-0" />
          <div className="bg-muted absolute top-0 right-4 z-0 h-full w-px sm:right-6 md:right-8 lg:right-0" />

          <div className="relative z-10 flex flex-col items-center justify-center self-stretch overflow-hidden border-x">
            {/* Decorative top pattern - same as landing */}
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
                HERO - matches landing Badge → Title → Desc pattern
                ═══════════════════════════════════════════════════ */}
            <div className="flex w-full flex-col items-center justify-center border-b overflow-hidden">
              <div className="relative flex items-center justify-center gap-6 self-stretch px-4 py-8 sm:px-6 md:px-24 md:py-16 overflow-hidden">
                <div className="relative flex w-full max-w-4xl flex-col items-center justify-start gap-3 overflow-hidden">
                  <Badge variant={"secondary"}>
                    <Cookie className="mr-1.5 h-3 w-3" />
                    {tKey("cookiePolicyLastUpdated")}: {tKey("cookiePolicyDate")}
                  </Badge>
                  <div className="flex w-full max-w-xl flex-col justify-center text-center text-xl leading-tight font-semibold tracking-tight sm:text-2xl md:text-3xl lg:text-5xl">
                    {tKey("cookiePolicyTitle")}
                  </div>
                  <div className="text-muted-foreground self-stretch text-center text-sm leading-6 max-w-2xl mx-auto">
                    {tKey("cookiePolicyIntro")}
                  </div>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                WHAT ARE COOKIES - left/right layout like FAQ
                ═══════════════════════════════════════════════════ */}
            <div className="flex w-full items-start justify-center border-b">
              <div className="flex flex-1 flex-col gap-6 px-4 py-16 md:px-12 md:py-20 lg:flex-row lg:gap-12">
                <div className="flex w-full flex-col gap-4 lg:flex-1 lg:py-5">
                  <h2 className="text-4xl leading-tight font-semibold tracking-tight">
                    {tKey("cookiePolicyWhatTitle")}
                  </h2>
                  <p className="text-muted-foreground text-base leading-7">
                    {tKey("cookiePolicyWhatDesc")}
                  </p>
                </div>
                <div className="w-full lg:flex-1">
                  {/* Terminal mockup - sleek monochrome */}
                  <div className="w-full rounded-lg border border-border bg-card/60 backdrop-blur-md overflow-hidden shadow-sm">
                    <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold tracking-wider">Cookie Inspector</span>
                      </div>
                      <div className="flex gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-border" />
                        <span className="h-2 w-2 rounded-full bg-border" />
                        <span className="h-2 w-2 rounded-full bg-border" />
                      </div>
                    </div>
                    <div className="p-4 font-mono text-[10px] space-y-1.5 bg-background/90 text-zinc-400">
                      <div className="text-foreground">{">"} document.cookie</div>
                      <div className="text-zinc-500">{"// "}&quot;cookieConsent=accepted; theme=dark; language=EN&quot;</div>
                      <div className="mt-2 text-foreground">{">"} localStorage.getItem(&quot;language&quot;)</div>
                      <div className="text-zinc-500">{"// "}&quot;EN&quot;</div>
                      <div className="mt-2 text-foreground">{">"} sessionStorage.length</div>
                      <div className="text-zinc-500">{"// "}0</div>
                      <div className="mt-2 text-muted-foreground">{"[OK]"} All storage secure - no PII detected</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                COOKIE TYPES - Badge header + 2x2 grid cards
                ═══════════════════════════════════════════════════ */}
            <div className="flex w-full flex-col items-center justify-center">
              <div className="flex items-center justify-center gap-6 self-stretch px-4 py-8 sm:px-6 md:px-24 md:py-16">
                <div className="flex w-full max-w-4xl flex-col items-center justify-start gap-3 overflow-hidden">
                  <Badge variant={"secondary"}>{tKey("cookiePolicyTypesTitle")}</Badge>
                  <div className="flex w-full max-w-xl flex-col justify-center text-center text-xl leading-tight font-semibold tracking-tight sm:text-2xl md:text-3xl lg:text-4xl">
                    {tKey("cookiePolicyTypesTitle")}
                  </div>
                </div>
              </div>

              <div className="w-full grid grid-cols-1 md:grid-cols-2 border-t">
                {COOKIE_TYPES.map((cookie) => {
                  const items = cookie.itemsKey ? splitItems(tKey(cookie.itemsKey)) : []
                  return (
                    <div
                      key={cookie.titleKey}
                      className="group relative flex flex-col gap-4 border-b border-r p-6 md:p-8 transition-colors hover:bg-muted/20"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/40 text-foreground shrink-0">
                          {cookie.icon}
                        </div>
                        <h3 className="text-base font-semibold tracking-tight">{tKey(cookie.titleKey)}</h3>
                      </div>
                      <p className="text-muted-foreground text-sm leading-6">
                        {tKey(cookie.descKey)}
                      </p>
                      {items.length > 0 && (
                        <div className="mt-auto space-y-2 pt-2">
                          {items.map((item, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="text-muted-foreground mt-1.5 h-1.5 w-1.5 rounded-full bg-current shrink-0" />
                              <span className="text-muted-foreground text-xs leading-relaxed">{item}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                MANAGEMENT + THIRD PARTY + RETENTION - stacked FAQ-style
                ═══════════════════════════════════════════════════ */}
            <div className="flex w-full flex-col">
              {/* Manage Cookies */}
              <div className="flex w-full items-start justify-center border-b">
                <div className="flex flex-1 flex-col gap-6 px-4 py-16 md:px-12 md:py-20 lg:flex-row lg:gap-12">
                  <div className="flex w-full flex-col gap-4 lg:flex-1 lg:py-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/40 text-foreground shrink-0">
                        <SlidersHorizontal className="h-4 w-4" />
                      </div>
                      <h2 className="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
                        {tKey("cookiePolicyManageTitle")}
                      </h2>
                    </div>
                    <p className="text-muted-foreground text-sm leading-7">
                      {tKey("cookiePolicyManageDesc")}
                    </p>
                  </div>
                  <div className="w-full lg:flex-1 flex items-center">
                    <div className="w-full rounded-lg border border-border bg-muted/30 p-5 flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {tKey("cookiePolicyManageWarning")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Third-Party + Retention - two-col */}
              <div className="w-full grid grid-cols-1 md:grid-cols-2 border-b">
                <div className="flex flex-col gap-4 border-r p-6 md:p-8">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/40 text-foreground shrink-0">
                      <Globe className="h-4 w-4" />
                    </div>
                    <h3 className="text-base font-semibold tracking-tight">{tKey("cookiePolicyThirdPartyTitle")}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm leading-6">{tKey("cookiePolicyThirdPartyDesc")}</p>
                  <div className="mt-auto space-y-2 pt-2">
                    {splitItems(tKey("cookiePolicyThirdPartyItems")).map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-muted-foreground mt-1.5 h-1.5 w-1.5 rounded-full bg-current shrink-0" />
                        <span className="text-muted-foreground text-xs leading-relaxed">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-4 p-6 md:p-8">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/40 text-foreground shrink-0">
                      <Clock className="h-4 w-4" />
                    </div>
                    <h3 className="text-base font-semibold tracking-tight">{tKey("cookiePolicyRetentionTitle")}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm leading-6">{tKey("cookiePolicyRetentionDesc")}</p>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                CONTACT - same layout as FAQ left/right
                ═══════════════════════════════════════════════════ */}
            <div className="flex w-full items-start justify-center border-b">
              <div className="flex flex-1 flex-col gap-6 px-4 py-16 md:px-12 md:py-20 lg:flex-row lg:gap-12">
                <div className="flex w-full flex-col gap-4 lg:flex-1 lg:py-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/40 text-foreground shrink-0">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <h2 className="text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
                      {tKey("cookiePolicyContactTitle")}
                    </h2>
                  </div>
                  <p className="text-muted-foreground text-sm leading-7">
                    {tKey("cookiePolicyContactDesc")}
                  </p>
                </div>
                <div className="w-full lg:flex-1 flex flex-col gap-3 justify-center">
                  <a href="#" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full justify-start gap-3 h-12 text-sm font-medium cursor-pointer">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      {tKey("cookiePolicyContactDiscord")}
                    </Button>
                  </a>
                  <Link href="/portal/tickets">
                    <Button variant="outline" className="w-full justify-start gap-3 h-12 text-sm font-medium cursor-pointer">
                      <Terminal className="h-4 w-4 text-muted-foreground" />
                      {tKey("cookiePolicyContactTicket")}
                    </Button>
                  </Link>
                  <Link href="/">
                    <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer">
                      <ArrowLeft className="h-4 w-4" />
                      {tKey("cookiePolicyBackHome")}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* CTA + Footer - same as landing */}
            <CTASection />
            <FooterSection />
          </div>
        </div>
      </div>
    </div>
  )
}
