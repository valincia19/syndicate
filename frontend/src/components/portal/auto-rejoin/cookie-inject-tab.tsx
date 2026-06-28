"use client"

import { useState } from "react"
import { RefreshCw, AlertCircle, Check, Cpu } from "lucide-react"

interface Props {
  addLog: (msg: string) => void
}

export default function CookieInjectTab({ addLog }: Props) {
  const [cookieValue, setCookieValue] = useState(".ROBLOSECURITY=_|WARNING:-DO-NOT-SHARE-THIS...")
  const [status, setStatus] = useState<"idle" | "injecting" | "success" | "error">("idle")
  const [progress, setProgress] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!cookieValue.trim()) { setStatus("error"); setProgress("Cookie cannot be empty."); return }
    setStatus("injecting"); setProgress("Bypassing SSL Pinning...")
    setTimeout(() => { setProgress("Spoofing HWID...") }, 800)
    setTimeout(() => { setStatus("success"); setProgress("Cookie injected successfully!"); addLog("SUCCESS: Roblox cookie injected.") }, 2200)
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Cookie Injector</h2>
        <p className="text-[11px] text-muted-foreground">Inject a valid .ROBLOSECURITY cookie into the target client memory.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-[9px] font-mono text-muted-foreground uppercase">Roblox Session Cookie</label>
            <textarea value={cookieValue} onChange={(e) => setCookieValue(e.target.value)} rows={4} className="w-full px-3 py-2 text-[10px] font-mono rounded-md border border-border bg-muted/40 dark:bg-[#070708] text-foreground focus:outline-hidden focus:border-primary/50 placeholder:text-muted-foreground/30 leading-normal" />
          </div>
          {status === "injecting" && <div className="p-2.5 rounded bg-primary/5 border border-primary/20 flex items-center gap-2 text-[10px] text-primary font-mono"><RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0" />{progress}</div>}
          {status === "error" && <div className="p-2.5 rounded bg-destructive/5 border border-destructive/20 flex items-center gap-2 text-[10px] text-destructive font-mono"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{progress}</div>}
          {status === "success" && <div className="p-2.5 rounded bg-emerald-500/5 border border-emerald-500/15 flex items-center gap-2 text-[10px] text-emerald-600 font-mono"><Check className="h-3.5 w-3.5 shrink-0" />{progress}</div>}
          <div className="flex justify-end">
            <button type="submit" disabled={status === "injecting"} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-mono text-[11px] hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
              <Cpu className="h-3.5 w-3.5" /> Inject Session Cookie
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
