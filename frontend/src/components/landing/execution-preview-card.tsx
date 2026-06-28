"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  Gauge, Zap, Cpu, Timer, CheckCircle2,
  TrendingUp, Play, Orbit, Radio, Crosshair,
  Target, ScanLine, Satellite, Radar
} from "lucide-react"

const GOLD = "oklch(0.78 0.14 65)"
const ACCENT = "oklch(0.78 0.14 65)"
const DIM = "oklch(0.55 0 0)"
const GREEN = "oklch(0.72 0.19 150)"
const AMBER = "oklch(0.79 0.15 85)"

const orbitStats = [
  { label: "Inject", value: "0.42ms", icon: Zap, color: ACCENT },
  { label: "Success", value: "99.7%", icon: Target, color: GREEN },
  { label: "Throughput", value: "18.4K/s", icon: TrendingUp, color: GOLD },
  { label: "Overhead", value: "0.08ms", icon: Timer, color: AMBER },
]

const stages = [
  { label: "Parse", time: "0.00ms", icon: ScanLine },
  { label: "Compile", time: "+0.12ms", icon: Cpu },
  { label: "VM Init", time: "+0.28ms", icon: Orbit },
  { label: "Inject", time: "+0.36ms", icon: Radio },
  { label: "Execute", time: "+0.42ms", icon: Play },
]

const logEntries = [
  "[CORE] Initializing VALINC Syndicate Engine core v3.2...",
  "[CORE] Zero-lag memory manager engaged successfully.",
  "[MEM]  Scanning Roblox client process memory space...",
  "[MEM]  Found target module 'RobloxPlayerBeta.exe' (PID: 10484).",
  "[BYP]  Analyzing Byfron/Hyperion anti-cheat context...",
  "[BYP]  Bypassing page protection checks - Spoofing stack frame...",
  "[BYP]  Heuristics engine successfully masked. Integrity: 100%.",
  "[VM]   Allocating secure virtual memory page at 0x7FFD128A00...",
  "[VM]   Initializing custom Luau execution runtime environment...",
  "[COMP] Compiling target Luau bytecode (Size: 4.87 KB)...",
  "[COMP] Bytecode optimization complete - 0.01ms compilation time.",
  "[INJ]  Injecting bytecode payload into Luau scheduler...",
  "[INJ]  Hijacking task scheduler queue entry for script execution...",
  "[EXEC] Inject completed successfully in 0.36ms.",
  "[VM]   Luau script VM started execution cycle...",
  "[EXEC] Script execution completed successfully - 0.42ms total.",
]

