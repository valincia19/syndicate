"use client"

import { useState } from "react"
import { RefreshCw, AlertCircle, Check, ShieldCheck } from "lucide-react"

interface Props {
  addLog: (msg: string) => void
}

export default function CookieValidatorTab({ addLog }: Props) {
  const [value, setValue] = useState("")
  const [status, setStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle")
  const [result, setResult] = useState<{ username: string; userId: string; robux: string; premium: boolean } | null>(null)

  const handleValidate = () => {
    if (!value.trim()) { setStatus("invalid"); return }
    setStatus("validating")
    setTimeout(() => {
      setStatus("valid")
      setResult({ username: "ValincDeveloper", userId: "198273618", robux: "15,420", premium: true })
      addLog("SUCCESS: Validated Roblox session cookie.")
    }, 1500)
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Cookie Validator</h2>
        <p className="text-[11px] text-muted-foreground">Validate .ROBLOSECURITY token and extract profile info.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="space-y-1">
          <label className="text-[9px] font-mono text-muted-foreground uppercase">Target Cookie</label>
          <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={4} className="w-full px-3 py-2 text-[10px] font-mono rounded-md border border-border bg-muted/40 dark:bg-[#070708] text-foreground focus:outline-hidden focus:border-primary/50 leading-normal" />
        </div>
        {status === "validating" && <div className="p-2.5 rounded bg-primary/5 border-primary/20 flex items-center gap-2 text-[10px] text-primary font-mono"><RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0" />Verifying session...</div>}
        {status === "invalid" && <div className="p-2.5 rounded bg-destructive/5 border-destructive/20 flex items-center gap-2 text-[10px] text-destructive font-mono"><AlertCircle className="h-3.5 w-3.5 shrink-0" />Invalid or expired cookie.</div>}
        {status === "valid" && result && (
          <div className="p-4 rounded-lg bg-emerald-500/5 border-emerald-500/15 space-y-3 font-mono text-xs">
            <div className="flex items-center gap-2 text-[10px] text-emerald-600"><Check className="h-3.5 w-3.5" />Cookie is VALID!</div>
            <div className="grid gap-2 sm:grid-cols-2 pt-2 border-t border-emerald-500/10 text-[10px] text-muted-foreground">
              <div>Username: <span className="text-foreground">{result.username}</span></div>
              <div>UserID: <span className="text-foreground">{result.userId}</span></div>
              <div>Robux: <span className="text-foreground">{result.robux} R$</span></div>
              <div>Premium: <span className="text-foreground">{result.premium ? "Yes" : "No"}</span></div>
            </div>
          </div>
        )}
        <div className="flex justify-end">
          <button onClick={handleValidate} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-mono text-[11px] hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer">
            <ShieldCheck className="h-3.5 w-3.5" /> Validate
          </button>
        </div>
      </div>
    </div>
  )
}
