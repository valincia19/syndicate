"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/components/providers/language-provider";
import { useTheme } from "@/hooks/use-theme";
import { LanguageSelector } from "@/components/shared/language-selector";
import { api, ApiError } from "@/lib/api";
import { VSLogo } from "@/components/brand/vs-logo";
import { StepBadge, StepStatus } from "@/components/shared/step-badge";
import { TurnstileWidget } from "@/components/shared/turnstile-widget";
import {
  Sun,
  Moon,
  Check,
  Loader2,
  Key,
  Clock,
  Shield,
  Copy,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

// ============================================================
// CONFIGURATION — Site Key & Shortlink Providers
// ============================================================
const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
  (process.env.NODE_ENV === "development" ? "1x00000000000000000000AA" : "0x4AAAAAAA4oK5l7Jj3gJ2nS");

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function LinkvertiseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function WorkInkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m12 19 7-7 3 3-7 7-3-3z" />
      <path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="m2 2 7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  );
}

const PROVIDERS = [
  {
    id: 1,
    name: "Valinc Link",
    url: process.env.NEXT_PUBLIC_VALINC_LINK_URL || "/generate?callback=true",
    badgeKey: "fastGateway" as const,
    icon: VSLogo,
    colorClass: "text-foreground bg-muted/40 border-border",
  },
  {
    id: 2,
    name: "Linkvertise",
    url: process.env.NEXT_PUBLIC_LINKVERTISE_URL || "https://link-target.net/1220490/valinc-free-access",
    badgeKey: "optionA" as const,
    icon: LinkvertiseIcon,
    colorClass: "text-muted-foreground bg-muted/40 border-border",
  },
  {
    id: 3,
    name: "Work.ink",
    url: process.env.NEXT_PUBLIC_WORKINK_URL || "https://work.ink/3Ue/valinc-free",
    badgeKey: "optionB" as const,
    icon: WorkInkIcon,
    colorClass: "text-muted-foreground bg-muted/40 border-border",
  }
];

interface ClaimedKey {
  license_key: string;
  tier: string;
  hwid_limit: number;
  expires_at: string;
}

