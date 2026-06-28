"use client"

import React, { useState, useEffect, useRef, memo } from "react"
import {
  Gauge, Zap, Cpu, Timer, CheckCircle2,
  TrendingUp, Play, Orbit, Radio, Crosshair,
  Target, ScanLine, Satellite, Radar,
  Shield, Hexagon, Siren, CircleDot, Diamond, Square,
  ShieldAlert, ShieldCheck, Activity, Settings, Bell, BarChart3, RefreshCw, X,
  MessageCircle, Link2, Users, Key, Server, UserCheck, Globe, ChevronRight, Clock
} from "lucide-react"

// ─── Shared Theme Constants ───
const GOLD = "oklch(0.78 0.14 65)"
const ACCENT = "oklch(0.78 0.14 65)"
const DIM = "oklch(0.55 0 0)"
const GREEN = "oklch(0.72 0.19 150)"
const AMBER = "oklch(0.79 0.15 85)"

// ─── Scaled Wrapper Component (Optimized with requestAnimationFrame throttling) ───
const ScaledContainer = memo(function ScaledContainer({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.4)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let animationFrameId: number

    const updateScale = () => {
      animationFrameId = requestAnimationFrame(() => {
        const w = el.clientWidth
        const h = el.clientHeight
        if (w > 0 && h > 0) {
          const scaleX = w / 1920
          const scaleY = h / 1080
          const calculatedScale = Math.min(scaleX, scaleY)
          setScale((prevScale) => (Math.abs(prevScale - calculatedScale) > 0.001 ? calculatedScale : prevScale))
        }
      })
    }

    updateScale()

    const observer = new ResizeObserver(() => {
      updateScale()
    })
    observer.observe(el)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center overflow-hidden bg-zinc-950 select-none">
      <div
        className="origin-center flex-shrink-0 transition-transform duration-150 ease-out"
        style={{
          transform: `scale(${scale})`,
          width: "1920px",
          height: "1080px",
          willChange: "transform",
        }}
      >
        {children}
      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(18, 18, 20, 0.6);
          border-radius: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(63, 63, 70, 0.7);
          border-radius: 6px;
          border: 1px solid rgba(24, 24, 27, 0.8);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: oklch(0.78 0.14 65 / 0.8);
        }
      `}</style>
    </div>
  )
})

// ============================================================================
// 1. HERO 1: NEXT-GEN EXECUTION PREVIEW
// ============================================================================
const hero1OrbitStats = [
  { label: "Inject", value: "0.42ms", icon: Zap, color: ACCENT },
  { label: "Success", value: "99.7%", icon: Target, color: GREEN },
  { label: "Throughput", value: "18.4K/s", icon: TrendingUp, color: GOLD },
  { label: "Overhead", value: "0.08ms", icon: Timer, color: AMBER },
]

const hero1Stages = [
  { label: "Parse", time: "0.00ms", icon: ScanLine },
  { label: "Compile", time: "+0.12ms", icon: Cpu },
  { label: "VM Init", time: "+0.28ms", icon: Orbit },
  { label: "Inject", time: "+0.36ms", icon: Radio },
  { label: "Execute", time: "+0.42ms", icon: Play },
]

const hero1LogEntries = [
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

const Hero1RadarSweep = memo(function Hero1RadarSweep({ isActive = true }: { isActive?: boolean }) {
  const [angle, setAngle] = useState(0)
  const [blips, setBlips] = useState<{ x: number; y: number; size: number; color: string }[]>([])

  useEffect(() => {
    if (!isActive) return
    const interval = setInterval(() => setAngle((a) => (a + 1.5) % 360), 30)
    return () => clearInterval(interval)
  }, [isActive])

  useEffect(() => {
    if (!isActive) return
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
  }, [isActive])

  return (
    <div className="relative w-full h-full flex items-center justify-center border border-zinc-800/40 rounded-xl bg-zinc-950/40 p-6 overflow-hidden select-none">
      <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t border-l border-zinc-700/60 rounded-tl" />
      <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t border-r border-zinc-700/60 rounded-tr" />
      <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b border-l border-zinc-700/60 rounded-bl" />
      <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b border-r border-zinc-700/60 rounded-br" />

      <div className="absolute w-[80%] h-[1px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ background: `linear-gradient(90deg, transparent, ${ACCENT}33, transparent)` }} />
      <div className="absolute h-[80%] w-[1px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ background: `linear-gradient(180deg, transparent, ${ACCENT}33, transparent)` }} />

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

      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[80%] aspect-square relative rounded-full overflow-hidden">
          <div className="absolute inset-0" style={{ background: `conic-gradient(from ${angle - 90}deg, transparent, ${ACCENT}22 90deg, transparent 91deg)` }} />
        </div>
      </div>

      {blips.map((b, i) => (
        <div key={i} className="absolute pointer-events-none" style={{ left: `${b.x}%`, top: `${b.y}%` }}>
          <div className="absolute rounded-full animate-ping" style={{ width: b.size * 3.5, height: b.size * 3.5, transform: "translate(-50%, -50%)", background: b.color, boxShadow: `0 0 10px ${b.color}`, animationDuration: "2s" }} />
          <div className="absolute rounded-full" style={{ width: b.size, height: b.size, transform: "translate(-50%, -50%)", background: b.color }} />
        </div>
      ))}

      <div 
        className="absolute top-1/2 left-1/2 w-[1px] h-[40%] origin-bottom pointer-events-none" 
        style={{ transform: `translate(-50%, -100%) rotate(${angle}deg)`, background: `linear-gradient(to top, ${ACCENT}, transparent)`, boxShadow: `0 0 8px ${ACCENT}` }} 
      />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center">
        <div className="rounded-full w-8 h-8 bg-zinc-950/80 border border-zinc-800 flex items-center justify-center shadow-lg">
          <Radar size={13} style={{ color: ACCENT }} className="animate-pulse" />
        </div>
      </div>
    </div>
  )
})

const Hero1TerminalStream = memo(function Hero1TerminalStream({ step }: { step: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight
  }, [step])

  return (
    <div ref={containerRef} className="font-mono text-[11px] leading-5 h-full overflow-y-auto pr-2 custom-scrollbar select-none">
      {hero1LogEntries.slice(0, step).map((line, i) => (
        <div key={i} className="truncate transition-colors duration-150" style={{ color: i === step - 1 ? GOLD : DIM }}>
          <span style={{ color: GOLD, opacity: 0.6 }}>{`${i + 1}`.padStart(2, "0")}</span>
          <span className="mx-2" style={{ color: DIM, opacity: 0.4 }}>|</span>
          {line}
        </div>
      ))}
      {step < hero1LogEntries.length && <span className="animate-pulse" style={{ color: GOLD }}>█</span>}
    </div>
  )
})

export const Hero1Showcase = memo(function Hero1Showcase({ isActive = true }: { isActive?: boolean }) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!isActive) return
    const interval = setInterval(() => setStep((s) => (s < hero1LogEntries.length ? s + 1 : 0)), 450)
    return () => clearInterval(interval)
  }, [isActive])

  const activeStageIndex = step < 2 ? -1 : step < 6 ? 0 : step < 9 ? 1 : step < 13 ? 2 : step < 15 ? 3 : 4

  return (
    <ScaledContainer>
      <div className="relative w-[1920px] h-[1080px] overflow-hidden rounded-[20px] border border-zinc-800 bg-zinc-900/60 shadow-2xl flex-shrink-0 select-none font-sans">
        <div className="relative z-10 h-full flex flex-col p-10 justify-between">
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-zinc-900/80 border border-zinc-800">
                <Gauge size={20} style={{ color: GOLD }} />
              </div>
              <div>
                <h1 className="text-2xl font-normal tracking-tight text-zinc-100 uppercase font-mono">Next-Gen Execution Engine</h1>
                <p className="text-xs text-zinc-500">Lightweight executor with zero lag, optimized for instant script injection and blazing-fast runtime performance.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900/80 border border-zinc-800 text-emerald-400 font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              ONLINE
            </div>
          </div>

          <div className="flex-1 flex items-stretch gap-6 min-h-0">
            <div className="flex-shrink-0 w-[55%] h-full rounded-2xl border border-zinc-800 bg-zinc-900/40 flex items-center justify-center relative p-8">
              <div className="absolute top-0 left-0 right-0 h-10 border-b border-zinc-800/40 bg-zinc-900/20 rounded-t-2xl px-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radar size={13} style={{ color: GOLD }} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 font-mono">Core Telemetry & Thread Grid</span>
                </div>
                <span className="text-[9px] font-mono text-zinc-500">SYSTEM: ACTIVE</span>
              </div>
              <div className="relative w-[65%] aspect-square"><Hero1RadarSweep isActive={isActive} /></div>
              {hero1OrbitStats.map((s, i) => {
                const a = (i * 90 + 45) * (Math.PI / 180)
                const r = 38
                return (
                  <div key={i} className="absolute flex items-center gap-2" style={{ left: `calc(50% + ${r * Math.cos(a)}%)`, top: `calc(50% + ${r * Math.sin(a)}%)`, transform: "translate(-50%, -50%)" }}>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg backdrop-blur-sm bg-zinc-900/40 border border-zinc-800">
                      <s.icon size={11} style={{ color: s.color }} />
                      <span className="text-xs font-bold font-mono" style={{ color: s.color }}>{s.value}</span>
                      <span className="text-[9px] text-zinc-500 font-mono">{s.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex-1 flex flex-col gap-5 h-full min-w-0">
              <div className="flex-1 rounded-2xl p-5 flex flex-col min-h-0 border border-zinc-800 bg-zinc-900/40">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/40 shrink-0 font-mono">
                  <div className="flex items-center gap-2">
                    <Satellite size={13} style={{ color: DIM }} />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Execution Log</span>
                  </div>
                  <span className="text-[9px] text-emerald-400">BYPASS: OK</span>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <Hero1TerminalStream step={step} />
                </div>
              </div>

              <div className="flex-shrink-0 rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40">
                <div className="flex items-center justify-between mb-5 shrink-0 font-mono">
                  <div className="flex items-center gap-2">
                    <Crosshair size={13} style={{ color: GOLD }} />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Injection Pipeline</span>
                  </div>
                  <span className="text-[9px] text-zinc-500">CYCLE: {activeStageIndex >= 0 ? hero1Stages[activeStageIndex].label : "PENDING"}</span>
                </div>
                <div className="flex items-center">
                  {hero1Stages.map((s, idx) => {
                    const isCompleted = idx < activeStageIndex
                    const isActiveStage = idx === activeStageIndex
                    const color = (isCompleted || isActiveStage) ? GOLD : DIM
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center relative transition-all duration-300" style={{ opacity: idx > activeStageIndex ? 0.35 : 1 }}>
                        <div className={`relative z-10 w-[24px] h-[24px] rounded-full flex items-center justify-center ${isActiveStage ? "animate-pulse" : ""}`} style={{ background: isActiveStage ? `${GOLD}22` : "transparent", border: `1.5px solid ${color}` }}>
                          <s.icon size={11} style={{ color }} />
                        </div>
                        <span className="text-[9px] font-mono mt-1.5" style={{ color }}>{s.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex border-t border-zinc-800 justify-between items-center pt-4 flex-shrink-0 font-mono">
            <div className="flex gap-1">
              {[
                { value: "0.42ms", label: "Average Latency", icon: Zap },
                { value: "99.7%", label: "Injection Success", icon: CheckCircle2 },
                { value: "18.4K/s", label: "Payload Throughput", icon: TrendingUp },
              ].map((s, i) => (
                <div key={s.label} className={`flex items-center gap-3 px-5 py-1.5 ${i < 2 ? "border-r border-zinc-800" : ""}`}>
                  <s.icon className="size-4" style={{ color: GOLD }} />
                  <div>
                    <div className="text-xs font-bold text-zinc-200">{s.value}</div>
                    <div className="text-[9px] text-zinc-500 uppercase">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground">
              <Play size={12} fill="currentColor" />
              VALINC EXECUTOR ENGINE V3.2
            </div>
          </div>
        </div>
      </div>
    </ScaledContainer>
  )
})

// ============================================================================
// 2. HERO 2: ANTI-BAN PROTECTION SHOWCASE
// ============================================================================
const hero2Nodes = [
  { id: "poly", name: "Polymorphic Engine", x: 40, y: 80, icon: Hexagon, status: "ACTIVE", detail: "Entropy: 99.8%", color: GREEN },
  { id: "stack", name: "Stack Frame Spoofer", x: 40, y: 350, icon: Siren, status: "ACTIVE", detail: "TID: 8841 spoofed", color: GOLD },
  { id: "mem", name: "Memory Redirector", x: 40, y: 620, icon: CircleDot, status: "ACTIVE", detail: "Target: 0x7FFA81", color: GREEN },
  { id: "sandbox", name: "Thread Sandbox", x: 396, y: 80, icon: Cpu, status: "ISOLATED", detail: "Sandbox VM: Active", color: AMBER },
  { id: "registry", name: "Registry Spoofer", x: 396, y: 620, icon: Settings, status: "MASKED", detail: "Keys: Rotated", color: AMBER },
  { id: "hwid", name: "HWID Spoofer", x: 752, y: 80, icon: Diamond, status: "SPOOFED", detail: "BIOS: VALINC-99", color: GOLD },
  { id: "heart", name: "Heartbeat Masker", x: 752, y: 350, icon: Square, status: "MASKED", detail: "Delay: 0.00ms", color: AMBER },
  { id: "integrity", name: "Integrity Checker", x: 752, y: 620, icon: ShieldAlert, status: "SECURE", detail: "Byfron status: Bypassed", color: GREEN },
]

const hero2BypassMethods = [
  { name: "Heuristic Bypass", rate: 94.2, status: "OPTIMIZED" },
  { name: "Signature Scan", rate: 98.7, status: "SECURE" },
  { name: "Behavior Analytics", rate: 92.1, status: "STABLE" },
  { name: "Stack Frame Spoof", rate: 99.9, status: "MAXIMUM" },
]

const hero2NetworkFlows = [
  { d: "M 160 180 L 160 350", color: GREEN, dur: "1.8s", delay: "0s" },
  { d: "M 160 180 L 160 350", color: GREEN, dur: "1.8s", delay: "0.9s" },
  { d: "M 160 450 L 160 620", color: GOLD, dur: "2.0s", delay: "0.3s" },
  { d: "M 160 450 L 160 620", color: GOLD, dur: "2.0s", delay: "1.3s" },
  { d: "M 516 180 L 516 320", color: AMBER, dur: "1.5s", delay: "0.1s" },
  { d: "M 516 480 L 516 620", color: AMBER, dur: "1.6s", delay: "0.7s" },
  { d: "M 872 180 L 872 350", color: GOLD, dur: "1.7s", delay: "0.2s" },
  { d: "M 872 180 L 872 350", color: GOLD, dur: "1.7s", delay: "1.0s" },
  { d: "M 872 450 L 872 620", color: GREEN, dur: "2.2s", delay: "0.5s" },
  { d: "M 280 130 L 396 130", color: GREEN, dur: "1.6s", delay: "0.4s" },
  { d: "M 636 130 L 752 130", color: GOLD, dur: "1.9s", delay: "0.8s" },
  { d: "M 280 670 L 396 670", color: GREEN, dur: "1.8s", delay: "0.2s" },
  { d: "M 636 670 L 752 670", color: AMBER, dur: "2.0s", delay: "0.6s" },
  { d: "M 280 160 C 340 160, 320 340, 386 340", color: GREEN, dur: "2.3s", delay: "0.1s" },
  { d: "M 280 160 C 340 160, 320 340, 386 340", color: GREEN, dur: "2.3s", delay: "1.2s" },
  { d: "M 280 400 L 386 400", color: GOLD, dur: "1.3s", delay: "0.3s" },
  { d: "M 280 640 C 340 640, 320 460, 386 460", color: GREEN, dur: "2.5s", delay: "0.5s" },
  { d: "M 752 160 C 692 160, 712 340, 646 340", color: GOLD, dur: "2.2s", delay: "0.2s" },
  { d: "M 752 160 C 692 160, 712 340, 646 340", color: GOLD, dur: "2.2s", delay: "1.3s" },
  { d: "M 752 400 L 646 400", color: AMBER, dur: "1.4s", delay: "0.6s" },
  { d: "M 752 640 C 692 640, 712 460, 646 460", color: GREEN, dur: "2.4s", delay: "0.4s" },
  { d: "M 280 370 C 320 320, 350 200, 396 160", color: GREEN, dur: "2.6s", delay: "0.1s" },
  { d: "M 396 160 C 350 200, 320 320, 280 370", color: GREEN, dur: "2.6s", delay: "1.4s" },
  { d: "M 636 160 C 680 200, 710 320, 752 370", color: GOLD, dur: "2.4s", delay: "0.3s" },
  { d: "M 752 430 C 710 480, 680 600, 636 640", color: AMBER, dur: "2.7s", delay: "0.7s" },
  { d: "M 396 640 C 350 600, 320 480, 280 430", color: GOLD, dur: "2.8s", delay: "0.9s" },
]

const Hero2ThreatAlertFeed = memo(function Hero2ThreatAlertFeed({ isActive = true }: { isActive?: boolean }) {
  const [alerts, setAlerts] = useState([
    { id: 1, type: "BYPASS", title: "Hyperion MemScan Blocked", desc: "Blocked memory signature query at region 0x7FFA", time: "Just Now", status: "BLOCKED" },
    { id: 2, type: "SPOOF", title: "HWID UUID Spoofed", desc: "Returned synthetic physical BIOS descriptor on client check", time: "2m ago", status: "SPOOFED" },
    { id: 3, type: "PROTECT", title: "Stack Frame Redirected", desc: "Masked Level 7 Roblox API call stack return pointers", time: "4m ago", status: "ACTIVE" },
    { id: 4, type: "SECURITY", title: "Anti-Cheat Heartbeat Bypassed", desc: "Telemetry packet modified and dispatched with 0ms lag", time: "7m ago", status: "SECURE" },
  ])

  useEffect(() => {
    if (!isActive) return
    const interval = setInterval(() => {
      setAlerts((prev) => {
        const descriptions = [
          "Intercepted crash dump write sequence to prevent diagnostics report.",
          "Redirected virtual thread context to sandbox page allocation.",
          "HWID motherboard disk serial call hijacked successfully.",
          "Byfron heuristics integrity scan bypassed in module initialization.",
        ]
        const titles = [
          "Crash Reporter Intercepted",
          "Thread Context Redirected",
          "Disk Serial Spoofed",
          "Heuristic Scan Bypassed",
        ]
        const types = ["BYPASS", "SPOOF", "PROTECT", "SECURITY"]
        const maxId = Math.max(...prev.map(p => (typeof p.id === 'number' ? p.id : 0)), 0)
        const nextId = maxId + 1
        const newAlert = {
          id: nextId,
          type: types[Math.floor(Math.random() * types.length)],
          title: titles[Math.floor(Math.random() * titles.length)],
          desc: descriptions[Math.floor(Math.random() * descriptions.length)],
          time: "Just Now",
          status: "SECURE"
        }
        const updated = prev.map(a => ({
          ...a,
          time: a.time === "Just Now" ? "1m ago" : a.time.includes("m ago") ? `${parseInt(a.time) + 1}m ago` : a.time
        }))
        return [newAlert, ...updated.slice(0, 3)]
      })
    }, 4500)

    return () => clearInterval(interval)
  }, [isActive])

  return (
    <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar select-none font-sans">
      {alerts.map((a, idx) => (
        <div key={`threat-alert-${a.id}-${idx}`} className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/20 flex gap-3 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900/40">
          <div className="flex-shrink-0 size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mt-0.5">
            <Bell size={13} className="text-emerald-400 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold" style={{ color: GOLD }}>{a.type}</span>
              <span className="text-[8px] font-mono text-zinc-500">{a.time}</span>
            </div>
            <h4 className="text-[11px] font-semibold text-zinc-300 mt-0.5 truncate">{a.title}</h4>
            <p className="text-[9px] text-zinc-500 mt-0.5 leading-relaxed">{a.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
})

export const Hero2Showcase = memo(function Hero2Showcase({ isActive = true }: { isActive?: boolean }) {
  return (
    <ScaledContainer>
      <div className="relative w-[1920px] h-[1080px] overflow-hidden rounded-[20px] border border-zinc-800 bg-zinc-900/60 shadow-2xl flex-shrink-0 select-none font-sans">
        <div className="relative z-10 h-full flex flex-col p-10 justify-between">
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-zinc-900/80 border border-zinc-800">
                <Shield size={20} style={{ color: GOLD }} />
              </div>
              <div>
                <h1 className="text-2xl font-normal tracking-tight text-zinc-100 font-sans uppercase">Anti-Ban Protection</h1>
                <p className="text-xs text-zinc-500">Advanced anti-cheat bypasses and undetected execution methods keeping your accounts secure at all times.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900/80 border border-zinc-800 text-emerald-400 font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              LIVE SECURE
            </div>
          </div>

          <div className="flex-1 flex gap-6 min-h-0 items-stretch">
            <div className="w-[380px] flex flex-col gap-5 min-h-0 flex-shrink-0">
              <div className="rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40 flex flex-col items-center text-center justify-center">
                <div className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase mb-3 flex items-center gap-1.5 self-start font-mono">
                  <ShieldCheck size={12} style={{ color: GOLD }} />
                  Bypass Integrity Gauge
                </div>
                <div className="relative flex items-center justify-center w-36 h-36 mt-2">
                  <svg className="absolute w-full h-full transform -rotate-90">
                    <circle cx="72" cy="72" r="60" stroke="#18181b" strokeWidth="6" fill="transparent" />
                    <circle cx="72" cy="72" r="60" stroke={GOLD} strokeWidth="6" fill="transparent" strokeDasharray={376.8} strokeDashoffset={0.1} strokeLinecap="round" />
                  </svg>
                  <div className="text-center font-mono">
                    <span className="text-2xl font-bold tracking-tight text-zinc-100">99.98%</span>
                    <p className="text-[8px] text-zinc-500 uppercase tracking-wider mt-0.5">UNDETECTED STATUS</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40 flex flex-col min-h-0 flex-1">
                <div className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase mb-4 flex-shrink-0 flex items-center gap-1.5 font-mono">
                  <ShieldAlert size={12} style={{ color: GOLD }} />
                  Live Threat Intercepts
                </div>
                <Hero2ThreatAlertFeed isActive={isActive} />
              </div>
            </div>

            <div className="flex-1 relative min-h-0 bg-zinc-950/40 rounded-2xl border border-zinc-800 p-4 overflow-hidden">
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                <defs>
                  <filter id="glow-gold-h2" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <filter id="glow-green-h2" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <filter id="glow-amber-h2" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {hero2NetworkFlows.map((flow, idx) => (
                  <path key={`bg-${idx}`} d={flow.d} stroke={flow.color} strokeWidth="1.5" fill="none" opacity="0.1" />
                ))}

                {isActive && hero2NetworkFlows.map((flow, idx) => {
                  const filterId = flow.color === GREEN ? "url(#glow-green-h2)" : flow.color === GOLD ? "url(#glow-gold-h2)" : "url(#glow-amber-h2)"
                  return (
                    <circle key={`sig-${idx}`} r="3.5" fill={flow.color} filter={filterId}>
                      <animateMotion dur={flow.dur} begin={flow.delay} repeatCount="indefinite" path={flow.d} />
                    </circle>
                  )
                })}
              </svg>

              <div className="absolute top-[320px] left-[386px] w-[260px] h-[160px] rounded-2xl p-4 flex flex-col items-center justify-center border-2 border-[oklch(0.78_0.14_65)] bg-zinc-950 z-10 shadow-2xl">
                <div className="relative flex size-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-2">
                  <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-60" />
                  <ShieldCheck size={24} className="text-emerald-400" />
                </div>
                <div className="text-[12px] font-bold text-zinc-100 tracking-wider font-mono">VALINC DECOY VM</div>
                <div className="text-[9px] font-mono text-zinc-500 mt-0.5">VIRTUAL SECURITY SHIELD</div>
                <div className="text-[9px] font-mono text-emerald-400/80 font-semibold mt-1">100% BYPASSED</div>
              </div>

              {hero2Nodes.map((node) => {
                const Icon = node.icon
                return (
                  <div
                    key={node.id}
                    className="absolute w-[240px] h-[100px] rounded-xl p-3 border border-zinc-800 bg-zinc-900/85 z-10 flex flex-col justify-between"
                    style={{ left: `${node.x}px`, top: `${node.y}px` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-zinc-950 border border-zinc-800">
                          <Icon size={12} style={{ color: node.color }} />
                        </div>
                        <span className="text-[11px] font-bold text-zinc-200 truncate w-[140px] block font-sans">{node.name}</span>
                      </div>
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: node.color }} />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: node.color }} />
                      </span>
                    </div>
                    <div className="mt-2 text-[9px] font-mono text-zinc-500 flex justify-between">
                      <span>Status:</span>
                      <span style={{ color: node.color }} className="font-semibold">{node.status}</span>
                    </div>
                    <div className="text-[8.5px] font-mono text-zinc-400 truncate">{node.detail}</div>
                  </div>
                )
              })}
            </div>

            <div className="w-[380px] flex flex-col gap-5 min-h-0 flex-shrink-0 font-sans">
              <div className="rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40 flex-shrink-0">
                <h3 className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase mb-4 flex items-center gap-1.5 font-mono">
                  <BarChart3 size={12} style={{ color: GOLD }} />
                  Bypass Vector Analytics
                </h3>
                <div className="space-y-4">
                  {hero2BypassMethods.map((bm) => (
                    <div key={bm.name} className="group transition-all duration-300">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-zinc-300">{bm.name}</span>
                        <span className="text-xs font-bold font-mono" style={{ color: GOLD }}>
                          {bm.rate}%
                        </span>
                      </div>
                      <div className="h-[5px] rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{
                            width: `${bm.rate}%`,
                            background: `linear-gradient(90deg, ${GREEN}, ${GOLD})`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40 flex-1 flex flex-col justify-between min-h-0">
                <div className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase mb-3 flex items-center gap-1.5 flex-shrink-0 font-mono">
                  <Activity size={12} style={{ color: GOLD }} />
                  Process Sandbox Telemetry
                </div>
                <div className="space-y-3 flex-1 flex flex-col justify-center">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-400">Decoy Page Protection</span>
                    <span className="text-emerald-400 font-mono font-semibold">Active & Locked</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-400">Anti-Cheat Packet Lag</span>
                    <span className="font-mono font-semibold" style={{ color: GOLD }}>0.00ms (No Delay)</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-400">Sandbox Thread Pool</span>
                    <span className="text-zinc-300 font-mono">8 / 8 Active VM Threads</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-400">Virtual Decoy HEAP</span>
                    <span className="text-zinc-300 font-mono">4.87 KB / 64.0 KB</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden mt-1 flex-shrink-0">
                    <div className="h-full bg-emerald-500/80 rounded-full" style={{ width: "7.6%" }} />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40 flex-shrink-0">
                <div className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase mb-3.5 flex items-center gap-1.5 font-mono">
                  <Settings size={12} style={{ color: GOLD }} />
                  Active Physical HWID Masks
                </div>
                <div className="space-y-2.5 font-mono">
                  {[
                    { key: "Disk Serial", val: "ST1000LM035_W462" },
                    { key: "SMBIOS UUID", val: "F289E-99A2D-12A4" },
                    { key: "MAC Address", val: "4B:8F:A1:22:9E:C0" },
                    { key: "GPU Display ID", val: "NV_RTX_4070_99A1" },
                  ].map((h, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/40 border border-zinc-800/40">
                      <span className="text-[10px] text-zinc-400 font-medium">{h.key}</span>
                      <span className="text-[9px] text-zinc-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                        {h.val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex border-t border-zinc-800 justify-between items-center pt-4 flex-shrink-0 font-mono">
            <div className="flex gap-1">
              {[
                { value: "99.98%", label: "Undetected Rate", icon: ShieldCheck },
                { value: "0", label: "Ban Waves Recorded", icon: X },
                { value: "2.1M", label: "Protected Active Sessions", icon: Target },
              ].map((s, i) => (
                <div key={s.label} className={`flex items-center gap-3 px-5 py-1.5 ${i < 2 ? "border-r border-zinc-800" : ""}`}>
                  <s.icon className="size-4" style={{ color: GOLD }} />
                  <div>
                    <div className="text-xs font-bold text-zinc-200">{s.value}</div>
                    <div className="text-[9px] text-zinc-500 tracking-wide uppercase">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all bg-primary text-primary-foreground">
              <RefreshCw size={12} className="animate-spin" style={{ animationDuration: "3s" }} />
              Verify Client Integrity
            </div>
          </div>
        </div>
      </div>
    </ScaledContainer>
  )
})

// ============================================================================
// 3. HERO 3: LICENSE & DISCORD WHITELIST SHOWCASE
// ============================================================================
const hero3Features = [
  { icon: Key, label: "Keyless Auth", desc: "OAuth2 handshake — zero secrets", hue: "85 30% 65%" },
  { icon: Shield, label: "Role Verification", desc: "Guild membership check < 50ms", hue: "160 30% 65%" },
  { icon: Link2, label: "Account Linking", desc: "Discord ID ↔ Profile binding", hue: "270 25% 70%" },
  { icon: Users, label: "Auto-Role Sync", desc: "Cross-server propagation", hue: "190 30% 65%" },
]

const hero3AuthNodes = [
  { id: "oauth", label: "OAuth", icon: MessageCircle },
  { id: "token", label: "Token", icon: Key },
  { id: "guild", label: "Guild", icon: Shield },
  { id: "role", label: "Role", icon: UserCheck },
  { id: "link", label: "Account", icon: Link2 },
]

const hero3RoleDist = [
  { role: "Member", pct: 62, color: "bg-zinc-700/30", text: "text-zinc-400" },
  { role: "Premium", pct: 22, color: "bg-[oklch(0.78_0.14_65/0.35)]", text: "text-[oklch(0.78_0.14_65)]" },
  { role: "Pro", pct: 11, color: "bg-[oklch(0.78_0.14_65/0.25)]", text: "text-[oklch(0.78_0.14_65/0.8)]" },
  { role: "Staff", pct: 5, color: "bg-emerald-500/20", text: "text-emerald-400" },
]

const hero3TopUsers = [
  { rank: 1, id: "Valinc_Dev", role: "Staff", whitelisted: 1042, avatar: "V" },
  { rank: 2, id: "NovaSec", role: "Premium", whitelisted: 891, avatar: "N" },
  { rank: 3, id: "HexCore", role: "Pro", whitelisted: 647, avatar: "H" },
  { rank: 4, id: "SynthWave", role: "Premium", whitelisted: 503, avatar: "S" },
  { rank: 5, id: "QuantumBot", role: "Member", whitelisted: 412, avatar: "Q" },
]

const hero3Guilds = [
  { name: "Valinc Syndicate Hub", members: "12,842", ping: "12ms", status: "PRIMARY" },
  { name: "Valinc Beta Testers", members: "1,204", ping: "15ms", status: "CONNECTED" },
  { name: "Nova Security Group", members: "4,982", ping: "18ms", status: "CONNECTED" },
]

const hero3QuickStats = [
  { icon: Zap, label: "Auth Latency", value: "< 50ms" },
  { icon: Users, label: "Linked", value: "3,732" },
  { icon: Server, label: "Sessions", value: "847" },
  { icon: Activity, label: "Req/s", value: "1,432" },
  { icon: Clock, label: "Uptime", value: "99.97%" },
]

export const Hero3Showcase = memo(function Hero3Showcase({ isActive = true }: { isActive?: boolean }) {
  const [logs, setLogs] = useState([
    { time: "09:02:11", event: "DISCORD_OAUTH_INIT", status: "ok", detail: "session req — 0x7a1f" },
    { time: "09:02:11", event: "TOKEN_EXCHANGE", status: "ok", detail: "200 — 847ms" },
    { time: "09:02:12", event: "GUILD_CHECK", status: "ok", detail: "member — guild:105488372" },
    { time: "09:02:12", event: "ROLE_RESOLVE", status: "ok", detail: "premium — tier:2" },
    { time: "09:02:13", event: "PROFILE_LINK", status: "ok", detail: "bound: 213742069" },
    { time: "09:02:13", event: "WHITELIST_COMMIT", status: "ok", detail: "written — slot:8891" },
    { time: "09:02:14", event: "WEBHOOK_DISPATCH", status: "ok", detail: "dispatch queue cleared" },
    { time: "09:02:14", event: "CACHE_INVALIDATE", status: "ok", detail: "purged 4 keys" },
  ])
  const [activeStage, setActiveStage] = useState(-1)
  const [simulating, setSimulating] = useState(false)
  const [sessionCount, setSessionCount] = useState(847)

  useEffect(() => {
    if (!isActive) return
    const interval = setInterval(() => {
      if (simulating) return
      setLogs((prev) => {
        const events = [
          { event: "HEARTBEAT_PING", status: "ok", detail: "gateway active — 0.08ms lag" },
          { event: "REDIS_CACHE_SYNC", status: "ok", detail: "synchronized 14 active user roles" },
          { event: "WEBHOOK_DISPATCH", status: "ok", detail: "200 OK — dispatch guild payload" },
          { event: "TOKEN_REFRESH", status: "ok", detail: "refreshed token for slot 4410" },
        ]
        const newEvent = events[Math.floor(Math.random() * events.length)]
        const time = new Date().toLocaleTimeString('en-US', { hour12: false })
        return [...prev.slice(-12), { time, ...newEvent }]
      })
    }, 4500)
    return () => clearInterval(interval)
  }, [simulating, isActive])

  const startSimulation = () => {
    setSimulating(true)
    setActiveStage(0)
    const now = () => new Date().toLocaleTimeString('en-US', { hour12: false })
    setLogs([{ time: now(), event: "HANDSHAKE_START", status: "pending", detail: "initiate OAuth2 redirection" }])

    const steps = [
      { event: "OAUTH_AUTHORIZE", detail: "Discord token callback received" },
      { event: "TOKEN_EXCHANGED", detail: "Access token granted — profile payload locked" },
      { event: "GUILD_VERIFY", detail: "Guild membership verified (Valinc server)" },
      { event: "ROLE_PROPAGATE", detail: "Propagated Role: Premium (Slot 8891 committed)" },
      { event: "WHITELIST_SUCCESS", detail: "Handshake completed successfully — Client authorized" }
    ]

    let current = 0
    const interval = setInterval(() => {
      current++
      if (current <= steps.length) {
        setActiveStage(current - 1)
        setLogs(prev => [...prev, { time: now(), event: steps[current - 1].event, status: current === steps.length ? "ok" : "pending", detail: steps[current - 1].detail }])
      }
      if (current === steps.length) {
        clearInterval(interval)
        setTimeout(() => {
          setActiveStage(-1)
          setSimulating(false)
          setSessionCount(prev => prev + 1)
          setLogs(prev => [...prev, { time: now(), event: "GATEWAY_IDLE", status: "ok", detail: "Listening for handshake requests..." }])
        }, 1000)
      }
    }, 1000)
  }

  return (
    <ScaledContainer>
      <div className="relative w-[1920px] h-[1080px] overflow-hidden rounded-[20px] border border-zinc-800 bg-zinc-900/60 shadow-2xl flex-shrink-0 select-none font-sans">
        <div className="relative z-10 h-full flex flex-col p-10 justify-between">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-zinc-900/80 border border-zinc-800">
                <MessageCircle size={20} style={{ color: GOLD }} />
              </div>
              <div>
                <h1 className="text-2xl font-normal tracking-tight text-zinc-100 font-mono uppercase">License & Discord Whitelist System</h1>
                <p className="text-xs text-zinc-500">Keyless Discord account verification, automatic role synchronization, and instant license management without annoying keys.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900/80 border border-zinc-800 text-emerald-400 font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              LIVE SECURE
            </div>
          </div>

          <div className="flex-1 flex gap-6 min-h-0 items-stretch">
            <div className="w-[380px] flex flex-col gap-5 min-h-0 flex-shrink-0">
              <div className="rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40 flex-shrink-0">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/40 font-mono">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Synced Roles</span>
                    <p className="mt-0.5 text-[9px] text-zinc-500">3,732 whitelisted players</p>
                  </div>
                  <span className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-0.5 text-[9px] text-zinc-500">4 TIERS</span>
                </div>
                <div className="mb-4 flex h-2 gap-0.5 overflow-hidden rounded-full bg-zinc-950">
                  {hero3RoleDist.map((r) => (
                    <div key={r.role} className={`h-full rounded-full transition-all ${r.color}`} style={{ width: `${r.pct}%` }} />
                  ))}
                </div>
                <div className="space-y-2 font-mono">
                  {hero3RoleDist.map((r) => (
                    <div key={r.role} className="flex items-center gap-3">
                      <span className={`w-16 text-[10px] font-medium ${r.text}`}>{r.role}</span>
                      <div className="h-1.5 flex-1 rounded-full bg-zinc-950 overflow-hidden">
                        <div className={`h-full rounded-full ${r.color}`} style={{ width: `${r.pct}%` }} />
                      </div>
                      <span className="w-8 text-right text-[10px] text-zinc-500">{r.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/40 shrink-0 font-mono">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">High-Activity Keys</span>
                  <Globe className="size-3.5 text-zinc-500" />
                </div>
                <div className="space-y-1.5 flex-1 overflow-y-auto pr-1 custom-scrollbar font-mono">
                  {hero3TopUsers.map((u) => (
                    <div key={u.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors bg-zinc-950/20 border border-zinc-900/40 hover:bg-zinc-900/20">
                      <span className="w-3 text-[9px] text-zinc-600">#{u.rank}</span>
                      <div className="flex size-6.5 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950 text-[10px] font-bold text-zinc-400">{u.avatar}</div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-bold text-zinc-300 truncate block">{u.id}</span>
                        <span className="text-[8.5px] text-zinc-500">{u.role}</span>
                      </div>
                      <span className="text-[10px] text-[oklch(0.78_0.14_65/0.8)] font-bold">{u.whitelisted.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-5 min-h-0">
              <div className="rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40 flex-shrink-0 font-mono">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/40 shrink-0">
                  <div className="flex items-center gap-2">
                    <Server size={12} style={{ color: GOLD }} />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">OAuth Handshake Pipeline</span>
                  </div>
                  <button
                    disabled={simulating}
                    onClick={startSimulation}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-wide border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Play size={10} fill="currentColor" className={simulating ? "animate-pulse" : ""} style={{ color: simulating ? GOLD : "inherit" }} />
                    {simulating ? "PROCESSING..." : "RUN TEST SIMULATION"}
                  </button>
                </div>

                <div className="relative w-full h-[200px] border border-zinc-800/40 rounded-xl bg-zinc-950/40 overflow-hidden mb-4">
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    <defs>
                      <filter id="glow-gold-h3" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                      <filter id="glow-blue-h3" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                      <filter id="glow-green-h3" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>
                    <path d="M 170 100 C 260 50, 300 50, 390 100" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" fill="none" />
                    <path d="M 170 100 C 260 150, 300 150, 390 100" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" fill="none" />
                    <path d="M 490 100 C 580 50, 620 50, 710 100" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" fill="none" />
                    <path d="M 490 100 C 580 150, 620 150, 710 100" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" fill="none" />
                    {!simulating && isActive && (
                      <>
                        <circle r="2.5" fill={GOLD} opacity="0.3">
                          <animateMotion dur="4s" repeatCount="indefinite" path="M 170 100 C 260 50, 300 50, 390 100" />
                        </circle>
                        <circle r="2.5" fill={GREEN} opacity="0.3">
                          <animateMotion dur="4.5s" begin="1s" repeatCount="indefinite" path="M 490 100 C 580 150, 620 150, 710 100" />
                        </circle>
                      </>
                    )}
                    {simulating && (
                      <>
                        {(activeStage === 0 || activeStage === 1) && (
                          <>
                            <circle r="4.5" fill={GOLD} filter="url(#glow-gold-h3)"><animateMotion dur="1s" repeatCount="indefinite" path="M 170 100 C 260 50, 300 50, 390 100" /></circle>
                            <circle r="4.5" fill="#5865F2" filter="url(#glow-blue-h3)"><animateMotion dur="1s" begin="0.5s" repeatCount="indefinite" path="M 170 100 C 260 150, 300 150, 390 100" /></circle>
                          </>
                        )}
                        {(activeStage === 2 || activeStage === 3) && (
                          <>
                            <circle r="4.5" fill={GOLD} filter="url(#glow-gold-h3)"><animateMotion dur="1s" repeatCount="indefinite" path="M 490 100 C 580 50, 620 50, 710 100" /></circle>
                            <circle r="4.5" fill={GREEN} filter="url(#glow-green-h3)"><animateMotion dur="1s" begin="0.5s" repeatCount="indefinite" path="M 490 100 C 580 150, 620 150, 710 100" /></circle>
                          </>
                        )}
                      </>
                    )}
                  </svg>
                  {[
                    { id: "discord", x: 120, y: 100, label: "DISCORD AUTH", sub: "OAuth2 Provider", icon: MessageCircle, color: "#5865F2" },
                    { id: "gateway", x: 440, y: 100, label: "VALINC CORE", sub: "Security Gateway", icon: Shield, color: GOLD },
                    { id: "client", x: 760, y: 100, label: "ROBLOX ENGINE", sub: "Zero-Lag Injector", icon: Zap, color: GREEN }
                  ].map((n) => {
                    const NodeIcon = n.icon
                    return (
                      <div key={n.id} className="absolute w-[160px] flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2" style={{ left: `${n.x}px`, top: `${n.y}px` }}>
                        <div className="size-13 rounded-2xl bg-zinc-950 border flex items-center justify-center relative" style={{ borderColor: n.color + "40" }}>
                          <NodeIcon className="size-5.5" style={{ color: n.color }} />
                        </div>
                        <div className="text-[10px] font-bold text-zinc-200 mt-2">{n.label}</div>
                        <div className="text-[8px] text-zinc-500 mt-0.5 uppercase">{n.sub}</div>
                      </div>
                    )
                  })}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-800/40">
                  {hero3AuthNodes.map((node, i) => {
                    const isActiveStage = i === activeStage
                    const isCompleted = i < activeStage && activeStage !== -1
                    const isIdle = activeStage === -1
                    const color = isActiveStage ? GOLD : isCompleted ? GREEN : "oklch(0.55 0 0)"
                    return (
                      <div key={node.id} className="flex flex-1 items-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="flex size-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950" style={{ borderColor: isActiveStage ? GOLD : isCompleted ? `${GREEN}50` : "transparent" }}>
                            <node.icon className="size-4" style={{ color: isIdle && i === 0 ? GOLD : color }} />
                          </div>
                          <span className="text-[9px]" style={{ color: isIdle && i === 0 ? GOLD : color }}>{node.label}</span>
                        </div>
                        {i < hero3AuthNodes.length - 1 && <div className="h-[1.5px] flex-1 mx-2 bg-zinc-800" style={{ background: isCompleted ? `linear-gradient(90deg, ${GREEN}, ${GOLD})` : "none" }} />}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40 flex-1 flex flex-col min-h-0 font-mono">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/40 shrink-0">
                  <div className="flex items-center gap-2">
                    <Activity size={12} style={{ color: GOLD }} />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Live Gateway Logs</span>
                  </div>
                  <span className="text-[9px] text-zinc-500">streaming</span>
                </div>
                <div className="space-y-1.5 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                  {logs.map((entry, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg px-2.5 py-1.5 text-[10px] bg-zinc-950/20 border border-zinc-900/40 hover:bg-zinc-900/20 transition-colors">
                      <span className="w-14 shrink-0 text-zinc-600 tabular-nums">{entry.time}</span>
                      <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${entry.status === "ok" ? "bg-emerald-500/50" : "bg-amber-500/50"}`} />
                      <span className={`shrink-0 font-bold ${entry.status === "ok" ? "text-zinc-400" : "text-amber-400"}`}>{entry.event}</span>
                      <span className="truncate text-zinc-500">{entry.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="w-[380px] flex flex-col gap-5 min-h-0 flex-shrink-0 font-mono">
              <div className="rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40 flex-shrink-0">
                <div className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase mb-3 flex items-center gap-1.5">
                  <Shield size={12} style={{ color: GOLD }} />
                  Verification Features
                </div>
                <div className="space-y-2.5">
                  {hero3Features.map((f) => (
                    <div key={f.label} className="flex items-center gap-3 p-2 rounded-lg bg-zinc-950/40 border border-zinc-800/60">
                      <f.icon size={14} style={{ color: GOLD }} />
                      <div>
                        <div className="text-[11px] font-bold text-zinc-200">{f.label}</div>
                        <div className="text-[9px] text-zinc-500">{f.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40 flex-shrink-0">
                <div className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase mb-3 flex items-center gap-1.5">
                  <Globe size={12} style={{ color: GOLD }} />
                  Active Discord Guild Sync
                </div>
                <div className="space-y-2">
                  {hero3Guilds.map((g, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/40 border border-zinc-800/40">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-300 font-medium">{g.name}</span>
                        <span className="text-[8px] text-zinc-500">{g.members} members · {g.ping}</span>
                      </div>
                      <span className="text-[8px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                        {g.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40 flex-1 flex flex-col min-h-0">
                <div className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase mb-3 flex items-center gap-1.5">
                  <Activity size={12} style={{ color: GOLD }} />
                  Active Gateway Status
                </div>
                <div className="space-y-3 flex-1 flex flex-col justify-center text-[11px]">
                  <div className="flex justify-between items-center"><span className="text-zinc-400">OAuth2 Gateway IP</span><span className="text-zinc-300">104.22.41.89</span></div>
                  <div className="flex justify-between items-center"><span className="text-zinc-400">Linked Webhooks</span><span className="text-emerald-400 font-semibold">4 / 4 Active Listeners</span></div>
                  <div className="flex justify-between items-center"><span className="text-zinc-400">Total Live Sessions</span><span className="text-zinc-200 font-semibold">{sessionCount} Syncs</span></div>
                  <div className="flex justify-between items-center"><span className="text-zinc-400">Last SSL Handshake</span><span style={{ color: GOLD }} className="font-semibold">TLSv1.3 (0.4ms)</span></div>
                  <div className="h-1.5 rounded-full bg-zinc-950 overflow-hidden mt-1 shrink-0"><div className="h-full bg-emerald-500/80 rounded-full" style={{ width: "99.8%" }} /></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex border-t border-zinc-800 justify-between items-center pt-4 flex-shrink-0 font-mono text-xs">
            <div className="flex gap-1">
              {hero3QuickStats.map((s, i) => {
                const StatIcon = s.icon
                const displayValue = s.label === "Sessions" ? `${sessionCount}` : s.value
                return (
                  <div key={s.label} className={`flex items-center gap-3 px-5 py-1.5 ${i < hero3QuickStats.length - 1 ? "border-r border-zinc-800" : ""}`}>
                    <StatIcon className="size-4" style={{ color: GOLD }} />
                    <div>
                      <div className="text-xs font-bold text-zinc-200">{displayValue}</div>
                      <div className="text-[9px] text-zinc-500 tracking-wide uppercase">{s.label}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            <button
              onClick={startSimulation}
              disabled={simulating}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD}bb)`, color: "oklch(0.1 0.01 65)" }}
            >
              <MessageCircle size={12} fill="currentColor" />
              {simulating ? "Verifying..." : "Link Discord Account"}
              <ChevronRight className="size-3" />
            </button>
          </div>
        </div>
      </div>
    </ScaledContainer>
  )
})
