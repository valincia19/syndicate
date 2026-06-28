"use client"

import { Header } from "@/components/layout/header"
import FooterSection from "@/components/layout/footer"
import CTASection from "@/components/landing/cta-section"
import { useLanguage } from "@/components/providers/language-provider"
import { Badge } from "@/components/ui/badge"
import { FileText, KeyRound, Ban, CreditCard } from "lucide-react"


export default function TermsPage() {
  const { t } = useLanguage()
  const tKey = (key: string) => t(key as Parameters<typeof t>[0])

  const SUMMARIES = [
    { title: tKey("termsSum1Title"), desc: tKey("termsSum1Desc"), icon: <KeyRound className="h-4 w-4" /> },
    { title: tKey("termsSum2Title"), desc: tKey("termsSum2Desc"), icon: <Ban className="h-4 w-4" /> },
    { title: tKey("termsSum3Title"), desc: tKey("termsSum3Desc"), icon: <CreditCard className="h-4 w-4" /> },
  ]

  const SECTIONS = [
    { id: "sec1", title: tKey("termsSec1Title"), desc: tKey("termsSec1Desc") },
    { id: "sec2", title: tKey("termsSec2Title"), desc: tKey("termsSec2Desc") },
    { id: "sec3", title: tKey("termsSec3Title"), desc: tKey("termsSec3Desc") },
    { id: "sec4", title: tKey("termsSec4Title"), desc: tKey("termsSec4Desc") },
    { id: "sec5", title: tKey("termsSec5Title"), desc: tKey("termsSec5Desc") },
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
                TERMS HERO
                ═══════════════════════════════════════════════════ */}
            <div className="flex w-full flex-col items-center justify-center border-b overflow-hidden">
              <div className="relative flex items-center justify-center gap-6 self-stretch px-4 py-12 sm:px-6 md:px-24 md:py-20 overflow-hidden">
                <div className="relative flex w-full max-w-4xl flex-col items-center justify-start gap-4 text-center overflow-hidden">
                  <Badge variant={"secondary"} className="gap-1.5 px-3 py-1">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    {tKey("termsBadge")} - {tKey("termsDate")}
                  </Badge>
                  <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground uppercase font-outfit">
                    {tKey("termsTitle")}
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
                    {tKey("termsIntro")}
                  </p>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                AGREEMENT AT A GLANCE (3 Summary Cards)
                ═══════════════════════════════════════════════════ */}
            <div className="flex w-full flex-col items-center justify-center border-b">
              <div className="flex items-center justify-center gap-6 self-stretch px-4 py-8 sm:px-6 md:px-24 md:py-12 border-b w-full">
                <div className="flex w-full max-w-4xl flex-col items-center justify-start gap-2 text-center">
                  <Badge variant={"secondary"}>{tKey("termsSummaryTitle")}</Badge>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {tKey("termsSummaryTitle")}
                  </h2>
                </div>
              </div>

              <div className="w-full grid grid-cols-1 md:grid-cols-3">
                {SUMMARIES.map((s, idx) => (
                  <div key={idx} className="flex flex-col gap-3 p-6 md:p-8 border-b md:border-b-0 border-r last:border-r-0 hover:bg-muted/15 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/40 text-foreground shrink-0">
                        {s.icon}
                      </div>
                      <h3 className="text-base font-bold text-foreground">{s.title}</h3>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {s.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                CONTRACT CLAUSES (Side-Nav + Clause List)
                ═══════════════════════════════════════════════════ */}
            <div className="flex w-full items-start justify-center">
              <div className="flex flex-1 flex-col md:flex-row w-full">
                {/* Desktop Sticky Left Jump Index */}
                <div className="w-full md:w-64 border-b md:border-b-0 md:border-r p-6 shrink-0 sticky top-16 bg-background/50 backdrop-blur-md">
                  <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider block mb-4">Jump Index</span>
                  <div className="flex flex-col gap-2">
                    {SECTIONS.map((sec, i) => (
                      <a
                        key={sec.id}
                        href={`#${sec.id}`}
                        className="text-xs text-muted-foreground hover:text-foreground hover:translate-x-1 transition-all py-1 font-mono flex items-center gap-2"
                      >
                        <span className="text-[10px] text-muted-foreground/60">0{i + 1}</span>
                        <span className="truncate">{sec.title.split(".")[1] || sec.title}</span>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Clauses Content */}
                <div className="flex-1 p-6 md:p-12 space-y-8">
                  {SECTIONS.map((sec) => (
                    <div id={sec.id} key={sec.id} className="scroll-mt-24 p-6 rounded-lg border border-border bg-card/40 hover:border-border/80 transition-all space-y-3">
                      <h3 className="text-lg font-bold text-foreground tracking-tight">{sec.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {sec.desc}
                      </p>
                    </div>
                  ))}
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
