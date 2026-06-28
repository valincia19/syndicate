"use client"

import type { DictionaryKey } from "@/config/i18n"
import { useLanguage } from "@/components/providers/language-provider"
import {
  SectionHeader,
  SectionHeaderDescription,
  SectionHeaderHeading,
} from "@/components/page-header"
import { MessageSquare, ExternalLink } from "lucide-react"

interface Platform {
  icon: React.ReactNode
  nameKey: DictionaryKey
  href: string
  descKey: DictionaryKey
}

const PLATFORMS: Platform[] = [
  {
    icon: <MessageSquare className="size-5" />,
    nameKey: "aboutPlatform1Name",
    href: "#",
    descKey: "aboutPlatform1Desc",
  },
  {
    icon: <ExternalLink className="size-5" />,
    nameKey: "aboutPlatform2Name",
    href: "#",
    descKey: "aboutPlatform2Desc",
  },
]

export function Connect() {
  const { t } = useLanguage()

  return (
    <section className="container border-b">
      <div className="flex justify-center border-x">
        <div className="max-w-5xl pb-20">
          <SectionHeader>
            <SectionHeaderHeading>{t("aboutConnectHeading")}</SectionHeaderHeading>
            <SectionHeaderDescription>
              {t("aboutConnectDesc")}
            </SectionHeaderDescription>
          </SectionHeader>

          <div className="[mask-image:radial-gradient(ellipse_100%_100%_at_50%_0%,#000_70%,transparent_100%)]">
            <div className="bg-background dark:bg-muted/50 grid gap-x-6 rounded-md border px-6 pt-6 pb-10 md:grid-cols-2">
              {PLATFORMS.map((platform) => (
                <a
                  key={platform.nameKey}
                  target="_blank"
                  rel="noopener noreferrer"
                  href={platform.href}
                  className="hover:bg-secondary grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border-b border-dashed p-3 transition-colors last:border-b-0"
                >
                  <div className="bg-muted border-foreground/5 flex size-12 items-center justify-center rounded-md border">
                    {platform.icon}
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-medium">
                      {t(platform.nameKey)}
                    </h3>
                    <p className="text-muted-foreground line-clamp-1 text-sm">
                      {t(platform.descKey)}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
