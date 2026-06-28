'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/components/providers/language-provider'
import { ClientDate } from '@/components/ui/client-date'
import { api } from '@/lib/api'
import { useTicketDashboard } from '@/hooks/use-ticket-dashboard'
import { Textarea } from '@/components/ui/textarea'
import {
  Plus,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Send,
  Shield,
  Loader2,
  Sparkles
} from 'lucide-react'

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

interface Ticket {
  /** Opaque UUID - not guessable, not sequential */
  id: string
  /** Human-readable display code */
  code: string
  subject: string
  category: string
  status: TicketStatus
  last_reply_at: string | null
  created_at: string
  updated_at: string
  message_count: number
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

interface CreateTicketResponse {
  status: string
  statusCode: number
  message: string
  data: Ticket
}

const statusConfig: Record<TicketStatus, { label: string; className: string; icon: typeof CheckCircle }> = {
  open: { label: 'Open', className: 'bg-amber-500/5 text-amber-600 dark:text-amber-500 border-amber-500/20', icon: AlertCircle },
  in_progress: { label: 'In Progress', className: 'bg-blue-500/5 text-blue-600 dark:text-blue-500 border-blue-500/20', icon: Clock },
  resolved: { label: 'Resolved', className: 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-500 border-emerald-500/20', icon: CheckCircle },
  closed: { label: 'Closed', className: 'bg-muted text-muted-foreground border-border', icon: CheckCircle },
}

function relativeTime(dateStr: string | null): React.ReactNode {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`
  const diffDays = Math.floor(diffHr / 24)
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return <ClientDate date={dateStr} format="date" />
}

export default function PortalTicketsPage() {
  const { t } = useLanguage()
  const tKey = (key: string) => t(key as Parameters<typeof t>[0])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showNewTicket, setShowNewTicket] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [newCategory, setNewCategory] = useState('general')
  const [isCategoryOpen, setIsCategoryOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [newMsgTicketIds, setNewMsgTicketIds] = useState<Set<string>>(new Set())
  const categoryRef = useRef<HTMLDivElement>(null)
  const newMsgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const categoryOptions = [
    { value: 'general', label: 'General' },
    { value: 'technical', label: 'Technical Issue' },
    { value: 'billing', label: 'Billing' },
    { value: 'bug', label: 'Bug Report' },
  ]

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setIsCategoryOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
    Promise.resolve().then(() => {
      fetchTickets()
    })
  }, [fetchTickets])

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
      setNewMsgTicketIds((prev) => {
        const next = new Set(prev)
        next.add(event.ticketId)
        return next
      })
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
  })

  const handleSubmitTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim()) return

    setSubmitError(null)
    setIsSubmitting(true)

    try {
      await api.post<CreateTicketResponse>('/v1/tickets', {
        subject: newSubject.trim(),
        category: newCategory,
        message: newMessage.trim(),
      })

      // Reset form
      setNewSubject('')
      setNewMessage('')
      setNewCategory('general')
      setShowNewTicket(false)

      // Refresh ticket list
      await fetchTickets()
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setSubmitError(errMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-3 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-row items-center justify-between border-b border-border pb-2.5 gap-2">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-black tracking-tight text-foreground uppercase">
            {t('portalTickets')}
          </h1>
          <p className="text-[11px] text-muted-foreground">
            {tKey("supportTicketsSub")}
          </p>
        </div>
        <button
          onClick={() => setShowNewTicket(!showNewTicket)}
          className="px-4 py-2 bg-primary text-primary-foreground text-[11px] font-mono rounded-lg hover:opacity-90 active:scale-98 transition-all font-bold cursor-pointer flex items-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" />
          {tKey("newTicketBtn")}
        </button>
      </div>

      {/* New Ticket Form */}
      {showNewTicket && (
        <div className="rounded-lg border border-border bg-card p-4 shadow-xs animate-in fade-in duration-200 space-y-4">
          <h3 className="font-extrabold text-xs text-foreground tracking-tight uppercase">{tKey("createTicketModalTitle")}</h3>

          {submitError && (
            <div className="px-3 py-2 rounded-md bg-red-500/5 border border-red-500/20 text-[11px] font-mono text-red-600 dark:text-red-500">
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1.5 font-bold select-none">{tKey("subjectLabel")}</label>
              <input
                type="text"
                placeholder={tKey("subjectPlaceholder")}
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:border-primary/50"
              />
            </div>
            <div ref={categoryRef} className="relative">
              <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1.5 font-bold select-none">Category</label>
              <button
                type="button"
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className="w-full px-3 py-2 text-xs font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground focus:outline-hidden focus:border-primary/50 flex items-center justify-between cursor-pointer transition-colors hover:border-primary/30"
              >
                <span>{categoryOptions.find(o => o.value === newCategory)?.label}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${isCategoryOpen ? 'rotate-180' : ''}`} />
              </button>
              {isCategoryOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                  {categoryOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => { setNewCategory(option.value); setIsCategoryOpen(false) }}
                      className={`w-full px-3 py-2 text-xs font-mono text-left transition-colors cursor-pointer flex items-center gap-2 ${
                        newCategory === option.value
                          ? 'bg-primary/10 text-primary font-bold'
                          : 'text-foreground hover:bg-muted/60'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${newCategory === option.value ? 'bg-primary' : 'bg-muted-foreground/20'}`} />
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1.5 font-bold select-none">{tKey("messageLabel")}</label>
            <Textarea
              rows={4}
              placeholder={tKey("messagePlaceholder")}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="text-xs font-mono resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => { setShowNewTicket(false); setSubmitError(null) }}
              className="px-4 py-2 text-[11px] font-mono text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors cursor-pointer"
            >
              {tKey("cancelBtn")}
            </button>
            <button
              onClick={handleSubmitTicket}
              disabled={isSubmitting || !newSubject.trim() || !newMessage.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground text-[11px] font-mono rounded-lg hover:opacity-90 active:scale-98 transition-all font-bold cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              {isSubmitting ? tKey("submittingBtn") : tKey("submitTicketBtn")}
            </button>
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border text-[10px] text-muted-foreground font-mono">
        <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <span>Tickets use encrypted unique identifiers. Each conversation is isolated and cannot be accessed without authorization.</span>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-[11px] font-mono text-muted-foreground">{tKey("loadingTickets")}</span>
        </div>
      )}

      {/* Error State */}
      {loadError && !isLoading && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-center">
          <p className="text-[11px] font-mono text-red-600 dark:text-red-500 mb-3">{loadError}</p>
          <button
            onClick={fetchTickets}
            className="px-4 py-2 text-[11px] font-mono font-bold bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !loadError && tickets.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-xs font-bold text-foreground mb-1">{tKey("noTicketsYetTitle")}</h3>
          <p className="text-[11px] text-muted-foreground mb-4">{tKey("noTicketsYetDesc")}</p>
          <button
            onClick={() => setShowNewTicket(true)}
            className="px-4 py-2 bg-primary text-primary-foreground text-[11px] font-mono rounded-lg hover:opacity-90 active:scale-98 transition-all font-bold cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            {tKey("createTicketBtn")}
          </button>
        </div>
      )}

