import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Code, Sliders, Eye, Settings, Play, Trash2,
  Copy, Check, Search, Sparkles, Shield, Target,
  User, Activity, Cpu, Laptop, Terminal, ChevronRight, Zap, Info
} from "lucide-react";

// ─── Scaled Wrapper Component ───
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
        style={{ 
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          transition: "transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)"
        }}
        className="flex-shrink-0"
      >
        {children}
      </div>
    </div>
  );
}

// ─── Theme Accent Configurations ───
interface AccentConfig {
  name: string;
  color: string;      // Tailwind text/border representation
  value: string;      // Raw OKLCH value
  glow: string;       // Drop shadow / glow style
  badge: string;      // Badge specific style
}

const ACCENTS: AccentConfig[] = [
  {
    name: "Syndicate Gold",
    color: "text-[oklch(0.78_0.14_65)] border-[oklch(0.78_0.14_65)]",
    value: "oklch(0.78 0.14 65)",
    glow: "rgba(224, 155, 30, 0.15)",
    badge: "text-[oklch(0.78_0.14_65)] border-[oklch(0.78_0.14_65/0.2)] bg-[oklch(0.78_0.14_65/0.05)]"
  },
  {
    name: "Emerald Matrix",
    color: "text-emerald-400 border-emerald-400",
    value: "oklch(0.79 0.17 150)",
    glow: "rgba(52, 211, 153, 0.15)",
    badge: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
  },
  {
    name: "Cyber Crimson",
    color: "text-rose-400 border-rose-400",
    value: "oklch(0.69 0.18 15)",
    glow: "rgba(251, 113, 133, 0.15)",
    badge: "text-rose-400 border-rose-500/20 bg-rose-500/5"
  },
  {
    name: "Nexus Cyan",
    color: "text-cyan-400 border-cyan-400",
    value: "oklch(0.78 0.14 200)",
    glow: "rgba(34, 211, 238, 0.15)",
    badge: "text-cyan-400 border-cyan-500/20 bg-cyan-500/5"
  }
];

// ─── Script Preset Definitions ───
interface ScriptPreset {
  name: string;
  description: string;
  code: string;
  category: "Combat" | "Visuals" | "Utilities";
}

const PRESETS: ScriptPreset[] = [
  {
    name: "VALINC Silent Aim V4",
    description: "Intercepts Roblox raycasts to force headshots automatically.",
    category: "Combat",
    code: `-- VALINC SYNDICATE: Silent Aim V4
local Settings = {
    TargetPart = "Head",
    FovCircle = true,
    FovRadius = 150,
    SilentAimActive = true
}

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer
local Camera = workspace.CurrentCamera

print("[VALINC] Injecting Silent Aim hooks...")
task.wait(0.2)
print("[VALINC] Raycast interceptors: ENGAGED")
print("[VALINC] Target locked: Head")
`
  },
  {
    name: "ESP Box Wallhack",
    description: "Draws bounding boxes and tracers through walls for all players.",
    category: "Visuals",
    code: `-- VALINC SYNDICATE: 3D ESP & Tracers
local ESP = {
    Boxes = true,
    Tracers = true,
    Names = true,
    Healthbars = true,
    MaxDistance = 500
}

print("[VALINC] Initializing Direct3D/Luau ESP hook...")
task.wait(0.3)
print("[VALINC] Found " .. #game.Players:GetPlayers() - 1 .. " other players.")
print("[VALINC] Box ESP rendered: SUCCESS")
`
  },
  {
    name: "Fly & Noclip Engine",
    description: "Bypasses workspace collision boundaries and unlocks vector movement.",
    category: "Utilities",
    code: `-- VALINC SYNDICATE: Flight Override
local Player = game.Players.LocalPlayer
local Character = Player.Character or Player.CharacterAdded:Wait()
local Humanoid = Character:WaitForChild("Humanoid")

print("[VALINC] Overriding humanoid state machine...")
Humanoid:ChangeState(Enum.HumanoidStateType.Physics)

task.spawn(function()
    while true do
        task.wait()
        Character.LowerTorso.CanCollide = false
        Character.UpperTorso.CanCollide = false
    end
end)
print("[VALINC] Flight engine: ACTIVE")
`
  },
  {
    name: "Infinity Yield Admin",
    description: "Loads the universal Roblox administration command console.",
    category: "Utilities",
    code: `-- VALINC SYNDICATE: Load Universal Admin
print("[VALINC] Fetching secure Admin repository...")
local fetch = game:HttpGet("https://valinc.net/inf_yield")
if fetch then
    print("[VALINC] Bytecode compiled successfully. Executing...")
    loadstring(fetch)()
else
    warn("[VALINC] Error downloading Admin scripts.")
end
`
  }
];

// ─── Target Player Simulation Data ───
interface SimPlayer {
  id: number;
  name: string;
  distance: number;
  x: number;
  y: number;
  w: number;
  h: number;
  health: number;
  isStaff: boolean;
  baseX: number;
  baseY: number;
}

const INITIAL_PLAYERS: SimPlayer[] = [
  { id: 1, name: "xX_NoobSlayer_Xx", distance: 42, x: 500, y: 400, w: 80, h: 160, health: 100, isStaff: false, baseX: 500, baseY: 400 },
  { id: 2, name: "NovaSecurity", distance: 125, x: 1200, y: 480, w: 60, h: 120, health: 85, isStaff: true, baseX: 1200, baseY: 480 },
  { id: 3, name: "BuildGuy_Roblox", distance: 18, x: 850, y: 320, w: 100, h: 200, health: 40, isStaff: false, baseX: 850, baseY: 320 }
];

