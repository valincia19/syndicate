"use client"

import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/components/providers/language-provider"

/* ------------------------------------------------------------------ */
/*  Executor Wordmark Components - 100% original, no third-party libs  */
/* ------------------------------------------------------------------ */

function ExecutorWordmark({ name, mono = false }: { name: string; mono?: boolean }) {
  return (
    <svg
      viewBox="0 0 140 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-8 w-auto max-w-[120px]"
      aria-label={name}
    >
      <text
        x="70"
        y="28"
        textAnchor="middle"
        fill="currentColor"
        fontFamily={
          mono
            ? "'JetBrains Mono', 'Fira Code', 'Courier New', monospace"
            : "'Inter', 'Helvetica Neue', Arial, sans-serif"
        }
        fontSize="16"
        fontWeight={mono ? "500" : "600"}
        letterSpacing={mono ? "1" : "-0.3"}
      >
        {name}
      </text>
    </svg>
  )
}

/* List of supported Roblox executors */
const EXECUTORS = [
  { name: "Synapse Z",   mono: false },
  { name: "Wave",        mono: false },
  { name: "Solara",      mono: false },
  { name: "Celery",      mono: false },
  { name: "Macsploit",   mono: false },
  { name: "Foxzy",       mono: false },
  { name: "Seliware",    mono: false },
  { name: "Potassium",   mono: true  },
  { name: "Arceus X",    mono: false },
  { name: "Delta",       mono: false },
  { name: "Fluxus",      mono: true  },
  { name: "Hydrogen",    mono: false },
]

/* ------------------------------------------------------------------ */
/*  LogoSection                                                        */
/* ------------------------------------------------------------------ */

export function LogoSection() {
  const { t } = useLanguage()

  return (
    <div className="flex w-full flex-col items-center justify-center">
      <div className="flex items-center justify-center gap-6 self-stretch px-4 py-8 sm:px-6 md:px-24 md:py-16">
        <div className="flex w-full max-w-4xl flex-col items-center justify-start gap-3 overflow-hidden">
          <Badge variant={"secondary"}>{t("logoBadge")}</Badge>
          <div className="flex w-full max-w-xl flex-col justify-center text-center text-xl leading-tight font-semibold tracking-tight sm:text-2xl md:text-3xl lg:text-5xl">
            {t("logoTitle")}
          </div>
          <div className="text-muted-foreground self-stretch text-center text-sm leading-6">
            {t("logoDesc")}
          </div>
        </div>
      </div>

      <div className="flex items-start justify-center self-stretch border-y">
        {/* Left diagonal-line decoration */}
        <div className="relative w-4 self-stretch overflow-hidden sm:w-6 md:w-8 lg:w-12">
          <div className="absolute -top-30 -left-10 flex w-40 flex-col items-start justify-start">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="outline-primary/40 h-4 origin-top-left -rotate-45 self-stretch outline outline-offset-[-0.25px]"
              />
            ))}
          </div>
        </div>

        {/* Executor grid */}
        <div className="w-full">
          <div className="mx-auto grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
            {EXECUTORS.map(({ name, mono }) => (
              <div
                key={name}
                className="text-foreground/70 hover:text-foreground flex h-20 w-full items-center justify-center border transition-colors duration-200 md:h-24"
              >
                <ExecutorWordmark name={name} mono={mono} />
              </div>
            ))}
          </div>
        </div>

        {/* Right diagonal-line decoration */}
        <div className="relative w-4 self-stretch overflow-hidden sm:w-6 md:w-8 lg:w-12">
          <div className="absolute -top-30 -left-10 flex w-40 flex-col items-start justify-start">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="outline-primary/40 h-4 origin-top-left -rotate-45 self-stretch outline outline-offset-[-0.25px]"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
