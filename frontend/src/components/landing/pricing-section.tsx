"use client"

import { Check, X } from "lucide-react"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/providers/language-provider"

export default function PricingSection() {
  const { t } = useLanguage()
  const router = useRouter()

  const freeFeatures = [
    { text: t("planFreeFeat1"), unlocked: true },
    { text: t("planFreeFeat2"), unlocked: true },
    { text: t("planFreeFeat3"), unlocked: true },
    { text: t("planFreeFeat4"), unlocked: true },
    { text: t("planFreeFeat5"), unlocked: true },
    { text: t("planFreeFeat6"), unlocked: true },
    { text: t("planFreeFeat7"), unlocked: false },
    { text: t("planFreeFeat8"), unlocked: false },
    { text: t("planFreeFeat9"), unlocked: false },
    { text: t("planFreeFeat10"), unlocked: false },
    { text: t("planFreeFeat11"), unlocked: false },
    { text: t("planFreeFeat12"), unlocked: false },
  ]

  const premiumFeatures = [
    { text: t("planPremFeat1"), unlocked: true },
    { text: t("planPremFeat2"), unlocked: true },
    { text: t("planPremFeat3"), unlocked: true },
    { text: t("planPremFeat4"), unlocked: true },
    { text: t("planPremFeat5"), unlocked: true },
    { text: t("planPremFeat6"), unlocked: true },
    { text: t("planPremFeat7"), unlocked: true },
    { text: t("planPremFeat8"), unlocked: true },
    { text: t("planPremFeat9"), unlocked: false },
    { text: t("planPremFeat10"), unlocked: false },
    { text: t("planPremFeat11"), unlocked: false },
    { text: t("planPremFeat12"), unlocked: false },
  ]

  const proFeatures = [
    { text: t("planProFeat1"), unlocked: true },
    { text: t("planProFeat2"), unlocked: true },
    { text: t("planProFeat3"), unlocked: true },
    { text: t("planProFeat4"), unlocked: true },
    { text: t("planProFeat5"), unlocked: true },
    { text: t("planProFeat6"), unlocked: true },
    { text: t("planProFeat7"), unlocked: true },
    { text: t("planProFeat8"), unlocked: true },
    { text: t("planProFeat9"), unlocked: true },
    { text: t("planProFeat10"), unlocked: true },
    { text: t("planProFeat11"), unlocked: true },
    { text: t("planProFeat12"), unlocked: true },
  ]

  return (
    <div id="pricing" className="flex w-full flex-col items-center justify-center gap-2">
      <div className="flex items-center justify-center gap-6 self-stretch px-4 py-8">
        <div className="flex w-full max-w-4xl flex-col items-center justify-start gap-3 overflow-hidden">
          <Badge variant={"secondary"}>{t("pricingBadge")}</Badge>
          <div className="flex w-full max-w-xl flex-col justify-center text-center text-xl leading-tight font-semibold tracking-tight sm:text-2xl md:text-3xl lg:text-5xl">
            {t("pricingTitle")}
          </div>
          <div className="text-muted-foreground self-stretch text-center text-sm leading-6">
            {t("pricingDesc")}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center self-stretch border-y pt-8">
        <div className="flex w-full items-start justify-center">
          {/* Left diagonal-line decoration */}
          <div className="relative w-4 self-stretch overflow-hidden sm:w-6 md:w-8 lg:w-12">
            <div className="absolute -top-30 -left-10 flex w-40 flex-col items-start justify-start">
              {Array.from({ length: 120 }).map((_, i) => (
                <div
                  key={i}
                  className="outline-primary/40 h-4 origin-top-left -rotate-45 self-stretch outline outline-offset-[-0.25px]"
                />
              ))}
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center md:flex-row md:gap-6">
            {/* Free Plan */}
            <div className="flex max-w-full flex-1 flex-col items-start justify-start gap-12 self-stretch overflow-hidden border-x px-6 py-5 md:max-w-none">
              <div className="flex flex-col items-start justify-start gap-9 self-stretch">
                <div className="flex flex-col items-start justify-start gap-2 self-stretch">
                  <div className="text-lg leading-7 font-medium">{t("planFreeName")}</div>
                  <div className="text-muted-foreground w-full max-w-80 text-sm leading-5 font-normal">
                    {t("planFreeDesc")}
                  </div>
                </div>

                <div className="flex flex-col items-start justify-start gap-2 self-stretch">
                  <div className="flex flex-col items-start justify-start gap-1">
                    <div className="relative flex h-15 items-center text-5xl font-medium">
                      <span>{t("planFreePrice")}</span>
                    </div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {t("planFreeSub")}
                    </div>
                  </div>
                </div>

                <Button size={"lg"} className="w-full">
                  {t("planFreeBtn")}
                </Button>
              </div>

              <div className="flex flex-col items-start justify-start gap-2.5 self-stretch border-t pt-6">
                {freeFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-start gap-3 self-stretch"
                  >
                    <div className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                      {feature.unlocked ? (
                        <Check className="h-4 w-4 text-foreground" />
                      ) : (
                        <X className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <div
                      className={`flex-1 text-[12.5px] font-normal leading-4 ${
                        feature.unlocked
                          ? "text-foreground"
                          : "text-muted-foreground/60 line-through"
                      }`}
                    >
                      {feature.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium Plan */}
            <div className="bg-black text-white dark:bg-white dark:text-black flex max-w-full flex-1 flex-col items-start justify-start gap-12 self-stretch overflow-hidden border-x px-6 py-5 md:max-w-none">
              <div className="flex flex-col items-start justify-start gap-9 self-stretch">
                <div className="flex flex-col items-start justify-start gap-2 self-stretch">
                  <div className="flex items-center justify-between w-full">
                    <div className="text-current text-lg leading-7 font-medium">
                      {t("planPremiumName")}
                    </div>
                    <Badge className="bg-background text-foreground hover:bg-background/90 text-xs">
                      {t("badgePopular")}
                    </Badge>
                  </div>
                  <div className="text-current/60 w-full max-w-80 text-sm leading-5 font-normal">
                    {t("planPremiumDesc")}
                  </div>
                </div>

                <div className="flex flex-col items-start justify-start gap-2 self-stretch">
                  <div className="flex flex-col items-start justify-start gap-1">
                    <span className="text-current/50 text-sm font-medium line-through">
                      {t("planPremiumOriginalPrice")}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <div className="text-current relative flex h-15 items-center text-5xl font-medium">
                        <span>{t("planPremiumPrice")}</span>
                      </div>
                      <span className="rounded-md bg-yellow-500/20 px-2 py-0.5 text-xs font-bold text-yellow-500 dark:bg-black dark:text-white dark:border dark:border-white/15 -translate-y-2">
                        {t("planPremiumDiscount")}
                      </span>
                    </div>
                    <div className="text-current text-sm font-medium opacity-80">
                      {t("planPremiumSub")}
                    </div>
                  </div>
                </div>
                
                <Button size={"lg"} className="w-full bg-background text-foreground hover:bg-background/90" onClick={() => router.push("/portal/payment?plan=premium")}>
                  {t("planPremiumBtn")}
                </Button>
              </div>

              <div className="flex flex-col items-start justify-start gap-2.5 self-stretch border-t border-current/20 pt-6">
                {premiumFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-start gap-3 self-stretch"
                  >
                    <div className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                      {feature.unlocked ? (
                        <Check className="h-4 w-4 text-current" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div
                      className={`flex-1 text-[12.5px] font-normal leading-4 ${
                        feature.unlocked
                          ? "text-current"
                          : "text-current/50 line-through"
                      }`}
                    >
                      {feature.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pro Pass */}
            <div className="flex max-w-full flex-1 flex-col items-start justify-start gap-12 self-stretch overflow-hidden border-x px-6 py-5 md:max-w-none">
              <div className="flex flex-col items-start justify-start gap-9 self-stretch">
                <div className="flex flex-col items-start justify-start gap-2 self-stretch">
                  <div className="flex items-center justify-between w-full">
                    <div className="text-lg leading-7 font-medium">{t("planProName")}</div>
                    <Badge variant="secondary" className="text-xs">
                      {t("badgeBestValue")}
                    </Badge>
                  </div>
                  <div className="w-full max-w-80 text-sm leading-5 font-normal text-muted-foreground">
                    {t("planProDesc")}
                  </div>
                </div>

                <div className="flex flex-col items-start justify-start gap-2 self-stretch">
                  <div className="flex flex-col items-start justify-start gap-1">
                    <span className="text-muted-foreground/50 text-sm font-medium line-through">
                      {t("planProOriginalPrice")}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <div className="relative flex h-15 items-center text-5xl font-medium">
                        <span>{t("planProPrice")}</span>
                      </div>
                      <span className="rounded-md bg-black/10 px-2 py-0.5 text-xs font-bold text-black border border-black/10 dark:bg-amber-500/20 dark:text-amber-400 dark:border-0 -translate-y-2">
                        {t("planProDiscount")}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {t("planProSub")}
                    </div>
                  </div>
                </div>
                <Button size={"lg"} className="w-full" onClick={() => router.push("/portal/payment?plan=pro")}>
                  {t("planProBtn")}
                </Button>
              </div>

              <div className="flex flex-col items-start justify-start gap-2.5 self-stretch border-t pt-6">
                {proFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-start gap-3 self-stretch"
                  >
                    <div className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                      {feature.unlocked ? (
                        <Check className="h-4 w-4 text-foreground" />
                      ) : (
                        <X className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <div
                      className={`flex-1 text-[12.5px] font-normal leading-4 ${
                        feature.unlocked
                          ? "text-foreground"
                          : "text-muted-foreground/60 line-through"
                      }`}
                    >
                      {feature.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right diagonal-line decoration */}
          <div className="relative w-4 self-stretch overflow-hidden sm:w-6 md:w-8 lg:w-12">
            <div className="absolute -top-30 -left-10 flex w-40 flex-col items-start justify-start">
              {Array.from({ length: 120 }).map((_, i) => (
                <div
                  key={i}
                  className="outline-primary/40 h-4 origin-top-left -rotate-45 self-stretch outline outline-offset-[-0.25px]"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
