'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { useTicketDashboard } from '@/hooks/use-ticket-dashboard'
import { Headphones, CheckCircle, Clock, AlertCircle, User, MessageSquare, Loader2, ChevronRight, Sparkles, Trash2, X } from 'lucide-react'

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
  statusCode: number
  message: string
  data: {
    tickets: Ticket[]
  }
}

const statusConfig: Record<TicketStatus, { label: string; className: string; icon: typeof CheckCircle }> = {
  open: { label: 'Open', className: 'bg-primary/5 text-primary border-primary/20', icon: AlertCircle },
  in_progress: { label: 'In Progress', className: 'bg-amber-500/5 text-amber-600 dark:text-amber-500 border-amber-500/20', icon: Clock },
  resolved: { label: 'Resolved', className: 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-500 border-emerald-500/20', icon: CheckCircle },
  closed: { label: 'Closed', className: 'bg-muted text-muted-foreground border-border', icon: CheckCircle },
}

// Removed unused relativeTime

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div ref={ref} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === ref.current) onClose() }}>
      <div className="w-[460px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">{title}</h3>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

export default function StaffTicketsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [newMsgTicketIds, setNewMsgTicketIds] = useState<Set<string>>(new Set())
  const newMsgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; ticketId: string } | null>(null)

  useEffect(() => {
    const handleClose = () => setContextMenu(null)
    window.addEventListener('click', handleClose)
    return () => window.removeEventListener('click', handleClose)
  }, [])

  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)

  const handleDeleteTicketClick = (ticketId: string) => {
    setContextMenu(null)
    const target = tickets.find((t) => t.id === ticketId)
    if (target) {
      setTicketToDelete(target)
      setDialogError(null)
    }
  }

  const handleDeleteTicketSubmit = async () => {
    if (!ticketToDelete) return
    setIsDeleting(true)
    setDialogError(null)
    try {
      await api.delete(`/v1/tickets/${ticketToDelete.id}`)
      setTickets((prev) => prev.filter((t) => t.id !== ticketToDelete.id))
      setTicketToDelete(null)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setDialogError(errMsg)
    } finally {
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => {
      setMounted(true)
    })
  }, [])

  useEffect(() => {
    if (!authLoading && mounted) {
      if (!user || !['owner', 'admin', 'staff', 'developer'].includes(user.role)) {
        redirect('/studio')
      }
    }
  }, [user, authLoading, mounted])

  const fetchTickets = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    if (mounted && !authLoading) {
      Promise.resolve().then(() => {
        fetchTickets()
      })
    }
  }, [fetchTickets, mounted, authLoading])

  // ─── WebSocket Dashboard: real-time ticket list updates ──
  useTicketDashboard((event) => {
    if (event.type === 'new_message') {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === event.ticketId
            ? { ...t, message_count: t.message_count + 1, last_reply_at: new Date().toISOString() }
            : t
        )
      )
      // Mark as having new message
      setNewMsgTicketIds((prev) => {
        const next = new Set(prev)
        next.add(event.ticketId)
        return next
      })
      // Auto-clear the new-message indicator after 8 seconds
      if (newMsgTimerRef.current) clearTimeout(newMsgTimerRef.current)
      newMsgTimerRef.current = setTimeout(() => {
        setNewMsgTicketIds(new Set())
      }, 8000)
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
    if (event.type === 'ticket_deleted') {
      setTickets((prev) => prev.filter((t) => t.id !== event.ticketId))
    }
  })

  if (authLoading || !mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-[11px] font-mono text-muted-foreground animate-pulse">Loading staff tickets...</span>
      </div>
    )
  }

  if (!user || !['owner', 'admin', 'staff', 'developer'].includes(user.role)) {
    return null
  }

  const openCount = tickets.filter((t) => t.status === 'open').length
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-black tracking-tight text-foreground uppercase">
            Support Tickets
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Manage user support requests and ticket queue
          </p>
        </div>
        <div className="flex items-center gap-2">
          {openCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm border bg-primary/5 text-primary border-primary/20 text-[9px] font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span>{openCount} Open</span>
            </div>
          )}
          {inProgressCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm border bg-amber-500/5 text-amber-600 dark:text-amber-500 border-amber-500/20 text-[9px] font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>{inProgressCount} In Progress</span>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-[11px] font-mono text-muted-foreground">Loading tickets...</span>
        </div>
      )}

      {/* Error State */}
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

      {/* Support Ticket Queue */}
      {!isLoading && !loadError && (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs w-full">
          <div className="px-5 py-4 border-b border-border flex items-center gap-3">
            <Headphones className="w-4.5 h-4.5 text-primary shrink-0" />
            <div>
              <h2 className="text-xs font-mono text-foreground uppercase tracking-wider">Support Ticket Queue</h2>
              <p className="text-[10px] text-muted-foreground font-mono">{tickets.length} total ticket{tickets.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {tickets.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-xs font-bold text-foreground mb-1">No Tickets Yet</p>
              <p className="text-[11px] text-muted-foreground">All clear - no support tickets in the system.</p>
            </div>
          ) : (
            <div className="p-5 space-y-3">
              {tickets.map((ticket) => {
                const status = statusConfig[ticket.status]
                const StatusIcon = status.icon

                return (
                  <Link
                    key={ticket.id}
                    href={`/studio/staff/tickets/${ticket.id}`}
                    className={`block border ${newMsgTicketIds.has(ticket.id) ? 'border-primary/30 bg-primary/[0.02] dark:bg-primary/[0.03]' : 'border-border/50 bg-muted/10 hover:bg-muted/20 dark:hover:bg-[#121214]/30'} rounded-xl p-4 transition-all duration-200 group relative`}
                    onContextMenu={(e) => {
                      if (user?.role === 'owner') {
                        e.preventDefault()
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          ticketId: ticket.id,
                        })
                      }
                    }}
                  >
                    {newMsgTicketIds.has(ticket.id) && (
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
                            <div className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-muted-foreground/60" />
                              <span>{ticket.user_username || ticket.user_email || 'Unknown'}</span>
                            </div>
                            <span className="text-muted-foreground/40">•</span>
                            <span>{formatDateTime(ticket.created_at)}</span>
                            <span className="text-muted-foreground/40">•</span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {ticket.message_count}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:self-center shrink-0">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[9px] font-mono ${status.className}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${ticket.status === 'open' ? 'bg-primary animate-pulse' : ticket.status === 'in_progress' ? 'bg-amber-500' : ticket.status === 'resolved' ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
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
      )}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 min-w-[8rem] overflow-hidden rounded-xl border border-border/50 bg-popover p-1 text-popover-foreground shadow-md outline-hidden animate-in fade-in-80 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleDeleteTicketClick(contextMenu.ticketId)}
            className="hover:bg-destructive/10 hover:text-destructive relative flex w-full cursor-pointer select-none items-center rounded-lg px-2.5 py-1.5 text-xs font-semibold font-mono text-red-500 outline-hidden transition-colors"
          >
            Delete Ticket
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal open={ticketToDelete !== null} onClose={() => { if (!isDeleting) setTicketToDelete(null) }} title="Delete Ticket">
        {ticketToDelete && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-red-500/5 border border-red-500/20">
              <Trash2 className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">Delete this ticket?</p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  Ticket <span className="text-foreground font-bold">{ticketToDelete.code}</span> ({ticketToDelete.subject}) will be permanently removed.
                </p>
              </div>
            </div>
            {dialogError && (
              <div className="px-3 py-2 rounded-md bg-red-500/5 border border-red-500/20 text-[11px] font-mono text-red-600 dark:text-red-500">
                {dialogError}
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setTicketToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-[11px] font-mono text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTicketSubmit}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white text-[11px] font-mono rounded-lg hover:bg-red-700 active:scale-98 transition-all font-bold cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
