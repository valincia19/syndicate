"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  CreditCard,
  Wallet,
  Banknote,
  QrCode,
  ShieldCheck,
  Check,
  ChevronRight,
  Zap,
  Clock,
  BadgeCheck,
  Loader2,
  Coins,
  Store,
  Gift,
  Search,
} from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"
import { api, tokenManager } from "@/lib/api"
import { PaymentLogo } from "@/components/payment/payment-logo"

const BASE_API = process.env.NEXT_PUBLIC_API_URL || ""

// Feature keys per plan (i18n)
const PLAN_FEATURES: Record<string, string[]> = {
  premium: [
    "planPremFeat1","planPremFeat2","planPremFeat3","planPremFeat4",
    "planPremFeat5","planPremFeat6","planPremFeat8",
  ],
  pro: [
    "planProFeat1","planProFeat2","planProFeat3","planProFeat4",
    "planProFeat5","planProFeat6","planProFeat7","planProFeat8",
  ],
}

const PLAN_NAME_KEYS: Record<string, string> = {
  premium: "planPremiumName",
  pro: "planProName",
}

const PLAN_SUB_KEYS: Record<string, string> = {
  premium: "planPremiumSub",
  pro: "planProSub",
}

// ─── Auto-detect currency from browser locale ────────────────────────────────
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  ID: 'IDR', US: 'USD', GB: 'GBP', JP: 'JPY', SG: 'SGD', MY: 'MYR',
  TH: 'THB', PH: 'PHP', VN: 'VND', KR: 'KRW', CN: 'CNY', IN: 'INR',
  AU: 'AUD', CA: 'CAD', HK: 'HKD', SA: 'SAR', AE: 'AED', BR: 'BRL',
  TR: 'TRY', RU: 'RUB', MX: 'MXN',
  // European countries → EUR
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
    // Fallback: try Intl timezone
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    if (tz.startsWith('Asia/Jakarta') || tz.startsWith('Asia/Makassar') || tz.startsWith('Asia/Jayapura')) return 'IDR'
    return 'USD'
  } catch {
    return 'USD'
  }
}

// Currency symbol/formatting map for display
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

interface PlanData {
  price_usd: number
  original_usd: number
  price_idr: number
  original_idr: number
  duration: number
  hwid_count: number
  discount_percent: number
  label: string
  equivalents: Record<string, { amount: number; original: number }>
}

interface PlanPricesData {
  base_currency: string
  plans: Record<string, PlanData>
}

const PAYMENT_METHODS = [
  {
    id: "crypto",
    label: "Cryptocurrency",
    icon: Coins,
    desc: "BTC, ETH, USDT, LTC",
    tag: "INSTANT",
    tagColor: "emerald",
    disabled: false,
  },
  {
    id: "card",
    label: "Credit / Debit Card",
    icon: CreditCard,
    desc: "Visa, Mastercard, AMEX",
    tag: "RECOMMENDED",
    tagColor: "primary",
    disabled: true,
  },
  {
    id: "bank",
    label: "Virtual Account",
    icon: Banknote,
    desc: "Otomatis (BCA, Mandiri, BNI, BRI, Permata, BSI, CIMB, Danamon, Neo)",
    tag: null,
    tagColor: null,
    disabled: false,
  },
  {
    id: "emoney",
    label: "E-Money",
    icon: Wallet,
    desc: "Otomatis (GoPay, ShopeePay, OVO, Dana, LinkAja, AstraPay, Virgo)",
    tag: "RECOMMENDED",
    tagColor: "primary",
    disabled: false,
  },
  {
    id: "qris",
    label: "QRIS",
    icon: QrCode,
    desc: "GoPay, OVO, Dana, ShopeePay",
    tag: "POPULAR",
    tagColor: "amber",
    disabled: false,
  },
  {
    id: "retail",
    label: "Over-the-Counter Retail",
    icon: Store,
    desc: "Alfamart, Indomaret",
    tag: null,
    tagColor: null,
    disabled: false,
  },
]

interface RenewalLicense {
  id: string
  license_key: string
  tier: "free" | "premium" | "pro"
  status: "unused" | "active" | "revoked" | "expired"
  expires_at: string | null
}

function formatIDR(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount)
}

function PaymentContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t } = useLanguage()
  // Cast helper: t() has a strict literal union key type; this lets us pass string variables safely
  const tKey = (key: string) => t(key as Parameters<typeof t>[0])
  const planParam = searchParams.get("plan") || "premium"
  const plan = ["premium", "pro"].includes(planParam) ? planParam : "premium"
  const [selected, setSelected] = useState<string | null>(null)
  const [selectedBank, setSelectedBank] = useState<string | null>(null)
  const [selectedEmoney, setSelectedEmoney] = useState<string | null>(null)
  const [selectedRetail, setSelectedRetail] = useState<string | null>(null)
  const [pricesData, setPricesData] = useState<PlanPricesData | null>(null)
  const [pricesLoading, setPricesLoading] = useState(true)
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [selectedCrypto, setSelectedCrypto] = useState<string | null>(null)
  const [cryptoCoins, setCryptoCoins] = useState<string[]>([])
  const [cryptoCoinsLoading, setCryptoCoinsLoading] = useState(false)
  const [cryptoSearchQuery, setCryptoSearchQuery] = useState("")

  const [voucherCode, setVoucherCode] = useState("")
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null)
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discount_percent: number } | null>(null)

  // Extra HWID slots (Pro plan only)
  const PRO_BASE_HWID = 12
  const PRO_MAX_HWID = 50
  const EXTRA_HWID_PRICE_USD = 0.5
  const [extraHwidSlots, setExtraHwidSlots] = useState(0)

  // License renewal validation
  const renewParam = searchParams.get("renew")
  const [renewalLicense, setRenewalLicense] = useState<RenewalLicense | null>(null)
  const [renewalError, setRenewalError] = useState<string | null>(null)
  const [checkingRenewal, setCheckingRenewal] = useState(false)

  useEffect(() => {
    let active = true
    if (!renewParam) {
      Promise.resolve().then(() => {
        if (active) {
          setRenewalLicense(null)
          setRenewalError(null)
        }
      })
      return
    }

    Promise.resolve().then(() => {
      if (active) {
        setCheckingRenewal(true)
        setRenewalError(null)
      }
    })

    api.get<{ status: string; data: { license: RenewalLicense } }>(`/v1/licenses/${renewParam}`)
      .then((res) => {
        if (!active) return
        const lic = res.data?.license
        if (!lic) {
          setRenewalError("License key not found.")
          return
        }
        // Verify tier matches plan
        if (lic.tier !== plan) {
          setRenewalError(`Plan mismatch. This license key is for ${lic.tier.toUpperCase()}, but you requested a renewal for ${plan.toUpperCase()}.`)
          return
        }
        // Verify status
        if (lic.status === 'revoked') {
          setRenewalError("This license key has been revoked and cannot be renewed.")
          return
        }
        setRenewalLicense(lic)
      })
      .catch((err) => {
        if (!active) return
        setRenewalError(err.message || "Failed to validate renewal license.")
      })
      .finally(() => {
        if (active) setCheckingRenewal(false)
      })

    return () => {
      active = false
    }
  }, [renewParam, plan])

  // Auto-detect user's local currency via IP geolocation and browser fallback
  const [detectedCurrency, setDetectedCurrency] = useState<string>('IDR')
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
      if (isMounted) {
        setDetectedCurrency(detectUserCurrency())
      }
    }
    detectAsync()
    return () => { isMounted = false }
  }, [])

  const handleApplyVoucher = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!voucherCode.trim()) return
    setIsRedeeming(true)
    setRedeemError(null)
    setRedeemSuccess(null)

    try {
      const token = tokenManager.getToken()
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (token) headers["Authorization"] = "Bearer " + token

      const res = await fetch(`${BASE_API}/v1/vouchers/validate`, {
        method: "POST",
        headers,
        body: JSON.stringify({ code: voucherCode.trim(), plan }),
      })

      const data = await res.json()

      if (res.ok && data.status === "success") {
        setAppliedVoucher({
          code: data.data.code,
          discount_percent: data.data.discount_percent,
        })
        setRedeemSuccess(`Voucher ${data.data.code} applied successfully! Discount: ${data.data.discount_percent}%`)
      } else {
        setRedeemError(data.message || data.error || "Failed to validate voucher code")
      }
    } catch {
      setRedeemError("Connection error occurred while validating voucher")
    } finally {
      setIsRedeeming(false)
    }
  }

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null)
    setVoucherCode("")
    setRedeemSuccess(null)
    setRedeemError(null)
  }

  // Fetch available crypto coins from backend based on plan and applied voucher
  useEffect(() => {
    const controller = new AbortController()

    const fetchCryptoCoins = async () => {
      setCryptoCoinsLoading(true)
      try {
        const token = tokenManager.getToken()
        const headers: Record<string, string> = { "Content-Type": "application/json" }
        if (token) headers["Authorization"] = "Bearer " + token

        const queryParams = new URLSearchParams()
        queryParams.append("plan", plan)
        if (appliedVoucher) {
          queryParams.append("voucher", appliedVoucher.code)
        }
        if (plan === 'pro' && extraHwidSlots > 0) {
          queryParams.append("extra_hwid_slots", extraHwidSlots.toString())
        }
        // Cache-busting timestamp
        queryParams.append("t", Date.now().toString())

        const res = await fetch(`${BASE_API}/v1/payment/crypto/coins?${queryParams.toString()}`, { 
          headers,
          signal: controller.signal
        })
        const data = await res.json()
        if (data.success && Array.isArray(data.data)) {
          setCryptoCoins(data.data)
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Ignore cancelled requests on spam clicks
          return
        }
        console.error("Failed to load crypto coins:", err)
      } finally {
        if (!controller.signal.aborted) {
          setCryptoCoinsLoading(false)
        }
      }
    }
    fetchCryptoCoins()

    return () => {
      controller.abort()
    }
  }, [plan, appliedVoucher, extraHwidSlots])

  const handleProceedToPayment = async () => {
    if (selected === "crypto") {
      if (!selectedCrypto) return
      setCreatingOrder(true)
      try {
        const token = tokenManager.getToken()
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = 'Bearer ' + token

        const res = await fetch(`${BASE_API}/v1/payment/crypto/create-order`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ plan, coin: selectedCrypto, voucher: appliedVoucher ? appliedVoucher.code : undefined, extra_hwid_slots: plan === 'pro' ? extraHwidSlots : undefined, renew: renewParam || undefined }),
        })

        const data = await res.json()
        if (data.success && data.data?.ref_id) {
          router.push(`/portal/payment/crypto?orderId=${data.data.ref_id}`)
        } else {
          alert(data.error || 'Failed to create crypto payment order')
        }
      } catch {
        alert('Connection error occurred while creating order')
      } finally {
        setCreatingOrder(false)
      }
    } else if (selected === "qris") {
      setCreatingOrder(true)
      try {
        const token = tokenManager.getToken()
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = 'Bearer ' + token

        const res = await fetch(`${BASE_API}/v1/payment/qris/create-order`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ plan, voucher: appliedVoucher ? appliedVoucher.code : undefined, extra_hwid_slots: plan === 'pro' ? extraHwidSlots : undefined, renew: renewParam || undefined }),
        })

        const data = await res.json()
        if (data.success && data.data?.ref_id) {
          router.push(`/portal/payment/qris?orderId=${data.data.ref_id}`)
        } else {
          alert(data.error || 'Failed to create payment order')
        }
      } catch {
        alert('Connection error occurred while creating order')
      } finally {
        setCreatingOrder(false)
      }
    } else if (selected === "bank") {
      if (!selectedBank) return
      setCreatingOrder(true)
      try {
        const token = tokenManager.getToken()
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = 'Bearer ' + token

        const res = await fetch(`${BASE_API}/v1/payment/bank/create-order`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ plan, bank: selectedBank, voucher: appliedVoucher ? appliedVoucher.code : undefined, extra_hwid_slots: plan === 'pro' ? extraHwidSlots : undefined, renew: renewParam || undefined }),
        })

        const data = await res.json()
        if (data.success && data.data?.ref_id) {
          router.push(`/portal/payment/bank?orderId=${data.data.ref_id}`)
        } else {
          alert(data.error || 'Failed to create bank payment order')
        }
      } catch {
        alert('Connection error occurred while creating order')
      } finally {
        setCreatingOrder(false)
      }
    } else if (selected === "emoney") {
      if (!selectedEmoney) return
      setCreatingOrder(true)
      try {
        const token = tokenManager.getToken()
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = 'Bearer ' + token

        const res = await fetch(`${BASE_API}/v1/payment/emoney/create-order`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ plan, emoney: selectedEmoney, voucher: appliedVoucher ? appliedVoucher.code : undefined, extra_hwid_slots: plan === 'pro' ? extraHwidSlots : undefined, renew: renewParam || undefined }),
        })

        const data = await res.json()
        if (data.success && data.data?.ref_id) {
          router.push(`/portal/payment/emoney?orderId=${data.data.ref_id}`)
        } else {
          alert(data.error || 'Failed to create e-money payment order')
        }
      } catch {
        alert('Connection error occurred while creating order')
      } finally {
        setCreatingOrder(false)
      }
    } else if (selected === "retail") {
      if (!selectedRetail) return
      setCreatingOrder(true)
      try {
        const token = tokenManager.getToken()
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = 'Bearer ' + token

        const res = await fetch(`${BASE_API}/v1/payment/retail/create-order`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ plan, retail: selectedRetail, voucher: appliedVoucher ? appliedVoucher.code : undefined, extra_hwid_slots: plan === 'pro' ? extraHwidSlots : undefined, renew: renewParam || undefined }),
        })

        const data = await res.json()
        if (data.success && data.data?.ref_id) {
          router.push(`/portal/payment/retail?orderId=${data.data.ref_id}`)
        } else {
          alert(data.error || 'Failed to create retail payment order')
        }
      } catch {
        alert('Connection error occurred while creating order')
      } finally {
        setCreatingOrder(false)
      }
    }
  }

  // Fetch live plan prices from backend (based on studio/owner/currency rate)
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch(`${BASE_API}/v1/currency/plans`)
        const data = await res.json()
        if (data.success) setPricesData(data.data)
      } catch {
        // Fallback if API unreachable
        setPricesData({
          base_currency: 'USD',
          plans: {
            premium: { price_usd: 10, original_usd: 25, price_idr: 200000, original_idr: 500000, duration: 30, hwid_count: 5, discount_percent: 60, label: 'Premium', equivalents: {} },
            pro:     { price_usd: 30, original_usd: 75, price_idr: 600000, original_idr: 1500000, duration: 90, hwid_count: 12, discount_percent: 60, label: 'Pro', equivalents: {} },
          },
        })
      } finally {
        setPricesLoading(false)
      }
    }
    fetchPrices()
  }, [])

  const planData = pricesData?.plans[plan]
  const discountPercent = appliedVoucher ? appliedVoucher.discount_percent : 0
  const extraHwidUSD = plan === 'pro' ? extraHwidSlots * EXTRA_HWID_PRICE_USD : 0
  const extraHwidIDR = planData ? Math.ceil(extraHwidUSD * (planData.price_idr / planData.price_usd)) : 0
  const baseDiscountIDR = planData ? (planData.original_idr - planData.price_idr) : 0
  const voucherDiscountIDR = planData ? Math.ceil((planData.price_idr + extraHwidIDR) * (discountPercent / 100)) : 0

  const priceIdr = planData ? Math.ceil((planData.price_idr + extraHwidIDR) * (1 - discountPercent / 100)) : 0
  const priceUsd = planData ? (planData.price_usd + extraHwidUSD) * (1 - discountPercent / 100) : 0

  // Compute detected local currency equivalent
  const localCurrencyCode = detectedCurrency
  const isLocalIDR = localCurrencyCode === 'IDR'
  const localEquiv = planData?.equivalents?.[localCurrencyCode]
  const localPrice = (localEquiv && planData && planData.price_idr > 0)
    ? (priceIdr / (planData.price_idr / localEquiv.amount))
    : null


  return (
    <div className="space-y-3 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-row items-center justify-between border-b border-border pb-2.5 gap-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-md hover:bg-accent/40 transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-lg font-black tracking-tight text-foreground uppercase">Checkout</h1>
            <p className="text-[11px] text-muted-foreground">
              Plan:{" "}
              <span className="font-mono text-foreground font-bold">{tKey(PLAN_NAME_KEYS[plan])}</span>{" "}
              - Duration:{" "}
              <span className="font-mono text-primary font-bold">{planData ? `${planData.duration} Days` : "..."}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <ShieldCheck className="h-2.5 w-2.5 mr-1" />
            SECURE
          </span>
        </div>
      </div>

      {renewParam && checkingRenewal && (
        <div className="flex flex-col items-center justify-center p-12 border border-border bg-card rounded-lg text-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-[11px] font-mono text-muted-foreground">Validating renewal license key...</p>
        </div>
      )}

      {renewParam && renewalError && (
        <div className="flex flex-col items-center justify-center p-8 border border-red-500/20 bg-red-500/5 rounded-lg text-center gap-4">
          <div className="p-3 bg-red-500/10 text-red-500 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-red-600 dark:text-red-500 font-mono uppercase">Invalid Renewal Request</h3>
            <p className="text-xs text-muted-foreground max-w-md font-mono">{renewalError}</p>
          </div>
          <button
            onClick={() => router.push('/portal/license')}
            className="px-4 py-2 bg-primary text-primary-foreground text-[11px] font-mono rounded-lg hover:opacity-90 transition-all font-bold cursor-pointer"
          >
            Back to Licenses
          </button>
        </div>
      )}

      {(!checkingRenewal && !renewalError) && (
        <>
          {renewParam && renewalLicense && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 shrink-0 mt-0.5 animate-pulse">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider font-mono">License Renewal Mode</p>
                <p className="text-[9px] font-mono leading-relaxed text-muted-foreground">
                  You are renewing license key <span className="font-bold text-foreground font-mono">{renewalLicense.license_key}</span>. The remaining duration of your current license will be preserved, and the new duration will be appended.
                </p>
              </div>
            </div>
          )}

          {/* Main Grid */}
          <div className="grid gap-3 lg:grid-cols-3 items-start">
        {/* Left: Payment Methods - mobile: tampil kedua, desktop: kiri */}
        <div className="order-last lg:order-first lg:col-span-2 flex flex-col gap-3">
          {/* Step Indicator */}
          <div className="rounded-lg border border-border bg-card p-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">1</div>
                <span className="text-[11px] font-bold text-foreground">Select Payment</span>
              </div>
              <div className="flex-1 h-px bg-border" />
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-bold border border-border">2</div>
                <span className="text-[11px] font-bold text-muted-foreground">Confirm &amp; Pay</span>
              </div>
              <div className="flex-1 h-px bg-border" />
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-bold border border-border">3</div>
                <span className="text-[11px] font-bold text-muted-foreground">Activate</span>
              </div>
            </div>
          </div>

          {/* Payment Options Card */}
          <div className="rounded-lg border border-border bg-card p-3.5 flex flex-col gap-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs text-foreground tracking-tight uppercase">Payment Method</h3>
              <span className="text-[9px] font-mono text-muted-foreground">{selected ? "1 SELECTED" : "0 SELECTED"}</span>
            </div>

             <div className="grid gap-2">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon
                const isActive = selected === method.id
                const isDisabled = method.disabled
                return (
                  <div key={method.id} className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => { if (isDisabled) return; setSelected(method.id) }}
                      className={`w-full flex items-center gap-3.5 p-3 rounded-lg border transition-all duration-200 text-left cursor-pointer group ${
                        isActive
                          ? "border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]"
                          : isDisabled
                            ? "border-border/40 bg-muted/10 opacity-40 cursor-not-allowed"
                            : "border-border bg-card hover:bg-accent/5 hover:border-primary/20"
                      }`}
                    >
                      <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isActive ? "border-primary bg-primary" : "border-muted-foreground/30"}`}>
                        {isActive && <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
                      </div>
                      <div className={`p-2 rounded-md transition-colors ${isActive ? "bg-primary/15 text-primary" : isDisabled ? "bg-muted/30 text-muted-foreground/40" : "bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 flex flex-col gap-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[12px] font-semibold ${isDisabled ? "text-muted-foreground/50" : "text-foreground"}`}>{method.label}</span>
                          {method.tag && (
                            <span className={`px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              isDisabled ? "bg-muted/30 text-muted-foreground/40 border border-border/30"
                                : method.tagColor === "emerald" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                : method.tagColor === "amber" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                : "bg-primary/10 text-primary border border-primary/20"
                            }`}>{method.tag}</span>
                          )}
                          {isDisabled && <span className="px-1 py-0.5 rounded text-[8px] font-mono text-muted-foreground/30 border border-border/20">SOON</span>}
                        </div>
                        <span className={`text-[10px] ${isDisabled ? "text-muted-foreground/30" : "text-muted-foreground"}`}>{method.desc}</span>
                      </div>
                      <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-all ${isActive ? "text-primary" : "text-muted-foreground/20 group-hover:text-muted-foreground/50"}`} />
                    </button>

                    {/* Cryptocurrency sub-selection */}
                    {method.id === "crypto" && isActive && (
                      <div className="flex flex-col gap-2 p-3 rounded-lg border border-border/50 bg-muted/20 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="text-[9px] font-mono text-muted-foreground/80 uppercase tracking-wider">
                            Pilih Aset Cryptocurrency ({cryptoCoins.filter(c => c.toLowerCase().includes(cryptoSearchQuery.toLowerCase().trim())).length}):
                          </span>
                          <div className="relative w-full sm:w-48">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/70" />
                            <input
                              type="text"
                              placeholder="Cari koin (BTC, SOL...)..."
                              value={cryptoSearchQuery}
                              onChange={(e) => setCryptoSearchQuery(e.target.value)}
                              className="w-full h-7 pl-7 pr-2 text-[10.5px] bg-background/80 border border-border/70 rounded-md focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                            />
                          </div>
                        </div>

                        {cryptoCoinsLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          </div>
                        ) : cryptoCoins.length === 0 ? (
                          <div className="flex flex-col items-center gap-1.5 py-4 text-center">
                            <span className="text-[10.5px] text-amber-500 font-bold">Harga plan di bawah batas minimum deposit cryptocurrency</span>
                            <span className="text-[9.5px] text-muted-foreground max-w-sm leading-relaxed">
                              NOWPayments mewajibkan batas deposit minimum (biasanya ~$18.80 USD). 
                              Silakan gunakan metode pembayaran E-Money, VA, atau QRIS untuk plan ini.
                            </span>
                          </div>
                        ) : (
                          () => {
                            const filtered = cryptoCoins.filter((c) =>
                              c.toLowerCase().includes(cryptoSearchQuery.toLowerCase().trim())
                            );
                            if (filtered.length === 0) {
                              return (
                                <div className="flex flex-col items-center justify-center py-6 text-center">
                                  <span className="text-[11px] font-semibold text-muted-foreground">Koin &quot;{cryptoSearchQuery}&quot; tidak ditemukan</span>
                                  <span className="text-[9.5px] text-muted-foreground/70 mt-0.5">Coba cari dengan simbol koin lain</span>
                                </div>
                              );
                            }
                            return (
                              <>
                                <style>{`
                                  .custom-scrollbar::-webkit-scrollbar { width: 6px !important; height: 6px !important; }
                                  .custom-scrollbar::-webkit-scrollbar-track { background: transparent !important; }
                                  .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2) !important; border-radius: 9999px !important; }
                                  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.4) !important; }
                                  .custom-scrollbar::-webkit-scrollbar-button { display: none !important; width: 0 !important; height: 0 !important; }
                                `}</style>
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                                {filtered.map((coinCode) => {
                                  const coinLabel = coinCode.toUpperCase();
                                  let displayLabel = coinLabel;
                                  if (coinLabel === "USDTTRC20") displayLabel = "USDT (TRC20)";
                                  else if (coinLabel === "USDTERC20") displayLabel = "USDT (ERC20)";

                                  return (
                                    <button
                                      key={coinCode}
                                      type="button"
                                      onClick={() => setSelectedCrypto(coinCode)}
                                      className={`flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-lg transition-all border cursor-pointer ${
                                        selectedCrypto === coinCode
                                          ? "bg-primary/10 border-primary ring-1 ring-primary"
                                          : "bg-card border-border hover:border-primary/40 hover:bg-accent/20"
                                      }`}
                                    >
                                      <PaymentLogo code={coinCode} label={displayLabel} size="w-9 h-9" />
                                      <span className={`text-[9px] font-bold leading-none text-center ${
                                        selectedCrypto === coinCode ? "text-primary" : "text-muted-foreground"
                                      }`}>{displayLabel}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          );
                          }
                        )()}
                      </div>
                    )}

                    {/* Bank sub-selection */}
                    {method.id === "bank" && isActive && (
                      <div className="flex flex-col gap-2 p-3 rounded-lg border border-border/50 bg-muted/20 animate-in fade-in slide-in-from-top-1 duration-200">
                        <span className="text-[9px] font-mono text-muted-foreground/80 uppercase tracking-wider">Pilih Channel Virtual Account:</span>
                        <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-9 gap-2">
                          {[
                            { id: "BCAVA",     label: "BCA" },
                            { id: "MANDIRIVA", label: "Mandiri" },
                            { id: "BNIVA",     label: "BNI" },
                            { id: "BRIVA",     label: "BRI" },
                            { id: "PERMATAVA", label: "Permata" },
                            { id: "BSIVA",     label: "BSI" },
                            { id: "CIMBVA",    label: "CIMB" },
                            { id: "DANAMONVA", label: "Danamon" },
                            { id: "BNCVA",     label: "Neo" },
                          ].map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => setSelectedBank(b.id)}
                              className={`flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-lg transition-all border cursor-pointer ${
                                selectedBank === b.id
                                  ? "bg-primary/10 border-primary ring-1 ring-primary"
                                  : "bg-card border-border hover:border-primary/40 hover:bg-accent/20"
                              }`}
                            >
                              <PaymentLogo code={b.id} label={b.label} size="w-9 h-9" />
                              <span className={`text-[9px] font-bold leading-none ${
                                selectedBank === b.id ? "text-primary" : "text-muted-foreground"
                              }`}>{b.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* E-Money sub-selection */}
                    {method.id === "emoney" && isActive && (
                      <div className="flex flex-col gap-2 p-3 rounded-lg border border-border/50 bg-muted/20 animate-in fade-in slide-in-from-top-1 duration-200">
                        <span className="text-[9px] font-mono text-muted-foreground/80 uppercase tracking-wider">Pilih Channel E-Money:</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                          {[
                            { id: "GOPAY",     label: "GoPay" },
                            { id: "SHOPEEPAY", label: "ShopeePay" },
                            { id: "OVOPUSH",   label: "OVO" },
                            { id: "DANA",      label: "DANA" },
                            { id: "LINKAJA",   label: "LinkAja" },
                            { id: "ASTRAPAY",  label: "AstraPay" },
                            { id: "VIRGO",     label: "Virgo" },
                          ].map((e) => (
                            <button
                              key={e.id}
                              type="button"
                              onClick={() => setSelectedEmoney(e.id)}
                              className={`flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-lg transition-all border cursor-pointer ${
                                selectedEmoney === e.id
                                  ? "bg-primary/10 border-primary ring-1 ring-primary"
                                  : "bg-card border-border hover:border-primary/40 hover:bg-accent/20"
                              }`}
                            >
                              <PaymentLogo code={e.id} label={e.label} size="w-9 h-9" />
                              <span className={`text-[9px] font-bold leading-none ${
                                selectedEmoney === e.id ? "text-primary" : "text-muted-foreground"
                              }`}>{e.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Retail sub-selection */}
                    {method.id === "retail" && isActive && (
                      <div className="flex flex-col gap-2 p-3 rounded-lg border border-border/50 bg-muted/20 animate-in fade-in slide-in-from-top-1 duration-200">
                        <span className="text-[9px] font-mono text-muted-foreground/80 uppercase tracking-wider">Pilih Channel Retail:</span>
                        <div className="grid grid-cols-2 gap-2 max-w-xs">
                          {[
                            { id: "ALFAMART",  label: "Alfamart" },
                            { id: "INDOMARET", label: "Indomaret" },
                          ].map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => setSelectedRetail(r.id)}
                              className={`flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-lg transition-all border cursor-pointer ${
                                selectedRetail === r.id
                                  ? "bg-primary/10 border-primary ring-1 ring-primary"
                                  : "bg-card border-border hover:border-primary/40 hover:bg-accent/20"
                              }`}
                            >
                              <PaymentLogo code={r.id} label={r.label} size="w-9 h-9" />
                              <span className={`text-[9px] font-bold leading-none ${
                                selectedRetail === r.id ? "text-primary" : "text-muted-foreground"
                              }`}>{r.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Proceed Button */}
            <button
              disabled={
                !selected ||
                (selected === "crypto" && !selectedCrypto) ||
                (selected === "bank" && !selectedBank) ||
                (selected === "emoney" && !selectedEmoney) ||
                (selected === "retail" && !selectedRetail) ||
                creatingOrder
              }
              onClick={handleProceedToPayment}
              className={`w-full py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                selected &&
                (selected !== "crypto" || selectedCrypto) &&
                (selected !== "bank" || selectedBank) &&
                (selected !== "emoney" || selectedEmoney) &&
                (selected !== "retail" || selectedRetail) &&
                !creatingOrder
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  : "bg-muted text-muted-foreground cursor-not-allowed border border-border"
              }`}
            >
              {creatingOrder ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              {creatingOrder 
                ? "Creating Order..." 
                : selected === "crypto" && !selectedCrypto
                  ? "Select a coin"
                  : selected === "bank" && !selectedBank 
                    ? "Select a bank" 
                    : selected === "emoney" && !selectedEmoney
                      ? "Select an e-wallet"
                      : selected === "retail" && !selectedRetail
                        ? "Select a retail store"
                        : selected 
                          ? "Proceed to Payment" 
                          : "Select a payment method"}
            </button>
          </div>

          {/* Trust Bar */}
          <div className="flex items-center justify-center gap-6 py-1">
            <div className="flex items-center gap-1.5 text-muted-foreground/40">
              <ShieldCheck className="h-3 w-3" />
              <span className="text-[9px] font-mono uppercase tracking-wider">256-bit SSL</span>
            </div>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1.5 text-muted-foreground/40">
              <BadgeCheck className="h-3 w-3" />
              <span className="text-[9px] font-mono uppercase tracking-wider">Verified Merchant</span>
            </div>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1.5 text-muted-foreground/40">
              <Clock className="h-3 w-3" />
              <span className="text-[9px] font-mono uppercase tracking-wider">Instant Activation</span>
            </div>
          </div>
        </div>

        {/* Right: Order Summary - mobile: tampil pertama, desktop: kanan */}
        <div className="order-first lg:order-last flex flex-col gap-3">
          {/* Order Summary Card */}
          <div className="rounded-lg border border-border bg-card p-3.5 flex flex-col gap-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs text-foreground tracking-tight uppercase">Order Summary</h3>
              {planData && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-mono bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  SAVE {planData.discount_percent}%
                </span>
              )}
            </div>

            {/* Price Block */}
            {pricesLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              </div>
            ) : planData ? (
              <>
                <div className="rounded-md bg-muted/40 dark:bg-[#0B0B0C] border border-border p-3 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-foreground">{tKey(PLAN_NAME_KEYS[plan])}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{planData.duration} Days</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-black text-foreground tracking-tight">
                      ${priceUsd.toFixed(2)} USD
                    </span>
                    {discountPercent > 0 ? (
                      <span className="text-sm font-mono text-muted-foreground/50 line-through">
                        ${planData.price_usd.toFixed(2)} USD
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {!isLocalIDR && localCurrencyCode !== 'USD' && localPrice !== null ? (
                      <span className="text-[10px] font-mono font-bold text-primary/90">
                        ≈ {formatCurrency(localPrice, localCurrencyCode)} <span className="text-muted-foreground/60 font-normal">({formatIDR(priceIdr)})</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-bold text-primary/90">
                        ≈ {formatIDR(priceIdr)}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{tKey(PLAN_SUB_KEYS[plan])}</p>
                </div>

                {/* Extra HWID Slots Widget - Pro plan only */}
                {plan === 'pro' && (
                  <div className="rounded-md bg-primary/5 border border-primary/20 p-3 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-foreground uppercase tracking-wide">Extra HWID Slots</span>
                        <span className="text-[9px] text-muted-foreground font-mono">+${EXTRA_HWID_PRICE_USD.toFixed(2)} USD / slot</span>
                      </div>
                      <span className="text-[9px] font-mono text-primary px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded">
                        Max {PRO_MAX_HWID} slots
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-0 border border-border rounded-md overflow-hidden bg-card">
                        <button
                          type="button"
                          onClick={() => setExtraHwidSlots(Math.max(0, extraHwidSlots - 1))}
                          disabled={extraHwidSlots === 0}
                          className="px-2.5 py-1.5 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed select-none"
                        >−</button>
                        <span className="px-3 py-1.5 text-[12px] font-mono font-black text-foreground border-x border-border min-w-[40px] text-center">
                          {extraHwidSlots}
                        </span>
                        <button
                          type="button"
                          onClick={() => setExtraHwidSlots(Math.min(PRO_MAX_HWID - PRO_BASE_HWID, extraHwidSlots + 1))}
                          disabled={extraHwidSlots >= PRO_MAX_HWID - PRO_BASE_HWID}
                          className="px-2.5 py-1.5 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed select-none"
                        >+</button>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-foreground">
                          {PRO_BASE_HWID + extraHwidSlots} Total Slots
                        </span>
                        {extraHwidSlots > 0 && (
                          <span className="text-[9px] text-primary font-mono">+${(extraHwidSlots * EXTRA_HWID_PRICE_USD).toFixed(2)} USD</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 mt-1">
                      <div className="relative w-full h-2 bg-secondary rounded-full overflow-hidden flex items-center group cursor-pointer border border-border/40">
                        {/* Full Progress Fill Line */}
                        <div
                          className="bg-primary h-full rounded-full transition-all duration-75"
                          style={{ width: `${((PRO_BASE_HWID + extraHwidSlots) / PRO_MAX_HWID) * 100}%` }}
                        />
                        {/* Transparent range slider overlay for drag interaction */}
                        <input
                          type="range"
                          min={0}
                          max={PRO_MAX_HWID - PRO_BASE_HWID}
                          step={1}
                          value={extraHwidSlots}
                          onChange={(e) => setExtraHwidSlots(Number(e.target.value))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                      </div>
                      <div className="flex justify-between items-center text-[8.5px] font-mono text-muted-foreground/70 px-0.5">
                        <span>{PRO_BASE_HWID} Base</span>
                        <span className="text-primary font-bold">Geser untuk tambah (+{extraHwidSlots} slots)</span>
                        <span>{PRO_MAX_HWID} Max</span>
                      </div>
                      <p className="text-[9px] text-muted-foreground/60 font-mono">
                        {PRO_BASE_HWID} base + {extraHwidSlots} extra = {PRO_BASE_HWID + extraHwidSlots}/{PRO_MAX_HWID} slots
                      </p>
                    </div>
                  </div>
                )}

                {/* Breakdown */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-mono text-foreground">{formatIDR(planData.original_idr)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Promo Discount ({planData.discount_percent}%)</span>
                    <span className="font-mono text-emerald-500">-{formatIDR(baseDiscountIDR)}</span>
                  </div>
                  {plan === 'pro' && extraHwidSlots > 0 && planData && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Extra HWID (+{extraHwidSlots} slots)</span>
                      <span className="font-mono text-foreground">+{formatIDR(extraHwidIDR)}</span>
                    </div>
                  )}
                  {appliedVoucher && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-emerald-500 font-semibold">Voucher ({appliedVoucher.code} -{appliedVoucher.discount_percent}%)</span>
                      <span className="font-mono text-emerald-500">-{formatIDR(voucherDiscountIDR)}</span>
                    </div>
                  )}
                  <div className="h-px bg-border my-0.5" />
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-bold text-foreground">Total Due</span>
                    <div className="flex flex-col items-end">
                      <span className="font-mono font-black text-foreground text-lg">{formatIDR(priceIdr)}</span>
                      {!isLocalIDR && localPrice !== null && (
                        <span className="text-[9px] font-mono text-primary/70">≈ {formatCurrency(localPrice, localCurrencyCode)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Voucher Discount Card */}
          <div className="rounded-lg border border-border bg-card p-3.5 flex flex-col gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary shrink-0" />
              <h3 className="font-extrabold text-xs text-foreground tracking-tight uppercase">Voucher Discount</h3>
            </div>
            
            <form onSubmit={handleApplyVoucher} className="flex flex-col gap-2">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Punya kode voucher diskon? Masukkan kode di bawah ini untuk mendapatkan potongan harga pada plan ini.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Kode Voucher (e.g. SPECIAL20)"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  disabled={isRedeeming || !!appliedVoucher}
                  className="flex-1 px-3 py-2 bg-[#0B0B0C] border border-border rounded-lg text-xs font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {appliedVoucher ? (
                  <button
                    type="button"
                    onClick={handleRemoveVoucher}
                    className="px-4 py-2 bg-red-600/20 text-red-500 border border-red-500/30 text-[11px] font-bold uppercase rounded-lg hover:bg-red-600/30 transition-all cursor-pointer shrink-0 flex items-center justify-center min-w-[80px]"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isRedeeming || !voucherCode.trim()}
                    className="px-4 py-2 bg-primary text-primary-foreground text-[11px] font-bold uppercase rounded-lg hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center justify-center min-w-[80px]"
                  >
                    {isRedeeming ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      "Apply"
                    )}
                  </button>
                )}
              </div>
              
              {redeemError && (
                <p className="text-[10px] text-red-500 font-mono mt-1">{redeemError}</p>
              )}
              {redeemSuccess && (
                <p className="text-[10px] text-emerald-500 font-mono mt-1">{redeemSuccess}</p>
              )}
            </form>
          </div>

          {/* Included Features Card */}
          <div className="rounded-lg border border-border bg-card p-3.5 flex flex-col gap-3 shadow-xs">
            <h3 className="font-extrabold text-xs text-foreground tracking-tight uppercase">What&apos;s Included</h3>
            <div className="flex flex-col gap-2">
              {(PLAN_FEATURES[plan] || []).map((featKey) => (
                <div key={featKey} className="flex items-start gap-2">
                  <Check className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-[10px] text-muted-foreground leading-tight">{tKey(featKey)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Info Note */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="text-[9px] text-muted-foreground/60 leading-relaxed font-mono">
              By proceeding, you agree to our Terms of Service. All payments are
              processed through encrypted channels. License keys are delivered
              instantly after payment confirmation.
            </p>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  )
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  )
}
