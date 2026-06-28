'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { PieChart } from 'lucide-react'

export default function OwnerFinancePage() {
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

  const revenueData = [
    { month: 'Jan', amount: 18500, status: 'complete' },
    { month: 'Feb', amount: 21200, status: 'complete' },
    { month: 'Mar', amount: 19800, status: 'complete' },
    { month: 'Apr', amount: 23500, status: 'complete' },
    { month: 'May', amount: 22100, status: 'complete' },
    { month: 'Jun', amount: 24850, status: 'current' }
  ]

  const maxRevenue = Math.max(...revenueData.map(d => d.amount))

  const breakdown = [
    { category: 'Premium Subscriptions', value: '$18,200', percentage: 73 },
    { category: 'Standard Subscriptions', value: '$4,500', percentage: 18 },
    { category: 'One-time Purchases', value: '$2,150', percentage: 9 }
  ]

  if (isLoading || !mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground font-mono text-xs animate-pulse">Loading financial reports...</div>
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
            Financial Analytics
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Revenue tracking and financial reports
          </p>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
          <div className="text-lg font-bold text-foreground font-mono leading-none">$129,950</div>
          <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">Total Revenue (YTD)</div>
          <div className="text-[9px] text-emerald-600 dark:text-emerald-500 font-mono mt-1 font-bold">+8.7% vs last year</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
          <div className="text-lg font-bold text-foreground font-mono leading-none">$24,850</div>
          <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">This Month</div>
          <div className="text-[9px] text-[#FF6B35] font-mono mt-1 font-bold">+12.5% vs last month</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs">
          <div className="text-lg font-bold text-foreground font-mono leading-none">$828</div>
          <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">Avg Daily Revenue</div>
          <div className="text-[9px] text-muted-foreground font-mono mt-1">From all active sources</div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs w-full">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-xs font-mono text-foreground uppercase tracking-wider">6-Month Revenue Trend</h2>
        </div>
        <div className="p-6">
          <div className="flex items-end justify-between gap-4 h-48 pt-4">
            {revenueData.map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center group h-full justify-end">
                <div 
                  className="w-full bg-gradient-to-t from-primary/80 to-primary rounded-t-sm transition-all duration-300 hover:opacity-90 relative" 
                  style={{ height: `${(data.amount / maxRevenue) * 100}%` }}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-popover border border-border text-[9px] font-mono text-popover-foreground px-1.5 py-0.5 rounded shadow-xs pointer-events-none whitespace-nowrap">
                    ${(data.amount).toLocaleString()}
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground font-mono mt-2 uppercase">{data.month}</div>
                <div className="text-[9px] text-foreground font-mono font-semibold">${(data.amount / 1000).toFixed(1)}k</div>
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
          {breakdown.map((item, index) => (
            <div key={index} className="border border-border/50 bg-muted/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2 select-none">
                <span className="text-xs font-semibold text-foreground">{item.category}</span>
                <span className="text-xs font-mono font-bold text-primary">{item.value}</span>
              </div>
              <div className="w-full bg-muted border border-border/40 rounded-full h-2">
                <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${item.percentage}%` }}></div>
              </div>
              <div className="text-[10px] text-muted-foreground font-mono mt-1.5">{item.percentage}% of monthly total</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
