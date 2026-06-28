'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { PieChart, Loader2, TrendingUp, TrendingDown } from 'lucide-react'

interface FinanceStats {
  totalRevenueUSD: number
  thisMonthRevenueUSD: number
  lastMonthRevenueUSD: number
  dailyAverageUSD: number
  trend: { month: string; amount: number }[]
  breakdown: { plan_type: string; amount: number; count: number }[]
}

export default function OwnerFinancePage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [stats, setStats] = useState<FinanceStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)

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
      const fetchStats = async () => {
        try {
          const res = await api.get<{ success: boolean; data: FinanceStats }>('/v1/payment/admin/finance-stats')
          setStats(res.data)
        } catch (err) {
          console.error('Failed to fetch finance stats:', err)
        } finally {
          setIsLoadingStats(false)
        }
      }
      fetchStats()
    }
  }, [mounted, user])

  if (isLoading || !mounted || isLoadingStats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <div className="text-muted-foreground font-mono text-xs animate-pulse">Loading financial reports...</div>
      </div>
    )
  }

  if (!user || user.role !== 'owner' || !stats) {
    return null
  }

  // Calculate comparison values
  const thisMonth = stats.thisMonthRevenueUSD || 0
  const lastMonth = stats.lastMonthRevenueUSD || 0
  const monthlyDiff = thisMonth - lastMonth
  const monthlyDiffPercent = lastMonth > 0 ? (monthlyDiff / lastMonth) * 100 : 0

  const trendData = stats.trend && stats.trend.length > 0 ? stats.trend : [
    { month: 'No Data', amount: 0 }
  ]
  const maxRevenue = Math.max(...trendData.map(d => d.amount), 1)

  const totalBreakdownAmount = stats.breakdown.reduce((sum, b) => sum + b.amount, 0) || 1
  const breakdownItems = stats.breakdown.length > 0 ? stats.breakdown.map(b => ({
    category: b.plan_type === 'pro' ? 'Pro Plan Subscriptions' : b.plan_type === 'premium' ? 'Premium Plan Subscriptions' : `${b.plan_type.toUpperCase()} Subscriptions`,
    value: `$${Number(b.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    percentage: Math.round((b.amount / totalBreakdownAmount) * 100),
    count: b.count
  })) : [
    { category: 'Premium Subscriptions', value: '$0.00', percentage: 0, count: 0 },
    { category: 'Pro Subscriptions', value: '$0.00', percentage: 0, count: 0 }
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-black tracking-tight text-foreground uppercase">
            Financial Analytics
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Revenue tracking and financial reports
          </p>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
          <div className="text-lg font-bold text-foreground font-mono leading-none">
            ${stats.totalRevenueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">Total Revenue (All-Time)</div>
          <div className="text-[9px] text-emerald-600 dark:text-emerald-500 font-mono mt-1 font-bold">From all payments</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
          <div className="text-lg font-bold text-foreground font-mono leading-none">
            ${stats.thisMonthRevenueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">This Month</div>
          <div className="text-[9px] font-mono mt-1 font-bold flex items-center gap-1">
            {monthlyDiffPercent >= 0 ? (
              <>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-500">+{monthlyDiffPercent.toFixed(1)}% vs last month</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                <span className="text-red-500">{monthlyDiffPercent.toFixed(1)}% vs last month</span>
              </>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
          <div className="text-lg font-bold text-foreground font-mono leading-none">
            ${stats.dailyAverageUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">Avg Daily Revenue</div>
          <div className="text-[9px] text-muted-foreground font-mono mt-1">Calculated from unique payment dates</div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs w-full">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-xs font-mono text-foreground uppercase tracking-wider">Revenue Trend</h2>
        </div>
        <div className="p-6">
          <div className="flex items-end justify-between gap-4 h-48 pt-4">
            {trendData.map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center group h-full justify-end">
                <div 
                  className="w-full bg-gradient-to-t from-primary/80 to-primary rounded-t-sm transition-all duration-300 hover:opacity-90 relative" 
                  style={{ height: `${(data.amount / maxRevenue) * 100}%` }}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-popover border border-border text-[9px] font-mono text-popover-foreground px-1.5 py-0.5 rounded shadow-xs pointer-events-none whitespace-nowrap">
                    ${data.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground font-mono mt-2 uppercase">{data.month}</div>
                <div className="text-[9px] text-foreground font-mono font-semibold">${data.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs w-full">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <PieChart className="w-4 h-4 text-primary" />
          <h2 className="text-xs font-mono text-foreground uppercase tracking-wider">Revenue Breakdown</h2>
        </div>
        <div className="p-5 space-y-4">
          {breakdownItems.map((item, index) => (
            <div key={index} className="border border-border/50 bg-muted/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2 select-none">
                <span className="text-xs font-semibold text-foreground">{item.category} ({item.count} sales)</span>
                <span className="text-xs font-mono font-bold text-primary">{item.value}</span>
              </div>
              <div className="w-full bg-muted border border-border/40 rounded-full h-2">
                <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${item.percentage}%` }}></div>
              </div>
              <div className="text-[10px] text-muted-foreground font-mono mt-1.5">{item.percentage}% of total revenue</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
