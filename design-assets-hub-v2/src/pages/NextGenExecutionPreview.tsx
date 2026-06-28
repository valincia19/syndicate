import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Gauge, Zap, Cpu, Activity, Timer, CheckCircle2,
  TrendingUp, Play, Orbit, Radio, Crosshair,
  Target, ScanLine, Satellite, Radar, ArrowLeft
} from "lucide-react";

// ─── Constants (Zinc & Honey Gold Palette matching Hero 3) ───
const GOLD = "oklch(0.78 0.14 65)";
const ACCENT = "oklch(0.78 0.14 65)";
const DIM = "oklch(0.55 0 0)"; // Neutral gray matching text-zinc-500
const GREEN = "oklch(0.72 0.19 150)";
const AMBER = "oklch(0.79 0.15 85)";

const orbitStats = [
  { label: "Inject", value: "0.42ms", icon: Zap, color: ACCENT },
  { label: "Success", value: "99.7%", icon: Target, color: GREEN },
  { label: "Throughput", value: "18.4K/s", icon: TrendingUp, color: GOLD },
  { label: "Overhead", value: "0.08ms", icon: Timer, color: AMBER },
];

const stages = [
  { label: "Parse", time: "0.00ms", icon: ScanLine },
  { label: "Compile", time: "+0.12ms", icon: Cpu },
  { label: "VM Init", time: "+0.28ms", icon: Orbit },
  { label: "Inject", time: "+0.36ms", icon: Radio },
  { label: "Execute", time: "+0.42ms", icon: Play },
];

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
];

