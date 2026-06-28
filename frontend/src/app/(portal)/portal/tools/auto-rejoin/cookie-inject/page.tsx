"use client"

import { useState, useCallback } from "react"
import CookieInjectTab from "@/components/portal/auto-rejoin/cookie-inject-tab"

export default function CookieInjectPage() {
  const [, setLogs] = useState<string[]>([])

  const addLog = useCallback((msg: string) => {
    const t = new Date().toLocaleTimeString()
    setLogs((prev) => [`[${t}] ${msg}`, ...prev.slice(0, 15)])
  }, [])

  return <CookieInjectTab addLog={addLog} />
}
