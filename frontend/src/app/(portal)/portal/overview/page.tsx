"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useLanguage } from "@/components/providers/language-provider"
import { useAuth } from "@/context/auth-context"
import { api } from "@/lib/api"
import { 
  ArrowUpRight,
  Shield,
  Terminal,
  Activity,
  Package,
  Ticket,
  History
} from "lucide-react"

import { ClientDate } from "@/components/ui/client-date"

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

interface License {
  id: string
  license_key: string
  tier: "free" | "premium" | "pro"
  status: "unused" | "active" | "revoked" | "expired"
  hwid_limit: number
  device_count?: number
  expires_at: string | null
  created_at: string
}

interface ExecStats {
  total: number
  today: number
  history: { date: string; count: number }[]
}

interface ActivityLog {
  id: string
  action: string
  details: Record<string, unknown>
  created_at: string
}

const chartConfig = {
  runs: {
    label: "Runs",
    color: "var(--primary)",
  },
} satisfies ChartConfig

export default function OverviewPage() {
  const { t } = useLanguage()
  const tKey = (key: string) => t(key as Parameters<typeof t>[0])
  const { user, refreshUser } = useAuth()

  const [licenses, setLicenses] = useState<License[]>([])
  const [isLoadingLicenses, setIsLoadingLicenses] = useState(true)
  const [execStats, setExecStats] = useState<ExecStats | null>(null)
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([])

  const loadstring = `_G.ValincKey = "VS-32A8-XXXX"\nloadstring(game:HttpGet("https://api.valinc.xyz/loader.lua"))()`



  useEffect(() => {
    let active = true
    // Refresh user profile for latest balance
    refreshUser().catch(() => {})
    
    // Fetch licenses for slots / active keys calculations
    api.get<{ status: string; data: { licenses: License[] } }>("/v1/licenses/my")
      .then((res) => {
        if (active) {
          setLicenses(res.data.licenses || [])
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) {
          setIsLoadingLicenses(false)
        }
      })
    return () => {
      active = false
    }
  }, [refreshUser])

  // Fetch execution stats
  useEffect(() => {
    let active = true
    api.get<{ status: string; data: ExecStats }>("/v1/executions/stats")
      .then((res) => {
        if (active) {
          setExecStats(res.data || null)
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  // Fetch recent activity
  useEffect(() => {
    let active = true
    api.get<{ status: string; data: { logs: ActivityLog[] } }>("/v1/activity/my?limit=8&offset=0")
      .then((res) => {
        if (active) {
          setRecentActivities(res.data.logs || [])
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const formatActionName = (action: string, details: Record<string, unknown>) => {
    switch (action) {
      case "unlink_device":
        return `Unlinked Device (${details?.roblox_username || "unknown"})`
      case "reset_device_hwid":
        return `Reset HWID (${details?.roblox_username || "unknown"})`
      case "reset_all_devices_hwid":
        return "Reset All Devices"
      case "redeem_code":
        return "Activated License"
      case "claim_voucher":
        return "Claimed Voucher"
      case "create_ticket":
        return "Opened Ticket"
      case "reply_ticket":
        return "Replied to Ticket"
      default:
        return action.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    }
  }

  // Telemetry Chart Data - use real history when available
  const chartData = execStats?.history && execStats.history.length > 0
    ? execStats.history.map(h => ({
        day: new Date(h.date).toLocaleDateString('en-US', { weekday: 'short' }),
        runs: h.count,
      }))
    : [
        { day: "Mon", runs: 0 },
        { day: "Tue", runs: 0 },
        { day: "Wed", runs: 0 },
        { day: "Thu", runs: 0 },
        { day: "Fri", runs: 0 },
        { day: "Sat", runs: 0 },
        { day: "Sun", runs: 0 },
      ]

  const activeDevices = licenses.reduce((sum, l) => sum + (l.device_count || 0), 0)
  const totalSlots = licenses.reduce((sum, l) => sum + l.hwid_limit, 0)
  const utilizationPercent = totalSlots > 0 ? Math.round((activeDevices / totalSlots) * 100) : 0
  const activeKeys = licenses.filter(l => l.status === "active" || l.status === "unused").length

  return (
    <div className="space-y-3 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-row items-center justify-between border-b border-border pb-2.5 gap-2">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-black tracking-tight text-foreground uppercase">
            {t("portalOverview")}
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Identity: <span className="font-mono text-foreground font-bold">{user?.username || user?.name || user?.email || "Guest"}</span> - Access Node: <span className="font-mono text-primary font-bold uppercase">{user?.role ? `${user.role} Access` : "Premium Lifetime"}</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            {tKey("systemOnline")}
          </span>
        </div>
      </div>

      {/* Bento Metrics Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Balance Card */}
        <div className="rounded-lg border border-border bg-card p-3 flex flex-col justify-between gap-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{tKey("accountBalance")}</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              +2.4% this week
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-mono font-black text-foreground tracking-tight">
                {user?.balance !== undefined ? Number(user.balance).toLocaleString("en-US") : "0"}
              </span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">{tKey("credits")}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">{tKey("activeBalanceSub")}</p>
          </div>
        </div>

        {/* Active Keys Card */}
        <div className="rounded-lg border border-border bg-card p-3 flex flex-col justify-between gap-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{tKey("activeKeysCard")}</span>
            <span className="text-[9px] font-mono text-muted-foreground">
              {isLoadingLicenses ? "Loading..." : `${utilizationPercent}% ${tKey("utilized")}`}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-mono font-black text-foreground tracking-tight">
                {isLoadingLicenses ? "-" : `${activeDevices} / ${totalSlots}`}
              </span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">{tKey("slots")}</span>
            </div>
            <div className="w-full bg-secondary h-1.5 rounded-sm overflow-hidden border border-border">
              <div 
                className="bg-primary h-full rounded-sm transition-all duration-300" 
                style={{ width: isLoadingLicenses ? "0%" : `${Math.min(100, utilizationPercent)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pt-1">
              <span>{tKey("activeKeysCard")}: <span className="text-foreground">{isLoadingLicenses ? "-" : activeKeys}</span></span>
              <span>{tKey("totalSlotsLabel")}: <span className="text-foreground">{isLoadingLicenses ? "-" : totalSlots}</span></span>
            </div>
          </div>
        </div>

        {/* Total Executions Card */}
        <div className="rounded-lg border border-border bg-card p-3 flex flex-col justify-between gap-2.5 sm:col-span-2 lg:col-span-1 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{tKey("totalExecutions")}</span>
            <span className="text-[9px] font-mono text-primary font-medium">
              {execStats ? tKey("activeSession") : 'Loading...'}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-black text-foreground tracking-tight">
                {execStats ? Number(execStats.total).toLocaleString('en-US') : '-'}
              </span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">{tKey("runs")}</span>
              {execStats && execStats.today > 0 && (
                <span className="text-[10px] font-mono text-emerald-500 font-medium ml-1">
                  (+{execStats.today.toLocaleString('en-US')} today)
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">{tKey("totalExecutionsSub")}</p>
          </div>
        </div>
      </div>

      {/* Main Splits layout */}
      <div className="grid gap-3 lg:grid-cols-3 items-stretch">
        {/* Left: Execution Analytics (2 columns) */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-3.5 flex flex-col gap-3 shadow-xs min-h-[360px] min-w-0">
          <div className="flex flex-col gap-0.5">
            <h3 className="font-extrabold text-xs text-foreground tracking-tight uppercase">Execution Analytics</h3>
            <p className="text-[11px] text-muted-foreground">Daily script execution trends for the past week</p>
          </div>
          
          {/* Custom Recharts Area Chart */}
          <div className="relative w-full flex-1 bg-muted/20 dark:bg-[#0B0B0C] rounded-lg border border-border p-3.5 select-none min-h-[240px] overflow-hidden">
            <ChartContainer config={chartConfig} className="w-full h-full min-h-[240px]">
              <AreaChart
                accessibilityLayer
                data={chartData}
                margin={{
                  left: 12,
                  right: 12,
                  top: 10,
                  bottom: 0
                }}
              >
                <CartesianGrid 
                  vertical={true}
                  horizontal={true}
                  strokeDasharray="3 3"
                  className="stroke-border/40 dark:stroke-[#1A1A1E]" 
                />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-[9px] font-mono text-muted-foreground/60"
                />
                <ChartTooltip
                  cursor={true}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Area
                  dataKey="runs"
                  type="linear"
                  fill="var(--color-runs)"
                  fillOpacity={0.12}
                  stroke="var(--color-runs)"
                />
              </AreaChart>
            </ChartContainer>
          </div>
        </div>

        {/* Right column: Quick Actions & Telemetry Log */}
        <div className="flex flex-col gap-3">
          {/* Quick Actions Card */}
          <div className="rounded-lg border border-border bg-card p-3.5 flex flex-col gap-3 shadow-xs">
            <h3 className="font-extrabold text-xs text-foreground tracking-tight uppercase">{tKey("quickActions")}</h3>
            


            <div className="flex flex-col gap-2">
              <Link href="/portal/scripts" className="w-full">
                <button className="w-full bg-secondary hover:bg-secondary/85 text-muted-foreground hover:text-foreground text-[11px] font-bold py-2 px-3 border border-border rounded-md flex items-center justify-between transition-colors cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Terminal className="h-3.5 w-3.5" />
                    Script Vault
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                </button>
              </Link>
              <Link href="/portal/license" className="w-full">
                <button className="w-full bg-secondary hover:bg-secondary/85 text-muted-foreground hover:text-foreground text-[11px] font-bold py-2 px-3 border border-border rounded-md flex items-center justify-between transition-colors cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5" />
                    Licenses
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                </button>
              </Link>
              <Link href="/portal/plans" className="w-full">
                <button className="w-full bg-secondary hover:bg-secondary/85 text-muted-foreground hover:text-foreground text-[11px] font-bold py-2 px-3 border border-border rounded-md flex items-center justify-between transition-colors cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Package className="h-3.5 w-3.5" />
                    Plans
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                </button>
              </Link>
              <Link href="/portal/tickets" className="w-full">
                <button className="w-full bg-secondary hover:bg-secondary/85 text-muted-foreground hover:text-foreground text-[11px] font-bold py-2 px-3 border border-border rounded-md flex items-center justify-between transition-colors cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Ticket className="h-3.5 w-3.5" />
                    Tickets
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                </button>
              </Link>
              <Link href="/portal/activity" className="w-full">
                <button className="w-full bg-secondary hover:bg-secondary/85 text-muted-foreground hover:text-foreground text-[11px] font-bold py-2 px-3 border border-border rounded-md flex items-center justify-between transition-colors cursor-pointer">
                  <span className="flex items-center gap-2">
                    <History className="h-3.5 w-3.5" />
                    Activity Logs
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                </button>
              </Link>
            </div>
          </div>

          {/* Recent Activity Telemetry Log Card */}
          <div className="rounded-lg border border-border bg-card p-3.5 flex flex-col gap-3 shadow-xs flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs text-foreground tracking-tight uppercase">{tKey("recentActivity")}</h3>
              <Activity className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
            
            <div className="flex flex-col gap-2">
              {recentActivities.length === 0 ? (
                <div className="text-[11px] text-muted-foreground/60 text-center py-2 italic">
                  No recent activity
                </div>
              ) : (
                recentActivities.map((act, index) => {
                  return (
                    <div key={index} className="flex flex-col gap-0.5 border-b border-border/50 pb-2 last:border-0 last:pb-0">
                      <div className="flex items-baseline justify-between text-[11px]">
                        <span className="text-foreground/90 font-medium truncate pr-4">
                          {formatActionName(act.action, act.details)}
                        </span>
                        <span className="font-mono text-[9px] text-muted-foreground/60 shrink-0">
                          <ClientDate date={act.created_at} format="datetime" />
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
