"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  Gauge, Zap, Cpu, Timer, CheckCircle2,
  TrendingUp, Play, Orbit, Radio, Crosshair,
  Target, ScanLine, Satellite, Radar,
  Shield, Hexagon, Siren, CircleDot, Diamond, Square,
  ShieldAlert, ShieldCheck, Activity, BarChart3, Settings,
  MessageCircle, Link2, Users, Clock, Key, Server, UserCheck, Globe, ChevronRight
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
          {/* Header */}
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

          {/* Main Content */}
          <div className="flex-1 flex items-stretch gap-6 min-h-0">
            {/* Radar Panel */}
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

            {/* Terminal & Pipeline */}
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

          {/* Footer Stats Bar */}
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

export function Hero2Showcase() {
  return (
    <ScaledContainer>
      <div className="relative w-[1920px] h-[1080px] overflow-hidden rounded-[20px] border border-zinc-800 bg-zinc-900/60 shadow-2xl flex-shrink-0 select-none font-sans">
        <div className="relative z-10 h-full flex flex-col p-10 justify-between">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-zinc-900/80 border border-zinc-800">
                <Shield size={20} style={{ color: GOLD }} />
              </div>
              <div>
                <h1 className="text-2xl font-normal tracking-tight text-zinc-100 uppercase font-mono">Anti-Ban Protection System</h1>
                <p className="text-xs text-zinc-500">Advanced anti-cheat bypasses and undetected execution methods keeping your account completely safe.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900/80 border border-zinc-800 text-emerald-400 font-mono">
              <ShieldCheck size={14} />
              BYFRON / HYPERION BYPASSED
            </div>
          </div>

          {/* Main Grid */}
          <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
            {/* Left Network Graph */}
            <div className="col-span-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 relative p-6 overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800/40 shrink-0 font-mono">
                <div className="flex items-center gap-2">
                  <Activity size={13} style={{ color: GOLD }} />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Node Security Architecture</span>
                </div>
                <span className="text-[9px] text-zinc-500">NODES: 8/8 SECURE</span>
              </div>
              <div className="grid grid-cols-3 gap-4 flex-1 items-center">
                {hero2Nodes.map((node) => (
                  <div key={node.id} className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/60 flex flex-col gap-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <node.icon size={16} style={{ color: node.color }} />
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800" style={{ color: node.color }}>{node.status}</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-200">{node.name}</div>
                      <div className="text-[10px] font-mono text-zinc-500 mt-0.5">{node.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Threat & Telemetry Feed */}
            <div className="col-span-4 flex flex-col gap-5 h-full min-w-0">
              <div className="flex-1 rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40 flex flex-col">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/40 shrink-0 font-mono">
                  <div className="flex items-center gap-2">
                    <Siren size={13} style={{ color: AMBER }} />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Live Threat Monitor</span>
                  </div>
                  <span className="text-[9px] text-emerald-400">STATUS: PROTECTED</span>
                </div>
                <div className="space-y-3 flex-1 overflow-hidden font-mono text-[11px]">
                  {[
                    { title: "Hyperion MemScan Blocked", desc: "Blocked memory signature query region 0x7FFA", time: "Just Now" },
                    { title: "HWID UUID Spoofed", desc: "Returned synthetic physical BIOS descriptor", time: "2m ago" },
                    { title: "Stack Frame Redirected", desc: "Masked Level 7 Roblox API call stack return pointers", time: "4m ago" },
                    { title: "Heartbeat Bypassed", desc: "Telemetry packet modified with 0ms delay", time: "7m ago" },
                  ].map((item, i) => (
                    <div key={i} className="p-3 rounded-lg border border-zinc-800/60 bg-zinc-950/40">
                      <div className="flex items-center justify-between text-zinc-200 font-bold mb-1">
                        <span>{item.title}</span>
                        <span className="text-[9px] text-zinc-500">{item.time}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
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
// 3. HERO 3: DISCORD WHITELIST SHOWCASE
// ============================================================================
export function Hero3Showcase() {
  return (
    <ScaledContainer>
      <div className="relative w-[1920px] h-[1080px] overflow-hidden rounded-[20px] border border-zinc-800 bg-zinc-900/60 shadow-2xl flex-shrink-0 select-none font-sans">
        <div className="relative z-10 h-full flex flex-col p-10 justify-between">
          {/* Header */}
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

          {/* Main Content */}
          <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
            {/* Left Section */}
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
                    <div className="text-sm font-bold text-zinc-200">{item.title}</div>
                    <div className="text-xs text-zinc-400">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Section Commit Log */}
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

          {/* Footer Bar */}
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
