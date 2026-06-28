"use client"

import { Header } from "@/components/layout/header"
import FooterSection from "@/components/layout/footer"
import CTASection from "@/components/landing/cta-section"
import { useLanguage } from "@/components/providers/language-provider"
import { Badge } from "@/components/ui/badge"
import {
  ShieldCheck,
  Lock,
  Cpu,
  Database,
  Key,
  Server,
  Terminal,
  FileCheck2,
  Bug,
  ArrowRight,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function SecurityPage() {
  const { t } = useLanguage()
  const tKey = (key: string) => t(key as Parameters<typeof t>[0])

  const METRICS = [
    { value: tKey("secMetric1Val"), label: tKey("secMetric1Lbl"), icon: <Lock className="h-4 w-4 text-muted-foreground" /> },
    { value: tKey("secMetric2Val"), label: tKey("secMetric2Lbl"), icon: <Server className="h-4 w-4 text-muted-foreground" /> },
    { value: tKey("secMetric3Val"), label: tKey("secMetric3Lbl"), icon: <FileCheck2 className="h-4 w-4 text-muted-foreground" /> },
    { value: tKey("secMetric4Val"), label: tKey("secMetric4Lbl"), icon: <Key className="h-4 w-4 text-muted-foreground" /> },
  ]

  const PILLARS = [
    { title: tKey("secPillar1Title"), desc: tKey("secPillar1Desc"), icon: <Cpu className="h-5 w-5" /> },
    { title: tKey("secPillar2Title"), desc: tKey("secPillar2Desc"), icon: <Database className="h-5 w-5" /> },
    { title: tKey("secPillar3Title"), desc: tKey("secPillar3Desc"), icon: <Server className="h-5 w-5" /> },
    { title: tKey("secPillar4Title"), desc: tKey("secPillar4Desc"), icon: <Key className="h-5 w-5" /> },
  ]

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
                SECURITY HERO - Technical Stats Banner
                ═══════════════════════════════════════════════════ */}
            <div className="flex w-full flex-col items-center justify-center border-b overflow-hidden">
              <div className="relative flex items-center justify-center gap-6 self-stretch px-4 py-12 sm:px-6 md:px-24 md:py-20 overflow-hidden">
                <div className="relative flex w-full max-w-4xl flex-col items-center justify-start gap-4 text-center overflow-hidden">
                  <Badge variant={"secondary"} className="gap-1.5 px-3 py-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    {tKey("securityBadge")} - {tKey("securityDate")}
                  </Badge>
                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground uppercase font-outfit">
                    {tKey("securityTitle")}
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
                    {tKey("securityIntro")}
                  </p>
                </div>
              </div>

              {/* Metrics Grid Banner */}
              <div className="w-full grid grid-cols-2 md:grid-cols-4 border-t bg-muted/20">
                {METRICS.map((m, idx) => (
                  <div key={idx} className="flex flex-col items-center justify-center p-6 border-r border-b md:border-b-0 last:border-r-0 text-center gap-1.5">
                    <div className="flex items-center gap-2 mb-1">
                      {m.icon}
                      <span className="text-2xl sm:text-3xl font-bold tracking-tight font-mono text-foreground">{m.value}</span>
                    </div>
                    <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                DEFENSE CORE ARCHITECTURE - 4 Pillar Modules
                ═══════════════════════════════════════════════════ */}
            <div className="flex w-full flex-col items-center justify-center border-b">
              <div className="flex items-center justify-center gap-6 self-stretch px-4 py-8 sm:px-6 md:px-24 md:py-12 border-b w-full">
                <div className="flex w-full max-w-4xl flex-col items-center justify-start gap-2 text-center">
                  <Badge variant={"secondary"}>{tKey("secPillarsTitle")}</Badge>
                  <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
                    {tKey("secPillarsTitle")}
                  </h2>
                </div>
              </div>

              <div className="w-full grid grid-cols-1 md:grid-cols-2">
                {PILLARS.map((p, idx) => (
                  <div key={idx} className="flex flex-col gap-3 p-8 border-b border-r last:border-r-0 hover:bg-muted/15 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/40 text-foreground shrink-0">
                        {p.icon}
                      </div>
                      <h3 className="text-lg font-bold text-foreground tracking-tight">{p.title}</h3>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed pl-[3.25rem]">
                      {p.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                LIVE SECURITY PROTOCOL MATRIX (Terminal Mockup)
                ═══════════════════════════════════════════════════ */}
            <div className="flex w-full flex-col items-center justify-center border-b px-4 py-16 md:px-12 md:py-20">
              <div className="w-full max-w-4xl flex flex-col gap-6">
                <div className="flex flex-col gap-2 text-left">
                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    <Terminal className="h-4 w-4" />
                    <span>Active Protocol Verification</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{tKey("secMatrixTitle")}</h2>
                </div>

                <div className="w-full rounded-lg border border-border bg-card/70 backdrop-blur-md overflow-hidden shadow-sm">
                  <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-muted-foreground">security-handshake.sh --check-all</span>
                    <div className="flex gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-border" />
                      <span className="h-2.5 w-2.5 rounded-full bg-border" />
                      <span className="h-2.5 w-2.5 rounded-full bg-border" />
                    </div>
                  </div>
                  <div className="p-5 font-mono text-xs space-y-2.5 bg-background/95 text-zinc-400">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">[1/4] TLS 1.2+ Handshake Protocol</span>
                      <span className="text-emerald-500 font-bold flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> VERIFIED</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">[2/4] PostgreSQL Encrypted Pool</span>
                      <span className="text-emerald-500 font-bold flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> ENCRYPTED</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">[3/4] Upstash Redis Rate Limiter Guard</span>
                      <span className="text-emerald-500 font-bold flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> ACTIVE</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">[4/4] Hardware-Bound HWID Token Lock</span>
                      <span className="text-emerald-500 font-bold flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> PROTECTED</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                BUG BOUNTY & VULNERABILITY DISCLOSURE
                ═══════════════════════════════════════════════════ */}
            <div className="flex w-full items-start justify-center border-b">
              <div className="flex flex-1 flex-col gap-6 px-4 py-16 md:px-12 md:py-20 lg:flex-row lg:gap-12">
                <div className="flex w-full flex-col gap-3 lg:flex-1">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/40 text-foreground">
                      <Bug className="h-4 w-4" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">{tKey("secBountyTitle")}</h2>
                  </div>
                  <p className="text-muted-foreground text-sm leading-7">
                    {tKey("secBountyDesc")}
                  </p>
                </div>
                <div className="w-full lg:flex-1 flex items-center justify-start lg:justify-end">
                  <Link href="/portal/tickets">
                    <Button variant="outline" className="h-12 px-6 gap-2 text-sm font-medium cursor-pointer">
                      {tKey("secBountyAction")}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            <CTASection />
            <FooterSection />
          </div>
        </div>
      </div>
    </div>
  )
}