export default function ScriptUIPreview() {
  const navigate = useNavigate();

  // ─── Theme / Accent State ───
  const [accent, setAccent] = useState<AccentConfig>(ACCENTS[0]);

  // ─── Sidebar Navigation ───
  const [activeTab, setActiveTab] = useState<"Home" | "Executor" | "Combat" | "Visuals" | "LocalPlayer" | "Settings">("Executor");

  // ─── Interactive Script States ───
  // Executor Tab
  const [editorText, setEditorText] = useState<string>(PRESETS[0].code);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "[SYSTEM] VALINC Executor Engine V1.0.1 initialized.",
    "[SYSTEM] Awaiting target process injection..."
  ]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [injectStatus, setInjectStatus] = useState<"READY" | "INJECTING" | "INJECTED">("INJECTED");

  // Combat Tab
  const [aimbotActive, setAimbotActive] = useState<boolean>(false);
  const [silentAim, setSilentAim] = useState<boolean>(false);
  const [drawFov, setDrawFov] = useState<boolean>(true);
  const [fovRadius, setFovRadius] = useState<number>(140);
  const [aimTarget, setAimTarget] = useState<string>("Head");
  const [aimSmoothness, setAimSmoothness] = useState<number>(4);

  // Visuals Tab
  const [boxEsp, setBoxEsp] = useState<boolean>(true);
  const [tracers, setTracers] = useState<boolean>(true);
  const [showNames, setShowNames] = useState<boolean>(true);
  const [healthbars, setHealthbars] = useState<boolean>(true);
  const [maxDistance, setMaxDistance] = useState<number>(300);

  // LocalPlayer Tab
  const [walkSpeed, setWalkSpeed] = useState<number>(16);
  const [jumpPower, setJumpPower] = useState<number>(50);
  const [gravity, setGravity] = useState<number>(196);
  const [infJump, setInfJump] = useState<boolean>(false);
  const [noclip, setNoclip] = useState<boolean>(false);
  const [flightMode, setFlightMode] = useState<boolean>(false);

  // General States
  const [showSaveSuccess, setShowSaveSuccess] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // ─── Simulated 3D Environment Movement ───
  const [simPlayers, setSimPlayers] = useState<SimPlayer[]>(INITIAL_PLAYERS);
  const [mousePos, setMousePos] = useState({ x: 960, y: 540 });

  // Update loop for players floating (breathing movement)
  useEffect(() => {
    let tick = 0;
    const interval = setInterval(() => {
      tick += 0.05;
      setSimPlayers((prev) =>
        prev.map((p, idx) => {
          const floatOffset = Math.sin(tick + idx) * 12;
          const driftOffset = Math.cos(tick * 0.5 + idx) * 20;
          return {
            ...p,
            x: p.baseX + driftOffset,
            y: p.baseY + floatOffset
          };
        })
      );
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Track mouse movement inside viewport to position target reticle
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // Scale coordinate to 1920x1080 bounds
    const x = ((e.clientX - rect.left) / rect.width) * 1920;
    const y = ((e.clientY - rect.top) / rect.height) * 1080;
    setMousePos({ x, y });
  };

  // ─── Script Execution Logic ───
  const executeCode = () => {
    if (isExecuting) return;
    setIsExecuting(true);
    setTerminalLogs((prev) => [...prev, `[LUAU] Compiling current bytecode...`]);

    setTimeout(() => {
      setTerminalLogs((prev) => [
        ...prev,
        `[LUAU] Bytecode compiled (Size: ${((editorText.length * 1.2) / 1000).toFixed(2)} KB).`,
        `[LUAU] Allocating thread environment...`,
        `[LUAU] Script executed successfully.`
      ]);
      setIsExecuting(false);

      // Context-aware automatic configuration triggers based on executed script names
      if (editorText.includes("Silent Aim") || editorText.includes("Combat")) {
        setAimbotActive(true);
        setSilentAim(true);
        setDrawFov(true);
        setTerminalLogs((prev) => [...prev, `[VALINC HUB] Combat modules toggled ON.`]);
      } else if (editorText.includes("ESP") || editorText.includes("Visuals")) {
        setBoxEsp(true);
        setTracers(true);
        setShowNames(true);
        setHealthbars(true);
        setTerminalLogs((prev) => [...prev, `[VALINC HUB] Visual ESP overlays toggled ON.`]);
      } else if (editorText.includes("Flight") || editorText.includes("Humanoid") || editorText.includes("Fly")) {
        setWalkSpeed(65);
        setNoclip(true);
        setFlightMode(true);
        setTerminalLogs((prev) => [...prev, `[VALINC HUB] LocalPlayer vector movement loaded.`]);
      }
    }, 850);
  };

  const handleInject = () => {
    if (injectStatus !== "READY") return;
    setInjectStatus("INJECTING");
    setTerminalLogs((prev) => [...prev, `[INJECT] Locating Roblox client window...`]);
    setTimeout(() => {
      setTerminalLogs((prev) => [
        ...prev,
        `[INJECT] Attached to process ID: 12480`,
        `[INJECT] Remapping Roblox Luau API registers...`,
        `[INJECT] Core injected successfully. Ready to run scripts.`
      ]);
      setInjectStatus("INJECTED");
    }, 1200);
  };

  const clearEditor = () => {
    setEditorText("");
    setTerminalLogs((prev) => [...prev, `[EDITOR] Code space cleared.`]);
  };

  const loadPreset = (preset: ScriptPreset, idx: number) => {
    setEditorText(preset.code);
    setTerminalLogs((prev) => [...prev, `[EDITOR] Loaded script preset: ${preset.name}`]);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1000);
  };

  const saveConfig = () => {
    setShowSaveSuccess(true);
    setTerminalLogs((prev) => [...prev, `[CONFIG] Saved custom configuration slot 'DEFAULT_VALINC.json'.`]);
    setTimeout(() => setShowSaveSuccess(false), 2000);
  };

  // Find nearest player to mouse for aimbot target highlight
  const getNearestPlayerToMouse = () => {
    let nearest: SimPlayer | null = null;
    let minDistance = 999999;
    
    simPlayers.forEach((p) => {
      const centerX = p.x + p.w / 2;
      const centerY = p.y + p.h / 2;
      const dx = centerX - mousePos.x;
      const dy = centerY - mousePos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = p;
      }
    });

    return { player: nearest, dist: minDistance };
  };

  const nearest = getNearestPlayerToMouse();
  const targetLockActive = aimbotActive && nearest.player && nearest.dist < fovRadius;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 select-none relative overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      
      {/* Back button */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-350 text-xs font-mono transition-colors"
        >
          <ArrowLeft size={14} /> BACK TO ASSETS HUB
        </button>
      </div>

      {/* Ambient backgrounds */}
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[40vh] w-[700px] -translate-x-1/2 rounded-full bg-[oklch(0.78_0.14_65/0.03)] blur-[120px]" />

      <ScaledWrapper>
        {/* Core 1920x1080 viewport */}
        <div 
          onMouseMove={handleMouseMove}
          className="relative w-[1920px] h-[1080px] overflow-hidden rounded-[20px] border border-zinc-800 bg-zinc-900/60 shadow-2xl flex-shrink-0 flex flex-col"
        >
          {/* Simulated Roblox Gameplay Background Viewport */}
          <div className="absolute inset-0 z-0 bg-zinc-950 pointer-events-none overflow-hidden select-none">
            {/* Cyber Grid Plane */}
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(63, 63, 70, 0.4) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(63, 63, 70, 0.4) 1px, transparent 1px)
                `,
                backgroundSize: "60px 60px",
                transform: "perspective(800px) rotateX(60deg) translateY(-200px) translateZ(-100px)",
                transformOrigin: "center top",
                height: "200%"
              }}
            />

            {/* Glowing Horizon */}
            <div className="absolute bottom-0 left-0 right-0 h-[300px] bg-gradient-to-t from-zinc-900/60 to-transparent border-t border-zinc-800/30" />

            {/* Simulated 3D Blocks in Roblox Scene */}
            <div className="absolute left-[300px] bottom-[300px] w-48 h-96 bg-zinc-900 border border-zinc-800 rounded-lg transform skew-y-3 opacity-30 shadow-inner flex items-center justify-center">
              <span className="text-zinc-650 font-mono text-xs">Pillar A</span>
            </div>
            <div className="absolute right-[400px] bottom-[450px] w-64 h-64 bg-zinc-900 border border-zinc-800 rounded-lg transform -skew-y-6 opacity-25 shadow-inner flex items-center justify-center">
              <span className="text-zinc-650 font-mono text-xs">Platform B</span>
            </div>
            <div className="absolute left-[850px] top-[150px] w-32 h-32 bg-zinc-900/40 border border-zinc-800/30 rounded-lg transform rotate-45 opacity-20" />

            {/* ─── Simulated ESP Renderings ─── */}
            {simPlayers.map((player) => {
              const isLocked = targetLockActive && nearest.player?.id === player.id;
              return (
                <div 
                  key={player.id} 
                  style={{
                    position: "absolute",
                    left: `${player.x}px`,
                    top: `${player.y}px`,
                    width: `${player.w}px`,
                    height: `${player.h}px`,
                    transition: "all 0.05s ease-out"
                  }}
                  className="relative flex flex-col justify-between items-center"
                >
                  {/* Outer Bounding Box ESP */}
                  {boxEsp && (
                    <div 
                      className="absolute inset-0 rounded border transition-colors duration-300"
                      style={{
                        borderColor: isLocked 
                          ? "oklch(0.69 0.18 15)" 
                          : accent.value,
                        backgroundColor: isLocked 
                          ? "rgba(251, 113, 133, 0.05)" 
                          : `${accent.glow.replace("0.15", "0.03")}`,
                        boxShadow: `0 0 12px ${isLocked ? "rgba(251,113,133,0.3)" : accent.glow}`
                      }}
                    />
                  )}

                  {/* Healthbar ESP */}
                  {boxEsp && healthbars && (
                    <div className="absolute -left-3 top-0 bottom-0 w-[4px] bg-zinc-900/60 border border-zinc-800 rounded-full overflow-hidden flex flex-col justify-end">
                      <div 
                        className="w-full bg-emerald-500 rounded-full transition-all duration-350"
                        style={{ height: `${player.health}%` }}
                      />
                    </div>
                  )}

                  {/* Head Target Node (Aimbot lock visual) */}
                  <div 
                    className="absolute top-2 w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-300"
                    style={{
                      left: "50%",
                      transform: "translateX(-50%)",
                      borderColor: isLocked ? "oklch(0.69 0.18 15)" : "rgba(255,255,255,0.2)",
                      backgroundColor: isLocked ? "rgba(251, 113, 133, 0.6)" : "transparent"
                    }}
                  >
                    {isLocked && <span className="absolute animate-ping w-8 h-8 rounded-full border border-rose-500/50" />}
                  </div>

                  {/* Text Tags ESP */}
                  {showNames && (
                    <div 
                      className="absolute -top-12 px-2 py-0.5 rounded bg-zinc-950/80 border border-zinc-800 text-[10px] font-mono text-zinc-300 flex flex-col items-center gap-0.5 whitespace-nowrap shadow-md pointer-events-none"
                      style={{
                        borderColor: isLocked ? "oklch(0.69 0.18 15/0.4)" : "rgb(39, 39, 42)"
                      }}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        {player.isStaff && (
                          <span className="text-red-400 font-black text-[8px] border border-red-500/20 px-1 py-px rounded bg-red-950/20">STAFF</span>
                        )}
                        <span>{player.name}</span>
                      </div>
                      <span className="text-[9px] text-zinc-500 font-medium">Dist: {player.distance}m • HP: {player.health}%</span>
                    </div>
                  )}

                  {/* Tracer Lines */}
                  {tracers && (
                    <svg className="absolute overflow-visible pointer-events-none" style={{ top: `${player.h}px`, left: `${player.w / 2}px` }}>
                      <line 
                        x1="0" 
                        y1="0" 
                        x2={`${960 - (player.x + player.w / 2)}`} 
                        y2={`${1000 - (player.y + player.h)}`}
                        style={{
                          stroke: isLocked ? "oklch(0.69 0.18 15)" : accent.value,
                          strokeWidth: 1,
                          strokeOpacity: isLocked ? 0.8 : 0.45,
                          strokeDasharray: isLocked ? "3 3" : "none"
                        }}
                      />
                    </svg>
                  )}

                  {/* Lock Indicator */}
                  {isLocked && (
                    <div className="absolute -bottom-8 bg-rose-500/90 text-white font-mono font-bold text-[9px] px-1.5 py-0.5 rounded tracking-widest animate-pulse border border-rose-400/30">
                      LOCKED
                    </div>
                  )}
                </div>
              );
            })}

            {/* Aimbot FOV Circle Overlay */}
            {drawFov && (
              <div 
                className="absolute rounded-full border pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-colors duration-300"
                style={{
                  left: "960px",
                  top: "540px",
                  width: `${fovRadius * 2}px`,
                  height: `${fovRadius * 2}px`,
                  borderColor: targetLockActive ? "oklch(0.69 0.18 15/0.25)" : `${accent.value}25`,
                  borderStyle: "dashed",
                  boxShadow: `inset 0 0 15px ${targetLockActive ? "rgba(251,113,133,0.02)" : "rgba(255,255,255,0.005)"}`
                }}
              />
            )}

            {/* Crosshair Dot */}
            <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 z-10 mix-blend-difference" />

            {/* Simulated Roblox Topbar */}
            <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-6 z-10">
              <div className="flex items-center gap-4">
                {/* Simulated Roblox Logo */}
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/10 hover:bg-white/20 transition-all cursor-pointer">
                  <span className="text-white text-lg font-black tracking-tighter skew-x-12">R</span>
                </div>
                {/* Chat button */}
                <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center border border-white/5 hover:bg-black/60 transition-all cursor-pointer">
                  <span className="text-zinc-400 hover:text-white text-xs font-mono">💬</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 rounded bg-black/40 border border-white/5 text-[10px] font-mono text-zinc-400">
                  SERVER ID: <span className="text-zinc-200">VALINC_PROD_1048</span>
                </div>
                <div className="px-3 py-1 rounded bg-black/40 border border-white/5 text-[10px] font-mono text-zinc-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  60 FPS
                </div>
              </div>
            </div>

            {/* Simulated Roblox Left Info Panels (Bypass status alerts) */}
            <div className="absolute top-20 left-6 flex flex-col gap-2 z-10 max-w-sm pointer-events-none">
              <div className="bg-zinc-950/70 border border-zinc-900/60 p-3 rounded-lg backdrop-blur-sm">
                <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-1.5">
                  <Cpu size={12} className="text-zinc-500" />
                  ACTIVE PROCESS DETECTOR
                </div>
                <div className="mt-1 text-xs text-zinc-200 flex items-center justify-between">
                  <span>RobloxPlayerBeta.exe</span>
                  <span className="text-emerald-400 font-bold">MONITORED</span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Core Floating VALINC Script UI Window ─── */}
          <div className="relative z-10 m-auto flex flex-col h-[670px] w-[1000px] rounded-2xl border border-zinc-800/80 bg-zinc-950/85 shadow-2xl backdrop-blur-xl overflow-hidden transition-all duration-300">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-[0.01] pointer-events-none" style={{ backgroundImage: `radial-gradient(circle, ${accent.value} 1px, transparent 1px)`, backgroundSize: "24px 24px" }} />
            
            {/* Window Header */}
            <div className="h-12 border-b border-zinc-900 flex items-center justify-between px-5 bg-zinc-950/95 relative z-10 flex-shrink-0">
              <div className="flex items-center gap-3">
                {/* Mock Window Action Buttons */}
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/40 hover:bg-red-500/80 transition-colors cursor-pointer" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/40 hover:bg-yellow-500/80 transition-colors cursor-pointer" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/80 transition-colors cursor-pointer" />
                </div>
                <div className="h-4 w-px bg-zinc-800 mx-1" />
                {/* Brand Title */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold tracking-widest text-zinc-100">VALINC</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-zinc-800 bg-zinc-900/60 text-zinc-400 font-mono tracking-wider">SYNDICATE</span>
                </div>
              </div>

              {/* Status information */}
              <div className="flex items-center gap-6 text-[10px] font-mono text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-emerald-500" />
                  <span>CORE:</span>
                  <span className="text-zinc-300">ACTIVE</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>PING:</span>
                  <span className="text-zinc-300">12ms</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>ACCENT:</span>
                  <span className="text-zinc-300 uppercase" style={{ color: accent.value }}>{accent.name.split(" ")[1]}</span>
                </div>
              </div>
            </div>

            {/* Window Content Split */}
            <div className="flex-1 flex min-h-0 relative z-10">
              
              {/* Sidebar Navigation */}
              <div className="w-[200px] border-r border-zinc-900/80 bg-zinc-950 flex flex-col justify-between py-4 flex-shrink-0">
                <div className="space-y-1 px-3">
                  {[
                    { id: "Home", label: "Dashboard", icon: User },
                    { id: "Executor", label: "Code Executor", icon: Code },
                    { id: "Combat", label: "Combat hacks", icon: Target },
                    { id: "Visuals", label: "Visual ESP", icon: Eye },
                    { id: "LocalPlayer", label: "Player Mods", icon: Sliders },
                    { id: "Settings", label: "GUI Settings", icon: Settings },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as any)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-mono transition-all duration-200 cursor-pointer ${
                          isActive 
                            ? "bg-zinc-900 border border-zinc-800 text-white font-semibold"
                            : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-950"
                        }`}
                        style={{
                          boxShadow: isActive ? `0 0 10px ${accent.glow}` : "none",
                          borderLeft: isActive ? `2px solid ${accent.value}` : ""
                        }}
                      >
                        <Icon size={14} className={isActive ? "" : "text-zinc-650"} style={{ color: isActive ? accent.value : undefined }} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Sidebar Info Footer */}
                <div className="px-5 py-3 border-t border-zinc-900/80 mx-3 font-mono text-[9px] text-zinc-600 flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <span>BYPASS STAGE:</span>
                    <span className="text-emerald-500 font-bold">SECURE</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VM VERSION:</span>
                    <span className="text-zinc-400">LUAU_L8</span>
                  </div>
                </div>
              </div>

              {/* Main Panel Content Area */}
              <div className="flex-1 flex flex-col min-h-0 bg-zinc-900/20 p-6 overflow-y-auto select-text">
                
                {/* ─── TABS ROUTING ─── */}

                {/* 1. HOME / DASHBOARD TAB */}
                {activeTab === "Home" && (
                  <div className="space-y-5">
                    {/* Welcome Header */}
                    <div className="rounded-xl border border-zinc-850 bg-zinc-900/35 p-5 relative overflow-hidden">
                      <div className="absolute right-4 bottom-0 opacity-5 pointer-events-none">
                        <Sparkles size={120} style={{ color: accent.value }} />
                      </div>
                      <h2 className="text-base font-normal tracking-tight text-zinc-200">Welcome to VALINC Syndicate, <span className="font-bold" style={{ color: accent.value }}>User</span></h2>
                      <p className="text-xs text-zinc-500 mt-1 max-w-xl">Your subscription tier is <span className="text-zinc-300 font-bold">VALINC PRO</span>, valid for 288 days. All bypass integrity tests are normal and operational.</p>
                      
                      <div className="mt-4 flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1 rounded border px-2.5 py-1 text-[9px] font-mono font-bold tracking-wider ${accent.badge}`}>
                          LICENSE STABLE
                        </span>
                        <div className="text-[10px] font-mono text-zinc-500">
                          Active Client Host: <span className="text-zinc-300">127.0.0.1:5174</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: "Luau Thread State", value: "8/8 Active Threads", detail: "Thread scheduler OK", icon: Cpu },
                        { label: "Security Decoy", value: "Polymorphic Hooked", detail: "Remapped 0x7FFA", icon: Shield },
                        { label: "Injection Method", value: "DLL Registry Mapping", detail: "Hyperion bypass V4", icon: Laptop }
                      ].map((card, i) => {
                        const Icon = card.icon;
                        return (
                          <div key={i} className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-4 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-[10px] font-mono text-zinc-500 uppercase">{card.label}</span>
                              <Icon size={14} style={{ color: accent.value }} />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-zinc-200 font-mono">{card.value}</div>
                              <div className="text-[10px] text-zinc-650 mt-0.5 font-mono">{card.detail}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Action Logs Summary */}
                    <div className="rounded-xl border border-zinc-900 bg-zinc-950/30 p-4">
                      <div className="text-[10px] font-mono text-zinc-400 mb-3 flex items-center gap-2">
                        <Terminal size={12} style={{ color: accent.value }} />
                        CURRENT CLIENT ATTACHMENT REPORT
                      </div>
                      <div className="space-y-1.5 font-mono text-[10px]">
                        <div className="flex items-start gap-2">
                          <span className="text-zinc-650">[09:30:12]</span>
                          <span className="text-zinc-400">Scan Roblox virtual environment...</span>
                          <span className="text-emerald-400 font-bold ml-auto">[FOUND]</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-zinc-650">[09:30:13]</span>
                          <span className="text-zinc-400">Initialize custom Byfron/Hyperion bypass hooks...</span>
                          <span className="text-emerald-400 font-bold ml-auto">[OK]</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-zinc-650">[09:30:14]</span>
                          <span className="text-zinc-400">Dispatch polymorphic loader pipeline...</span>
                          <span className="text-emerald-400 font-bold ml-auto">[SUCCESS]</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. EXECUTOR TAB */}
                {activeTab === "Executor" && (
                  <div className="flex-1 flex gap-5 min-h-0 h-full">
                    {/* Left Column: Monaco Editor style & output */}
                    <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 rounded-xl border border-zinc-900 relative">
                      
                      {/* Editor Titlebar */}
                      <div className="h-10 px-4 border-b border-zinc-900 flex items-center justify-between text-[10px] font-mono text-zinc-400 bg-zinc-950 rounded-t-xl">
                        <div className="flex items-center gap-2">
                          <Code size={12} style={{ color: accent.value }} />
                          <span>main.lua</span>
                        </div>
                        <span>LUAU FORMATTING</span>
                      </div>

                      {/* Code Input Field */}
                      <div className="flex-1 flex min-h-0 p-4 font-mono text-xs overflow-hidden">
                        {/* Simulated Line Numbers */}
                        <div className="text-zinc-650 pr-4 select-none border-r border-zinc-900 text-right flex flex-col gap-1 w-8">
                          {Array.from({ length: 15 }).map((_, idx) => (
                            <div key={idx}>{idx + 1}</div>
                          ))}
                        </div>
                        {/* Text Area */}
                        <textarea
                          value={editorText}
                          onChange={(e) => setEditorText(e.target.value)}
                          className="flex-1 bg-transparent border-none outline-none text-zinc-350 resize-none pl-4 focus:ring-0 selection:bg-zinc-800/80 overflow-y-auto leading-relaxed"
                          placeholder="-- Write custom Luau script here..."
                        />
                      </div>

                      {/* Custom console / output log inside editor */}
                      <div className="h-32 border-t border-zinc-900 bg-zinc-950/85 p-3 font-mono text-[9px] overflow-y-auto flex flex-col gap-1 text-zinc-400">
                        <div className="text-[10px] font-bold text-zinc-505 mb-1 sticky top-0 bg-zinc-950/95 flex items-center justify-between">
                          <span>EXECUTION OUTPUT LOG</span>
                          <span className="text-[8px] border border-zinc-800 px-1 py-px rounded">PAGER=CAT</span>
                        </div>
                        {terminalLogs.map((log, idx) => (
                          <div key={idx} className="flex gap-2 items-start leading-tight">
                            <span className="text-zinc-700 flex-shrink-0">&gt;</span>
                            <span className={log.includes("[SYSTEM]") ? "text-zinc-500" : log.includes("[LUAU]") ? "text-amber-400" : "text-zinc-300"}>{log}</span>
                          </div>
                        ))}
                      </div>

                      {/* Action buttons footer */}
                      <div className="h-12 px-4 border-t border-zinc-900 flex items-center justify-between bg-zinc-950 rounded-b-xl">
                        <div className="flex gap-2">
                          <button
                            onClick={executeCode}
                            disabled={isExecuting}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-white text-black hover:bg-zinc-200 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <Play size={12} fill="currentColor" />
                            {isExecuting ? "EXECUTING..." : "EXECUTE"}
                          </button>
                          <button
                            onClick={clearEditor}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border border-zinc-850 hover:bg-zinc-900 transition-colors text-zinc-400 hover:text-white cursor-pointer"
                          >
                            <Trash2 size={12} />
                            CLEAR
                          </button>
                        </div>

                        {injectStatus === "READY" ? (
                          <button
                            onClick={handleInject}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border border-rose-500/20 text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Zap size={12} className="animate-pulse" />
                            ATTACH TO GAME
                          </button>
                        ) : injectStatus === "INJECTING" ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-zinc-500 bg-zinc-900/50 rounded-lg">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-ping" />
                            ATTACHING...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            SECURELY ATTACHED
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Pre-made Scripts Presets */}
                    <div className="w-[260px] flex flex-col gap-3 flex-shrink-0 min-h-0">
                      <div className="text-[10px] font-mono font-bold text-zinc-500 px-1 tracking-wider">VALINC PRESET HUB</div>
                      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                        {PRESETS.map((preset, idx) => {
                          const isCopied = copiedIndex === idx;
                          return (
                            <div 
                              key={idx}
                              className="p-3.5 rounded-xl border border-zinc-900 bg-zinc-950/60 hover:border-zinc-800 hover:bg-zinc-950 transition-all flex flex-col justify-between h-[110px]"
                            >
                              <div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-zinc-200">{preset.name}</span>
                                  <span className="text-[8px] font-mono px-1 rounded bg-zinc-900 text-zinc-500">{preset.category}</span>
                                </div>
                                <p className="text-[10px] text-zinc-500 mt-1.5 leading-snug line-clamp-2">{preset.description}</p>
                              </div>
                              <button
                                onClick={() => loadPreset(preset, idx)}
                                className={`w-full flex items-center justify-center gap-1.5 py-1 text-[9px] font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                                  isCopied 
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                                    : "border-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-white"
                                }`}
                              >
                                {isCopied ? (
                                  <>
                                    <Check size={10} />
                                    PRESET LOADED
                                  </>
                                ) : (
                                  <>
                                    <Copy size={10} />
                                    LOAD INTO EDITOR
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. COMBAT HACKS TAB */}
                {activeTab === "Combat" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                      <div>
                        <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                          <Target size={16} style={{ color: accent.value }} />
                          Aimbot & Combat Systems
                        </h2>
                        <p className="text-xs text-zinc-500 mt-0.5">Automate and customize targeting mechanics inside client environments.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      {/* Left Column Controls */}
                      <div className="space-y-4">
                        {/* Toggles Card */}
                        <div className="rounded-xl border border-zinc-900 bg-zinc-950/40 p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs font-bold text-zinc-200">Aimbot Override</div>
                              <div className="text-[10px] text-zinc-505 mt-0.5">Automatically align crosshair viewport onto target models.</div>
                            </div>
                            <button
                              onClick={() => {
                                setAimbotActive(!aimbotActive);
                                setTerminalLogs(prev => [...prev, `[COMBAT] Aimbot Override: ${!aimbotActive ? "ACTIVE" : "INACTIVE"}`]);
                              }}
                              className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${aimbotActive ? "bg-emerald-500" : "bg-zinc-800"}`}
                            >
                              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${aimbotActive ? "translate-x-5" : "translate-x-0"}`} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between border-t border-zinc-900/60 pt-4">
                            <div>
                              <div className="text-xs font-bold text-zinc-200">Silent Aim System</div>
                              <div className="text-[10px] text-zinc-500 mt-0.5">Redefines target orientation check vectors for server bypass.</div>
                            </div>
                            <button
                              onClick={() => {
                                setSilentAim(!silentAim);
                                setTerminalLogs(prev => [...prev, `[COMBAT] Silent Aim System: ${!silentAim ? "ACTIVE" : "INACTIVE"}`]);
                              }}
                              className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${silentAim ? "bg-emerald-500" : "bg-zinc-800"}`}
                            >
                              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${silentAim ? "translate-x-5" : "translate-x-0"}`} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between border-t border-zinc-900/60 pt-4">
                            <div>
                              <div className="text-xs font-bold text-zinc-200">Draw FOV Circle Overlay</div>
                              <div className="text-[10px] text-zinc-505 mt-0.5">Render target acquisition boundaries onto HUD viewport.</div>
                            </div>
                            <button
                              onClick={() => {
                                setDrawFov(!drawFov);
                              }}
                              className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${drawFov ? "bg-emerald-500" : "bg-zinc-800"}`}
                            >
                              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${drawFov ? "translate-x-5" : "translate-x-0"}`} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Right Column Sliders */}
                      <div className="space-y-4">
                        <div className="rounded-xl border border-zinc-900 bg-zinc-950/40 p-5 space-y-5">
                          {/* FOV Radius Slider */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-mono">
                              <span className="text-zinc-400">Target FOV Radius</span>
                              <span className="text-zinc-200 font-bold" style={{ color: accent.value }}>{fovRadius}px</span>
                            </div>
                            <input
                              type="range"
                              min="50"
                              max="300"
                              value={fovRadius}
                              onChange={(e) => setFovRadius(Number(e.target.value))}
                              className="w-full accent-white bg-zinc-800 h-1 rounded-lg cursor-pointer"
                            />
                            <div className="flex justify-between text-[9px] font-mono text-zinc-650">
                              <span>50px (Tight)</span>
                              <span>300px (Wide)</span>
                            </div>
                          </div>

                          {/* Smoothness Slider */}
                          <div className="space-y-2 border-t border-zinc-900/60 pt-4">
                            <div className="flex justify-between text-xs font-mono">
                              <span className="text-zinc-400">Aim Smoothness</span>
                              <span className="text-zinc-200 font-bold" style={{ color: accent.value }}>{aimSmoothness}</span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="10"
                              value={aimSmoothness}
                              onChange={(e) => setAimSmoothness(Number(e.target.value))}
                              className="w-full accent-white bg-zinc-800 h-1 rounded-lg cursor-pointer"
                            />
                            <div className="flex justify-between text-[9px] font-mono text-zinc-650">
                              <span>Instant (1)</span>
                              <span>Ultra-Smooth (10)</span>
                            </div>
                          </div>

                          {/* Target Select */}
                          <div className="space-y-2 border-t border-zinc-900/60 pt-4">
                            <label className="block text-xs font-mono text-zinc-400">Locked Hitbox Target</label>
                            <div className="grid grid-cols-3 gap-2">
                              {["Head", "Torso", "Random"].map((part) => (
                                <button
                                  key={part}
                                  onClick={() => {
                                    setAimTarget(part);
                                    setTerminalLogs(prev => [...prev, `[COMBAT] Locked Hitbox: ${part}`]);
                                  }}
                                  className={`py-1.5 rounded-lg border text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                    aimTarget === part
                                      ? "bg-white text-black border-white"
                                      : "border-zinc-850 bg-zinc-950/60 hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300"
                                  }`}
                                >
                                  {part.toUpperCase()}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. VISUAL ESP OVERLAYS TAB */}
                {activeTab === "Visuals" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                      <div>
                        <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                          <Eye size={16} style={{ color: accent.value }} />
                          Visual ESP Renderings
                        </h2>
                        <p className="text-xs text-zinc-500 mt-0.5">Render player models and bounding boxes through geometric maps.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="rounded-xl border border-zinc-900 bg-zinc-950/40 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-zinc-200">Bounding Box ESP</div>
                            <div className="text-[10px] text-zinc-505 mt-0.5">Draw 2D neon alignment borders around player meshes.</div>
                          </div>
                          <button
                            onClick={() => {
                              setBoxEsp(!boxEsp);
                              setTerminalLogs(prev => [...prev, `[ESP] Box ESP: ${!boxEsp ? "ON" : "OFF"}`]);
                            }}
                            className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${boxEsp ? "bg-emerald-500" : "bg-zinc-800"}`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${boxEsp ? "translate-x-5" : "translate-x-0"}`} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between border-t border-zinc-900/60 pt-4">
                          <div>
                            <div className="text-xs font-bold text-zinc-200">Tracer Lines</div>
                            <div className="text-[10px] text-zinc-500 mt-0.5">Project tracking lines from bottom-center to target bases.</div>
                          </div>
                          <button
                            onClick={() => {
                              setTracers(!tracers);
                              setTerminalLogs(prev => [...prev, `[ESP] Tracers: ${!tracers ? "ON" : "OFF"}`]);
                            }}
                            className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${tracers ? "bg-emerald-500" : "bg-zinc-800"}`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${tracers ? "translate-x-5" : "translate-x-0"}`} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between border-t border-zinc-900/60 pt-4">
                          <div>
                            <div className="text-xs font-bold text-zinc-200">Show Names Tag</div>
                            <div className="text-[10px] text-zinc-505 mt-0.5">Expose username indices and distance indicators.</div>
                          </div>
                          <button
                            onClick={() => {
                              setShowNames(!showNames);
                              setTerminalLogs(prev => [...prev, `[ESP] Names: ${!showNames ? "ON" : "OFF"}`]);
                            }}
                            className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${showNames ? "bg-emerald-500" : "bg-zinc-800"}`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${showNames ? "translate-x-5" : "translate-x-0"}`} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between border-t border-zinc-900/60 pt-4">
                          <div>
                            <div className="text-xs font-bold text-zinc-200">Healthbar Indicator</div>
                            <div className="text-[10px] text-zinc-505 mt-0.5">Render target health bars relative to their maximum HP.</div>
                          </div>
                          <button
                            onClick={() => {
                              setHealthbars(!healthbars);
                              setTerminalLogs(prev => [...prev, `[ESP] Healthbars: ${!healthbars ? "ON" : "OFF"}`]);
                            }}
                            className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${healthbars ? "bg-emerald-500" : "bg-zinc-800"}`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${healthbars ? "translate-x-5" : "translate-x-0"}`} />
                          </button>
                        </div>
                      </div>

                      <div className="rounded-xl border border-zinc-900 bg-zinc-950/40 p-5 space-y-4 flex flex-col justify-center">
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-zinc-400">Max ESP Draw Distance</span>
                            <span className="text-zinc-200 font-bold" style={{ color: accent.value }}>{maxDistance} Studs</span>
                          </div>
                          <input
                            type="range"
                            min="50"
                            max="1000"
                            value={maxDistance}
                            onChange={(e) => setMaxDistance(Number(e.target.value))}
                            className="w-full accent-white bg-zinc-800 h-1 rounded-lg cursor-pointer"
                          />
                          <div className="flex justify-between text-[9px] font-mono text-zinc-650">
                            <span>50m (Close)</span>
                            <span>1000m (Map-Wide)</span>
                          </div>
                        </div>

                        <div className="mt-4 border-t border-zinc-900/65 pt-4 text-[10px] font-mono text-zinc-500 space-y-2">
                          <div className="flex items-center gap-2">
                            <Info size={12} className="text-zinc-505" />
                            <span>Bypasses anti-esp occlusion maps in real-time.</span>
                          </div>
                          <div>Visual rendering buffers are drawn via local system overlay contexts.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. LOCAL PLAYER MODIFICATIONS TAB */}
                {activeTab === "LocalPlayer" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                      <div>
                        <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                          <Sliders size={16} style={{ color: accent.value }} />
                          Humanoid & Player Modifiers
                        </h2>
                        <p className="text-xs text-zinc-500 mt-0.5">Bypass internal client speed limits and movement restrictions.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      {/* Sliders Column */}
                      <div className="rounded-xl border border-zinc-900 bg-zinc-950/40 p-5 space-y-5">
                        
                        {/* Walkspeed */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-zinc-400">WalkSpeed Override</span>
                            <span className="text-zinc-200 font-bold" style={{ color: accent.value }}>{walkSpeed} Studs/s</span>
                          </div>
                          <input
                            type="range"
                            min="16"
                            max="250"
                            value={walkSpeed}
                            onChange={(e) => {
                              setWalkSpeed(Number(e.target.value));
                              if (Number(e.target.value) % 10 === 0) {
                                setTerminalLogs(prev => [...prev, `[PLAYER] Walkspeed updated: ${e.target.value}`]);
                              }
                            }}
                            className="w-full accent-white bg-zinc-800 h-1 rounded-lg cursor-pointer"
                          />
                          <div className="flex justify-between text-[9px] font-mono text-zinc-650">
                            <span>16 (Normal)</span>
                            <span>250 (Max Speed)</span>
                          </div>
                        </div>

                        {/* Jumppower */}
                        <div className="space-y-2 border-t border-zinc-900/60 pt-4">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-zinc-400">JumpPower Override</span>
                            <span className="text-zinc-200 font-bold" style={{ color: accent.value }}>{jumpPower} Studs/s</span>
                          </div>
                          <input
                            type="range"
                            min="50"
                            max="300"
                            value={jumpPower}
                            onChange={(e) => {
                              setJumpPower(Number(e.target.value));
                              if (Number(e.target.value) % 10 === 0) {
                                setTerminalLogs(prev => [...prev, `[PLAYER] Jumppower updated: ${e.target.value}`]);
                              }
                            }}
                            className="w-full accent-white bg-zinc-800 h-1 rounded-lg cursor-pointer"
                          />
                          <div className="flex justify-between text-[9px] font-mono text-zinc-650">
                            <span>50 (Normal)</span>
                            <span>300 (High Jump)</span>
                          </div>
                        </div>

                        {/* Gravity */}
                        <div className="space-y-2 border-t border-zinc-900/60 pt-4">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-zinc-400">Workspace Gravity</span>
                            <span className="text-zinc-200 font-bold" style={{ color: accent.value }}>{gravity} Studs/s²</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="196"
                            value={gravity}
                            onChange={(e) => {
                              setGravity(Number(e.target.value));
                              if (Number(e.target.value) % 10 === 0) {
                                setTerminalLogs(prev => [...prev, `[WORLD] Workspace Gravity: ${e.target.value}`]);
                              }
                            }}
                            className="w-full accent-white bg-zinc-800 h-1 rounded-lg cursor-pointer"
                          />
                          <div className="flex justify-between text-[9px] font-mono text-zinc-650">
                            <span>0 (Zero G)</span>
                            <span>196 (Normal)</span>
                          </div>
                        </div>

                      </div>

                      {/* Toggles Column */}
                      <div className="rounded-xl border border-zinc-900 bg-zinc-950/40 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-zinc-200">Infinite Jump</div>
                            <div className="text-[10px] text-zinc-505 mt-0.5">Overrides vertical jump restrictions.</div>
                          </div>
                          <button
                            onClick={() => {
                              setInfJump(!infJump);
                              setTerminalLogs(prev => [...prev, `[PLAYER] Infinite Jump: ${!infJump ? "ACTIVE" : "INACTIVE"}`]);
                            }}
                            className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${infJump ? "bg-emerald-500" : "bg-zinc-800"}`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${infJump ? "translate-x-5" : "translate-x-0"}`} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between border-t border-zinc-900/60 pt-4">
                          <div>
                            <div className="text-xs font-bold text-zinc-200">Collision NoClip</div>
                            <div className="text-[10px] text-zinc-550 mt-0.5">Bypasses boundary calculations in physical space.</div>
                          </div>
                          <button
                            onClick={() => {
                              setNoclip(!noclip);
                              setTerminalLogs(prev => [...prev, `[PLAYER] Collision NoClip: ${!noclip ? "ACTIVE" : "INACTIVE"}`]);
                            }}
                            className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${noclip ? "bg-emerald-500" : "bg-zinc-800"}`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${noclip ? "translate-x-5" : "translate-x-0"}`} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between border-t border-zinc-900/60 pt-4">
                          <div>
                            <div className="text-xs font-bold text-zinc-200">Vector Fly Mode</div>
                            <div className="text-[10px] text-zinc-505 mt-0.5">Direct 3D directional key controls flight path.</div>
                          </div>
                          <button
                            onClick={() => {
                              setFlightMode(!flightMode);
                              setTerminalLogs(prev => [...prev, `[PLAYER] Flight Mode: ${!flightMode ? "ACTIVE" : "INACTIVE"}`]);
                            }}
                            className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${flightMode ? "bg-emerald-500" : "bg-zinc-800"}`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${flightMode ? "translate-x-5" : "translate-x-0"}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. SETTINGS TAB */}
                {activeTab === "Settings" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                      <div>
                        <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                          <Settings size={16} style={{ color: accent.value }} />
                          GUI Customization & Settings
                        </h2>
                        <p className="text-xs text-zinc-500 mt-0.5">Control the appearance, themes, and settings profiles of your executor window.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      {/* Theme Settings Card */}
                      <div className="rounded-xl border border-zinc-900 bg-zinc-950/40 p-5 space-y-4">
                        <label className="block text-xs font-mono font-bold text-zinc-400">GUI Accent Themes</label>
                        <div className="grid grid-cols-2 gap-2.5">
                          {ACCENTS.map((item, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setAccent(item);
                                setTerminalLogs(prev => [...prev, `[GUI] Theme accent changed to: ${item.name}`]);
                              }}
                              className={`p-3 rounded-lg border text-left flex flex-col justify-between font-mono text-[10px] transition-all cursor-pointer h-[65px] ${
                                accent.name === item.name
                                  ? "bg-zinc-900 border-zinc-700"
                                  : "border-zinc-900 bg-zinc-950/60 hover:bg-zinc-900/30"
                              }`}
                            >
                              <span className="font-bold text-zinc-350">{item.name}</span>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="w-2.5 h-2.5 rounded-full border border-black/25" style={{ backgroundColor: item.value }} />
                                <span className="text-[9px] text-zinc-500">{item.value.split(" ")[2]} deg</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Configurations settings */}
                      <div className="rounded-xl border border-zinc-900 bg-zinc-950/40 p-5 space-y-5 flex flex-col justify-between">
                        <div className="space-y-3.5">
                          <label className="block text-xs font-mono font-bold text-zinc-400">Config Management</label>
                          <p className="text-[10px] text-zinc-500 leading-snug">All your changes (ESP, Aimbot values, Walkspeed bounds) can be saved to the client local directory as JSON files.</p>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-4">
                          <button
                            onClick={saveConfig}
                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-mono font-bold bg-white text-black hover:bg-zinc-200 transition-colors cursor-pointer"
                          >
                            SAVE SETTINGS
                          </button>
                          <button
                            onClick={() => {
                              setAimbotActive(false);
                              setSilentAim(false);
                              setDrawFov(true);
                              setFovRadius(140);
                              setBoxEsp(true);
                              setTracers(true);
                              setShowNames(true);
                              setHealthbars(true);
                              setWalkSpeed(16);
                              setJumpPower(50);
                              setGravity(196);
                              setInfJump(false);
                              setNoclip(false);
                              setFlightMode(false);
                              setTerminalLogs(prev => [...prev, `[GUI] Configuration reset to factory defaults.`]);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-mono border border-zinc-850 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                          >
                            RESET PROFILE
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Success Save Banner */}
                    {showSaveSuccess && (
                      <div className="flex items-center gap-2.5 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 font-mono text-[10px] animate-fade-in">
                        <Check size={12} />
                        <span>CONFIGURATION SAVED SUCCESSFULLY to 'c:\VALINC\configs\DEFAULT_VALINC.json'</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Status bar */}
            <div className="h-9 px-5 border-t border-zinc-900 flex items-center justify-between text-[9px] font-mono text-zinc-650 bg-zinc-950 flex-shrink-0">
              <div className="flex items-center gap-4">
                <span>CLIENT PID: 12480</span>
                <span>VM: LUAU CORE V2</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-zinc-500 font-bold">INTEGRITY CHECK PASSED (NOBYFRON ACTIVE)</span>
              </div>
            </div>

          </div>

          {/* Bottom Controls Bar (Consistent with Hero 1/2) */}
          <div className="absolute bottom-6 left-10 right-10 flex border-t border-zinc-850/80 justify-between items-center pt-4 flex-shrink-0 z-10">
            <div className="flex gap-1">
              {[
                { value: "0.28ms", label: "Execution Latency", style: { color: accent.value } },
                { value: "LUAU L8", label: "Runtime VM", style: { color: "oklch(0.72 0.19 150)" } },
                { value: "SECURE", label: "Byfron Bypass v4", style: { color: accent.value } },
                { value: "STABLE", label: "Memory Sandbox", style: { color: "oklch(0.72 0.19 150)" } }
              ].map((stat, i) => (
                <div key={i} className="px-4 py-2 border-r border-zinc-900 last:border-none flex flex-col min-w-[150px]">
                  <span className="text-[10px] font-mono font-medium tracking-tight text-zinc-500 leading-none">{stat.label}</span>
                  <span className="text-[15px] font-mono font-bold tracking-tight mt-1 leading-none" style={stat.style}>{stat.value}</span>
                </div>
              ))}
            </div>
            <div className="font-mono text-[10px] text-zinc-500 flex items-center gap-1.5">
              <span>ACTIVE PREVIEW:</span>
              <span className="font-bold text-zinc-350 bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded uppercase">ROBLOX SCRIPT UI</span>
            </div>
          </div>

        </div>
      </ScaledWrapper>
    </div>
  );
}
