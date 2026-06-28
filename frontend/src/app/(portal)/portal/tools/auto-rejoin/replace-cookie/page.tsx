"use client"

import { useState, useCallback } from "react"
import ReplaceCookieTab from "@/components/portal/auto-rejoin/replace-cookie-tab"

export default function ReplaceCookiePage() {
  const [, setLogs] = useState<string[]>([])

  const addLog = useCallback((msg: string) => {
    const t = new Date().toLocaleTimeString()
    setLogs((prev) => [`[${t}] ${msg}`, ...prev.slice(0, 15)])
  }, [])

  return <ReplaceCookieTab addLog={addLog} />
}
