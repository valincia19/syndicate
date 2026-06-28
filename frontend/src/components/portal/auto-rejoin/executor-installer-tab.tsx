"use client"

import { useState } from "react"
import { Cpu, Download, Filter, Monitor, Smartphone, X, ShieldCheck, Terminal as TerminalIcon } from "lucide-react"

interface ExecutorItem {
  name: string; status: "Working" | "Updating"; version: string; updated: string; size: string;
  license: "free" | "paid"; devices: ("desktop" | "mobile")[]; icon: React.ComponentType<{ className?: string }>; description: string
}

const EXECUTORS: ExecutorItem[] = [
  { name: "Wave Executor", status: "Working", version: "v2.4.1", updated: "2h ago", size: "14.2 MB", license: "free", devices: ["desktop","mobile"], icon: TerminalIcon, description: "Lightweight executor with broad game compatibility." },
  { name: "Synapse Z", status: "Updating", version: "v1.0.8", updated: "1d ago", size: "22.5 MB", license: "paid", devices: ["desktop"], icon: Cpu, description: "Premium executor with advanced script injection." },
  { name: "Seliware Windows", status: "Working", version: "v4.0.2", updated: "3h ago", size: "11.8 MB", license: "free", devices: ["desktop"], icon: Monitor, description: "Windows-optimized executor with background hooks." },
  { name: "Delta Mobile", status: "Working", version: "v3.2.0", updated: "5h ago", size: "8.4 MB", license: "free", devices: ["mobile"], icon: Smartphone, description: "Mobile-first executor for iPhone/iPad." },
  { name: "Krnl Premium", status: "Working", version: "v5.1.3", updated: "6h ago", size: "18.7 MB", license: "paid", devices: ["desktop","mobile"], icon: ShieldCheck, description: "Cross-platform premium executor with HWID spoofer." },
  { name: "Hydrogen iOS", status: "Working", version: "v2.0.1", updated: "12h ago", size: "9.6 MB", license: "paid", devices: ["mobile"], icon: Smartphone, description: "iOS-exclusive executor with JIT compilation." },
]

interface Props {
  addLog: (msg: string) => void
}

export default function ExecutorInstallerTab({ addLog }: Props) {
  const [licenseFilter, setLicenseFilter] = useState<"all" | "free" | "paid">("all")
  const [deviceFilter, setDeviceFilter] = useState<"all" | "mobile" | "desktop">("all")

  const filtered = EXECUTORS.filter((e) => {
    if (licenseFilter !== "all" && e.license !== licenseFilter) return false
    if (deviceFilter !== "all" && !(e.devices as string[]).includes(deviceFilter)) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Roblox Client Executors</h2>
        <p className="text-[11px] text-muted-foreground">Download and install compatible Roblox executors.</p>
      </div>

      <div className="space-y-2 p-3 bg-muted/20 border border-border/80 rounded-xl">
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-[10px] font-mono text-muted-foreground shrink-0">Filters</span>
          {(licenseFilter !== "all" || deviceFilter !== "all") && (
            <button onClick={() => { setLicenseFilter("all"); setDeviceFilter("all") }} className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono bg-destructive/10 text-destructive hover:bg-destructive/20 ml-auto cursor-pointer">
              <X className="h-2.5 w-2.5" /> Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-muted-foreground shrink-0 w-16">License</span>
          <div className="flex gap-1.5">
            {(["all", "free", "paid"] as const).map((opt) => (
              <button key={opt} onClick={() => setLicenseFilter(opt)} className={`px-2.5 py-1 rounded-md text-[9px] font-mono transition-all cursor-pointer ${licenseFilter === opt ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/40 text-muted-foreground hover:bg-muted/60"}`}>
                {opt === "all" ? "All" : opt === "free" ? "Free" : "Paid"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-muted-foreground shrink-0 w-16">Platform</span>
          <div className="flex gap-1.5">
            {(["all", "desktop", "mobile"] as const).map((opt) => (
              <button key={opt} onClick={() => setDeviceFilter(opt)} className={`px-2.5 py-1 rounded-md text-[9px] font-mono transition-all cursor-pointer ${deviceFilter === opt ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/40 text-muted-foreground hover:bg-muted/60"}`}>
                {opt === "all" ? "All" : opt === "desktop" ? "Desktop" : "Mobile"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="text-[11px] font-mono text-muted-foreground">Showing {filtered.length} of {EXECUTORS.length}</div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((exec, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3.5 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <exec.icon className="h-4 w-4 text-primary shrink-0" />
                  <h3 className="text-xs font-mono font-bold text-foreground">{exec.name}</h3>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono shrink-0 ${exec.status === "Working" ? "bg-emerald-500/8 text-emerald-500/70 border border-emerald-500/15" : "bg-amber-500/8 text-amber-500/70 border border-amber-500/15"}`}>{exec.status}</span>
              </div>
              <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">{exec.description}</p>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-md text-[10px] font-mono font-semibold ${exec.license === "free" ? "bg-emerald-500/8 text-emerald-500/70 border border-emerald-500/15" : "bg-amber-500/8 text-amber-500/70 border border-amber-500/15"}`}>
                  {exec.license === "free" ? "✓ Free" : "$ Paid"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground">Platforms:</span>
                <div className="flex gap-1">
                  {(exec.devices as string[]).includes("desktop") && <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/8 text-blue-500/70 border border-blue-500/15"><Monitor className="h-3 w-3" /><span className="text-[9px] font-mono">Desktop</span></span>}
                  {(exec.devices as string[]).includes("mobile") && <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/8 text-purple-500/70 border border-purple-500/15"><Smartphone className="h-3 w-3" /><span className="text-[9px] font-mono">Mobile</span></span>}
                </div>
              </div>
              <div className="space-y-1 text-[10px] font-mono text-muted-foreground border-t border-border/40 pt-2">
                <div className="flex justify-between"><span>Version:</span><span className="text-foreground">{exec.version}</span></div>
                <div className="flex justify-between"><span>Updated:</span><span className="text-foreground">{exec.updated}</span></div>
                <div className="flex justify-between"><span>Size:</span><span className="text-foreground">{exec.size}</span></div>
              </div>
            </div>
            <button disabled={exec.status !== "Working"} onClick={() => addLog(`Download started for ${exec.name}`)} className="w-full py-2 rounded-lg border border-border bg-muted/40 hover:bg-primary hover:text-primary-foreground hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all text-[10px] font-mono flex items-center justify-center gap-1.5 cursor-pointer">
              <Download className="h-3.5 w-3.5" /> Download Installer
            </button>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="border border-dashed border-border rounded-xl p-12 text-center">
          <Filter className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-xs font-mono text-muted-foreground">No executors match the selected filters.</p>
          <button onClick={() => { setLicenseFilter("all"); setDeviceFilter("all") }} className="mt-3 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-mono text-[10px] hover:opacity-90 cursor-pointer">Clear Filters</button>
        </div>
      )}
    </div>
  )
}
