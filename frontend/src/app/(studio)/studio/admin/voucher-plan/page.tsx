'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/context/auth-context'
import { ClientDate } from '@/components/ui/client-date'
import { api } from '@/lib/api'
import { format } from 'date-fns'
import { DateRange } from 'react-day-picker'
import {
  Plus, Trash2, Copy, CheckCircle, Loader2, X, ChevronDown,
  Star, Crown, Search, Ticket, Calendar as CalendarIcon
} from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface Voucher {
  id: string
  code: string
  tier: 'premium' | 'pro'
  hwid_limit: number
  duration_days: number
  max_uses: number
  uses_count: number
  discount_percent: number
  active_from: string | null
  expires_at: string | null
  created_at: string
  created_by_email?: string
}

interface VoucherResponse {
  status: string
  data: { vouchers: Voucher[] }
}

const TIER_OPTIONS = [
  { value: 'premium', label: 'Premium', icon: Star, className: 'text-amber-500' },
  { value: 'pro', label: 'Pro', icon: Crown, className: 'text-purple-500' },
]

function formatDate(dateStr: string | null): React.ReactNode {
  if (!dateStr) return '-'
  return <ClientDate date={dateStr} format="datetime" />
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div ref={ref} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === ref.current) onClose() }}>
      <div className="w-[460px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">{title}</h3>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

