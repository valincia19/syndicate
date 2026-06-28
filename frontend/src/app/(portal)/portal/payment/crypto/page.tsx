"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Clock, Copy, Check, AlertCircle,
  ShieldCheck, Zap, CheckCircle2, Loader2,
} from "lucide-react"
import Link from "next/link"
import { tokenManager } from "@/lib/api"
import { PaymentLogo } from "@/components/payment/payment-logo"

const BASE_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

type PlanKey = "premium" | "pro"

const PLAN_NAMES: Record<PlanKey, string> = { premium: "Premium", pro: "Pro" }
const PLAN_DURATIONS: Record<PlanKey, string> = { premium: "30 Days", pro: "90 Days" }

interface PaymentData {
  ref_id: string
  trx_id: string
  pay_url: string
  total_bayar: number
  total_diterima: number
  price_usd: number
  base_price_usd?: number
  extra_hwid_slots?: number
  extra_hwid_price_usd?: number
  amount_idr: number
  expired_at: number | null
  plan_type?: string
  status?: string
  crypto_address: string | null
  crypto_amount: string | null
  crypto_extra_id: string | null
  coin?: string
  bank_code?: string | null
}

interface PricesData {
  plans?: Record<string, {
    price_usd?: number
    equivalents?: Record<string, { amount: number }>
  }>
}

function getCryptoLabel(coin: string | undefined): string {
  if (!coin) return "Cryptocurrency"
  const upper = coin.toUpperCase()
  if (upper === "USDTTRC20") return "USDT (TRC20)"
  if (upper === "USDTERC20") return "USDT (ERC20)"
  return upper
}

// ─── Auto-detect currency from browser locale ────────────────────────────────
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  ID: 'IDR', US: 'USD', GB: 'GBP', JP: 'JPY', SG: 'SGD', MY: 'MYR',
  TH: 'THB', PH: 'PHP', VN: 'VND', KR: 'KRW', CN: 'CNY', IN: 'INR',
  AU: 'AUD', CA: 'CAD', HK: 'HKD', SA: 'SAR', AE: 'AED', BR: 'BRL',
  TR: 'TRY', RU: 'RUB', MX: 'MXN',
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR',
  AT: 'EUR', IE: 'EUR', PT: 'EUR', FI: 'EUR', GR: 'EUR',
}

function detectUserCurrency(): string {
  if (typeof navigator === 'undefined') return 'USD'
  try {
    const locale = navigator.language || 'en-US'
    const parts = locale.split('-')
    const country = parts[parts.length - 1]?.toUpperCase()
    if (country && COUNTRY_TO_CURRENCY[country]) return COUNTRY_TO_CURRENCY[country]
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    if (tz.startsWith('Asia/Jakarta') || tz.startsWith('Asia/Makassar') || tz.startsWith('Asia/Jayapura')) return 'IDR'
    return 'USD'
  } catch {
    return 'USD'
  }
}

const CURRENCY_SYMBOLS: Record<string, { symbol: string; locale: string }> = {
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'de-DE' },
  GBP: { symbol: '£', locale: 'en-GB' },
  JPY: { symbol: '¥', locale: 'ja-JP' },
  SGD: { symbol: 'S$', locale: 'en-SG' },
  MYR: { symbol: 'RM', locale: 'ms-MY' },
  AUD: { symbol: 'A$', locale: 'en-AU' },
  CAD: { symbol: 'C$', locale: 'en-CA' },
  KRW: { symbol: '₩', locale: 'ko-KR' },
  CNY: { symbol: '¥', locale: 'zh-CN' },
  INR: { symbol: '₹', locale: 'en-IN' },
  THB: { symbol: '฿', locale: 'th-TH' },
  PHP: { symbol: '₱', locale: 'en-PH' },
  VND: { symbol: '₫', locale: 'vi-VN' },
  HKD: { symbol: 'HK$', locale: 'en-HK' },
  BRL: { symbol: 'R$', locale: 'pt-BR' },
  TRY: { symbol: '₺', locale: 'tr-TR' },
  RUB: { symbol: '₽', locale: 'ru-RU' },
  MXN: { symbol: 'MX$', locale: 'es-MX' },
  SAR: { symbol: 'SAR', locale: 'ar-SA' },
  AED: { symbol: 'AED', locale: 'ar-AE' },
  IDR: { symbol: 'Rp', locale: 'id-ID' },
}

