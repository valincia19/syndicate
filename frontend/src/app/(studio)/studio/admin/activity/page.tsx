'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/context/auth-context'
import { ClientDate } from '@/components/ui/client-date'
import { api } from '@/lib/api'
import {
  Activity, Eye, Trash2, RotateCcw, Key, Ticket, MessageSquare,
  Search, Loader2, Calendar, ChevronDown, ShieldAlert,
  ChevronLeft, ChevronRight, User, HelpCircle, HardDrive, Shield,
  Filter, SlidersHorizontal
} from 'lucide-react'
import { getAvatarUrl } from '@/lib/utils'

interface ActivityLogDetails {
  path?: string
  roblox_username?: string
  code?: string
  subject?: string
  license_key?: string
  [key: string]: unknown
}

interface ActivityLog {
  id: string
  user_id: string
  action: string
  details: ActivityLogDetails | null
  created_at: string
  user_name: string | null
  user_email: string | null
  user_role: string | null
  user_avatar?: string | null
}

interface ActivityResponse {
  status: string
  data: {
    logs: ActivityLog[]
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
    }
  }
}

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'view_page', label: 'Page Views' },
  { value: 'unlink_device', label: 'Unlink Roblox Device' },
  { value: 'reset_device_hwid', label: 'Reset Device HWID' },
  { value: 'reset_all_devices_hwid', label: 'Reset All HWIDs' },
  { value: 'redeem_code', label: 'Redeem Code' },
  { value: 'claim_voucher', label: 'Claim Voucher' },
  { value: 'create_ticket', label: 'Create Support Ticket' },
  { value: 'reply_ticket', label: 'Reply Support Ticket' },
  { value: 'delete_activity', label: 'Delete Activity Log' },
  { value: 'delete_user', label: 'Delete User Account' },
  { value: 'suspend_user', label: 'Suspend User' },
  { value: 'unsuspend_user', label: 'Unsuspend User' },
  { value: 'update_user_role', label: 'Update User Role' },
  { value: 'update_user_data', label: 'Update User Profile' }
]

