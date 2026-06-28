"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Play,
  RefreshCw,
  Copy,
  Trash2,
  Zap,
  Terminal,
  Radio,
  ChevronDown,
  Users,
  Bookmark,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { MOCK_INSTANCES } from "./types"
import type { BotInstance } from "./types"

// ─── Types ──────────────────────────────────────────────────────────────────

interface CommandPreset {
  id: string
  label: string
  code: string
  category: "farming" | "utility" | "system"
}

interface OutputLine {
  text: string
  type: "success" | "error" | "warning" | "info" | "system"
  timestamp: Date
}

// ─── Presets ────────────────────────────────────────────────────────────────

const PRESETS: CommandPreset[] = [
  {
    id: "autofarm-start",
    label: "AutoFarm - Start",
    category: "farming",
    code: `_G.Settings = {\n  AutoFarm = true,\n  Teleport = true,\n  AntiIdle = true\n}\n\nloadstring(game:HttpGet("https://cdn.valinc.xyz/scripts/autofarm.lua"))()`,
  },
  {
    id: "autofarm-stop",
    label: "AutoFarm - Stop",
    category: "farming",
    code: `_G.Settings.AutoFarm = false\nprint("[VALINC] AutoFarm stopped")`,
  },
  {
    id: "server-hop",
    label: "Server Hop All",
    category: "utility",
    code: `game:GetService("TeleportService"):Teleport(game.PlaceId, game:GetService("Players").LocalPlayer)`,
  },
  {
    id: "anti-afk",
    label: "Anti-AFK Toggle",
    category: "utility",
    code: `local VU = game:GetService("VirtualUser")\ngame:GetService("Players").LocalPlayer.Idled:Connect(function()\n  VU:CaptureController()\n  VU:ClickButton2(Vector2.new())\nend)\nprint("[VALINC] Anti-AFK enabled")`,
  },
  {
    id: "print-info",
    label: "Print Instance Info",
    category: "system",
    code: `local p = game:GetService("Players").LocalPlayer\nprint("Player:", p.Name)\nprint("PlaceId:", game.PlaceId)\nprint("JobId:", game.JobId)\nprint("Ping:", p:GetNetworkPing() * 1000 .. "ms")`,
  },
  {
    id: "cleanup",
    label: "Memory Cleanup",
    category: "system",
    code: `gcinfo()\ncollectgarbage("collect")\nprint("[VALINC] GC done. Memory:", math.floor(gcinfo()) .. "KB")`,
  },
]

