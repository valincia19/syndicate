"use client"

import { BentoGrid, BentoGridItem } from "@/components/ui/bento"
import { GridPattern } from "@/components/ui/grid-pattern"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/providers/language-provider"

export function BentoSection() {
  const { t } = useLanguage()

  return (
    <div className="flex w-full flex-col items-center justify-center">
      <div className="flex items-center justify-center gap-6 self-stretch px-4 py-8 sm:px-6 md:px-24 md:py-16">
        <div className="flex w-full max-w-4xl flex-col items-center justify-start gap-3 overflow-hidden">
          <Badge variant={"secondary"}>{t("bentoBadge")}</Badge>
          <div className="flex w-full max-w-xl flex-col justify-center text-center text-xl leading-tight font-semibold tracking-tight sm:text-2xl md:text-3xl lg:text-5xl">
            {t("bentoTitle")}
          </div>
          <div className="text-muted-foreground self-stretch text-center text-sm leading-6">
            {t("bentoDesc")}
          </div>
        </div>
      </div>

      <div className="border-y p-4">
        <BentoGrid
          cols={{ base: 2, md: 3, lg: 4 }}
          rowHeight={{ base: "180px", md: "220px", lg: "240px" }}
          className=""
        >
          <BentoGridItem colSpan={2} rowSpan={2} className="rounded-none p-0">
            <div className="relative flex h-full flex-col justify-between p-8">
              <GridPattern
                width={80}
                height={80}
                squares={[
                  [6, 2],
                  [2, 3],
                  [4, 4],
                ]}
              />
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
                  {t("bentoCard1Title")}
                </h1>
                <p className="text-muted-foreground mt-4 max-w-md text-sm md:text-base">
                  {t("bentoCard1Desc")}
                </p>
              </div>
              <div className="relative z-10 flex gap-3">
                <Button size="lg">{t("bentoCard1Btn1")}</Button>
                <Button variant="outline" size="lg">
                  {t("bentoCard1Btn2")}
                </Button>
              </div>
            </div>
          </BentoGridItem>

          <BentoGridItem className="rounded-none">
            <div className="flex h-full flex-col justify-between">
              <span className="text-muted-foreground text-sm">
                {t("bentoCard2Title")}
              </span>
              <div className="space-y-2 text-sm font-medium">
                <p>{t("bentoCard2ESP")}</p>
                <p>{t("bentoCard2Farm")}</p>
                <p>{t("bentoCard2Inventory")}</p>
                <p>{t("bentoCard2GUI")}</p>
              </div>
            </div>
          </BentoGridItem>

          <BentoGridItem className="rounded-none">
            <div className="flex h-full flex-col justify-between">
              <span className="text-muted-foreground text-sm">{t("bentoCard3Title")}</span>
              <p className="text-sm font-medium">
                {t("bentoCard3Cycle")}
              </p>
              <p className="text-muted-foreground text-xs">
                {t("bentoCard3Desc")}
              </p>
            </div>
          </BentoGridItem>

          <BentoGridItem colSpan={2} className="rounded-none">
            <div className="flex h-full flex-col justify-between">
              <span className="text-muted-foreground text-sm">
                {t("bentoCard4Label")}
              </span>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  {t("bentoCard4Title")}
                </h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  {t("bentoCard4Desc")}
                </p>
              </div>
            </div>
          </BentoGridItem>

          <BentoGridItem className="rounded-none">
            <div className="flex h-full flex-col justify-between">
              <span className="text-muted-foreground text-sm">
                {t("bentoCard5Title")}
              </span>
              <p className="text-sm italic">
                {t("bentoCard5Quote")}
              </p>
              <p className="text-muted-foreground text-xs">
                {t("bentoCard5Dev")}
              </p>
            </div>
          </BentoGridItem>

          <BentoGridItem className="flex items-center justify-center rounded-none">
            <div className="text-center">
              <h2 className="text-5xl font-bold tracking-tight">{t("bentoCard6Num")}</h2>
              <p className="text-muted-foreground text-sm">
                {t("bentoCard6Label")}
              </p>
            </div>
          </BentoGridItem>

          <BentoGridItem colSpan={2} className="rounded-none">
            <div className="flex h-full flex-col justify-between">
              <span className="text-muted-foreground text-sm">{t("bentoCard7Label")}</span>
              <p className="text-sm font-medium">
                {t("bentoCard7Executors")}
              </p>
              <p className="text-muted-foreground text-xs">
                {t("bentoCard7Desc")}
              </p>
            </div>
          </BentoGridItem>
        </BentoGrid>
      </div>

      <div className="relative h-12 self-stretch overflow-hidden border-b">
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
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
