/* eslint-disable @next/next/no-img-element */
'use client'

import { useEffect, useState, Suspense, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { ClientDate } from '@/components/ui/client-date'
import {
  CheckCircle, Clock, Loader2, Globe, Plus,
  Tag, Eye, Trash2, Gamepad2, FileCode, Pencil, Copy, Link, AlertTriangle
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Release {
  id: string
  name: string
  description: string | null
  category: string
  version: string
  loadstring: string | null
  logo_text: string | null
  logo_gradient: string | null
  operational_status: 'Online' | 'Maintenance'
  script_type: 'free' | 'plan'
  prefix: string
  game_id: string
  game_name: string | null
  game_logo: string | null
  game_banner: string | null
  features: string[]
  status: 'draft' | 'published'
  created_at: string
  developer_name?: string
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  Universal: 'from-yellow-500/20 to-amber-600/20 text-yellow-500 border-yellow-500/30',
  Anime: 'from-purple-500/20 to-indigo-600/20 text-purple-500 border-purple-500/30',
  Shooter: 'from-rose-500/20 to-red-600/20 text-rose-500 border-rose-500/30',
  Simulator: 'from-blue-500/20 to-cyan-600/20 text-blue-500 border-blue-500/30',
  RPG: 'from-orange-500/20 to-amber-600/20 text-orange-400 border-orange-500/30',
  Tycoon: 'from-emerald-400/20 to-green-600/20 text-emerald-400 border-emerald-400/30',
}

function formatDate(d: string): React.ReactNode {
  return <ClientDate date={d} format="date" />
}

function opStatusBadge(status: string) {
  if (status === 'Online') return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border text-[8px] font-mono bg-emerald-500/5 text-emerald-600 dark:text-emerald-500 border-emerald-500/20">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
      Online
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border text-[8px] font-mono bg-amber-500/5 text-amber-600 dark:text-amber-500 border-amber-500/20">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      Maintenance
    </span>
  )
}

function publishBadge(status: string) {
  if (status === 'published') return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border text-[8px] font-mono bg-emerald-500/5 text-emerald-600 dark:text-emerald-500 border-emerald-500/20">
      <CheckCircle className="w-2.5 h-2.5" />Published
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border text-[8px] font-mono bg-amber-500/5 text-amber-600 dark:text-amber-500 border-amber-500/20">
      <Clock className="w-2.5 h-2.5" />Draft
    </span>
  )
}