function GenerateKeyContent() {
  const { t } = useLanguage();
  const { theme, mounted, toggleTheme } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Check if we are returning from a shortlink callback
  const isCallback = searchParams.get("callback") === "true" || searchParams.get("status") === "success";
  const callbackProcessedRef = useRef(false);

  // Page initialization state
  const [pageMounted, setPageMounted] = useState(false);

  // Force re-render every 1 second to update live countdown timers
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Step 1: Captcha state
  const [captchaStatus, setCaptchaStatus] = useState<StepStatus>("pending");
  const [, _setCaptchaToken] = useState<string | null>(null);

  // Step 2: Shortlink state
  const [shortlinkStatus, setShortlinkStatus] = useState<StepStatus>("pending");

  // Key claim state
  const [claimedKey, setClaimedKey] = useState<ClaimedKey | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Verification Session states
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionUuid, setSessionUuid] = useState<string | null>(null);

  // Local Copy state
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPageMounted(true);

    const querySessionId = searchParams.get("session_id");
    if (querySessionId) {
      setSessionId(querySessionId);
    }

    const loadSettings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/v1/bypass/settings`);
        const data = await res.json();
        if (data.status === "success" && data.data) {
          const cfg = data.data;
          
          if (cfg.is_enabled === false) {
            setError("Free key claiming is currently disabled by system administrator.");
            return;
          }

          if (cfg.is_limit_reached && !isCallback) {
            const limit = cfg.max_keys_per_ip || 2;
            setError(`Anda telah mencapai batas maksimal (${limit}x) klaim kunci gratis untuk alamat IP ini.`);
            return;
          }

          if (cfg.turnstile_enabled === false) {
            // Bypass Step 1 Captcha
            setCaptchaStatus("completed");
          }
        }

        // Create server verification session if not present
        if (!querySessionId) {
          try {
            const sess = await api.createSession();
            if (sess.data) {
              setSessionId(sess.data.session_id);
              setSessionUuid(sess.data.uuid);
            }
          } catch (e) {
            console.error("Failed to create verification session:", e);
          }
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setSettingsLoaded(true);
      }
    };
    loadSettings();
  }, [isCallback, searchParams]);

  // ── Claim Key function ───────────────────────────────────
  const handleClaimKey = useCallback(async () => {
    if (claiming) return;
    setClaiming(true);
    setError(null);

    const activeSessionId = searchParams.get("session_id") || sessionId;

    try {
      if (!activeSessionId) {
        throw new Error("Missing verification session ID");
      }
      const res = await api.claimFreeKey(activeSessionId);
      const newKey = res.data;
      setClaimedKey(newKey);
      
      // Update history in localStorage
      try {
        const stored = localStorage.getItem("keyauth_claimed_keys");
        const parsed = stored ? (JSON.parse(stored) as ClaimedKey[]) : [];
        const filtered = parsed.filter(k => k.license_key !== newKey.license_key);
        const updated = [newKey, ...filtered];
        localStorage.setItem("keyauth_claimed_keys", JSON.stringify(updated));
      } catch {}

      toast.success(t("getKey") + " ✓");
      
      // Strip callback from URL and redirect cleanly to success page
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", "/generate");
      }
      router.push(`/success/${encodeURIComponent(newKey.license_key)}`);
    } catch (err) {
      // If returning via callback and limit was reached, redirect to latest active key from history if exists
      try {
        const stored = localStorage.getItem("keyauth_claimed_keys");
        if (stored) {
          const parsed = JSON.parse(stored) as ClaimedKey[];
          if (parsed.length > 0) {
            if (typeof window !== "undefined") {
              window.history.replaceState({}, "", "/generate");
            }
            router.push(`/success/${encodeURIComponent(parsed[0].license_key)}`);
            return;
          }
        }
      } catch {}

      if (err instanceof ApiError) {
        if (err.statusCode === 429) {
          setError(t("errorRateLimit"));
        } else {
          setError(err.message || t("errorGeneric"));
        }
      } else {
        setError(t("errorGeneric"));
      }
    } finally {
      setClaiming(false);
    }
  }, [t, claiming, router, searchParams, sessionId]);

  // Automatically request key if landing back via shortlink callback
  useEffect(() => {
    if (pageMounted && settingsLoaded && isCallback && !claimedKey && !error && !claiming && !callbackProcessedRef.current) {
      callbackProcessedRef.current = true;
      
      const activeSessionId = searchParams.get("session_id") || sessionId;
      const linkvertiseHash = searchParams.get("hash");
      const workinkToken = searchParams.get("token") || searchParams.get("key");

      const processCallback = async () => {
        if (linkvertiseHash && activeSessionId) {
          try {
            await api.verifyLinkvertise(activeSessionId, linkvertiseHash);
            setShortlinkStatus("completed");
          } catch (err) {
            console.error("Linkvertise verification failed:", err);
            if (err instanceof ApiError) {
              setError(err.message || "Linkvertise anti-bypass verification failed. Please complete the shortlink legally.");
            } else {
              setError("Linkvertise anti-bypass verification failed.");
            }
            return;
          }
        } else if (workinkToken && activeSessionId) {
          try {
            await api.verifyWorkink(activeSessionId, workinkToken);
            setShortlinkStatus("completed");
          } catch (err) {
            console.error("Work.ink verification failed:", err);
            if (err instanceof ApiError) {
              setError(err.message || "Work.ink anti-bypass verification failed. Please complete the shortlink legally.");
            } else {
              setError("Work.ink anti-bypass verification failed.");
            }
            return;
          }
        }

        if (typeof window !== "undefined") {
          window.history.replaceState({}, "", "/generate");
        }
        handleClaimKey();
      };

      processCallback();
    }
  }, [pageMounted, settingsLoaded, isCallback, claimedKey, error, claiming, handleClaimKey, searchParams, sessionId]);

  // ── Captcha Verify Callback ─────────────────────────────
  const handleCaptchaVerify = useCallback(async (token: string) => {
    _setCaptchaToken(token);
    const activeSessionId = searchParams.get("session_id") || sessionId;
    if (!activeSessionId) {
      setCaptchaStatus("completed");
      return;
    }
    try {
      await api.verifyCaptcha(activeSessionId, token);
      setCaptchaStatus("completed");
    } catch (err) {
      console.error("Server captcha verification failed:", err);
      setError("Captcha verification failed on server. Please try again.");
    }
  }, [searchParams, sessionId]);

  // ── Captcha Error Callback ──────────────────────────────
  const handleCaptchaError = useCallback((errCode: unknown) => {
    console.error("Captcha Error:", errCode);
    setError(`Captcha failed to load (${errCode || 'Unknown Error'}). Please ensure your connection is stable and try reloading.`);
  }, []);

  // ── Shortlink Click Callback ─────────────────────────────
  const handleOpenProvider = useCallback((name: string, url: string) => {
    setShortlinkStatus("completed");
    toast.success("Redirecting...");
    
    const activeSessionId = searchParams.get("session_id") || sessionId || "";
    const activeUuid = sessionUuid || "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });

    let targetUrl = url;
    if (name === "Valinc Link") {
      targetUrl = `/valinc/${activeUuid}?session_id=${activeSessionId}`;
    } else {
      const separator = url.includes("?") ? "&" : "?";
      targetUrl = `${url}${separator}callback=true&session_id=${activeSessionId}`;
    }
    
    // Redirect current tab to target URL
    setTimeout(() => {
      window.location.href = targetUrl;
    }, 1000);
  }, [searchParams, sessionId, sessionUuid]);

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

  // Copy Key for generator view
  const handleCopy = useCallback(async () => {
    if (!claimedKey) return;
    await handleCopyKeyText(claimedKey.license_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [claimedKey, handleCopyKeyText]);

  // ── Reset generator ──────────────────────────────────────
  const handleReset = useCallback(() => {
    setCaptchaStatus("pending");
    setShortlinkStatus("pending");
    _setCaptchaToken(null);
    setClaimedKey(null);
    setError(null);
    setCopied(false);
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

  const getGeneratorProgress = () => {
    let progress = 0;
    if (captchaStatus === "completed") progress += 1;
    if (shortlinkStatus === "completed") progress += 1;
    return progress;
  };

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

          {/* Compact Hero Section */}
          <div className="flex flex-col items-center gap-2 text-center pt-16 pb-6 sm:pt-20 sm:pb-8">
            <h1 className="text-2xl font-medium tracking-tight sm:text-3xl font-heading text-foreground">
              {t("scriptKeySystem")}
            </h1>
            <p className="max-w-xs text-xs text-muted-foreground font-medium leading-relaxed">
              {t("keysHistorySub")}
            </p>
          </div>

          {/* Main Card Container */}
          <div className="w-full">
            <Card className="border border-border bg-card shadow-sm rounded-lg overflow-hidden">
              <CardContent className="p-6 sm:p-8 flex flex-col gap-6">

                {/* Progress bar area - Styled with thin minimal VALINC loading aesthetic */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-2xs font-bold uppercase tracking-wider text-muted-foreground">
                    <span>
                      {claiming 
                        ? "Verifying shortlink..." 
                        : `Progress: ${isCallback ? "2/2" : `${getGeneratorProgress()}/2`}`}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800/80 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ 
                        width: claiming 
                          ? "100%" 
                          : `${(isCallback ? 100 : (getGeneratorProgress() / 2) * 100)}%` 
                      }}
                    />
                  </div>
                </div>

                {claiming ? (
                  /* ── Auto-Claiming Callback Loading State ── */
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <div className="text-center space-y-1.5">
                      <p className="text-xs font-bold uppercase tracking-wider text-foreground">
                        {t("generating")}
                      </p>
                      <p className="text-2xs text-muted-foreground font-semibold">
                        {t("verifyingShortlink")}
                      </p>
                    </div>
                  </div>
                ) : claimedKey ? (
                  /* ── Claimed Key Success View ── */
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-4">
                        <div className="flex items-center gap-2">
                          <Key className="h-4 w-4 text-primary" />
                          <span className="text-xs font-bold text-foreground uppercase tracking-wider font-heading">
                            {t("yourKey")}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <code className="flex-1 rounded-md bg-background px-3 py-2.5 text-xs font-mono font-bold tracking-wide ring-1 ring-border break-all">
                            {claimedKey.license_key}
                          </code>
                          <Button
                            size="icon"
                            variant={copied ? "secondary" : "outline"}
                            onClick={handleCopy}
                            className="shrink-0 h-9 w-9 cursor-pointer transition-all"
                          >
                            {copied ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 text-2xs text-muted-foreground font-semibold pt-1">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground/75" />
                            <span>
                              {t("expiresIn")}: {getTimeLeft(claimedKey.expires_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Shield className="h-3 w-3 text-muted-foreground/75" />
                            <span>
                              {t("hwidLimit")}: {claimedKey.hwid_limit}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-center items-center gap-2.5 w-full">
                        <Link href="/" passHref className="w-full">
                          <Button
                            variant="default"
                            size="sm"
                            className="w-full text-xs cursor-pointer font-bold uppercase py-4"
                          >
                            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                            {t("backToKeys")}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : error ? (
                  /* ── Error State ── */
                  <div className="flex flex-col gap-4 py-4">
                    <div className="w-full text-center text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                      {error}
                    </div>
                    <div className="flex justify-center gap-2.5 w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                        className="text-xs cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Try Again
                      </Button>
                      <Link href="/" passHref>
                        <Button
                          variant="default"
                          size="sm"
                          className="text-xs cursor-pointer font-bold uppercase"
                        >
                          Back to Dashboard
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  /* ── Step-by-Step Verification Flow ── */
                  <div className="flex flex-col gap-6">
                    {/* Header back navigation */}
                    <Link href="/" passHref>
                      <span className="self-start flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                        <ArrowLeft className="h-3.5 w-3.5" />
                        {t("backToKeys")}
                      </span>
                    </Link>

                    {/* ── Step 1: Captcha Step ── */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <StepBadge
                          number={1}
                          status={captchaStatus}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-foreground">
                            {t("captchaTitle")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {t("captchaDesc")}
                          </span>
                        </div>
                      </div>

                      <div className="ml-10 flex flex-col gap-2">
                        {captchaStatus === "completed" ? (
                          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3 shadow-sm transition-all animate-in fade-in duration-300">
                            <div className="flex items-center gap-2.5">
                              <div className="h-6 w-6 rounded-full bg-foreground text-background flex items-center justify-center shrink-0 shadow-sm">
                                <Check className="h-3.5 w-3.5 stroke-[3]" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-foreground">
                                  {t("captchaDone")}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-medium">
                                  {t("captchaPassedDesc")}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground font-semibold px-2 py-0.5 rounded bg-muted/50 border border-border">
                              PASSED
                            </span>
                          </div>
                        ) : pageMounted ? (
                          <div className="bg-muted/50 p-1 rounded-md inline-block">
                            <TurnstileWidget 
                              siteKey={TURNSTILE_SITE_KEY} 
                              onVerify={handleCaptchaVerify}
                              onError={handleCaptchaError}
                            />
                          </div>
                        ) : (
                          <div className="h-[74px] w-[302px] bg-muted/40 animate-pulse rounded-lg" />
                        )}
                      </div>
                    </div>

                    <div className="h-px bg-border" />

                    {/* ── Step 2: Shortlink Step (Only active if Step 1 is done) ── */}
                    <div className={`flex flex-col gap-3 transition-opacity duration-200 ${captchaStatus !== "completed" ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
                      <div className="flex items-center gap-3">
                        <StepBadge
                          number={2}
                          status={shortlinkStatus}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-foreground">
                            {t("shortlinkTitle")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {t("shortlinkDesc")}
                          </span>
                        </div>
                      </div>

                      {captchaStatus === "completed" && (
                        <div className="ml-10 flex flex-col gap-3">
                          {shortlinkStatus === "completed" ? (
                            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3 shadow-sm transition-all animate-in fade-in duration-300">
                              <div className="flex items-center gap-2.5">
                                <div className="h-6 w-6 rounded-full bg-foreground text-background flex items-center justify-center shrink-0 shadow-sm">
                                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-semibold text-foreground">
                                    {t("shortlinkDone")}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground font-medium">
                                    {t("shortlinkPassedDesc")}
                                  </span>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground font-semibold px-2 py-0.5 rounded bg-muted/50 border border-border">
                                VERIFIED
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {PROVIDERS.map((provider) => {
                                const IconComponent = provider.icon;
                                return (
                                  <div
                                    key={provider.name}
                                    className="border border-border bg-muted/20 hover:bg-muted/40 p-3 rounded-lg flex items-center justify-between gap-3 transition-all duration-200"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="h-8 w-8 rounded-md bg-background border border-border flex items-center justify-center shrink-0">
                                        <IconComponent className="h-4 w-4 text-foreground" />
                                      </div>
                                      <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-semibold text-foreground truncate">
                                            {provider.id}. {provider.name}
                                          </span>
                                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${provider.colorClass}`}>
                                            {t(provider.badgeKey)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenProvider(provider.name, provider.url)}
                                      className="text-xs cursor-pointer font-medium h-8 px-3 shrink-0 gap-1.5 hover:bg-primary hover:text-primary-foreground transition-colors"
                                    >
                                      <span>{t("verify")}</span>
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>
          </div>

          {/* Footer branding spacer */}
          <div className="mt-16 mb-8 text-center text-2xs text-muted-foreground/75 tracking-wider font-semibold">
            &copy; {new Date().getFullYear()} VALINC SYNDICATE. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GenerateKeyPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <GenerateKeyContent />
    </Suspense>
  );
}
