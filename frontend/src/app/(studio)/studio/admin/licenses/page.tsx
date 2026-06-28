'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { ClientDate } from '@/components/ui/client-date'
import { api } from '@/lib/api'
import {
  Search, Plus, Trash2, Copy, CheckCircle, Clock, AlertOctagon,
  Loader2, X, ChevronDown, Shield, Crown, Star, Key, Gift, ChevronLeft, ChevronRight
} from 'lucide-react'

interface License {
  id: string
  license_key: string
  user_id: string | null
  tier: 'standard' | 'premium' | 'lifetime'
  status: 'active' | 'revoked' | 'expired'
  hwid: string | null
  uses: number
  max_uses: number
  hwid_limit: number
  source: string
  expires_at: string | null
  created_at: string
  updated_at: string
  user_name?: string
  user_email?: string
  device_count?: number
}

interface LicensesResponse {
  status: string
  data: {
    licenses: License[]
    pagination?: {
      total: number
      page: number
      limit: number
      totalPages: number
    }
  }
}

const TIER_OPTIONS = [
  { value: 'free', label: 'Free', icon: Shield, className: 'text-muted-foreground', hwid: 1, durationDays: 7 },
  { value: 'premium', label: 'Premium', icon: Star, className: 'text-amber-500', hwid: 5, durationDays: 30 },
  { value: 'pro', label: 'Pro', icon: Crown, className: 'text-purple-500', hwid: 12, durationDays: 90 },
]

function formatDate(dateStr: string | null): React.ReactNode {
  if (!dateStr) return '-'
  return <ClientDate date={dateStr} format="date" />
}

// ─── Modal ───────────────────────────────────────────────
function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const overlayRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])
  if (!open) return null
  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}>
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