function formatCurrency(amount: number, currencyCode: string): string {
  const info = CURRENCY_SYMBOLS[currencyCode]
  const symbol = info ? info.symbol : currencyCode
  const digits = ['JPY', 'KRW', 'VND'].includes(currencyCode) ? 0 : 2
  const formatted = amount.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  return `${symbol}${formatted} ${currencyCode}`
}

function CryptoPaymentContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const orderId = searchParams.get("orderId")

  const [plan, setPlan] = useState<PlanKey>("premium")
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(86400)
  
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [copiedAmount, setCopiedAmount] = useState(false)
  const [copiedMemo, setCopiedMemo] = useState(false)
  const [copiedRef, setCopiedRef] = useState(false)

  const [paymentStatus, setPaymentStatus] = useState<"pending" | "success" | "expired">("pending")

  // Auto-detect user's local currency via IP geolocation and browser fallback
  const [detectedCurrency, setDetectedCurrency] = useState<string>('USD')
  const [pricesData, setPricesData] = useState<PricesData | null>(null)

  useEffect(() => {
    let isMounted = true
    const detectAsync = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) })
        if (res.ok) {
          const data = await res.json()
          if (isMounted && data && data.currency) {
            setDetectedCurrency(data.currency)
            return
          }
        }
      } catch {}
      try {
        const res2 = await fetch('https://ip-api.com/json/?fields=countryCode,currency', { signal: AbortSignal.timeout(3000) })
        if (res2.ok) {
          const data2 = await res2.json()
          if (isMounted && data2 && data2.currency) {
            setDetectedCurrency(data2.currency)
            return
          }
        }
      } catch {}
      if (isMounted) setDetectedCurrency(detectUserCurrency())
    }
    detectAsync()
    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    fetch(`${BASE_API}/v1/currency/plans`)
      .then((res) => res.json())
      .then((data) => { if (data.success) setPricesData(data.data) })
      .catch(() => {})
  }, [])

  /* ── Load order ──────────────────────────────────────────── */
  useEffect(() => {
    let isMounted = true
    const token = tokenManager.getToken()
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (token) headers["Authorization"] = "Bearer " + token

    const resolveTime = (expiredAt: number | null) => {
      if (!expiredAt) return 86400
      const diff = Math.floor((expiredAt * 1000 - Date.now()) / 1000)
      return diff > 0 ? diff : 0
    }

    const load = async () => {
      try {
        if (!orderId) {
          throw new Error("Missing orderId parameter")
        }

        const res = await fetch(`${BASE_API}/v1/payment/qris/order?ref_id=${orderId}`, { headers, credentials: "include" })
        if (res.status === 401) { if (isMounted) router.push("/login"); return }
        const json = await res.json()
        if (!isMounted) return
        if (!res.ok || !json.success) throw new Error(json.error || "Failed to load order")

        const d: PaymentData = json.data
        setPaymentData(d)
        setPlan((d.plan_type || "premium") as PlanKey)

        const diff = resolveTime(d.expired_at)
        if (d.status === "paid") {
          setPaymentStatus("success"); setTimeLeft(0)
        } else if (diff <= 0) {
          setPaymentStatus("expired"); setTimeLeft(0)
        } else {
          setPaymentStatus("pending"); setTimeLeft(diff)
        }
      } catch (err: unknown) {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    load()
    return () => { isMounted = false }
  }, [orderId, router])

  /* ── Poll status every 5 s ───────────────────────────────── */
  useEffect(() => {
    if (!paymentData || paymentStatus !== "pending") return
    const poll = async () => {
      const token = tokenManager.getToken()
      const headers: Record<string, string> = {}
      if (token) headers["Authorization"] = "Bearer " + token
      try {
        const r = await fetch(`${BASE_API}/v1/payment/crypto/status?ref_id=${paymentData.ref_id}`, { headers, credentials: "include" })
        const d = await r.json()
        if (d.success && d.data?.status === "Success") setPaymentStatus("success")
      } catch { /* ignore */ }
    }
    const id = setInterval(poll, 5000)
    return () => clearInterval(id)
  }, [paymentData, paymentStatus])

  /* ── Countdown ───────────────────────────────────────────── */
  useEffect(() => {
    if (paymentStatus !== "pending") return
    const id = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) { setPaymentStatus("expired"); return 0 }
        return p - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [paymentStatus])

  /* ── Helpers ─────────────────────────────────────────────── */
  const h = Math.floor(timeLeft / 3600)
  const m = Math.floor((timeLeft % 3600) / 60)
  const s = timeLeft % 60
  const timerDisplay = h > 0
    ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`

  const handleCopy = (text: string, setCopiedState: (v: boolean) => void) => {
    navigator.clipboard.writeText(text)
    setCopiedState(true)
    setTimeout(() => setCopiedState(false), 2000)
  }

  /* ── Render: loading ─────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Menyiapkan order pembayaran...</p>
      </div>
    )
  }

  /* ── Render: error ───────────────────────────────────────── */
  if (error || !paymentData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20">
          <AlertCircle className="h-8 w-8 text-red-500/70" />
        </div>
        <div className="text-center">
          <h3 className="text-sm font-bold text-foreground mb-1">Gagal Memuat Order</h3>
          <p className="text-[11px] text-muted-foreground max-w-xs">{error || "Terjadi kesalahan saat memuat order."}</p>
        </div>
        <Link href={`/portal/payment?plan=${plan}`}
          className="px-4 py-2 bg-primary text-primary-foreground text-[11px] font-bold rounded-lg hover:opacity-90 transition-opacity">
          Coba Lagi
        </Link>
      </div>
    )
  }

  const coinName = paymentData.bank_code || "crypto"
  const qrCodeUrl = paymentData.crypto_address 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(paymentData.crypto_address)}`
    : null

  return (
    <div className="space-y-3 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-row items-center justify-between border-b border-border pb-2.5 gap-2">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="p-1.5 rounded-md hover:bg-accent/40 text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-lg font-black tracking-tight text-foreground uppercase">Crypto Payment</h1>
            <p className="text-[11px] text-muted-foreground">
              {PLAN_NAMES[plan]} Plan · <span className="font-mono">{PLAN_DURATIONS[plan]}</span>
            </p>
          </div>
        </div>

        {/* Status badge */}
        {paymentStatus === "pending" && (
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Clock className="h-3 w-3" /> {timerDisplay}
          </span>
        )}
        {paymentStatus === "success" && (
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" /> PAID
          </span>
        )}
        {paymentStatus === "expired" && (
          <span className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono font-bold bg-red-500/10 text-red-500 border border-red-500/20">
            <AlertCircle className="h-3 w-3" /> EXPIRED
          </span>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid gap-3 lg:grid-cols-3 items-start">
        {/* Left Column */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          {/* Step Indicator */}
          <div className="rounded-lg border border-border bg-card p-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-bold border border-border">
                  <Check className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="text-[11px] font-bold text-muted-foreground">Select Payment</span>
              </div>
              <div className="flex-1 h-px bg-border" />
              <div className="flex items-center gap-2">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors ${
                  paymentStatus === "pending"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-border"
                }`}>
                  {paymentStatus === "success" ? <Check className="h-3 w-3" /> : "2"}
                </div>
                <span className={`text-[11px] font-bold transition-colors ${
                  paymentStatus === "pending" ? "text-foreground" : "text-muted-foreground"
                }`}>Confirm &amp; Pay</span>
              </div>
              <div className="flex-1 h-px bg-border" />
              <div className="flex items-center gap-2">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors ${
                  paymentStatus === "success"
                    ? "bg-emerald-500 text-emerald-foreground border-emerald-500 animate-pulse"
                    : "bg-muted text-muted-foreground border-border"
                }`}>
                  3
                </div>
                <span className={`text-[11px] font-bold transition-colors ${
                  paymentStatus === "success" ? "text-foreground font-black" : "text-muted-foreground"
                }`}>Activate</span>
              </div>
            </div>
          </div>

          {/* Payment Card */}
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            {/* Expired State */}
            {paymentStatus === "expired" && (
              <div className="flex flex-col items-center gap-4 py-12 px-6">
                <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-8 h-8 text-red-500/70" />
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-bold text-foreground mb-1">Order Kadaluarsa</h3>
                  <p className="text-[11px] text-muted-foreground">Waktu pembayaran habis. Silakan buat order baru.</p>
                </div>
                <Link href={`/portal/payment?plan=${plan}`}
                  className="px-5 py-2 bg-primary text-primary-foreground text-[11px] font-bold rounded-lg hover:opacity-90 transition-opacity">
                  Buat Pembayaran Baru
                </Link>
              </div>
            )}

            {/* Success State */}
            {paymentStatus === "success" && (
              <div className="flex flex-col items-center gap-4 py-12 px-6">
                <div className="p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-bold text-foreground mb-1">Pembayaran Berhasil!</h3>
                  <p className="text-[11px] text-muted-foreground">Lisensi {PLAN_NAMES[plan]} kamu sudah aktif.</p>
                </div>
                <Link href="/portal/license"
                  className="px-5 py-2 bg-primary text-primary-foreground text-[11px] font-bold rounded-lg hover:opacity-90 transition-opacity">
                  Lihat Lisensi
                </Link>
              </div>
            )}

            {/* Pending State */}
            {paymentStatus === "pending" && (
              <div className="flex flex-col md:flex-row gap-6 p-5">
                {/* QR Section */}
                <div className="flex flex-col items-center gap-3 shrink-0 mx-auto">
                  <div className="flex items-center gap-2.5 self-start md:self-center">
                    <PaymentLogo code={coinName} label={getCryptoLabel(coinName)} size="w-6 h-6" />
                    <span className="font-extrabold text-xs text-foreground tracking-tight uppercase">Pay with {getCryptoLabel(coinName)}</span>
                  </div>
                  
                  {qrCodeUrl ? (
                    <div className="rounded-lg border border-border bg-white p-3 flex items-center justify-center shadow-xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrCodeUrl}
                        alt="Crypto Wallet Address QR"
                        className="w-44 h-44 object-contain rounded-md"
                      />
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border bg-muted/10 p-8 flex flex-col items-center gap-3 w-44 h-44 justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/30" />
                    </div>
                  )}
                  <span className="text-[9px] text-muted-foreground text-center font-mono">Scan QR to copy address</span>
                </div>

                {/* Details Section */}
                <div className="flex-1 flex flex-col gap-3">
                  {/* Crypto Amount Block */}
                  <div className="rounded-lg border border-border bg-muted/20 px-3.5 py-3 flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[8px] font-mono text-muted-foreground/80 uppercase tracking-wider">Send Amount ({coinName.toUpperCase()})</span>
                      <span className="text-lg font-mono font-black text-foreground">{paymentData.crypto_amount}</span>
                    </div>
                    <button 
                      onClick={() => handleCopy(paymentData.crypto_amount || "", setCopiedAmount)} 
                      className="p-2 rounded-md border border-border bg-card hover:bg-accent/40 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                    >
                      {copiedAmount ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  {/* Wallet Address Block */}
                  <div className="rounded-lg border border-border bg-muted/20 px-3.5 py-3 flex items-center justify-between">
                    <div className="flex flex-col gap-0.5 max-w-[80%]">
                      <span className="text-[8px] font-mono text-muted-foreground/80 uppercase tracking-wider">Wallet Address</span>
                      <span className="text-[10px] font-mono text-foreground break-all leading-tight">{paymentData.crypto_address}</span>
                    </div>
                    <button 
                      onClick={() => handleCopy(paymentData.crypto_address || "", setCopiedAddress)} 
                      className="p-2 rounded-md border border-border bg-card hover:bg-accent/40 transition-colors cursor-pointer text-muted-foreground hover:text-foreground shrink-0"
                    >
                      {copiedAddress ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  {/* Memo / Tag Block (If Available) */}
                  {paymentData.crypto_extra_id && (
                    <div className="rounded-lg border border-border bg-amber-500/5 border-amber-500/10 px-3.5 py-3 flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] font-mono text-amber-500 uppercase tracking-wider font-bold">Destination Tag / Memo (REQUIRED)</span>
                        <span className="text-sm font-mono font-black text-foreground">{paymentData.crypto_extra_id}</span>
                      </div>
                      <button 
                        onClick={() => handleCopy(paymentData.crypto_extra_id || "", setCopiedMemo)} 
                        className="p-2 rounded-md border border-amber-500/20 bg-card hover:bg-accent/40 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                      >
                        {copiedMemo ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  )}

                  {/* Reference Order ID */}
                  <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 flex items-center justify-between gap-2 text-[10px] font-mono">
                    <div className="flex flex-col">
                      <span className="text-[8px] text-muted-foreground/60 uppercase tracking-wider">Order Reference ID</span>
                      <span className="text-foreground truncate max-w-[200px]">{paymentData.ref_id}</span>
                    </div>
                    <button 
                      onClick={() => handleCopy(paymentData.ref_id, setCopiedRef)} 
                      className="p-1 rounded-md hover:bg-accent/40 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                    >
                      {copiedRef ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Instructions Box */}
          {paymentStatus === "pending" && (
            <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 shadow-xs">
              <h3 className="font-extrabold text-xs text-foreground tracking-tight uppercase">Panduan Pembayaran</h3>
              <ol className="flex flex-col gap-2.5">
                {[
                  `Buka wallet atau exchange tempat Anda menyimpan koin ${getCryptoLabel(coinName)}.`,
                  "Pilih menu penarikan / kirim koin (Withdrawal / Send).",
                  `Salin Wallet Address dan masukkan jumlah coin tepat sebesar ${paymentData.crypto_amount} ${coinName.toUpperCase()}.`,
                  paymentData.crypto_extra_id 
                    ? `PENTING: Anda harus memasukkan Memo / Destination Tag sebesar ${paymentData.crypto_extra_id} saat transfer, jika tidak dana akan hilang!`
                    : "Pastikan Anda memilih jaringan network yang sesuai (misal TRC20 untuk USDT-TRC20, TRON untuk TRX).",
                  "Kirim koin, lalu tunggu proses konfirmasi blockchain. Lisensi akan aktif otomatis begitu pembayaran terdeteksi."
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-primary/15 text-primary text-[9px] font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-[11px] text-muted-foreground leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 shadow-xs">
            <h3 className="font-extrabold text-xs text-foreground tracking-tight uppercase">Summary</h3>

            {/* Pricing Card */}
            <div className="rounded-lg bg-muted/30 border border-border p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-foreground">{PLAN_NAMES[plan]} Plan</span>
                <span className="text-[9px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                  {PLAN_DURATIONS[plan]}
                </span>
              </div>

              {paymentData.extra_hwid_slots && paymentData.extra_hwid_slots > 0 ? (
                <div className="flex flex-col gap-1 py-1 border-t border-b border-border/50 text-[11px] font-mono">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Base Plan</span>
                    <span>${paymentData.base_price_usd ?? 6} USD</span>
                  </div>
                  <div className="flex justify-between text-primary font-semibold">
                    <span>Extra HWID (+{paymentData.extra_hwid_slots} slots)</span>
                    <span>+${paymentData.extra_hwid_price_usd} USD</span>
                  </div>
                </div>
              ) : null}

              {(() => {
                const localCurrencyCode = detectedCurrency
                const isLocalIDR = localCurrencyCode === 'IDR'
                const planEquiv = pricesData?.plans?.[plan]?.equivalents?.[localCurrencyCode]
                const basePlanUSD = pricesData?.plans?.[plan]?.price_usd || (plan === 'pro' ? 6 : 2)
                const localPrice = (planEquiv && paymentData)
                  ? (paymentData.price_usd * (planEquiv.amount / basePlanUSD))
                  : null

                return (
                  <div className="flex flex-col gap-0.5 pt-0.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Total Due</span>
                      <span className="text-xl font-mono font-black text-foreground tracking-tight">
                        ${paymentData.price_usd} USD
                      </span>
                    </div>
                    <div className="text-right">
                      {!isLocalIDR && localCurrencyCode !== 'USD' && localPrice !== null ? (
                        <span className="text-[10px] font-mono font-bold text-primary/90">
                          ≈ {formatCurrency(localPrice, localCurrencyCode)} <span className="text-muted-foreground/60 font-normal">({new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(paymentData.amount_idr)})</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-primary/90">
                          ≈ {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(paymentData.amount_idr)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Status Pill */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
              paymentStatus === "success" ? "bg-emerald-500/10 border-emerald-500/20"
              : paymentStatus === "expired" ? "bg-red-500/10 border-red-500/20"
              : "bg-muted/20 border-border/50"
            }`}>
              <div className="flex-1 flex flex-col gap-0">
                <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-wider">Status</span>
                <span className={`text-[11px] font-bold ${
                  paymentStatus === "success" ? "text-emerald-500"
                  : paymentStatus === "expired" ? "text-red-500"
                  : "text-amber-500"
                }`}>
                  {paymentStatus === "pending" ? "Menunggu Pembayaran"
                    : paymentStatus === "success" ? "Pembayaran Dikonfirmasi"
                    : "Order Kadaluarsa"}
                </span>
              </div>
              {paymentStatus === "pending" && <Zap className="w-4 h-4 text-amber-500 animate-pulse" />}
              {paymentStatus === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              {paymentStatus === "expired" && <AlertCircle className="w-4 h-4 text-red-500" />}
            </div>
          </div>

          {/* Secure badge */}
          <div className="rounded-xl border border-border/60 bg-muted/10 p-3 flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            <div className="flex flex-col gap-0">
              <span className="text-[10px] font-bold text-foreground">Pembayaran Aman</span>
              <span className="text-[9px] text-muted-foreground font-mono">Powered by NOWPayments · SSL Encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CryptoPaymentPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <CryptoPaymentContent />
    </Suspense>
  )
}
