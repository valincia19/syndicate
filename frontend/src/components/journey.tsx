"use client"

import { useLanguage } from "@/components/providers/language-provider"
import {
  SectionHeader,
  SectionHeaderDescription,
  SectionHeaderHeading,
} from "@/components/page-header"

const MILESTONES = [
  { dateKey: "aboutMilestone1Date", titleKey: "aboutMilestone1Title", descKey: "aboutMilestone1Desc" },
  { dateKey: "aboutMilestone2Date", titleKey: "aboutMilestone2Title", descKey: "aboutMilestone2Desc" },
  { dateKey: "aboutMilestone3Date", titleKey: "aboutMilestone3Title", descKey: "aboutMilestone3Desc" },
  { dateKey: "aboutMilestone4Date", titleKey: "aboutMilestone4Title", descKey: "aboutMilestone4Desc" },
  { dateKey: "aboutMilestone5Date", titleKey: "aboutMilestone5Title", descKey: "aboutMilestone5Desc" },
  { dateKey: "aboutMilestone6Date", titleKey: "aboutMilestone6Title", descKey: "aboutMilestone6Desc" },
] as const

export function Journey() {
  const { t } = useLanguage()

  return (
    <section className="relative container">
      <div className="border-x border-b pb-20">
        <SectionHeader>
          <SectionHeaderHeading>{t("aboutJourneyHeading")}</SectionHeaderHeading>
          <SectionHeaderDescription>
            {t("aboutJourneyDesc")}
          </SectionHeaderDescription>
        </SectionHeader>

        <div className="mx-auto max-w-4xl px-4">
          <ol className="border-l border-border/60">
            {MILESTONES.map((entry) => (
              <li
                key={entry.titleKey}
                className="relative pl-6 pb-8 last:pb-0"
              >
                <span
                  aria-hidden="true"
                  className="bg-background border-border absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border"
                />
                <p className="text-muted-foreground font-mono text-[11px] tracking-wider uppercase">
                  {t(entry.dateKey)}
                </p>
                <h3 className="mt-1 text-base font-semibold tracking-tight md:text-lg">
                  {t(entry.titleKey)}
                </h3>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  {t(entry.descKey)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
