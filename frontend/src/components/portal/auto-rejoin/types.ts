// ─── Types ──────────────────────────────────────────────────────────────────

export interface Device {
  id: string
  name: string
  ip: string
  active: boolean
  executor: string
}

export interface RobloxClient {
  id: string
  robloxId: string
  username: string
  appId: string
  avatarUrl: string
  status: "Running" | "Injecting" | "Rejoining" | "Launching" | "Suspended" | "Closed"
  deviceId: string
}

export interface ExecutorItem {
  name: string
  status: "Working" | "Updating"
  version: string
  updated: string
  size: string
  license: "free" | "paid"
  devices: ("desktop" | "mobile")[]
  icon: React.ComponentType<{ className?: string }>
  description: string
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

export const DEVICES: Device[] = [
  { id: "dev-1", name: "PC-01 (Wave Executor)", ip: "192.168.1.45", active: true, executor: "Wave v2.4.1" },
  { id: "dev-2", name: "VM-02 (Synapse Z)", ip: "192.168.1.102", active: true, executor: "Synapse Z v1.0.8" },
  { id: "dev-3", name: "MOBILE-03 (Seliware)", ip: "192.168.1.88", active: false, executor: "Seliware v4.0.2" },
]

export const INITIAL_CLIENTS: RobloxClient[] = [
  { id: "client-1", robloxId: "198273618", username: "ValincGamer", appId: "com.roblox.client", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=ValincGamer", status: "Running", deviceId: "dev-1" },
  { id: "client-2", robloxId: "284719371", username: "EunhaFarming", appId: "com.roblox.client", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=EunhaFarming", status: "Running", deviceId: "dev-1" },
  { id: "client-3", robloxId: "847291837", username: "Syk0Execution", appId: "com.roblox.client", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=Syk0Execution", status: "Suspended", deviceId: "dev-2" },
  { id: "client-4", robloxId: "938102948", username: "RobloxPro_01", appId: "com.roblox.client.android", avatarUrl: "https://api.dicebear.com/7.x/adventurer/svg?seed=RobloxPro_01", status: "Closed", deviceId: "dev-3" },
]

export function generateRandomClient(selectedDevice: string): RobloxClient {
  const num = Math.floor(Math.random() * 900) + 100
  return {
    id: `client-${Date.now()}`,
    robloxId: String(Math.floor(Math.random() * 900000000) + 100000000),
    username: `RobloxUser_${num}`,
    appId: "com.roblox.client",
    avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=RobloxUser_${num}`,
    status: "Running",
    deviceId: selectedDevice,
  }
}
