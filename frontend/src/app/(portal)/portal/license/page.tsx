"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { api } from "@/lib/api"
import Link from "next/link"
import { useLanguage } from "@/components/providers/language-provider"
import {
  Key, Gift, Shield, Star, Crown, Loader2,
  CheckCircle, AlertCircle, Clock, X, Plus, Copy,
  ChevronRight, Monitor
} from "lucide-react"

interface License {
  id: string
  license_key: string
  tier: "free" | "premium" | "pro"
  status: "unused" | "active" | "revoked" | "expired"
  hwid_limit: number
  expires_at: string | null
  created_at: string
}

const TIER_OPTIONS = [
  { value: "all", label: "All", icon: Key, className: "text-foreground" },
  { value: "free", label: "Free", icon: Shield, className: "text-muted-foreground" },
  { value: "premium", label: "Premium", icon: Star, className: "text-amber-500" },
  { value: "pro", label: "Pro", icon: Crown, className: "text-purple-500" },
]

function formatDate(d: string | null) {
  if (!d) return "-"
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function timeRemaining(expiresAt: string | null, _tick?: number): { text: string; color: string } {
  void _tick
  if (!expiresAt) return { text: "Never", color: "text-foreground" }
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return { text: "Expired", color: "text-red-500 dark:text-red-400 font-semibold" }
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days <= 2) return { text: `${days}d ${hours}h left`, color: "text-red-500 dark:text-red-400 font-semibold" }
  if (days <= 7) return { text: `${days}d ${hours}h left`, color: "text-orange-500 dark:text-orange-400 font-semibold" }
  return { text: `${days}d ${hours}h left`, color: "text-foreground" }
}

function statusBadge(status: string) {
  if (status === "unused") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] font-mono bg-muted/30 text-muted-foreground border-border/50"><Clock className="w-3 h-3" />Unused</span>
  if (status === "active") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] font-mono bg-emerald-500/5 text-emerald-600 dark:text-emerald-500 border-emerald-500/20"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Active</span>
  if (status === "expired") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] font-mono bg-amber-500/5 text-amber-600 dark:text-amber-500 border-amber-500/20"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Expired</span>
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] font-mono bg-red-500/5 text-red-600 dark:text-red-500 border-red-500/20"><span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />Revoked</span>
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", h)
    return () => document.removeEventListener("keydown", h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div ref={ref} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === ref.current) onClose() }}>
      <div className="w-[420px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">{title}</h3>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

