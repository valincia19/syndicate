// ─── Types ──────────────────────────────────────────────────────────────────

export interface BotInstance {
  id: string
  username: string
  game: string
  placeId: string
  status: "online" | "offline" | "flagged"
  uptime: number // seconds
  ping: number
  device: string
}

export interface ActivityItem {
  type: "info" | "warn" | "error" | "success"
  message: string
  timestamp: Date
}

export interface LogEntry {
  id: string
  level: "INFO" | "WARN" | "ERROR"
  message: string
  timestamp: Date
  source?: string
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

export const MOCK_INSTANCES: BotInstance[] = [
  { id: "bot-1", username: "ValincGamer", game: "Blox Fruits", placeId: "2753915549", status: "online", uptime: 172800, ping: 42, device: "PC-01" },
  { id: "bot-2", username: "EunhaFarming", game: "Blox Fruits", placeId: "2753915549", status: "online", uptime: 86400, ping: 38, device: "PC-01" },
  { id: "bot-3", username: "Syk0Execution", game: "Fisch", placeId: "16732694052", status: "flagged", uptime: 43200, ping: 156, device: "VM-02" },
  { id: "bot-4", username: "RobloxPro_01", game: "Pet Simulator 99", placeId: "11610248525", status: "offline", uptime: 0, ping: 0, device: "MOBILE-03" },
  { id: "bot-5", username: "FarmBot_X", game: "Tower Defense Sim", placeId: "14307546783", status: "online", uptime: 259200, ping: 55, device: "PC-01" },
  { id: "bot-6", username: "CrystalMiner", game: "Mining Simulator 2", placeId: "9209871640", status: "flagged", uptime: 7200, ping: 203, device: "VM-02" },
]

export const RECENT_ACTIVITIES: ActivityItem[] = [
  { type: "success", message: "Executed Valinc Hub v3.2.1 on 4 instances", timestamp: new Date("2026-06-25T22:28:00") },
  { type: "info", message: "Bot 'EunhaFarming' joined new server (Blox Fruits)", timestamp: new Date("2026-06-25T22:25:00") },
  { type: "warn", message: "High ping detected on VM-02 (203ms)", timestamp: new Date("2026-06-25T22:20:00") },
  { type: "error", message: "Instance 'RobloxPro_01' terminated unexpectedly", timestamp: new Date("2026-06-25T22:15:00") },
  { type: "success", message: "Mass command 'AutoFarm Start' pushed to 5 instances", timestamp: new Date("2026-06-25T22:10:00") },
  { type: "info", message: "Global config updated - polling rate changed to 2.5s", timestamp: new Date("2026-06-25T22:05:00") },
  { type: "warn", message: "Rate limit approaching: 82/100 requests", timestamp: new Date("2026-06-25T21:55:00") },
  { type: "info", message: "New proxy pool loaded (12 proxies active)", timestamp: new Date("2026-06-25T21:45:00") },
]

// ─── Pure Helpers (no JSX) ──────────────────────────────────────────────────

export function formatUptime(seconds: number): string {
  if (seconds <= 0) return "-"
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(d).padStart(2, "0")}:${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
