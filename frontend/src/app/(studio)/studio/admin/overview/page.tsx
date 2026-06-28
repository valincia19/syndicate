'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { ClientDate } from '@/components/ui/client-date'
import {
  Key, Shield, Activity, ArrowRight, Loader2,
  Eye, Trash2, RotateCcw, Ticket, MessageSquare, ShieldAlert
} from 'lucide-react'

interface OverviewStats {
  activeLicenses: number
  hwidWhitelisted: number
  totalUsers: number
  dailyOperations: number
}

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
}

interface ActivityResponse {
  status: string
  data: {
    logs: ActivityLog[]
  }
}

export default function AdminOverviewPage() {
  const router = useRouter()
  const { user, isLoading: isAuthLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [statsData, setStatsData] = useState<OverviewStats | null>(null)
  const [, setIsStatsLoading] = useState(true)
  
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([])
  const [isLogsLoading, setIsLogsLoading] = useState(true)

  useEffect(() => {
    Promise.resolve().then(() => setMounted(true))
  }, [])

  const fetchStats = () => {
    setIsStatsLoading(true)
    api.get<{ data: { stats: OverviewStats } }>('/v1/admin/stats')
      .then((res) => {
        if (res.data?.stats) {
          setStatsData(res.data.stats)
        }
      })
      .catch(() => { /* use fallback values if request fails */ })
      .finally(() => setIsStatsLoading(false))
  }

  const fetchLogs = () => {
    setIsLogsLoading(true)
    api.get<ActivityResponse>('/v1/admin/activities?limit=5')
      .then((res) => {
        if (res.data?.logs) {
          setRecentLogs(res.data.logs)
        }
      })
      .catch(() => { /* ignore */ })
      .finally(() => setIsLogsLoading(false))
  }

  useEffect(() => {
    if (!isAuthLoading && mounted) {
      if (!user || !['owner', 'admin'].includes(user.role)) {
        router.push('/studio')
        return
      }

      Promise.resolve().then(() => {
        fetchStats()
        fetchLogs()
      })
    }
  }, [user, isAuthLoading, mounted, router])

  const stats = [
    { label: 'Active Licenses', value: statsData ? statsData.activeLicenses.toLocaleString('en-US') : '...' },
    { label: 'HWID Whitelisted', value: statsData ? statsData.hwidWhitelisted.toLocaleString('en-US') : '...' },
    { label: 'Total Users', value: statsData ? statsData.totalUsers.toLocaleString('en-US') : '...' },
    { label: 'Daily Operations', value: statsData ? statsData.dailyOperations.toLocaleString('en-US') : '...' },
  ]

  if (isAuthLoading || !mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground font-mono text-xs animate-pulse">Loading overview...</div>
      </div>
    )
  }

  if (!user || !['owner', 'admin'].includes(user.role)) {
    return null
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
        return `Permanently deleted User account: ${String(details?.target_user_name || "unknown")}`
      case "suspend_user":
        return `Suspended User account: ${String(details?.target_user_name || "unknown")}`
      case "unsuspend_user":
        return `Unsuspended User account: ${String(details?.target_user_name || "unknown")}`
      case "update_user_role":
        return `Updated role of ${String(details?.target_user_name || "unknown")} to ${String(details?.new_role || "user")}`
      case "update_user_data":
        return `Modified profile data for ${String(details?.target_user_name || "unknown")}`
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-black tracking-tight text-foreground uppercase">
            Admin Overview
          </h1>
          <p className="text-[11px] text-muted-foreground">
            License management dashboard
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat, index) => (
          <div key={index} className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
            <div className="text-lg font-bold text-foreground font-mono leading-none">{stat.value}</div>
            <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Actions */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs w-full">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between select-none">
          <h2 className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">Recent Actions</h2>
          <button
            onClick={() => router.push('/studio/admin/activity')}
            className="text-[10px] font-mono font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
          >
            View All Logs <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="p-4 space-y-2">
          {isLogsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="ml-2 text-[10px] font-mono text-muted-foreground animate-pulse">Loading actions...</span>
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="text-center py-6 text-[10px] font-mono text-muted-foreground">
              No recent actions logged.
            </div>
          ) : (
            recentLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between gap-3 text-xs border border-border/40 bg-muted/5 p-2 px-3 rounded-lg hover:bg-muted/15 transition-all">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    {getActionIcon(log.action)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-md">
                      {formatActionName(log.action, log.details)}
                    </div>
                    <div className="text-[9.5px] text-muted-foreground font-mono leading-none mt-0.5 truncate">
                      {log.user_name || 'System Actor'} ({log.user_email || 'N/A'})
                    </div>
                  </div>
                </div>
                <div className="text-[9px] text-muted-foreground/60 font-mono shrink-0">
                  <ClientDate date={log.created_at} format="datetime" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button 
          onClick={() => router.push('/studio/admin/licenses')}
          className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary transition-all duration-200 shadow-xs cursor-pointer active:scale-98 group"
        >
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
            <Key className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">Manage Licenses</span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-1">Create, edit, or revoke user licenses</div>
        </button>

        <button 
          onClick={() => router.push('/studio/admin/hwid')}
          className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary transition-all duration-200 shadow-xs cursor-pointer active:scale-98 group"
        >
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">Manage HWID</span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-1">Monitor and modify hardware ID whitelist entries</div>
        </button>
      </div>
    </div>
  )
}
