"use client"

import { Activity, Cpu, HardDrive, Server } from "lucide-react"
import type { BotInstance } from "./types"
import { timeAgo, RECENT_ACTIVITIES } from "./types"
import { activityIcon } from "./icons"

export default function OverviewTab({ instances }: { instances: BotInstance[] }) {
  const online = instances.filter((i) => i.status === "online").length
  const offline = instances.filter((i) => i.status === "offline").length
  const flagged = instances.filter((i) => i.status === "flagged").length
  const total = instances.length

  const cpuUsage = 62
  const ramUsage = 74
  const cpuHistory = [45, 52, 48, 63, 58, 72, 62]
  const ramHistory = [60, 65, 58, 70, 68, 78, 74]

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Overview</h2>
        <p className="text-[11px] text-muted-foreground">Monitor bot instances, system resources, and recent activity.</p>
      </div>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Total Bots</span>
          <span className="text-2xl font-mono font-black text-foreground">{total}</span>
          <span className="text-[9px] text-muted-foreground">Registered instances</span>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Online</span>
          <span className="text-2xl font-mono font-black text-emerald-500">{online}</span>
          <span className="text-[9px] text-emerald-500/70">Active &amp; connected</span>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Offline</span>
          <span className="text-2xl font-mono font-black text-muted-foreground">{offline}</span>
          <span className="text-[9px] text-muted-foreground/70">{offline > 0 ? "Disconnected" : "All connected"}</span>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Flagged</span>
          <span className="text-2xl font-mono font-black text-amber-500">{flagged}</span>
          <span className="text-[9px] text-amber-500/70">Requires attention</span>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-3.5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xs text-foreground tracking-tight uppercase">System Resources</h3>
            <Server className="h-3.5 w-3.5 text-muted-foreground/50" />
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="flex items-center gap-1.5 text-muted-foreground"><Cpu className="h-3 w-3" /> CPU</span>
                <span className="text-foreground font-bold">{cpuUsage}%</span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-sm overflow-hidden border border-border">
                <div className="bg-primary h-full rounded-sm transition-all" style={{ width: `${cpuUsage}%` }} />
              </div>
              <div className="flex items-end gap-[3px] h-6 pt-1">
                {cpuHistory.map((val, i) => (
                  <div key={i} className="flex-1 bg-primary/30 rounded-t-[2px] transition-all" style={{ height: `${(val / 100) * 100}%` }} />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="flex items-center gap-1.5 text-muted-foreground"><HardDrive className="h-3 w-3" /> RAM</span>
                <span className="text-foreground font-bold">{ramUsage}%</span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-sm overflow-hidden border border-border">
                <div className="bg-amber-500 h-full rounded-sm transition-all" style={{ width: `${ramUsage}%` }} />
              </div>
              <div className="flex items-end gap-[3px] h-6 pt-1">
                {ramHistory.map((val, i) => (
                  <div key={i} className="flex-1 bg-amber-500/30 rounded-t-[2px] transition-all" style={{ height: `${(val / 100) * 100}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xs text-foreground tracking-tight uppercase">Recent Activity</h3>
            <Activity className="h-3.5 w-3.5 text-muted-foreground/50" />
          </div>
          <div className="flex flex-col gap-1.5 max-h-[240px] overflow-y-auto no-scrollbar">
            {RECENT_ACTIVITIES.map((act, i) => (
              <div key={i} className="flex items-start gap-2 text-[10px] font-mono border-b border-border/30 pb-1.5 last:border-0">
                <span className="mt-[2px] shrink-0">{activityIcon(act.type)}</span>
                <span className="flex-1 text-foreground/80 leading-tight">{act.message}</span>
                <span className="shrink-0 text-muted-foreground/50">{timeAgo(act.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