function RadarSweep() {
  const [angle, setAngle] = useState(0)
  const [blips, setBlips] = useState<{ x: number; y: number; size: number; color: string }[]>([])

  useEffect(() => {
    const interval = setInterval(() => setAngle((a) => (a + 1.5) % 360), 30)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      if (Math.random() > 0.4) {
        const radius = 10 + Math.random() * 26
        const theta = Math.random() * 2 * Math.PI
        setBlips((prev) => [
          ...prev.slice(-6),
          {
            x: 50 + radius * Math.cos(theta),
            y: 50 + radius * Math.sin(theta),
            size: 2.5 + Math.random() * 3,
            color: [ACCENT, GOLD, GREEN][Math.floor(Math.random() * 3)],
          },
        ])
      }
    }, 700)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="relative w-full h-full flex items-center justify-center border border-zinc-800/40 rounded-xl bg-zinc-950/40 p-4 overflow-hidden select-none">
      {/* Sci-fi Corner Brackets */}
      <div className="absolute top-2 left-2 w-3 h-3 border-t border-l border-zinc-700/60 rounded-tl" />
      <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-zinc-700/60 rounded-tr" />
      <div className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-zinc-700/60 rounded-bl" />
      <div className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-zinc-700/60 rounded-br" />

      {/* Axis Lines */}
      <div className="absolute w-[80%] h-[1px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ background: `linear-gradient(90deg, transparent, ${ACCENT}33, transparent)` }} />
      <div className="absolute h-[80%] w-[1px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ background: `linear-gradient(180deg, transparent, ${ACCENT}33, transparent)` }} />

      {/* Rings */}
      {[0.25, 0.5, 0.75, 1].map((s, i) => (
        <div 
          key={i} 
          className="absolute rounded-full border -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2" 
          style={{ 
            width: `${s * 80}%`, 
            height: `${s * 80}%`, 
            borderColor: i === 3 ? `${ACCENT}44` : `${ACCENT}15`,
            borderStyle: i % 2 === 1 ? 'dashed' : 'solid'
          }} 
        />
      ))}

      {/* Conic Gradient Sweep */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[80%] aspect-square relative rounded-full overflow-hidden">
          <div 
            className="absolute inset-0" 
            style={{ 
              background: `conic-gradient(from ${angle - 90}deg, transparent, ${ACCENT}22 90deg, transparent 91deg)` 
            }} 
          />
        </div>
      </div>

      {/* Real-time Blips */}
      {blips.map((b, i) => (
        <div key={i} className="absolute pointer-events-none" style={{ left: `${b.x}%`, top: `${b.y}%` }}>
          <div className="absolute rounded-full animate-ping" style={{ width: b.size * 3, height: b.size * 3, transform: "translate(-50%, -50%)", background: b.color, boxShadow: `0 0 8px ${b.color}`, animationDuration: "2s" }} />
          <div className="absolute rounded-full" style={{ width: b.size, height: b.size, transform: "translate(-50%, -50%)", background: b.color }} />
        </div>
      ))}

      {/* Rotating Sweep Line */}
      <div 
        className="absolute top-1/2 left-1/2 w-[1px] h-[40%] origin-bottom pointer-events-none" 
        style={{ 
          transform: `translate(-50%, -100%) rotate(${angle}deg)`, 
          background: `linear-gradient(to top, ${ACCENT}, transparent)`, 
          boxShadow: `0 0 6px ${ACCENT}` 
        }} 
      />

      {/* Central Radar Lock Icon */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center">
        <div className="rounded-full w-7 h-7 bg-zinc-950/90 border border-zinc-800 flex items-center justify-center shadow-md">
          <Radar size={12} style={{ color: ACCENT }} className="animate-pulse" />
        </div>
      </div>
    </div>
  )
}

function TerminalStream({ step }: { step: number }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [step])

  return (
    <div ref={containerRef} className="font-mono text-[10px] sm:text-[11px] leading-4 sm:leading-5 h-full overflow-y-auto pr-1.5 scrollbar-none">
      {logEntries.slice(0, step).map((line, i) => {
        const isHighlight = i === step - 1
        const color = isHighlight ? GOLD : DIM
        return (
          <div key={i} className="truncate transition-colors duration-150" style={{ color }}>
            <span style={{ color: GOLD, opacity: 0.6 }}>{`${i + 1}`.padStart(2, "0")}</span>
            <span className="mx-1.5" style={{ color: DIM, opacity: 0.4 }}>|</span>
            {line}
          </div>
        )
      })}
      {step < logEntries.length && <span className="animate-pulse" style={{ color: GOLD }}>█</span>}
    </div>
  )
}

