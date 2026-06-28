import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, MessageCircle, Shield, Link2, Users, Zap, 
  Clock, Key, Activity, Server, UserCheck, Globe, ChevronRight, Play 
} from "lucide-react";

// ─── Constants (Zinc & Honey Gold Palette matching Hero 1 & 2) ───
const GOLD = "oklch(0.78 0.14 65)";
const ACCENT = "oklch(0.78 0.14 65)";
const GREEN = "oklch(0.72 0.19 150)";
const AMBER = "oklch(0.79 0.15 85)";

const FEATURES = [
  { icon: Key, label: "Keyless Auth", desc: "OAuth2 handshake — zero secrets", hue: "85 30% 65%" },
  { icon: Shield, label: "Role Verification", desc: "Guild membership check < 50ms", hue: "160 30% 65%" },
  { icon: Link2, label: "Account Linking", desc: "Discord ID ↔ Profile binding", hue: "270 25% 70%" },
  { icon: Users, label: "Auto-Role Sync", desc: "Cross-server propagation", hue: "190 30% 65%" },
];

const AUTH_NODES = [
  { id: "oauth", label: "OAuth", icon: MessageCircle },
  { id: "token", label: "Token", icon: Key },
  { id: "guild", label: "Guild", icon: Shield },
  { id: "role", label: "Role", icon: UserCheck },
  { id: "link", label: "Account", icon: Link2 },
];

const ROLE_DISTRIBUTION = [
  { role: "Member", pct: 62, color: "bg-zinc-700/30", text: "text-zinc-400" },
  { role: "Premium", pct: 22, color: "bg-[oklch(0.78_0.14_65/0.35)]", text: "text-[oklch(0.78_0.14_65)]" },
  { role: "Pro", pct: 11, color: "bg-[oklch(0.78_0.14_65/0.25)]", text: "text-[oklch(0.78_0.14_65/0.8)]" },
  { role: "Staff", pct: 5, color: "bg-emerald-500/20", text: "text-emerald-400" },
];

const INITIAL_TELEMETRY_LOG = [
  { time: "09:02:11", event: "DISCORD_OAUTH_INIT", status: "ok" as const, detail: "session req — 0x7a1f" },
  { time: "09:02:11", event: "TOKEN_EXCHANGE", status: "ok" as const, detail: "200 — 847ms" },
  { time: "09:02:12", event: "GUILD_CHECK", status: "ok" as const, detail: "member — guild:105488372" },
  { time: "09:02:12", event: "ROLE_RESOLVE", status: "ok" as const, detail: "premium — tier:2" },
  { time: "09:02:13", event: "PROFILE_LINK", status: "ok" as const, detail: "bound: 213742069" },
  { time: "09:02:13", event: "WHITELIST_COMMIT", status: "ok" as const, detail: "written — slot:8891" },
  { time: "09:02:14", event: "WEBHOOK_DISPATCH", status: "ok" as const, detail: "dispatch queue cleared" },
  { time: "09:02:14", event: "CACHE_INVALIDATE", status: "ok" as const, detail: "purged 4 keys" },
];

const TOP_USERS = [
  { rank: 1, id: "Valinc_Dev", role: "Staff", whitelisted: 1042, avatar: "V" },
  { rank: 2, id: "NovaSec", role: "Premium", whitelisted: 891, avatar: "N" },
  { rank: 3, id: "HexCore", role: "Pro", whitelisted: 647, avatar: "H" },
  { rank: 4, id: "SynthWave", role: "Premium", whitelisted: 503, avatar: "S" },
  { rank: 5, id: "QuantumBot", role: "Member", whitelisted: 412, avatar: "Q" },
];

interface TelemetryLogEntry {
  time: string;
  event: string;
  status: "ok" | "pending";
  detail: string;
}

const QUICK_STATS = [
  { icon: Zap, label: "Auth Latency", value: "< 50ms" },
  { icon: Users, label: "Linked", value: "3,732" },
  { icon: Server, label: "Sessions", value: "847" },
  { icon: Activity, label: "Req/s", value: "1,432" },
  { icon: Clock, label: "Uptime", value: "99.97%" },
];

// ─── Sub-Components ───

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

