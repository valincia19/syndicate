"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/components/providers/language-provider";
import { Header } from "@/components/shared/header";
import { SlantedPattern } from "@/components/shared/slanted-pattern";
import { useTick } from "@/hooks/use-tick";
import { copyToClipboard } from "@/lib/utils";
import {
  Key,
  Clock,
  Shield,
  Copy,
  Check,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";

interface ClaimedKey {
  id?: string;
  license_key: string;
  tier?: string;
  hwid_limit?: number;
  expires_at?: string;
}

function SuccessKeyContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id") || "";
  const pathId = params?.key ? decodeURIComponent(params.key as string) : "";
  const rawId = (pathId && pathId !== "default") ? pathId : queryId;
  const { t } = useLanguage();

  const [copied, setCopied] = useState(false);
  const [keyDetails, setKeyDetails] = useState<ClaimedKey | null>(null);
  const [loading, setLoading] = useState(true);

  // Force re-render every 1 second for live countdown
  useTick(1000);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("keyauth_claimed_keys");
      if (stored) {
        const parsed = JSON.parse(stored) as ClaimedKey[];
        // Search by both id (UUID) or legacy license_key fallback
        const found = parsed.find((k) => k.id === rawId || k.license_key === rawId);
        if (found) {
          setTimeout(() => setKeyDetails(found), 0);
        }
      }
    } catch {}
    setTimeout(() => setLoading(false), 0);
  }, [rawId]);

  const handleCopy = async () => {
    if (!keyDetails) return;
    const ok = await copyToClipboard(keyDetails.license_key);
    if (ok) {
      setCopied(true);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background relative flex flex-col items-center justify-start py-8">
        <Header />
        <div className="relative flex w-full flex-col items-center justify-start pt-32">
          <div className="animate-pulse w-full max-w-lg px-4 flex flex-col gap-4">
            <div className="h-12 bg-muted/40 rounded-lg" />
            <div className="h-48 bg-muted/20 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!keyDetails) {
    return (
      <div className="relative flex min-h-screen w-full flex-col items-center justify-start overflow-x-hidden bg-background text-foreground transition-colors duration-200">
        <div className="border-border absolute top-6 left-0 h-0 w-full border-t sm:top-7 md:top-8 z-0"></div>
        <Header />
        <div className="relative flex w-full flex-col items-center justify-start z-10">
          <div className="relative flex w-full max-w-lg flex-col items-stretch justify-start px-4 sm:px-6">
            <div className="bg-border/60 absolute top-0 left-4 z-0 h-full w-px sm:left-6 lg:left-0" />
            <div className="bg-border/60 absolute top-0 right-4 z-0 h-full w-px sm:right-6 lg:right-0" />
            <SlantedPattern />
            
            <div className="flex flex-col items-center gap-2 text-center pt-16 pb-6 sm:pt-20 sm:pb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive ring-1 ring-border mb-1">
                <Shield className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-medium tracking-tight sm:text-3xl font-heading text-foreground">
                {t("verificationFailed")}
              </h1>
              <p className="max-w-xs text-xs text-muted-foreground font-medium leading-relaxed">
                {t("errorBrowserSwitchNew")}
              </p>
            </div>

            <Card className="border border-border bg-card shadow-sm rounded-xl overflow-hidden">
              <CardContent className="p-5 sm:p-6 flex flex-col gap-4">
                <p className="text-xs text-center text-muted-foreground">
                  {t("errorSessionLocalNotFound")}
                </p>
                <Link href="/" passHref className="w-full">
                  <Button variant="default" className="w-full cursor-pointer font-medium text-xs h-10 gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    <span>{t("backToKeys")}</span>
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-start overflow-x-hidden bg-background text-foreground transition-colors duration-200">
      
      {/* Absolute top horizontal border line consistent with main layout */}
      <div className="border-border absolute top-6 left-0 h-0 w-full border-t sm:top-7 md:top-8 z-0"></div>

      <Header />

      <div className="relative flex w-full flex-col items-center justify-start z-10">
        <div className="relative flex w-full max-w-lg flex-col items-stretch justify-start px-4 sm:px-6">
          
          {/* Side rails consistent with brand design language */}
          <div className="bg-border/60 absolute top-0 left-4 z-0 h-full w-px sm:left-6 lg:left-0" />
          <div className="bg-border/60 absolute top-0 right-4 z-0 h-full w-px sm:right-6 lg:right-0" />

          <SlantedPattern />

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

export default function SuccessKeyPage() {
  return (
    <Suspense>
      <SuccessKeyContent />
    </Suspense>
  );
}
