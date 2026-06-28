"use client"

import { useState } from "react"
import ProxyManagerTab from "@/components/portal/auto-rejoin/proxy-manager-tab"

export default function ProxyManagerPage() {
  const [, setLogs] = useState<string[]>([])

  const addLog = (msg: string) => {
    const t = new Date().toLocaleTimeString()
    setLogs((prev) => [`[${t}] ${msg}`, ...prev.slice(0, 15)])
  }

  return <ProxyManagerTab addLog={addLog} />
}