      {/* Ticket List */}
      {!isLoading && !loadError && tickets.length > 0 && (
        <div className="space-y-2">
          {tickets.map((ticket) => {
            const status = statusConfig[ticket.status]
            const StatusIcon = status.icon
            return (
              <Link
                key={ticket.id}
                href={`/portal/tickets/${ticket.id}`}
                className={`block w-full rounded-lg border ${newMsgTicketIds.has(ticket.id) ? 'border-primary/30 bg-primary/[0.02] dark:bg-primary/[0.03]' : 'border-border bg-card hover:border-primary/40'} p-3.5 transition-all duration-200 shadow-xs group relative`}
              >
                {newMsgTicketIds.has(ticket.id) && (
                  <span className="absolute -top-1.5 -right-1.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[8px] font-mono font-bold shadow-xs animate-in fade-in zoom-in-50">
                    <Sparkles className="w-2.5 h-2.5" />
                    New
                  </span>
                )}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-mono text-primary font-bold">{ticket.code}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border capitalize">{ticket.category}</span>
                    </div>
                    <h4 className="text-xs font-semibold text-foreground truncate">{ticket.subject}</h4>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </div>
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] font-mono ${status.className}`}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>
                  <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-mono">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {ticket.message_count}
                    </span>
                    <span>{relativeTime(ticket.last_reply_at)}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
