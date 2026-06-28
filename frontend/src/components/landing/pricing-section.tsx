"use client"

import { useEffect, useState } from "react"
import { Check, X } from "lucide-react"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/providers/language-provider"

const BASE_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface PlanData {
  price_usd: number
  original_usd: number
  price_idr: number
  original_idr: number
  duration: number
  hwid_count: number
  discount_percent: number
  label: string
  equivalents?: Record<string, { amount: number; original: number }>
}

interface PlanPricesData {
  base_currency: string
  plans: Record<string, PlanData>
}

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  ID: 'IDR', US: 'USD', GB: 'GBP', JP: 'JPY', SG: 'SGD', MY: 'MYR',
  TH: 'THB', PH: 'PHP', VN: 'VND', KR: 'KRW', CN: 'CNY', IN: 'INR',
  AU: 'AUD', CA: 'CAD', HK: 'HKD', SA: 'SAR', AE: 'AED', BR: 'BRL',
  TR: 'TRY', RU: 'RUB', MX: 'MXN',
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR',
  AT: 'EUR', IE: 'EUR', PT: 'EUR', FI: 'EUR', GR: 'EUR',
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

function formatPriceDisplay(amount: number, currencyCode: string): string {
  if (currencyCode === 'IDR') {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount)
  }
  const info = CURRENCY_SYMBOLS[currencyCode]
  const symbol = info ? info.symbol : currencyCode
  const digits = ['JPY', 'KRW', 'VND'].includes(currencyCode) ? 0 : 2
  const formatted = amount.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
  return `${symbol}${formatted}`
}

