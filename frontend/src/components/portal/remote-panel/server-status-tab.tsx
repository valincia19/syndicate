"use client"

import {
  Server,
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  Globe,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Radio,
  ListOrdered,
  HeartPulse,
  Shuffle,
  Send,
  Clock,
  TrendingUp,
} from "lucide-react"
import { useState, useEffect, useCallback } from "react"

// ─── Types ──────────────────────────────────────────────────────────────────

interface PanelService {
  id: string
  name: string
  description: string
  status: "operational" | "degraded" | "down"
  latency: number
  uptime: string
  icon: typeof Server
  lastCheck: Date
  details: string
}

interface HealthMetric {
  label: string
  value: number
  max: number
  unit: string
  color: "emerald" | "amber" | "red" | "primary"
}

interface IncidentEntry {
  time: string
  desc: string
  service: string
  type: "resolved" | "active" | "maintenance"
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const PANEL_SERVICES: PanelService[] = [
  {
    id: "roblox-api",
    name: "Roblox API",
    description: "Connection to Roblox web API for game/player data",
    status: "operational",
    latency: 68,
    uptime: "99.94%",
    icon: Globe,
    lastCheck: new Date(Date.now() - 4000),
    details: "Games API, Users API, Thumbnails - all endpoints reachable",
  },
  {
    id: "ws-relay",
    name: "WebSocket Relay",
    description: "Real-time bidirectional channel between portal and bots",
    status: "operational",
    latency: 12,
    uptime: "99.99%",
    icon: Wifi,
    lastCheck: new Date(Date.now() - 2000),
    details: "32 active connections, 0 reconnect loops",
  },
  {
    id: "command-queue",
    name: "Command Queue",
    description: "Queue pipeline for mass commands and scheduled tasks",
    status: "operational",
    latency: 6,
    uptime: "100%",
    icon: ListOrdered,
    lastCheck: new Date(Date.now() - 3000),
    details: "3 queued, 0 failed, avg process time 240ms",
  },
  {
    id: "bot-heartbeat",
    name: "Bot Heartbeat",
    description: "Health monitoring and keepalive pings for all bot instances",
    status: "degraded",
    latency: 142,
    uptime: "98.70%",
    icon: HeartPulse,
    lastCheck: new Date(Date.now() - 8000),
    details: "2 instances missing heartbeat for >30s",
  },
  {
    id: "proxy-rotation",
    name: "Proxy Rotation",
    description: "Automatic proxy pool rotation for bot traffic",
    status: "operational",
    latency: 24,
    uptime: "99.87%",
    icon: Shuffle,
    lastCheck: new Date(Date.now() - 5000),
    details: "12 proxies active, rotation interval 120s",
  },
  {
    id: "script-delivery",
    name: "Script Delivery",
    description: "Script push and injection pipeline to connected bots",
    status: "operational",
    latency: 34,
    uptime: "99.96%",
    icon: Send,
    lastCheck: new Date(Date.now() - 3000),
    details: "Last push 4m ago, 0 delivery failures",
  },
]

const HEALTH_METRICS: HealthMetric[] = [
  { label: "WS Connections", value: 32, max: 100, unit: "", color: "emerald" },
  { label: "Queue Depth", value: 3, max: 50, unit: "jobs", color: "primary" },
  { label: "Proxy Pool", value: 12, max: 20, unit: "active", color: "emerald" },
  { label: "Heartbeat Miss", value: 2, max: 10, unit: "instances", color: "amber" },
]

const INCIDENTS: IncidentEntry[] = [
  { time: "12:42 UTC", desc: "Bot Heartbeat - 2 instances missed keepalive ping", service: "bot-heartbeat", type: "active" },
  { time: "10:15 UTC", desc: "Proxy Rotation - pool replenished after 2 proxies blacklisted", service: "proxy-rotation", type: "resolved" },
  { time: "Jun 25 22:30", desc: "WebSocket Relay - TLS cert renewed, 0 downtime", service: "ws-relay", type: "maintenance" },
  { time: "Jun 25 18:00", desc: "Command Queue - batch job timeout resolved", service: "command-queue", type: "resolved" },
  { time: "Jun 24 19:45", desc: "Roblox API - rate limit spike normalized after cooldown", service: "roblox-api", type: "resolved" },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function lastCheckAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 10) return "just now"
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ServerStatusTab() {
  const [now, setNow] = useState(new Date())

  const refresh = useCallback(() => setNow(new Date()), [])

  useEffect(() => {
    const timer = setInterval(refresh, 15000)
    return () => clearInterval(timer)
  }, [refresh])

  const operational = PANEL_SERVICES.filter((s) => s.status === "operational").length
  const degraded = PANEL_SERVICES.filter((s) => s.status === "degraded").length
  const down = PANEL_SERVICES.filter((s) => s.status === "down").length
  const total = PANEL_SERVICES.length
  const avgLatency = Math.round(
    PANEL_SERVICES.filter((s) => s.status !== "down").reduce((sum, s) => sum + s.latency, 0) /
    Math.max(PANEL_SERVICES.filter((s) => s.status !== "down").length, 1)
  )

  const overallStatus = down > 0 ? "partial-outage" : degraded > 0 ? "degraded" : "all-operational"

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Remote Panel - Server Status</h2>
        <p className="text-[11px] text-muted-foreground">Real-time health of Remote Panel internal services and infrastructure.</p>
      </div>

      {/* Overall Banner */}
      <div className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
        overallStatus === "all-operational"
          ? "bg-emerald-500/5 border-emerald-500/20"
          : overallStatus === "degraded"
          ? "bg-amber-500/5 border-amber-500/20"
          : "bg-red-500/5 border-red-500/20"
      }`}>
        <div className="flex items-center gap-2.5">
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg select-none ${
            overallStatus === "all-operational"
              ? "bg-emerald-500/10 border border-emerald-500/20"
              : overallStatus === "degraded"
              ? "bg-amber-500/10 border border-amber-500/20"
              : "bg-red-500/10 border border-red-500/20"
          }`}>
            <span className={`h-2 w-2 rounded-full animate-pulse ${
              overallStatus === "all-operational" ? "bg-emerald-500" : overallStatus === "degraded" ? "bg-amber-500" : "bg-red-500"
            }`} />
            <span className={`text-[10px] font-mono font-bold ${
              overallStatus === "all-operational" ? "text-emerald-500" : overallStatus === "degraded" ? "text-amber-500" : "text-red-500"
            }`}>
              {overallStatus === "all-operational" ? "All Systems Operational" : overallStatus === "degraded" ? "Partial Degradation" : "Partial Outage"}
            </span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">
            {operational}/{total} services healthy
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground transition-all cursor-pointer" title="Refresh">
            <RefreshCw className="h-3 w-3" />
          </button>
          <span className="text-[9px] font-mono text-muted-foreground/50">{now.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Operational</span>
          <span className="text-xl font-mono font-black text-emerald-500">{operational}</span>
          <span className="text-[9px] text-emerald-500/70">Services healthy</span>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Degraded</span>
          <span className={`text-xl font-mono font-black ${degraded > 0 ? "text-amber-500" : "text-muted-foreground"}`}>{degraded}</span>
          <span className="text-[9px] text-amber-500/70">{degraded > 0 ? "Needs attention" : "None"}</span>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Down</span>
          <span className={`text-xl font-mono font-black ${down > 0 ? "text-red-500" : "text-muted-foreground"}`}>{down}</span>
          <span className="text-[9px] text-red-500/70">{down > 0 ? "Outage detected" : "None"}</span>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Avg Latency</span>
          <span className={`text-xl font-mono font-black ${avgLatency < 50 ? "text-emerald-500" : avgLatency < 100 ? "text-amber-500" : "text-red-500"}`}>{avgLatency}ms</span>
          <span className="text-[9px] text-muted-foreground">Across active services</span>
        </div>
      </div>

      {/* Service Cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {PANEL_SERVICES.map((svc) => {
          const SvcIcon = svc.icon
          const isOk = svc.status === "operational"
          const isDegraded = svc.status === "degraded"
          const isDown = svc.status === "down"

          return (
            <div key={svc.id} className={`rounded-lg border bg-card p-3.5 flex flex-col gap-3 transition-all duration-200 hover:shadow-xs ${
              isDown ? "border-red-500/30 opacity-60" : isDegraded ? "border-amber-500/30" : "border-border"
            }`}>
              {/* Service Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`p-1.5 rounded-md ${isOk ? "bg-emerald-500/10 text-emerald-500" : isDegraded ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"}`}>
                    <SvcIcon className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-mono font-bold text-foreground">{svc.name}</span>
                    <span className="text-[9px] font-mono text-muted-foreground leading-tight">{svc.description}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`h-2 w-2 rounded-full ${isOk ? "bg-emerald-500 animate-pulse" : isDegraded ? "bg-amber-500 animate-pulse" : "bg-red-500"}`} />
                  {isOk ? (
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  ) : isDegraded ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                  )}
                </div>
              </div>

              {/* Service Details */}
              <div className="text-[9px] font-mono text-muted-foreground/70 bg-muted/30 rounded-md px-2.5 py-1.5 leading-relaxed">
                {svc.details}
              </div>

              {/* Metrics Footer */}
              <div className="flex items-center justify-between text-[9px] font-mono border-t border-border/40 pt-2 gap-2 flex-wrap">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Activity className="h-2.5 w-2.5" />
                  {isDown ? "-" : `${svc.latency}ms`}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <TrendingUp className="h-2.5 w-2.5" />
                  {svc.uptime}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground/50">
                  <Clock className="h-2.5 w-2.5" />
                  {lastCheckAgo(svc.lastCheck)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Health Metrics */}
      <div className="rounded-lg border border-border bg-card p-3.5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-xs text-foreground tracking-tight uppercase">Infrastructure Metrics</h3>
          <Cpu className="h-3.5 w-3.5 text-muted-foreground/50" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HEALTH_METRICS.map((metric) => {
            const pct = Math.round((metric.value / metric.max) * 100)
            const barColor = metric.color === "emerald" ? "bg-emerald-500" : metric.color === "amber" ? "bg-amber-500" : metric.color === "red" ? "bg-red-500" : "bg-primary"
            return (
              <div key={metric.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-[9px] font-mono">
                  <span className="text-muted-foreground">{metric.label}</span>
                  <span className="text-foreground font-bold">{metric.value} <span className="text-muted-foreground/50 font-normal">/ {metric.max} {metric.unit}</span></span>
                </div>
                <div className="w-full bg-secondary h-1.5 rounded-sm overflow-hidden">
                  <div className={`h-full rounded-sm transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Incident History */}
      <div className="rounded-lg border border-border bg-card p-3.5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-xs text-foreground tracking-tight uppercase">Service Incidents</h3>
          <Radio className="h-3.5 w-3.5 text-muted-foreground/50" />
        </div>
        <div className="flex flex-col gap-2">
          {INCIDENTS.map((incident, i) => (
            <div key={i} className="flex items-start gap-2.5 text-[10px] font-mono border-b border-border/30 pb-2 last:border-0 last:pb-0">
              <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                incident.type === "resolved" ? "bg-emerald-500" : incident.type === "active" ? "bg-red-500 animate-pulse" : "bg-blue-500"
              }`} />
              <div className="flex flex-col flex-1">
                <span className="text-foreground/80">{incident.desc}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground/50">{incident.time}</span>
                  <span className="text-muted-foreground/30">•</span>
                  <span className={`${
                    incident.type === "resolved" ? "text-emerald-500/60" : incident.type === "active" ? "text-red-500/60" : "text-blue-500/60"
                  }`}>{incident.type}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