export default function AdminActivityPage() {
  const _router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [mounted, setMounted] = useState(false)

  // State
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [totalLogs, setTotalLogs] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Tab State: 'admin' (Admin & Staff Activity) vs 'user' (User Activity)
  const [activeTab, setActiveTab] = useState<'admin' | 'user'>('admin')

  // Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAction, setSelectedAction] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)

  // Expandable details
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set())

  // Dropdown references & state
  const [isActionDropdownOpen, setIsActionDropdownOpen] = useState(false)
  const [isLimitDropdownOpen, setIsLimitDropdownOpen] = useState(false)
  const actionDropdownRef = useRef<HTMLDivElement>(null)
  const limitDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => { Promise.resolve().then(() => setMounted(true)) }, [])

  // Close dropdowns on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (actionDropdownRef.current && !actionDropdownRef.current.contains(target)) {
        setIsActionDropdownOpen(false)
      }
      if (limitDropdownRef.current && !limitDropdownRef.current.contains(target)) {
        setIsLimitDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value)
    setPage(1)
  }, [])

  const handleActionChange = useCallback((value: string) => {
    setSelectedAction(value)
    setPage(1)
  }, [])

  const handleLimitChange = useCallback((value: number) => {
    setLimit(value)
    setPage(1)
  }, [])

  const handleActiveTabChange = useCallback((value: 'admin' | 'user') => {
    setActiveTab(value)
    setPage(1)
  }, [])

  const fetchActivities = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      params.set('role_group', activeTab)
      if (searchTerm.trim()) params.set('search', searchTerm.trim())
      if (selectedAction) params.set('action', selectedAction)

      const res = await api.get<ActivityResponse>(`/v1/admin/activities?${params.toString()}`)
      setLogs(res.data.logs || [])
      if (res.data.pagination) {
        setTotalPages(res.data.pagination.totalPages)
        setTotalLogs(res.data.pagination.total)
      } else {
        setTotalLogs(res.data.logs?.length || 0)
        setTotalPages(1)
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setLoadError(errMsg)
    } finally {
      setIsLoading(false)
    }
  }, [page, limit, searchTerm, selectedAction, activeTab])

  useEffect(() => {
    if (mounted && !authLoading && user && ['admin', 'owner'].includes(user.role)) {
      Promise.resolve().then(() => fetchActivities())
    }
  }, [fetchActivities, mounted, authLoading, user])

  if (authLoading || !mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-[11px] font-mono text-muted-foreground animate-pulse">
          Loading audit trail...
        </span>
      </div>
    )
  }

  if (!user || !['admin', 'owner'].includes(user.role)) {
    return null
  }

  const handleToggleExpand = (id: string) => {
    setExpandedLogIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDeleteLog = async (id: string) => {
    if (!confirm('Are you sure you want to delete this activity log?')) return
    const previousLogs = [...logs]
    setLogs(prev => prev.filter(log => log.id !== id))
    setTotalLogs(prev => Math.max(0, prev - 1))
    try {
      await api.delete(`/v1/admin/activities/${id}`)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      alert('Failed to delete activity log: ' + errMsg)
      setLogs(previousLogs)
    }
  }

  // Format action nicely
  const formatActionName = (action: string, details: ActivityLogDetails | null) => {
    switch (action) {
      case "view_page":
        const path = typeof details?.path === "string" ? details.path : ""
        const segment = path.split("/").pop() || "dashboard"
        return `Viewed ${segment.charAt(0).toUpperCase() + segment.slice(1)} page`
      case "unlink_device":
        return `Unlinked Roblox Device (${String(details?.roblox_username || "unknown")})`
      case "reset_device_hwid":
        return `Reset HWID for Roblox user ${String(details?.roblox_username || "unknown")}`
      case "reset_all_devices_hwid":
        return "Reset all devices HWID"
      case "redeem_code":
        return `Activated license using code: ${String(details?.code || "unknown")}`
      case "claim_voucher":
        return `Claimed voucher code: ${String(details?.code || "unknown")}`
      case "create_ticket":
        return `Opened Support Ticket: "${String(details?.subject || "No Subject")}"`
      case "reply_ticket":
        return "Replied to Support Ticket"
      case "delete_activity":
        return `Deleted Operational Activity Log`
      case "delete_user":
        return `Permanently deleted User account: ${String(details?.target_user_name || "unknown")} (${String(details?.target_user_email || "N/A")})`
      case "suspend_user":
        return `Suspended User account: ${String(details?.target_user_name || "unknown")} (${String(details?.target_user_email || "N/A")})`
      case "unsuspend_user":
        return `Unsuspended User account: ${String(details?.target_user_name || "unknown")} (${String(details?.target_user_email || "N/A")})`
      case "update_user_role":
        return `Updated role of ${String(details?.target_user_name || "unknown")} to ${String(details?.new_role || "user")}`
      case "update_user_data":
        return `Modified profile data for ${String(details?.target_user_name || "unknown")} (${details?.updated_fields && Array.isArray(details.updated_fields) ? details.updated_fields.join(", ") : ""})`
      default:
        return action.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    }
  }

  // Action icons
  const getActionIcon = (action: string) => {
    switch (action) {
      case "view_page":
        return <Eye className="w-3.5 h-3.5 text-sky-400" />
      case "unlink_device":
      case "delete_activity":
      case "delete_user":
        return <Trash2 className="w-3.5 h-3.5 text-red-500" />
      case "reset_device_hwid":
      case "reset_all_devices_hwid":
        return <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
      case "redeem_code":
      case "claim_voucher":
        return <Key className="w-3.5 h-3.5 text-emerald-500" />
      case "create_ticket":
        return <Ticket className="w-3.5 h-3.5 text-indigo-400" />
      case "reply_ticket":
        return <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
      case "suspend_user":
      case "unsuspend_user":
        return <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
      case "update_user_role":
      case "update_user_data":
        return <Shield className="w-3.5 h-3.5 text-blue-500" />
      default:
        return <Activity className="w-3.5 h-3.5 text-muted-foreground" />
    }
  }

  // Get user role badges
  const getRoleBadge = (role: string | null) => {
    if (!role) return 'bg-muted/40 text-muted-foreground border-border/50'
    switch (role.toLowerCase()) {
      case 'owner':
        return 'bg-red-500/10 text-red-500 border-red-500/20 font-bold dark:bg-red-950/20'
      case 'admin':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20 dark:bg-amber-950/20'
      case 'developer':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20 dark:bg-blue-950/20'
      case 'staff':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:bg-emerald-950/20'
      default:
        return 'bg-muted/40 text-muted-foreground border-border/50'
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-black tracking-tight text-foreground uppercase flex items-center gap-2">
            <Activity className="w-4.5 h-4.5 text-primary" />
            Audit Trail Logs
          </h1>
          <p className="text-[11px] text-muted-foreground font-mono">
            System-wide operational logs and user activity analytics
          </p>
        </div>
      </div>

      {/* Metrics Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
          <div className="text-lg font-bold text-foreground font-mono leading-none">
            {totalLogs.toLocaleString('en-US')}
          </div>
          <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">Total Audit Logs</div>
          <div className="text-[9px] text-muted-foreground/50 font-mono mt-0.5">system-wide actions</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
          <div className="text-lg font-bold text-foreground font-mono leading-none">
            {new Set(logs.map(l => l.user_email)).size.toLocaleString('en-US')}
          </div>
          <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">Active Users Cataloged</div>
          <div className="text-[9px] text-muted-foreground/50 font-mono mt-0.5">distinct users in view</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs col-span-2 sm:col-span-1">
          <div className="text-lg font-bold text-foreground font-mono leading-none truncate max-w-full" title={
            logs.length > 0 ? (
              logs.reduce((acc, current) => {
                acc[current.action] = (acc[current.action] || 0) + 1
                return acc
              }, {} as Record<string, number>)[logs[0].action] > 0
                ? logs[0].action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
                : 'N/A'
            ) : 'N/A'
          }>
            {logs.length > 0 ? (
              logs.reduce((acc, current) => {
                acc[current.action] = (acc[current.action] || 0) + 1
                return acc
              }, {} as Record<string, number>)[logs[0].action] > 0
                ? logs[0].action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
                : 'N/A'
            ) : 'N/A'}
          </div>
          <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">Top Logged Action</div>
          <div className="text-[9px] text-muted-foreground/50 font-mono mt-0.5">most frequent category</div>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="flex border-b border-border/60 select-none">
        <button
          onClick={() => handleActiveTabChange('admin')}
          className={`px-4 py-2 text-xs font-mono font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'admin'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          Admin & Staff Activity
        </button>
        <button
          onClick={() => handleActiveTabChange('user')}
          className={`px-4 py-2 text-xs font-mono font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'user'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          User Activity
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="relative z-20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 p-3 rounded-xl border border-border bg-card/30 backdrop-blur-xs">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search by User Name, Email, or Action..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8 w-full bg-background border border-border rounded-lg py-1.5 px-3 text-xs text-foreground placeholder-muted-foreground/75 hover:border-border/80 transition-colors focus:outline-hidden focus:ring-1 focus:ring-primary/45 font-medium"
          />
        </div>

        {/* Action filter dropdown */}
        <div className="relative w-full" ref={actionDropdownRef}>
          <button
            type="button"
            onClick={() => setIsActionDropdownOpen(!isActionDropdownOpen)}
            className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted/20 hover:border-border/80 transition-all cursor-pointer"
          >
            <span className="flex items-center gap-1.5 truncate">
              <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {ACTION_OPTIONS.find(opt => opt.value === selectedAction)?.label || 'All Actions'}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/60 transition-transform duration-200 shrink-0 ${isActionDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {isActionDropdownOpen && (
            <div className="absolute left-0 z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg py-1 max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
              {ACTION_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    handleActionChange(opt.value)
                    setIsActionDropdownOpen(false)
                  }}
                  className={`w-full flex items-center px-3 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                    selectedAction === opt.value
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-foreground hover:bg-muted/60'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Limit Dropdown */}
        <div className="relative w-full" ref={limitDropdownRef}>
          <button
            type="button"
            onClick={() => setIsLimitDropdownOpen(!isLimitDropdownOpen)}
            className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted/20 hover:border-border/80 transition-all cursor-pointer"
          >
            <span className="flex items-center gap-1.5 truncate">
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              Limit: {limit}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/60 transition-transform duration-200 shrink-0 ${isLimitDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {isLimitDropdownOpen && (
            <div className="absolute left-0 z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              {[10, 20, 50, 100].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    handleLimitChange(val)
                    setIsLimitDropdownOpen(false)
                  }}
                  className={`w-full flex items-center px-3 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                    limit === val
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-foreground hover:bg-muted/60'
                  }`}
                >
                  {val} rows
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Logs View Area */}
      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center flex flex-col items-center justify-center gap-2 select-none">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest animate-pulse">
            Fetching Activity Trail...
          </span>
        </div>
      ) : loadError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center select-none">
          <ShieldAlert className="w-8 h-8 text-destructive mx-auto mb-2" />
          <p className="text-xs text-destructive font-mono font-bold">Failed to load logs</p>
          <p className="text-[10px] text-muted-foreground font-mono mt-1">{loadError}</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center select-none">
          <HelpCircle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground font-mono">No activity logs match the search filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Audit trail feed */}
          <div className="relative border-l border-border pl-6 ml-3.5 space-y-4">
            {logs.map((log) => {
              const isExpanded = expandedLogIds.has(log.id)
              const userInitials = (log.user_name || log.user_email || 'U').substring(0, 2).toUpperCase()

              return (
                <div key={log.id} className="relative group">
                  {/* Timeline Bullet Node */}
                  <span className="absolute left-[-34px] top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card shadow group-hover:border-primary/50 group-hover:bg-primary/5 transition-colors">
                    {getActionIcon(log.action)}
                  </span>

                  {/* Activity item container */}
                  <div className="p-4 rounded-xl border border-border bg-card/65 hover:bg-card transition-all duration-300 shadow-sm flex flex-col gap-2">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* User Avatar or Initials Badge */}
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 overflow-hidden">
                          {log.user_avatar ? (
                            <Image src={getAvatarUrl(log.user_avatar, log.user_email)} alt={log.user_name || ''} width={28} height={28} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-bold font-mono text-primary">{userInitials}</span>
                          )}
                        </div>
                        
                        {/* Actor + Event Info */}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 leading-tight">
                            <span className="text-xs font-semibold text-foreground font-mono">
                              {log.user_name || 'System Actor'}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-mono truncate max-w-[150px] sm:max-w-[250px]">
                              ({log.user_email || 'N/A'})
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[7.5px] font-mono border uppercase tracking-wider ${getRoleBadge(log.user_role)}`}>
                              {log.user_role || 'user'}
                            </span>
                          </div>
                          
                          <p className="text-xs font-bold text-foreground mt-0.5 leading-tight">
                            {formatActionName(log.action, log.details)}
                          </p>
                        </div>
                      </div>

                      {/* Timestamp & Expand buttons */}
                      <div className="flex items-center gap-3 shrink-0 self-end md:self-center font-mono select-none">
                        <div className="flex items-center gap-1 text-muted-foreground/60 text-[10px]">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground/40" />
                          <ClientDate date={log.created_at} format="datetime" className="font-mono" />
                        </div>
                        
                        {log.details && Object.keys(log.details).length > 0 && (
                          <button
                            onClick={() => handleToggleExpand(log.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded border border-border bg-muted/20 hover:bg-muted/50 text-[9px] font-semibold text-foreground transition-all cursor-pointer"
                          >
                            {isExpanded ? 'Hide Data' : 'View Data'}
                            <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-[9px] font-semibold text-red-500 transition-all cursor-pointer"
                          title="Delete activity log"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Metadata items list (Quick preview of relevant parameters) */}
                    {!isExpanded && log.details && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {log.action === "view_page" && typeof log.details?.path === "string" && (
                          <span className="text-[9px] font-mono bg-muted/40 px-2 py-0.5 rounded border border-border text-muted-foreground/80">
                            path: <span className="text-primary/95">{String(log.details.path)}</span>
                          </span>
                        )}
                        {log.action !== "view_page" && Object.entries(log.details)
                          .filter(([k, v]) => v !== null && v !== undefined && String(v).trim() !== "" && !['license_id', 'user_id', 'roblox_username', 'subject', 'code'].includes(k))
                          .slice(0, 3)
                          .map(([key, value]) => (
                            <span key={key} className="text-[9px] font-mono bg-muted/40 px-2 py-0.5 rounded border border-border text-muted-foreground/80">
                              {key}: <span className="text-foreground/90">{String(value)}</span>
                            </span>
                          ))}
                      </div>
                    )}

                    {/* Expandable JSON details panel */}
                    {isExpanded && log.details && (
                      <div className="mt-2 p-3 rounded-lg border border-border/80 bg-muted/30 font-mono text-[9.5px] text-muted-foreground space-y-2 overflow-x-auto">
                        <div className="flex items-center gap-1.5 border-b border-border/40 pb-1.5">
                          <HardDrive className="w-3.5 h-3.5 text-primary/70" />
                          <span className="text-[9.5px] uppercase font-bold text-foreground tracking-wider select-none">Action Context Payload</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {Object.entries(log.details).map(([key, val]) => {
                            const displayKey = key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
                            const displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val)
                            
                            return (
                              <div key={key} className="flex flex-col border border-border/40 bg-card/45 px-2.5 py-1.5 rounded">
                                <span className="text-muted-foreground/75 font-semibold select-none">{displayKey}</span>
                                <span className="text-foreground/90 font-medium break-all mt-0.5">{displayVal}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-4 select-none font-mono">
              <span className="text-[10px] text-muted-foreground">
                Showing Page {page} of {totalPages} ({totalLogs} Total Logs)
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2 py-1.5 border border-border bg-card hover:bg-muted/40 text-[10px] rounded-md text-foreground disabled:opacity-50 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1]
                    const showEllipsis = prev && p - prev > 1
                    
                    return (
                      <div key={p} className="flex items-center gap-1">
                        {showEllipsis && <span className="text-muted-foreground text-[10px] px-1 select-none">...</span>}
                        <button
                          onClick={() => setPage(p)}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                            page === p ? 'bg-primary text-primary-foreground' : 'border border-border bg-card hover:bg-muted/40 text-foreground'
                          }`}
                        >
                          {p}
                        </button>
                      </div>
                    )
                  })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2 py-1.5 border border-border bg-card hover:bg-muted/40 text-[10px] rounded-md text-foreground disabled:opacity-50 transition-all cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
