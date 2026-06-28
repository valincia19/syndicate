"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  Gauge, Zap, Cpu, Timer, CheckCircle2,
  TrendingUp, Play, Orbit, Radio, Crosshair,
  Target, ScanLine, Satellite, Radar,
  Shield, Hexagon, Siren, CircleDot, Diamond, Square,
  ShieldAlert, ShieldCheck, Activity, Settings, Bell,
  MessageCircle, Link2, Users, Key, Server, UserCheck, Globe
} from "lucide-react"

// ─── Shared Theme Constants ───
const GOLD = "oklch(0.78 0.14 65)"
const ACCENT = "oklch(0.78 0.14 65)"
const DIM = "oklch(0.55 0 0)"
const GREEN = "oklch(0.72 0.19 150)"
const AMBER = "oklch(0.79 0.15 85)"

// ─── Scaled Wrapper Component ───
function ScaledContainer({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.4)

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return
      const w = containerRef.current.clientWidth
      const h = containerRef.current.clientHeight
      const scaleX = w / 1920
      const scaleY = h / 1080
      setScale(Math.min(scaleX, scaleY))
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    const timer = setTimeout(handleResize, 100)
    return () => {
      window.removeEventListener("resize", handleResize)
      clearTimeout(timer)
    }
  }, [])

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center overflow-hidden bg-zinc-950">
      <div
        className="origin-center flex-shrink-0"
        style={{
          transform: `scale(${scale})`,
          width: "1920px",
          height: "1080px",
        }}
      >
        {children}
      </div>
    </div>
  )
}

// ============================================================================
// 1. HERO 1: NEXT-GEN EXECUTION PREVIEW (100% Exact from design-assets-hub-v2)
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

function Hero1RadarSweep() {
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
}

function Hero1TerminalStream({ step }: { step: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight
  }, [step])

  return (
    <div ref={containerRef} className="font-mono text-[11px] leading-5 h-full overflow-y-auto pr-2 scrollbar-none select-none">
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
}

export function Hero1Showcase() {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setStep((s) => (s < hero1LogEntries.length ? s + 1 : 0)), 450)
    return () => clearInterval(interval)
  }, [])

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
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Core Telemetry & Thread Grid</span>
                </div>
                <span className="text-[9px] font-mono text-zinc-500">SYSTEM: ACTIVE</span>
              </div>
              <div className="relative w-[65%] aspect-square"><Hero1RadarSweep /></div>
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
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/40 shrink-0">
                  <div className="flex items-center gap-2">
                    <Satellite size={13} style={{ color: DIM }} />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 font-mono">Execution Log</span>
                  </div>
                  <span className="text-[9px] font-mono text-emerald-400">BYPASS: OK</span>
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
                    const isActive = idx === activeStageIndex
                    const color = (isCompleted || isActive) ? GOLD : DIM
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center relative transition-all duration-300" style={{ opacity: idx > activeStageIndex ? 0.35 : 1 }}>
                        <div className={`relative z-10 w-[24px] h-[24px] rounded-full flex items-center justify-center ${isActive ? "animate-pulse" : ""}`} style={{ background: isActive ? `${GOLD}22` : "transparent", border: `1.5px solid ${color}` }}>
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
}

// ============================================================================
// 2. HERO 2: ANTI-BAN PROTECTION SHOWCASE (100% Exact Copy of AntiBanProtection.tsx)
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

