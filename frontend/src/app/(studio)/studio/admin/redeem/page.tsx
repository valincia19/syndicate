'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/context/auth-context'
import { ClientDate } from '@/components/ui/client-date'
import { api } from '@/lib/api'
import {
  Plus, Trash2, Copy, CheckCircle, Loader2, X, ChevronDown,
  Gift, Shield, Star, Crown, Clock, Search
} from 'lucide-react'

interface RedeemCode {
  id: string
  code: string
  tier: 'free' | 'premium' | 'pro'
  hwid_limit: number
  duration_days: number
  status: 'unused' | 'used'
  used_by: string | null
  used_at: string | null
  created_at: string
  created_by_email?: string
  used_by_email?: string
  used_by_name?: string
}

interface RedeemResponse {
  status: string
  data: { codes: RedeemCode[] }
}

const TIER_OPTIONS = [
  { value: 'free', label: 'Free', icon: Shield, className: 'text-muted-foreground' },
  { value: 'premium', label: 'Premium', icon: Star, className: 'text-amber-500' },
  { value: 'pro', label: 'Pro', icon: Crown, className: 'text-purple-500' },
]

function formatDate(dateStr: string | null): React.ReactNode {
  if (!dateStr) return '-'
  return <ClientDate date={dateStr} format="date" />
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

export default function AdminRedeemPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [codes, setCodes] = useState<RedeemCode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Create dialog
  const [showCreate, setShowCreate] = useState(false)
  const [newTier, setNewTier] = useState('free')
  const [newHwidLimit, setNewHwidLimit] = useState('1')
  const [newDurationDays, setNewDurationDays] = useState('7')
  const [isTierOpen, setIsTierOpen] = useState(false)
  const tierRef = useRef<HTMLDivElement>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<RedeemCode | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)

  useEffect(() => {
    if (!isTierOpen) return
    const h = (e: MouseEvent) => { if (tierRef.current && !tierRef.current.contains(e.target as Node)) setIsTierOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [isTierOpen])

  useEffect(() => { Promise.resolve().then(() => setMounted(true)) }, [])

  const fetchCodes = useCallback(async () => {
    setIsLoading(true); setLoadError(null)
    try {
      const res = await api.get<RedeemResponse>('/v1/redeem')
      setCodes(res.data.codes || [])
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setLoadError(errMsg)
    } finally { setIsLoading(false) }
  }, [])

  useEffect(() => {
    if (mounted && !authLoading && user && ['admin', 'owner'].includes(user.role)) {
      Promise.resolve().then(() => fetchCodes())
    }
  }, [fetchCodes, mounted, authLoading, user])

  if (authLoading || !mounted) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /><span className="ml-2 text-[11px] font-mono text-muted-foreground animate-pulse">Loading...</span></div>
  if (!user || !['admin', 'owner'].includes(user.role)) return null

  const filtered = codes.filter(c =>
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.tier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.status.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreate = async () => {
    setIsCreating(true); setDialogError(null)
    try {
      const res = await api.post<{ data: { code: RedeemCode } }>('/v1/redeem', {
        tier: newTier,
        hwid_limit: parseInt(newHwidLimit) || 1,
        duration_days: parseInt(newDurationDays) || 0,
      })
      setCodes(prev => [res.data.code, ...prev])
      setShowCreate(false)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setDialogError(errMsg)
    } finally { setIsCreating(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true); setDialogError(null)
    try {
      await api.delete(`/v1/redeem/${deleteTarget.id}`)
      setCodes(prev => prev.filter(c => c.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setDialogError(errMsg)
    } finally { setIsDeleting(false) }
  }

  const copyCode = async (code: string, id: string) => {
    try { await navigator.clipboard.writeText(code); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000) } catch { }
  }

  const currentTier = TIER_OPTIONS.find(t => t.value === newTier)
  const TierIcon = currentTier?.icon

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3 select-none">
        <div>
          <h1 className="text-lg font-black tracking-tight text-foreground uppercase">Redeem Codes</h1>
          <p className="text-[11px] text-muted-foreground">Single-use codes - each generates one license for one user</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/45" />
          <input type="text" placeholder="Search by code, tier, status..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:border-primary/50" />
        </div>
        <button onClick={() => { setShowCreate(true); setNewTier('free'); setNewHwidLimit('1'); setNewDurationDays('7'); setDialogError(null) }}
          className="px-5 py-2.5 bg-primary text-primary-foreground text-[11px] font-mono rounded-lg hover:opacity-90 active:scale-98 transition-all font-bold cursor-pointer flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /><span>Generate Code</span>
        </button>
      </div>

      {isLoading && <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /><span className="ml-2 text-[11px] font-mono text-muted-foreground">Loading redeem codes...</span></div>}

      {loadError && !isLoading && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-8 text-center">
          <p className="text-[11px] font-mono text-red-600 dark:text-red-500 mb-4">{loadError}</p>
          <button onClick={fetchCodes} className="px-4 py-2 bg-primary text-primary-foreground text-[11px] font-mono rounded-lg hover:opacity-90 transition-all font-bold cursor-pointer">Retry</button>
        </div>
      )}

      {!isLoading && !loadError && (
        <div className="rounded-xl border border-border bg-card overflow-x-auto shadow-xs w-full">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-muted/10 border-b border-border">
              <tr>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Code</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Tier</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">HWID</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Duration</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Status</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Claimed By</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Created</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((c) => {
                const tier = TIER_OPTIONS.find(t => t.value === c.tier)
                const TIcon = tier?.icon
                return (
                  <tr key={c.id} className="hover:bg-muted/5 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Gift className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="text-xs font-mono font-bold text-foreground tracking-wider">{c.code}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] font-mono ${tier?.className || ''} bg-muted/20 border-border/40`}>
                        {TIcon && <TIcon className="w-3 h-3" />}{tier?.label || c.tier}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono text-foreground">{c.hwid_limit} device{c.hwid_limit > 1 ? 's' : ''}</td>
                    <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground">{c.duration_days > 0 ? `${c.duration_days} days` : '∞'}</td>
                    <td className="px-5 py-3.5">
                      {c.status === 'unused' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] font-mono bg-muted/30 text-muted-foreground border-border/50">
                          <Clock className="w-3 h-3" />Unused
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] font-mono bg-blue-500/5 text-blue-600 dark:text-blue-500 border-blue-500/20">
                          <CheckCircle className="w-3 h-3" />Used
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-foreground font-medium">
                      {c.status === 'used' ? (c.used_by_email || c.used_by_name || <span className="text-muted-foreground/50">&mdash;</span>) : <span className="text-muted-foreground/50">&mdash;</span>}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground">{formatDate(c.created_at)}</td>
                    <td className="px-5 py-3.5 text-xs text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button title="Copy Code" onClick={() => copyCode(c.code, c.id)}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all cursor-pointer">
                          {copiedId === c.id ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        {c.status === 'unused' && (
                          <button title="Delete" onClick={() => { setDeleteTarget(c); setDialogError(null) }}
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
                <tr><td colSpan={8} className="px-5 py-8 text-center text-xs font-mono text-muted-foreground">{searchTerm ? `No codes matching "${searchTerm}"` : 'No redeem codes yet'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Dialog */}
      <Modal open={showCreate} onClose={() => { if (!isCreating) setShowCreate(false) }} title="Generate Redeem Code">
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <Gift className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground">XXXX-XXX-XXXX</p>
              <p className="text-[10px] text-muted-foreground font-mono">Single-use - one user, one license</p>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 font-bold select-none">Tier</label>
            <div className="relative" ref={tierRef}>
              <button type="button" onClick={() => setIsTierOpen(!isTierOpen)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground cursor-pointer hover:border-primary/30 transition-colors">
                <span className="flex items-center gap-2">
                  {TierIcon && <TierIcon className={`w-3.5 h-3.5 ${currentTier?.className}`} />}
                  {currentTier?.label || 'Free'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isTierOpen ? 'rotate-180' : ''}`} />
              </button>
              {isTierOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                  {TIER_OPTIONS.map(opt => {
                    const I = opt.icon
                    return (
                      <button key={opt.value} type="button" onClick={() => { setNewTier(opt.value); setIsTierOpen(false); const cfg = TIER_OPTIONS.find(t => t.value === opt.value); if (cfg) { setNewHwidLimit(String(cfg.value === 'free' ? 1 : cfg.value === 'premium' ? 5 : 12)); setNewDurationDays(String(cfg.value === 'free' ? 7 : cfg.value === 'premium' ? 30 : 90)) } }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-left transition-colors cursor-pointer ${newTier === opt.value ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-muted/60'}`}>
                        <I className={`w-3.5 h-3.5 ${opt.className}`} />{opt.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 font-bold select-none">HWID Limit</label>
              <input type="number" min="0" value={newHwidLimit} onChange={(e) => setNewHwidLimit(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground focus:outline-hidden focus:border-primary/50" />
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 font-bold select-none">Duration (days)</label>
              <input type="number" min="0" value={newDurationDays} onChange={(e) => setNewDurationDays(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground focus:outline-hidden focus:border-primary/50" />
            </div>
          </div>

          {dialogError && <div className="px-3 py-2 rounded-md bg-red-500/5 border border-red-500/20 text-[11px] font-mono text-red-600 dark:text-red-500">{dialogError}</div>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={() => setShowCreate(false)} disabled={isCreating} className="px-4 py-2 text-[11px] font-mono text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors cursor-pointer disabled:opacity-50">Cancel</button>
            <button onClick={handleCreate} disabled={isCreating}
              className="px-4 py-2 bg-primary text-primary-foreground text-[11px] font-mono rounded-lg hover:opacity-90 active:scale-98 transition-all font-bold cursor-pointer flex items-center gap-2 disabled:opacity-50">
              {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gift className="w-3.5 h-3.5" />}
              {isCreating ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Dialog */}
      <Modal open={deleteTarget !== null} onClose={() => { if (!isDeleting) setDeleteTarget(null) }} title="Delete Code">
        {deleteTarget && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-red-500/5 border border-red-500/20">
              <Trash2 className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">Delete this redeem code?</p>
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