export default function PricingSection() {
  const { t, language } = useLanguage()
  const router = useRouter()

  const [pricesData, setPricesData] = useState<PlanPricesData | null>(null)
  const [detectedCurrency, setDetectedCurrency] = useState<string>('USD')

  // Auto-detect currency
  useEffect(() => {
    if (language === 'id') {
      setDetectedCurrency('IDR')
      return
    }
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
      if (isMounted) {
        setDetectedCurrency(detectUserCurrency())
      }
    }
    detectAsync()
    return () => { isMounted = false }
  }, [language])

  // Fetch live plan prices from backend
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch(`${BASE_API}/v1/currency/plans`)
        const data = await res.json()
        if (data.success) {
          setPricesData(data.data)
        }
      } catch {
        // Fallback static structure matching backend currency API
        setPricesData({
          base_currency: 'USD',
          plans: {
            premium: { price_usd: 10, original_usd: 25, price_idr: 200000, original_idr: 500000, duration: 30, hwid_count: 5, discount_percent: 60, label: 'Premium' },
            pro:     { price_usd: 30, original_usd: 75, price_idr: 600000, original_idr: 1500000, duration: 90, hwid_count: 12, discount_percent: 60, label: 'Pro' },
          },
        })
      }
    }
    fetchPrices()
  }, [])

  const freeFeatures = [
    { text: t("planFreeFeat1"), unlocked: true },
    { text: t("planFreeFeat2"), unlocked: true },
    { text: t("planFreeFeat3"), unlocked: true },
    { text: t("planFreeFeat4"), unlocked: true },
    { text: t("planFreeFeat5"), unlocked: true },
    { text: t("planFreeFeat6"), unlocked: true },
    { text: t("planFreeFeat7"), unlocked: false },
    { text: t("planFreeFeat8"), unlocked: false },
    { text: t("planFreeFeat9"), unlocked: false },
    { text: t("planFreeFeat10"), unlocked: false },
    { text: t("planFreeFeat11"), unlocked: false },
    { text: t("planFreeFeat12"), unlocked: false },
  ]

  const premiumFeatures = [
    { text: t("planPremFeat1"), unlocked: true },
    { text: t("planPremFeat2"), unlocked: true },
    { text: t("planPremFeat3"), unlocked: true },
    { text: t("planPremFeat4"), unlocked: true },
    { text: t("planPremFeat5"), unlocked: true },
    { text: t("planPremFeat6"), unlocked: true },
    { text: t("planPremFeat7"), unlocked: true },
    { text: t("planPremFeat8"), unlocked: true },
    { text: t("planPremFeat9"), unlocked: false },
    { text: t("planPremFeat10"), unlocked: false },
    { text: t("planPremFeat11"), unlocked: false },
    { text: t("planPremFeat12"), unlocked: false },
  ]

  const proFeatures = [
    { text: t("planProFeat1"), unlocked: true },
    { text: t("planProFeat2"), unlocked: true },
    { text: t("planProFeat3"), unlocked: true },
    { text: t("planProFeat4"), unlocked: true },
    { text: t("planProFeat5"), unlocked: true },
    { text: t("planProFeat6"), unlocked: true },
    { text: t("planProFeat7"), unlocked: true },
    { text: t("planProFeat8"), unlocked: true },
    { text: t("planProFeat9"), unlocked: true },
    { text: t("planProFeat10"), unlocked: true },
    { text: t("planProFeat11"), unlocked: true },
    { text: t("planProFeat12"), unlocked: true },
  ]

  // Helper to resolve dynamic price strings based on detected currency
  const getPlanPriceDisplay = (planKey: "premium" | "pro") => {
    const plan = pricesData?.plans[planKey]
    if (!plan) return { price: t(planKey === "premium" ? "planPremiumPrice" : "planProPrice"), original: t(planKey === "premium" ? "planPremiumOriginalPrice" : "planProOriginalPrice"), discount: t(planKey === "premium" ? "planPremiumDiscount" : "planProDiscount") }

    const isIDR = detectedCurrency === 'IDR'
    const priceVal = isIDR ? plan.price_idr : plan.equivalents?.[detectedCurrency]?.amount ?? plan.price_usd
    const origVal = isIDR ? plan.original_idr : plan.equivalents?.[detectedCurrency]?.original ?? plan.original_usd
    const currCode = (isIDR || plan.equivalents?.[detectedCurrency]) ? detectedCurrency : 'USD'

    return {
      price: formatPriceDisplay(priceVal, currCode),
      original: formatPriceDisplay(origVal, currCode),
      discount: `-${plan.discount_percent}%`
    }
  }

  const premPricing = getPlanPriceDisplay("premium")
  const proPricing = getPlanPriceDisplay("pro")

  return (
    <div id="pricing" className="flex w-full flex-col items-center justify-center gap-2">
      <div className="flex items-center justify-center gap-6 self-stretch px-4 py-8">
        <div className="flex w-full max-w-4xl flex-col items-center justify-start gap-3 overflow-hidden">
          <Badge variant={"secondary"}>{t("pricingBadge")}</Badge>
          <div className="flex w-full max-w-xl flex-col justify-center text-center text-xl leading-tight font-semibold tracking-tight sm:text-2xl md:text-3xl lg:text-5xl">
            {t("pricingTitle")}
          </div>
          <div className="text-muted-foreground self-stretch text-center text-sm leading-6">
            {t("pricingDesc")}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center self-stretch border-y pt-8">
        <div className="flex w-full items-start justify-center">
          {/* Left diagonal-line decoration */}
          <div className="relative w-4 self-stretch overflow-hidden sm:w-6 md:w-8 lg:w-12">
            <div 
              className="absolute inset-0 opacity-40" 
              style={{ 
                backgroundImage: "repeating-linear-gradient(-45deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 1px, transparent 1px, transparent 8px)" 
              }} 
            />
          </div>

          <div className="flex flex-1 flex-col items-center justify-center md:flex-row md:gap-6">
            {/* Free Plan */}
            <div className="flex max-w-full flex-1 flex-col items-start justify-start gap-12 self-stretch overflow-hidden border-x px-6 py-5 md:max-w-none">
              <div className="flex flex-col items-start justify-start gap-9 self-stretch">
                <div className="flex flex-col items-start justify-start gap-2 self-stretch">
                  <div className="text-lg leading-7 font-medium">{t("planFreeName")}</div>
                  <div className="text-muted-foreground w-full max-w-80 text-sm leading-5 font-normal">
                    {t("planFreeDesc")}
                  </div>
                </div>

                <div className="flex flex-col items-start justify-start gap-2 self-stretch">
                  <div className="flex flex-col items-start justify-start gap-1">
                    <div className="relative flex h-15 items-center text-5xl font-medium">
                      <span>{t("planFreePrice")}</span>
                    </div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {t("planFreeSub")}
                    </div>
                  </div>
                </div>

                <Button size={"lg"} className="w-full">
                  {t("planFreeBtn")}
                </Button>
              </div>

              <div className="flex flex-col items-start justify-start gap-2.5 self-stretch border-t pt-6">
                {freeFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-start gap-3 self-stretch"
                  >
                    <div className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                      {feature.unlocked ? (
                        <Check className="h-4 w-4 text-foreground" />
                      ) : (
                        <X className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <div
                      className={`flex-1 text-[12.5px] font-normal leading-4 ${
                        feature.unlocked
                          ? "text-foreground"
                          : "text-muted-foreground/60 line-through"
                      }`}
                    >
                      {feature.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium Plan */}
            <div className="bg-black text-white dark:bg-white dark:text-black flex max-w-full flex-1 flex-col items-start justify-start gap-12 self-stretch overflow-hidden border-x px-6 py-5 md:max-w-none">
              <div className="flex flex-col items-start justify-start gap-9 self-stretch">
                <div className="flex flex-col items-start justify-start gap-2 self-stretch">
                  <div className="flex items-center justify-between w-full">
                    <div className="text-current text-lg leading-7 font-medium">
                      {t("planPremiumName")}
                    </div>
                    <Badge className="bg-background text-foreground hover:bg-background/90 text-xs">
                      {t("badgePopular")}
                    </Badge>
                  </div>
                  <div className="text-current/60 w-full max-w-80 text-sm leading-5 font-normal">
                    {t("planPremiumDesc")}
                  </div>
                </div>

                <div className="flex flex-col items-start justify-start gap-2 self-stretch">
                  <div className="flex flex-col items-start justify-start gap-1">
                    <span className="text-current/50 text-sm font-medium line-through">
                      {premPricing.original}
                    </span>
                    <div className="flex flex-wrap items-baseline gap-2 w-full min-w-0">
                      <div className="text-current relative flex h-auto py-1 items-center text-3xl sm:text-4xl font-medium tracking-tight whitespace-nowrap">
                        <span>{premPricing.price}</span>
                      </div>
                      <span className="rounded-md bg-yellow-500/20 px-2 py-0.5 text-xs font-bold text-yellow-500 dark:bg-black dark:text-white dark:border dark:border-white/15 shrink-0">
                        {premPricing.discount}
                      </span>
                    </div>
                    <div className="text-current text-sm font-medium opacity-80">
                      {t("planPremiumSub")}
                    </div>
                  </div>
                </div>
                
                <Button size={"lg"} className="w-full bg-background text-foreground hover:bg-background/90 cursor-pointer" onClick={() => router.push("/portal/payment?plan=premium")}>
                  {t("planPremiumBtn")}
                </Button>
              </div>

              <div className="flex flex-col items-start justify-start gap-2.5 self-stretch border-t border-current/20 pt-6">
                {premiumFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-start gap-3 self-stretch"
                  >
                    <div className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                      {feature.unlocked ? (
                        <Check className="h-4 w-4 text-current" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div
                      className={`flex-1 text-[12.5px] font-normal leading-4 ${
                        feature.unlocked
                          ? "text-current"
                          : "text-current/50 line-through"
                      }`}
                    >
                      {feature.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pro Pass */}
            <div className="flex max-w-full flex-1 flex-col items-start justify-start gap-12 self-stretch overflow-hidden border-x px-6 py-5 md:max-w-none">
              <div className="flex flex-col items-start justify-start gap-9 self-stretch">
                <div className="flex flex-col items-start justify-start gap-2 self-stretch">
                  <div className="flex items-center justify-between w-full">
                    <div className="text-lg leading-7 font-medium">{t("planProName")}</div>
                    <Badge variant="secondary" className="text-xs">
                      {t("badgeBestValue")}
                    </Badge>
                  </div>
                  <div className="w-full max-w-80 text-sm leading-5 font-normal text-muted-foreground">
                    {t("planProDesc")}
                  </div>
                </div>

                <div className="flex flex-col items-start justify-start gap-2 self-stretch">
                  <div className="flex flex-col items-start justify-start gap-1">
                    <span className="text-muted-foreground/50 text-sm font-medium line-through">
                      {proPricing.original}
                    </span>
                    <div className="flex flex-wrap items-baseline gap-2 w-full min-w-0">
                      <div className="relative flex h-auto py-1 items-center text-3xl sm:text-4xl font-medium tracking-tight whitespace-nowrap">
                        <span>{proPricing.price}</span>
                      </div>
                      <span className="rounded-md bg-black/10 px-2 py-0.5 text-xs font-bold text-black border border-black/10 dark:bg-amber-500/20 dark:text-amber-400 dark:border-0 shrink-0">
                        {proPricing.discount}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {t("planProSub")}
                    </div>
                  </div>
                </div>
                <Button size={"lg"} className="w-full cursor-pointer" onClick={() => router.push("/portal/payment?plan=pro")}>
                  {t("planProBtn")}
                </Button>
              </div>

              <div className="flex flex-col items-start justify-start gap-2.5 self-stretch border-t pt-6">
                {proFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-start gap-3 self-stretch"
                  >
                    <div className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                      {feature.unlocked ? (
                        <Check className="h-4 w-4 text-foreground" />
                      ) : (
                        <X className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <div
                      className={`flex-1 text-[12.5px] font-normal leading-4 ${
                        feature.unlocked
                          ? "text-foreground"
                          : "text-muted-foreground/60 line-through"
                      }`}
                    >
                      {feature.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right diagonal-line decoration */}
          <div className="relative w-4 self-stretch overflow-hidden sm:w-6 md:w-8 lg:w-12">
            <div 
              className="absolute inset-0 opacity-40" 
              style={{ 
                backgroundImage: "repeating-linear-gradient(-45deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 1px, transparent 1px, transparent 8px)" 
              }} 
            />
          </div>
        </div>
      </div>
    </div>
  )
}