function ReleasesContent() {
  const BASE_API = process.env.NEXT_PUBLIC_API_URL || ""
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [releases, setReleases] = useState<Release[]>([])
  const [isLoadingReleases, setIsLoadingReleases] = useState(true)

  // Detail modal
  const [detailRelease, setDetailRelease] = useState<Release | null>(null)
  const [copiedLoader, setCopiedLoader] = useState(false)

  // Delete confirmation modal
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)

  // Track loading states for per-card actions: { [releaseId]: 'publish' | 'unpublish' | 'delete' }
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({})

  useEffect(() => { Promise.resolve().then(() => setMounted(true)) }, [])

  const fetchReleases = useCallback(async () => {
    setIsLoadingReleases(true)
    try {
      const res = await api.get<{ status: string; data: { releases: Release[] } }>('/v1/releases')
      setReleases(res.data.releases || [])
    } catch (err) {
      console.error('Failed to fetch releases:', err)
    } finally {
      setIsLoadingReleases(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && mounted) {
      if (!user || !['owner', 'developer'].includes(user.role)) {
        router.push('/studio')
      } else {
        Promise.resolve().then(() => fetchReleases())
      }
    }
  }, [user, authLoading, mounted, router, fetchReleases])

  const handleDelete = async () => {
    if (!deleteConfirm) return
    const { id } = deleteConfirm
    setActionLoading(prev => ({ ...prev, [id]: 'delete' }))
    try {
      await api.delete(`/v1/releases/${id}`)
      setDeleteConfirm(null)
      fetchReleases()
    } catch (err) {
      console.error('Failed to delete release:', err)
    } finally {
      setActionLoading(prev => { const next = { ...prev }; delete next[id]; return next })
    }
  }

  const handlePublish = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'draft' ? 'published' : 'draft'
    const action = currentStatus === 'draft' ? 'publish' : 'unpublish'
    setActionLoading(prev => ({ ...prev, [id]: action }))
    try {
      await api.patch(`/v1/releases/${id}`, { status: newStatus })
      fetchReleases()
    } catch (err) {
      console.error('Failed to update release status:', err)
    } finally {
      setActionLoading(prev => { const next = { ...prev }; delete next[id]; return next })
    }
  }

  if (authLoading || !mounted) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      <span className="ml-2 text-[11px] font-mono text-muted-foreground animate-pulse">Loading...</span>
    </div>
  )
  if (!user || !['owner', 'developer'].includes(user.role)) return null

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3">
        <div>
          <h1 className="text-lg font-black tracking-tight text-foreground uppercase">Releases</h1>
          <p className="text-[11px] text-muted-foreground">{releases.length} release{releases.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => router.push('/studio/developer/releases/new')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-[10px] font-mono font-bold rounded-lg hover:opacity-90 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />New Release
        </button>
      </div>

      {/* Releases Grid */}
      {isLoadingReleases ? (
        <div className="p-12 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-xs font-mono text-muted-foreground animate-pulse">Loading releases...</span>
        </div>
      ) : releases.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-16 text-center">
          <div className="flex flex-col items-center gap-3">
            <Globe className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-xs font-mono text-muted-foreground">No releases yet</p>
            <button
              onClick={() => router.push('/studio/developer/releases/new')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-[10px] font-mono font-bold rounded-lg hover:opacity-90 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />Create Your First Release
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {releases.map((r) => {
            const grad = CATEGORY_GRADIENTS[r.category] || CATEGORY_GRADIENTS.Universal
            const featCount = Array.isArray(r.features) ? r.features.length : 0
            return (
              <div
                key={r.id}
                className="rounded-xl border border-border bg-card p-4 shadow-xs hover:border-primary/30 transition-all duration-300 flex flex-col gap-3 group min-w-0"
              >
                {/* Top row: game logo + name + status */}
                <div className="flex items-start gap-3 min-w-0">
                  {/* Game Logo */}
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted border border-border flex items-center justify-center">
                    {r.game_logo ? (
                    <img
                      src={r.game_logo}
                      alt={r.game_name || ''}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center font-heading text-[13px] tracking-tight`}>
                        {r.logo_text || '?'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {r.name}
                      </h3>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                        {r.version}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-mono rounded-sm bg-muted/60 text-muted-foreground border border-border/50">
                        <Tag className="w-2.5 h-2.5" />{r.category}
                      </span>
                      {r.script_type === 'plan' ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-mono rounded-sm bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>Plan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-mono rounded-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="w-2.5 h-2.5" />Free
                        </span>
                      )}
                      {opStatusBadge(r.operational_status)}
                      {publishBadge(r.status)}
                    </div>
                  </div>
                </div>

                {/* Description */}
                {r.description && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-normal font-sans">
                    {r.description}
                  </p>
                )}

                {/* Game info mini */}
                {r.game_name && (
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/20 border border-border/50">
                    {r.game_logo ? (
                      <img
                        src={r.game_logo}
                        alt=""
                        className="w-5 h-5 rounded object-cover shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <Gamepad2 className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                    )}
                    <span className="text-[10px] font-mono text-muted-foreground truncate">{r.game_name}</span>
                  </div>
                )}

                {/* Features preview + date */}
                <div className="flex items-center justify-between gap-2 mt-auto">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                    <FileCode className="w-3 h-3" />
                    <span>{featCount} feature{featCount !== 1 ? 's' : ''}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground/50">{formatDate(r.created_at)}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                  <button
                    onClick={() => router.push(`/studio/developer/releases/${r.id}`)}
                    className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-mono bg-muted/30 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-lg transition-all cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />Edit
                  </button>
                  {actionLoading[r.id] === 'publish' || actionLoading[r.id] === 'unpublish' ? (
                    <button
                      disabled
                      className="flex items-center justify-center w-[72px] px-2.5 py-1 text-[9px] font-mono bg-muted/30 text-muted-foreground rounded-lg cursor-not-allowed"
                    >
                      <Loader2 className="w-3 h-3 animate-spin" />
                    </button>
                  ) : r.status === 'draft' ? (
                    <button
                      onClick={() => handlePublish(r.id, r.status)}
                      className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-mono bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg transition-all cursor-pointer"
                    >
                      <Globe className="w-3 h-3" />Publish
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePublish(r.id, r.status)}
                      className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-mono bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg transition-all cursor-pointer"
                    >
                      <Clock className="w-3 h-3" />Unpublish
                    </button>
                  )}
                  <button
                    onClick={() => setDetailRelease(r)}
                    className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-mono bg-muted/30 hover:bg-muted/60 text-muted-foreground hover:text-foreground rounded-lg transition-all cursor-pointer"
                  >
                    <Eye className="w-3 h-3" />Details
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ id: r.id, name: r.name })}
                    disabled={actionLoading[r.id] === 'delete'}
                    className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-mono bg-muted/30 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
                  >
                    {actionLoading[r.id] === 'delete' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      {detailRelease && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setDetailRelease(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-card border border-border rounded-xl shadow-lg flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                  {/* Game Logo in modal */}
                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted border border-border flex items-center justify-center">
                    {detailRelease.game_logo ? (
                      <img
                        src={detailRelease.game_logo}
                        alt={detailRelease.game_name || ''}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${CATEGORY_GRADIENTS[detailRelease.category] || CATEGORY_GRADIENTS.Universal} flex items-center justify-center font-heading text-[14px] tracking-tight`}>
                        {detailRelease.logo_text || '?'}
                      </div>
                    )}
                  </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-foreground truncate">{detailRelease.name}</h2>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">{detailRelease.version}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">{detailRelease.category}</span>
                    <span className="text-muted-foreground/30">•</span>
                    {detailRelease.script_type === 'plan' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-mono rounded-sm bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>Plan
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-mono rounded-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle className="w-2.5 h-2.5" />Free
                      </span>
                    )}
                    {opStatusBadge(detailRelease.operational_status)}
                    {publishBadge(detailRelease.status)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDetailRelease(null)}
                className="h-8 w-8 rounded-lg hover:bg-secondary border border-transparent hover:border-border text-muted-foreground hover:text-foreground transition-all flex items-center justify-center cursor-pointer shrink-0"
              >
                <span className="text-xl leading-none">×</span>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Game Info */}
              {detailRelease.game_name && (
                <div className="rounded-lg border border-border overflow-hidden">
                  {detailRelease.game_banner && (
                    <div className="w-full h-28 overflow-hidden bg-muted relative">
                      <img
                        src={detailRelease.game_banner}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                  )}
                  <div className="p-3 flex items-center gap-3">
                    {detailRelease.game_logo ? (
                      <img src={detailRelease.game_logo} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <Gamepad2 className="w-10 h-10 text-muted-foreground/30 shrink-0" />
                    )}
                    <div>
                      <p className="text-xs font-semibold text-foreground">{detailRelease.game_name}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">Game ID: {detailRelease.game_id}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              {detailRelease.description && (
                <div>
                  <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-bold mb-1.5">Description</h4>
                  <p className="text-xs text-foreground/80 leading-relaxed">{detailRelease.description}</p>
                </div>
              )}

              {/* Loader URL */}
              <div>
                <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-bold mb-1.5 flex items-center gap-1">
                  <Link className="w-3 h-3" />Loader URL
                </h4>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-lg bg-muted/40 border border-border p-2.5 font-mono text-[10px] text-foreground break-all select-all">
                    {BASE_API}/v1/releases/{detailRelease.prefix}.lua
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${BASE_API}/v1/releases/${detailRelease.prefix}.lua`)
                      setCopiedLoader(true)
                      setTimeout(() => setCopiedLoader(false), 2000)
                    }}
                    className="flex items-center gap-1 px-2.5 py-2 text-[9px] font-mono bg-muted/30 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-lg border border-border/50 hover:border-primary/30 transition-all cursor-pointer shrink-0"
                  >
                    {copiedLoader ? (
                      <><CheckCircle className="w-3 h-3 text-emerald-500" /> Copied!</>
                    ) : (
                      <><Copy className="w-3 h-3" /> Copy</>
                    )}
                  </button>
                </div>
                <p className="text-[9px] text-muted-foreground/50 mt-1 font-mono">
                  Use this URL in your loadstring: loadstring(game:HttpGet(`${BASE_API}/v1/releases/${detailRelease.prefix}.lua`))()
                </p>
              </div>

              {/* Features */}
              {Array.isArray(detailRelease.features) && detailRelease.features.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-bold mb-1.5">
                    Features ({detailRelease.features.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {detailRelease.features.map((f, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-[9px] font-mono bg-secondary text-muted-foreground rounded-sm border border-border/50"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Meta */}
              <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground/60 pt-2 border-t border-border">
                <span>Created: {formatDate(detailRelease.created_at)}</span>
                {detailRelease.developer_name && <span>by {detailRelease.developer_name}</span>}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Delete Release Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-red-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Delete Release?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-foreground">{deleteConfirm?.name}</span>? This action is permanent and cannot be undone.
            </p>
            <DialogFooter className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleteConfirm(null)}
                className="h-8 text-[10px] font-mono rounded-lg hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                disabled={deleteConfirm ? actionLoading[deleteConfirm.id] === 'delete' : false}
                className="h-8 text-[10px] font-mono rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-none font-bold cursor-pointer"
              >
                {deleteConfirm && actionLoading[deleteConfirm.id] === 'delete' ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Delete Release
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function DeveloperReleasesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    }>
      <ReleasesContent />
    </Suspense>
  )
}
