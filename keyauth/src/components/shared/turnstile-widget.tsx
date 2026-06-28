"use client";

import { useEffect, useRef } from "react";

interface TurnstileWidgetProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: (errCode: unknown) => void;
}

export function TurnstileWidget({ siteKey, onVerify, onError }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!siteKey || siteKey.startsWith("0x000000")) {
      return;
    }

    let isMounted = true;
    let widgetId: string | null = null;

    const initializeTurnstile = () => {
      if (!containerRef.current || !isMounted) return;

      containerRef.current.innerHTML = "";

      // @ts-expect-error — Turnstile global
      if (window.turnstile) {
        try {
          // @ts-expect-error — Turnstile render
          widgetId = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            callback: onVerify,
            "error-callback": (errCode: unknown) => {
              console.error("Turnstile widget error:", errCode);
              if (isMounted) {
                onError?.(errCode);
              }
            },
            theme: "dark",
            size: "normal",
          });
        } catch (err) {
          console.error("Turnstile render error:", err);
          onError?.(err);
        }
      }
    };

    const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    const existingScript = document.querySelector(`script[src="${SCRIPT_URL}"]`);

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initializeTurnstile();
      };
      script.onerror = (err) => {
        console.error("Turnstile script load error:", err);
        if (isMounted) {
          onError?.("SCRIPT_LOAD_FAILED");
        }
      };
      document.head.appendChild(script);
    } else {
      // @ts-expect-error — Turnstile global
      if (window.turnstile) {
        initializeTurnstile();
      } else {
        const interval = setInterval(() => {
          // @ts-expect-error — Turnstile global
          if (window.turnstile) {
            clearInterval(interval);
            initializeTurnstile();
          }
        }, 100);
        return () => clearInterval(interval);
      }
    }

    return () => {
      isMounted = false;
      if (widgetId) {
        try {
          // @ts-expect-error — Turnstile remove
          if (typeof window !== "undefined" && window.turnstile && typeof window.turnstile.remove === "function") {
            // @ts-expect-error — Turnstile remove
            window.turnstile.remove(widgetId);
          }
        } catch {}
      }
    };
  }, [siteKey, onVerify, onError]);

  if (!siteKey || siteKey.startsWith("0x000000")) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-6">
        <p className="text-center text-2xs text-muted-foreground font-semibold">
          Cloudflare Turnstile not configured.
          <br />
          Set <code className="font-mono text-[9px] text-muted-foreground bg-muted px-1 py-0.5 rounded mt-1 inline-block">TURNSTILE_SITE_KEY</code> in{" "}
          <code className="font-mono text-[9px] text-muted-foreground bg-muted px-1 py-0.5 rounded mt-1 inline-block">page.tsx</code>
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center p-0.5"
    />
  );
}