export function ExecutionPreviewCard() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s < logEntries.length ? s + 1 : 0))
    }, 450)
    return () => clearInterval(interval)
  }, [])

  const activeStageIndex = 
    step < 2 ? -1 :
    step < 6 ? 0 :
    step < 9 ? 1 :
    step < 13 ? 2 :
    step < 15 ? 3 : 4

  return (
    <div className="relative w-full h-full bg-zinc-950 text-zinc-100 flex flex-col p-4 sm:p-6 select-none overflow-hidden font-sans">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.005)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.005)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-40" />

      {/* Ambient glows */}
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-[oklch(0.78_0.14_65/0.04)] blur-[90px]" />

      <div className="relative z-10 h-full flex flex-col min-h-0 justify-between">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-900/90 border border-zinc-800 shrink-0">
              <Gauge size={16} style={{ color: GOLD }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-zinc-100 uppercase font-mono">Next-Gen Execution Engine</h3>
              <p className="text-[10px] text-zinc-400 hidden sm:block">Zero-lag, lightweight executor optimized for instant script injection</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-medium bg-zinc-900/80 border border-zinc-800 text-emerald-400 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            ONLINE
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3.5 min-h-0 mb-3">
          
          {/* Radar Telemetry Panel (Left) */}
          <div className="md:col-span-6 rounded-xl border border-zinc-800/80 bg-zinc-900/30 flex flex-col relative overflow-hidden p-3.5 min-h-[220px]">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-zinc-800/40 shrink-0">
              <div className="flex items-center gap-1.5">
                <Radar size={12} style={{ color: GOLD }} />
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-400">Telemetry Grid</span>
              </div>
              <span className="text-[9px] font-mono text-zinc-500">LATENCY: 0.42ms</span>
            </div>
            
            <div className="flex-1 relative min-h-0 flex items-center justify-center">
              <RadarSweep />
            </div>

            <div className="grid grid-cols-2 gap-1.5 mt-2.5 shrink-0">
              {orbitStats.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-900/50 border border-zinc-800/60">
                  <s.icon size={10} style={{ color: s.color }} />
                  <span className="text-[10px] font-mono font-bold" style={{ color: s.color }}>{s.value}</span>
                  <span className="text-[8px] text-zinc-500 truncate">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Execution Log Terminal & Pipeline (Right) */}
          <div className="md:col-span-6 flex flex-col gap-3 min-h-[220px] min-w-0">
            {/* Terminal */}
            <div className="flex-1 rounded-xl p-3.5 flex flex-col min-h-0 border border-zinc-800/80 bg-zinc-900/30 overflow-hidden">
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-zinc-800/40 shrink-0">
                <div className="flex items-center gap-1.5">
                  <Satellite size={12} style={{ color: DIM }} />
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-400">Execution Log</span>
                </div>
                <span className="text-[9px] font-mono text-emerald-400">BYPASS: OK</span>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <TerminalStream step={step} />
              </div>
            </div>

            {/* Pipeline */}
            <div className="shrink-0 rounded-xl p-3 border border-zinc-800/80 bg-zinc-900/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Crosshair size={12} style={{ color: GOLD }} />
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-400">Pipeline Stage</span>
                </div>
                <span className="text-[9px] font-mono text-zinc-400">{activeStageIndex >= 0 ? stages[activeStageIndex].label : "PENDING"}</span>
              </div>
              <div className="flex items-center justify-between px-1">
                {stages.map((s, idx) => {
                  const isCompleted = idx < activeStageIndex
                  const isActive = idx === activeStageIndex
                  const color = (isCompleted || isActive) ? GOLD : DIM
                  const opacity = idx > activeStageIndex ? 0.35 : 1

                  return (
                    <div key={idx} className="flex flex-col items-center transition-all duration-200" style={{ opacity }}>
                      <div 
                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${isActive ? "animate-pulse" : ""}`} 
                        style={{ 
                          background: isActive ? `${GOLD}22` : "transparent", 
                          border: `1px solid ${color}`,
                          boxShadow: isActive ? `0 0 8px ${GOLD}` : "none"
                        }}
                      >
                        <s.icon size={9} style={{ color }} />
                      </div>
                      <span className="text-[8px] font-mono mt-1" style={{ color }}>{s.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Footer Stats */}
        <div className="pt-2.5 border-t border-zinc-800/60 flex items-center justify-between shrink-0 font-mono text-[10px]">
          <div className="flex items-center gap-4 text-zinc-400">
            <div className="flex items-center gap-1.5">
              <Zap size={11} style={{ color: GOLD }} />
              <span>LATENCY: <strong className="text-zinc-200">0.42ms</strong></span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <CheckCircle2 size={11} className="text-emerald-400" />
              <span>SUCCESS: <strong className="text-zinc-200">99.7%</strong></span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-500 text-[9px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>LUAU_VM_READY</span>
          </div>
        </div>

      </div>
    </div>
  )
}
