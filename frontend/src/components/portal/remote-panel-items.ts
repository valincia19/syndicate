export interface RemotePanelItem {
  id: string
  name: string
  href: string
  soon: boolean
}

export const remotePanelSubItems: RemotePanelItem[] = [
  { id: "overview", name: "Dash Overview", href: "/portal/tools/remote-panel/overview", soon: true },
  { id: "server-status", name: "Server Status", href: "/portal/tools/remote-panel/server-status", soon: true },
  { id: "active-instances", name: "Active Instances", href: "/portal/tools/remote-panel/active-instances", soon: true },
  { id: "mass-command", name: "Mass Command", href: "/portal/tools/remote-panel/mass-command", soon: true },
  { id: "script-control", name: "Script Control", href: "/portal/tools/remote-panel/script-control", soon: true },
  { id: "global-settings", name: "Global Settings", href: "/portal/tools/remote-panel/global-settings", soon: true },
  { id: "execution-logs", name: "Execution Logs", href: "/portal/tools/remote-panel/execution-logs", soon: true },
]
