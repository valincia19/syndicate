/**
 * PaymentLogo - renders the correct logo for a given payment channel code.
 * Logos are stored locally in /public/logos/payment/ to avoid CORS issues.
 */

import React from "react"

// ─── Local logo map ─────────────────────────────────────────────────────────
// Keys = Tokopay channel codes (uppercased).
// Values = path relative to /public/ - all downloaded from assets.tokovoucher.id per-card
const LOGO_MAP: Record<string, string> = {
  // Virtual Account - PNG dari tokovoucher CDN
  BCAVA:     "/logos/payment/bcava.png",
  BRIVA:     "/logos/payment/briva.png",
  BNIVA:     "/logos/payment/bniva.png",
  MANDIRIVA: "/logos/payment/mandiriva.svg",   // SVG branded
  PERMATAVA: "/logos/payment/permatava.svg",   // official SVG (wikipedia)
  CIMBVA:    "/logos/payment/cimbva.png",
  DANAMONVA: "/logos/payment/danamonva.svg",   // SVG branded
  BSIVA:     "/logos/payment/bsiva.jpg",       // real photo logo
  BNCVA:     "/logos/payment/bncva.png",

  // E-Money - PNG dari tokovoucher CDN (per-card correct pairing)
  GOPAY:     "/logos/payment/gopay.png",
  SHOPEEPAY: "/logos/payment/shopeepay.png",
  OVOPUSH:   "/logos/payment/ovopush.svg",
  DANA:      "/logos/payment/dana.png",
  LINKAJA:   "/logos/payment/linkaja.png",
  ASTRAPAY:  "/logos/payment/astrapay.png",
  VIRGO:     "/logos/payment/virgo.png",

  // Retail
  ALFAMART:  "/logos/payment/alfamart.png",
  INDOMARET: "/logos/payment/indomaret.png",

  // QRIS
  QRIS:         "/logos/payment/qris.png",
  QRISREALTIME: "/logos/payment/qris.png",
}

import cryptoLogos from "@/config/crypto-logos.json"

// Brand colours used as fallback background when logo isn't available
const BRAND_COLORS: Record<string, string> = {
  BCAVA:     "#005BAB", BRIVA:     "#003D7A", BNIVA:    "#F26522",
  MANDIRIVA: "#003D7A", PERMATAVA: "#E31E24", CIMBVA:   "#C1111A",
  DANAMONVA: "#E31E24", BSIVA:     "#04924B", BNCVA:    "#0095DA",
  GOPAY:     "#00AD5F", SHOPEEPAY: "#EE4D2D", OVOPUSH:  "#4C3496",
  DANA:      "#118EEA", LINKAJA:   "#E82529", ASTRAPAY: "#009FDB",
  VIRGO:     "#5B2D8E", ALFAMART:  "#E82529", INDOMARET:"#E4033D",
  QRIS:      "#E31E24",
  BTC:       "#F7931A", ETH:       "#627EEA", LTC:       "#345D9D",
  TRX:       "#EF0027", USDTTRC20: "#26A17B", USDTERC20: "#26A17B",
}

// Helper to get crypto CDN icon URL
function getCryptoIconUrl(code: string): string {
  let ticker = code.toLowerCase()
  // Check if we have the local file registered in our crypto-logos manifest
  const localPath = (cryptoLogos as Record<string, string>)[ticker]
  if (localPath) {
    return localPath
  }

  // Remove common network suffixes (e.g. trc20, erc20, bsc, bep20, sol, matic, polygon)
  const suffixes = ['trc20', 'erc20', 'bsc', 'bep20', 'sol', 'matic', 'polygon', 'algo', 'avax', 'ftm', 'op', 'arb']
  for (const suffix of suffixes) {
    if (ticker.endsWith(suffix) && ticker !== suffix) {
      ticker = ticker.slice(0, -suffix.length)
    }
  }
  // Special overrides
  if (ticker.startsWith('usdt')) ticker = 'usdt'
  if (ticker.startsWith('usdc')) ticker = 'usdc'
  
  return `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/${ticker}.svg`
}

interface PaymentLogoProps {
  /** Tokopay channel code, e.g. "BCAVA", "GOPAY" */
  code: string | null | undefined
  /** Display label shown in the fallback pill */
  label?: string
  className?: string
  /** Container size class (applied to wrapper div). Default: "w-10 h-10" */
  size?: string
}

export function PaymentLogo({ code, label, className = "", size = "w-10 h-10" }: PaymentLogoProps) {
  const key = (code || "").toUpperCase()
  
  let src = LOGO_MAP[key]
  const isCrypto = !src && !!key
  
  if (isCrypto) {
    src = getCryptoIconUrl(key)
  }

  const color = BRAND_COLORS[key] || "#6366f1"
  let abbr = label || key
  if (abbr.toUpperCase().startsWith("USDT")) {
    abbr = "USDT"
  } else {
    abbr = abbr.slice(0, 4).toUpperCase()
  }

  if (!src) {
    // Fallback - coloured pill with abbreviation
    return (
      <div
        className={`${size} rounded-lg flex items-center justify-center flex-shrink-0 ${className}`}
        style={{ backgroundColor: color }}
      >
        <span className="text-white text-[9px] font-black tracking-tight leading-none text-center px-0.5">
          {abbr}
        </span>
      </div>
    )
  }

  return (
    <div className={`${size} rounded-lg flex items-center justify-center flex-shrink-0 p-1 ${
      isCrypto ? "bg-muted/10 border border-border/20 p-1.5" : ""
    } ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={label ?? key}
        className="max-h-full max-w-full object-contain"
        onError={(e) => {
          const parent = (e.target as HTMLImageElement).parentElement
          if (!parent) return
          parent.style.backgroundColor = color
          parent.style.border = "none"
          ;(e.target as HTMLImageElement).style.display = "none"
          const span = document.createElement("span")
          span.textContent = abbr
          span.style.cssText = "color:white;font-size:9px;font-weight:900;letter-spacing:-0.05em"
          parent.appendChild(span)
        }}
      />
    </div>
  )
}
