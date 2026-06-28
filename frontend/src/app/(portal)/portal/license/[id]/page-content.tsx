"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import {
  Shield, Star, Crown, ArrowLeft, Copy, CheckCircle, Clock,
  Trash2, Monitor, Loader2, Calendar, Fingerprint, RotateCcw,
  AlertTriangle
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface License {
  id: string
  license_key: string
  tier: "free" | "premium" | "pro"
  status: "unused" | "active" | "revoked" | "expired"
  hwid_limit: number
  hwid: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

interface HwidDevice {
  id: string
  roblox_username: string
  roblox_id: string
  roblox_avatar: string | null
  hwid: string
  status: "active" | "inactive"
  created_at: string
  updated_at: string
  license_key?: string
}

const TIER_META: Record<string, { icon: typeof Shield; label: string; className: string; bg: string }> = {
  free: { icon: Shield, label: "Free", className: "text-muted-foreground", bg: "bg-muted/30" },
  premium: { icon: Star, label: "Premium", className: "text-amber-500", bg: "bg-amber-500/10" },
  pro: { icon: Crown, label: "Pro", className: "text-purple-500", bg: "bg-purple-500/10" },
}

function formatDate(d: string | null) {
  if (!d) return "-"
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function formatShortDate(d: string | null) {
  if (!d) return "-"
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function timeRemaining(expiresAt: string | null, _tick?: number): { text: string; color: string; percent: number } {
  void _tick
  if (!expiresAt) return { text: "Lifetime", color: "text-foreground", percent: 100 }
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return { text: "Expired", color: "text-red-500 dark:text-red-400 font-semibold", percent: 0 }
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  // Estimate percent based on 30-day or 90-day period
  const totalDays = days > 30 ? 90 : 30
  const pct = Math.min(100, Math.round((diff / (totalDays * 86400000)) * 100))
  if (days <= 2) return { text: `${days}d ${hours}h left`, color: "text-red-500 dark:text-red-400 font-semibold", percent: pct }
  if (days <= 7) return { text: `${days}d ${hours}h left`, color: "text-orange-500 dark:text-orange-400 font-semibold", percent: pct }
  return { text: `${days}d ${hours}h left`, color: "text-foreground", percent: pct }
}

function relativeTime(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "Just now"
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const days = Math.floor(hr / 24)
  if (days < 7) return `${days}d ago`
  return formatShortDate(d)
}

function statusBadge(status: string) {
  if (status === "unused") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] font-mono bg-muted/30 text-muted-foreground border-border/50"><Clock className="w-3 h-3" />Unused</span>
  if (status === "active") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] font-mono bg-emerald-500/5 text-emerald-600 dark:text-emerald-500 border-emerald-500/20"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Active</span>
  if (status === "expired") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] font-mono bg-amber-500/5 text-amber-600 dark:text-amber-500 border-amber-500/20"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Expired</span>
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] font-mono bg-red-500/5 text-red-600 dark:text-red-500 border-red-500/20"><span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />Revoked</span>
}

