"use client"

import { useState } from "react"
import { Sliders, Globe, Database, Check, Shield, ToggleLeft, ToggleRight } from "lucide-react"

export const SliderField = ({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <label className="text-[10px] font-mono text-muted-foreground">{label}</label>
      <span className="text-[10px] font-mono text-foreground font-bold">{value}{unit}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full accent-primary h-2 bg-secondary rounded-sm appearance-none cursor-pointer" />
  </div>
)

export const ToggleField = ({ label, desc, enabled, onToggle }: { label: string; desc: string; enabled: boolean; onToggle: () => void }) => (
  <div className="flex items-center justify-between gap-3">
    <div className="flex flex-col">
      <span className="text-[10px] font-mono text-foreground">{label}</span>
      <span className="text-[9px] font-mono text-muted-foreground">{desc}</span>
    </div>
    <button onClick={onToggle} className={`shrink-0 p-1 rounded-md transition-all cursor-pointer ${enabled ? "text-emerald-500 bg-emerald-500/10" : "text-muted-foreground bg-muted/20"}`}>
      {enabled ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
    </button>
  </div>
)

export default function GlobalSettingsTab() {
  const [settings, setSettings] = useState({
    pollingRate: 2.5,
    maxConcurrentBots: 10,
    proxyEnabled: true,
    autoReconnect: true,
    telemetryEnabled: true,
    safeMode: false,
    apiEndpoint: "https://api.valinc.xyz/v1",
    heartbeatInterval: 30,
    retryAttempts: 3,
    logRetention: 7,
  })
  const [saved, setSaved] = useState(false)
  const [proxyList, setProxyList] = useState(`socks5://user1:pass1@104.223.122.45:1080\nsocks5://user2:pass2@104.223.122.46:1080\nhttp://proxy3:8080`)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Global Settings</h2>
        <p className="text-[11px] text-muted-foreground">Configure bot behavior, polling intervals, and network preferences.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xs text-foreground tracking-tight uppercase">General Configuration</h3>
            <Sliders className="h-3.5 w-3.5 text-muted-foreground/50" />
          </div>
          <div className="space-y-4">
            <SliderField label="API Polling Rate" value={settings.pollingRate} min={0.5} max={10} step={0.5} unit="s" onChange={(v) => setSettings((s) => ({ ...s, pollingRate: v }))} />
            <SliderField label="Max Concurrent Bots" value={settings.maxConcurrentBots} min={1} max={50} step={1} unit="" onChange={(v) => setSettings((s) => ({ ...s, maxConcurrentBots: v }))} />
            <SliderField label="Heartbeat Interval" value={settings.heartbeatInterval} min={5} max={120} step={5} unit="s" onChange={(v) => setSettings((s) => ({ ...s, heartbeatInterval: v }))} />
            <SliderField label="Max Retry Attempts" value={settings.retryAttempts} min={0} max={10} step={1} unit="" onChange={(v) => setSettings((s) => ({ ...s, retryAttempts: v }))} />
            <SliderField label="Log Retention" value={settings.logRetention} min={1} max={30} step={1} unit=" days" onChange={(v) => setSettings((s) => ({ ...s, logRetention: v }))} />
            <div className="space-y-2.5 pt-1 border-t border-border/40">
              <ToggleField label="Proxy Manager" desc="Route all bot traffic through proxy pool" enabled={settings.proxyEnabled} onToggle={() => setSettings((s) => ({ ...s, proxyEnabled: !s.proxyEnabled }))} />
              <ToggleField label="Auto Reconnect" desc="Automatically reconnect disconnected instances" enabled={settings.autoReconnect} onToggle={() => setSettings((s) => ({ ...s, autoReconnect: !s.autoReconnect }))} />
              <ToggleField label="Telemetry" desc="Send anonymous usage and performance data" enabled={settings.telemetryEnabled} onToggle={() => setSettings((s) => ({ ...s, telemetryEnabled: !s.telemetryEnabled }))} />
              <ToggleField label="Safe Mode" desc="Disable destructive commands, require confirmation" enabled={settings.safeMode} onToggle={() => setSettings((s) => ({ ...s, safeMode: !s.safeMode }))} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs text-foreground tracking-tight uppercase">Proxy Pool</h3>
              <Globe className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
            <textarea value={proxyList} onChange={(e) => setProxyList(e.target.value)} rows={5} className="w-full px-3 py-2 text-[10px] font-mono rounded-md border border-border bg-muted/40 dark:bg-[#070708] text-foreground focus:outline-hidden focus:border-primary/50 leading-normal" placeholder="One proxy per line..." />
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <span>{proxyList.split("\n").filter(Boolean).length} proxies loaded</span>
              <span className="text-emerald-500/70">✓ Pool active</span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-xs text-foreground tracking-tight uppercase">API Configuration</h3>
              <Database className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-mono text-muted-foreground uppercase">Endpoint URL</label>
              <input type="text" value={settings.apiEndpoint} onChange={(e) => setSettings((s) => ({ ...s, apiEndpoint: e.target.value }))} className="w-full px-3 py-2 text-[10px] font-mono rounded-md border border-border bg-muted/40 dark:bg-[#070708] text-foreground focus:outline-hidden focus:border-primary/50" />
            </div>
          </div>

          <button onClick={handleSave} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-mono font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer">
            {saved ? <><Check className="h-3.5 w-3.5" /> Settings Saved</> : <><Shield className="h-3.5 w-3.5" /> Save Configuration</>}
          </button>
        </div>
      </div>
    </div>
  )
}
