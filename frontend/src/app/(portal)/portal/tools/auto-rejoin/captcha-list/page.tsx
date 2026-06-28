"use client"

import { useState, useCallback } from "react"
import CaptchaListTab from "@/components/portal/auto-rejoin/captcha-list-tab"

export default function CaptchaListPage() {
  const [, setLogs] = useState<string[]>([])

  const addLog = useCallback((msg: string) => {
    const t = new Date().toLocaleTimeString()
    setLogs((prev) => [`[${t}] ${msg}`, ...prev.slice(0, 15)])
  }, [])

  return <CaptchaListTab addLog={addLog} />
}
