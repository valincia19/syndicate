"use client"

import { useState, useEffect, useRef } from "react"
import { Play, Pause, Server } from "lucide-react"

export default function BotMonitoringTab() {
  const [isRejoinActive, setIsRejoinActive] = useState(false)
  const [rejoinDelay, setRejoinDelay] = useState(5)
  const [monitoringInterval, setMonitoringInterval] = useState(10)
  const [logs, setLogs] = useState<string[]>(["[07:15:02] Auto Rejoin Module Initialized."])
  const logRef = useRef<HTMLDivElement>(null)

  const addLog = (msg: string) => {
    const t = new Date().toLocaleTimeString()
    setLogs((prev) => [`[${t}] ${msg}`, ...prev.slice(0, 15)])
  }

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = 0 }, [logs])

  const toggleRejoin = () => { const n = !isRejoinActive; setIsRejoinActive(n); addLog(n ? "Monitoring started" : "Monitoring stopped") }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Bot Telemetry &amp; Monitoring</h2>
          <p className="text-[11px] text-muted-foreground">Adjust client polling, rejoin thresholds, and monitor state changes.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-4.5 w-4.5 text-primary shrink-0" />
              <h3 className="text-xs font-mono text-foreground uppercase tracking-wider">Rejoin Module</h3>
            </div>
            <button onClick={toggleRejoin} className={`px-4 py-2 rounded-lg font-mono text-[11px] flex items-center gap-1.5 cursor-pointer ${isRejoinActive ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}>
              {isRejoinActive ? <><Pause className="h-3.5 w-3.5" /> Stop</> : <><Play className="h-3.5 w-3.5" /> Start</>}
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono text-muted-foreground"><span>Rejoin Delay</span><span className="text-foreground">{rejoinDelay}s</span></div>
              <input type="range" min={1} max={30} value={rejoinDelay} onChange={(e) => { setRejoinDelay(Number(e.target.value)); addLog(`Delay: ${e.target.value}s`) }} className="w-full accent-primary bg-secondary h-1.5 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono text-muted-foreground"><span>Interval</span><span className="text-foreground">{monitoringInterval}s</span></div>
              <input type="range" min={5} max={60} value={monitoringInterval} onChange={(e) => { setMonitoringInterval(Number(e.target.value)); addLog(`Interval: ${e.target.value}s`) }} className="w-full accent-primary bg-secondary h-1.5 rounded-lg appearance-none cursor-pointer" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <h3 className="text-xs font-mono text-foreground uppercase tracking-wider">Console</h3>
        <div ref={logRef} className="flex-1 bg-[#070708] rounded-lg border border-border/80 p-3 font-mono text-[9px] leading-relaxed text-muted-foreground overflow-y-auto min-h-[250px] max-h-[350px]">
          {logs.map((log, i) => (<div key={i} className="truncate">{log}</div>))}
        </div>
      </div>
    </div>
  )
}
