"use client"

import { useState, useEffect, useRef } from "react"
import { Terminal } from "lucide-react"
import { logLevelIcon } from "./icons"
import type { LogEntry } from "./types"

const MOCK_LOGS: LogEntry[] = Array.from({ length: 50 }, (_, i) => ({
  id: `log-${i}`,
  level: (["INFO", "INFO", "INFO", "WARN", "ERROR"] as const)[Math.floor(Math.random() * 5)],
  message: [
    "Execution completed successfully on instance bot-1",
    "AutoFarm module initialized for Blox Fruits",
    "HWID verification passed for device PC-01",
    "WebSocket connection established (latency: 42ms)",
    "Execution queue flushed: 3 pending scripts cleared",
    "Instance bot-3 flagged: high memory usage (412MB)",
    "Script 'Valinc Hub v3.2.1' loaded into memory",
    "Anti-detection routine activated",
    "Connection timeout: retry attempt 2/3",
    "Rate limit approaching: 82/100 requests this window",
  ][Math.floor(Math.random() * 10)],
  timestamp: new Date(Date.now() - Math.floor(Math.random() * 86400000)),
  source: ["system", "executor", "network", "security"][Math.floor(Math.random() * 4)],
})).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

export default function ExecutionLogsTab() {
  const [logs] = useState(MOCK_LOGS)
  const [filterLevel, setFilterLevel] = useState<"ALL" | "INFO" | "WARN" | "ERROR">("ALL")
  const logContainerRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [isLive, setIsLive] = useState(false)

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== "ALL" && log.level !== filterLevel) return false
    return true
  })

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [filteredLogs, autoScroll])

  const levelBtn = (level: typeof filterLevel) => {
    const active = filterLevel === level
    const colorClass = level === "INFO" ? "bg-primary/15 text-primary border-primary/30"
      : level === "WARN" ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
      : level === "ERROR" ? "bg-red-500/15 text-red-500 border-red-500/30"
      : "bg-primary text-primary-foreground border-transparent"
    return (
      <button onClick={() => setFilterLevel(level)} className={`px-2.5 py-1 rounded-md text-[10px] font-mono transition-all cursor-pointer ${
        active ? colorClass : "bg-muted/20 text-muted-foreground hover:text-foreground border border-transparent"
      }`}>
        {level === "ALL" ? "All" : level}
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Execution Logs</h2>
        <p className="text-[11px] text-muted-foreground">View and filter bot execution logs with real-time streaming.</p>
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          {levelBtn("ALL")}
          {levelBtn("INFO")}
          {levelBtn("WARN")}
          {levelBtn("ERROR")}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground cursor-pointer select-none">
            <input type="checkbox" checked={isLive} onChange={(e) => setIsLive(e.target.checked)} className="rounded border-border accent-primary h-3 w-3 cursor-pointer" />
            Live
          </label>
          <button onClick={() => setAutoScroll(!autoScroll)} className={`text-[9px] font-mono px-2 py-1 rounded-md border transition-all cursor-pointer ${autoScroll ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
            Auto-scroll {autoScroll ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
          <span className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
            <Terminal className="h-3 w-3" />
            Execution Log Stream
          </span>
          <div className="flex items-center gap-3 text-[9px] font-mono text-muted-foreground">
            <span>{filteredLogs.length} entries</span>
            <span className="text-emerald-500/70">● Connected</span>
          </div>
        </div>

        <div ref={logContainerRef} className="h-[400px] overflow-y-auto bg-[#0a0a0b]">
          {filteredLogs.length === 0 ? (
            <div className="p-6 text-center text-[10px] font-mono text-muted-foreground/50">No logs match the current filter.</div>
          ) : (
            <table className="w-full text-[10px] font-mono">
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-border/10 hover:bg-muted/5 transition-colors">
                    <td className="py-1.5 px-3 w-14 select-none">
                      <span className={`inline-flex items-center gap-1 ${
                        log.level === "INFO" ? "text-primary" : log.level === "WARN" ? "text-amber-500" : "text-red-500"
                      }`}>
                        {logLevelIcon(log.level)}
                        <span className="text-[9px] font-bold">{log.level}</span>
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-muted-foreground/60 select-none w-20">{log.timestamp.toLocaleTimeString()}</td>
                    <td className="py-1.5 px-2 text-foreground/80">{log.message}</td>
                    <td className="py-1.5 px-3 text-right text-muted-foreground/40 w-16 select-none">{log.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
