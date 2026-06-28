"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sun, Moon } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"
import { LanguageSelector } from "@/components/shared/language-selector"
import { VSLogo } from "@/components/brand/vs-logo"
import { useTheme } from "@/hooks/use-theme"
import { useAuth } from "@/context/auth-context"

export function Header() {
  const { theme, mounted, toggleTheme } = useTheme()
  const { t } = useLanguage()
  const { isAuthenticated } = useAuth()

  return (
    <div className="absolute top-0 left-0 z-20 flex h-12 w-full items-center justify-center px-6 sm:h-14 sm:px-8 md:h-16 md:px-12 lg:px-0">
      <div className="border-muted absolute top-6 left-0 h-0 w-full border-t sm:top-7 md:top-8"></div>

      <div className="bg-muted relative z-30 flex h-10 w-full max-w-[calc(100%-32px)] items-center justify-between overflow-visible rounded-md border px-3 py-1.5 pr-2 backdrop-blur-sm sm:h-11 sm:max-w-[calc(100%-48px)] sm:px-4 sm:py-2 sm:pr-3 md:h-12 md:max-w-[calc(100%-64px)] md:px-2 lg:w-[700px] lg:max-w-[700px]">
        <div className="flex items-center justify-center">
          <Link href="/" className="flex items-center justify-start gap-1.5 select-none cursor-pointer outline-none pl-1">
            <VSLogo className="h-4.5 w-auto text-primary" />
            <span className="font-bold text-xs tracking-wider uppercase sm:text-sm md:text-sm">VALINC</span>
          </Link>
          <div className="hidden lg:flex flex-row items-center justify-start gap-4 pl-5">
            <button
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              className="text-muted-foreground hover:text-foreground cursor-pointer text-xs font-medium transition-colors md:text-[13px] outline-none"
            >
              {t("features")}
            </button>
            <button
              onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
              className="text-muted-foreground hover:text-foreground cursor-pointer text-xs font-medium transition-colors md:text-[13px] outline-none"
            >
              {t("pricing")}
            </button>
            <button
              onClick={() => document.getElementById("docs")?.scrollIntoView({ behavior: "smooth" })}
              className="text-muted-foreground hover:text-foreground cursor-pointer text-xs font-medium transition-colors md:text-[13px] outline-none"
            >
              {t("docs")}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mounted ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="h-8 w-8 px-0 text-muted-foreground hover:text-foreground"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <div className="h-8 w-8" />
          )}

          <LanguageSelector
            buttonSize="sm"
            dropdownClassName="mt-2 w-28 rounded-md"
            itemClassName="px-3 py-2 text-xs font-medium"
          />

          {mounted ? (
            isAuthenticated ? (
              <Link href="/portal/overview">
                <Button size={"sm"}>{t("portal")}</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button size={"sm"}>{t("login")}</Button>
              </Link>
            )
          ) : (
            <Button size={"sm"} className="opacity-0 pointer-events-none">
              {t("login")}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
