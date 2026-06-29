'use client'

import { useEffect, useState, useCallback } from 'react'
import { redirect } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { Activity, Key, Search, Loader2, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

interface ExecutionLog {
  id: string
  date: string
  count: number
  created_at: string
  updated_at: string
}

interface ExecutionKey {
  id: string
  date: string
  license_key: string
  count: number
  created_at: string
  updated_at: string
}

interface LogsResponse {
  status: string
  data: {
    total: number
    page: number
    limit: number
    logs: ExecutionLog[]
  }
}

interface KeysResponse {
  status: string
  data: {
    total: number
    page: number
    limit: number
    keys: ExecutionKey[]
  }
}

function formatDateString(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTimeString(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export default function OwnerExecutionsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'logs' | 'keys'>('logs')

  // Daily Logs states
  const [logs, setLogs] = useState<ExecutionLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [logsError, setLogsError] = useState<string | null>(null)
  const [logsPage, setLogsPage] = useState(1)
  const [logsTotal, setLogsTotal] = useState(0)

  // Keys states
  const [keys, setKeys] = useState<ExecutionKey[]>([])
  const [keysLoading, setKeysLoading] = useState(true)
  const [keysError, setKeysError] = useState<string | null>(null)
  const [keysPage, setKeysPage] = useState(1)
  const [keysTotal, setKeysTotal] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const limit = 20

  useEffect(() => {
    Promise.resolve().then(() => {
      setMounted(true)
    })
  }, [])

  useEffect(() => {
    if (!authLoading && mounted) {
      if (!user || user.role !== 'owner') {
        redirect('/studio')
      }
    }
  }, [user, authLoading, mounted])

  const fetchLogs = useCallback(async (page: number) => {
    setLogsLoading(true)
    setLogsError(null)
    try {
      const res = await api.get<LogsResponse>(`/v1/admin/executions/logs?page=${page}&limit=${limit}`)
      if (res.status === 'success' && res.data) {
        setLogs(res.data.logs || [])
        setLogsTotal(res.data.total || 0)
      } else {
        setLogsError('Failed to fetch execution logs')
      }
    } catch (err: unknown) {
      setLogsError(err instanceof Error ? err.message : String(err))
    } finally {
      setLogsLoading(false)
    }
  }, [])

  const fetchKeys = useCallback(async (page: number, search: string) => {
    setKeysLoading(true)
    setKeysError(null)
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      })
      if (search) queryParams.set('search', search)

      const res = await api.get<KeysResponse>(`/v1/admin/executions/keys?${queryParams.toString()}`)
      if (res.status === 'success' && res.data) {
        setKeys(res.data.keys || [])
        setKeysTotal(res.data.total || 0)
      } else {
        setKeysError('Failed to fetch execution keys')
      }
    } catch (err: unknown) {
      setKeysError(err instanceof Error ? err.message : String(err))
    } finally {
      setKeysLoading(false)
    }
  }, [])

  useEffect(() => {
    if (mounted && !authLoading && user?.role === 'owner') {
      if (activeTab === 'logs') {
        Promise.resolve().then(() => fetchLogs(logsPage))
      } else {
        Promise.resolve().then(() => fetchKeys(keysPage, searchQuery))
      }
    }
  }, [mounted, authLoading, user, activeTab, logsPage, keysPage, searchQuery, fetchLogs, fetchKeys])

  // Handle key search submit/change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    if (!e.target.value.trim()) {
      setSearchQuery('')
      setKeysPage(1)
    }
  }

  // Trigger search manually
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchTerm.trim())
    setKeysPage(1)
  }

  if (authLoading || !mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-[11px] font-mono text-muted-foreground animate-pulse">Loading execution panel...</span>
      </div>
    )
  }

  if (!user || user.role !== 'owner') {
    return null
  }

  const logsTotalPages = Math.ceil(logsTotal / limit) || 1
  const keysTotalPages = Math.ceil(keysTotal / limit) || 1

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-black tracking-tight text-foreground uppercase">
            Execution Monitoring
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Track real-time system executions and license key usage metrics
          </p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-1.5 p-1 border border-border/60 bg-muted/20 rounded-xl w-fit select-none">
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-card text-foreground border border-border/80 shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Activity className="w-4 h-4" />
          Daily Execution Counts
        </button>
        <button
          onClick={() => setActiveTab('keys')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'keys'
              ? 'bg-card text-foreground border border-border/80 shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Key className="w-4 h-4" />
          License Key Usage
        </button>
      </div>

      {/* Active Tab Container */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs w-full">
        {activeTab === 'logs' ? (
          <div>
            {/* Logs Table Title */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-4.5 h-4.5 text-primary shrink-0" />
                <div>
                  <h2 className="text-xs font-mono text-foreground uppercase tracking-wider">Daily Statistics</h2>
                  <p className="text-[10px] text-muted-foreground font-mono">{logsTotal} history entries</p>
                </div>
              </div>
            </div>

            {/* Logs Loading / Error / Content */}
            {logsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-[11px] font-mono text-muted-foreground">Loading history logs...</span>
              </div>
            ) : logsError ? (
              <div className="p-8 text-center text-red-500 font-mono text-xs border-b border-border">
                {logsError}
              </div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center">
                <Activity className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-xs font-bold text-foreground mb-1">No execution logs found</p>
                <p className="text-[11px] text-muted-foreground">No executions have been recorded in the database yet.</p>
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/10 text-[10px] font-mono text-muted-foreground uppercase tracking-wider select-none">
                        <th className="px-5 py-3.5 font-bold">Date</th>
                        <th className="px-5 py-3.5 font-bold">Executions Count</th>
                        <th className="px-5 py-3.5 font-bold">Created At</th>
                        <th className="px-5 py-3.5 font-bold">Last Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/15 transition-colors">
                          <td className="px-5 py-3.5 text-xs font-mono text-foreground font-bold">
                            {formatDateString(log.date)}
                          </td>
                          <td className="px-5 py-3.5 text-xs font-mono">
                            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-bold">
                              {log.count.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground">
                            {formatDateTimeString(log.created_at)}
                          </td>
                          <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground">
                            {formatDateTimeString(log.updated_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Logs Pagination */}
                {logsTotalPages > 1 && (
                  <div className="px-5 py-4 border-t border-border flex items-center justify-between select-none">
                    <p className="text-[10px] text-muted-foreground font-mono">
                      Page {logsPage} of {logsTotalPages}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setLogsPage((prev) => Math.max(1, prev - 1))}
                        disabled={logsPage === 1}
                        className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setLogsPage((prev) => Math.min(logsTotalPages, prev + 1))}
                        disabled={logsPage === logsTotalPages}
                        className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Keys Controls & Title */}
            <div className="px-5 py-4 border-b border-border flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <Key className="w-4.5 h-4.5 text-primary shrink-0" />
                <div>
                  <h2 className="text-xs font-mono text-foreground uppercase tracking-wider">License Key Statistics</h2>
                  <p className="text-[10px] text-muted-foreground font-mono">{keysTotal} license entries</p>
                </div>
              </div>

              {/* Search Bar */}
              <form onSubmit={handleSearchSubmit} className="flex items-center relative w-full md:max-w-xs">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search license key..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full pl-9 pr-3 py-1.5 border border-border bg-muted/15 rounded-xl text-xs placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-primary/50 transition-colors font-mono"
                />
              </form>
            </div>

            {/* Keys Loading / Error / Content */}
            {keysLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-[11px] font-mono text-muted-foreground">Loading key usages...</span>
              </div>
            ) : keysError ? (
              <div className="p-8 text-center text-red-500 font-mono text-xs border-b border-border">
                {keysError}
              </div>
            ) : keys.length === 0 ? (
              <div className="p-12 text-center">
                <Search className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-xs font-bold text-foreground mb-1">No license key logs found</p>
                <p className="text-[11px] text-muted-foreground">
                  {searchTerm ? 'No keys matched your search criteria.' : 'No key usage records registered.'}
                </p>
              </div>
            ) : (
              <div>
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/10 text-[10px] font-mono text-muted-foreground uppercase tracking-wider select-none">
                        <th className="px-5 py-3.5 font-bold">Date</th>
                        <th className="px-5 py-3.5 font-bold">License Key</th>
                        <th className="px-5 py-3.5 font-bold">Executions Count</th>
                        <th className="px-5 py-3.5 font-bold">First Used</th>
                        <th className="px-5 py-3.5 font-bold">Last Used</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {keys.map((k) => (
                        <tr key={k.id} className="hover:bg-muted/15 transition-colors">
                          <td className="px-5 py-3.5 text-xs font-mono text-foreground font-bold">
                            {formatDateString(k.date)}
                          </td>
                          <td className="px-5 py-3.5 text-xs font-mono text-foreground">
                            {k.license_key}
                          </td>
                          <td className="px-5 py-3.5 text-xs font-mono">
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 font-bold">
                              {k.count.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground">
                            {formatDateTimeString(k.created_at)}
                          </td>
                          <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground">
                            {formatDateTimeString(k.updated_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Keys Pagination */}
                {keysTotalPages > 1 && (
                  <div className="px-5 py-4 border-t border-border flex items-center justify-between select-none">
                    <p className="text-[10px] text-muted-foreground font-mono">
                      Page {keysPage} of {keysTotalPages}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setKeysPage((prev) => Math.max(1, prev - 1))}
                        disabled={keysPage === 1}
                        className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setKeysPage((prev) => Math.min(keysTotalPages, prev + 1))}
                        disabled={keysPage === keysTotalPages}
                        className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
