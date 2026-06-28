'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { Code2, Upload, FileText, CheckCircle, Clock, AlertTriangle, ArrowRight, Loader2, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface Stats {
  total_scripts: number
  published: number
  draft: number
  deprecated: number
  total_downloads: number
  total_folders: number
  recent_deployments: RecentScript[]
}

interface RecentScript {
  id: string
  name: string
  version: string
  status: 'draft' | 'published' | 'deprecated'
  created_at: string
  developer_name: string | null
  developer_email: string | null
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 60000) return 'just now'
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const STATUS_CONFIG = {
  published:  { label: 'Published',  icon: CheckCircle,  badgeClass: 'bg-blue-500/5 text-blue-500 dark:text-blue-400 border-blue-500/15', barClass: 'bg-blue-500/50' },
  draft:      { label: 'Draft',      icon: Clock,        badgeClass: 'bg-amber-500/5 text-amber-500 dark:text-amber-400 border-amber-500/15', barClass: 'bg-amber-500/40' },
  deprecated: { label: 'Deprecated', icon: AlertTriangle, badgeClass: 'bg-muted/20 text-muted-foreground border-border/30',                  barClass: 'bg-muted-foreground/15' },
}

export default function DeveloperOverviewPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { Promise.resolve().then(() => setMounted(true)) }, [])

  useEffect(() => {
    if (!isLoading && mounted) {
      if (!user || !['owner', 'developer'].includes(user.role)) {
        router.push('/studio')
      }
    }
  }, [user, isLoading, mounted, router])

  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true)
    setError(null)
    try {
      const res = await api.get<{ status: string; data: Stats }>('/v1/scripts/stats')
      setStats(res.data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setIsLoadingStats(false)
    }
  }, [])

  useEffect(() => {
    if (!mounted || !user || !['owner', 'developer'].includes(user.role)) return
    let isMounted = true;
    (async () => {
      try {
        setIsLoadingStats(true)
        const res = await api.get<{ status: string; data: Stats }>('/v1/scripts/stats')
        if (!isMounted) return
        setStats(res.data)
      } catch (err: unknown) {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Failed to load stats')
      } finally {
        if (isMounted) setIsLoadingStats(false)
      }
    })()
    return () => { isMounted = false }
  }, [mounted, user])

  if (isLoading || !mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground font-mono text-xs animate-pulse">Loading developer overview...</div>
      </div>
    )
  }

  if (!user || !['owner', 'developer'].includes(user.role)) return null

  const statCards = stats ? [
    { label: 'Total Scripts',    value: stats.total_scripts,   sub: `${stats.draft} draft · ${stats.deprecated} deprecated` },
    { label: 'Published',        value: stats.published,        sub: 'live scripts' },
    { label: 'Total Downloads',  value: stats.total_downloads,  sub: 'all time' },
    { label: 'Folders',          value: stats.total_folders,    sub: 'directories' },
  ] : []

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-black tracking-tight text-foreground uppercase">Developer Overview</h1>
          <p className="text-[11px] text-muted-foreground">Script development dashboard</p>
        </div>
        <button
          onClick={fetchStats}
          disabled={isLoadingStats}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 border border-border/50 text-[10px] font-mono text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStats ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-[11px] font-mono">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Stats Grid */}
      {isLoadingStats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statCards.map((stat, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
              <div className="text-lg font-bold text-foreground font-mono leading-none">
                {stat.value.toLocaleString('en-US')}
              </div>
              <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">{stat.label}</div>
              <div className="text-[9px] text-muted-foreground/50 font-mono mt-0.5">{stat.sub}</div>
            </div>
          ))}
        </div>
      )}


      {/* Recent Deployments */}
      <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-3.5 py-2 border-b border-border/60 bg-muted/20">
          <h3 className="text-[9.5px] font-mono text-muted-foreground uppercase tracking-wider font-bold">Recent Deployments</h3>
          <Link
            href="/studio/developer/scripts"
            className="text-[8.5px] font-mono text-primary hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="w-2.5 h-2.5" />
          </Link>
        </div>
        {isLoadingStats ? (
          <div className="flex items-center justify-center py-6 gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground/40" />
            <span className="text-[9px] font-mono text-muted-foreground/50">Loading...</span>
          </div>
        ) : !stats?.recent_deployments.length ? (
          <div className="flex flex-col items-center justify-center py-6 gap-1.5">
            <FileText className="w-6 h-6 text-muted-foreground/15" />
            <span className="text-[9px] font-mono text-muted-foreground/40">No deployments yet</span>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {stats.recent_deployments.map((script) => {
              const cfg = STATUS_CONFIG[script.status] || STATUS_CONFIG.draft
              const StatusIcon = cfg.icon
              return (
                <Link
                  key={script.id}
                  href={`/studio/developer/scripts?script=${script.id}`}
                  className="flex items-center justify-between gap-2.5 px-3 py-1.5 hover:bg-muted/15 transition-colors cursor-pointer block"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-3 h-3 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10.5px] font-medium text-foreground truncate flex items-center gap-1.5 leading-tight">
                        <span>{script.name}</span>
                        {script.version && <span className="text-[8.5px] font-mono text-muted-foreground/60">v{script.version}</span>}
                      </div>
                      <div className="text-[8.5px] text-muted-foreground/70 font-mono truncate leading-none mt-0.5">
                        deployed {relativeTime(script.created_at)} · {script.developer_name || script.developer_email || 'Developer'}
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[7.5px] font-mono shrink-0 border ${cfg.badgeClass}`}>
                    <StatusIcon className="w-2.5 h-2.5" />
                    {cfg.label}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => router.push('/studio/developer/deploy')}
          className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary transition-all duration-200 shadow-xs cursor-pointer active:scale-98 group"
        >
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
            <Upload className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">Deploy Scripts</span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-1">Upload and release new Lua scripts to production</div>
        </button>

        <button
          onClick={() => router.push('/studio/developer/scripts')}
          className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary transition-all duration-200 shadow-xs cursor-pointer active:scale-98 group"
        >
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
            <Code2 className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">Manage Scripts</span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-1">View, edit, or configure active Lua scripts</div>
        </button>
      </div>
    </div>
  )
}
