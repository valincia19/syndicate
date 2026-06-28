"use client"

import { useState, useEffect, useCallback } from "react"
import { api } from "@/lib/api"
import { ClientDate } from "@/components/ui/client-date"
import { 
  History, 
  Eye, 
  Trash2, 
  RotateCcw, 
  Key, 
  Ticket, 
  MessageSquare, 
  Loader2, 
  Calendar,
  AlertCircle
} from "lucide-react"

interface ActivityLogDetails {
  path?: string
  roblox_username?: string
  code?: string
  subject?: string
  license_key?: string
  [key: string]: unknown
}

interface ActivityLog {
  id: string
  action: string
  details: ActivityLogDetails
  created_at: string
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const [limit] = useState(10)
  const [offset, setOffset] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchLogs = useCallback(async (currentOffset: number, append = false) => {
    if (currentOffset === 0) setIsLoading(true)
    else setLoadingMore(true)
    
    try {
      const res = await api.get<{ 
        status: string 
        data: { logs: ActivityLog[]; total: number } 
      }>(`/v1/activity/my?limit=${limit}&offset=${currentOffset}`)
      
      const newLogs = res.data.logs || []
      setTotal(res.data.total || 0)
      
      if (append) {
        setLogs((prev) => [...prev, ...newLogs])
      } else {
        setLogs(newLogs)
      }
    } catch (err) {
      console.error("Failed to load activity logs:", err)
    } finally {
      setIsLoading(false)
      setLoadingMore(false)
    }
  }, [limit])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching pattern
    fetchLogs(0, false)
  }, [fetchLogs])

  const handleLoadMore = () => {
    const nextOffset = offset + limit
    setOffset(nextOffset)
    fetchLogs(nextOffset, true)
  }


  // Format action name nicely
  const formatActionName = (action: string, details: ActivityLogDetails) => {
    switch (action) {
      case "view_page":
        const path = typeof details?.path === "string" ? details.path : ""
        const segment = path.split("/").pop() || "dashboard"
        return `Viewed ${segment.charAt(0).toUpperCase() + segment.slice(1)} page`
      case "unlink_device":
        return `Unlinked Roblox Device (${String(details?.roblox_username || "unknown")})`
      case "reset_device_hwid":
        return `Reset HWID for Roblox user ${String(details?.roblox_username || "unknown")}`
      case "reset_all_devices_hwid":
        return "Reset all devices HWID"
      case "redeem_code":
        return `Activated license using code: ${String(details?.code || "unknown")}`
      case "claim_voucher":
        return `Claimed voucher code: ${String(details?.code || "unknown")}`
      case "create_ticket":
        return `Opened Support Ticket: "${String(details?.subject || "No Subject")}"`
      case "reply_ticket":
        return "Replied to Support Ticket"
      default:
        return action.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    }
  }

  // Get action icon
  const getActionIcon = (action: string) => {
    switch (action) {
      case "view_page":
        return <Eye className="w-4 h-4 text-sky-400" />
      case "unlink_device":
        return <Trash2 className="w-4 h-4 text-red-500" />
      case "reset_device_hwid":
      case "reset_all_devices_hwid":
        return <RotateCcw className="w-4 h-4 text-amber-500" />
      case "redeem_code":
      case "claim_voucher":
        return <Key className="w-4 h-4 text-emerald-500" />
      case "create_ticket":
        return <Ticket className="w-4 h-4 text-indigo-400" />
      case "reply_ticket":
        return <MessageSquare className="w-4 h-4 text-purple-400" />
      default:
        return <History className="w-4 h-4 text-muted-foreground" />
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-wider uppercase font-mono flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Activity Logs
          </h1>
          <p className="text-[11px] text-muted-foreground font-mono mt-1">
            Real-time audit history of your actions, activations, and page views.
          </p>
        </div>

      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest animate-pulse">
            Fetching Activity Stream...
          </span>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card/25 border border-border/50 rounded-2xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-muted-foreground/60 mb-2" />
          <p className="text-xs text-muted-foreground font-mono">No activity logs found matching the filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Timeline Wrapper */}
          <div className="relative border-l border-border/40 pl-6 ml-3 space-y-6">
            {logs.map((log) => {
              return (
                <div key={log.id} className="relative group">
                  {/* Bullet Node */}
                  <span className="absolute left-[-33px] top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border border-border bg-card shadow group-hover:border-primary/50 group-hover:bg-primary/5 transition-colors">
                    {getActionIcon(log.action)}
                  </span>

                  {/* Log Content Card */}
                  <div className="p-4 rounded-xl border border-border bg-card/50 hover:bg-card/85 transition-all duration-300 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold font-mono tracking-tight text-foreground">
                        {formatActionName(log.action, log.details)}
                      </p>
                      {log.action === "view_page" && typeof log.details?.path === "string" && (
                        <p className="text-[9px] font-mono text-muted-foreground/70">
                          Path: <span className="text-primary/70">{String(log.details.path)}</span>
                        </p>
                      )}
                      {log.action !== "view_page" && log.details && Object.keys(log.details).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {Object.entries(log.details)
                            .filter(([k, v]) => v !== null && v !== undefined && String(v).trim() !== "" && !(k === "license_id" && log.details.license_key))
                            .map(([key, value]) => {
                              let displayKey = key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
                              let displayValue = String(value);

                              if (key === "license_id" || key === "license_key") {
                                displayKey = "License Key";
                                if (displayValue.length === 36 && displayValue.split('-').length === 5) {
                                  const parts = displayValue.split('-');
                                  displayValue = `${parts[0]}-****-****-****-${parts[4]}`;
                                } else if (displayValue.length > 8) {
                                  displayValue = displayValue.substring(0, 4) + "****" + displayValue.substring(displayValue.length - 4);
                                } else {
                                  displayValue = "****";
                                }
                              }

                              return (
                                <div key={key} className="flex items-center gap-1.5 bg-muted/40 px-2 py-1 rounded-md border border-border/50 text-[10px] font-mono">
                                  <span className="text-muted-foreground/80">{displayKey}:</span>
                                  <span className="text-foreground/90 font-medium truncate max-w-[250px]" title={String(value)}>
                                    {displayValue}
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-muted-foreground shrink-0 self-end md:self-center">
                      <Calendar className="w-3 h-3" />
                      <div className="text-right text-[11px]">
                        <ClientDate date={log.created_at} format="datetime" className="font-mono text-muted-foreground/60" />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Load More button */}
          {logs.length < total && (
            <div className="pt-4 flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2 border border-border rounded-xl bg-card hover:bg-accent/40 font-mono text-[10px] text-muted-foreground hover:text-foreground transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <History className="w-3.5 h-3.5" />}
                Load More History
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
