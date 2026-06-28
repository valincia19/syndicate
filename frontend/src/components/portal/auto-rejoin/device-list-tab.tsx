"use client"

import { useState } from "react"
import { Play, Square, Cookie, LogIn } from "lucide-react"
import type { RobloxClient } from "./types"
import { generateRandomClient } from "./types"

interface Props {
  clients: RobloxClient[]
  setClients: React.Dispatch<React.SetStateAction<RobloxClient[]>>
  selectedDevice: string
  addLog: (msg: string) => void
}

export default function DeviceListTab({ clients, setClients, selectedDevice, addLog }: Props) {
  const [confirmTerminate, setConfirmTerminate] = useState<string | null>(null)

  const handleAction = (clientId: string, action: "inject" | "join" | "open" | "close") => {
    const client = clients.find((c) => c.id === clientId)
    if (!client) return

    const labels = { inject: "Injecting", join: "Rejoining", open: "Launching", close: "Closed" }
    const msgs = {
      inject: `Injecting session cookie into ${client.username}`,
      join: `Rejoining Roblox server for ${client.username}`,
      open: `Spawning Roblox process for ${client.username}`,
      close: `Terminating Roblox process for ${client.username}`,
    }
    const successMsgs = {
      inject: `Successfully injected cookie into ${client.username}`,
      join: `${client.username} re-entered active server`,
      open: `Roblox client started for ${client.username}`,
      close: `Roblox client closed for ${client.username}`,
    }

    addLog(`CLIENT ${action.toUpperCase()}: ${msgs[action]}`)
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, status: labels[action] as RobloxClient["status"] } : c)))

    if (action === "close") {
      setConfirmTerminate(null)
    }

    setTimeout(() => {
      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? { ...c, status: action === "close" ? "Closed" as const : "Running" as const } : c))
      )
      addLog(`CLIENT ${action.toUpperCase()}: ${successMsgs[action]}`)
    }, action === "close" ? 800 : 1500)
  }

  const deviceClients = clients.filter((c) => c.deviceId === selectedDevice)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Roblox Client Manager</h2>
          <p className="text-[11px] text-muted-foreground">Monitor running Roblox processes, sync session credentials, and execute client re-entries.</p>
        </div>
        <button onClick={() => { const c = generateRandomClient(selectedDevice); setClients(prev => [...prev, c]); addLog(`CLIENT REGISTER: ${c.username} (${c.robloxId})`) }} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-mono text-[10px] hover:opacity-90 transition-all cursor-pointer">
          + Link Client Account
        </button>
      </div>

      {deviceClients.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center text-xs font-mono text-muted-foreground">
          No active Roblox client instances running on this device.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deviceClients.map((client) => (
            <div key={client.id} className="rounded-xl border border-border bg-card p-4 space-y-4 flex flex-col justify-between transition-all duration-200 hover:shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full border border-border bg-muted overflow-hidden shrink-0 select-none">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={client.avatarUrl} alt={client.username} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-bold text-foreground truncate">{client.username}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">ID: {client.robloxId}</div>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono select-none ${
                  client.status === "Running" ? "bg-emerald-500/8 text-emerald-500/70" :
                  client.status === "Closed" ? "bg-muted/15 text-muted-foreground" :
                  "bg-amber-500/8 text-amber-500/70 animate-pulse"
                }`}>
                  {client.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono border-t border-border/40 pt-2 text-muted-foreground select-none">
                <span>Package ID:</span>
                <span className="text-foreground font-medium truncate max-w-[150px]">{client.appId}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-border/40 pt-3">
                <button onClick={() => handleAction(client.id, "inject")} className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all text-[10px] font-mono cursor-pointer">
                  <Cookie className="h-3.5 w-3.5" /> Inject
                </button>
                <button onClick={() => handleAction(client.id, "join")} className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all text-[10px] font-mono cursor-pointer">
                  <LogIn className="h-3.5 w-3.5" /> Join
                </button>
                <button onClick={() => handleAction(client.id, "open")} className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all text-[10px] font-mono cursor-pointer">
                  <Play className="h-3.5 w-3.5" /> Open
                </button>
                {confirmTerminate === client.id ? (
                  <button onClick={() => handleAction(client.id, "close")} className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-500/15 text-red-500 border border-red-500/30 hover:bg-red-500/25 transition-all text-[10px] font-mono animate-pulse cursor-pointer">
                    <Square className="h-3.5 w-3.5" /> Confirm?
                  </button>
                ) : (
                  <button onClick={() => setConfirmTerminate(client.id)} onMouseLeave={() => setConfirmTerminate(null)} className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all text-[10px] font-mono cursor-pointer">
                    <Square className="h-3.5 w-3.5" /> Close
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
