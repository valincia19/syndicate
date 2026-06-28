import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import {
  Shield, Hexagon, Siren, CircleDot, Diamond, Square,
  X, Target, ShieldCheck, ArrowLeft,
  RefreshCw, Activity, ShieldAlert,
  Bell, BarChart3, Settings, Cpu
} from "lucide-react";

// ─── Constants (Zinc & Honey Gold Palette matching Hero 3) ───
const GOLD = "oklch(0.78 0.14 65)";
const ACCENT = "oklch(0.78 0.14 65)";
const GREEN = "oklch(0.72 0.19 150)";
const AMBER = "oklch(0.79 0.15 85)";

const nodes = [
  { id: "poly", name: "Polymorphic Engine", x: 40, y: 80, icon: Hexagon, status: "ACTIVE", detail: "Entropy: 99.8%", color: GREEN },
  { id: "stack", name: "Stack Frame Spoofer", x: 40, y: 350, icon: Siren, status: "ACTIVE", detail: "TID: 8841 spoofed", color: GOLD },
  { id: "mem", name: "Memory Redirector", x: 40, y: 620, icon: CircleDot, status: "ACTIVE", detail: "Target: 0x7FFA81", color: GREEN },
  { id: "sandbox", name: "Thread Sandbox", x: 396, y: 80, icon: Cpu, status: "ISOLATED", detail: "Sandbox VM: Active", color: AMBER },
  { id: "registry", name: "Registry Spoofer", x: 396, y: 620, icon: Settings, status: "MASKED", detail: "Keys: Rotated", color: AMBER },
  { id: "hwid", name: "HWID Spoofer", x: 752, y: 80, icon: Diamond, status: "SPOOFED", detail: "BIOS: VALINC-99", color: GOLD },
  { id: "heart", name: "Heartbeat Masker", x: 752, y: 350, icon: Square, status: "MASKED", detail: "Delay: 0.00ms", color: AMBER },
  { id: "integrity", name: "Integrity Checker", x: 752, y: 620, icon: ShieldAlert, status: "SECURE", detail: "Byfron status: Bypassed", color: GREEN },
];

const bypassMethods = [
  { name: "Heuristic Bypass", rate: 94.2, status: "OPTIMIZED" },
  { name: "Signature Scan", rate: 98.7, status: "SECURE" },
  { name: "Behavior Analytics", rate: 92.1, status: "STABLE" },
  { name: "Stack Frame Spoof", rate: 99.9, status: "MAXIMUM" },
];

const initialThreatAlerts = [
  { id: 1, type: "BYPASS", title: "Hyperion MemScan Blocked", desc: "Blocked memory signature query at region 0x7FFA", time: "Just Now", status: "BLOCKED" },
  { id: 2, type: "SPOOF", title: "HWID UUID Spoofed", desc: "Returned synthetic physical BIOS descriptor on client check", time: "2m ago", status: "SPOOFED" },
  { id: 3, type: "PROTECT", title: "Stack Frame Redirected", desc: "Masked Level 7 Roblox API call stack return pointers", time: "4m ago", status: "ACTIVE" },
  { id: 4, type: "SECURITY", title: "Anti-Cheat Heartbeat Bypassed", desc: "Telemetry packet modified and dispatched with 0ms lag", time: "7m ago", status: "SECURE" },
];

