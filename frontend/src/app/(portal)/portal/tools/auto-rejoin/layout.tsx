"use client"

import { usePathname } from "next/navigation"
import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { DEVICES } from "@/components/portal/auto-rejoin/types"
import type { ReactNode } from "react"

const TAB_NAMES: Record<string, string> = {
  "device-list": "Device List",
  "executor-installer": "Executor Installer",
  "cookie-inject": "Cookie Inject",
  "cookie-validator": "Cookie Validator",
  "replace-cookie": "Replace Cookie",
  "bot-monitoring": "Bot Monitoring",
  "captcha-list": "Captcha Solver",
  "proxy-manager": "Proxy Manager",
  "lua-executor": "Lua Executor",
}

export default function AutoRejoinLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [selectedDevice, setSelectedDevice] = useState(DEVICES[0].id)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const currentTabId = pathname.split("/").pop() || "device-list"
  const currentName = TAB_NAMES[currentTabId] || "Auto Rejoin Tool"
  const currentDeviceObj = DEVICES.find((d) => d.id === selectedDevice)

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-black tracking-tight text-foreground uppercase">Auto Rejoin Tool</h1>
          <p className="text-[11px] text-muted-foreground">
            <span className="text-primary font-bold">{currentName}</span>
            {" "}- Roblox client telemetry, auto-reconnect &amp; cookie injection
          </p>
        </div>
        <div className="relative shrink-0">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center justify-between gap-2.5 w-60 px-3.5 py-2 text-xs font-mono rounded-lg border border-border bg-card hover:bg-muted/40 text-foreground transition-all cursor-pointer select-none text-left"
          >
            <span className="flex items-center gap-2 truncate">
              <span className={`h-2 w-2 rounded-full shrink-0 ${currentDeviceObj?.active ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
              <span className="truncate">{currentDeviceObj?.name}</span>
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
          </button>
          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
              <div className="absolute right-0 mt-1.5 w-60 rounded-lg border border-border bg-card shadow-lg z-20 py-1 animate-in fade-in slide-in-from-top-1 duration-150 select-none">
                <div className="px-2.5 py-1 text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Target Device</div>
                {DEVICES.map((dev) => (
                  <button
                    key={dev.id}
                    onClick={() => { setSelectedDevice(dev.id); setIsDropdownOpen(false) }}
                    className={`flex items-center justify-between w-full px-3 py-2 text-[11px] font-mono text-left hover:bg-muted/40 transition-colors cursor-pointer ${selectedDevice === dev.id ? "bg-primary/5 text-primary" : "text-muted-foreground"}`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dev.active ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                      <span className="truncate">{dev.name}</span>
                    </span>
                    <span className="text-[9px] opacity-60 shrink-0">{dev.ip}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {children}
    </div>
  )
}
