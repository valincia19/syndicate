"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, ShieldAlert, ArrowRight, Sun, Moon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { VSLogo } from "@/components/brand/vs-logo";
import { useTheme } from "@/hooks/use-theme";
import { useLanguage } from "@/components/providers/language-provider";
import { LanguageSelector } from "@/components/shared/language-selector";
import { Button } from "@/components/ui/button";
import { StepBadge, StepStatus } from "@/components/shared/step-badge";
import { api } from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function ValincBypassPage() {
  const { t } = useLanguage();
  const { uuid } = useParams() as { uuid: string };
  const searchParams = useSearchParams();
  const router = useRouter();
  const { theme, mounted, toggleTheme } = useTheme();

  const sessionId = searchParams.get("session_id") || "";

  // Page initialization state
  const [pageMounted, setPageMounted] = useState(false);

  // Dynamic configuration loaded from backend
  const [totalCheckpoints, setTotalCheckpoints] = useState(2);
  const [countdownSeconds, setCountdownSeconds] = useState(10);
  const [adUrls, setAdUrls] = useState<{ c1?: string; c2?: string; c3?: string }>({});

  // Checkpoints State
  const [activeCheckpoint, setActiveCheckpoint] = useState<1 | 2 | 3>(1);
  const [checkpoint1Status, setCheckpoint1Status] = useState<StepStatus>("pending");
  const [checkpoint2Status, setCheckpoint2Status] = useState<StepStatus>("pending");
  const [checkpoint3Status, setCheckpoint3Status] = useState<StepStatus>("pending");
  
  // Countdown timers
  const [countdown1, setCountdown1] = useState(10);
  const [countdown2, setCountdown2] = useState(10);
  const [countdown3, setCountdown3] = useState(10);

  // Verification API Call State
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const verifiedRef = useRef(false);

  // Fetch settings on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPageMounted(true);
    setCheckpoint1Status("in_progress");

    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/v1/bypass/settings`);
        const data = await res.json();
        if (data.status === "success" && data.data) {
          const cfg = data.data;
          
          if (cfg.is_enabled === false) {
            setStatus("error");
            setErrorMessage("Free key claiming is currently disabled by system administrator.");
            return;
          }

          const seconds = cfg.valinc_countdown_seconds ?? 10;
          const checkpointsCount = cfg.valinc_checkpoints ?? 2;
          
          setCountdownSeconds(seconds);
          setCountdown1(seconds);
          setCountdown2(seconds);
          setCountdown3(seconds);
          setTotalCheckpoints(checkpointsCount);
          setAdUrls({
            c1: cfg.checkpoint1_url,
            c2: cfg.checkpoint2_url,
            c3: cfg.checkpoint3_url,
          });
        }
      } catch (err) {
        console.error("Failed to load bypass settings:", err);
      }
    };

    fetchSettings();
  }, []);

  // Checkpoint 1 Countdown effect
  useEffect(() => {
    if (status === "error") return;
    if (activeCheckpoint !== 1) return;
    if (countdown1 <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCheckpoint1Status("completed");
      return;
    }

    const timer = setTimeout(() => {
      setCountdown1((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown1, activeCheckpoint, status]);

  // Checkpoint 2 Countdown effect
  useEffect(() => {
    if (status === "error") return;
    if (activeCheckpoint !== 2) return;
    if (countdown2 <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCheckpoint2Status("completed");
      return;
    }

    const timer = setTimeout(() => {
      setCountdown2((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown2, activeCheckpoint, status]);

  // Checkpoint 3 Countdown effect
  useEffect(() => {
    if (status === "error") return;
    if (activeCheckpoint !== 3) return;
    if (countdown3 <= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCheckpoint3Status("completed");
      return;
    }

    const timer = setTimeout(() => {
      setCountdown3((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown3, activeCheckpoint, status]);

  // Proceed callbacks
  const handleProceedToNext = () => {
    let targetAdUrl = "";
    if (activeCheckpoint === 1) {
      targetAdUrl = adUrls.c1 || "";
    } else if (activeCheckpoint === 2) {
      targetAdUrl = adUrls.c2 || "";
    } else if (activeCheckpoint === 3) {
      targetAdUrl = adUrls.c3 || "";
    }

    if (targetAdUrl) {
      try {
        window.open(targetAdUrl, "_blank");
      } catch (e) {
        console.error("Popup blocked:", e);
      }
    }

    if (activeCheckpoint < totalCheckpoints) {
      const nextCp = (activeCheckpoint + 1) as 1 | 2 | 3;
      setActiveCheckpoint(nextCp);
      if (nextCp === 2) setCheckpoint2Status("in_progress");
      if (nextCp === 3) setCheckpoint3Status("in_progress");
    } else {
      setStatus("verifying");
    }
  };

  // Verify and save to database after final checkpoint completes (FAIL CLOSED)
  useEffect(() => {
    if (status !== "verifying" || verifiedRef.current) return;
    verifiedRef.current = true;

    const saveBypassToDatabase = async () => {
      try {
        await api.verifyShortlink(sessionId, uuid);
        setStatus("success");
        router.push(`/generate?callback=true&session_id=${sessionId}`);
      } catch (err) {
        console.error("Gateway verification failed (fail closed):", err);
        setStatus("error");
        setErrorMessage("Gateway verification failed. Please try again.");
      }
    };

    saveBypassToDatabase();
  }, [status, uuid, sessionId, router]);

  // Reset helper
  const handleRetry = () => {
    setCountdown1(countdownSeconds);
    setCountdown2(countdownSeconds);
    setCountdown3(countdownSeconds);
    setCheckpoint1Status("in_progress");
    setCheckpoint2Status("pending");
    setCheckpoint3Status("pending");
    setActiveCheckpoint(1);
    setStatus("idle");
    verifiedRef.current = false;
  };

  const isCountingDown = 
    (activeCheckpoint === 1 && countdown1 > 0) ||
    (activeCheckpoint === 2 && countdown2 > 0) ||
    (activeCheckpoint === 3 && countdown3 > 0);

  const currentCountdownVal = 
    activeCheckpoint === 1 ? countdown1 :
    activeCheckpoint === 2 ? countdown2 : countdown3;

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
            {mounted && pageMounted ? (
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

          {/* Compact Hero Section */}
          <div className="flex flex-col items-center gap-2 text-center pt-16 pb-6 sm:pt-20 sm:pb-8">
            <h1 className="text-2xl font-medium tracking-tight sm:text-3xl font-heading text-foreground">
              {t("valincGateway")}
            </h1>
            <p className="max-w-xs text-xs text-muted-foreground font-medium leading-relaxed">
              {t("verificationCheckpoint")}
            </p>
          </div>

          {/* Main Card */}
          <Card className="border border-border bg-card shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-5 sm:p-6 flex flex-col items-center gap-5">
              
              {/* Checkpoint Indicators Area */}
              {status !== "error" && (
                <div className={`w-full grid ${totalCheckpoints === 1 ? "grid-cols-1" : totalCheckpoints === 2 ? "grid-cols-2" : "grid-cols-3"} gap-3 border border-border bg-muted/20 rounded-lg p-3`}>
                  <div className="flex items-center gap-2">
                    <StepBadge number={1} status={checkpoint1Status} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold truncate">{t("checkpoint")} 1</span>
                      <span className="text-[10px] text-muted-foreground">{t("gatewaySecure")}</span>
                    </div>
                  </div>
                  {totalCheckpoints >= 2 && (
                    <div className="flex items-center gap-2">
                      <StepBadge number={2} status={checkpoint2Status} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold truncate">{t("checkpoint")} 2</span>
                        <span className="text-[10px] text-muted-foreground">{t("dbVerification")}</span>
                      </div>
                    </div>
                  )}
                  {totalCheckpoints >= 3 && (
                    <div className="flex items-center gap-2">
                      <StepBadge number={3} status={checkpoint3Status} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold truncate">{t("checkpoint")} 3</span>
                        <span className="text-[10px] text-muted-foreground">{t("finalAccess")}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Verification status and visuals */}
              <div className="flex flex-col items-center justify-center min-h-[160px] w-full">
                
                {status === "idle" && (
                  <div className="flex flex-col items-center gap-5 text-center w-full">
                    {isCountingDown ? (
                      <>
                        <div className="relative flex items-center justify-center">
                          <Loader2 className="h-16 w-16 animate-spin text-primary opacity-30" />
                          <span className="absolute text-xl font-bold font-mono tracking-tighter">
                            {currentCountdownVal}s
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-xs font-bold uppercase tracking-wide text-foreground">
                            {t("checkpoint")} {activeCheckpoint}: {t("securingConnection")}
                          </p>
                          <p className="text-2xs text-muted-foreground font-medium px-4 max-w-[280px]">
                            {t("securingConnectionDesc")}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-4 w-full animate-in fade-in zoom-in duration-300">
                        <div className="space-y-1">
                          <p className="text-xs font-bold uppercase tracking-wide text-foreground">
                            {t("checkpoint")} {activeCheckpoint} {t("secured")}
                          </p>
                          <p className="text-2xs text-muted-foreground font-medium">
                            {activeCheckpoint < totalCheckpoints 
                              ? t("readyProceedNext") 
                              : t("allCheckpointsCompleted")}
                          </p>
                        </div>
                        <Button
                          onClick={handleProceedToNext}
                          className="w-full cursor-pointer text-xs font-bold uppercase py-4"
                        >
                          {activeCheckpoint < totalCheckpoints 
                            ? `${t("proceedToCheckpoint")} ${activeCheckpoint + 1}` 
                            : t("verifyUnlockKey")}
                          <ArrowRight className="h-4 w-4 ml-1.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {status === "verifying" && (
                  <div className="flex flex-col items-center gap-5 text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold uppercase tracking-wide text-foreground">
                        {t("writingToDb")}
                      </p>
                      <p className="text-2xs text-muted-foreground font-medium px-4 max-w-[280px]">
                        {t("savingLogs")} {uuid?.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                )}

                {status === "success" && (
                  <div className="flex flex-col items-center gap-5 text-center animate-in fade-in zoom-in duration-300 w-full">
                    <div className="rounded-full bg-foreground/10 border border-border p-4">
                      <CheckCircle2 className="h-10 w-10 text-foreground" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold uppercase tracking-wide text-foreground">
                        {t("allCheckpointsVerified")}
                      </p>
                      <p className="text-2xs text-muted-foreground font-medium">
                        {t("recordedSuccessfully")}
                      </p>
                    </div>
                    <Button
                      onClick={() => router.push("/generate?callback=true")}
                      className="w-full cursor-pointer text-xs font-bold uppercase py-4"
                    >
                      {t("claimYourKey")}
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Button>
                  </div>
                )}

                {status === "error" && (
                  <div className="flex flex-col items-center gap-5 text-center animate-in fade-in zoom-in duration-300">
                    <div className="rounded-full bg-destructive/10 border border-destructive/20 p-4">
                      <ShieldAlert className="h-10 w-10 text-destructive" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold uppercase tracking-wide text-destructive">
                        {t("verificationFailed")}
                      </p>
                      <p className="text-2xs text-muted-foreground font-medium max-w-[260px]">
                        {errorMessage || t("errorGeneric")}
                      </p>
                    </div>
                    {errorMessage !== "Free key claiming is currently disabled by system administrator." && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRetry}
                        className="text-2xs font-semibold cursor-pointer uppercase tracking-wider"
                      >
                        {t("retryCheckpoints")}
                      </Button>
                    )}
                  </div>
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
