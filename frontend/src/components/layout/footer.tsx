"use client"

import Link from "next/link"
import { Github, DiscordJs, YouTube, X } from "@aliimam/logos"
import { useLanguage } from "@/components/providers/language-provider"

export default function FooterSection() {
  const { t } = useLanguage()

  return (
    <div className="flex w-full flex-col items-start justify-start pt-10">
      <div className="flex h-auto flex-col items-stretch justify-between self-stretch pt-0 pr-0 pb-8 md:flex-row">
        <div className="flex h-auto flex-col items-start justify-start gap-8 p-4 md:p-8">
          <div className="flex items-center justify-start gap-3 self-stretch">
            <div className="text-xl leading-4 font-semibold">VALINC SYNDICATE</div>
          </div>
          <div className="text-muted-foreground max-w-xs text-sm leading-6">
            {t("footerDesc")}
          </div>
          <div className="flex items-center justify-start gap-4">
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              <Github className="h-5 w-5" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              <DiscordJs className="h-5 w-5" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-5 w-5" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              <YouTube className="h-5 w-5" />
            </a>
          </div>
        </div>

        <div className="flex flex-wrap gap-12 p-4 md:gap-16 md:p-8">
          <div className="flex flex-col gap-3">
            <div className="text-sm font-semibold">{t("product")}</div>
            <div className="flex flex-col gap-2">
              <Link href="/#features" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
                {t("features")}
              </Link>
              <Link href="/#pricing" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
                {t("pricing")}
              </Link>
              <Link href="/#docs" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
                {t("docs")}
              </Link>
              <Link href="/changelog" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
                {t("changelog")}
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="text-sm font-semibold">{t("company")}</div>
            <div className="flex flex-col gap-2">
              <Link href="/about" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
                {t("about")}
              </Link>
              <a href="#" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
                {t("blog")}
              </a>
              <Link href="/contact" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
                {t("contact")}
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="text-sm font-semibold">{t("legal")}</div>
            <div className="flex flex-col gap-2">
              <Link href="/privacy" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
                {t("privacy")}
              </Link>
              <Link href="/terms" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
                {t("terms")}
              </Link>
              <Link href="/security" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
                {t("security")}
              </Link>
              <Link href="/cookie" className="text-muted-foreground text-sm hover:text-foreground transition-colors">
                {t("cookies")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="border-muted-foreground/20 flex w-full flex-col items-center justify-center border-t px-6 py-4 md:flex-row md:justify-between">
        <div className="text-muted-foreground text-xs">
          {new Date().getFullYear()} {t("allRightsReserved")}
        </div>
      </div>
    </div>
  )
}
