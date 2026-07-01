"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/components/providers/language-provider";
import { Header } from "@/components/shared/header";
import { SlantedPattern } from "@/components/shared/slanted-pattern";
import { useTick } from "@/hooks/use-tick";
import { copyToClipboard } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  Key,
  Clock,
  Shield,
  Copy,
  PlusCircle,
} from "lucide-react";

interface ClaimedKey {
  license_key: string;
  tier: string;
  hwid_limit: number;
  expires_at: string;
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  // Navigation & History states
  const [history, setHistory] = useState<ClaimedKey[]>([]);

  // Force re-render every 1 second to update live countdown timers
  useTick(1000);

  // System limits and status state
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [isSystemDisabled, setIsSystemDisabled] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [maxKeysPerIp, setMaxKeysPerIp] = useState(2);

  // Load history & bypass settings on mount
  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
    let localHistoryCount = 0;
    let activeKeysList: ClaimedKey[] = [];

    try {
      const stored = localStorage.getItem("keyauth_claimed_keys");
      if (stored) {
        const parsed = JSON.parse(stored) as ClaimedKey[];
        const now = new Date();
        // Immediately filter out physically expired keys
        const nonExpired = parsed.filter((keyItem) => new Date(keyItem.expires_at) > now);
        
        if (nonExpired.length !== parsed.length) {
          localStorage.setItem("keyauth_claimed_keys", JSON.stringify(nonExpired));
        }

        activeKeysList = nonExpired;
        setTimeout(() => setHistory(nonExpired), 0);
        localHistoryCount = nonExpired.length;
      }
    } catch {}

    const checkSettingsAndVerifyKeys = async () => {
      let currentLimit = maxKeysPerIp;

      // 1. Fetch settings to get correct limits
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${API_BASE}/v1/bypass/settings`);
        const data = await res.json();
        if (data.status === "success" && data.data) {
          currentLimit = data.data.max_keys_per_ip ?? 2;
          setMaxKeysPerIp(currentLimit);

          if (data.data.is_enabled === false) {
            setIsSystemDisabled(true);
          }
          if (data.data.is_limit_reached || localHistoryCount >= currentLimit) {
            setIsLimitReached(true);
          }
        }
      } catch (err) {
        console.error("Failed to check bypass settings:", err);
      } finally {
        setSettingsLoading(false);
      }

      // 2. Validate active keys with database in parallel
      if (activeKeysList.length > 0) {
        try {
          const validations = await Promise.all(
            activeKeysList.map(async (keyItem) => {
              const isValid = await api.checkKey(keyItem.license_key);
              return { keyItem, isValid };
            })
          );

          const validKeys = validations
            .filter((v) => v.isValid)
            .map((v) => v.keyItem);

          if (validKeys.length !== activeKeysList.length) {
            localStorage.setItem("keyauth_claimed_keys", JSON.stringify(validKeys));
            setTimeout(() => setHistory(validKeys), 0);
            
            // Re-evaluate quota limits
            if (validKeys.length < currentLimit) {
              setIsLimitReached(false);
            }
          }
        } catch (err) {
          console.error("Failed to verify keys with server database:", err);
        }
      }
    };

    checkSettingsAndVerifyKeys();
  }, [maxKeysPerIp]);

  // ── Copy Key helper ──────────────────────────────────────
  const handleCopyKeyText = useCallback(async (keyText: string) => {
    await copyToClipboard(keyText);
  }, []);



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

      <Header />

      <div className="relative flex w-full flex-col items-center justify-start z-10">
        <div className="relative flex w-full max-w-lg flex-col items-stretch justify-start px-4 sm:px-6">
          
          {/* Side rails consistent with landing */}
          <div className="bg-border/60 absolute top-0 left-4 z-0 h-full w-px sm:left-6 lg:left-0" />
          <div className="bg-border/60 absolute top-0 right-4 z-0 h-full w-px sm:right-6 lg:right-0" />

          <SlantedPattern />

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
                {mounted ? (
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

                {!mounted || settingsLoading ? (
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