function RadarSweep() {
  const [angle, setAngle] = useState(0);
  const [blips, setBlips] = useState<{ x: number; y: number; size: number; color: string }[]>([]);

  useEffect(() => {
    const interval = setInterval(() => setAngle((a) => (a + 1.5) % 360), 30);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (Math.random() > 0.4) {
        const radius = 10 + Math.random() * 26; // spawn between 10% and 36% radius
        const theta = Math.random() * 2 * Math.PI;
        setBlips((prev) => [
          ...prev.slice(-6),
          {
            x: 50 + radius * Math.cos(theta),
            y: 50 + radius * Math.sin(theta),
            size: 2.5 + Math.random() * 3,
            color: [ACCENT, GOLD, GREEN][Math.floor(Math.random() * 3)],
          },
        ]);
      }
    }, 700);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center border border-zinc-800/40 rounded-xl bg-zinc-950/40 p-6 overflow-hidden">
      {/* Sci-fi Corner Brackets */}
      <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t border-l border-zinc-700/60 rounded-tl" />
      <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t border-r border-zinc-700/60 rounded-tr" />
      <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b border-l border-zinc-700/60 rounded-bl" />
      <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b border-r border-zinc-700/60 rounded-br" />

      {/* Axis Lines (Centered) */}
      <div className="absolute w-[80%] h-[1px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ background: `linear-gradient(90deg, transparent, ${ACCENT}33, transparent)` }} />
      <div className="absolute h-[80%] w-[1px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ background: `linear-gradient(180deg, transparent, ${ACCENT}33, transparent)` }} />
      <div className="absolute w-[80%] h-[1px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45" style={{ background: `linear-gradient(90deg, transparent, ${ACCENT}11, transparent)` }} />
      <div className="absolute w-[80%] h-[1px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45" style={{ background: `linear-gradient(90deg, transparent, ${ACCENT}11, transparent)` }} />

      {/* Rings (Centered) */}
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

      {/* Conic Gradient Sweep trailing the rotating sweep line */}
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

      {/* Real-time Blips inside the Radar Circle */}
      {blips.map((b, i) => (
        <div key={i} className="absolute pointer-events-none" style={{ left: `${b.x}%`, top: `${b.y}%` }}>
          <div className="absolute rounded-full animate-ping" style={{ width: b.size * 3.5, height: b.size * 3.5, transform: "translate(-50%, -50%)", background: b.color, boxShadow: `0 0 10px ${b.color}`, animationDuration: "2s" }} />
          <div className="absolute rounded-full" style={{ width: b.size, height: b.size, transform: "translate(-50%, -50%)", background: b.color }} />
          <span className="absolute text-[8px] font-mono opacity-50 ml-2 mt-1 truncate whitespace-nowrap" style={{ color: b.color }}>
            {`TRK-${(b.x * 13).toString(16).substring(0, 3).toUpperCase()}`}
          </span>
        </div>
      ))}

      {/* Rotating Sweep Line (Centered & Rotating) */}
      <div 
        className="absolute top-1/2 left-1/2 w-[1px] h-[40%] origin-bottom pointer-events-none" 
        style={{ 
          transform: `translate(-50%, -100%) rotate(${angle}deg)`, 
          background: `linear-gradient(to top, ${ACCENT}, transparent)`, 
          boxShadow: `0 0 8px ${ACCENT}` 
        }} 
      />

      {/* Central Radar Lock Icon */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center">
        <div className="absolute rounded-full w-8 h-8 bg-zinc-950/80 border border-zinc-800 flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.8)]">
          <Radar size={13} style={{ color: ACCENT }} className="relative z-10 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function TerminalStream({ step }: { step: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [step]);

  return (
    <div ref={containerRef} className="font-mono text-[11px] leading-5 h-full overflow-y-auto pr-2 scrollbar-none">
      {logEntries.slice(0, step).map((line, i) => {
        const isHighlight = i === step - 1;
        const color = isHighlight ? GOLD : DIM;
        return (
          <div key={i} className="truncate transition-colors duration-150" style={{ color }}>
            <span style={{ color: GOLD, opacity: 0.6 }}>{`${i + 1}`.padStart(2, "0")}</span>
            <span className="mx-2" style={{ color: DIM, opacity: 0.4 }}>|</span>
            {line}
          </div>
        );
      })}
      {step < logEntries.length && <span className="animate-pulse" style={{ color: GOLD }}>█</span>}
    </div>
  );
}

function ScaledWrapper({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const windowWidth = window.innerWidth - 48; // padding
      const windowHeight = window.innerHeight - 140; // padding + back button space
      
      const scaleX = windowWidth / 1920;
      const scaleY = windowHeight / 1080;
      
      setScale(Math.min(scaleX, scaleY, 1));
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    const timer = setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full flex-1 flex items-center justify-center overflow-hidden py-4">
      <div
        className="origin-center transition-transform duration-300 ease-out flex-shrink-0 rounded-[20px]"
        style={{
          transform: `scale(${scale})`,
          width: "1920px",
          height: "1080px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function NextGenExecutionPreview() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s < logEntries.length ? s + 1 : 0));
    }, 450);
    return () => clearInterval(interval);
  }, []);

  const activeStageIndex = 
    step < 2 ? -1 :
    step < 6 ? 0 :
    step < 9 ? 1 :
    step < 13 ? 2 :
    step < 15 ? 3 : 4;

  return (
    <div className="min-h-screen w-full flex flex-col p-6 select-none bg-zinc-950 text-zinc-100 selection:bg-[oklch(0.78_0.14_65/0.2)] selection:text-[oklch(0.78_0.14_65/0.8)] relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.005)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.005)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none opacity-40" />

      {/* Ambient glows */}
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[40vh] w-[700px] -translate-x-1/2 rounded-full bg-[oklch(0.78_0.14_65/0.03)] blur-[120px]" />
      <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full pointer-events-none opacity-5 bg-[radial-gradient(circle,oklch(0.78_0.14_65),transparent_70%)] filter blur-[60px]" />
      <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full pointer-events-none opacity-5 bg-[radial-gradient(circle,oklch(0.79_0.15_85),transparent_70%)] filter blur-[60px]" />

      <div className="w-full max-w-[1920px] mx-auto mb-2 flex-shrink-0">
        <button
          onClick={() => navigate("/")}
          className="group inline-flex cursor-pointer items-center gap-1.5 text-[10px] font-mono text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          <ArrowLeft className="size-3" />
          Back to Hub
        </button>
      </div>

      <ScaledWrapper>
        <div className="relative w-[1920px] h-[1080px] overflow-hidden rounded-[20px] border border-zinc-800 bg-zinc-900/60 shadow-2xl flex-shrink-0">
          <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: `radial-gradient(circle, ${ACCENT} 0.5px, transparent 0.5px)`, backgroundSize: "40px 40px" }} />
          <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{ background: `repeating-linear-gradient(0deg, transparent, transparent 2px, ${ACCENT} 2px, ${ACCENT} 3px)` }} />

          <div className="relative z-10 h-full flex flex-col p-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-zinc-900/80 border border-zinc-800">
                  <Gauge size={20} style={{ color: GOLD }} />
                </div>
                <div>
                  <h1 className="text-2xl font-normal tracking-tight text-zinc-100">Next-Gen Execution</h1>
                  <p className="text-xs text-zinc-500">Lightweight executor with zero lag, optimized for instant script injection and blazing-fast runtime performance.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900/80 border border-zinc-800 text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                ONLINE
              </div>
            </div>

            {/* Main */}
            <div className="flex-1 flex items-stretch gap-6 min-h-0">
              {/* Radar Panel */}
              <div className="flex-shrink-0 w-[55%] h-full rounded-2xl border border-zinc-800 bg-zinc-900/40 flex items-center justify-center relative p-8">
                {/* Sci-fi Corner HUD Overlays */}
                <div className="absolute top-14 left-5 font-mono text-[9px] text-zinc-500 flex flex-col gap-0.5 pointer-events-none">
                  <div>SYS_EXEC: <span style={{ color: GOLD }}>ENGAGE</span></div>
                  <div>BYPASS_STATE: <span style={{ color: GREEN }}>SECURE</span></div>
                  <div>THREADS: 8/8 ACTIVE</div>
                </div>
                <div className="absolute top-14 right-5 font-mono text-[9px] text-zinc-500 text-right flex flex-col gap-0.5 pointer-events-none">
                  <div>LATENCY: <span style={{ color: GOLD }}>0.42ms</span></div>
                  <div>VM_TYPE: LUAU_L8</div>
                  <div>ATTACH_MODE: AUTO</div>
                </div>
                <div className="absolute bottom-5 left-5 font-mono text-[8px] text-zinc-600 flex flex-col gap-0.5 pointer-events-none">
                  <div>[SECURE ENCLAVE ENCRYPTED]</div>
                  <div>[INTEGRITY CHECK PASS]</div>
                  <div>[ANTI-BYFRON BYPASS V4.2]</div>
                </div>
                <div className="absolute bottom-5 right-5 font-mono text-[8px] text-zinc-600 text-right flex flex-col gap-0.5 pointer-events-none">
                  <div>CORE_HASH: 0x7FFA8E12F</div>
                  <div>MEM_BASE: 0x104A0000</div>
                  <div>UPTIME: 100%</div>
                </div>

                {/* Card Title Header */}
                <div className="absolute top-0 left-0 right-0 h-10 border-b border-zinc-800/40 bg-zinc-900/20 rounded-t-2xl px-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radar size={13} style={{ color: GOLD }} />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Core Telemetry & Thread Grid</span>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-500">SYSTEM: ACTIVE</span>
                </div>

                <div className="relative w-[65%] aspect-square"><RadarSweep /></div>
                
                {orbitStats.map((s, i) => {
                  const a = (i * 90 + 45) * (Math.PI / 180);
                  const r = 38;
                  return (
                    <div key={i} className="absolute flex items-center gap-2" style={{ left: `calc(50% + ${r * Math.cos(a)}%)`, top: `calc(50% + ${r * Math.sin(a)}%)`, transform: "translate(-50%, -50%)" }}>
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg backdrop-blur-sm bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 transition-colors">
                        <s.icon size={11} style={{ color: s.color }} />
                        <span className="text-xs font-bold" style={{ color: s.color }}>{s.value}</span>
                        <span className="text-[9px] text-zinc-500">{s.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Panel */}
              <div className="flex-1 flex flex-col gap-5 h-full min-w-0">
                {/* Terminal */}
                <div className="flex-1 rounded-2xl p-5 flex flex-col min-h-0 border border-zinc-800 bg-zinc-900/40">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/40 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <Satellite size={13} style={{ color: DIM }} />
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Execution Log</span>
                    </div>
                    <div className="flex items-center gap-4 text-[9px] font-mono text-zinc-500">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>BYPASS: OK</span>
                      </div>
                      <div>PID: 10484</div>
                      <div>HEAP: 4.87KB</div>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <TerminalStream step={step} />
                  </div>
                </div>

                {/* Pipeline */}
                <div className="flex-shrink-0 rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40">
                  <div className="flex items-center justify-between mb-5 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <Crosshair size={13} style={{ color: GOLD }} />
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Injection Pipeline</span>
                    </div>
                    <span className="text-[9px] font-mono text-zinc-500">CYCLE: {activeStageIndex >= 0 ? stages[activeStageIndex].label : "PENDING"}</span>
                  </div>
                  <div className="flex items-center">
                    {stages.map((s, idx) => {
                      const isCompleted = idx < activeStageIndex;
                      const isActive = idx === activeStageIndex;
                      const isPending = idx > activeStageIndex;
                      
                      const color = (isCompleted || isActive) ? GOLD : DIM;
                      const opacity = isPending ? 0.35 : 1;
                      
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center relative transition-all duration-300" style={{ opacity }}>
                          {idx > 0 && (
                            <div 
                              className="absolute h-[1.5px] w-full transition-all duration-500" 
                              style={{ 
                                background: isCompleted 
                                  ? `linear-gradient(90deg, ${GOLD}, ${GOLD}88)` 
                                  : `linear-gradient(90deg, ${GOLD}22, ${DIM}22)`, 
                                top: "11px", 
                                left: "-50%" 
                              }} 
                            />
                          )}
                          <div 
                            className={`relative z-10 w-[24px] h-[24px] rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? "animate-pulse" : ""}`} 
                            style={{ 
                              background: isActive ? `${GOLD}22` : "transparent", 
                              border: `1.5px solid ${color}`,
                              boxShadow: isActive ? `0 0 12px ${GOLD}` : "none"
                            }}
                          >
                            <s.icon size={11} style={{ color }} />
                          </div>
                          <span className="text-[9px] font-mono mt-1.5 transition-colors" style={{ color }}>{s.time}</span>
                          <span className="text-[9px] font-medium" style={{ color: isCompleted || isActive ? "oklch(0.9 0.01 65)" : DIM }}>{s.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="mt-6 flex border-t border-zinc-800 justify-between items-center pt-4 flex-shrink-0">
              <div className="flex gap-1">
                {[
                  { value: "0.42ms", label: "Average Latency", icon: Zap },
                  { value: "99.7%", label: "Injection Success", icon: CheckCircle2 },
                  { value: "18.4K/s", label: "Payload Throughput", icon: TrendingUp },
                ].map((s, i) => {
                  const StatIcon = s.icon;
                  return (
                    <div key={s.label} className={`flex items-center gap-3 px-5 py-1.5 ${i < 2 ? "border-r border-zinc-800" : ""}`}>
                      <StatIcon className="size-4" style={{ color: GOLD }} />
                      <div>
                        <div className="text-xs font-bold text-zinc-200 font-mono">{s.value}</div>
                        <div className="text-[9px] text-zinc-500 tracking-wide uppercase">{s.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95" style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD}bb)`, color: "oklch(0.1 0.01 65)", boxShadow: `0 0 20px ${GOLD}33` }}>
                <Play size={12} fill="currentColor" />
                Deploy Executor
              </div>
            </div>
          </div>

          <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full pointer-events-none opacity-5" style={{ background: `radial-gradient(circle, ${ACCENT}, transparent 70%)`, filter: "blur(60px)" }} />
          <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full pointer-events-none opacity-5" style={{ background: `radial-gradient(circle, ${AMBER}, transparent 70%)`, filter: "blur(60px)" }} />
        </div>
      </ScaledWrapper>
    </div>
  );
}
