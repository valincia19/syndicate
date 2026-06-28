"use client"

import { useState, useCallback } from "react"
import { DEVICES, INITIAL_CLIENTS } from "@/components/portal/auto-rejoin/types"
import DeviceListTab from "@/components/portal/auto-rejoin/device-list-tab"

export default function DeviceListPage() {
  const [selectedDevice, _setSelectedDevice] = useState(DEVICES[0].id)
  const [clients, setClients] = useState(INITIAL_CLIENTS)
  const [, setLogs] = useState<string[]>(["[07:15:02] Auto Rejoin Module Initialized."])

  const addLog = useCallback((msg: string) => {
    const t = new Date().toLocaleTimeString()
    setLogs((prev) => [`[${t}] ${msg}`, ...prev.slice(0, 15)])
  }, [])

  return (
    <DeviceListTab
      clients={clients}
      setClients={setClients}
      selectedDevice={selectedDevice}
      addLog={addLog}
    />
  )
}