const CATEGORY_COLORS: Record<CommandPreset["category"], string> = {
  farming: "text-emerald-500 bg-emerald-500/10",
  utility: "text-primary bg-primary/10",
  system: "text-amber-500 bg-amber-500/10",
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function MassCommandTab() {
  const [code, setCode] = useState(`-- VALINC Mass Command Interface
_G.Settings = {
  AutoFarm = true,
  Teleport = false,
  AntiIdle = true,
  SafeMode = false
}

for i, v in pairs(game:GetService("Players"):GetChildren()) do
  print("Player:", v.Name, "Ping:", v:GetNetworkPing())
end`)

  const [output, setOutput] = useState<OutputLine[]>([
    { text: "Mass Command interface ready", type: "success", timestamp: new Date() },
    { text: "Waiting for execution...", type: "system", timestamp: new Date() },
  ])
  const outputRef = useRef<HTMLDivElement>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [targetMode, setTargetMode] = useState<"all" | "selected">("all")
  const [selectedBots, setSelectedBots] = useState<Set<string>>(new Set())
  const [showTargetPicker, setShowTargetPicker] = useState(false)

  const onlineBots = MOCK_INSTANCES.filter((b) => b.status === "online")

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight
  }, [output])

  const addOutput = useCallback((text: string, type: OutputLine["type"]) => {
    setOutput((prev) => [...prev, { text, type, timestamp: new Date() }])
  }, [])

  const getTargetCount = useCallback(() => {
    if (targetMode === "all") return onlineBots.length
    return selectedBots.size
  }, [targetMode, selectedBots, onlineBots])

  const getTargetLabel = useCallback(() => {
    if (targetMode === "all") return `ALL (${onlineBots.length} online)`
    return `${selectedBots.size} selected`
  }, [targetMode, selectedBots, onlineBots])

  const executeCommand = useCallback(() => {
    if (!code.trim()) return
    const count = getTargetCount()
    if (count === 0) {
      addOutput("No target instances selected or online", "error")
      return
    }
    setIsExecuting(true)
    addOutput(`Broadcasting to ${count} instance(s)...`, "info")
    addOutput(`Code length: ${code.length} chars`, "system")

    setTimeout(() => {
      const success = count
      const failed = 0
      addOutput(`Execution complete - ${success}/${count} succeeded, ${failed} failed`, success === count ? "success" : "warning")
      setIsExecuting(false)
    }, 1500)
  }, [code, getTargetCount, addOutput])

  const emergencyKill = useCallback(() => {
    addOutput("EMERGENCY KILL ACTIVATED", "error")
    addOutput("Sending terminate signal to all instances...", "warning")
    setTimeout(() => {
      addOutput("All processes terminated successfully", "success")
    }, 1000)
  }, [addOutput])

  const rejoinAll = useCallback(() => {
    const count = getTargetCount()
    addOutput(`Rejoin command dispatched to ${count} instance(s)...`, "info")
    setTimeout(() => {
      addOutput(`Rejoin sent to ${count} instances`, "success")
    }, 800)
  }, [getTargetCount, addOutput])

  const applyPreset = useCallback((preset: CommandPreset) => {
    setCode(preset.code)
    addOutput(`Preset loaded: ${preset.label}`, "system")
    setShowPresets(false)
  }, [addOutput])

  const toggleBot = useCallback((id: string) => {
    setSelectedBots((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const lineCount = code.split("\n").length

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  const outputTypeClass = (type: OutputLine["type"]) => {
    switch (type) {
      case "success": return "text-emerald-500"
      case "error": return "text-red-500"
      case "warning": return "text-amber-500"
      case "info": return "text-primary"
      case "system": return "text-muted-foreground/50"
    }
  }

  const outputTypeSymbol = (type: OutputLine["type"]) => {
    switch (type) {
      case "success": return "✓"
      case "error": return "✗"
      case "warning": return "⚠"
      case "info": return "▶"
      case "system": return "○"
    }
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Mass Command</h2>
        <p className="text-[11px] text-muted-foreground">Broadcast Lua scripts to multiple bot instances simultaneously.</p>
      </div>

      {/* Toolbar */}
      <div className="rounded-lg border border-border bg-card p-3 flex items-center gap-2 flex-wrap">
        {/* Target Picker */}
        <div className="relative">
          <button
            onClick={() => setShowTargetPicker(!showTargetPicker)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-muted/40 text-[10px] font-mono hover:bg-muted/60 transition-all cursor-pointer"
          >
            <Users className="h-3 w-3 text-muted-foreground" />
            <span className="text-foreground font-medium">{getTargetLabel()}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
          {showTargetPicker && (
            <div className="absolute z-50 top-full mt-1 left-0 w-64 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
              <div className="flex border-b border-border">
                <button
                  onClick={() => { setTargetMode("all"); setShowTargetPicker(false) }}
                  className={`flex-1 py-2 text-[10px] font-mono font-bold transition-all cursor-pointer ${targetMode === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  All Online
                </button>
                <button
                  onClick={() => setTargetMode("selected")}
                  className={`flex-1 py-2 text-[10px] font-mono font-bold transition-all cursor-pointer ${targetMode === "selected" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Select Bots
                </button>
              </div>
              {targetMode === "selected" && (
                <div className="max-h-48 overflow-y-auto">
                  {onlineBots.length === 0 ? (
                    <div className="p-3 text-center text-[10px] font-mono text-muted-foreground">No bots online</div>
                  ) : (
                    onlineBots.map((bot) => (
                      <label key={bot.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/30 cursor-pointer border-b border-border/30 last:border-0">
                        <input
                          type="checkbox"
                          checked={selectedBots.has(bot.id)}
                          onChange={() => toggleBot(bot.id)}
                          className="accent-primary h-3.5 w-3.5 cursor-pointer"
                        />
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-[10px] font-mono font-medium text-foreground truncate">{bot.username}</span>
                          <span className="text-[9px] font-mono text-muted-foreground truncate">{bot.game}</span>
                        </div>
                        <span className="text-[9px] font-mono text-muted-foreground">{bot.ping}ms</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-border" />

        {/* Action Buttons */}
        <button
          onClick={executeCommand}
          disabled={isExecuting || !code.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-[10px] font-mono font-bold hover:opacity-90 transition-all disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          <Play className="h-3 w-3" />
          Execute
        </button>
        <button onClick={rejoinAll} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-card text-[10px] font-mono text-foreground hover:bg-muted/40 transition-all cursor-pointer">
          <RefreshCw className="h-3 w-3" />
          Rejoin
        </button>
        <button
          onClick={() => { navigator.clipboard.writeText(code); addOutput("Code copied to clipboard", "success") }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-card text-[10px] font-mono text-foreground hover:bg-muted/40 transition-all cursor-pointer"
        >
          <Copy className="h-3 w-3" />
          Copy
        </button>
        <button onClick={() => setCode("")} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-card text-[10px] font-mono text-muted-foreground hover:bg-muted/40 transition-all cursor-pointer">
          <Trash2 className="h-3 w-3" />
          Clear
        </button>

        <div className="h-5 w-px bg-border" />

        {/* Presets */}
        <div className="relative">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-card text-[10px] font-mono text-foreground hover:bg-muted/40 transition-all cursor-pointer"
          >
            <Bookmark className="h-3 w-3" />
            Presets
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
          {showPresets && (
            <div className="absolute z-50 top-full mt-1 left-0 w-56 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/30 transition-all cursor-pointer border-b border-border/30 last:border-0 text-left"
                >
                  <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${CATEGORY_COLORS[preset.category]}`}>
                    {preset.category}
                  </span>
                  <span className="text-[10px] font-mono text-foreground truncate">{preset.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Emergency Kill - pushed right */}
        <div className="ml-auto">
          <button
            onClick={emergencyKill}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 text-white text-[10px] font-mono font-bold hover:bg-red-700 transition-all cursor-pointer"
          >
            <Zap className="h-3 w-3" />
            Kill All
          </button>
        </div>
      </div>

      {/* Editor + Output */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Code Editor */}
        <div className="rounded-lg border border-border bg-card overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
              <Terminal className="h-3 w-3" />
              Lua Script Editor
            </span>
            <span className="text-[9px] font-mono text-muted-foreground">{lineCount} lines • {code.length} chars</span>
          </div>
          <div className="flex bg-[#0a0a0b] flex-1">
            <div className="select-none text-right px-2 py-3 text-[10px] font-mono text-muted-foreground/30 border-r border-border/20 leading-[1.6] min-w-[32px]">
              {Array.from({ length: Math.max(lineCount, 1) }, (_, i) => (<div key={i}>{i + 1}</div>))}
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex-1 bg-transparent px-3 py-3 text-[10px] font-mono text-foreground leading-[1.6] focus:outline-hidden resize-none placeholder:text-muted-foreground/20"
              spellCheck={false}
              rows={16}
              placeholder="-- Write your Lua script here..."
            />
          </div>
        </div>

        {/* Execution Output */}
        <div className="rounded-lg border border-border bg-card overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
              <Radio className="h-3 w-3" />
              Execution Output
              {isExecuting && <span className="ml-1 text-primary animate-pulse">● live</span>}
            </span>
            <button onClick={() => setOutput([])} className="text-[9px] font-mono text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
              Clear
            </button>
          </div>
          <div ref={outputRef} className="flex-1 min-h-[380px] max-h-[420px] overflow-y-auto p-3 bg-[#0a0a0b] font-mono text-[10px] leading-[1.7] space-y-0.5 no-scrollbar">
            {output.length === 0 ? (
              <span className="text-muted-foreground/30">No output yet.</span>
            ) : (
              output.map((line, i) => (
                <div key={i} className={`flex items-start gap-2 ${outputTypeClass(line.type)}`}>
                  <span className="text-muted-foreground/30 shrink-0">[{formatTime(line.timestamp)}]</span>
                  <span className="shrink-0">{outputTypeSymbol(line.type)}</span>
                  <span>{line.text}</span>
                </div>
              ))
            )}
            {isExecuting && (
              <div className="flex items-center gap-1.5 text-primary mt-1">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Executing...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Command History Summary */}
      <div className="rounded-lg border border-border bg-card p-3.5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-xs text-foreground tracking-tight uppercase">Recent Executions</h3>
          <Clock className="h-3.5 w-3.5 text-muted-foreground/50" />
        </div>
        <div className="flex flex-col gap-2">
          {[
            { time: "13:28:42", script: "AutoFarm - Start", targets: 4, success: 4, failed: 0 },
            { time: "13:15:10", script: "Anti-AFK Toggle", targets: 4, success: 4, failed: 0 },
            { time: "12:58:33", script: "Custom Script (24 lines)", targets: 6, success: 5, failed: 1 },
            { time: "12:42:01", script: "Server Hop All", targets: 3, success: 3, failed: 0 },
            { time: "12:30:15", script: "Print Instance Info", targets: 6, success: 6, failed: 0 },
          ].map((entry, i) => (
            <div key={i} className="flex items-center gap-3 text-[10px] font-mono border-b border-border/30 pb-2 last:border-0 last:pb-0">
              <span className="text-muted-foreground/50 shrink-0">{entry.time}</span>
              <span className="flex-1 text-foreground/80 truncate">{entry.script}</span>
              <span className="flex items-center gap-1 shrink-0 text-muted-foreground">
                <Users className="h-2.5 w-2.5" />
                {entry.targets}
              </span>
              <span className="flex items-center gap-1 shrink-0 text-emerald-500">
                <CheckCircle className="h-2.5 w-2.5" />
                {entry.success}
              </span>
              {entry.failed > 0 && (
                <span className="flex items-center gap-1 shrink-0 text-red-500">
                  <XCircle className="h-2.5 w-2.5" />
                  {entry.failed}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
