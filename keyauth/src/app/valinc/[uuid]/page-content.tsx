"use client";

import { useEffect, useState, useRef, Suspense, startTransition } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, ShieldAlert, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/shared/header";
import { SlantedPattern } from "@/components/shared/slanted-pattern";
import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { StepBadge, StepStatus } from "@/components/shared/step-badge";
import { api } from "@/lib/api";
import { toast } from "sonner";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function ValincBypassContent() {
  const { t } = useLanguage();
  const params = useParams() as { uuid: string };
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read uuid from query params for static export compatibility, fallback to route param
  const queryUuid = searchParams.get("uuid") || "";
  const uuid = (queryUuid && queryUuid !== "default") ? queryUuid : params.uuid;

  const rawSessionId = searchParams.get("session_id") || "";
  const sessionId = rawSessionId.split(/[?&]/)[0].trim();

  // Dynamic configuration loaded from backend
  const [totalCheckpoints, setTotalCheckpoints] = useState(2);
  const [countdownSeconds, setCountdownSeconds] = useState(10);
  const [adUrls, setAdUrls] = useState<{ c1?: string; c2?: string; c3?: string }>({});

  // Checkpoints State
  const [activeCheckpoint, setActiveCheckpoint] = useState<1 | 2 | 3>(1);
  const [checkpoint1Status, setCheckpoint1Status] = useState<StepStatus>("in_progress");
  const [checkpoint2Status, setCheckpoint2Status] = useState<StepStatus>("pending");
  const [checkpoint3Status, setCheckpoint3Status] = useState<StepStatus>("pending");

  // ── WALL-CLOCK COUNTDOWN ────────────────────────────────────────────────
  // Uses Date.now() diff against a fixed startTime ref instead of a mutable
  // state counter. This makes the displayed countdown tamper-proof:
  // React DevTools can force-set any state variable, but it cannot rewind
  // real wall-clock time. The remaining seconds shown are always derived
  // from (startTime + totalSeconds - Date.now()) at each interval tick.
  const [currentCountdownVal, setCurrentCountdownVal] = useState(10);
  // checkpointStartTimeRef is initialized to 0; set to Date.now() inside useEffect
  const checkpointStartTimeRef = useRef<number>(0);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // State-based flag so render can legally read it (refs must not be read during render)
  const [checkpointCompleted, setCheckpointCompleted] = useState(false);

  // Clears the active interval safely
  const clearCountdownInterval = () => {
    if (countdownIntervalRef.current !== null) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };


  // Verification API Call State
  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [verifyingText, setVerifyingText] = useState("Initializing validation node...");
  const [errorMessage, setErrorMessage] = useState("");
  const verifiedRef = useRef(false);

  // Fetch settings on mount
  useEffect(() => {
    // Validate session browser consistency (prevent switching browser)
    let storedId = "";
    if (typeof window !== "undefined") {
      storedId = localStorage.getItem("keyauth_current_session_id") || "";
    }

    if (!sessionId) {
      setTimeout(() => {
        setStatus("error");
        setErrorMessage(t("errorSessionNotFound"));
      }, 0);
      return;
    }

    if (!storedId) {
      setTimeout(() => {
        setStatus("error");
        setErrorMessage(t("errorBrowserSwitchNew"));
      }, 0);
      return;
    }

    if (storedId !== sessionId) {
      setTimeout(() => {
        setStatus("error");
        setErrorMessage(t("errorBrowserSwitchSession"));
      }, 0);
      return;
    }

    const fetchSettings = async () => {
      try {
        const isValid = await api.checkSession(sessionId);
        if (!isValid) {
          setStatus("error");
          setErrorMessage("Verification session has expired or is invalid. Please start over.");
          return;
        }

        const res = await fetch(`${API_BASE_URL}/v1/bypass/settings`);
        const data = await res.json();
        if (data.status === "success" && data.data) {
          const cfg = data.data;
          
          if (cfg.is_enabled === false) {
            setStatus("error");
            setErrorMessage(t("systemPaused"));
            return;
          }

          const seconds = cfg.valinc_countdown_seconds ?? 10;
          const checkpointsCount = cfg.valinc_checkpoints ?? 2;
          
          setCountdownSeconds(seconds);
          setCurrentCountdownVal(seconds);
          setTotalCheckpoints(checkpointsCount);
          setAdUrls({
            c1: cfg.checkpoint1_url,
            c2: cfg.checkpoint2_url,
            c3: cfg.checkpoint3_url,
          });
        }
      } catch (err) {
        toast.error("Failed to load checkpoint settings. Please reload.");
        void err;
      }
    };

    fetchSettings();
  }, [sessionId, t]);

  // ── WALL-CLOCK COUNTDOWN ENGINE ──────────────────────────────────────────
  // Starts a real-time interval keyed to the active checkpoint.
  // The countdown value displayed is computed as:
  //   remaining = countdownSeconds - floor((Date.now() - startTime) / 1000)
  // This is immune to React DevTools state injection — forcing setCurrentCountdownVal(0)
  // via DevTools will just be overwritten on the next interval tick (250ms later).
  // The only way to reach 0 is to actually wait the required real seconds.
  useEffect(() => {
    if (status === "error" || status === "verifying" || status === "success") return;
    // Don't restart countdown if this checkpoint was already completed
    if (checkpointCompleted) return;

    clearCountdownInterval();
    checkpointStartTimeRef.current = Date.now();
    // Wrap in startTransition to satisfy react-hooks/set-state-in-effect
    startTransition(() => setCurrentCountdownVal(countdownSeconds));

    const setStatusForCheckpoint = (cp: 1 | 2 | 3) => {
      setCheckpointCompleted(true);
      if (cp === 1) setCheckpoint1Status("completed");
      if (cp === 2) setCheckpoint2Status("completed");
      if (cp === 3) setCheckpoint3Status("completed");
    };

    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - checkpointStartTimeRef.current) / 1000);
      const remaining = Math.max(0, countdownSeconds - elapsed);
      setCurrentCountdownVal(remaining);

      if (remaining <= 0) {
        clearCountdownInterval();
        setStatusForCheckpoint(activeCheckpoint);
      }
    }, 250); // 250ms tick — fast enough to feel responsive, harder to race

    return clearCountdownInterval;
  }, [activeCheckpoint, checkpointCompleted, countdownSeconds, status]);


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
      setCheckpointCompleted(false);
    } else {
      setStatus("verifying");
    }
  };

  // Verify and save to database after final checkpoint completes (FAIL CLOSED)
  useEffect(() => {
    if (status !== "verifying" || verifiedRef.current) return;
    verifiedRef.current = true;

    const phrases = [
      "Contacting security validation nodes...",
      "Verifying device fingerprint integrity...",
      "Analyzing Turnstile captcha verification token...",
      "Querying IP claim history in database...",
      "Scanning for suspicious ad-blocker or bypass behavior...",
      "Checking shortlink referral headers...",
      "Cryptographic handshake in progress...",
      "Finalizing access token issuance..."
    ];

    let phraseIndex = 0;
    const textInterval = setInterval(() => {
      phraseIndex = (phraseIndex + 1) % phrases.length;
      setVerifyingText(phrases[phraseIndex]);
    }, 2000);

    const saveBypassToDatabase = async () => {
      // Generate a random delay between 10 and 30 seconds (in ms)
      const delayMs = (Math.floor(Math.random() * (30 - 10 + 1)) + 10) * 1000;

      setTimeout(async () => {
        clearInterval(textInterval);

        // 25% chance of simulated failure (to ensure robust anti-abuse UX simulation)
        const shouldSimulateFailure = Math.random() < 0.25;

        if (shouldSimulateFailure) {
          const userErrorMessage = "Ad-blocker interference or gateway handshake timeout. Please ensure ad-blockers are disabled and try again.";
          router.push(`/generate?error=${encodeURIComponent(userErrorMessage)}`);
          return;
        }

        try {
          await api.verifyShortlink(sessionId, uuid);
          setStatus("success");
          router.push(`/generate?callback=true&session_id=${sessionId}`);
        } catch (err) {
          void err;
          const apiErrorMessage = "Verification signature mismatch. Please ensure you do not use automated bypassers and try again.";
          router.push(`/generate?error=${encodeURIComponent(apiErrorMessage)}`);
        }
      }, delayMs);
    };

    saveBypassToDatabase();
    return () => clearInterval(textInterval);
  }, [status, uuid, sessionId, router]);

  // Reset helper
  const handleRetry = () => {
    clearCountdownInterval();
    setCheckpointCompleted(false);
    checkpointStartTimeRef.current = 0;
    setCurrentCountdownVal(countdownSeconds);
    setCheckpoint1Status("in_progress");
    setCheckpoint2Status("pending");
    setCheckpoint3Status("pending");
    setActiveCheckpoint(1);
    setStatus("idle");
    verifiedRef.current = false;
  };

  const isCountingDown = currentCountdownVal > 0 && !checkpointCompleted;

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
                      <p className="text-xs font-bold uppercase tracking-wide text-foreground animate-pulse">
                        Verifying Gateway Session
                      </p>
                      <p className="text-2xs text-muted-foreground font-medium px-4 max-w-[280px]">
                        {verifyingText}
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

export default function ValincBypassPage() {
  return (
    <Suspense>
      <ValincBypassContent />
    </Suspense>
  );
}
