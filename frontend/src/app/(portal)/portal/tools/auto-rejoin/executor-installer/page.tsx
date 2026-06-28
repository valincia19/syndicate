"use client"

import { useState, useCallback } from "react"
import ExecutorInstallerTab from "@/components/portal/auto-rejoin/executor-installer-tab"

export default function ExecutorInstallerPage() {
  const [, setLogs] = useState<string[]>([])

  const addLog = useCallback((msg: string) => {
    const t = new Date().toLocaleTimeString()
    setLogs((prev) => [`[${t}] ${msg}`, ...prev.slice(0, 15)])
  }, [])

  return <ExecutorInstallerTab addLog={addLog} />
}