// ─── SVG Interconnected Flow Lines & Animation Definitions ───
const networkFlows = [
  // 1. Columns vertical flows
  { d: "M 160 180 L 160 350", color: GREEN, dur: "1.8s", delay: "0s" },
  { d: "M 160 180 L 160 350", color: GREEN, dur: "1.8s", delay: "0.9s" },
  { d: "M 160 450 L 160 620", color: GOLD, dur: "2.0s", delay: "0.3s" },
  { d: "M 160 450 L 160 620", color: GOLD, dur: "2.0s", delay: "1.3s" },
  { d: "M 516 180 L 516 320", color: AMBER, dur: "1.5s", delay: "0.1s" },
  { d: "M 516 480 L 516 620", color: AMBER, dur: "1.6s", delay: "0.7s" },
  { d: "M 872 180 L 872 350", color: GOLD, dur: "1.7s", delay: "0.2s" },
  { d: "M 872 180 L 872 350", color: GOLD, dur: "1.7s", delay: "1.0s" },
  { d: "M 872 450 L 872 620", color: GREEN, dur: "2.2s", delay: "0.5s" },

  // 2. Horizontal cross-connections
  { d: "M 280 130 L 396 130", color: GREEN, dur: "1.6s", delay: "0.4s" },
  { d: "M 636 130 L 752 130", color: GOLD, dur: "1.9s", delay: "0.8s" },
  { d: "M 280 670 L 396 670", color: GREEN, dur: "1.8s", delay: "0.2s" },
  { d: "M 636 670 L 752 670", color: AMBER, dur: "2.0s", delay: "0.6s" },

  // 3. Curved connections to Central Decoy VM
  { d: "M 280 160 C 340 160, 320 340, 386 340", color: GREEN, dur: "2.3s", delay: "0.1s" },
  { d: "M 280 160 C 340 160, 320 340, 386 340", color: GREEN, dur: "2.3s", delay: "1.2s" },
  { d: "M 280 400 L 386 400", color: GOLD, dur: "1.3s", delay: "0.3s" },
  { d: "M 280 640 C 340 640, 320 460, 386 460", color: GREEN, dur: "2.5s", delay: "0.5s" },
  { d: "M 752 160 C 692 160, 712 340, 646 340", color: GOLD, dur: "2.2s", delay: "0.2s" },
  { d: "M 752 160 C 692 160, 712 340, 646 340", color: GOLD, dur: "2.2s", delay: "1.3s" },
  { d: "M 752 400 L 646 400", color: AMBER, dur: "1.4s", delay: "0.6s" },
  { d: "M 752 640 C 692 640, 712 460, 646 460", color: GREEN, dur: "2.4s", delay: "0.4s" },

  // 4. Interconnecting Mesh diagonals (Creates highly organic complexity)
  { d: "M 280 370 C 320 320, 350 200, 396 160", color: GREEN, dur: "2.6s", delay: "0.1s" },
  { d: "M 396 160 C 350 200, 320 320, 280 370", color: GREEN, dur: "2.6s", delay: "1.4s" },
  { d: "M 636 160 C 680 200, 710 320, 752 370", color: GOLD, dur: "2.4s", delay: "0.3s" },
  { d: "M 752 430 C 710 480, 680 600, 636 640", color: AMBER, dur: "2.7s", delay: "0.7s" },
  { d: "M 396 640 C 350 600, 320 480, 280 430", color: GOLD, dur: "2.8s", delay: "0.9s" },

  // 5. Multi-direction mesh flows
  { d: "M 280 430 C 320 450, 350 580, 396 640", color: GOLD, dur: "2.5s", delay: "1.2s" },
  { d: "M 516 180 C 450 250, 260 250, 280 400", color: AMBER, dur: "2.9s", delay: "0.5s" },
  { d: "M 516 480 C 450 480, 260 550, 280 640", color: GREEN, dur: "3.0s", delay: "1.1s" },
  { d: "M 516 180 C 580 250, 730 250, 752 400", color: GOLD, dur: "2.8s", delay: "0.2s" },
  { d: "M 516 480 C 580 480, 730 550, 752 640", color: AMBER, dur: "3.1s", delay: "0.8s" },
];

// ─── Sub-Components ───

