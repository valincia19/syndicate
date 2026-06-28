'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import {
  DollarSign,
  Users,
  Activity,
  ArrowRight,
  ShieldAlert,
  Database,
  Loader2,
  Key,
  MessageCircle,
  Clock
} from 'lucide-react'
import { ClientDate } from '@/components/ui/client-date'

interface SystemStats {
  activeLicenses: number
  hwidWhitelisted: number
  totalUsers: number
  dailyOperations: number
}

interface FinanceStats {
  totalRevenueUSD: number
  thisMonthRevenueUSD: number
  lastMonthRevenueUSD: number
  dailyAverageUSD: number
}

interface ActivityLog {
  id: string
  action: string
  details: Record<string, any> | null
  created_at: string
  user_name: string | null
  user_email: string | null
}

export default function OwnerOverviewPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [financeStats, setFinanceStats] = useState<FinanceStats | null>(null)
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)

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

  useEffect(() => {
    if (mounted && user && user.role === 'owner') {
      const fetchData = async () => {
        try {
          const [sysRes, finRes, actRes] = await Promise.all([
            api.get<{ success: boolean; data: { stats: SystemStats } }>('/v1/admin/stats'),
            api.get<{ success: boolean; data: FinanceStats }>('/v1/payment/admin/finance-stats'),
            api.get<{ status: string; data: { logs: ActivityLog[] } }>('/v1/activity/admin/all?limit=5&offset=0')
          ])

          setSystemStats(sysRes.data?.data?.stats || null)
          setFinanceStats(finRes.data || null)
          setRecentLogs(actRes.data?.data?.logs || [])
        } catch (err) {
          console.error('Failed to load overview data:', err)
        } finally {
          setIsLoadingData(false)
        }
      }
      fetchData()
    }
  }, [mounted, user])

  const getActionIcon = (action: string) => {
    if (action.includes('device') || action.includes('hwid')) return ShieldAlert
    if (action.includes('ticket')) return MessageCircle
    if (action.includes('license') || action.includes('voucher') || action.includes('redeem')) return Key
    return Database
  }

  const formatActionName = (action: string) => {
    return action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  const formatDetails = (action: string, details: Record<string, any> | null) => {
    if (!details) return ''
    if (action.includes('device') || action.includes('hwid')) {
      return `Roblox user: ${details.roblox_username || 'N/A'}`
    }
    if (action.includes('voucher')) {
      return `Voucher: ${details.voucher_code || 'N/A'}`
    }
    if (action.includes('role')) {
      return `Target: ${details.target_email || 'N/A'} -> ${details.role || 'N/A'}`
    }
    return details.error || details.errorMessage || 'System audit logged'
  }

  if (isLoading || !mounted || isLoadingData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <div className="text-muted-foreground font-mono text-xs animate-pulse">Loading owner overview...</div>
      </div>
    )
  }

  if (!user || user.role !== 'owner') {
    return null
  }

  // Calculate MoM growth rate
  const thisMonthRev = financeStats?.thisMonthRevenueUSD || 0
  const lastMonthRev = financeStats?.lastMonthRevenueUSD || 0
  const revDiff = thisMonthRev - lastMonthRev
  const revGrowth = lastMonthRev > 0 ? (revDiff / lastMonthRev) * 100 : 0

  const kpiStats = [
    { 
      label: 'Monthly Revenue', 
      value: `$${thisMonthRev.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      change: `${revGrowth >= 0 ? '+' : ''}${revGrowth.toFixed(1)}%`,
      positive: revGrowth >= 0
    },
    { 
      label: 'Active Licenses', 
      value: (systemStats?.activeLicenses || 0).toLocaleString('en-US'), 
      change: `HWID: ${systemStats?.hwidWhitelisted || 0}`,
      positive: true
    },
    { 
      label: 'Total Users', 
      value: (systemStats?.totalUsers || 0).toLocaleString('en-US'), 
      change: 'Registered accounts',
      positive: true
    },
    { 
      label: 'Daily Operations', 
      value: (systemStats?.dailyOperations || 0).toLocaleString('en-US'), 
      change: 'System audits',
      positive: true
    },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-black tracking-tight text-foreground uppercase">
            Owner Overview
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Real-time business metrics and system status
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {kpiStats.map((stat, index) => (
          <div key={index} className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold text-foreground font-mono leading-none">{stat.value}</div>
              <div className={`text-[9px] font-mono px-1.5 py-0.5 rounded border font-bold ${
                stat.positive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
              }`}>
                {stat.change}
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Activity Logs */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs w-full">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-xs font-mono text-foreground uppercase tracking-wider">Recent Activity Logs</h2>
        </div>
        <div className="p-5 space-y-3">
          {recentLogs.length === 0 ? (
            <div className="text-center text-xs font-mono text-muted-foreground py-4">No recent activity logs.</div>
          ) : (
            recentLogs.map((log) => {
              const Icon = getActionIcon(log.action)
              return (
                <div key={log.id} className="border border-border/50 bg-muted/10 rounded-xl p-4 flex items-start gap-3 hover:bg-muted/20 transition-all">
                  <div className="p-1.5 rounded-md mt-0.5 bg-primary/10 text-primary">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <span>{formatActionName(log.action)}</span>
                        <span className="text-[10px] text-muted-foreground font-normal">by @{log.user_name || 'System'}</span>
                      </div>
                      <div className="text-[9px] text-muted-foreground font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <ClientDate date={log.created_at} format="datetime" />
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">{formatDetails(log.action, log.details)}</div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button 
          onClick={() => router.push('/studio/owner/finance')}
          className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary transition-all duration-200 shadow-xs cursor-pointer active:scale-98 group"
        >
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">Financials</span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-1">Export financial analytics & reviews</div>
        </button>

        <button 
          onClick={() => router.push('/studio/owner/users')}
          className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary transition-all duration-200 shadow-xs cursor-pointer active:scale-98 group"
        >
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">Manage Users</span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-1">Configure workspace team and staff roles</div>
        </button>

        <button 
          onClick={() => router.push('/studio/owner/activity')}
          className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary transition-all duration-200 shadow-xs cursor-pointer active:scale-98 group"
        >
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">System Logs</span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-1">Track audit trail and live platform events</div>
        </button>
      </div>
    </div>
  )
}