function Hero2ThreatAlertFeed() {
  const [alerts, setAlerts] = useState([
    { id: 1, type: "BYPASS", title: "Hyperion MemScan Blocked", desc: "Blocked memory signature query at region 0x7FFA", time: "Just Now", status: "BLOCKED" },
    { id: 2, type: "SPOOF", title: "HWID UUID Spoofed", desc: "Returned synthetic physical BIOS descriptor on client check", time: "2m ago", status: "SPOOFED" },
    { id: 3, type: "PROTECT", title: "Stack Frame Redirected", desc: "Masked Level 7 Roblox API call stack return pointers", time: "4m ago", status: "ACTIVE" },
    { id: 4, type: "SECURITY", title: "Anti-Cheat Heartbeat Bypassed", desc: "Telemetry packet modified and dispatched with 0ms lag", time: "7m ago", status: "SECURE" },
  ])

  useEffect(() => {
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
        const nextId = prev.length + 1
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
  }, [])

  return (
    <div className="space-y-3 flex-1 overflow-y-auto pr-1">
      {alerts.map((a) => (
        <div key={a.id} className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/20 flex gap-3 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900/40">
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
}

export function Hero2Showcase() {
  return (
    <ScaledContainer>
      <div className="relative w-[1920px] h-[1080px] overflow-hidden rounded-[20px] border border-zinc-800 bg-zinc-900/60 shadow-2xl flex-shrink-0 select-none font-sans">
        <div className="relative z-10 h-full flex flex-col p-10 justify-between">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-zinc-900/80 border border-zinc-800">
                <Shield size={20} style={{ color: GOLD }} />
              </div>
              <div>
                <h1 className="text-2xl font-normal tracking-tight text-zinc-100 font-mono uppercase">Anti-Ban Protection System</h1>
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

          {/* Main Body */}
          <div className="flex-1 flex gap-6 min-h-0 items-stretch">
            {/* Left Column */}
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
                <Hero2ThreatAlertFeed />
              </div>
            </div>

            {/* Center Column: Thread-Connected Node Flow Canvas */}
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

                {hero2NetworkFlows.map((flow, idx) => {
                  const filterId = flow.color === GREEN ? "url(#glow-green-h2)" : flow.color === GOLD ? "url(#glow-gold-h2)" : "url(#glow-amber-h2)"
                  return (
                    <circle key={`sig-${idx}`} r="3.5" fill={flow.color} filter={filterId}>
                      <animateMotion dur={flow.dur} begin={flow.delay} repeatCount="indefinite" path={flow.d} />
                    </circle>
                  )
                })}
              </svg>

              {/* Central Decoy VM Shield Node */}
              <div className="absolute top-[320px] left-[386px] w-[260px] h-[160px] rounded-2xl p-4 flex flex-col items-center justify-center border-2 border-[oklch(0.78_0.14_65)] bg-zinc-950 z-10 shadow-2xl">
                <div className="relative flex size-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-2">
                  <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-60" />
                  <ShieldCheck size={24} className="text-emerald-400" />
                </div>
                <div className="text-[12px] font-bold text-zinc-100 tracking-wider font-mono">VALINC DECOY VM</div>
                <div className="text-[9px] font-mono text-zinc-500 mt-0.5">VIRTUAL SECURITY SHIELD</div>
                <div className="text-[9px] font-mono text-emerald-400/80 font-semibold mt-1">100% BYPASSED</div>
              </div>

              {/* Surrounding Nodes */}
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
                        <span className="text-[11px] font-bold text-zinc-200 truncate w-[140px] block font-mono">{node.name}</span>
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
          </div>

          {/* Footer Bar */}
          <div className="mt-6 flex border-t border-zinc-800 justify-between items-center pt-4 flex-shrink-0 font-mono text-xs">
            <div className="flex items-center gap-6 text-zinc-400">
              <div>BYPASS RATE: <strong className="text-emerald-400">99.9%</strong></div>
              <div>DETECTION RISK: <strong className="text-emerald-400">0.00%</strong></div>
              <div>HEURISTIC ENGINE: <strong className="text-zinc-200">ACTIVE</strong></div>
            </div>
            <div className="text-zinc-500 text-[10px]">VALINC INTEGRITY SYSTEM V4.2 ACTIVE</div>
          </div>
        </div>
      </div>
    </ScaledContainer>
  )
}

// ============================================================================
// 3. HERO 3: DISCORD WHITELIST SHOWCASE (100% Exact Copy of DiscordWhitelist.tsx)
// ============================================================================
export function Hero3Showcase() {
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
                <h1 className="text-2xl font-normal tracking-tight text-zinc-100 uppercase font-mono">Discord Whitelist & Cloud Vault</h1>
                <p className="text-xs text-zinc-500">Access hundreds of updated scripts for popular Roblox games with instant one-click execution and Discord OAuth verification.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900/80 border border-zinc-800 text-emerald-400 font-mono">
              <UserCheck size={14} />
              DISCORD BOT LINKED
            </div>
          </div>

          <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
            <div className="col-span-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800/40 shrink-0 font-mono">
                <div className="flex items-center gap-2">
                  <Key size={13} style={{ color: GOLD }} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">OAuth Handshake Pipeline</span>
                </div>
                <span className="text-[9px] text-zinc-500">HANDSHAKE: FAST</span>
              </div>

              <div className="grid grid-cols-2 gap-4 flex-1 items-center">
                {[
                  { title: "Keyless Auth Handshake", desc: "OAuth2 handshake with zero secrets exposed", icon: Key },
                  { title: "Role Verification <50ms", desc: "Instant Discord server guild role verification", icon: Shield },
                  { title: "Account Binding", desc: "Discord ID ↔ VALINC License binding", icon: Link2 },
                  { title: "Auto-Role Propagation", desc: "Automatic cross-server license status sync", icon: Users },
                ].map((item, i) => (
                  <div key={i} className="p-5 rounded-xl border border-zinc-800/80 bg-zinc-950/60 flex flex-col gap-2">
                    <item.icon size={20} style={{ color: GOLD }} />
                    <div className="text-sm font-bold text-zinc-200 font-mono">{item.title}</div>
                    <div className="text-xs text-zinc-400">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-5 flex flex-col gap-5 h-full min-w-0">
              <div className="flex-1 rounded-2xl p-6 border border-zinc-800 bg-zinc-900/40 flex flex-col">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800/40 shrink-0 font-mono">
                  <div className="flex items-center gap-2">
                    <Server size={13} style={{ color: GOLD }} />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Live Whitelist Commit Stream</span>
                  </div>
                  <span className="text-[9px] text-emerald-400">SYNC: ACTIVE</span>
                </div>
                <div className="space-y-2.5 flex-1 overflow-hidden font-mono text-xs">
                  {[
                    { event: "DISCORD_OAUTH_INIT", detail: "Session req — 0x7a1f ok" },
                    { event: "TOKEN_EXCHANGE", detail: "200 OK — 42ms response" },
                    { event: "GUILD_CHECK_PASS", detail: "Member verified — Guild:VALINC" },
                    { event: "ROLE_RESOLVE_SUCCESS", detail: "Role: PREMIUM_VIP tier" },
                    { event: "PROFILE_LINK_BOUND", detail: "ID bound: 213742069" },
                    { event: "WHITELIST_COMMIT", detail: "Slot written: #8891" },
                  ].map((log, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-800/60 text-zinc-300">
                      <span className="text-emerald-400 font-bold">{log.event}</span>
                      <span className="text-zinc-500 text-[11px]">{log.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex border-t border-zinc-800 justify-between items-center pt-4 flex-shrink-0 font-mono text-xs">
            <div className="flex items-center gap-6 text-zinc-400">
              <div>WHITELISTED USERS: <strong className="text-zinc-200">24,890+</strong></div>
              <div>SCRIPTS AVAILABLE: <strong className="text-zinc-200">450+</strong></div>
            </div>
            <div className="text-zinc-500 text-[10px]">VALINC CLOUD VAULT SYSTEM V2.0</div>
          </div>
        </div>
      </div>
    </ScaledContainer>
  )
}
