"use client"

import { Header } from "@/components/layout/header"
import FooterSection from "@/components/layout/footer"
import CTASection from "@/components/landing/cta-section"
import { useLanguage } from "@/components/providers/language-provider"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, Eye, Database, Server, UserCheck, Trash2, CheckCircle2, XCircle } from "lucide-react"


export default function PrivacyPage() {
  const { t } = useLanguage()
  const tKey = (key: string) => t(key as Parameters<typeof t>[0])

  const LIFECYCLE = [
    { num: "01", title: tKey("privacyStep1Title"), desc: tKey("privacyStep1Desc"), icon: <UserCheck className="h-4 w-4" /> },
    { num: "02", title: tKey("privacyStep2Title"), desc: tKey("privacyStep2Desc"), icon: <Server className="h-4 w-4" /> },
    { num: "03", title: tKey("privacyStep3Title"), desc: tKey("privacyStep3Desc"), icon: <Database className="h-4 w-4" /> },
  ]

  const MATRIX = [
    {
      what: tKey("privacyRow1What"),
      why: tKey("privacyRow1Why"),
      never: tKey("privacyRow1Never"),
    },
    {
      what: tKey("privacyRow2What"),
      why: tKey("privacyRow2Why"),
      never: tKey("privacyRow2Never"),
    },
    {
      what: tKey("privacyRow3What"),
      why: tKey("privacyRow3Why"),
      never: tKey("privacyRow3Never"),
    },
  ]

  const RIGHTS = [
    { title: tKey("privacyRight1"), icon: <Eye className="h-4 w-4" /> },
    { title: tKey("privacyRight2"), icon: <Trash2 className="h-4 w-4" /> },
    { title: tKey("privacyRight3"), icon: <ShieldCheck className="h-4 w-4" /> },
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
                PRIVACY HERO
                ═══════════════════════════════════════════════════ */}
            <div className="flex w-full flex-col items-center justify-center border-b overflow-hidden">
              <div className="relative flex items-center justify-center gap-6 self-stretch px-4 py-12 sm:px-6 md:px-24 md:py-20 overflow-hidden">
                <div className="relative flex w-full max-w-4xl flex-col items-center justify-start gap-4 text-center overflow-hidden">
                  <Badge variant={"secondary"} className="gap-1.5 px-3 py-1">
                    <Eye className="h-3.5 w-3.5 text-primary" />
                    {tKey("privacyBadge")} - {tKey("privacyDate")}
                  </Badge>
                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground uppercase font-outfit">
                    {tKey("privacyTitle")}
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
                    {tKey("privacyIntro")}
                  </p>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                DATA PROCESSING LIFECYCLE (3-Step Flow)
                ═══════════════════════════════════════════════════ */}
            <div className="flex w-full flex-col items-center justify-center border-b">
              <div className="flex items-center justify-center gap-6 self-stretch px-4 py-8 sm:px-6 md:px-24 md:py-12 border-b w-full">
                <div className="flex w-full max-w-4xl flex-col items-center justify-start gap-2 text-center">
                  <Badge variant={"secondary"}>{tKey("privacyFlowTitle")}</Badge>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {tKey("privacyFlowTitle")}
                  </h2>
                </div>
              </div>

              <div className="w-full grid grid-cols-1 md:grid-cols-3">
                {LIFECYCLE.map((step, idx) => (
                  <div key={idx} className="flex flex-col gap-3 p-6 md:p-8 border-b md:border-b-0 border-r last:border-r-0 hover:bg-muted/15 transition-colors relative">
                    <div className="flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/40 text-foreground shrink-0">
                        {step.icon}
                      </div>
                      <span className="font-mono text-xs font-bold text-muted-foreground/50">{step.num}</span>
                    </div>
                    <h3 className="text-base font-bold text-foreground tracking-tight mt-2">{step.title}</h3>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                DATA COLLECTION TRANSPARENCY MATRIX (Table)
                ═══════════════════════════════════════════════════ */}
            <div className="flex w-full flex-col items-center justify-center border-b px-4 py-16 md:px-12 md:py-20">
              <div className="w-full max-w-4xl flex flex-col gap-6">
                <div className="flex flex-col gap-2 text-center">
                  <Badge variant={"secondary"} className="w-fit mx-auto">{tKey("privacyMatrixTitle")}</Badge>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{tKey("privacyMatrixTitle")}</h2>
                </div>

                <div className="w-full overflow-x-auto rounded-lg border border-border bg-card/40">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-border bg-muted/30 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                        <th className="p-4">{tKey("privacyColWhat")}</th>
                        <th className="p-4">{tKey("privacyColWhy")}</th>
                        <th className="p-4">{tKey("privacyColNever")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-xs">
                      {MATRIX.map((row, i) => (
                        <tr key={i} className="hover:bg-muted/20 transition-colors">
                          <td className="p-4 font-semibold text-foreground flex items-center gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            {row.what}
                          </td>
                          <td className="p-4 text-muted-foreground">{row.why}</td>
                          <td className="p-4 text-muted-foreground flex items-center gap-2">
                            <XCircle className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                            {row.never}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                YOUR DATA RIGHTS
                ═══════════════════════════════════════════════════ */}
            <div className="flex w-full flex-col items-center justify-center border-b">
              <div className="flex items-center justify-center gap-6 self-stretch px-4 py-8 sm:px-6 md:px-24 md:py-12 border-b w-full">
                <div className="flex w-full max-w-4xl flex-col items-center justify-start gap-2 text-center">
                  <Badge variant={"secondary"}>{tKey("privacyRightsTitle")}</Badge>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {tKey("privacyRightsTitle")}
                  </h2>
                </div>
              </div>

              <div className="w-full grid grid-cols-1 md:grid-cols-3">
                {RIGHTS.map((r, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-6 border-b md:border-b-0 border-r last:border-r-0 hover:bg-muted/15 transition-colors">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/40 text-foreground shrink-0">
                      {r.icon}
                    </div>
                    <span className="text-xs font-semibold text-foreground">{r.title}</span>
                  </div>
                ))}
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
