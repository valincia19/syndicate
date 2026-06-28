"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/components/providers/language-provider";
import { useTheme } from "@/hooks/use-theme";
import { LanguageSelector } from "@/components/shared/language-selector";
import { VSLogo } from "@/components/brand/vs-logo";
import {
  Sun,
  Moon,
  Key,
  Clock,
  Shield,
  Copy,
  Check,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

interface ClaimedKey {
  license_key: string;
  tier?: string;
  hwid_limit?: number;
  expires_at?: string;
}

export default function SuccessKeyPage() {
  const params = useParams();
  const rawKey = params?.key ? decodeURIComponent(params.key as string) : "";
  const { t } = useLanguage();
  const { theme, mounted, toggleTheme } = useTheme();

  const [copied, setCopied] = useState(false);
  const [keyDetails, setKeyDetails] = useState<ClaimedKey>(() => ({
    license_key: rawKey,
    tier: "free",
    hwid_limit: 1,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }));

  // Force re-render every 1 second for live countdown
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("keyauth_claimed_keys");
      if (stored) {
        const parsed = JSON.parse(stored) as ClaimedKey[];
        const found = parsed.find((k) => k.license_key === rawKey);
        if (found) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setKeyDetails(found);
        }
      }
    } catch {}
  }, [rawKey]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(keyDetails.license_key);
      setCopied(true);
      toast.success(t("copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = keyDetails.license_key;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      toast.success(t("copied"));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getTimeLeft = (isoString?: string) => {
    if (!isoString) return "Active";
    try {
      const expiry = new Date(isoString).getTime();
      const now = new Date().getTime();
      const diff = expiry - now;
      if (diff <= 0) return "Expired";

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
      if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
      return `${minutes}m ${seconds}s`;
    } catch {
      return "Active";
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-start overflow-x-hidden bg-background text-foreground transition-colors duration-200">
      
      {/* Absolute top horizontal border line consistent with main layout */}
      <div className="border-border absolute top-6 left-0 h-0 w-full border-t sm:top-7 md:top-8 z-0"></div>

      {/* Floating navigation header consistent with main layout */}
      <div className="absolute top-0 left-0 z-20 flex h-12 w-full items-center justify-center px-6 sm:h-14 sm:px-8 md:h-16 md:px-12 lg:px-0">
        <div className="bg-card/90 relative z-30 flex h-10 w-full max-w-[calc(100%-32px)] items-center justify-between overflow-visible rounded-md border border-border px-3 py-1.5 pr-2 backdrop-blur-sm sm:h-11 sm:max-w-[calc(100%-48px)] sm:px-4 sm:py-2 sm:pr-3 md:h-12 md:max-w-[calc(100%-64px)] md:px-2 lg:w-[700px] lg:max-w-[700px]">
          <div className="flex items-center justify-center pl-1">
            <VSLogo className="h-4.5 w-auto text-primary" />
            <span className="font-bold text-xs tracking-wider uppercase ml-1.5">VALINC SYNDICATE</span>
          </div>
          <div className="flex items-center gap-2">
            {mounted ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="h-8 w-8 px-0 text-muted-foreground hover:text-foreground"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
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

      <div className="relative flex w-full flex-col items-center justify-start z-10">
        <div className="relative flex w-full max-w-lg flex-col items-stretch justify-start px-4 sm:px-6">
          
          {/* Side rails consistent with brand design language */}
          <div className="bg-border/60 absolute top-0 left-4 z-0 h-full w-px sm:left-6 lg:left-0" />
          <div className="bg-border/60 absolute top-0 right-4 z-0 h-full w-px sm:right-6 lg:right-0" />

          {/* Decorative slanted pattern band */}
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

          {/* Compact Header */}
          <div className="flex flex-col items-center gap-2 text-center pt-16 pb-6 sm:pt-20 sm:pb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/10 text-foreground ring-1 ring-border mb-1">
              <CheckCircle className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-medium tracking-tight sm:text-3xl font-heading text-foreground">
              {t("keyClaimedSuccess")}
            </h1>
            <p className="max-w-xs text-xs text-muted-foreground font-medium leading-relaxed">
              {t("keyClaimedDesc")}
            </p>
          </div>

          {/* Compact Clean Card */}
          <Card className="border border-border bg-card shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-5 sm:p-6 flex flex-col gap-5">
              
              {/* Key Box */}
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5 text-primary" />
                    <span>{t("yourKey")}</span>
                  </div>
                  <span className="text-[11px] font-mono text-foreground bg-muted/50 px-2 py-0.5 rounded border border-border">
                    {t("active")}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <code className="flex-1 rounded-md bg-background px-3 py-2 text-xs sm:text-sm font-mono font-bold tracking-wide ring-1 ring-border break-all">
                    {keyDetails.license_key}
                  </code>
                  <Button
                    size="sm"
                    variant={copied ? "secondary" : "outline"}
                    onClick={handleCopy}
                    className="shrink-0 h-9 px-3 text-xs gap-1.5 cursor-pointer font-medium"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-foreground" />
                        <span>{t("copied")}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>{t("copy")}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Metadata Details */}
              <div className="grid grid-cols-2 gap-3 px-1 text-xs text-muted-foreground font-medium">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                  <span>{t("expiresIn")}: <strong className="text-foreground font-semibold">{getTimeLeft(keyDetails.expires_at)}</strong></span>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground/70" />
                  <span>{t("hwidLimit")}: <strong className="text-foreground font-semibold">{keyDetails.hwid_limit ?? 1} Device</strong></span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-1">
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
          <div className="mt-12 mb-8 text-center text-[11px] text-muted-foreground/70 font-medium">
            &copy; {new Date().getFullYear()} VALINC SYNDICATE. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}
