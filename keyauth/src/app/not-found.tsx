"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileQuestion, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VSLogo } from "@/components/brand/vs-logo";
import { useTheme } from "@/hooks/use-theme";
import { useLanguage } from "@/components/providers/language-provider";
import { LanguageSelector } from "@/components/shared/language-selector";

export default function NotFound() {
  const { theme, mounted, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const [pageMounted, setPageMounted] = useState(false);

  useEffect(() => {
    setPageMounted(true);
  }, []);

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-start overflow-x-hidden bg-background text-foreground transition-colors duration-200">
      
      {/* Absolute top horizontal border line consistent with main header */}
      <div className="border-border absolute top-6 left-0 h-0 w-full border-t sm:top-7 md:top-8 z-0" />

      {/* Floating navigation header consistent with main layout */}
      <div className="absolute top-0 left-0 z-20 flex h-12 w-full items-center justify-center px-6 sm:h-14 sm:px-8 md:h-16 md:px-12 lg:px-0">
        <div className="bg-card/90 relative z-30 flex h-10 w-full max-w-[calc(100%-32px)] items-center justify-between overflow-visible rounded-md border border-border px-3 py-1.5 pr-2 backdrop-blur-sm sm:h-11 sm:max-w-[calc(100%-48px)] sm:px-4 sm:py-2 sm:pr-3 md:h-12 md:max-w-[calc(100%-64px)] md:px-2 lg:w-[700px] lg:max-w-[700px]">
          <Link href="/" className="flex items-center justify-center pl-1 cursor-pointer">
            <VSLogo className="h-4.5 w-auto text-primary" />
            <span className="font-bold text-xs tracking-wider uppercase ml-1.5">VALINC SYNDICATE</span>
          </Link>
          <div className="flex items-center gap-2">
            {mounted && pageMounted ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="h-8 w-8 px-0 text-muted-foreground hover:text-foreground cursor-pointer"
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
              className="border-none p-0 bg-transparent"
              buttonClassName="hover:bg-muted dark:hover:bg-muted/50 rounded-md"
            />
          </div>
        </div>
      </div>

      <div className="relative flex w-full flex-col items-center justify-start z-10 flex-1">
        <div className="relative flex w-full max-w-lg flex-col items-stretch justify-start px-4 sm:px-6 flex-1">
          
          {/* Side rails consistent with landing */}
          <div className="bg-border/60 absolute top-0 left-4 z-0 h-full w-px sm:left-6 lg:left-0" />
          <div className="bg-border/60 absolute top-0 right-4 z-0 h-full w-px sm:right-6 lg:right-0" />

          {/* Decorative slanted pattern */}
          <div className="relative h-8 self-stretch overflow-hidden select-none">
            <div className="absolute inset-0 h-full w-full overflow-hidden">
              <div className="relative h-full w-full">
                {Array.from({ length: 300 }).map((_, i) => (
                  <div
                    key={i}
                    className="outline-primary/45 absolute h-4 w-full origin-top-left -rotate-45 outline-[0.5px] outline-offset-[-0.25px]"
                    style={{
                      top: `${i * 16 - 120}px`,
                      left: "-100%",
                      width: "300%",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Compact Hero Header */}
          <div className="flex flex-col items-center gap-2 text-center pt-16 pb-6 sm:pt-20 sm:pb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/10 text-foreground ring-1 ring-border mb-1">
              <FileQuestion className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-medium tracking-tight sm:text-3xl font-heading text-foreground">
              404 Page Not Found
            </h1>
            <p className="max-w-xs text-xs text-muted-foreground font-medium leading-relaxed">
              The page or checkpoint link you are looking for does not exist or has expired.
            </p>
          </div>

          {/* Main Card */}
          <Card className="border border-border bg-card shadow-sm rounded-xl overflow-hidden mb-8">
            <CardContent className="p-5 sm:p-6 flex flex-col items-center gap-5">
              <div className="w-full pt-1">
                <Link href="/" passHref className="w-full">
                  <Button
                    variant="default"
                    size="default"
                    className="w-full cursor-pointer font-medium text-xs h-10 gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>{t("backToKeys")}</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Footer branding */}
          <div className="mt-auto mb-8 text-center text-[11px] text-muted-foreground/70 font-medium">
            &copy; {new Date().getFullYear()} VALINC SYNDICATE. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
