"use client"

import { useState } from "react"
import { RefreshCw, Square, Search } from "lucide-react"
import type { BotInstance } from "./types"
import { formatUptime } from "./types"
import { statusIcon } from "./icons"

interface Props {
  instances: BotInstance[]
  setInstances: React.Dispatch<React.SetStateAction<BotInstance[]>>
}

export default function InstancesTab({ instances, setInstances }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")

  const filtered = instances.filter((i) =>
    i.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.game.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (filtered.length === 0) return
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((i) => i.id)))
    }
  }

  const handleRejoin = (id: string) => {
    setInstances((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "online" as const, ping: Math.floor(Math.random() * 80 + 20) } : i))
    )
  }

  const handleTerminate = (id: string) => {
    setInstances((prev) => prev.map((i) => (i.id === id ? { ...i, status: "offline" as const, uptime: 0, ping: 0 } : i)))
  }

  const handleMassRejoin = () => {
    setInstances((prev) =>
      prev.map((i) => (selected.has(i.id) ? { ...i, status: "online" as const, ping: Math.floor(Math.random() * 80 + 20) } : i))
    )
    setSelected(new Set())
  }

  const handleMassTerminate = () => {
    setInstances((prev) =>
      prev.map((i) => (selected.has(i.id) ? { ...i, status: "offline" as const, uptime: 0, ping: 0 } : i))
    )
    setSelected(new Set())
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Active Instances</h2>
        <p className="text-[11px] text-muted-foreground">Manage and monitor all connected bot instances in real-time.</p>
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="text-[10px] font-mono text-muted-foreground">{selected.size} selected</span>
              <button onClick={handleMassRejoin} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-mono hover:bg-emerald-500/20 transition-all cursor-pointer">
                <RefreshCw className="h-3 w-3" />
                Rejoin All
              </button>
              <button onClick={handleMassTerminate} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-red-500/10 text-red-500 border border-red-500/20 text-[10px] font-mono hover:bg-red-500/20 transition-all cursor-pointer">
                <Square className="h-3 w-3" />
                Terminate All
              </button>
            </>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by bot or game..." className="w-48 pl-7 pr-2.5 py-1.5 text-[10px] font-mono rounded-md border border-border bg-muted/40 text-foreground focus:outline-hidden focus:border-primary/50 placeholder:text-muted-foreground/30" />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-[10px] font-mono">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left py-2.5 px-2 w-8">
                  <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleSelectAll} className="rounded border-border bg-muted/40 accent-primary h-3.5 w-3.5 cursor-pointer" />
                </th>
                <th className="text-left py-2.5 px-2 text-muted-foreground font-medium uppercase tracking-wider">Status</th>
                <th className="text-left py-2.5 px-2 text-muted-foreground font-medium uppercase tracking-wider">Bot Name</th>
                <th className="text-left py-2.5 px-2 text-muted-foreground font-medium uppercase tracking-wider">Game</th>
                <th className="text-left py-2.5 px-2 text-muted-foreground font-medium uppercase tracking-wider hidden md:table-cell">Device</th>
                <th className="text-left py-2.5 px-2 text-muted-foreground font-medium uppercase tracking-wider">Uptime</th>
                <th className="text-left py-2.5 px-2 text-muted-foreground font-medium uppercase tracking-wider">Ping</th>
                <th className="text-right py-2.5 px-2 text-muted-foreground font-medium uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No instances found</td></tr>
              ) : (
                filtered.map((bot) => (
                  <tr key={bot.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-2">
                      <input type="checkbox" checked={selected.has(bot.id)} onChange={() => toggleSelect(bot.id)} className="rounded border-border bg-muted/40 accent-primary h-3.5 w-3.5 cursor-pointer" />
                    </td>
                    <td className="py-2.5 px-2">{statusIcon(bot.status)}</td>
                    <td className="py-2.5 px-2 font-medium text-foreground">{bot.username}</td>
                    <td className="py-2.5 px-2 text-muted-foreground max-w-[140px] truncate" title={`Place ID: ${bot.placeId}`}>{bot.game}</td>
                    <td className="py-2.5 px-2 text-muted-foreground hidden md:table-cell">{bot.device}</td>
                    <td className="py-2.5 px-2 text-foreground font-medium">{formatUptime(bot.uptime)}</td>
                    <td className="py-2.5 px-2">
                      {bot.ping > 0 ? (
                        <span className={bot.ping > 150 ? "text-amber-500" : "text-foreground"}>{bot.ping}ms</span>
                      ) : <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleRejoin(bot.id)} disabled={bot.status === "online"} className="p-1.5 rounded-md border border-border bg-muted/40 hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer" title="Rejoin Server">
                          <RefreshCw className="h-3 w-3" />
                        </button>
                        <button onClick={() => handleTerminate(bot.id)} disabled={bot.status === "offline"} className="p-1.5 rounded-md border border-border bg-muted/40 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer" title="Terminate">
                          <Square className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
