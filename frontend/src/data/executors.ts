export interface ExecutorData {
  slug: string
  name: string
  level: number
  description: string
  compatibility: string
  platform: string
}

export const executors: ExecutorData[] = [
  {
    slug: "synapse-z",
    name: "Synapse Z",
    level: 8,
    description: "Synapse Z is one of the most powerful Level 8 Roblox executors. It offers deep script injection, fast execution, and broad compatibility with complex scripts. VALINC SYNDICATE is fully optimized for Synapse Z.",
    compatibility: "Full",
    platform: "Windows",
  },
  {
    slug: "wave",
    name: "Wave",
    level: 7,
    description: "Wave is a modern Level 7 executor with a clean interface and reliable performance. VALINC SYNDICATE scripts run flawlessly on Wave with zero additional configuration required.",
    compatibility: "Full",
    platform: "Windows",
  },
  {
    slug: "wave-lite",
    name: "Wave Lite",
    level: 7,
    description: "Wave Lite is the lightweight version of Wave, designed for lower-spec machines. VALINC SYNDICATE supports Wave Lite with optimized scripts for reduced memory usage.",
    compatibility: "Full",
    platform: "Windows",
  },
  {
    slug: "solara",
    name: "Solara",
    level: 7,
    description: "Solara is a free Level 7 Roblox executor known for stability and clean execution. VALINC SYNDICATE scripts are tested and verified for full Solara compatibility.",
    compatibility: "Full",
    platform: "Windows",
  },
  {
    slug: "celery",
    name: "Celery",
    level: 7,
    description: "Celery is a user-friendly Level 7 executor with fast injection speeds. VALINC SYNDICATE provides full compatibility with Celery across all game scripts.",
    compatibility: "Full",
    platform: "Windows",
  },
  {
    slug: "macsploit",
    name: "Macsploit",
    level: 7,
    description: "Macsploit is one of the few executors supporting macOS. VALINC SYNDICATE scripts are compatible with Macsploit for macOS users who want premium Roblox scripting.",
    compatibility: "Full",
    platform: "macOS",
  },
  {
    slug: "foxzy-executor",
    name: "Foxzy Executor",
    level: 7,
    description: "Foxzy Executor is a growing Level 7 executor with active development. VALINC SYNDICATE maintains compatibility with Foxzy Executor for universal script support.",
    compatibility: "Full",
    platform: "Windows",
  },
  {
    slug: "potasium",
    name: "Potasium",
    level: 7,
    description: "Potasium is a lightweight Level 7 executor. VALINC SYNDICATE supports Potasium for basic and premium script execution.",
    compatibility: "Partial",
    platform: "Windows",
  },
  {
    slug: "seliware",
    name: "Seliware",
    level: 7,
    description: "Seliware is a community-developed Level 7 executor. VALINC SYNDICATE scripts are tested for Seliware compatibility.",
    compatibility: "Partial",
    platform: "Windows",
  },
]

export function getExecutorBySlug(slug: string): ExecutorData | undefined {
  return executors.find((e) => e.slug === slug)
}

export function getAllExecutorSlugs(): string[] {
  return executors.map((e) => e.slug)
}
