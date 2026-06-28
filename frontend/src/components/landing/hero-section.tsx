"use client"

import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/providers/language-provider"

export function HeroSection() {
  const { t } = useLanguage()

  return (
    <section className="relative pt-40 pb-16">
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex flex-col items-center gap-12">
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-col items-center gap-6">
              <h1 className="max-w-4xl text-center text-5xl leading-tight font-medium md:text-7xl">
                {t("heroTitle")}
              </h1>
              <p className="text-muted-foreground max-w-xl text-center text-lg leading-7 font-medium">
                {t("heroDesc")}
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <Button size="lg">{t("heroBtn")}</Button>
          </div>
        </div>
      </div>
    </section>
  )
}
