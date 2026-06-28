import { Check, X, Info, AlertCircle, Wifi, WifiOff, AlertTriangle } from "lucide-react"
import type { BotInstance, ActivityItem, LogEntry } from "./types"

export function statusIcon(status: BotInstance["status"]) {
  switch (status) {
    case "online": return <Wifi className="h-3 w-3 text-emerald-500" />
    case "offline": return <WifiOff className="h-3 w-3 text-muted-foreground" />
    case "flagged": return <AlertTriangle className="h-3 w-3 text-amber-500" />
  }
}

export function activityIcon(type: ActivityItem["type"]) {
  switch (type) {
    case "success": return <Check className="h-3 w-3 text-emerald-500" />
    case "info": return <Info className="h-3 w-3 text-primary" />
    case "warn": return <AlertCircle className="h-3 w-3 text-amber-500" />
    case "error": return <X className="h-3 w-3 text-red-500" />
  }
}

export function logLevelIcon(level: LogEntry["level"]) {
  switch (level) {
    case "INFO": return <Info className="h-3 w-3 text-primary" />
    case "WARN": return <AlertCircle className="h-3 w-3 text-amber-500" />
    case "ERROR": return <X className="h-3 w-3 text-red-500" />
  }
}
