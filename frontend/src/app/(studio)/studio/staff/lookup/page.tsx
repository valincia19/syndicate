'use client'

import { useEffect, useState } from 'react'
import { redirect } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import {
  Key, Search, Loader2, AlertCircle, Shield, Crown, Star, Clock, Gift, Monitor
} from 'lucide-react'

interface License {
  id: string
  license_key: string
  tier: "free" | "premium" | "pro"
  status: "unused" | "active" | "revoked" | "expired"
  hwid_limit: number
  device_count?: number
  source: string
  user_id: string | null
  user_name?: string
  user_email?: string
  expires_at: string | null
  created_at: string
  updated_at: string
}

const TIER_META: Record<string, { icon: typeof Shield; label: string; className: string }> = {
  free: { icon: Shield, label: "Free", className: "text-muted-foreground" },
  premium: { icon: Star, label: "Premium", className: "text-amber-500" },
  pro: { icon: Crown, label: "Pro", className: "text-purple-500" },
}

function timeRemaining(expiresAt: string | null): { text: string; color: string } {
  if (!expiresAt) return { text: "Lifetime", color: "text-foreground" }
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

export default function StaffLookupPage() {
  const { user, isLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [keyLookupInput, setKeyLookupInput] = useState('')
  const [lookupResults, setLookupResults] = useState<License[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    Promise.resolve().then(() => {
      setMounted(true)
    })
  }, [])

  useEffect(() => {
    if (!isLoading && mounted) {
      if (!user || !['owner', 'admin', 'staff'].includes(user.role)) {
        redirect('/studio')
      }
    }
  }, [user, isLoading, mounted])

  const handleKeyLookup = async () => {
    const query = keyLookupInput.trim()
    if (!query) return

    setIsSearching(true)
    setSearchError(null)
    setLookupResults([])
    setHasSearched(false)

    try {
      const res = await api.get<{ status: string; data: { licenses: License[] } }>(
        `/v1/licenses/lookup?query=${encodeURIComponent(query)}`
      )
      setLookupResults(res.data.licenses || [])
      setHasSearched(true)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Search failed'
      setSearchError(errMsg)
    } finally {
      setIsSearching(false)
    }
  }

  if (isLoading || !mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground font-mono text-xs animate-pulse">Loading key lookup...</div>
      </div>
    )
  }

  if (!user || !['owner', 'admin', 'staff'].includes(user.role)) {
    return null
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-black tracking-tight text-foreground uppercase">
            Key Lookup
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Search license by license key, owner email, HWID, or license ID
          </p>
        </div>
      </div>

      {/* Key Lookup Tool */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs w-full">
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <Key className="w-4.5 h-4.5 text-primary shrink-0" />
          <div>
            <h2 className="text-xs font-mono text-foreground uppercase tracking-wider">License Verification</h2>
            <p className="text-[10px] text-muted-foreground font-mono">Verify license keys and whitelists</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Enter email, license key, HWID, or license ID..."
                value={keyLookupInput}
                onChange={(e) => setKeyLookupInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isSearching && handleKeyLookup()}
                className="w-full pl-10 pr-4 py-2.5 text-xs font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:border-primary/50"
              />
            </div>
            <button
              onClick={handleKeyLookup}
              disabled={isSearching || !keyLookupInput.trim()}
              className="px-5 py-2.5 bg-primary text-primary-foreground text-[11px] font-mono rounded-lg hover:opacity-90 active:scale-98 transition-all font-bold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isSearching && <Loader2 className="w-3 h-3 animate-spin" />}
              Lookup
            </button>
          </div>

          {searchError && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-md bg-red-500/5 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-[11px] font-mono text-red-600 dark:text-red-500">{searchError}</p>
            </div>
          )}

          {!isSearching && lookupResults.length === 0 && hasSearched && (
            <div className="p-12 text-center border border-dashed border-border rounded-xl">
              <AlertCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs font-mono text-muted-foreground">No matching licenses found</p>
            </div>
          )}

          {lookupResults.length > 0 && (
            <div className="space-y-4 pt-2">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
                Search Results ({lookupResults.length})
              </h3>
              <div className="space-y-3">
                {lookupResults.map((l) => {
                  const tierMeta = TIER_META[l.tier] || TIER_META.free
                  const TierIcon = tierMeta.icon
                  const remaining = timeRemaining(l.expires_at)
                  return (
                    <div key={l.id} className="border border-border/80 bg-card rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 shadow-xs animate-in fade-in duration-200">
                      <div className="col-span-2 md:col-span-4 lg:col-span-5 flex items-center justify-between border-b border-border/50 pb-2">
                        <span className="font-mono text-xs font-bold text-primary select-all">{l.license_key}</span>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] font-mono ${l.source === 'redeem' ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/20' : 'bg-muted/30 text-muted-foreground border-border/50'}`}>
                            {l.source === 'redeem' ? <Gift className="w-3 h-3" /> : null}
                            {l.source === 'redeem' ? 'Redeem' : 'Admin'}
                          </span>
                          {statusBadge(l.status)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-muted-foreground font-mono uppercase mb-0.5">Owner</div>
                        <div className="text-xs text-foreground font-semibold truncate" title={l.user_email || 'No email'}>
                          {l.user_name || l.user_email || '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-muted-foreground font-mono uppercase mb-0.5">Tier</div>
                        <div className="flex items-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] font-mono ${tierMeta.className} bg-muted/20 border-border/40`}>
                            <TierIcon className="w-3 h-3" />
                            {tierMeta.label}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-muted-foreground font-mono uppercase mb-0.5">Devices (Active / Max)</div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <Monitor className="w-3.5 h-3.5 text-muted-foreground/50" />
                          <span className={(l.device_count ?? 0) >= l.hwid_limit ? 'text-red-500 dark:text-red-400 font-bold' : ''}>
                            {l.device_count ?? 0} / {l.hwid_limit}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-muted-foreground font-mono uppercase mb-0.5">Expires</div>
                        <div className={`text-xs font-mono ${remaining.color}`}>{remaining.text}</div>
                      </div>
                      <div className="col-span-2 md:col-span-4 lg:col-span-1">
                        <div className="text-[9px] text-muted-foreground font-mono uppercase mb-0.5">License ID</div>
                        <div className="text-[10px] text-muted-foreground/60 font-mono select-all truncate max-w-[200px]" title={l.id}>{l.id}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