export default function AdminVoucherPlanPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Create Voucher dialog inputs
  const [showCreateVoucher, setShowCreateVoucher] = useState(false)
  const [voucherPlan, setVoucherPlan] = useState<'premium' | 'pro'>('premium')
  const [isVoucherPlanOpen, setIsVoucherPlanOpen] = useState(false)
  const voucherPlanRef = useRef<HTMLDivElement>(null)
  const [customCode, setCustomCode] = useState('')
  const [maxUses, setMaxUses] = useState('1')
  const [discountPercent, setDiscountPercent] = useState('0')
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [isCreating, setIsCreating] = useState(false)

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Voucher | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)

  useEffect(() => {
    if (!isVoucherPlanOpen) return
    const h = (e: MouseEvent) => { if (voucherPlanRef.current && !voucherPlanRef.current.contains(e.target as Node)) setIsVoucherPlanOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [isVoucherPlanOpen])

  useEffect(() => { Promise.resolve().then(() => setMounted(true)) }, [])

  const fetchVouchers = useCallback(async () => {
    setIsLoading(true); setLoadError(null)
    try {
      const res = await api.get<VoucherResponse>('/v1/vouchers')
      setVouchers(res.data.vouchers || [])
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setLoadError(errMsg)
    } finally { setIsLoading(false) }
  }, [])

  useEffect(() => {
    if (mounted && !authLoading && user && ['admin', 'owner'].includes(user.role)) {
      Promise.resolve().then(() => fetchVouchers())
    }
  }, [fetchVouchers, mounted, authLoading, user])

  if (authLoading || !mounted) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /><span className="ml-2 text-[11px] font-mono text-muted-foreground animate-pulse">Loading...</span></div>
  if (!user || !['admin', 'owner'].includes(user.role)) return null

  const filtered = vouchers.filter(v =>
    v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.tier.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreateVoucher = async () => {
    setIsCreating(true); setDialogError(null)
    try {
      const hwidLimit = voucherPlan === 'premium' ? 5 : 12
      const durationDays = voucherPlan === 'premium' ? 30 : 90
      
      const payload: Record<string, unknown> = {
        tier: voucherPlan,
        hwid_limit: hwidLimit,
        duration_days: durationDays,
        max_uses: parseInt(maxUses) || 1,
        discount_percent: parseInt(discountPercent) || 0,
      }

      if (customCode.trim()) {
        payload.code = customCode.trim().toUpperCase()
      }

      if (dateRange?.from) {
        payload.active_from = dateRange.from.toISOString()
      }

      if (dateRange?.to) {
        const toDate = new Date(dateRange.to)
        toDate.setUTCHours(23, 59, 59, 999)
        payload.expires_at = toDate.toISOString()
      }

      const res = await api.post<{ data: { voucher: Voucher } }>('/v1/vouchers', payload)
      setVouchers(prev => [res.data.voucher, ...prev])
      setShowCreateVoucher(false)
      // Reset inputs
      setCustomCode('')
      setMaxUses('1')
      setDiscountPercent('0')
      setDateRange(undefined)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setDialogError(errMsg)
    } finally { setIsCreating(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true); setDialogError(null)
    try {
      await api.delete(`/v1/vouchers/${deleteTarget.id}`)
      setVouchers(prev => prev.filter(v => v.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setDialogError(errMsg)
    } finally { setIsDeleting(false) }
  }

  const copyCode = async (code: string, id: string) => {
    try { await navigator.clipboard.writeText(code); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000) } catch {}
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3 select-none">
        <div>
          <h1 className="text-lg font-black tracking-tight text-foreground uppercase">Voucher Plans</h1>
          <p className="text-[11px] text-muted-foreground">Manage multi-use plan vouchers with custom codes, limit caps, and active period ranges</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/45" />
          <input type="text" placeholder="Search voucher by code, plan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:border-primary/50" />
        </div>
        <button onClick={() => { setShowCreateVoucher(true); setVoucherPlan('premium'); setCustomCode(''); setMaxUses('1'); setDateRange(undefined); setDialogError(null) }}
          className="px-5 py-2.5 bg-primary text-primary-foreground text-[11px] font-mono rounded-lg hover:opacity-90 active:scale-98 transition-all font-bold cursor-pointer flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /><span>Generate Voucher</span>
        </button>
      </div>

      {isLoading && <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /><span className="ml-2 text-[11px] font-mono text-muted-foreground">Loading vouchers...</span></div>}

      {loadError && !isLoading && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-8 text-center">
          <p className="text-[11px] font-mono text-red-600 dark:text-red-500 mb-4">{loadError}</p>
          <button onClick={fetchVouchers} className="px-4 py-2 bg-primary text-primary-foreground text-[11px] font-mono rounded-lg hover:opacity-90 transition-all font-bold cursor-pointer">Retry</button>
        </div>
      )}

      {!isLoading && !loadError && (
        <div className="rounded-xl border border-border bg-card overflow-x-auto shadow-xs w-full">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-muted/10 border-b border-border">
              <tr>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Code</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Plan</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">HWID</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Duration</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Discount</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Claims (Uses)</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Active Period (Range)</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Created</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((v) => {
                const tier = TIER_OPTIONS.find(t => t.value === v.tier)
                const TIcon = tier?.icon
                const isNotYetActive = v.active_from ? new Date(v.active_from) > new Date() : false
                const isExpired = v.expires_at ? new Date(v.expires_at) < new Date() : false
                const isFullyClaimed = v.uses_count >= v.max_uses
                const _isActive = !isNotYetActive && !isExpired && !isFullyClaimed

                return (
                  <tr key={v.id} className="hover:bg-muted/5 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Ticket className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="text-xs font-mono font-bold text-foreground tracking-wider">{v.code}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] font-mono ${tier?.className || ''} bg-muted/20 border-border/40`}>
                        {TIcon && <TIcon className="w-3.5 h-3.5" />}{tier?.label || v.tier}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono text-foreground">{v.hwid_limit} device{v.hwid_limit > 1 ? 's' : ''}</td>
                    <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground">{v.duration_days > 0 ? `${v.duration_days} days` : '∞'}</td>
                    <td className="px-5 py-3.5 text-xs font-mono text-foreground font-bold">{v.discount_percent}%</td>
                    <td className="px-5 py-3.5 font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-bold">{v.uses_count}</span>
                        <span className="text-muted-foreground/50">/</span>
                        <span className="text-muted-foreground">{v.max_uses}</span>
                        {isFullyClaimed ? (
                          <span className="px-1.5 py-0.5 rounded-xs border text-[8px] bg-red-500/5 text-red-500 border-red-500/20 font-sans">Maxed</span>
                        ) : isNotYetActive ? (
                          <span className="px-1.5 py-0.5 rounded-xs border text-[8px] bg-amber-500/5 text-amber-500 border-amber-500/20 font-sans">Scheduled</span>
                        ) : isExpired ? (
                          <span className="px-1.5 py-0.5 rounded-xs border text-[8px] bg-red-500/5 text-red-500 border-red-500/20 font-sans">Expired</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-xs border text-[8px] bg-emerald-500/5 text-emerald-500 border-emerald-500/20 font-sans">Active</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono">
                      {v.active_from || v.expires_at ? (
                        <div className="flex flex-col gap-0.5">
                          {v.active_from && (
                            <span className={isNotYetActive ? "text-amber-500/90" : "text-emerald-500/70"}>
                              From: {formatDate(v.active_from)}
                            </span>
                          )}
                          {v.expires_at && (
                            <span className={isExpired ? "text-red-500/70 line-through" : "text-muted-foreground"}>
                              To: {formatDate(v.expires_at)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/30">Always Active</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground">
                      <div className="flex flex-col">
                        <span>{formatDate(v.created_at)}</span>
                        {v.created_by_email && <span className="text-[10px] text-muted-foreground/50 font-sans">{v.created_by_email}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button title="Copy Code" onClick={() => copyCode(v.code, v.id)}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all cursor-pointer">
                          {copiedId === v.id ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        {v.uses_count === 0 && (
                          <button title="Delete" onClick={() => { setDeleteTarget(v); setDialogError(null) }}
                             className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-md transition-all cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-5 py-8 text-center text-xs font-mono text-muted-foreground">{searchTerm ? `No vouchers matching "${searchTerm}"` : 'No vouchers generated yet'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Voucher Dialog */}
      <Modal open={showCreateVoucher} onClose={() => { if (!isCreating) setShowCreateVoucher(false) }} title="Generate Plan Voucher">
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#0B0B0C] border border-border">
            <Crown className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground">Generate Plan Voucher</p>
              <p className="text-[10px] text-muted-foreground font-mono">Create a custom or auto-generated subscription voucher</p>
            </div>
          </div>

          {/* Plan Picker */}
          <div>
            <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 font-bold select-none">Pilih Plan</label>
            <div className="relative" ref={voucherPlanRef}>
              <button type="button" onClick={() => setIsVoucherPlanOpen(!isVoucherPlanOpen)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground cursor-pointer hover:border-primary/30 transition-colors">
                <span className="flex items-center gap-2">
                  {voucherPlan === 'premium' ? (
                    <>
                      <Star className="w-3.5 h-3.5 text-amber-500" />
                      Premium Plan
                    </>
                  ) : (
                    <>
                      <Crown className="w-3.5 h-3.5 text-purple-500" />
                      Pro Plan
                    </>
                  )}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isVoucherPlanOpen ? 'rotate-180' : ''}`} />
              </button>
              {isVoucherPlanOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                  <button type="button" onClick={() => { setVoucherPlan('premium'); setIsVoucherPlanOpen(false) }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-left transition-colors cursor-pointer ${voucherPlan === 'premium' ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-muted/60'}`}>
                    <Star className="w-3.5 h-3.5 text-amber-500" />Premium Plan (30 Hari, 5 HWID)
                  </button>
                  <button type="button" onClick={() => { setVoucherPlan('pro'); setIsVoucherPlanOpen(false) }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-left transition-colors cursor-pointer ${voucherPlan === 'pro' ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-muted/60'}`}>
                    <Crown className="w-3.5 h-3.5 text-purple-500" />Pro Plan (90 Hari, 12 HWID)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Custom Code Input */}
          <div>
            <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 font-bold select-none">
              Custom Code (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. SPECIAL99 (Leave empty for random)"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase())}
              className="w-full px-3 py-2 text-xs font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:border-primary/50"
            />
          </div>

          {/* Max Uses Input */}
          <div>
            <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 font-bold select-none">
              Max Uses (Berapa user yg bisa pake)
            </label>
            <input
              type="number"
              min="1"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:border-primary/50"
            />
          </div>

          {/* Discount Percent Input */}
          <div>
            <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 font-bold select-none">
              Discount Percent (1-100%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:border-primary/50"
            />
          </div>

          {/* Expiration Date Range Input using Shadcn Calendar & Popover */}
          <div>
            <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 font-bold select-none">
              Active Period Range (Optional)
            </label>
            <div className="relative">
              <Popover>
                <PopoverTrigger
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground cursor-pointer hover:border-primary/30 transition-colors">
                  <span className="flex items-center gap-2">
                    <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        `${format(dateRange.from, "LLL dd, yyyy")} - ${format(dateRange.to, "LLL dd, yyyy")}`
                      ) : (
                        format(dateRange.from, "LLL dd, yyyy")
                      )
                    ) : (
                      <span className="text-muted-foreground/45">Select date range...</span>
                    )}
                  </span>
                  {dateRange?.from && (
                    <span onClick={(e) => { e.stopPropagation(); setDateRange(undefined) }}
                      className="hover:text-foreground text-muted-foreground/60 p-0.5 relative z-10 block cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </span>
                  )}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border border-border bg-card shadow-xl portal-theme dark" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={1}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Locked Price/HWID Previews */}
          <div className="grid grid-cols-2 gap-3 bg-muted/20 border border-border p-3 rounded-lg text-xs font-mono">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-muted-foreground uppercase">HWID Limit</span>
              <span className="text-foreground font-bold">{voucherPlan === 'premium' ? '5 Devices' : '12 Devices'}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-muted-foreground uppercase">Masa Aktif</span>
              <span className="text-foreground font-bold">{voucherPlan === 'premium' ? '30 Days' : '90 Days'}</span>
            </div>
          </div>

          {dialogError && <div className="px-3 py-2 rounded-md bg-red-500/5 border border-red-500/20 text-[11px] font-mono text-red-600 dark:text-red-500">{dialogError}</div>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={() => setShowCreateVoucher(false)} disabled={isCreating} className="px-4 py-2 text-[11px] font-mono text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors cursor-pointer disabled:opacity-50">Cancel</button>
            <button onClick={handleCreateVoucher} disabled={isCreating}
              className="px-4 py-2 bg-primary text-primary-foreground text-[11px] font-mono rounded-lg hover:opacity-90 active:scale-98 transition-all font-bold cursor-pointer flex items-center gap-2 disabled:opacity-50">
              {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {isCreating ? 'Generating...' : 'Generate Voucher'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Dialog */}
      <Modal open={deleteTarget !== null} onClose={() => { if (!isDeleting) setDeleteTarget(null) }} title="Delete Voucher">
        {deleteTarget && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-red-500/5 border border-red-500/20">
              <Trash2 className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">Delete this plan voucher?</p>
                <p className="text-[11px] text-muted-foreground font-mono"><span className="text-foreground font-bold">{deleteTarget.code}</span> will be permanently removed.</p>
              </div>
            </div>
            {dialogError && <div className="px-3 py-2 rounded-md bg-red-500/5 border border-red-500/20 text-[11px] font-mono text-red-600 dark:text-red-500">{dialogError}</div>}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button onClick={() => setDeleteTarget(null)} disabled={isDeleting} className="px-4 py-2 text-[11px] font-mono text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors cursor-pointer disabled:opacity-50">Cancel</button>
              <button onClick={handleDelete} disabled={isDeleting} className="px-4 py-2 bg-red-600 text-white text-[11px] font-mono rounded-lg hover:bg-red-700 active:scale-98 transition-all font-bold cursor-pointer flex items-center gap-2 disabled:opacity-50">
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
