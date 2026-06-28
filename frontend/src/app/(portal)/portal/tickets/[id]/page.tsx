'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/components/providers/language-provider'
import { useAuth } from '@/context/auth-context'
import { ClientDate } from '@/components/ui/client-date'
import { api } from '@/lib/api'
import { useTicketSocket } from '@/hooks/use-websocket'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Shield,
  Loader2,
  ChevronDown,
  User,
  BadgeCheck,
  Wrench,
  Crown,
  ShieldCheck
} from 'lucide-react'

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

interface TicketMessage {
  id: string
  ticket_id: string
  sender_id: string
  sender_role: 'user' | 'staff' | 'admin' | 'developer' | 'owner'
  content: string
  created_at: string
  sender_username?: string | null
  sender_avatar?: string | null
}

interface TicketDetail {
  id: string
  user_id: string
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
  messages: TicketMessage[]
}

interface TicketDetailResponse {
  status: string
  statusCode: number
  message: string
  data: TicketDetail
}

interface ReplyResponse {
  status: string
  statusCode: number
  message: string
  data: TicketMessage
}

interface StatusResponse {
  status: string
  statusCode: number
  message: string
  data: TicketDetail
}

const STAFF_ROLES = ['staff', 'admin', 'developer', 'owner']

const statusConfig: Record<TicketStatus, { label: string; className: string; icon: typeof CheckCircle }> = {
  open: { label: 'Open', className: 'bg-amber-500/5 text-amber-600 dark:text-amber-500 border-amber-500/20', icon: AlertCircle },
  in_progress: { label: 'In Progress', className: 'bg-blue-500/5 text-blue-600 dark:text-blue-500 border-blue-500/20', icon: Clock },
  resolved: { label: 'Resolved', className: 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-500 border-emerald-500/20', icon: CheckCircle },
  closed: { label: 'Closed', className: 'bg-muted text-muted-foreground border-border', icon: CheckCircle },
}

const roleDisplay: Record<string, { label: string; icon: typeof User; className: string }> = {
  user: { label: 'User', icon: User, className: 'text-muted-foreground' },
  staff: { label: 'Staff', icon: BadgeCheck, className: 'text-blue-500' },
  admin: { label: 'Admin', icon: ShieldCheck, className: 'text-purple-500' },
  developer: { label: 'Developer', icon: Wrench, className: 'text-emerald-500' },
  owner: { label: 'Owner', icon: Crown, className: 'text-amber-500' },
}

function formatDateTime(dateStr: string): React.ReactNode {
  return (
    <ClientDate 
      date={dateStr} 
      options={{
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }}
      locale="en-US"
    />
  )
}

// Removed unused relativeTime

export default function TicketDetailPage() {
  const { t } = useLanguage()
  const tKey = (key: string) => t(key as Parameters<typeof t>[0])
  const { user } = useAuth()
  const params = useParams()
  const ticketId = params.id as string

  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isStaff = STAFF_ROLES.includes(user?.role || '')

  const statusOptions = [
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
  ]

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setIsStatusOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchTicket = useCallback(async () => {
    if (!ticketId) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.get<TicketDetailResponse>(`/v1/tickets/${ticketId}`)
      setTicket(res.data)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setError(errMsg)
      if ((err as { statusCode?: number }).statusCode === 404) {
        setError('Ticket not found. It may have been deleted or you may not have access.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [ticketId])

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchTicket()
    })
  }, [fetchTicket])

  // Auto-scroll to bottom when new messages load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ticket?.messages?.length])

  // ─── WebSocket: real-time updates ────────────────────────────
  const { status: wsStatus, reconnect: wsReconnect } = useTicketSocket(ticketId, {
    onMessage: (newMsg) => {
      setTicket((prev) => {
        if (!prev) return prev
        // Deduplication already done in hook, but double-check
        if (prev.messages.some((m) => m.id === newMsg.id)) return prev
        return {
          ...prev,
          messages: [...prev.messages, newMsg],
          message_count: prev.message_count + 1,
          last_reply_at: newMsg.created_at,
        }
      })
    },
    onStatus: (updatedTicket) => {
      setTicket((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          status: updatedTicket.status,
          updated_at: updatedTicket.updated_at,
        }
      })
    },
    onError: () => {
      // Silently handle in production; could toast but not critical
    },
  })

  const handleSendReply = async () => {
    if (!replyContent.trim() || !ticket) return

    const content = replyContent.trim()
    setSendError(null)
    setIsSending(true)
    setReplyContent('')

    try {
      const res = await api.post<ReplyResponse>(`/v1/tickets/${ticketId}/messages`, {
        content,
      })

      // Optimistically add the new message using functional updater
      // to avoid race conditions with WebSocket real-time updates.
      // Dedup check prevents duplicate key error when WS broadcast
      // arrives before or after this update.
      setTicket((prev) => {
        if (!prev) return prev
        if (prev.messages.some((m) => m.id === res.data.id)) return prev
        return {
          ...prev,
          messages: [...prev.messages, res.data],
          message_count: prev.message_count + 1,
          last_reply_at: res.data.created_at,
          // Auto-transition to in_progress if user replies to open ticket
          status: prev.status === 'open' ? 'in_progress' : prev.status,
        }
      })
    } catch (err: unknown) {
      setReplyContent(content) // restore content on failure
      const errMsg = err instanceof Error ? err.message : String(err)
      setSendError(errMsg)
    } finally {
      setIsSending(false)
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!ticket || !isStaff) return

    setIsStatusOpen(false)
    setIsUpdatingStatus(true)

    try {
      const res = await api.patch<StatusResponse>(`/v1/tickets/${ticketId}/status`, {
        status: newStatus,
      })
      // Use functional updater to avoid race conditions with WebSocket
      setTicket((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          ...res.data,
        }
      })
    } catch {
      // Status update failed silently - keep current state
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendReply()
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-[11px] font-mono text-muted-foreground">{tKey("loadingConversation")}</span>
      </div>
    )
  }

  // Error state
  if (error || !ticket) {
    return (
      <div className="space-y-3 max-w-4xl mx-auto">
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-8 text-center">
          <AlertCircle className="w-8 h-8 text-red-500/50 mx-auto mb-3" />
          <p className="text-[11px] font-mono text-red-600 dark:text-red-500 mb-4">{error || 'Ticket not found'}</p>
          <Link
            href="/portal/tickets"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-[11px] font-mono rounded-lg hover:opacity-90 transition-all font-bold cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Tickets
          </Link>
        </div>
      </div>
    )
  }

  const status = statusConfig[ticket.status]
  const StatusIcon = status.icon

  return (
    <>
    <style>{`
      .chat-scrollbar::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      .chat-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      .chat-scrollbar::-webkit-scrollbar-thumb {
        background-color: var(--border);
        border-radius: 9999px;
      }
      .chat-scrollbar::-webkit-scrollbar-thumb:hover {
        background-color: var(--muted-foreground);
      }
      .chat-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: var(--border) transparent;
      }
    `}</style>
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto">
      {/* ===== HEADER (non-scrollable) ===== */}
      <div className="shrink-0 space-y-2">
        <Link
          href="/portal/tickets"
          className="inline-flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="w-3 h-3" />
          {tKey("supportTicketsTitle")}
        </Link>

        <div className="flex flex-row items-start justify-between border-b border-border pb-2.5 gap-2">
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[9px] font-mono font-bold text-primary">{ticket.code}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border capitalize">{ticket.category}</span>
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border text-[9px] font-mono ${status.className}`}>
                <StatusIcon className="w-3 h-3" />
                {status.label}
              </span>

              {/* WebSocket Connection Status Widget */}
              {wsStatus === 'connecting' && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-500 text-[9px] font-mono">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  Connecting...
                </span>
              )}
              {wsStatus === 'connected' && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-500 text-[9px] font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  Live
                </span>
              )}
              {wsStatus === 'offline' && (
                <div className="flex items-center gap-1">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-500 text-[9px] font-mono">
                    Offline
                  </span>
                  <button
                    onClick={wsReconnect}
                    className="text-[9px] font-mono px-2 py-0.5 bg-primary text-primary-foreground hover:opacity-90 active:scale-98 rounded transition-all font-bold cursor-pointer"
                  >
                    Reconnect Manual
                  </button>
                </div>
              )}
            </div>
            <h1 className="text-lg font-black tracking-tight text-foreground uppercase truncate">
              {ticket.subject}
            </h1>
            <p className="text-[11px] text-muted-foreground">
              Created {formatDateTime(ticket.created_at)}
              {ticket.user_username && (
                <span> by <span className="font-mono text-foreground font-bold">{ticket.user_username}</span></span>
              )}
            </p>
          </div>

          {/* Status dropdown (staff+ only) */}
          {isStaff && (
            <div ref={statusRef} className="relative shrink-0">
              <button
                onClick={() => setIsStatusOpen(!isStatusOpen)}
                disabled={isUpdatingStatus}
                className="px-3 py-2 text-[10px] font-mono font-bold rounded-md border border-border bg-card text-foreground hover:border-primary/30 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isUpdatingStatus ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <StatusIcon className="w-3 h-3" />
                )}
                <span>{status.label}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>
              {isStatusOpen && (
                <div className="absolute right-0 z-50 mt-1 w-40 rounded-lg border border-border bg-card shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleStatusUpdate(option.value)}
                      className={`w-full px-3 py-2 text-[10px] font-mono text-left transition-colors cursor-pointer flex items-center gap-2 ${
                        ticket.status === option.value
                          ? 'bg-primary/10 text-primary font-bold'
                          : 'text-foreground hover:bg-muted/60'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${ticket.status === option.value ? 'bg-primary' : 'bg-muted-foreground/20'}`} />
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border text-[10px] text-muted-foreground font-mono">
          <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>Conversation ID: <span className="text-foreground font-bold select-all">{ticket.id}</span> - End-to-end encrypted session.</span>
        </div>
      </div>

      {/* ===== CHAT BODY (independently scrollable) ===== */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3 min-h-0 chat-scrollbar">
        {ticket.messages.map((msg) => {
          const roleInfo = roleDisplay[msg.sender_role] || roleDisplay.user
          const RoleIcon = roleInfo.icon
          const isOwnMessage = msg.sender_id === user?.id

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`shrink-0 w-8 h-8 rounded-full border overflow-hidden flex items-center justify-center text-[10px] font-bold ${
                isOwnMessage
                  ? 'bg-primary/10 border-primary/20 text-primary'
                  : 'bg-muted border-border text-muted-foreground'
              }`}>
                {msg.sender_avatar && msg.sender_avatar !== 'null' && msg.sender_avatar !== 'undefined' ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={msg.sender_avatar}
                    alt={msg.sender_username || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <RoleIcon className="w-4 h-4" />
                )}
              </div>

              {/* Message bubble */}
              <div className={`flex-1 min-w-0 max-w-[80%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`rounded-lg border px-3.5 py-2.5 ${
                  isOwnMessage
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-card border-border'
                }`}>
                  {/* Sender info */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] font-mono font-bold text-foreground">
                      {isOwnMessage ? tKey("youLabel") : (msg.sender_username || 'Unknown')}
                    </span>
                    <span className={`inline-flex items-center gap-0.5 text-[8px] font-mono font-bold ${roleInfo.className}`}>
                      <RoleIcon className="w-2.5 h-2.5" />
                      {roleInfo.label}
                    </span>
                  </div>

                  {/* Content */}
                  <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>

                  {/* Timestamp */}
                  <p className="text-[8px] text-muted-foreground mt-1.5 font-mono">
                    {formatDateTime(msg.created_at)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ===== FOOTER: Reply Form (non-scrollable) ===== */}
      {ticket.status !== 'closed' ? (
        <div className="shrink-0 pt-3">
          <div className="rounded-lg border border-border bg-card p-4 shadow-xs space-y-3">
            <h3 className="font-extrabold text-xs text-foreground tracking-tight uppercase">{tKey("replyLabel")}</h3>

            {sendError && (
              <div className="px-3 py-2 rounded-md bg-red-500/5 border border-red-500/20 text-[11px] font-mono text-red-600 dark:text-red-500">
                {sendError}
                <button
                  onClick={() => setSendError(null)}
                  className="ml-2 underline hover:no-underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            <Textarea
              rows={3}
              placeholder={isStaff ? 'Reply to this ticket as support staff...' : tKey("replyPlaceholderUser")}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="text-xs font-mono resize-none"
            />

            <div className="flex items-center justify-between text-[9px] text-muted-foreground font-mono">
              <span>{tKey("pressEnterTip")}</span>
              <button
                onClick={handleSendReply}
                disabled={isSending || !replyContent.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground text-[11px] font-mono rounded-lg hover:opacity-90 active:scale-98 transition-all font-bold cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                {isSending ? tKey("sendingBtn") : tKey("sendReplyBtn")}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="shrink-0 pt-3">
          <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-muted/30 border border-border text-[10px] text-muted-foreground font-mono">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{tKey("ticketClosedNotice")}</span>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
