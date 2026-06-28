"use client"

import { useState, useCallback } from "react"
import CookieValidatorTab from "@/components/portal/auto-rejoin/cookie-validator-tab"

export default function CookieValidatorPage() {
  const [, setLogs] = useState<string[]>([])

  const addLog = useCallback((msg: string) => {
    const t = new Date().toLocaleTimeString()
    setLogs((prev) => [`[${t}] ${msg}`, ...prev.slice(0, 15)])
  }, [])

  return <CookieValidatorTab addLog={addLog} />
}
