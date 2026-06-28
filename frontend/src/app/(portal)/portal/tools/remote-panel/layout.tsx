"use client"

import { usePathname } from "next/navigation"
import { Wifi } from "lucide-react"
import { remotePanelSubItems } from "@/components/portal/remote-panel-items"
import type { ReactNode } from "react"

export default function RemotePanelLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  const activeSubItem = remotePanelSubItems.find((item) => pathname.endsWith(`/${item.id}`))
  const currentName = activeSubItem?.name || "Remote Panel"

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 w-full overflow-x-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-black tracking-tight text-foreground uppercase">Remote Panel</h1>
          <p className="text-[11px] text-muted-foreground">
            <span className="text-primary font-bold">{currentName}</span>
            {" "}- Remote bot management and execution console
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-[9px] font-mono bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <Wifi className="h-3 w-3" />
            API Connected
          </span>
        </div>
      </div>

      {children}
    </div>
  )
}