export default function LicenseDetailPage() {
  const params = useParams()
  const [license, setLicense] = useState<License | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [devices, setDevices] = useState<HwidDevice[]>([])
  const [tick, setTick] = useState(0)

  useEffect(() => { const i = setInterval(() => setTick((t) => t + 1), 30000); return () => clearInterval(i) }, [])

  useEffect(() => {
    if (!params.id) return
    let active = true
    Promise.resolve().then(() => {
      if (active) {
        setIsLoading(true)
        setError(null)
      }
    })
    Promise.all([
      api.get<{ status: string; data: { license: License } }>(`/v1/licenses/${params.id}`),
      api.get<{ status: string; data: { hwids: HwidDevice[] } }>(`/v1/hwid/by-license/${params.id}`),
    ])
      .then(([licRes, hwidRes]) => {
        if (active) {
          setLicense(licRes.data.license)
          setDevices(hwidRes.data.hwids || [])
        }
      })
      .catch((err) => {
        if (active) setError(err.message || "Failed to load license")
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [params.id])

  const copyKey = async (key: string) => {
    try { await navigator.clipboard.writeText(key); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }

  const [resettingDeviceId, setResettingDeviceId] = useState<string | null>(null)
  const isResettingDevice = resettingDeviceId !== null
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null)
  const [unlinkConfirmId, setUnlinkConfirmId] = useState<string | null>(null)
  const [resetConfirmId, setResetConfirmId] = useState<string | null>(null)
  const [limitWarningMessage, setLimitWarningMessage] = useState<string | null>(null)
  const [nextAvailableTime, setNextAvailableTime] = useState<string | null>(null)
  const [countdownText, setCountdownText] = useState("")

  useEffect(() => {
    if (!nextAvailableTime) return
    const updateCountdown = () => {
      const diff = new Date(nextAvailableTime).getTime() - Date.now()
      if (diff <= 0) {
        setCountdownText("")
        setNextAvailableTime(null)
        return
      }
      const days = Math.floor(diff / (24 * 3600000))
      const hours = Math.floor((diff % (24 * 3600000)) / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      
      const parts = []
      if (days > 0) parts.push(`${days}d`)
      if (hours > 0 || days > 0) parts.push(`${hours}h`)
      if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`)
      parts.push(`${seconds}s`)
      
      setCountdownText(parts.join(" "))
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [nextAvailableTime])

  const handleResetDevice = async (hwidId: string) => {
    setResettingDeviceId(hwidId)
    try {
      await api.put<{ status: string; message: string }>(`/v1/hwid/by-license/${params.id}/${hwidId}/reset`, {})
      setDevices((prev) => prev.map((d) => d.id === hwidId ? { ...d, hwid: "" } : d))
    } catch (err: unknown) {
      const apiErr = err as { message?: string; details?: { nextAvailableAt?: string } }
      const errorMsg = apiErr.message || "Failed to reset device HWID"
      setLimitWarningMessage(errorMsg)
      if (apiErr.details?.nextAvailableAt) {
        setNextAvailableTime(apiErr.details.nextAvailableAt)
      }
    } finally {
      setResettingDeviceId(null)
    }
  }

  const handleUnlinkDevice = async (hwidId: string) => {
    setUnlinkingId(hwidId)
    try {
      await api.delete(`/v1/hwid/by-license/${params.id}/${hwidId}`)
      setDevices((prev) => prev.filter((d) => d.id !== hwidId))
    } catch (err: unknown) {
      const apiErr = err as { message?: string; details?: { nextAvailableAt?: string } }
      const errorMsg = apiErr.message || "Failed to unlink device"
      setLimitWarningMessage(errorMsg)
      if (apiErr.details?.nextAvailableAt) {
        setNextAvailableTime(apiErr.details.nextAvailableAt)
      }
    } finally {
      setUnlinkingId(null)
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /><span className="ml-2 text-[11px] font-mono text-muted-foreground">Loading license...</span></div>
  }

  if (error || !license) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <p className="text-[11px] font-mono text-red-600 dark:text-red-500 mb-4">{error || "License not found"}</p>
          <Link href="/portal/license" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-[11px] font-mono rounded-lg hover:opacity-90 transition-all font-bold cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" />Back to Licenses
          </Link>
        </div>
      </div>
    )
  }

  const meta = TIER_META[license.tier] || TIER_META.free
  const Icon = meta.icon
  const remaining = timeRemaining(license.expires_at, tick)
  const deviceUsagePercent = license.hwid_limit > 0 ? Math.round((devices.length / license.hwid_limit) * 100) : 0

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      {/* Header */}
      <div className="flex flex-row items-center justify-between border-b border-border pb-2.5 gap-2">
        <div className="flex items-center gap-3">
          <Link
            href="/portal/license"
            className="p-1.5 rounded-md hover:bg-accent/40 transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-lg font-black tracking-tight text-foreground uppercase">
              License Details
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Key:{" "}
              <span className="font-mono text-foreground font-bold">{license.license_key}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge(license.status)}
          <button onClick={() => copyKey(license.license_key)}
            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-mono border border-border rounded-lg hover:bg-muted transition-colors cursor-pointer shrink-0">
            {copied ? <><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
          </button>
        </div>
      </div>

      {/* License Info Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Tier</span>
            <div className={`p-1 rounded ${meta.bg}`}>
              <Icon className={`w-3 h-3 ${meta.className}`} />
            </div>
          </div>
          <span className="text-sm font-mono font-black text-foreground tracking-tight">{meta.label}</span>
        </div>

        <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Devices</span>
            <Monitor className="w-3.5 h-3.5 text-muted-foreground/40" />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className={`text-sm font-mono font-black tracking-tight ${devices.length >= license.hwid_limit ? "text-red-500 dark:text-red-400" : "text-foreground"}`}>
              {devices.length} / {license.hwid_limit}
            </span>
            <div className="w-full bg-muted h-1 rounded-full overflow-hidden border border-border/50">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  deviceUsagePercent >= 100 ? "bg-red-500" : deviceUsagePercent >= 75 ? "bg-amber-500" : "bg-primary"
                }`}
                style={{ width: `${Math.min(100, deviceUsagePercent)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Expires</span>
            <Clock className="w-3.5 h-3.5 text-muted-foreground/40" />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className={`text-sm font-mono font-black tracking-tight ${remaining.color}`}>{remaining.text}</span>
            {license.expires_at && (
              <div className="w-full bg-muted h-1 rounded-full overflow-hidden border border-border/50">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    remaining.percent <= 10 ? "bg-red-500" : remaining.percent <= 30 ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${remaining.percent}%` }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Created</span>
            <Calendar className="w-3.5 h-3.5 text-muted-foreground/40" />
          </div>
          <span className="text-sm font-mono font-black text-foreground tracking-tight">{formatShortDate(license.created_at)}</span>
        </div>
      </div>

      {/* Key Details Card */}
      <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-3.5 h-3.5 text-primary" />
            <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider">License Information</h3>
          </div>
        </div>
        <div className="divide-y divide-border/60">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[10px] font-mono text-muted-foreground">License Key</span>
            <span className="text-[10px] font-mono font-bold text-foreground">{license.license_key}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[10px] font-mono text-muted-foreground">License ID</span>
            <span className="text-[10px] font-mono text-muted-foreground/60">{license.id}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[10px] font-mono text-muted-foreground">Expiry Date</span>
            <span className="text-[10px] font-mono font-bold text-foreground">{license.expires_at ? formatDate(license.expires_at) : "Never"}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[10px] font-mono text-muted-foreground">Last Updated</span>
            <span className="text-[10px] font-mono text-muted-foreground/60">{formatDate(license.updated_at)}</span>
          </div>
        </div>
      </div>

      {/* HWID / Devices Table */}
      <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="w-3.5 h-3.5 text-primary" />
            <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider">Linked Devices</h3>
          </div>
          <span className={`text-[9px] font-mono ${devices.length >= license.hwid_limit ? "text-red-500 dark:text-red-400 font-bold" : "text-muted-foreground"}`}>
            {devices.length} of {license.hwid_limit} used
          </span>
        </div>

        {devices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/5">
                  <th className="px-4 py-2.5 text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider font-bold">User</th>
                  <th className="px-4 py-2.5 text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider font-bold">Roblox ID</th>
                  <th className="px-4 py-2.5 text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider font-bold">HWID</th>
                  <th className="px-4 py-2.5 text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider font-bold">Time</th>
                  <th className="px-4 py-2.5 text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {devices.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/5 transition-colors group">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-muted border border-border overflow-hidden shrink-0">
                          {d.roblox_avatar ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={d.roblox_avatar} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerText = d.roblox_username.charAt(0).toUpperCase() }} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-muted-foreground">{d.roblox_username.charAt(0).toUpperCase()}</div>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-foreground">{d.roblox_username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[11px] font-mono text-muted-foreground">{d.roblox_id}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-[10px] font-mono text-muted-foreground truncate block max-w-[140px] sm:max-w-[200px]" title={d.hwid}>
                        {d.hwid || <span className="italic text-muted-foreground/45 font-normal">Not bound</span>}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[11px] font-mono text-muted-foreground whitespace-nowrap">{relativeTime(d.created_at)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button title="Reset HWID"
                          onClick={() => setResetConfirmId(d.id)}
                          disabled={isResettingDevice || !d.hwid}
                          className="p-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 rounded-md transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                          {resettingDeviceId === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                        </button>
                         <button title="Unlink Device"
                          onClick={() => setUnlinkConfirmId(d.id)}
                          disabled={unlinkingId !== null}
                          className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-md transition-all cursor-pointer disabled:opacity-50">
                          {unlinkingId === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <Monitor className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-[11px] font-mono text-muted-foreground">No devices linked yet</p>
            <p className="text-[9px] font-mono text-muted-foreground/50 mt-1">Devices are linked automatically when you execute the loader.</p>
          </div>
        )}
      </div>

      {/* Confirm Unlink Dialog */}
      <Dialog open={unlinkConfirmId !== null} onOpenChange={(open) => !open && setUnlinkConfirmId(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-red-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Trash2 className="w-4 h-4" />
              Unlink Device
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed font-mono">
              Are you sure you want to unlink this device? This action cannot be undone, and the device will no longer be bound to this license.
            </p>

            {['premium', 'pro'].includes(license.tier) && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-500">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider font-mono">Plan Limit Warning</p>
                  <p className="text-[9px] font-mono leading-relaxed">
                    As a {license.tier === 'premium' ? 'Premium' : 'Pro'} user, you can only unlink up to {license.tier === 'premium' ? 3 : 6} devices per week.
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setUnlinkConfirmId(null)}
                className="h-8 text-[10px] font-mono rounded-lg hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  const id = unlinkConfirmId
                  if (id) {
                    setUnlinkConfirmId(null)
                    await handleUnlinkDevice(id)
                  }
                }}
                className="h-8 text-[10px] font-mono rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-none font-bold cursor-pointer"
              >
                Confirm Unlink
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Reset HWID Dialog */}
      <Dialog open={resetConfirmId !== null} onOpenChange={(open) => !open && setResetConfirmId(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-amber-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" />
              Reset HWID
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed font-mono">
              Are you sure you want to reset the HWID for this device? The Roblox account will remain linked, but its HWID binding will be cleared.
            </p>
            <DialogFooter className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setResetConfirmId(null)}
                className="h-8 text-[10px] font-mono rounded-lg hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  const id = resetConfirmId
                  if (id) {
                    setResetConfirmId(null)
                    await handleResetDevice(id)
                  }
                }}
                className="h-8 text-[10px] font-mono rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-none font-bold cursor-pointer"
              >
                Confirm Reset
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Limit Reached Warning Dialog */}
      <Dialog open={limitWarningMessage !== null} onOpenChange={(open) => { if (!open) { setLimitWarningMessage(null); setCountdownText(""); setNextAvailableTime(null); } }}>
        <DialogContent className="sm:max-w-md bg-card border-border rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-amber-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Action Restricted
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed font-mono">
              {limitWarningMessage}
            </p>
            {countdownText && (
              <div className="p-3 bg-muted/30 border border-border rounded-lg text-center font-mono">
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Unlink Slot Opens In</p>
                <p className="text-lg font-black text-amber-500 tracking-wider mt-1">{countdownText}</p>
              </div>
            )}
            <DialogFooter className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => { setLimitWarningMessage(null); setCountdownText(""); setNextAvailableTime(null); }}
                className="h-8 text-[10px] font-mono rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-none font-bold cursor-pointer"
              >
                Okay
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
