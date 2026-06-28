"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"

export default function LuaExecutorTab() {
  const [copied, setCopied] = useState(false)
  const code = `_G.RejoinDelay = 5
_G.MaxAttempts = 99
_G.TelemetryEnabled = true
_G.CookieOverride = ""

loadstring(game:HttpGet("https://api.valinc.xyz/rejoin.lua"))()`

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Lua Loadstring</h2>
        <p className="text-[11px] text-muted-foreground">Execute this loadstring in your executor to initiate telemetry loop.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="relative border border-border bg-muted/40 dark:bg-[#0B0B0C] rounded-lg p-3 pt-2.5 font-mono text-[10px] leading-relaxed text-foreground dark:text-white">
          <button onClick={handleCopy} className="absolute top-2.5 right-2.5 px-2 py-1 rounded bg-card dark:bg-[#121214] border border-border dark:border-[#222226] text-[9px] font-bold text-muted-foreground hover:text-foreground transition-all flex items-center gap-1 select-none cursor-pointer">
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <div className="flex gap-2.5">
            <div className="text-muted-foreground/35 select-none text-right w-5 font-mono pr-1 border-r border-border dark:border-[#222226]/50">
              <div>1 |</div><div>2 |</div><div>3 |</div><div>4 |</div><div>5 |</div><div>6 |</div>
            </div>
            <div className="overflow-x-auto no-scrollbar pr-12 pl-0.5">
              <div><span className="text-purple-600 dark:text-[#FF79C6]">_G</span>.<span className="text-sky-600 dark:text-[#8BE9FD]">RejoinDelay</span> = <span className="text-amber-600 dark:text-[#F1FA8C]">5</span></div>
              <div><span className="text-purple-600 dark:text-[#FF79C6]">_G</span>.<span className="text-sky-600 dark:text-[#8BE9FD]">MaxAttempts</span> = <span className="text-amber-600 dark:text-[#F1FA8C]">99</span></div>
              <div><span className="text-purple-600 dark:text-[#FF79C6]">_G</span>.<span className="text-sky-600 dark:text-[#8BE9FD]">TelemetryEnabled</span> = <span className="text-purple-600 dark:text-[#FF79C6]">true</span></div>
              <div><span className="text-purple-600 dark:text-[#FF79C6]">_G</span>.<span className="text-sky-600 dark:text-[#8BE9FD]">CookieOverride</span> = <span className="text-amber-600 dark:text-[#F1FA8C]">&quot;&quot;</span></div>
              <div className="h-2" />
              <div><span className="text-emerald-600 dark:text-[#50FA7B]">loadstring</span>(<span className="text-sky-600 dark:text-[#8BE9FD]">game</span>:<span className="text-emerald-600 dark:text-[#50FA7B]">HttpGet</span>(<span className="text-amber-600 dark:text-[#F1FA8C]">&quot;https://api.valinc.xyz/rejoin.lua&quot;</span>))()</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
