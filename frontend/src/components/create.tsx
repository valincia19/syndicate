"use client"

import Link from "next/link"
import { useLanguage } from "@/components/providers/language-provider"
import {
  SectionActions,
  SectionHeader,
  SectionHeaderDescription,
  SectionHeaderHeading,
} from "@/components/page-header"
import { Button } from "@/components/ui/button"

export function CTA() {
  const { t } = useLanguage()

  return (
    <section className="container">
      <div className="border-x border-b px-4 py-10">
        <SectionHeader>
          <SectionHeaderHeading>{t("aboutCtaHeading")}</SectionHeaderHeading>
          <SectionHeaderDescription>
            {t("aboutCtaDesc")}
          </SectionHeaderDescription>
          <SectionActions>
            <Button
              size={"lg"}
              variant={"outline"}
              render={<Link href="/" />}
              nativeButton={false}
            >
              {t("aboutCtaBtnBack")}
            </Button>
            <Button
              size={"lg"}
              render={<Link href="/login" />}
              nativeButton={false}
            >
              {t("aboutCtaBtnStart")}
            </Button>
          </SectionActions>
        </SectionHeader>
      </div>
    </section>
  )
}
