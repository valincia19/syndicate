"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { VSLogo } from "@/components/brand/vs-logo"
import { LanguageSelector } from "@/components/shared/language-selector"
import { useTheme } from "@/hooks/use-theme"
import { useLanguage } from "@/components/providers/language-provider"
import { useAuthActions } from "@/hooks/use-auth-actions"

interface AuthLayoutProps {
  children: React.ReactNode
  /** Form title shown below the logo */
  title: string
  /** Description text below the title */
  description: string
}

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  const { theme, mounted, toggleTheme } = useTheme()
  const { t } = useLanguage()

  return (
    <div className="grid min-h-svh lg:grid-cols-2 bg-background text-foreground transition-colors duration-200">
      {/* Left side: Form */}
      <div className="flex flex-col gap-4 p-6 md:p-10 relative">
        {/* Top utility bar: Back + Theme + Language */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("backToHome")}
          </Link>

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
              buttonSize="icon-sm"
              dropdownClassName="mt-2 w-20 rounded-md"
              itemClassName="px-3 py-2 text-xs font-medium"
            />
          </div>
        </div>

        {/* Centered form container */}
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs space-y-6">
            {/* Logo and title */}
            <div className="flex flex-col items-center gap-2 text-center">
              <Link href="/" aria-label="home" className="flex items-center gap-2">
                <VSLogo className="h-10 w-auto text-primary" />
              </Link>
              <div className="flex flex-col items-center gap-1 text-center mt-2">
                <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                <p className="text-muted-foreground text-sm text-balance leading-normal">
                  {description}
                </p>
              </div>
            </div>

            {/* Form content injected via children */}
            {children}
          </div>
        </div>
      </div>

      {/* Right side: Decorative panel */}
      <AuthDecorativePanel />
    </div>
  )
}

/** Discord SVG icon button - shared between login and register */
export function DiscordOAuthButton({ label }: { label: string }) {
  const { handleDiscordLogin } = useAuthActions()
  return (
    <Button
      onClick={handleDiscordLogin}
      variant="outline"
      type="button"
      className="w-full flex items-center justify-center gap-2"
    >
      <svg
        viewBox="0 0 127.14 96.36"
        fill="currentColor"
        className="h-4 w-auto"
      >
        <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,52.88,6.83,77.19,77.19,0,0,0,49.58,0,105.15,105.15,0,0,0,19.14,8.07C2.81,32.22-1.71,55.72.48,78.75A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.4-5c.87-.64,1.71-1.32,2.51-2a75.7,75.7,0,0,0,72.4,0c.8,1,1.64,1.38,2.51,2a68.43,68.43,0,0,1-10.4,5,77.7,77.7,0,0,0,6.63,10.85,105.73,105.73,0,0,0,31.54-17.61C129.2,55.72,124.3,32.22,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.83,46,53.83,53,48.72,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.24,60,73.24,53S78.41,40.36,84.69,40.36,96.07,46,96.07,53,91,65.69,84.69,65.69Z" />
      </svg>
      {label}
    </Button>
  )
}

/** Reusable decorative right panel for auth pages */
function AuthDecorativePanel() {
  const { t } = useLanguage()
  return (
    <div className="bg-muted relative hidden lg:flex flex-col justify-between p-10 overflow-hidden border-l">
      {/* Background diagonal line pattern */}
      <div
        className="absolute inset-0 z-0 opacity-25 dark:opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(30deg, var(--primary) 12%, transparent 12.5%, transparent 87%, var(--primary) 87.5%, var(--primary)), linear-gradient(150deg, var(--primary) 12%, transparent 12.5%, transparent 87%, var(--primary) 87.5%, var(--primary)), linear-gradient(30deg, var(--primary) 12%, transparent 12.5%, transparent 87%, var(--primary) 87.5%, var(--primary)), linear-gradient(150deg, var(--primary) 12%, transparent 12.5%, transparent 87%, var(--primary) 87.5%, var(--primary)), linear-gradient(60deg, color-mix(in srgb, var(--primary) 77%, transparent) 25%, transparent 25.5%, transparent 75%, color-mix(in srgb, var(--primary) 77%, transparent) 75%, color-mix(in srgb, var(--primary) 77%, transparent)), linear-gradient(60deg, color-mix(in srgb, var(--primary) 77%, transparent) 25%, transparent 25.5%, transparent 75%, color-mix(in srgb, var(--primary) 77%, transparent) 75%, color-mix(in srgb, var(--primary) 77%, transparent))",
          backgroundPosition:
            "0 0, 0 0, 30px 53px, 30px 53px, 0 0, 30px 53px",
          backgroundSize: "60px 106px",
        }}
      />

      {/* Glowing aura */}
      <div className="absolute -top-[20%] -right-[20%] w-[60%] aspect-square rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

      {/* Header decoration */}
      <div className="relative z-10 flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-widest">
        <span>{t("verificationHub")}</span>
        <span>VALINC v1.0.1</span>
      </div>

      {/* Brand message */}
      <div className="relative z-10 space-y-6 my-auto max-w-md">
        <VSLogo className="h-16 w-auto text-primary opacity-90" />
        <div className="space-y-4">
          <h2 className="text-3xl font-extrabold tracking-tight leading-none text-foreground/90">
            {t("heroTitle")}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("authPanelDesc")}
          </p>
        </div>
      </div>

      {/* Footer decoration */}
      <div className="relative z-10 text-2xs text-muted-foreground/60 leading-none">
        &copy; {new Date().getFullYear()} {t("allRightsReserved")}
      </div>
    </div>
  )
}
