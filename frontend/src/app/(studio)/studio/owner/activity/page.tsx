'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { 
  Activity, CheckCircle, XCircle, Loader2, Trash2, 
  Search, ChevronLeft, ChevronRight, RefreshCw, AlertTriangle
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ClientDate } from '@/components/ui/client-date'

interface ActivityLog {
  id: string
  user_id: string
  action: string
  details: Record<string, unknown> | null
  created_at: string
  user_name: string | null
  user_email: string | null
  user_role: string | null
}

export default function OwnerActivityPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [total, setTotal] = useState(0)
  const [isLoadingLogs, setIsLoadingLogs] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const limit = 25

  // Clean log dialog states
  const [isCleanOpen, setIsCleanOpen] = useState(false)
  const [cleanRange, setCleanRange] = useState<'7d' | '30d' | 'all'>('7d')
  const [isCleaning, setIsCleaning] = useState(false)

  useEffect(() => {
    Promise.resolve().then(() => setMounted(true))
  }, [])

  useEffect(() => {
    if (!isLoading && mounted) {
      if (!user || user.role !== 'owner') {
        router.push('/studio')
      }
    }
  }, [user, isLoading, mounted, router])

  const fetchLogs = useCallback(async () => {
    if (!mounted || !user || user.role !== 'owner') return
    setIsLoadingLogs(true)
    try {
      const offset = (page - 1) * limit
      const queryParams = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
        search,
      })
      const res = await api.get<{ status: string; data: { logs: ActivityLog[]; total: number } }>(
        `/v1/activity/admin/all?${queryParams.toString()}`
      )
      setLogs(res.data.logs || [])
      setTotal(res.data.total || 0)
    } catch (err) {
      console.error('Failed to fetch activity logs:', err)
    } finally {
      setIsLoadingLogs(false)
    }
  }, [mounted, user, page, search])

  useEffect(() => {
    Promise.resolve().then(() => fetchLogs())
  }, [fetchLogs])

  const handleCleanLogs = async () => {
    if (isCleaning) return
    setIsCleaning(true)
    try {
      const res = await api.post<{ status: string; message: string; data: { deletedCount: number } }>(
        '/v1/activity/admin/clean', 
        { range: cleanRange }
      )
      alert(res.message || `Successfully removed logs.`)
      setIsCleanOpen(false)
      setPage(1)
      fetchLogs()
    } catch (err: unknown) {
      alert((err as { message?: string })?.message || 'Failed to clean logs')
    } finally {
      setIsCleaning(false)
    }
  }

  const formatActionName = (action: string) => {
    return action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  const formatDetails = (details: Record<string, unknown> | null) => {
    if (!details) return '-'
    try {
      const items = Object.entries(details).map(([key, val]) => {
        const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val)
        return `${key}: ${valStr}`
      })
      return items.join(', ')
    } catch {
      return JSON.stringify(details)
    }
  }

  const getTargetValue = (action: string, details: Record<string, unknown> | null) => {
    if (!details) return '-'
    const d = details as Record<string, string | number | undefined>
    if (action.includes('voucher')) return d.voucher_code || d.code || '-'
    if (action.includes('device') || action.includes('hwid')) return d.roblox_username || d.roblox_id || d.hwid || '-'
    if (action.includes('ticket')) return `Ticket #${d.ticket_id || d.id || ''}`
    if (action.includes('user')) return d.target_email || d.target_name || d.email || '-'
    return d.target || d.id || '-'
  }

  const totalPages = Math.ceil(total / limit)

  if (isLoading || !mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground font-mono text-xs animate-pulse">Loading activity logs...</div>
      </div>
    )
  }

  if (!user || user.role !== 'owner') {
    return null
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-black tracking-tight text-foreground uppercase">
            System Activity
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Real-time operation logs and audit trail
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={isLoadingLogs}
            className="h-8 text-[10px] font-mono flex items-center gap-1.5 border-border bg-card hover:bg-muted cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCleanOpen(true)}
            className="h-8 text-[10px] font-mono flex items-center gap-1.5 border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clean Logs
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center p-3 bg-muted/20 border border-border/80 rounded-xl">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Search by username, email, action name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8.5 pr-3 py-1.5 text-xs font-mono rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-hidden focus:border-primary/50"
          />
        </div>
      </div>

      {/* Activity Stream */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs w-full">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4.5 h-4.5 text-primary" />
            <h2 className="text-xs font-mono text-foreground uppercase tracking-wider">Audit logs ({total})</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-muted/10 border-b border-border">
              <tr>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Timestamp</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Event</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">User</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Target</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Status</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoadingLogs ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-xs font-mono text-muted-foreground">
                    <Loader2 className="w-4.5 h-4.5 animate-spin mx-auto text-primary mb-2" />
                    Loading logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-xs font-mono text-muted-foreground">
                    No activity logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const errorInDetails = log.details && (log.details.error || log.details.errorMessage || log.details.success === false)
                  const isFailed = log.action === 'failed' || errorInDetails
                  return (
                    <tr key={log.id} className="hover:bg-muted/5 transition-colors">
                      <td className="px-5 py-3 text-xs font-mono text-muted-foreground">
                        <ClientDate date={log.created_at} format="datetime" />
                      </td>
                      <td className="px-5 py-3 text-xs text-foreground font-semibold">
                        {formatActionName(log.action)}
                      </td>
                      <td className="px-5 py-3 text-xs font-mono">
                        <span className="text-primary font-medium">
                          {log.user_name || log.user_email || 'System'}
                        </span>
                        {log.user_role && (
                          <span className="ml-1.5 text-[8px] uppercase tracking-wider px-1 bg-secondary text-muted-foreground border border-border rounded-sm">
                            {log.user_role}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs font-mono text-muted-foreground">
                        {getTargetValue(log.action, log.details)}
                      </td>
                      <td className="px-5 py-3 text-xs">
                        {isFailed ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border text-[9px] bg-red-500/5 text-red-600 dark:text-red-500 border-red-500/20 font-mono font-bold select-none">
                            <XCircle className="w-3 h-3" />
                            Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border text-[9px] bg-emerald-500/5 text-emerald-600 dark:text-emerald-500 border-emerald-500/20 font-mono font-bold select-none">
                            <CheckCircle className="w-3 h-3" />
                            Success
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground max-w-[300px] truncate" title={formatDetails(log.details)}>
                        {formatDetails(log.details)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-border flex items-center justify-between bg-muted/10">
            <span className="text-[10px] font-mono text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-7 w-7 p-0 flex items-center justify-center cursor-pointer border-border hover:bg-muted"
              >
                <ChevronLeft className="w-4 h-4 text-foreground" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-7 w-7 p-0 flex items-center justify-center cursor-pointer border-border hover:bg-muted"
              >
                <ChevronRight className="w-4 h-4 text-foreground" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Clean Logs Dialog */}
      <Dialog open={isCleanOpen} onOpenChange={setIsCleanOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-red-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Clean Audit Logs?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Select which logs you would like to purge. This action is permanent and cannot be reversed.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(['7d', '30d', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setCleanRange(range)}
                  className={`py-2 text-[10px] font-mono border rounded-lg transition-all cursor-pointer font-bold ${
                    cleanRange === range
                      ? "bg-red-500/10 border-red-500 text-red-500 shadow-sm"
                      : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {range === '7d' ? 'Older than 7 Days' : range === '30d' ? 'Older than 30 Days' : 'Purge All Logs'}
                </button>
              ))}
            </div>
            <DialogFooter className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCleanOpen(false)}
                className="h-8 text-[10px] font-mono rounded-lg hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCleanLogs}
                disabled={isCleaning}
                className="h-8 text-[10px] font-mono rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-none font-bold cursor-pointer"
              >
                {isCleaning ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Confirm Purge
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
