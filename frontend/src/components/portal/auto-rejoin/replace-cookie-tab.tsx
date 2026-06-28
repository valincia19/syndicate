"use client"

import { useState } from "react"
import { RefreshCw, Check } from "lucide-react"

interface Props {
  addLog: (msg: string) => void
}

export default function ReplaceCookieTab({ addLog }: Props) {
  const [newCookie, setNewCookie] = useState("")
  const [status, setStatus] = useState<"idle" | "replacing" | "success">("idle")

  const handleReplace = () => {
    if (!newCookie.trim()) return
    setStatus("replacing")
    setTimeout(() => {
      setStatus("success")
      addLog("SUCCESS: Roblox session cookie replaced.")
    }, 1850)
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Replace Cookie</h2>
        <p className="text-[11px] text-muted-foreground">Hot-swap active Roblox session cookies without stopping monitoring.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[9px] font-mono text-muted-foreground uppercase">Current Session</label>
            <input type="text" readOnly value="ValincDeveloper (Active)" className="w-full px-3 py-2 text-xs font-mono rounded-md border border-border bg-muted/20 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-mono text-muted-foreground uppercase">New Cookie</label>
            <textarea value={newCookie} onChange={(e) => setNewCookie(e.target.value)} rows={2} className="w-full px-3 py-2 text-[10px] font-mono rounded-md border border-border bg-muted/40 dark:bg-[#070708] text-foreground focus:outline-hidden focus:border-primary/50 leading-normal" placeholder="Paste replacement .ROBLOSECURITY token..." />
          </div>
        </div>
        {status === "replacing" && <div className="p-2.5 rounded bg-primary/5 border-primary/20 flex items-center gap-2 text-[10px] text-primary font-mono"><RefreshCw className="h-3.5 w-3.5 animate-spin" />Swapping cookies...</div>}
        {status === "success" && <div className="p-2.5 rounded bg-emerald-500/5 border-emerald-500/15 flex items-center gap-2 text-[10px] text-emerald-600 font-mono"><Check className="h-3.5 w-3.5" />Session replaced!</div>}
        <div className="flex justify-end">
          <button onClick={handleReplace} disabled={status === "replacing"} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-mono text-[11px] hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
            <RefreshCw className="h-3.5 w-3.5" /> Replace
          </button>
        </div>
      </div>
    </div>
  )
}
