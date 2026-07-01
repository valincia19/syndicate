"use client";

import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/components/providers/language-provider";
import { Header } from "@/components/shared/header";
import { SlantedPattern } from "@/components/shared/slanted-pattern";

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-start overflow-x-hidden bg-background text-foreground transition-colors duration-200">
      
      {/* Absolute top horizontal border line consistent with main header */}
      <div className="border-border absolute top-6 left-0 h-0 w-full border-t sm:top-7 md:top-8 z-0" />

      <Header />

      <div className="relative flex w-full flex-col items-center justify-start z-10 flex-1">
        <div className="relative flex w-full max-w-lg flex-col items-stretch justify-start px-4 sm:px-6 flex-1">
          
          {/* Side rails consistent with landing */}
          <div className="bg-border/60 absolute top-0 left-4 z-0 h-full w-px sm:left-6 lg:left-0" />
          <div className="bg-border/60 absolute top-0 right-4 z-0 h-full w-px sm:right-6 lg:right-0" />

          <SlantedPattern />

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