function TierDropdown({ value, onChange, open, setOpen, refProp }: {
  value: string; onChange: (v: string) => void; open: boolean; setOpen: (v: boolean) => void; refProp: React.RefObject<HTMLDivElement | null>
}) {
  const current = TIER_OPTIONS.find(t => t.value === value)
  const Icon = current?.icon
  return (
    <div className="relative" ref={refProp}>
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground focus:outline-hidden focus:border-primary/50 cursor-pointer hover:border-primary/30 transition-colors">
        <span className="flex items-center gap-2">
          {Icon && <Icon className={`w-3.5 h-3.5 ${current?.className}`} />}
          {current?.label || value}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {TIER_OPTIONS.map(opt => {
            const I = opt.icon
            return (
              <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false) }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-left transition-colors cursor-pointer ${value === opt.value ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-muted/60'}`}>
                <I className={`w-3.5 h-3.5 ${opt.className}`} />
                <span>{opt.label}</span>
                {value === opt.value && <CheckCircle className="w-3 h-3 ml-auto text-primary" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function AdminLicensesPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [licenses, setLicenses] = useState<License[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalLicenses, setTotalLicenses] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Create dialog
  const [showCreate, setShowCreate] = useState(false)
  const [newTier, setNewTier] = useState('free')
  const [newHwidLimit, setNewHwidLimit] = useState('1')
  const [newDurationDays, setNewDurationDays] = useState('7')
  const [isTierOpen, setIsTierOpen] = useState(false)
  const tierDropdownRef = useRef<HTMLDivElement>(null)
  const [isCreating, setIsCreating] = useState(false)

  const handleTierChange = (tier: string) => {
    setNewTier(tier)
    const cfg = TIER_OPTIONS.find(t => t.value === tier)
    if (cfg) {
      setNewHwidLimit(String(cfg.hwid))
      setNewDurationDays(String(cfg.durationDays))
    }
  }

  // Edit dialog
  const [editTarget, setEditTarget] = useState<License | null>(null)
  const [editStatus, setEditStatus] = useState('')
  const [editTier, setEditTier] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<License | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [dialogError, setDialogError] = useState<string | null>(null)

  // Tier dropdown click-outside
  useEffect(() => {
    if (!isTierOpen) return
    const handler = (e: MouseEvent) => {
      if (tierDropdownRef.current && !tierDropdownRef.current.contains(e.target as Node)) setIsTierOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isTierOpen])

  useEffect(() => { Promise.resolve().then(() => setMounted(true)) }, [])

  // Debounce search term to reset page
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchLicenses = useCallback(async () => {
    setIsLoading(true); setLoadError(null)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '20')
      if (searchTerm.trim()) params.set('search', searchTerm.trim())

      const res = await api.get<LicensesResponse>(`/v1/licenses?${params.toString()}`)
      setLicenses(res.data.licenses || [])
      if (res.data.pagination) {
        setTotalPages(res.data.pagination.totalPages)
        setTotalLicenses(res.data.pagination.total)
      } else {
        setTotalLicenses(res.data.licenses?.length || 0)
        setTotalPages(1)
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setLoadError(errMsg)
    } finally {
      setIsLoading(false)
    }
  }, [page, searchTerm])

  useEffect(() => {
    if (mounted && !authLoading && user && ['admin', 'owner'].includes(user.role)) {
      Promise.resolve().then(() => fetchLicenses())
    }
  }, [fetchLicenses, mounted, authLoading, user])

  if (authLoading || !mounted) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /><span className="ml-2 text-[11px] font-mono text-muted-foreground animate-pulse">Loading licenses...</span></div>
  }
  if (!user || !['admin', 'owner'].includes(user.role)) return null

  const _filtered = licenses.filter(l =>
    l.license_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.user_email && l.user_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    l.tier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.status.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // ── Handlers ────────────────────────────────────────────
  const handleCreate = async () => {
    setIsCreating(true); setDialogError(null)
    try {
      const res = await api.post<{ data: { license: License } }>('/v1/licenses', {
        tier: newTier,
        hwid_limit: parseInt(newHwidLimit) || 1,
        duration_days: parseInt(newDurationDays) || 0,
      })
      setLicenses(prev => [res.data.license, ...prev])
      setShowCreate(false)
      setNewTier('free')
      setNewHwidLimit('1')
      setNewDurationDays('7')
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setDialogError(errMsg)
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdate = async () => {
    if (!editTarget) return
    setIsSaving(true); setDialogError(null)
    const payload: Record<string, unknown> = {}
    if (editStatus !== editTarget.status) payload.status = editStatus
    if (editTier !== editTarget.tier) payload.tier = editTier
    if (Object.keys(payload).length === 0) { setEditTarget(null); return }
    try {
      const res = await api.patch<{ data: { license: License } }>(`/v1/licenses/${editTarget.id}`, payload)
      setLicenses(prev => prev.map(l => l.id === editTarget.id ? res.data.license : l))
      setEditTarget(null)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setDialogError(errMsg)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true); setDialogError(null)
    try {
      await api.delete(`/v1/licenses/${deleteTarget.id}`)
      setLicenses(prev => prev.filter(l => l.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setDialogError(errMsg)
    } finally {
      setIsDeleting(false)
    }
  }

  const copyKey = async (key: string, id: string) => {
    try {
      await navigator.clipboard.writeText(key)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {}
  }

  const statusBadge = (status: string) => {
    if (status === 'unused') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] font-mono bg-muted/30 text-muted-foreground border-border/50"><Clock className="w-3 h-3" />Unused</span>
    if (status === 'active') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] font-mono bg-emerald-500/5 text-emerald-600 dark:text-emerald-500 border-emerald-500/20"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Active</span>
    if (status === 'expired') return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] font-mono bg-amber-500/5 text-amber-600 dark:text-amber-500 border-amber-500/20"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Expired</span>
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] font-mono bg-red-500/5 text-red-600 dark:text-red-500 border-red-500/20"><span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />Revoked</span>
  }

  const statusOptions = [
    { value: 'unused', label: 'Unused', className: 'text-muted-foreground' },
    { value: 'active', label: 'Active', className: 'text-emerald-500' },
    { value: 'revoked', label: 'Revoked', className: 'text-red-500' },
    { value: 'expired', label: 'Expired', className: 'text-amber-500' },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3 select-none">
        <div>
          <h1 className="text-lg font-black tracking-tight text-foreground uppercase">License Management</h1>
          <p className="text-[11px] text-muted-foreground">{totalLicenses} license{totalLicenses !== 1 ? 's' : ''} in the system</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/45" />
          <input type="text" placeholder="Search by key, owner, tier, status..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:border-primary/50" />
        </div>
        <button onClick={() => { setShowCreate(true); setDialogError(null) }}
          className="px-5 py-2.5 bg-primary text-primary-foreground text-[11px] font-mono rounded-lg hover:opacity-90 active:scale-98 transition-all font-bold cursor-pointer flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /><span>Create License</span>
        </button>
      </div>

      {/* Loading */}
      {isLoading && <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /><span className="ml-2 text-[11px] font-mono text-muted-foreground">Loading licenses...</span></div>}

      {/* Error */}
      {loadError && !isLoading && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-8 text-center">
          <p className="text-[11px] font-mono text-red-600 dark:text-red-500 mb-4">{loadError}</p>
          <button onClick={fetchLicenses} className="px-4 py-2 bg-primary text-primary-foreground text-[11px] font-mono rounded-lg hover:opacity-90 transition-all font-bold cursor-pointer">Retry</button>
        </div>
      )}

      {/* Table */}
      {!isLoading && !loadError && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card overflow-x-auto shadow-xs w-full">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="bg-muted/10 border-b border-border">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">License Key</th>
                  <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Owner</th>
                  <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Tier</th>
                  <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">HWID</th>
                  <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Status</th>
                  <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Source</th>
                  <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Expires</th>
                  <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Created</th>
                  <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {licenses.map((l) => {
                  const tierOpt = TIER_OPTIONS.find(t => t.value === l.tier)
                  const TierIcon = tierOpt?.icon
                  return (
                    <tr key={l.id} className="hover:bg-muted/5 transition-colors group cursor-pointer" onClick={() => router.push(`/studio/admin/licenses/${l.id}`)}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Key className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="text-xs font-mono font-bold text-primary tracking-wider">{l.license_key}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-foreground font-medium">
                        {l.user_name || l.user_email || <span className="text-muted-foreground/50">&mdash;</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] font-mono ${tierOpt?.className || 'text-muted-foreground'} bg-muted/20 border-border/40`}>
                          {TierIcon && <TierIcon className="w-3 h-3" />}
                          {tierOpt?.label || l.tier}
                        </span>
                      </td>
                      <td className={`px-5 py-3.5 text-xs font-mono ${(l.device_count ?? 0) >= l.hwid_limit ? 'text-red-500 dark:text-red-400 font-bold' : 'text-foreground'}`}>
                        {l.hwid_limit > 0 ? `${l.device_count ?? 0} / ${l.hwid_limit}` : '-'}
                      </td>
                      <td className="px-5 py-3.5">{statusBadge(l.status)}</td>
                      <td className="px-5 py-3.5">
                        {l.source === 'redeem' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] font-mono bg-emerald-500/5 text-emerald-600 dark:text-emerald-500 border-emerald-500/20">
                            <Gift className="w-3 h-3" />Redeem
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] font-mono bg-muted/30 text-muted-foreground border-border/50">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            Admin
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground">{formatDate(l.expires_at)}</td>
                      <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground">{formatDate(l.created_at)}</td>
                      <td className="px-5 py-3.5 text-xs text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button title="Copy Key" onClick={() => copyKey(l.license_key, l.id)}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all cursor-pointer">
                            {copiedId === l.id ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button title="Edit License" onClick={() => { setEditTarget(l); setEditStatus(l.status); setEditTier(l.tier); setDialogError(null) }}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all cursor-pointer">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button title="Delete License" onClick={() => { setDeleteTarget(l); setDialogError(null) }}
                            className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-md transition-all cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {licenses.length === 0 && (
                  <tr><td colSpan={9} className="px-5 py-8 text-center text-xs font-mono text-muted-foreground">{searchTerm ? `No licenses matching "${searchTerm}"` : 'No licenses yet'}</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-2">
              <div className="text-xs font-mono text-muted-foreground">
                Page <span className="font-bold text-foreground">{page}</span> of{' '}
                <span className="font-bold text-foreground">{totalPages}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-mono font-bold text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-mono font-bold text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Create Dialog ───────────────────────────────── */}
      <Modal open={showCreate} onClose={() => { if (!isCreating) setShowCreate(false) }} title="Create License">
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/20">
            <Key className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground">SYNDICATE-XXXXXXXXXX</p>
              <p className="text-[10px] text-muted-foreground font-mono">10 random uppercase alphanumeric characters</p>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 font-bold select-none">Tier</label>
            <TierDropdown value={newTier} onChange={handleTierChange} open={isTierOpen} setOpen={setIsTierOpen} refProp={tierDropdownRef} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 font-bold select-none">HWID Limit</label>
              <input type="number" min="0" value={newHwidLimit} onChange={(e) => setNewHwidLimit(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground focus:outline-hidden focus:border-primary/50" />
              <p className="text-[8px] text-muted-foreground mt-0.5 font-mono">Number of devices allowed</p>
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 font-bold select-none">Duration (days)</label>
              <input type="number" min="0" value={newDurationDays} onChange={(e) => setNewDurationDays(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground focus:outline-hidden focus:border-primary/50" />
              <p className="text-[8px] text-muted-foreground mt-0.5 font-mono">0 = never expires</p>
            </div>
          </div>

          {dialogError && <div className="px-3 py-2 rounded-md bg-red-500/5 border border-red-500/20 text-[11px] font-mono text-red-600 dark:text-red-500">{dialogError}</div>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={() => setShowCreate(false)} disabled={isCreating} className="px-4 py-2 text-[11px] font-mono text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors cursor-pointer disabled:opacity-50">Cancel</button>
            <button onClick={handleCreate} disabled={isCreating}
              className="px-4 py-2 bg-primary text-primary-foreground text-[11px] font-mono rounded-lg hover:opacity-90 active:scale-98 transition-all font-bold cursor-pointer flex items-center gap-2 disabled:opacity-50">
              {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {isCreating ? 'Creating...' : 'Create License'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Edit Dialog ────────────────────────────────── */}
      <Modal open={editTarget !== null} onClose={() => { if (!isSaving) setEditTarget(null) }} title="Edit License">
        {editTarget && (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/20 border border-border/50">
              <Key className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs font-mono font-bold text-primary tracking-wider">{editTarget.license_key}</span>
            </div>

            <div>
              <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 font-bold select-none">Status</label>
              <div className="relative">
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full appearance-none px-3 py-2 text-xs font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground focus:outline-hidden focus:border-primary/50 cursor-pointer">
                  {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 font-bold select-none">Tier</label>
              <select value={editTier} onChange={(e) => setEditTier(e.target.value)}
                className="w-full appearance-none px-3 py-2 text-xs font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground focus:outline-hidden focus:border-primary/50 cursor-pointer">
                {TIER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="px-2.5 py-1.5 rounded bg-muted/10 border border-border/30">
                <span className="text-muted-foreground block mb-0.5">HWID Limit</span>
                <span className="text-foreground font-semibold">{editTarget.hwid_limit} device{editTarget.hwid_limit > 1 ? 's' : ''}</span>
              </div>
              <div className="px-2.5 py-1.5 rounded bg-muted/10 border border-border/30">
                <span className="text-muted-foreground block mb-0.5">Uses</span>
                <span className="text-foreground font-semibold">{editTarget.uses}{editTarget.max_uses > 0 ? ` / ${editTarget.max_uses}` : ' (unlimited)'}</span>
              </div>
              <div className="px-2.5 py-1.5 rounded bg-muted/10 border border-border/30">
                <span className="text-muted-foreground block mb-0.5">Owner</span>
                <span className="text-foreground font-semibold">{editTarget.user_email || '-'}</span>
              </div>
              <div className="px-2.5 py-1.5 rounded bg-muted/10 border border-border/30">
                <span className="text-muted-foreground block mb-0.5">Expires</span>
                <span className="text-foreground font-semibold">{formatDate(editTarget.expires_at)}</span>
              </div>
              <div className="px-2.5 py-1.5 rounded bg-muted/10 border border-border/30">
                <span className="text-muted-foreground block mb-0.5">HWID</span>
                <span className="text-foreground font-semibold font-mono text-[9px]">{editTarget.hwid || '-'}</span>
              </div>
            </div>

            {dialogError && <div className="px-3 py-2 rounded-md bg-red-500/5 border border-red-500/20 text-[11px] font-mono text-red-600 dark:text-red-500">{dialogError}</div>}

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
              <button onClick={() => setEditTarget(null)} disabled={isSaving} className="px-4 py-2 text-[11px] font-mono text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors cursor-pointer disabled:opacity-50">Cancel</button>
              <button onClick={handleUpdate} disabled={isSaving}
                className="px-4 py-2 bg-primary text-primary-foreground text-[11px] font-mono rounded-lg hover:opacity-90 active:scale-98 transition-all font-bold cursor-pointer flex items-center gap-2 disabled:opacity-50">
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Delete Dialog ──────────────────────────────── */}
      <Modal open={deleteTarget !== null} onClose={() => { if (!isDeleting) setDeleteTarget(null) }} title="Delete License">
        {deleteTarget && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-red-500/5 border border-red-500/20">
              <AlertOctagon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">Permanently delete this license?</p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  <span className="text-foreground font-bold">{deleteTarget.license_key}</span> will be removed permanently. Owners will lose access immediately.
                </p>
              </div>
            </div>
            {dialogError && <div className="px-3 py-2 rounded-md bg-red-500/5 border border-red-500/20 text-[11px] font-mono text-red-600 dark:text-red-500">{dialogError}</div>}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button onClick={() => setDeleteTarget(null)} disabled={isDeleting} className="px-4 py-2 text-[11px] font-mono text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors cursor-pointer disabled:opacity-50">Cancel</button>
              <button onClick={handleDelete} disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white text-[11px] font-mono rounded-lg hover:bg-red-700 active:scale-98 transition-all font-bold cursor-pointer flex items-center gap-2 disabled:opacity-50">
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {isDeleting ? 'Deleting...' : 'Delete License'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
