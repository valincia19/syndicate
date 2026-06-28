export interface GameData {
  slug: string
  name: string
  description: string
  features: string[]
  executors: string[]
  scriptName: string
  popularity: "high" | "medium" | "low"
  category: string
  lastUpdated: string
}

export const games: GameData[] = [
  {
    slug: "blox-fruits",
    name: "Blox Fruits",
    description:
      "Blox Fruits is one of the most popular Roblox action-adventure games where players level up, collect powerful fruits, and defeat bosses. VALINC SYNDICATE provides a fully featured script hub with auto-farm, fruit sniper, dungeon auto-complete, and configurable ESP for Blox Fruits.",
    features: [
      "Fast auto-farm Level (instant grinding)",
      "Auto-raid with configurable settings",
      "Fruit sniper with rarity filter",
      "Dungeon auto-complete",
      "Full ESP configuration (players, fruits, bosses)",
      "Auto-collect all drops",
      "Server hop for rare fruits",
      "Quest automation",
    ],
    executors: ["Synapse Z", "Wave", "Wave Lite", "Solara", "Celery", "Macsploit"],
    scriptName: "Blox Fruits Premium Hub",
    popularity: "high",
    category: "Action RPG",
    lastUpdated: "2026-06",
  },
  {
    slug: "pet-simulator-99",
    name: "Pet Simulator 99",
    description:
      "Pet Simulator 99 lets players collect, trade, and upgrade pets across multiple worlds. VALINC SYNDICATE's Pet Sim 99 script automates coin collection, egg hatching, merchant trading, and custom item notifications so you can maximize your pet collection without grinding.",
    features: [
      "Instant coin and gem collection",
      "Auto-hatch eggs with priority queue",
      "Merchant automation and trade optimization",
      "Custom item notifications for rare drops",
      "Auto-equip best pets",
      "World teleport automation",
      "Pet fusion auto-select",
      "AFK farming mode",
    ],
    executors: ["Synapse Z", "Wave", "Wave Lite", "Solara", "Celery", "Macsploit"],
    scriptName: "Pet Simulator 99 Ultimate",
    popularity: "high",
    category: "Pet Simulation",
    lastUpdated: "2026-06",
  },
  {
    slug: "bedwars",
    name: "BedWars",
    description:
      "BedWars is a competitive Roblox PvP game where teams defend beds and eliminate opponents. The VALINC SYNDICATE BedWars script includes undetected fly bypass, infinite hit reach, kill aura, and auto-bridge for total map control.",
    features: [
      "Undetected fly bypass",
      "Infinite hit reach with adjustable range",
      "Kill aura with smart targeting",
      "Auto-bridge for fast map traversal",
      "Speed boosters",
      "Auto-bed protection (auto-place blocks)",
      "Player ESP with distance display",
      "Projectile prediction",
    ],
    executors: ["Synapse Z", "Wave", "Solara", "Celery"],
    scriptName: "BedWars Elite Bypass",
    popularity: "high",
    category: "PvP Combat",
    lastUpdated: "2026-06",
  },
  {
    slug: "universal-esp",
    name: "Universal ESP & Aimlock",
    description:
      "VALINC SYNDICATE's Universal ESP and Aimlock script works across every Roblox game. It provides drawing-based Fluent Box ESP, skeletal tracers, aimbot with custom smoothing, and configurable FOV circles - compatible with all supported executors.",
    features: [
      "Drawing-based Fluent Box ESP",
      "Skeletal tracers with color coding",
      "Aimbot with custom smoothing and prediction",
      "Configurable FOV circles",
      "Player health bars and distance",
      "Team detection and filtering",
      "Silent aim mode",
      "Works in any Roblox game",
    ],
    executors: ["Synapse Z", "Wave", "Wave Lite", "Solara", "Celery", "Macsploit", "Foxzy Executor", "Potasium", "Seliware"],
    scriptName: "Universal ESP & Aimlock",
    popularity: "high",
    category: "Universal / All Games",
    lastUpdated: "2026-06",
  },
  {
    slug: "murder-mystery-2",
    name: "Murder Mystery 2",
    description:
      "Murder Mystery 2 is a popular Roblox social deduction game. VALINC SYNDICATE provides scripts that reveal the murderer, sheriff, and innocent players, plus auto-collect coins and ESP for weapon tracking.",
    features: [
      "Role reveal (Murderer, Sheriff, Innocent)",
      "Player ESP with role colors",
      "Auto-collect coins and gems",
      "Gun drop ESP",
      "Auto-shoot (when Sheriff)",
      "Teleport to items",
      "Map overview",
    ],
    executors: ["Synapse Z", "Wave", "Solara", "Celery", "Macsploit"],
    scriptName: "MM2 Premium Script",
    popularity: "medium",
    category: "Social Deduction",
    lastUpdated: "2026-06",
  },
  {
    slug: "tower-of-hell",
    name: "Tower of Hell",
    description:
      "Tower of Hell is a challenging Roblox obby game. VALINC SYNDICATE provides auto-win scripts with phase mode, speed adjustment, and checkpoint teleportation to breeze through any tower.",
    features: [
      "Auto-win / auto-climb",
      "Phase mode (walk through walls)",
      "Speed adjustment",
      "Checkpoint teleport",
      "No-fall mode",
      "Tower preview",
      "Timer manipulation",
    ],
    executors: ["Synapse Z", "Wave", "Solara", "Celery"],
    scriptName: "Tower of Hell Auto-Win",
    popularity: "medium",
    category: "Obby / Platformer",
    lastUpdated: "2026-06",
  },
  {
    slug: "brookhaven",
    name: "Brookhaven RP",
    description:
      "Brookhaven RP is one of the most-played Roblox roleplay games. VALINC SYNDICATE offers vehicle mods, teleport scripts, and role customization tools for Brookhaven players.",
    features: [
      "Vehicle speed mods",
      "Teleport to any location on the map",
      "Character customization unlocker",
      "House access tools",
      "Player ESP",
      "Auto-money collection",
      "Noclip mode",
    ],
    executors: ["Synapse Z", "Wave", "Solara", "Celery", "Macsploit"],
    scriptName: "Brookhaven RP Tools",
    popularity: "medium",
    category: "Roleplay",
    lastUpdated: "2026-06",
  },
]

export function getGameBySlug(slug: string): GameData | undefined {
  return games.find((g) => g.slug === slug)
}

export function getAllGameSlugs(): string[] {
  return games.map((g) => g.slug)
}
