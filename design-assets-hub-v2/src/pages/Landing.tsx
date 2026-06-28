import { useNavigate } from "react-router-dom";
import { Gauge, Shield, MessageCircle, Cpu, ArrowRight, Sliders } from "lucide-react";

const GOLD = "oklch(0.78 0.14 65)";

const cards = [
  {
    id: "hero-1",
    title: "Next-Gen Execution",
    description: "Lightweight executor with zero lag, optimized for instant script injection and Luau runtime performance.",
    icon: Gauge,
    comingSoon: false,
    status: "ACTIVE",
    badgeColor: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
  },
  {
    id: "hero-2",
    title: "Anti-Ban Protection",
    description: "Advanced anti-cheat bypasses, polymorphic engines, registry redirection, and physical HWID spoofs.",
    icon: Shield,
    comingSoon: false,
    status: "SECURE",
    badgeColor: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
  },
  {
    id: "hero-3",
    title: "Discord Whitelist",
    description: "Keyless Discord account linkage, OAuth2 secure handshake verification, and cross-server auto-role sync.",
    icon: MessageCircle,
    comingSoon: false,
    status: "STABLE",
    badgeColor: "text-[oklch(0.78_0.14_65)] border-[oklch(0.78_0.14_65/0.2)] bg-[oklch(0.78_0.14_65/0.05)]"
  },
  {
    id: "hero-4",
    title: "Script UI Preview",
    description: "Interactive Roblox script GUI featuring tabs for Executor, LocalPlayer mods, ESP visuals, aimbot toggles, and theme customizers.",
    icon: Sliders,
    comingSoon: false,
    status: "ACTIVE",
    badgeColor: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex flex-col select-none bg-zinc-950 text-zinc-100 selection:bg-[oklch(0.78_0.14_65/0.2)] selection:text-[oklch(0.78_0.14_65/0.8)] relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.005)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.005)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none opacity-40" />

      {/* Ambient glows */}
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[50vh] w-[900px] -translate-x-1/2 rounded-full bg-[oklch(0.78_0.14_65/0.035)] blur-[140px]" />
      <div className="absolute -bottom-16 -right-16 w-96 h-96 rounded-full pointer-events-none opacity-5 bg-[radial-gradient(circle,oklch(0.78_0.14_65),transparent_70%)] filter blur-[80px]" />

      <div className="flex-1 max-w-6xl w-full mx-auto px-6 py-20 flex flex-col justify-center relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-850 bg-zinc-900/60 text-[10px] font-mono tracking-widest text-[oklch(0.78_0.14_65)] mb-6">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-[oklch(0.78_0.14_65)]" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[oklch(0.78_0.14_65)]" />
            </span>
            VALINC SYNDICATE ASSETS
          </div>
          <h1 className="text-5xl font-normal font-serif tracking-tight text-zinc-100 sm:text-6xl leading-none">
            Design Assets Hub
          </h1>
          <p className="mt-4 text-sm text-zinc-500 leading-relaxed font-sans">
            Curated premium showcase interfaces for the VALINC client dashboard, featuring hardware spoofing, keyless auth linkage, and zero-lag Luau execution.
          </p>
        </div>

        {/* Grid Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900/50 hover:scale-102 hover:-translate-y-0.5"
                style={{
                  boxShadow: "0 4px 20px rgba(0,0,0,0.4)"
                }}
              >
                {/* Badge */}
                <div className="absolute top-4 right-4">
                  <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[8px] font-mono font-bold tracking-wider ${card.badgeColor}`}>
                    {card.status}
                  </span>
                </div>

                <div>
                  {/* Icon */}
                  <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-zinc-950 border border-zinc-850 group-hover:border-zinc-700 transition-colors">
                    <Icon className="size-5" style={{ color: card.comingSoon ? "oklch(0.55 0 0)" : GOLD }} />
                  </div>

                  {/* Title & Desc */}
                  <h3 className="text-lg font-normal font-serif text-zinc-200 group-hover:text-zinc-100 transition-colors">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-500 group-hover:text-zinc-400 transition-colors">
                    {card.description}
                  </p>
                </div>

                {/* Footer Action */}
                <div className="mt-8 flex-shrink-0">
                  {card.comingSoon ? (
                    <div className="w-full text-center py-2 text-[10px] font-mono font-bold border border-zinc-900 bg-zinc-950/20 text-zinc-650 rounded-lg">
                      LOCKED
                    </div>
                  ) : (
                    <button
                      onClick={() => navigate(`/${card.id}`)}
                      className="group/btn inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 px-3 py-2 text-[10px] font-mono font-bold tracking-wide shadow-sm transition-all active:scale-98"
                    >
                      ENTER SHOWCASE
                      <ArrowRight className="size-3.5 transition-transform group-hover/btn:translate-x-1" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
