'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import {
  DollarSign,
  Users,
  Activity,
  ArrowRight,
  ShieldAlert,
  Database
} from 'lucide-react'

export default function OwnerOverviewPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [mounted, setMounted] = useState(false)

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

  const kpiStats = [
    { label: 'Monthly Revenue', value: '$24,850', change: '+12.5%' },
    { label: 'Active Licenses', value: '1,247', change: '+89' },
    { label: 'Growth Rate', value: '8.7%', change: '+2.1%' },
    { label: 'System Health', value: '99.2%', change: '+0.3%' },
  ]

  const recentAlerts = [
    { type: 'success', message: 'System backup completed successfully', time: '2 min ago', icon: Database },
    { type: 'warning', message: 'High memory usage on primary server', time: '15 min ago', icon: ShieldAlert },
    { type: 'success', message: 'Database optimization completed', time: '1 hour ago', icon: Database }
  ]

  if (isLoading || !mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground font-mono text-xs animate-pulse">Loading owner overview...</div>
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
            Owner Overview
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Real-time business metrics and system status
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiStats.map((stat, index) => (
          <div key={index} className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold text-foreground font-mono leading-none">{stat.value}</div>
              <div className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                {stat.change}
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Alerts */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs w-full">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-xs font-mono text-foreground uppercase tracking-wider">Recent Alerts</h2>
        </div>
        <div className="p-5 space-y-3">
          {recentAlerts.map((alert, index) => {
            const Icon = alert.icon
            return (
              <div key={index} className="border border-border/50 bg-muted/10 rounded-xl p-4 flex items-start gap-3">
                <div className={`p-1.5 rounded-md mt-0.5 ${
                  alert.type === 'success' 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500' 
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-500'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-foreground">{alert.message}</div>
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{alert.time}</div>
                </div>
              </div>
            )
          })}
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
