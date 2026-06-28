'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { useTicketDashboard } from '@/hooks/use-ticket-dashboard'
import {
  Key, MessageSquare,
  Clock, AlertCircle, CheckCircle, ChevronRight,
  Loader2, User, Sparkles
} from 'lucide-react'

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

interface Ticket {
  id: string
  code: string
  subject: string
  category: string
  status: TicketStatus
  created_at: string
  updated_at: string
  message_count: number
  last_reply_at: string | null
  user_username?: string
  user_email?: string
}

interface TicketListResponse {
  status: string
  data: { tickets: Ticket[] }
}

const statusConfig: Record<TicketStatus, { label: string; className: string; icon: typeof CheckCircle }> = {
  open: { label: 'Open', className: 'bg-amber-500/5 text-amber-600 dark:text-amber-500 border-amber-500/20', icon: AlertCircle },
  in_progress: { label: 'In Progress', className: 'bg-blue-500/5 text-blue-600 dark:text-blue-500 border-blue-500/20', icon: Clock },
  resolved: { label: 'Resolved', className: 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-500 border-emerald-500/20', icon: CheckCircle },
  closed: { label: 'Closed', className: 'bg-muted text-muted-foreground border-border', icon: CheckCircle },
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDays = Math.floor(diffHr / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export default function StaffOverviewPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [newMsgTicketIds, setNewMsgTicketIds] = useState<Set<string>>(new Set())
  const newMsgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchTickets = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    setLoadError(null)
    try {
      const res = await api.get<TicketListResponse>('/v1/tickets')
      setTickets(res.data.tickets || [])
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setLoadError(errMsg)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchTickets()
    })
  }, [fetchTickets])

  // ─── WebSocket Dashboard: real-time updates ──
  useTicketDashboard((event) => {
    if (event.type === 'new_message') {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === event.ticketId
            ? { ...t, message_count: t.message_count + 1, last_reply_at: new Date().toISOString() }
            : t
        )
      )
      setNewMsgTicketIds((prev) => {
        const next = new Set(prev)
        next.add(event.ticketId)
        return next
      })
      if (newMsgTimerRef.current) clearTimeout(newMsgTimerRef.current)
      newMsgTimerRef.current = setTimeout(() => setNewMsgTicketIds(new Set()), 8000)
    }
    if (event.type === 'status_update' && event.data) {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === event.ticketId
            ? { ...t, status: event.data.status, updated_at: event.data.updated_at }
            : t
        )
      )
    }
  })

  // Compute stats from real data
  const openCount = tickets.filter((t) => t.status === 'open').length
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length
  const recentTickets = [...tickets].slice(0, 5)

  const statsCards = [
    {
      label: 'Open Tickets',
      value: openCount,
      href: '/studio/staff/tickets',
    },
    {
      label: 'In Progress',
      value: inProgressCount,
      href: '/studio/staff/tickets',
    },
    {
      label: 'Total Tickets',
      value: tickets.length,
      href: '/studio/staff/tickets',
    },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-black tracking-tight text-foreground uppercase">
            Staff Overview
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Support operations dashboard &mdash; {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} in the system
          </p>
        </div>
        {!isLoading && (
          <button
            onClick={fetchTickets}
            className="px-3 py-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors cursor-pointer"
          >
            Refresh
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-[11px] font-mono text-muted-foreground">Loading dashboard...</span>
        </div>
      )}

      {/* Error */}
      {loadError && !isLoading && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-8 text-center">
          <p className="text-[11px] font-mono text-red-600 dark:text-red-500 mb-4">{loadError}</p>
          <button
            onClick={fetchTickets}
            className="px-4 py-2 bg-primary text-primary-foreground text-[11px] font-mono rounded-lg hover:opacity-90 transition-all font-bold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Grid */}
      {!isLoading && !loadError && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {statsCards.map((stat, i) => (
              <Link
                key={i}
                href={stat.href}
                className="rounded-xl border border-border bg-card p-3.5 shadow-xs block"
              >
                <div className="text-lg font-bold text-foreground font-mono leading-none">
                  {stat.value}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">
                  {stat.label}
                </div>
              </Link>
            ))}
          </div>

          {/* Recent Ticket Activity */}
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs w-full">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-xs font-mono text-foreground uppercase tracking-wider">Recent Ticket Activity</h2>
              <Link
                href="/studio/staff/tickets"
                className="text-[10px] font-mono text-primary hover:underline"
              >
                View all
              </Link>
            </div>
            {recentTickets.length === 0 ? (
              <div className="p-12 text-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-xs font-bold text-foreground mb-1">No Tickets Yet</p>
                <p className="text-[11px] text-muted-foreground">No support tickets have been created yet.</p>
              </div>
            ) : (
              <div className="p-5 space-y-3">
                {recentTickets.map((ticket) => {
                  const status = statusConfig[ticket.status]
                  const StatusIcon = status.icon
                  const isNew = newMsgTicketIds.has(ticket.id)

                  return (
                    <Link
                      key={ticket.id}
                      href={`/studio/staff/tickets/${ticket.id}`}
                      className={`block border ${isNew ? 'border-primary/30 bg-primary/[0.02]' : 'border-border/50 bg-muted/10 hover:bg-muted/20 dark:hover:bg-[#121214]/30'} rounded-xl p-4 transition-all duration-200 group relative`}
                    >
                      {isNew && (
                        <span className="absolute -top-1.5 -right-1.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[8px] font-mono font-bold shadow-xs animate-in fade-in zoom-in-50">
                          <Sparkles className="w-2.5 h-2.5" />
                          New
                        </span>
                      )}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 shrink-0">
                            <StatusIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[11px] font-bold text-foreground font-mono">{ticket.code}</span>
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border capitalize">{ticket.category}</span>
                            </div>
                            <div className="text-xs font-semibold text-foreground/90 truncate">{ticket.subject}</div>
                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground font-mono">
                              <span className="flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-muted-foreground/60" />
                                {ticket.user_username || ticket.user_email || 'Unknown'}
                              </span>
                              <span className="text-muted-foreground/40">•</span>
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                {ticket.message_count}
                              </span>
                              <span className="text-muted-foreground/40">•</span>
                              <span>{relativeTime(ticket.last_reply_at)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:self-center shrink-0">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[9px] font-mono ${status.className}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${ticket.status === 'open' ? 'bg-amber-500 animate-pulse' : ticket.status === 'in_progress' ? 'bg-blue-500' : ticket.status === 'resolved' ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                            {status.label}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => router.push('/studio/staff/tickets')}
              className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary transition-all duration-200 shadow-xs cursor-pointer active:scale-98"
            >
              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center mb-3">
                <MessageSquare className="w-4 h-4 text-primary" />
              </div>
              <div className="text-xs font-bold text-foreground mb-1 uppercase tracking-wider">Manage Tickets</div>
              <div className="text-[10px] text-muted-foreground font-mono">Open the support ticket queue</div>
            </button>
            <button
              onClick={() => router.push('/studio/staff/lookup')}
              className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary transition-all duration-200 shadow-xs cursor-pointer active:scale-98"
            >
              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center mb-3">
                <Key className="w-4 h-4 text-primary" />
              </div>
              <div className="text-xs font-bold text-foreground mb-1 uppercase tracking-wider">Key Lookup</div>
              <div className="text-[10px] text-muted-foreground font-mono">Verify user licenses and reset HWIDs</div>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