export default function PortalLicensePage() {
  const { t } = useLanguage()
  const tKey = (key: string) => t(key as Parameters<typeof t>[0])
  const [licenses, setLicenses] = useState<License[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [filterTier, setFilterTier] = useState("all")

  const [showRedeem, setShowRedeem] = useState(false)
  const [code, setCode] = useState("")
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  // Tick every 30s to update countdowns
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(i)
  }, [])

  const fetchLicenses = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await api.get<{ status: string; data: { licenses: License[] } }>("/v1/licenses/my")
      setLicenses(res.data.licenses || [])
    } catch {} finally { setIsLoading(false) }
  }, [])

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => {
      if (active) fetchLicenses()
    })
    return () => {
      active = false
    }
  }, [fetchLicenses])

  const handleRedeem = async () => {
    if (!code.trim()) return
    setIsRedeeming(true); setError(null); setSuccess(null)
    try {
      let success = false
      try {
        await api.post("/v1/vouchers/redeem", { code: code.trim() })
        success = true
      } catch (voucherErr: unknown) {
        const errObj = voucherErr as { statusCode?: number; message?: string }
        // If it was a 404 error (e.g. invalid voucher code), fall back to standard redeem
        if (errObj.statusCode === 404) {
          await api.post("/v1/redeem/redeem", { code: code.trim() })
          success = true
        } else {
          // Re-throw other errors (e.g. expired, max claims, etc.)
          throw errObj
        }
      }

      if (success) {
        setSuccess("License activated successfully!")
        setCode("")
        fetchLicenses()
        setTimeout(() => { setShowRedeem(false); setSuccess(null) }, 1500)
      }
    } catch (err) {
      const errorMsg = (err as { message?: string }).message || "Failed to redeem code"
      setError(errorMsg)
    } finally { setIsRedeeming(false) }
  }

  const copyKey = async (key: string, id: string) => {
    try { await navigator.clipboard.writeText(key); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000) } catch {}
  }

  const filteredLicenses = filterTier === "all" ? licenses : licenses.filter(l => l.tier === filterTier)
  const activeCount = licenses.filter(l => l.status === "active").length
  const expiredCount = licenses.filter(l => l.status === "expired" || l.status === "revoked").length

  return (
    <div className="space-y-3 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-row items-center justify-between border-b border-border pb-2.5 gap-2">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-black tracking-tight text-foreground uppercase">
            {tKey("licenseManagementTitle")}
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Total:{" "}
            <span className="font-mono text-foreground font-bold">{licenses.length}</span>
            {" "}license{licenses.length !== 1 ? "s" : ""} - Active:{" "}
            <span className="font-mono text-emerald-500 font-bold">{activeCount}</span>
          </p>
        </div>
        <button onClick={() => { setShowRedeem(true); setCode(""); setError(null); setSuccess(null) }}
          className="px-3.5 py-2 bg-primary text-primary-foreground text-[10px] font-mono rounded-lg hover:opacity-90 active:scale-98 transition-all font-bold cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap">
          <Plus className="w-3.5 h-3.5" /><span>{tKey("redeemCodeBtn")}</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-3 flex flex-col justify-between gap-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{tKey("totalLicensesCard")}</span>
            <Key className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-mono font-black text-foreground tracking-tight">{licenses.length}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Keys</span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-3 flex flex-col justify-between gap-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{tKey("activeLicensesCard")}</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              ONLINE
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-mono font-black text-foreground tracking-tight">{activeCount}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">{tKey("activeLicensesCard")}</span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-3 flex flex-col justify-between gap-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{tKey("expiredRevokedCard")}</span>
            <AlertCircle className="w-3.5 h-3.5 text-muted-foreground/50" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-mono font-black text-foreground tracking-tight">{expiredCount}</span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">{tKey("inactiveLabel")}</span>
          </div>
        </div>
      </div>

      {/* Filter + License List */}
      <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
        {/* Filter Bar */}
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {TIER_OPTIONS.map((opt) => {
              const Icon = opt.icon
              const isActive = filterTier === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => setFilterTier(opt.value)}
                  className={`px-2.5 py-1.5 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {opt.label}
                </button>
              )
            })}
          </div>
          <span className="text-[9px] font-mono text-muted-foreground">
            {filteredLicenses.length} result{filteredLicenses.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="ml-2 text-[11px] font-mono text-muted-foreground">Loading licenses...</span>
          </div>
        )}

        {/* Empty */}
        {!isLoading && filteredLicenses.length === 0 && (
          <div className="p-12 text-center">
            <Key className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-foreground mb-1">
              {filterTier === "all" ? tKey("noLicensesYet") : `No ${filterTier} licenses`}
            </h3>
            <p className="text-[11px] text-muted-foreground mb-6">
              {filterTier === "all"
                ? tKey("redeemFirstLicenseDesc")
                : "Try changing the filter to see more results."}
            </p>
            {filterTier === "all" && (
              <div className="flex items-center justify-center gap-2.5">
                <button onClick={() => { setShowRedeem(true); setCode(""); setError(null); setSuccess(null) }}
                  className="px-4 py-2 bg-primary text-primary-foreground text-[11px] font-mono rounded-lg hover:opacity-90 transition-all font-bold cursor-pointer inline-flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5" />{tKey("redeemCodeBtn")}
                </button>
                <Link href="/portal/plans"
                  className="px-4 py-2 bg-secondary text-foreground text-[11px] font-mono border border-border rounded-lg hover:bg-muted/50 transition-all font-bold cursor-pointer inline-flex items-center gap-2">
                  <Gift className="w-3.5 h-3.5" />{tKey("buyPlansBtn")}
                </Link>
              </div>
            )}
          </div>
        )}

        {/* License Items */}
        {!isLoading && filteredLicenses.length > 0 && (
          <div className="divide-y divide-border/60">
            {filteredLicenses.map((l) => {
              const tierOpt = TIER_OPTIONS.find(t => t.value === l.tier)
              const TierIcon = tierOpt?.icon
              const remaining = timeRemaining(l.expires_at, tick)
              return (
                <Link
                  key={l.id}
                  href={`/portal/license/${l.id}`}
                  className="flex items-center gap-4 px-4 py-3.5 transition-all hover:bg-muted/5 group"
                >
                  {/* Tier Icon */}
                  <div className={`p-2 rounded-lg bg-muted/30 border border-border/40 shrink-0 ${tierOpt?.className || ""}`}>
                    {TierIcon && <TierIcon className="w-4 h-4" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-mono font-bold text-foreground tracking-wider truncate">
                        {l.license_key}
                      </span>
                      <button
                        title="Copy Key"
                        onClick={(e) => { e.preventDefault(); copyKey(l.license_key, l.id) }}
                        className="p-0.5 text-muted-foreground/50 hover:text-foreground rounded transition-all cursor-pointer"
                      >
                        {copiedId === l.id ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground flex-wrap">
                      <span className={`inline-flex items-center gap-1 ${tierOpt?.className || "text-muted-foreground"}`}>
                        {tierOpt?.label || l.tier}
                      </span>
                      <span className="text-muted-foreground/30">•</span>
                      <span className="flex items-center gap-1">
                        <Monitor className="w-2.5 h-2.5" />
                        {l.hwid_limit} slot{l.hwid_limit > 1 ? "s" : ""}
                      </span>
                      <span className="text-muted-foreground/30">•</span>
                      <span className={remaining.color}>{remaining.text}</span>
                      <span className="text-muted-foreground/30">•</span>
                      <span>{formatDate(l.created_at)}</span>
                    </div>
                  </div>

                  {/* Status + Arrow */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    {statusBadge(l.status)}
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-muted-foreground/60 transition-colors" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Redeem Modal */}
      <Modal open={showRedeem} onClose={() => { if (!isRedeeming) { setShowRedeem(false); setError(null); setSuccess(null) } }} title={tKey("redeemCodeBtn")}>
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <Gift className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground">{tKey("redeemModalSub")}</p>
              <p className="text-[10px] text-muted-foreground font-mono">Format: XXXX-XXX-XXXX</p>
            </div>
          </div>

          <input
            type="text"
            placeholder="XXXX-XXX-XXXX"
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null) }}
            disabled={isRedeeming}
            className="w-full px-4 py-3 text-sm font-mono tracking-wider rounded-lg border border-border bg-muted/50 dark:bg-[#070708] text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:border-primary/50 disabled:opacity-50 text-center"
          />

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-md bg-red-500/5 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-[11px] font-mono text-red-600 dark:text-red-500">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-md bg-emerald-500/5 border border-emerald-500/20">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-500">{success}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={() => { setShowRedeem(false); setError(null); setSuccess(null) }} disabled={isRedeeming}
              className="px-4 py-2 text-[11px] font-mono text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors cursor-pointer disabled:opacity-50">{tKey("cancelBtn")}</button>
            <button onClick={handleRedeem} disabled={isRedeeming || !code.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground text-[11px] font-mono rounded-lg hover:opacity-90 active:scale-98 transition-all font-bold cursor-pointer flex items-center gap-2 disabled:opacity-50">
              {isRedeeming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gift className="w-3.5 h-3.5" />}
              {isRedeeming ? tKey("redeemingBtn") : tKey("redeemCodeBtn")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