function ScaledWrapper({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const windowWidth = window.innerWidth - 48; // padding
      const windowHeight = window.innerHeight - 140; // padding + back button
      
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

function ThreatAlertFeed() {
  const [alerts, setAlerts] = useState(initialThreatAlerts);

  useEffect(() => {
    const interval = setInterval(() => {
      setAlerts((prev) => {
        const descriptions = [
          "Intercepted crash dump write sequence to prevent diagnostics report.",
          "Redirected virtual thread context to sandbox page allocation.",
          "HWID motherboard disk serial call hijacked successfully.",
          "Byfron heuristics integrity scan bypassed in module initialization.",
        ];
        const titles = [
          "Crash Reporter Intercepted",
          "Thread Context Redirected",
          "Disk Serial Spoofed",
          "Heuristic Scan Bypassed",
        ];
        const types = ["BYPASS", "SPOOF", "PROTECT", "SECURITY"];
        const nextId = prev.length + 1;
        const newAlert = {
          id: nextId,
          type: types[Math.floor(Math.random() * types.length)],
          title: titles[Math.floor(Math.random() * titles.length)],
          desc: descriptions[Math.floor(Math.random() * descriptions.length)],
          time: "Just Now",
          status: "SECURE"
        };
        const updated = prev.map(a => ({
          ...a,
          time: a.time === "Just Now" ? "1m ago" : a.time.includes("m ago") ? `${parseInt(a.time) + 1}m ago` : a.time
        }));
        return [newAlert, ...updated.slice(0, 3)];
      });
    }, 4500);

    return () => clearInterval(interval);
  }, []);

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
  );
}

// ─── Main Export ───

export default function AntiBanProtection() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
                  <Shield size={20} style={{ color: GOLD }} />
                </div>
                <div>
                  <h1 className="text-2xl font-normal tracking-tight text-zinc-100">Anti-Ban Protection</h1>
                  <p className="text-xs text-zinc-500">Advanced anti-cheat bypasses and undetected execution methods keeping your accounts secure at all times.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900/80 border border-zinc-800 text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                LIVE SECURE
              </div>
            </div>

            {/* Main Body */}
            <div className="flex-1 flex gap-6 min-h-0 items-stretch">
              
              {/* Left Column: Security Overview & Live Threat Feeds */}
              <div className="w-[380px] flex flex-col gap-5 min-h-0 flex-shrink-0">
                {/* Security Level Gauge */}
                <div className="rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40 flex flex-col items-center text-center justify-center">
                  <div className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase mb-3 flex items-center gap-1.5 self-start">
                    <ShieldCheck size={12} style={{ color: GOLD }} />
                    Bypass Integrity Gauge
                  </div>
                  <div className="relative flex items-center justify-center w-36 h-36 mt-2">
                    {/* Ring background */}
                    <svg className="absolute w-full h-full transform -rotate-90">
                      <circle cx="72" cy="72" r="60" stroke="#18181b" strokeWidth="6" fill="transparent" />
                      <circle cx="72" cy="72" r="60" stroke={GOLD} strokeWidth="6" fill="transparent"
                        strokeDasharray={376.8} strokeDashoffset={376.8 * 0.0002} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                    </svg>
                    <div className="text-center">
                      <span className="text-2xl font-bold font-mono tracking-tight text-zinc-100">99.98%</span>
                      <p className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider mt-0.5">UNDETECTED STATUS</p>
                    </div>
                  </div>
                </div>

                {/* Threat Alert Notification Center */}
                <div className="rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40 flex flex-col min-h-0 flex-1">
                  <div className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase mb-4 flex-shrink-0 flex items-center gap-1.5">
                    <ShieldAlert size={12} style={{ color: GOLD }} />
                    Live Threat Intercepts
                  </div>
                  <ThreatAlertFeed />
                </div>
              </div>

              {/* Center Column: Thread-Connected Node Flow Canvas (w: 1032px, h: 800px) */}
              <div className="flex-1 relative min-h-0 bg-zinc-950/40 rounded-2xl border border-zinc-800 p-4 overflow-hidden">
                
                {/* SVG Connector Threads */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                  <defs>
                    <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={GOLD} stopOpacity="0.2" />
                      <stop offset="50%" stopColor={GOLD} stopOpacity="0.9" />
                      <stop offset="100%" stopColor={GOLD} stopOpacity="0.2" />
                    </linearGradient>
                    <linearGradient id="green-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={GREEN} stopOpacity="0.2" />
                      <stop offset="50%" stopColor={GREEN} stopOpacity="0.9" />
                      <stop offset="100%" stopColor={GREEN} stopOpacity="0.2" />
                    </linearGradient>
                    <linearGradient id="amber-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={AMBER} stopOpacity="0.2" />
                      <stop offset="50%" stopColor={AMBER} stopOpacity="0.9" />
                      <stop offset="100%" stopColor={AMBER} stopOpacity="0.2" />
                    </linearGradient>
                    
                    {/* Glowing Filters for Animated Signals */}
                    <filter id="glow-gold" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <filter id="glow-green" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <filter id="glow-amber" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Draw Background Paths */}
                  {networkFlows.map((flow, idx) => (
                    <path
                      key={`bg-${idx}`}
                      d={flow.d}
                      stroke={flow.color}
                      strokeWidth="1.5"
                      fill="none"
                      opacity="0.1"
                    />
                  ))}

                  {/* Draw Animated Signals (Glowing traveling circles) */}
                  {networkFlows.map((flow, idx) => {
                    const filterId = 
                      flow.color === GREEN ? "url(#glow-green)" : 
                      flow.color === GOLD ? "url(#glow-gold)" : "url(#glow-amber)";
                    
                    return (
                      <circle
                        key={`sig-${idx}`}
                        r="3.5"
                        fill={flow.color}
                        filter={filterId}
                      >
                        <animateMotion
                          dur={flow.dur}
                          begin={flow.delay}
                          repeatCount="indefinite"
                          path={flow.d}
                        />
                      </circle>
                    );
                  })}
                </svg>

                {/* Central Decoy VM Shield Node */}
                <div className="absolute top-[320px] left-[386px] w-[260px] h-[160px] rounded-2xl p-4 flex flex-col items-center justify-center border-2 border-[oklch(0.78_0.14_65)] bg-zinc-950 z-10 transition-transform duration-300 hover:scale-105"
                     style={{ boxShadow: `0 0 25px oklch(0.78 0.14 65 / 0.15)` }}>
                  <div className="relative flex size-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-2">
                    <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-60" />
                    <ShieldCheck size={24} className="text-emerald-400" />
                  </div>
                  <div className="text-[12px] font-bold text-zinc-100 tracking-wider">VALINC DECOY VM</div>
                  <div className="text-[9px] font-mono text-zinc-500 mt-0.5">VIRTUAL SECURITY SHIELD</div>
                  <div className="text-[9px] font-mono text-emerald-400/80 font-semibold mt-1">100% BYPASSED</div>
                </div>

                {/* Surrounding Spoofer/Defense Engine Nodes */}
                {nodes.map((node) => {
                  const Icon = node.icon;
                  return (
                    <div
                      key={node.id}
                      className="absolute w-[240px] h-[100px] rounded-xl p-3 border border-zinc-800 bg-zinc-900/85 z-10 flex flex-col justify-between transition-all duration-300 hover:scale-105 hover:border-zinc-700"
                      style={{
                        left: `${node.x}px`,
                        top: `${node.y}px`,
                        boxShadow: `0 4px 15px rgba(0,0,0,0.5)`
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded bg-zinc-950 border border-zinc-850">
                            <Icon size={12} style={{ color: node.color }} />
                          </div>
                          <span className="text-[11px] font-bold text-zinc-200 truncate w-[140px] block">{node.name}</span>
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
                      <div className="text-[8.5px] font-mono text-zinc-400 truncate">
                        {node.detail}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Bypass rates and static hardware stats */}
              <div className="w-[380px] flex flex-col gap-5 min-h-0 flex-shrink-0">
                {/* Bypass reliability rates */}
                <div className="rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40 flex-shrink-0">
                  <h3 className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase mb-4 flex items-center gap-1.5">
                    <BarChart3 size={12} style={{ color: GOLD }} />
                    Bypass Vector Analytics
                  </h3>
                  <div className="space-y-4">
                    {bypassMethods.map((bm) => (
                      <div key={bm.name} className="group transition-all duration-300">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-zinc-300 group-hover:text-zinc-200">{bm.name}</span>
                          <span className="text-xs font-bold font-mono" style={{ color: GOLD }}>
                            {bm.rate}%
                          </span>
                        </div>
                        <div className="h-[5px] rounded-full bg-zinc-850 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-[1200ms] ease-out"
                            style={{
                              width: mounted ? `${bm.rate}%` : "0%",
                              background: `linear-gradient(90deg, ${GREEN}, ${GOLD})`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Process Sandbox Telemetry (New Card) */}
                <div className="rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40 flex-1 flex flex-col justify-between min-h-0">
                  <div className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase mb-3 flex items-center gap-1.5 flex-shrink-0">
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
                    <div className="h-1.5 rounded-full bg-zinc-850 overflow-hidden mt-1 flex-shrink-0">
                      <div className="h-full bg-emerald-500/80 rounded-full" style={{ width: "7.6%" }} />
                    </div>
                  </div>
                </div>

                {/* Masked Physical Hardware Specs */}
                <div className="rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40 flex-shrink-0">
                  <div className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase mb-3.5 flex items-center gap-1.5">
                    <Settings size={12} style={{ color: GOLD }} />
                    Active Physical HWID Masks
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { key: "Disk Serial", val: "ST1000LM035_W462" },
                      { key: "SMBIOS UUID", val: "F289E-99A2D-12A4" },
                      { key: "MAC Address", val: "4B:8F:A1:22:9E:C0" },
                      { key: "GPU Display ID", val: "NV_RTX_4070_99A1" },
                    ].map((h, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/40 border border-zinc-800/40">
                        <span className="text-[10px] text-zinc-400 font-medium">{h.key}</span>
                        <span className="text-[9px] font-mono text-zinc-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                          {h.val}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Stats Bar */}
            <div className="mt-6 flex border-t border-zinc-800 justify-between items-center pt-4 flex-shrink-0">
              <div className="flex gap-1">
                {[
                  { value: "99.98%", label: "Undetected Rate", icon: ShieldCheck },
                  { value: "0", label: "Ban Waves Recorded", icon: X },
                  { value: "2.1M", label: "Protected Active Sessions", icon: Target },
                ].map((s, i) => {
                  const StatIcon = s.icon;
                  return (
                    <div key={s.label} className={cn(
                      "flex items-center gap-3 px-5 py-1.5",
                      i < 2 && "border-r border-zinc-800"
                    )}>
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
                <RefreshCw size={12} className="animate-spin" style={{ animationDuration: "3s" }} />
                Verify Client Integrity
              </div>
            </div>

          </div>

          <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full pointer-events-none opacity-5" style={{ background: `radial-gradient(circle, ${ACCENT}, transparent 70%)`, filter: "blur-[60px]" }} />
          <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full pointer-events-none opacity-5" style={{ background: `radial-gradient(circle, ${AMBER}, transparent 70%)`, filter: "blur-[60px]" }} />
        </div>
      </ScaledWrapper>
    </div>
  );
}
