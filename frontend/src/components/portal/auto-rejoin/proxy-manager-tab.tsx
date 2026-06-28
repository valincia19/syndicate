"use client"

import { useState } from "react"
import { Globe } from "lucide-react"

interface Props {
  addLog: (msg: string) => void
}

export default function ProxyManagerTab({ addLog }: Props) {
  const [proxyValue, setProxyValue] = useState("socks5://user:pass@104.223.122.45:1080")
  const handleSave = () => { addLog("SUCCESS: Proxy server list updated.") }

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Proxy Manager</h2>
        <p className="text-[11px] text-muted-foreground">Bind proxy lists to device sessions to bypass rate limits.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="space-y-1">
          <label className="text-[9px] font-mono text-muted-foreground uppercase">Proxy Server (SOCKS5/HTTP)</label>
          <textarea value={proxyValue} onChange={(e) => setProxyValue(e.target.value)} rows={4} className="w-full px-2.5 py-2 text-xs font-mono rounded-md border border-border bg-muted/40 dark:bg-[#070708] text-foreground focus:outline-hidden focus:border-primary/50 leading-normal" placeholder="protocol://user:password@ip:port" />
        </div>
        <div className="flex justify-end">
          <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-mono text-[11px] hover:opacity-90 flex items-center gap-1.5 cursor-pointer">
            <Globe className="h-3.5 w-3.5" /> Save
          </button>
        </div>
      </div>
    </div>
  )
}
