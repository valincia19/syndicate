"use client"

import type { DictionaryKey } from "@/config/i18n"
import { useLanguage } from "@/components/providers/language-provider"
import {
  SectionHeader,
  SectionHeaderDescription,
  SectionHeaderHeading,
} from "@/components/page-header"
import { Plus } from "lucide-react"

const TEAM: { initials: string; nameKey: DictionaryKey; roleKey: DictionaryKey; hue: number }[] = [
  { initials: "VE", nameKey: "aboutMember1Name", roleKey: "aboutRoleFounder", hue: 0 },
  { initials: "SY", nameKey: "aboutMember2Name", roleKey: "aboutRoleMarketing", hue: 40 },
  { initials: "CH", nameKey: "aboutMember3Name", roleKey: "aboutRoleSupport", hue: 250 },
]

const PARTNERS: { labelKey: DictionaryKey; href: string }[] = [
  { labelKey: "aboutPartner1", href: "https://discord.com" },
  { labelKey: "aboutPartner2", href: "https://github.com" },
]

export function Me() {
  const { t } = useLanguage()

  return (
    <div className="relative border-b pb-20">
      <SectionHeader>
        <SectionHeaderHeading>{t("aboutMeHeading")}</SectionHeaderHeading>
        <SectionHeaderDescription>
          {t("aboutMeDesc")}
        </SectionHeaderDescription>
      </SectionHeader>

      <div className="container mx-auto max-w-4xl px-4">
        <div className="grid items-center justify-center gap-8 lg:grid-cols-3">
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-muted-foreground text-sm leading-6">{t("aboutMeLeft")}</p>
          </div>

          <div className="relative mx-auto flex h-[280px] w-[210px] flex-col items-center justify-center rounded-2xl border border-primary/10 bg-card sm:h-[340px] sm:w-[260px]">
            <Plus className="text-primary absolute -top-4 -left-4" />
            <Plus className="text-primary absolute -bottom-4 -left-4" />
            <Plus className="text-primary absolute -top-4 -right-4" />
            <Plus className="text-primary absolute -right-4 -bottom-4" />

            <div className="flex flex-col items-center gap-2">
              {TEAM.map((member) => (
                <div
                  key={member.initials}
                  className="flex h-14 w-14 items-center justify-center rounded-full font-mono text-xs font-semibold tracking-wider"
                  style={{
                    background: `oklch(0.22 0.04 ${member.hue})`,
                    color: `oklch(0.85 0.08 ${member.hue})`,
                  }}
                >
                  {member.initials}
                </div>
              ))}
            </div>

            <div className="mt-4 text-center">
              <p className="text-foreground text-2xl font-black uppercase tracking-tighter sm:text-3xl">
                {t("aboutMeProject")}
              </p>
              <p className="text-muted-foreground mt-1 text-xs tracking-wide uppercase">
                {t("aboutMeSubtext")}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-muted-foreground text-sm leading-6">{t("aboutMeRight")}</p>
          </div>
        </div>
      </div>

      <div className="relative mt-6">
        <div className="flex w-full flex-wrap justify-center gap-3 p-3 pt-4">
          {PARTNERS.map((partner) => (
            <a
              key={partner.labelKey}
              href={partner.href}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:bg-muted w-fit cursor-pointer rounded-sm border p-1 transition-colors"
            >
              <div className="flex items-center justify-center px-3 py-1">
                <span className="text-sm font-semibold sm:text-base">
                  {t(partner.labelKey)}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
