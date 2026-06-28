"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useAuth } from "@/context/auth-context"
import { api } from "@/lib/api"
import { ClientDate } from "@/components/ui/client-date"
import {
  Search, Loader2, Shield, ShieldCheck, Wrench, Crown,
  User as UserIcon, X, Mail, MessageCircle, Ban
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────

interface AppUser {
  id: string
  name: string
  username: string | null
  email: string
  role: "user" | "staff" | "admin" | "developer" | "owner"
  verified: number
  balance: number
  suspended: number
  created_at: string
  updated_at: string
  avatar: string | null
  discord_id: string | null
}

interface UsersResponse {
  status: string
  data: { users: AppUser[] }
}

const ROLE_OPTIONS = [
  { value: "user", label: "User", icon: UserIcon, className: "text-muted-foreground" },
  { value: "staff", label: "Staff", icon: Shield, className: "text-blue-500" },
  { value: "admin", label: "Admin", icon: ShieldCheck, className: "text-purple-500" },
  { value: "developer", label: "Developer", icon: Wrench, className: "text-emerald-500" },
  { value: "owner", label: "Owner", icon: Crown, className: "text-amber-500" },
]

function formatDate(dateStr: string): React.ReactNode {
  return <ClientDate date={dateStr} format="date" />
}

// ─── Modal Component ─────────────────────────────────────

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="w-[400px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [users, setUsers] = useState<AppUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Suspend/unsuspend
  const [suspendTarget, setSuspendTarget] = useState<AppUser | null>(null)
  const [isTogglingSuspend, setIsTogglingSuspend] = useState(false)

  // Dialog error
  const [dialogError, setDialogError] = useState<string | null>(null)

  useEffect(() => { Promise.resolve().then(() => setMounted(true)) }, [])

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const res = await api.get<UsersResponse>("/v1/admin/users")
      setUsers(res.data.users || [])
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to load users"
      setLoadError(errMsg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (mounted && !authLoading && user && ["admin", "owner"].includes(user.role)) {
      Promise.resolve().then(() => fetchUsers())
    }
  }, [fetchUsers, mounted, authLoading, user])

  // Auth guard
  if (authLoading || !mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-[11px] font-mono text-muted-foreground animate-pulse">Loading users...</span>
      </div>
    )
  }

  if (!user || !["admin", "owner"].includes(user.role)) return null

  const filteredUsers = users.filter((u) => {
    const provider = u.discord_id ? "discord" : "email"
    const q = searchTerm.toLowerCase()
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.discord_id && u.discord_id.toLowerCase().includes(q)) ||
      provider.includes(q)
    )
  })

  const openSuspendDialog = (target: AppUser) => {
    setSuspendTarget(target)
    setDialogError(null)
  }

  const handleToggleSuspend = async () => {
    if (!suspendTarget) return
    setIsTogglingSuspend(true)
    setDialogError(null)
    const newState = !suspendTarget.suspended
    try {
      await api.patch(`/v1/admin/users/${suspendTarget.id}/suspend`, { suspended: newState })
      setUsers((prev) =>
        prev.map((u) => (u.id === suspendTarget.id ? { ...u, suspended: newState ? 1 : 0 } : u))
      )
      setSuspendTarget(null)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to update user status"
      setDialogError(errMsg)
    } finally {
      setIsTogglingSuspend(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-black tracking-tight text-foreground uppercase">
            User Management (Admin View)
          </h1>
          <p className="text-[11px] text-muted-foreground">
            {users.length} registered user{users.length !== 1 ? "s" : ""} in the system
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/45" />
          <input
            type="text"
            placeholder="Search users by name, email, role, username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:border-primary/50"
          />
        </div>
        <button
          onClick={fetchUsers}
          disabled={isLoading}
          className="px-5 py-2.5 bg-primary text-primary-foreground text-[11px] font-mono rounded-lg hover:opacity-90 active:scale-98 transition-all font-bold cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Loader2 className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-[11px] font-mono text-muted-foreground">Loading users...</span>
        </div>
      )}

      {/* Error */}
      {loadError && !isLoading && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-8 text-center">
          <p className="text-[11px] font-mono text-red-600 dark:text-red-500 mb-4">{loadError}</p>
          <button
            onClick={fetchUsers}
            className="px-4 py-2 bg-primary text-primary-foreground text-[11px] font-mono rounded-lg hover:opacity-90 transition-all font-bold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Users Table */}
      {!isLoading && !loadError && (
        <div className="rounded-xl border border-border bg-card overflow-x-auto shadow-xs w-full">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-muted/10 border-b border-border">
              <tr>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">User</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Email</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Role</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Provider</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Balance</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Status</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Verified</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Joined</th>
                <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredUsers.map((u) => {
                const roleOpt = ROLE_OPTIONS.find((r) => r.value === u.role)
                return (
                  <tr key={u.id} className="hover:bg-muted/5 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold bg-muted border border-border shrink-0">
                          {u.avatar ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={u.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            u.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-foreground">
                            {u.name}
                            {u.username && (
                              <span className="text-[10px] font-mono text-muted-foreground ml-1.5">@{u.username}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[10px] font-mono ${
                        roleOpt?.className || "text-muted-foreground"
                      } ${roleOpt ? "bg-muted/20 border-border/40" : ""}`}>
                        {roleOpt && <roleOpt.icon className="w-3 h-3" />}
                        {roleOpt?.label || u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {u.discord_id ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[9px] font-mono bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 group relative cursor-help">
                          <MessageCircle className="w-3 h-3" />
                          Discord
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded-md bg-popover text-popover-foreground text-[9px] font-mono shadow-md border border-border whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            ID: {u.discord_id}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[9px] font-mono bg-muted/30 text-muted-foreground border-border/40">
                          <Mail className="w-3 h-3" />
                          Email
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs font-semibold text-foreground">
                        ${Number(u.balance || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {u.suspended ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] font-mono bg-red-500/5 text-red-600 dark:text-red-500 border-red-500/20">
                          <Ban className="w-3 h-3" />
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] font-mono bg-emerald-500/5 text-emerald-600 dark:text-emerald-500 border-emerald-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {u.verified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] bg-emerald-500/5 text-emerald-600 dark:text-emerald-500 border-emerald-500/20 font-mono">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[9px] bg-amber-500/5 text-amber-600 dark:text-amber-500 border-amber-500/20 font-mono">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Unverified
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground">{formatDate(u.created_at)}</td>
                    <td className="px-5 py-3.5 text-xs text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {u.id !== user.id && u.role !== "owner" && u.role !== "admin" && (
                          <button
                            title={u.suspended ? "Unsuspend User" : "Suspend User"}
                            onClick={() => openSuspendDialog(u)}
                            className={`p-1.5 rounded-md transition-all cursor-pointer ${
                              u.suspended
                                ? "text-emerald-500 hover:bg-emerald-500/10"
                                : "text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
                            }`}
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-xs font-mono text-muted-foreground">
                    {searchTerm ? `No users found matching "${searchTerm}"` : "No users in the system yet"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Suspend / Unsuspend Dialog ─────────────────── */}
      <Modal
        open={suspendTarget !== null}
        onClose={() => { if (!isTogglingSuspend) setSuspendTarget(null) }}
        title={suspendTarget?.suspended ? "Unsuspend User" : "Suspend User"}
      >
        {suspendTarget && (
          <div className="space-y-4">
            <div className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border ${suspendTarget.suspended ? "bg-emerald-500/5 border-emerald-500/20" : "bg-amber-500/5 border-amber-500/20"}`}>
              <Ban className={`w-5 h-5 shrink-0 mt-0.5 ${suspendTarget.suspended ? "text-emerald-500" : "text-amber-500"}`} />
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">
                  {suspendTarget.suspended
                    ? "Restore access for this user?"
                    : "Suspend this user account?"}
                </p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {suspendTarget.suspended
                    ? `${suspendTarget.name} (${suspendTarget.email}) will regain access to the system.`
                    : `${suspendTarget.name} (${suspendTarget.email}) will lose all access until unsuspended.`}
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
                onClick={() => setSuspendTarget(null)}
                disabled={isTogglingSuspend}
                className="px-4 py-2 text-[11px] font-mono text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleSuspend}
                disabled={isTogglingSuspend}
                className={`px-4 py-2 text-[11px] font-mono rounded-lg hover:opacity-90 active:scale-98 transition-all font-bold cursor-pointer flex items-center gap-2 disabled:opacity-50 ${
                  suspendTarget.suspended
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-amber-600 text-white hover:bg-amber-700"
                }`}
              >
                {isTogglingSuspend ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Ban className="w-3.5 h-3.5" />
                )}
                {isTogglingSuspend
                  ? "Processing..."
                  : suspendTarget.suspended
                    ? "Unsuspend"
                    : "Suspend"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