/* Auth Pipeline */
function AuthPipelineCard({ simulating, activeStage, startSimulation }: { simulating: boolean; activeStage: number; startSimulation: () => void }) {
  const visualNodes = [
    { id: "discord", x: 120, y: 100, label: "DISCORD AUTH", sub: "OAuth2 Provider", icon: MessageCircle, color: "#5865F2" },
    { id: "gateway", x: 440, y: 100, label: "VALINC CORE", sub: "Security Gateway", icon: Shield, color: GOLD },
    { id: "client", x: 760, y: 100, label: "ROBLOX ENGINE", sub: "Zero-Lag Injector", icon: Zap, color: GREEN }
  ];

  return (
    <div className="rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40 flex-shrink-0">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/40 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Server size={12} style={{ color: GOLD }} />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">OAuth Handshake Pipeline</span>
        </div>
        <button 
          disabled={simulating}
          onClick={startSimulation}
          className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-mono font-bold tracking-wide border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          style={{ borderColor: simulating ? GOLD : "inherit" }}
        >
          <Play size={10} fill="currentColor" className={`relative -top-[1px] ${simulating ? "animate-pulse" : ""}`} style={{ color: simulating ? GOLD : "inherit" }} />
          {simulating ? "PROCESSING..." : "RUN TEST SIMULATION"}
        </button>
      </div>

      <div className="relative w-full h-[200px] border border-zinc-800/40 rounded-xl bg-zinc-950/40 overflow-hidden mb-4">
        {/* SVG Canvas for curves and pulses */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <defs>
            <filter id="glow-gold" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-blue" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-green" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Static helix paths */}
          <path d="M 170 100 C 260 50, 300 50, 390 100" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" fill="none" />
          <path d="M 170 100 C 260 150, 300 150, 390 100" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" fill="none" />
          <path d="M 490 100 C 580 50, 620 50, 710 100" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" fill="none" />
          <path d="M 490 100 C 580 150, 620 150, 710 100" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" fill="none" />

          {/* Idle pulses */}
          {!simulating && (
            <>
              <circle r="2.5" fill={GOLD} opacity="0.3">
                <animateMotion dur="4s" repeatCount="indefinite" path="M 170 100 C 260 50, 300 50, 390 100" />
              </circle>
              <circle r="2.5" fill={GREEN} opacity="0.3">
                <animateMotion dur="4.5s" begin="1s" repeatCount="indefinite" path="M 490 100 C 580 150, 620 150, 710 100" />
              </circle>
            </>
          )}

          {/* Active simulated pulses */}
          {simulating && (
            <>
              {/* Stage 0-2 (Discord to Valinc) */}
              {(activeStage === 0 || activeStage === 1) && (
                <>
                  <circle r="4.5" fill={GOLD} filter="url(#glow-gold)">
                    <animateMotion dur="1s" repeatCount="indefinite" path="M 170 100 C 260 50, 300 50, 390 100" />
                  </circle>
                  <circle r="4.5" fill="#5865F2" filter="url(#glow-blue)">
                    <animateMotion dur="1s" begin="0.5s" repeatCount="indefinite" path="M 170 100 C 260 150, 300 150, 390 100" />
                  </circle>
                </>
              )}
              {/* Stage 2-4 (Valinc to Roblox) */}
              {(activeStage === 2 || activeStage === 3) && (
                <>
                  <circle r="4.5" fill={GOLD} filter="url(#glow-gold)">
                    <animateMotion dur="1s" repeatCount="indefinite" path="M 490 100 C 580 50, 620 50, 710 100" />
                  </circle>
                  <circle r="4.5" fill={GREEN} filter="url(#glow-green)">
                    <animateMotion dur="1s" begin="0.5s" repeatCount="indefinite" path="M 490 100 C 580 150, 620 150, 710 100" />
                  </circle>
                </>
              )}
            </>
          )}
        </svg>

        {/* Absolute positioned Node divs */}
        {visualNodes.map((n) => {
          const NodeIcon = n.icon;
          return (
            <div 
              key={n.id} 
              className="absolute w-[160px] flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 transition-all duration-300 pointer-events-none"
              style={{ left: `${n.x}px`, top: `${n.y}px` }}
            >
              <div 
                className="size-13 rounded-2xl bg-zinc-950 border border-zinc-850 flex items-center justify-center relative"
                style={{
                  boxShadow: `0 0 15px rgba(0,0,0,0.8), 0 0 10px ${n.color}15`,
                  borderColor: n.color + "30"
                }}
              >
                {/* Spinning dashed ring */}
                <div className="absolute inset-0 rounded-2xl border border-dashed animate-spin opacity-20" style={{ borderColor: n.color, animationDuration: "12s" }} />
                <NodeIcon className="size-5.5" style={{ color: n.color }} />
              </div>
              <div className="text-[10px] font-bold text-zinc-200 mt-2 tracking-wider">{n.label}</div>
              <div className="text-[8px] font-mono text-zinc-500 mt-0.5 uppercase tracking-wide">{n.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Progress pipeline steps */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-800/40">
        {AUTH_NODES.map((node, i) => {
          const isActive = i === activeStage;
          const isCompleted = i < activeStage && activeStage !== -1;
          const isIdle = activeStage === -1;
          const color = isActive ? GOLD : isCompleted ? GREEN : "oklch(0.55 0 0)";
          return (
            <div key={node.id} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div 
                  className="flex size-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 transition-all duration-300"
                  style={{
                    borderColor: isActive ? GOLD : isCompleted ? `${GREEN}50` : "transparent",
                    boxShadow: isActive ? `0 0 10px ${GOLD}33` : "none"
                  }}
                >
                  <node.icon className="size-4" style={{ color: isIdle && i === 0 ? GOLD : color }} />
                </div>
                <span className="text-[9px] font-mono" style={{ color: isIdle && i === 0 ? GOLD : color }}>{node.label}</span>
              </div>
              {i < AUTH_NODES.length - 1 && (
                <div className="h-[1.5px] flex-1 mx-2 bg-zinc-800" style={{ background: isCompleted ? `linear-gradient(90deg, ${GREEN}, ${GOLD})` : "none" }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Telemetry Log */
function TelemetryLog({ logs }: { logs: Array<{ time: string; event: string; status: "ok" | "pending"; detail: string }> }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40 flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/40 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Activity size={12} style={{ color: GOLD }} />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Live Gateway Logs</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-1 rounded-full bg-emerald-500/50 pulse-dot" />
          <span className="text-[9px] font-mono text-zinc-500">streaming</span>
        </div>
      </div>
      <div ref={scrollRef} className="space-y-1.5 flex-1 overflow-y-auto pr-1 scrollbar-none">
        {logs.map((entry, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg px-2.5 py-1.5 font-mono text-[10px] bg-zinc-950/20 border border-zinc-900/40 hover:bg-zinc-900/20 transition-all duration-150">
            <span className="w-14 shrink-0 text-zinc-600 tabular-nums">{entry.time}</span>
            <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${entry.status === "ok" ? "bg-emerald-500/50" : "bg-[oklch(0.78_0.14_65/0.5)]"}`} />
            <span className={`shrink-0 font-bold ${entry.status === "ok" ? "text-zinc-400" : "text-[oklch(0.78_0.14_65/0.8)]"}`}>{entry.event}</span>
            <span className="text-zinc-700">—</span>
            <span className="truncate text-zinc-500">{entry.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Role Distribution */
function RoleGraph() {
  return (
    <div className="rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40 flex-shrink-0">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/40">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Synced Roles</span>
          <p className="mt-0.5 text-[9px] font-mono text-zinc-500">3,732 whitelisted players</p>
        </div>
        <span className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-0.5 text-[9px] font-mono text-zinc-500">4 TIERS</span>
      </div>
      <div className="mb-4 flex h-2 gap-0.5 overflow-hidden rounded-full bg-zinc-950">
        {ROLE_DISTRIBUTION.map((r) => (
          <div key={r.role} className={`h-full rounded-full transition-all ${r.color}`} style={{ width: `${r.pct}%` }} />
        ))}
      </div>
      <div className="space-y-2">
        {ROLE_DISTRIBUTION.map((r) => (
          <div key={r.role} className="flex items-center gap-3">
            <span className={`w-16 text-[10px] font-mono font-medium ${r.text}`}>{r.role}</span>
            <div className="h-1.5 flex-1 rounded-full bg-zinc-950 overflow-hidden">
              <div className={`h-full rounded-full ${r.color}`} style={{ width: `${r.pct}%` }} />
            </div>
            <span className="w-8 text-right text-[10px] font-mono text-zinc-500">{r.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Top Whitelisters */
function TopWhitelisters() {
  return (
    <div className="rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40 flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/40 flex-shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">High-Activity Keys</span>
        <Globe className="size-3.5 text-zinc-500" />
      </div>
      <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
        {TOP_USERS.map((u) => (
          <div key={u.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors bg-zinc-950/20 border border-zinc-900/40 hover:bg-zinc-900/20">
            <span className="w-3 text-[9px] font-mono text-zinc-600">#{u.rank}</span>
            <div className="flex size-6.5 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950 text-[10px] font-bold text-zinc-400">{u.avatar}</div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-mono font-bold text-zinc-300 truncate block">{u.id}</span>
              <span className="text-[8.5px] font-mono text-zinc-500">{u.role}</span>
            </div>
            <span className="text-[10px] font-mono text-[oklch(0.78_0.14_65/0.8)] font-bold">{u.whitelisted.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Features List */
function FeatureList() {
  return (
    <div className="rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40">
      <div className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase mb-4 flex items-center gap-1.5">
        <Server size={12} style={{ color: GOLD }} />
        Integration Features
      </div>
      <div className="space-y-2.5">
        {FEATURES.map((f) => (
          <div key={f.label} className="p-3 rounded-xl border border-zinc-850 bg-zinc-950/20 flex gap-3 transition-all duration-300 hover:border-zinc-800 hover:bg-zinc-900/30">
            <div className="flex-shrink-0 size-7.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center mt-0.5">
              <f.icon className="size-3.5" style={{ color: `oklch(${f.hue})` }} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[11px] font-bold text-zinc-200">{f.label}</h4>
              <p className="text-[9.5px] text-zinc-500 mt-0.5 leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Connected Guilds Card */
function ConnectedGuildsCard() {
  const guilds = [
    { name: "Valinc Syndicate Hub", members: "12,842", ping: "12ms", status: "PRIMARY" },
    { name: "Valinc Beta Testers", members: "1,204", ping: "15ms", status: "CONNECTED" },
    { name: "Nova Security Group", members: "4,982", ping: "18ms", status: "CONNECTED" },
  ];

  return (
    <div className="rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40 flex-shrink-0">
      <div className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase mb-3.5 flex items-center gap-1.5">
        <Globe size={12} style={{ color: GOLD }} />
        Active Discord Guild Sync
      </div>
      <div className="space-y-2.5">
        {guilds.map((g, i) => (
          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/40 border border-zinc-800/40">
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-300 font-medium font-mono">{g.name}</span>
              <span className="text-[8px] text-zinc-500 font-mono">{g.members} members · {g.ping} ping</span>
            </div>
            <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              {g.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Active Session Status */
function ActiveSessionCard({ sessionCount }: { sessionCount: number }) {
  return (
    <div className="rounded-2xl p-5 border border-zinc-800 bg-zinc-900/40 flex-1 flex flex-col min-h-0">
      <div className="text-[10px] font-semibold text-zinc-500 tracking-widest uppercase mb-3 flex items-center gap-1.5 flex-shrink-0">
        <Activity size={12} style={{ color: GOLD }} />
        Active Gateway Status
      </div>
      <div className="space-y-3 flex-1 flex flex-col justify-center">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-zinc-400">OAuth2 Gateway IP</span>
          <span className="text-zinc-300 font-mono">104.22.41.89</span>
        </div>
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-zinc-400">Linked Webhooks</span>
          <span className="text-emerald-400 font-mono font-semibold">4 / 4 Active Listeners</span>
        </div>
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-zinc-400">Total Live Sessions</span>
          <span className="text-zinc-350 font-mono font-semibold">{sessionCount} Syncs</span>
        </div>
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-zinc-450 text-zinc-400">Last SSL Handshake</span>
          <span className="font-mono font-semibold" style={{ color: GOLD }}>TLSv1.3 (0.4ms)</span>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-850 overflow-hidden mt-1 flex-shrink-0">
          <div className="h-full bg-emerald-500/80 rounded-full" style={{ width: "99.8%" }} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Export ───

export default function DiscordWhitelist() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<TelemetryLogEntry[]>(INITIAL_TELEMETRY_LOG);
  const [activeStage, setActiveStage] = useState(-1);
  const [simulating, setSimulating] = useState(false);
  const [sessionCount, setSessionCount] = useState(847);

  // Background random logs
  useEffect(() => {
    const interval = setInterval(() => {
      if (simulating) return; // don't disrupt the simulation logs
      setLogs((prev) => {
        const events = [
          { event: "HEARTBEAT_PING", status: "ok" as const, detail: "gateway active — 0.08ms lag" },
          { event: "REDIS_CACHE_SYNC", status: "ok" as const, detail: "synchronized 14 active user roles" },
          { event: "WEBHOOK_DISPATCH", status: "ok" as const, detail: "200 OK — dispatch guild payload" },
          { event: "TOKEN_REFRESH", status: "ok" as const, detail: "refreshed token for slot 4410" },
        ];
        const newEvent = events[Math.floor(Math.random() * events.length)];
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        return [...prev.slice(-12), { time, ...newEvent }];
      });
    }, 4500);
    return () => clearInterval(interval);
  }, [simulating]);

  const startSimulation = () => {
    setSimulating(true);
    setActiveStage(0);
    
    // Clear logs and start fresh simulation logs
    const now = () => new Date().toLocaleTimeString('en-US', { hour12: false });
    
    setLogs([
      { time: now(), event: "HANDSHAKE_START", status: "pending", detail: "initiate OAuth2 redirection" }
    ]);

    const steps = [
      { event: "OAUTH_AUTHORIZE", detail: "Discord token callback received" },
      { event: "TOKEN_EXCHANGED", detail: "Access token granted — profile payload locked" },
      { event: "GUILD_VERIFY", detail: "Guild membership verified (Valinc server)" },
      { event: "ROLE_PROPAGATE", detail: "Propagated Role: Premium (Slot 8891 committed)" },
      { event: "WHITELIST_SUCCESS", detail: "Handshake completed successfully — Client authorized" }
    ];

    let current = 0;
    const interval = setInterval(() => {
      current++;
      if (current <= steps.length) {
        setActiveStage(current - 1);
        setLogs(prev => [
          ...prev,
          { time: now(), event: steps[current - 1].event, status: current === steps.length ? "ok" : "pending", detail: steps[current - 1].detail }
        ]);
      }
      
      if (current === steps.length) {
        clearInterval(interval);
        setTimeout(() => {
          setActiveStage(-1);
          setSimulating(false);
          setSessionCount(prev => prev + 1);
          setLogs(prev => [
            ...prev,
            { time: now(), event: "GATEWAY_IDLE", status: "ok", detail: "Listening for handshake requests..." }
          ]);
        }, 1000);
      }
    }, 1000);
  };

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
                  <MessageCircle size={20} style={{ color: GOLD }} />
                </div>
                <div>
                  <h1 className="text-2xl font-normal tracking-tight text-zinc-100">Discord Whitelist System</h1>
                  <p className="text-xs text-zinc-500">Instant access with keyless Discord account linkage. Sync roles and run scripts seamlessly without annoying keys.</p>
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
              
              {/* Left Column: Role Graph & Top Whitelisters */}
              <div className="w-[380px] flex flex-col gap-5 min-h-0 flex-shrink-0">
                <RoleGraph />
                <TopWhitelisters />
              </div>

              {/* Center Column: Auth Pipeline & Live Telemetry */}
              <div className="flex-1 flex flex-col gap-5 min-h-0">
                <AuthPipelineCard simulating={simulating} activeStage={activeStage} startSimulation={startSimulation} />
                <TelemetryLog logs={logs} />
              </div>

              {/* Right Column: Features, Guild Sync & Gateway Status */}
              <div className="w-[380px] flex flex-col gap-5 min-h-0 flex-shrink-0">
                <FeatureList />
                <ConnectedGuildsCard />
                <ActiveSessionCard sessionCount={sessionCount} />
              </div>

            </div>

            {/* Stats Bar */}
            <div className="mt-6 flex border-t border-zinc-800 justify-between items-center pt-4 flex-shrink-0">
              <div className="flex gap-1">
                {QUICK_STATS.map((s, i) => {
                  const StatIcon = s.icon;
                  const displayValue = s.label === "Sessions" ? `${sessionCount}` : s.value;
                  return (
                    <div key={s.label} className={`flex items-center gap-3 px-5 py-1.5 ${i < QUICK_STATS.length - 1 ? "border-r border-zinc-800" : ""}`}>
                      <StatIcon className="size-4" style={{ color: GOLD }} />
                      <div>
                        <div className="text-xs font-bold text-zinc-200 font-mono">{displayValue}</div>
                        <div className="text-[9px] text-zinc-500 tracking-wide uppercase">{s.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button 
                onClick={startSimulation}
                disabled={simulating}
                className="group flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50" 
                style={{ 
                  background: simulating ? "transparent" : `linear-gradient(135deg, ${GOLD}, ${GOLD}bb)`, 
                  color: simulating ? GOLD : "oklch(0.1 0.01 65)", 
                  border: simulating ? `1px solid ${GOLD}` : "none",
                  boxShadow: simulating ? "none" : `0 0 20px ${GOLD}33` 
                }}
              >
                <MessageCircle size={12} fill="currentColor" />
                {simulating ? "Verifying..." : "Link Discord Account"}
                <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>

          </div>

          <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full pointer-events-none opacity-5" style={{ background: `radial-gradient(circle, ${ACCENT}, transparent 70%)`, filter: "blur-[60px]" }} />
          <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full pointer-events-none opacity-5" style={{ background: `radial-gradient(circle, ${AMBER}, transparent 70%)`, filter: "blur-[60px]" }} />
        </div>
      </ScaledWrapper>
      
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
        .pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
