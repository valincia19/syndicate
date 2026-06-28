"use client"

import { useState } from "react"
import { Check } from "lucide-react"

interface Props {
  addLog: (msg: string) => void
}

export default function CaptchaListTab({ addLog }: Props) {
  const [captchaService, setCaptchaService] = useState("capsolver")
  const [captchaKey, setCaptchaKey] = useState("cap-98c8f-xxxx-4819a")

  const handleSave = () => { addLog("SUCCESS: Captcha config saved.") }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Captcha Solver</h2>
        <p className="text-[11px] text-muted-foreground">Configure automated captcha bypass for server-entry verification.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-[9px] font-mono text-muted-foreground uppercase">Service</label>
            <select value={captchaService} onChange={(e) => { setCaptchaService(e.target.value); addLog(`Captcha: ${e.target.value}`) }} className="w-full px-2.5 py-2 text-xs font-mono rounded-md border border-border bg-muted/40 dark:bg-[#070708] text-foreground focus:outline-hidden focus:border-primary/50 cursor-pointer">
              <option value="capsolver">Capsolver</option>
              <option value="twocaptcha">2Captcha</option>
              <option value="anticaptcha">Anti-Captcha</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-mono text-muted-foreground uppercase">API Key</label>
            <input type="password" value={captchaKey} onChange={(e) => setCaptchaKey(e.target.value)} className="w-full px-2.5 py-2 text-xs font-mono rounded-md border border-border bg-muted/40 dark:bg-[#070708] text-foreground focus:outline-hidden focus:border-primary/50" />
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-mono text-[11px] hover:opacity-90 flex items-center gap-1.5 cursor-pointer">
            <Check className="h-3.5 w-3.5" /> Save
          </button>
        </div>
      </div>
    </div>
  )
}
