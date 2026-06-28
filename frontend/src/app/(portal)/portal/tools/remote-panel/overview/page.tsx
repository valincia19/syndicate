"use client"

import { useState } from "react"
import OverviewTab from "@/components/portal/remote-panel/overview-tab"
import { MOCK_INSTANCES } from "@/components/portal/remote-panel/types"

export default function RemotePanelOverviewPage() {
  const [instances] = useState(MOCK_INSTANCES)
  return <OverviewTab instances={instances} />
}
