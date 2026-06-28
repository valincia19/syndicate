"use client";

import { useState, useCallback, useEffect } from "react";
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
  Trash2,
  PlusCircle,
} from "lucide-react";
import { toast } from "sonner";

interface ClaimedKey {
  license_key: string;
  tier: string;
  hwid_limit: number;
  expires_at: string;
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const { theme, mounted, toggleTheme } = useTheme();

  // Navigation & History states
  const [history, setHistory] = useState<ClaimedKey[]>([]);
  const [pageMounted, setPageMounted] = useState(false);

  // Force re-render every 1 second to update live countdown timers
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // System limits and status state
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [isSystemDisabled, setIsSystemDisabled] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [maxKeysPerIp, setMaxKeysPerIp] = useState(2);

  // Load history & bypass settings on mount
  useEffect(() => {
    let localHistoryCount = 0;
    try {
      const stored = localStorage.getItem("keyauth_claimed_keys");
      if (stored) {
        const parsed = JSON.parse(stored) as ClaimedKey[];
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setHistory(parsed);
        localHistoryCount = parsed.length;
      }
    } catch {}
    setPageMounted(true);

    const checkSettings = async () => {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${API_BASE}/v1/bypass/settings`);
        const data = await res.json();
        if (data.status === "success" && data.data) {
          const limit = data.data.max_keys_per_ip ?? 2;
          setMaxKeysPerIp(limit);

          if (data.data.is_enabled === false) {
            setIsSystemDisabled(true);
          }
          if (data.data.is_limit_reached || localHistoryCount >= limit) {
            setIsLimitReached(true);
          }
        }
      } catch (err) {
        console.error("Failed to check bypass settings:", err);
      } finally {
        setSettingsLoading(false);
      }
    };
    checkSettings();
  }, []);

  // ── Copy Key helper ──────────────────────────────────────
  const handleCopyKeyText = useCallback(async (keyText: string) => {
    try {
      await navigator.clipboard.writeText(keyText);
      toast.success(t("copied"));
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = keyText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast.success(t("copied"));
    }
  }, [t]);

  // ── Delete Key from history ──────────────────────────────
  const handleDeleteKey = useCallback((licenseKey: string) => {
    setHistory((prev) => {
      const updated = prev.filter(k => k.license_key !== licenseKey);
      try {
        localStorage.setItem("keyauth_claimed_keys", JSON.stringify(updated));
      } catch {}
      return updated;
    });
    toast.success(t("keyRemoved"));
  }, [t]);

  // ── Format expiry / Time Left (Live countdown) ─────────────
  const getTimeLeft = (isoString: string) => {
    try {
      const expiry = new Date(isoString).getTime();
      const now = new Date().getTime();
      const diff = expiry - now;
      if (diff <= 0) return "Expired";

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
      }
      if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
      }
      return `${minutes}m ${seconds}s`;
    } catch {
      return "Expired";
    }
  };

  const activeKeys = history.filter((keyItem) => new Date(keyItem.expires_at) > new Date());
  const activeKeyCount = activeKeys.length;

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-start overflow-x-hidden bg-background text-foreground transition-colors duration-200">
      
      {/* Absolute top horizontal border line consistent with main header */}
      <div className="border-border absolute top-6 left-0 h-0 w-full border-t sm:top-7 md:top-8 z-0"></div>

      {/* Floating navigation header consistent with main layout */}
      <div className="absolute top-0 left-0 z-20 flex h-12 w-full items-center justify-center px-6 sm:h-14 sm:px-8 md:h-16 md:px-12 lg:px-0">
        <div className="bg-card/90 relative z-30 flex h-10 w-full max-w-[calc(100%-32px)] items-center justify-between overflow-visible rounded-md border border-border px-3 py-1.5 pr-2 backdrop-blur-sm sm:h-11 sm:max-w-[calc(100%-48px)] sm:px-4 sm:py-2 sm:pr-3 md:h-12 md:max-w-[calc(100%-64px)] md:px-2 lg:w-[700px] lg:max-w-[700px]">
          <div className="flex items-center justify-center pl-1">
            <VSLogo className="h-4.5 w-auto text-primary" />
            <span className="font-bold text-xs tracking-wider uppercase ml-1.5">VALINC SYNDICATE</span>
          </div>
          <div className="flex items-center gap-2">
            {mounted && pageMounted ? (
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
              className="border-none p-0 bg-transparent"
              buttonClassName="hover:bg-muted dark:hover:bg-muted/50 rounded-md"
            />
          </div>
        </div>
      </div>

      <div className="relative flex w-full flex-col items-center justify-start z-10">
        <div className="relative flex w-full max-w-lg flex-col items-stretch justify-start px-4 sm:px-6">
          
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

          {/* Compact Header */}
          <div className="flex flex-col items-center gap-2 text-center pt-16 pb-6 sm:pt-20 sm:pb-8">
            <h1 className="text-2xl font-medium tracking-tight sm:text-3xl font-heading text-foreground">
              {t("scriptKeySystem")}
            </h1>
            <p className="max-w-xs text-xs text-muted-foreground font-medium leading-relaxed">
              {t("keysHistorySub")}
            </p>
          </div>

          {/* Main Card Container */}
          <Card className="border border-border bg-card shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-5 sm:p-6 flex flex-col gap-5">

              {/* Progress bar area - Refined minimal aesthetic */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span>{t("claimQuota")}</span>
                  <span className="font-mono text-foreground font-semibold">{activeKeyCount} / {maxKeysPerIp} {t("keys")}</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300 rounded-full"
                    style={{ width: `${Math.min((activeKeyCount / Math.max(1, maxKeysPerIp)) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Keycards View */}
              <div className="flex flex-col gap-4">
                {pageMounted ? (
                  history.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-border rounded-lg flex flex-col items-center gap-2.5 bg-muted/20">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <Key className="h-4 w-4" />
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">
                        {t("noKeys")}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {history.map((keyItem) => {
                        const isExpired = new Date(keyItem.expires_at) < new Date();
                        const timeLeft = getTimeLeft(keyItem.expires_at);
                        return (
                          <div 
                            key={keyItem.license_key} 
                            className="group/key border border-border bg-muted/20 hover:bg-muted/40 p-3.5 rounded-lg flex items-center justify-between gap-3 transition-all duration-200 relative overflow-hidden"
                          >
                            <div className="flex flex-col gap-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <code className="text-xs font-mono font-bold text-foreground truncate max-w-[180px] sm:max-w-xs select-all">
                                  {keyItem.license_key}
                                </code>
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  isExpired 
                                    ? "bg-muted text-muted-foreground border border-border" 
                                    : "bg-foreground/10 text-foreground border border-foreground/20"
                                }`}>
                                  {isExpired ? t("expired") : t("active")}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-medium">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-muted-foreground/70" />
                                  {timeLeft}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Shield className="h-3 w-3 text-muted-foreground/70" />
                                  {t("hwidLimit")}: {keyItem.hwid_limit}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleCopyKeyText(keyItem.license_key)}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background cursor-pointer rounded-md"
                                title={t("copy")}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteKey(keyItem.license_key)}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer rounded-md"
                                title={t("delete")}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  /* Hydration Skeleton placeholder */
                  <div className="animate-pulse flex flex-col gap-2.5">
                    <div className="h-16 bg-muted/40 rounded-lg" />
                  </div>
                )}

                {!pageMounted || settingsLoading ? (
                  <div className="h-10 w-full bg-muted/30 animate-pulse rounded-lg" />
                ) : isSystemDisabled ? (
                  <div className="p-3 rounded-lg border border-border bg-muted/40 text-muted-foreground text-xs font-medium text-center">
                    {t("systemPaused")}
                  </div>
                ) : isLimitReached || history.length >= maxKeysPerIp ? null : (
                  <Link href="/generate" passHref className="w-full pt-1">
                    <Button
                      size="default"
                      className="w-full cursor-pointer font-medium text-xs h-10 gap-2 shadow-sm"
                    >
                      <PlusCircle className="h-4 w-4" />
                      <span>{t("claimNew")}</span>
                    </Button>
                  </Link>
                )}
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
