"use client"

import { useState } from "react"
import InstancesTab from "@/components/portal/remote-panel/instances-tab"
import { MOCK_INSTANCES } from "@/components/portal/remote-panel/types"

export default function RemotePanelActiveInstancesPage() {
  const [instances, setInstances] = useState(MOCK_INSTANCES)
  return <InstancesTab instances={instances} setInstances={setInstances} />
}
