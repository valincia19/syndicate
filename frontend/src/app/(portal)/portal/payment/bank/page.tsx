"use client"

import { Suspense, useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Banknote, Clock, Copy, Check, AlertCircle,
  ShieldCheck, Zap, CheckCircle2, Loader2,
} from "lucide-react"
import Link from "next/link"
import { tokenManager } from "@/lib/api"

const BASE_API = process.env.NEXT_PUBLIC_API_URL || ""

type PlanKey = "premium" | "pro"

const PLAN_NAMES: Record<PlanKey, string> = { premium: "Premium", pro: "Pro" }
const PLAN_DURATIONS: Record<PlanKey, string> = { premium: "30 Days", pro: "90 Days" }

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)
}

interface PaymentData {
  ref_id: string
  trx_id: string
  pay_url: string
  va_number: string | null
  bank_code: string | null
  total_bayar: number
  total_diterima: number
  price_usd: number
  usd_rate: number
  amount_idr: number
  expired_at: number | null
  plan_type?: string
  status?: string
}

function getBankLabel(code: string | null): string {
  if (!code) return "Bank Transfer"
  const clean = code.toUpperCase().replace("VA", "")
  if (clean === "MANDIRI") return "Mandiri Virtual Account"
  if (clean === "BNC") return "Neo Commerce (BNC) Virtual Account"
  return `${clean} Virtual Account`
}

function getBankInstructions(code: string | null, va: string, amountStr: string): string[] {
  const bank = (code || "").toUpperCase().replace("VA", "")
  switch (bank) {
    case "BCA":
      return [
        "Buka aplikasi m-BCA atau kunjungi ATM BCA terdekat.",
        "Pilih menu 'Transfer' kemudian pilih 'BCA Virtual Account'.",
        `Masukkan nomor Virtual Account: ${va}`,
        `Pastikan detail tagihan (VALINC SYNDICATE) & jumlah bayar (${amountStr}) sesuai.`,
        "Masukkan PIN Anda untuk menyelesaikan transaksi."
      ]
    case "MANDIRI":
      return [
        "Buka aplikasi Livin' by Mandiri atau kunjungi ATM Mandiri.",
        "Pilih menu 'Bayar' kemudian cari 'Multipayment' atau pilih 'Virtual Account'.",
        `Masukkan nomor Virtual Account Mandiri: ${va}`,
        `Konfirmasi detail tagihan & jumlah bayar (${amountStr}) lalu pilih Lanjut.`,
        "Selesaikan transaksi dengan memasukkan MPIN / PIN ATM."
      ]
    case "BNI":
      return [
        "Buka BNI Mobile Banking atau kunjungi ATM BNI.",
        "Pilih menu 'Transfer' kemudian pilih 'Virtual Account Billing'.",
        `Masukkan nomor Virtual Account BNI: ${va}`,
        `Periksa kesesuaian nominal bayar (${amountStr}) dan deskripsi tagihan.`,
        "Masukkan password transaksi / PIN ATM untuk menyelesaikan pembayaran."
      ]
    case "BRI":
      return [
        "Buka aplikasi BRImo atau kunjungi ATM BRI terdekat.",
        "Pilih menu 'BRIVA' (BRI Virtual Account).",
        `Masukkan kode / nomor BRIVA: ${va}`,
        `Periksa detail nama merchant & nominal tagihan sebesar ${amountStr}.`,
        "Masukkan PIN BRImo / PIN ATM untuk konfirmasi pembayaran."
      ]
    case "PERMATA":
      return [
        "Buka aplikasi PermataMobile X atau kunjungi ATM Permata.",
        "Pilih menu 'Transfer' kemudian pilih 'Virtual Account'.",
        `Masukkan nomor Virtual Account Permata: ${va}`,
        `Pastikan nominal transfer (${amountStr}) sesuai dengan tagihan.`,
        "Masukkan PIN transaksi Anda untuk menyelesaikan transfer."
      ]
    case "BSI":
      return [
        "Buka aplikasi BSI Mobile atau kunjungi ATM Bank Syariah Indonesia.",
        "Pilih menu 'Pembayaran' atau 'Transfer' > 'Layanan Syariah' > 'BSI Virtual Account'.",
        `Masukkan nomor Virtual Account BSI: ${va}`,
        `Verifikasi detail tagihan Anda & jumlah bayar (${amountStr}).`,
        "Masukkan PIN BSI Mobile atau PIN ATM untuk menyelesaikan transaksi."
      ]
    case "CIMB":
      return [
        "Buka OCTO Mobile atau kunjungi ATM CIMB Niaga.",
        "Pilih menu 'Transfer' kemudian pilih 'Virtual Account'.",
        `Masukkan nomor Virtual Account CIMB Niaga: ${va}`,
        `Konfirmasi nominal transfer (${amountStr}) dan informasi tagihan Anda.`,
        "Masukkan PIN OCTO Mobile atau PIN ATM untuk verifikasi pembayaran."
      ]
    case "DANAMON":
      return [
        "Buka D-Bank PRO atau kunjungi ATM Danamon.",
        "Pilih menu 'Transfer' kemudian pilih 'Virtual Account'.",
        `Masukkan nomor Virtual Account Danamon: ${va}`,
        `Pastikan nominal transfer (${amountStr}) dan detail tagihan Anda sesuai.`,
        "Selesaikan transaksi dengan PIN m-Banking / PIN ATM."
      ]
    case "BNC":
      return [
        "Buka aplikasi neobank atau kunjungi ATM Bank Neo Commerce.",
        "Pilih menu 'Pembayaran Virtual Account'.",
        `Masukkan nomor Virtual Account Neo (BNC): ${va}`,
        `Pastikan jumlah pembayaran (${amountStr}) dan nama tagihan Anda sesuai.`,
        "Masukkan PIN transaksi neobank Anda untuk menyelesaikan pembayaran."
      ]
    default:
      return [
        "Lakukan transfer ke bank tujuan melalui aplikasi M-Banking atau ATM.",
        "Pilih opsi Transfer ke Virtual Account.",
        `Masukkan nomor Virtual Account: ${va}`,
        `Gunakan nominal transfer tepat sebesar ${amountStr}.`,
        "Simpan struk / bukti transfer sebagai referensi pembayaran."
      ]
  }
}

function BankPaymentContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const orderId   = searchParams.get("orderId")
  const planParam = searchParams.get("plan")
  const bankParam = searchParams.get("bank") // e.g. BCAVA

  const [plan, setPlan]                   = useState<PlanKey>("premium")
  const [paymentData, setPaymentData]   = useState<PaymentData | null>(null)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [timeLeft, setTimeLeft]         = useState(86400)
  const [copiedVa, setCopiedVa]         = useState(false)
  const [copiedAmt, setCopiedAmt]       = useState(false)
  const [copiedRef, setCopiedRef]       = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "success" | "expired">("pending")

  /* ── Load order ──────────────────────────────────────────── */
  useEffect(() => {
    let isMounted = true
    const token   = tokenManager.getToken()
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (token) headers["Authorization"] = "Bearer " + token

    const resolveTime = (expiredAt: number | null) => {
      if (!expiredAt) return 86400
      const diff = Math.floor((expiredAt * 1000 - Date.now()) / 1000)
      return diff > 0 ? diff : 0
    }

    const load = async () => {
      try {
        if (orderId) {
          const res  = await fetch(`${BASE_API}/v1/payment/bank/order?ref_id=${orderId}`, { headers, credentials: "include" })
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
        } else {
          const selectedPlan = (["premium", "pro"].includes(planParam || "") ? planParam : "premium") as PlanKey
          const selectedBank = bankParam || "BCAVA"
          setPlan(selectedPlan)

          const res  = await fetch(`${BASE_API}/v1/payment/bank/create-order`, {
            method: "POST", headers, credentials: "include",
            body: JSON.stringify({ plan: selectedPlan, bank: selectedBank }),
          })
          if (res.status === 401) { if (isMounted) router.push("/login"); return }
          const json = await res.json()
          if (!isMounted) return
          if (!res.ok || !json.success) throw new Error(json.detail || json.error || "Failed to create order")

          setPaymentData(json.data)
          setTimeLeft(resolveTime(json.data.expired_at))
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
  }, [orderId, planParam, bankParam, router])

  /* ── Poll status every 5 s ───────────────────────────────── */
  useEffect(() => {
    if (!paymentData || paymentStatus !== "pending") return
    const poll = async () => {
      const token   = tokenManager.getToken()
      const headers: Record<string, string> = {}
      if (token) headers["Authorization"] = "Bearer " + token
      try {
        const r = await fetch(`${BASE_API}/v1/payment/bank/status?ref_id=${paymentData.ref_id}`, { headers, credentials: "include" })
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

  const handleCopyRef = useCallback(() => {
    if (!paymentData) return
    navigator.clipboard.writeText(paymentData.ref_id)
    setCopiedRef(true)
    setTimeout(() => setCopiedRef(false), 2000)
  }, [paymentData])

  const handleCopyVa = useCallback(() => {
    if (!paymentData?.va_number) return
    navigator.clipboard.writeText(paymentData.va_number)
    setCopiedVa(true)
    setTimeout(() => setCopiedVa(false), 2000)
  }, [paymentData])

  const handleCopyAmt = useCallback(() => {
    if (!paymentData) return
    navigator.clipboard.writeText(String(paymentData.total_bayar ?? paymentData.amount_idr))
    setCopiedAmt(true)
    setTimeout(() => setCopiedAmt(false), 2000)
  }, [paymentData])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
        <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest">Loading order details...</span>
      </div>
    )
  }

  if (error || !paymentData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 max-w-sm mx-auto text-center">
        <div className="p-3 rounded-full bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-1">Gagal Memuat Transaksi</h3>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{error || "Terjadi kesalahan yang tidak diketahui saat memuat detail pembayaran."}</p>
        </div>
        <Link href={`/portal/payment?plan=${plan}`}
          className="px-4 py-2 bg-primary text-primary-foreground text-[11px] font-bold rounded-lg hover:opacity-90 transition-opacity">
          Coba Lagi
        </Link>
      </div>
    )
  }

  const displayPrice = paymentData.total_bayar ?? paymentData.amount_idr
  const basePrice    = paymentData.amount_idr
  const hasGatewayFee = displayPrice !== basePrice

  return (
    <div className="space-y-3 max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-row items-center justify-between border-b border-border pb-2.5 gap-2">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="p-1.5 rounded-md hover:bg-accent/40 text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-lg font-black tracking-tight text-foreground uppercase">Virtual Account Payment</h1>
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

      {/* ── Main Grid ── */}
      <div className="grid gap-3 lg:grid-cols-3 items-start">

        {/* Left: VA details + actions */}
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

          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">

            {/* ── Expired state ── */}
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

            {/* ── Success state ── */}
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

            {/* ── Pending: VA Display ── */}
            {paymentStatus === "pending" && (
              <>
                {/* VA Section Header */}
                <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-primary" />
                    <span className="font-extrabold text-xs text-foreground tracking-tight uppercase">Transfer Virtual Account</span>
                  </div>
                  <span className="text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    {getBankLabel(paymentData.bank_code)}
                  </span>
                </div>

                {/* VA Display Info Box */}
                <div className="p-4 flex flex-col gap-3">
                  
                  {/* Virtual Account Number Row */}
                  <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-border bg-muted/20">
                    <span className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-widest">Nomor Virtual Account</span>
                    {paymentData.va_number ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-lg font-mono font-black text-foreground tracking-widest">{paymentData.va_number}</span>
                        <button onClick={handleCopyVa}
                          className="p-1.5 rounded-md border border-border bg-card hover:bg-accent/50 transition-colors shrink-0 cursor-pointer text-muted-foreground hover:text-foreground">
                          {copiedVa
                            ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                            : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Generating Virtual Account...</span>
                    )}
                  </div>

                  {/* Amount Row */}
                  <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-border bg-muted/20">
                    <span className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-widest">Total Nominal Transfer</span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-lg font-mono font-black text-foreground tracking-tight">{formatIDR(displayPrice)}</span>
                      <button onClick={handleCopyAmt}
                        className="p-1.5 rounded-md border border-border bg-card hover:bg-accent/50 transition-colors shrink-0 cursor-pointer text-muted-foreground hover:text-foreground">
                        {copiedAmt
                          ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                          : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <span className="text-[9px] text-red-400 font-semibold font-mono leading-none">* Pastikan mentransfer nominal pas agar otomatis terverifikasi.</span>
                  </div>

                </div>

                {/* Order ID row */}
                <div className="mx-4 mb-4 rounded-lg border border-border bg-muted/20 px-3 py-2 flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-0">
                    <span className="text-[8px] font-mono text-muted-foreground/60 uppercase tracking-wider">Order ID</span>
                    <span className="text-[11px] font-mono font-bold text-foreground truncate max-w-[240px]">{paymentData.ref_id}</span>
                  </div>
                  <button onClick={handleCopyRef} title="Salin Order ID"
                    className="p-1.5 rounded-md hover:bg-accent/50 transition-colors shrink-0 cursor-pointer">
                    {copiedRef
                      ? <Check className="h-3.5 w-3.5 text-emerald-500" />
                      : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Steps card - only when pending */}
          {paymentStatus === "pending" && paymentData.va_number && (
            <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 shadow-xs">
              <h3 className="font-extrabold text-xs text-foreground tracking-tight uppercase">Cara Bayar</h3>
              <ol className="flex flex-col gap-2.5">
                {getBankInstructions(paymentData.bank_code, paymentData.va_number, formatIDR(displayPrice)).map((step, i) => (
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

        {/* Right: Order summary */}
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 shadow-xs">
            <h3 className="font-extrabold text-xs text-foreground tracking-tight uppercase">Ringkasan</h3>

            {/* Price block */}
            <div className="rounded-lg bg-muted/30 border border-border p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-foreground">{PLAN_NAMES[plan]} Plan</span>
                <span className="text-[9px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                  {PLAN_DURATIONS[plan]}
                </span>
              </div>
              <span className="text-2xl font-mono font-black text-foreground tracking-tight">
                {formatIDR(displayPrice)}
              </span>
              {paymentData.price_usd > 0 && (
                <p className="text-[10px] text-muted-foreground font-mono">
                  ≈ ${paymentData.price_usd} USD · {new Intl.NumberFormat("id-ID").format(paymentData.usd_rate)}/USD
                </p>
              )}
            </div>

            {/* Fee breakdown */}
            <div className="flex flex-col gap-1.5 text-[11px]">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono">{formatIDR(basePrice)}</span>
              </div>
              {hasGatewayFee && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Biaya gateway</span>
                  <span className="font-mono">{formatIDR(displayPrice - basePrice)}</span>
                </div>
              )}
              <div className="h-px bg-border my-0.5" />
              <div className="flex items-center justify-between font-bold text-foreground text-[12px]">
                <span>Total Bayar</span>
                <span className="font-mono">{formatIDR(displayPrice)}</span>
              </div>
            </div>

            {/* Status pill */}
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
              {paymentStatus === "pending"  && <Zap className="w-4 h-4 text-amber-500 animate-pulse" />}
              {paymentStatus === "success"  && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              {paymentStatus === "expired"  && <AlertCircle className="w-4 h-4 text-red-500" />}
            </div>
          </div>

          {/* Secure badge */}
          <div className="rounded-xl border border-border/60 bg-muted/10 p-3 flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            <div className="flex flex-col gap-0">
              <span className="text-[10px] font-bold text-foreground">Pembayaran Aman</span>
              <span className="text-[9px] text-muted-foreground font-mono">Powered by Tokopay · SSL Encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BankPaymentPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    }>
      <BankPaymentContent />
    </Suspense>
  )
}
