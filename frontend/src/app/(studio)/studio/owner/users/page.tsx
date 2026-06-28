'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { ClientDate } from '@/components/ui/client-date'
import {
  Search, Trash2, Edit, CheckCircle, AlertCircle,
  Loader2, Shield, ShieldCheck, Wrench, Crown,
  User as UserIcon, ChevronDown, X,
  Mail, MessageCircle, Ban, ChevronLeft, ChevronRight,
  Filter, Check
} from 'lucide-react'
import { getAvatarUrl } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────

interface AppUser {
  id: string
  name: string
  username: string | null
  email: string
  role: 'user' | 'staff' | 'admin' | 'developer' | 'owner'
  verified: number
  balance: number
  suspended: number
  created_at: string
  updated_at: string
  avatar: string | null
  discord_id: string | null
  keys_count?: number
  used_hwids?: number
  unused_hwids?: number
}

interface UsersResponse {
  status: string
  data: {
    users: AppUser[]
    pagination?: {
      total: number
      page: number
      limit: number
      totalPages: number
    }
  }
}

const ROLE_OPTIONS = [
  { value: 'user', label: 'User', icon: UserIcon, className: 'text-muted-foreground' },
  { value: 'staff', label: 'Staff', icon: Shield, className: 'text-blue-500' },
  { value: 'admin', label: 'Admin', icon: ShieldCheck, className: 'text-purple-500' },
  { value: 'developer', label: 'Developer', icon: Wrench, className: 'text-emerald-500' },
  { value: 'owner', label: 'Owner', icon: Crown, className: 'text-amber-500' },
]

const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'staff', label: 'Staff' },
  { value: 'developer', label: 'Developer' },
  { value: 'user', label: 'User' },
]

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: '0', label: 'Active Only' },
  { value: '1', label: 'Suspended Only' },
]

const VERIFIED_FILTER_OPTIONS = [
  { value: '', label: 'All Verification' },
  { value: '1', label: 'Verified Only' },
  { value: '0', label: 'Unverified Only' },
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
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
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

export default function OwnerUsersPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [users, setUsers] = useState<AppUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  
  const [filterRole, setFilterRole] = useState('')
  const [filterSuspended, setFilterSuspended] = useState('')
  const [filterVerified, setFilterVerified] = useState('')

  const [isRoleFilterOpen, setIsRoleFilterOpen] = useState(false)
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false)
  const [isVerifiedFilterOpen, setIsVerifiedFilterOpen] = useState(false)

  const roleFilterRef = useRef<HTMLDivElement>(null)
  const statusFilterRef = useRef<HTMLDivElement>(null)
  const verifiedFilterRef = useRef<HTMLDivElement>(null)

  // Pagination states
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Edit user dialog
  const [editTarget, setEditTarget] = useState<AppUser | null>(null)
  const [editName, setEditName] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState<string>('')
  const [editBalance, setEditBalance] = useState('')
  const [isSavingUser, setIsSavingUser] = useState(false)
  const [isRoleOpen, setIsRoleOpen] = useState(false)
  const roleDropdownRef = useRef<HTMLDivElement>(null)

  // Suspend/unsuspend
  const [suspendTarget, setSuspendTarget] = useState<AppUser | null>(null)
  const [isTogglingSuspend, setIsTogglingSuspend] = useState(false)

  // Delete confirmation dialog
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Dialog error
  const [dialogError, setDialogError] = useState<string | null>(null)

  useEffect(() => { Promise.resolve().then(() => setMounted(true)) }, [])

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1) // Reset to page 1 on search
    }, 400)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(target)) {
        setIsRoleOpen(false)
      }
      if (roleFilterRef.current && !roleFilterRef.current.contains(target)) {
        setIsRoleFilterOpen(false)
      }
      if (statusFilterRef.current && !statusFilterRef.current.contains(target)) {
        setIsStatusFilterOpen(false)
      }
      if (verifiedFilterRef.current && !verifiedFilterRef.current.contains(target)) {
        setIsVerifiedFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Reset page when filters change (handled by filter change callbacks)

  const handleFilterRoleChange = useCallback((value: string) => {
    setFilterRole(value)
    setPage(1)
  }, [])

  const handleFilterSuspendedChange = useCallback((value: string) => {
    setFilterSuspended(value)
    setPage(1)
  }, [])

  const handleFilterVerifiedChange = useCallback((value: string) => {
    setFilterVerified(value)
    setPage(1)
  }, [])

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      })
      if (debouncedSearch.trim()) {
        params.set('search', debouncedSearch.trim())
      }
      if (filterRole) {
        params.set('role', filterRole)
      }
      if (filterSuspended) {
        params.set('suspended', filterSuspended)
      }
      if (filterVerified) {
        params.set('verified', filterVerified)
      }
      const res = await api.get<UsersResponse>(`/v1/admin/users?${params.toString()}`)
      setUsers(res.data.users || [])
      if (res.data.pagination) {
        setTotalUsers(res.data.pagination.total || 0)
        setTotalPages(res.data.pagination.totalPages || 1)
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to load users'
      setLoadError(errMsg)
    } finally {
      setIsLoading(false)
    }
  }, [page, limit, debouncedSearch, filterRole, filterSuspended, filterVerified])

  useEffect(() => {
    if (mounted && !authLoading && user?.role === 'owner') {
      Promise.resolve().then(() => fetchUsers())
    }
  }, [fetchUsers, mounted, authLoading, user?.role])

  // Auth guard
  if (authLoading || !mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-[11px] font-mono text-muted-foreground animate-pulse">Loading users...</span>
      </div>
    )
  }

  if (!user || user.role !== 'owner') return null

  // ─── Dialog handlers ─────────────────────────────────

  const openEditDialog = (target: AppUser) => {
    setEditTarget(target)
    setEditName(target.name)
    setEditUsername(target.username || '')
    setEditEmail(target.email)
    setEditRole(target.role)
    setEditBalance(String(target.balance || 0))
    setDialogError(null)
  }

  const handleUserUpdate = async () => {
    if (!editTarget) return
    setIsSavingUser(true)
    setDialogError(null)
    const payload: Record<string, unknown> = {}
    if (editName !== editTarget.name) payload.name = editName
    if (editUsername !== (editTarget.username || '')) payload.username = editUsername || null
    if (editEmail !== editTarget.email) payload.email = editEmail
    if (editRole !== editTarget.role) payload.role = editRole
    const balanceNum = parseFloat(editBalance)
    if (!isNaN(balanceNum) && balanceNum !== editTarget.balance) payload.balance = balanceNum
    if (Object.keys(payload).length === 0) { setEditTarget(null); return }

    try {
      const res = await api.patch<{ data: { user: Partial<AppUser> } }>(`/v1/admin/users/${editTarget.id}`, payload)
      const updated = res.data.user
      setUsers((prev) =>
        prev.map((u) => (u.id === editTarget.id ? { ...u, ...updated } : u))
      )
      setEditTarget(null)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to update user'
      setDialogError(errMsg)
    } finally {
      setIsSavingUser(false)
    }
  }

  const openDeleteDialog = (target: AppUser) => {
    setDeleteTarget(target)
    setDialogError(null)
  }

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
      const errMsg = err instanceof Error ? err.message : 'Failed to update user status'
      setDialogError(errMsg)
    } finally {
      setIsTogglingSuspend(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    setDialogError(null)
    try {
      await api.delete(`/v1/admin/users/${deleteTarget.id}`)
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to delete user'
      setDialogError(errMsg)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-black tracking-tight text-foreground uppercase">
            User Management
          </h1>
          <p className="text-[11px] text-muted-foreground">
            {totalUsers} registered user{totalUsers !== 1 ? 's' : ''} in the system
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
        
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Role Filter */}
          <div className="relative" ref={roleFilterRef}>
            <button
              type="button"
              onClick={() => setIsRoleFilterOpen(!isRoleFilterOpen)}
              className="flex items-center justify-between gap-1.5 px-3 py-2 text-xs font-mono rounded-md border border-border bg-muted/30 hover:bg-muted/50 text-foreground transition-all cursor-pointer min-w-[130px]"
            >
              <span className="flex items-center gap-1.5 truncate">
                <Filter className="h-3 w-3 text-muted-foreground shrink-0" />
                {ROLE_FILTER_OPTIONS.find(opt => opt.value === filterRole)?.label || 'All Roles'}
              </span>
              <ChevronDown className={`w-3 h-3 text-muted-foreground/60 transition-transform duration-200 shrink-0 ${isRoleFilterOpen ? 'rotate-180' : ''}`} />
            </button>
            {isRoleFilterOpen && (
              <div className="absolute left-0 z-50 mt-1 w-full rounded-md border border-border bg-card shadow-lg py-1 max-h-56 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150 font-mono">
                {ROLE_FILTER_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      handleFilterRoleChange(opt.value)
                      setIsRoleFilterOpen(false)
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-[11px] text-left transition-colors cursor-pointer ${
                      filterRole === opt.value
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'text-foreground hover:bg-muted/60'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {filterRole === opt.value && <Check className="w-3 h-3 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status Filter */}
          <div className="relative" ref={statusFilterRef}>
            <button
              type="button"
              onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
              className="flex items-center justify-between gap-1.5 px-3 py-2 text-xs font-mono rounded-md border border-border bg-muted/30 hover:bg-muted/50 text-foreground transition-all cursor-pointer min-w-[130px]"
            >
              <span className="flex items-center gap-1.5 truncate">
                <Filter className="h-3 w-3 text-muted-foreground shrink-0" />
                {STATUS_FILTER_OPTIONS.find(opt => opt.value === filterSuspended)?.label || 'All Status'}
              </span>
              <ChevronDown className={`w-3 h-3 text-muted-foreground/60 transition-transform duration-200 shrink-0 ${isStatusFilterOpen ? 'rotate-180' : ''}`} />
            </button>
            {isStatusFilterOpen && (
              <div className="absolute left-0 z-50 mt-1 w-full rounded-md border border-border bg-card shadow-lg py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 font-mono">
                {STATUS_FILTER_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      handleFilterSuspendedChange(opt.value)
                      setIsStatusFilterOpen(false)
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-[11px] text-left transition-colors cursor-pointer ${
                      filterSuspended === opt.value
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'text-foreground hover:bg-muted/60'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {filterSuspended === opt.value && <Check className="w-3 h-3 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Verified Filter */}
          <div className="relative" ref={verifiedFilterRef}>
            <button
              type="button"
              onClick={() => setIsVerifiedFilterOpen(!isVerifiedFilterOpen)}
              className="flex items-center justify-between gap-1.5 px-3 py-2 text-xs font-mono rounded-md border border-border bg-muted/30 hover:bg-muted/50 text-foreground transition-all cursor-pointer min-w-[150px]"
            >
              <span className="flex items-center gap-1.5 truncate">
                <Filter className="h-3 w-3 text-muted-foreground shrink-0" />
                {VERIFIED_FILTER_OPTIONS.find(opt => opt.value === filterVerified)?.label || 'All Verification'}
              </span>
              <ChevronDown className={`w-3 h-3 text-muted-foreground/60 transition-transform duration-200 shrink-0 ${isVerifiedFilterOpen ? 'rotate-180' : ''}`} />
            </button>
            {isVerifiedFilterOpen && (
              <div className="absolute left-0 z-50 mt-1 w-full rounded-md border border-border bg-card shadow-lg py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 font-mono">
                {VERIFIED_FILTER_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      handleFilterVerifiedChange(opt.value)
                      setIsVerifiedFilterOpen(false)
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-[11px] text-left transition-colors cursor-pointer ${
                      filterVerified === opt.value
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'text-foreground hover:bg-muted/60'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {filterVerified === opt.value && <Check className="w-3 h-3 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={fetchUsers}
          disabled={isLoading}
          className="px-5 py-2.5 bg-primary text-primary-foreground text-[11px] font-mono rounded-lg hover:opacity-90 active:scale-98 transition-all font-bold cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Loader2 className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
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
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card overflow-x-auto shadow-xs w-full">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-muted/10 border-b border-border">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">User</th>
                  <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Role</th>
                  <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Balance</th>
                  <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Keys</th>
                  <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">HWID Slots</th>
                  <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Status</th>
                  <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold">Joined</th>
                  <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider select-none font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.map((u) => {
                  const roleOpt = ROLE_OPTIONS.find((r) => r.value === u.role)
                  return (
                    <tr key={u.id} className="hover:bg-muted/5 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold bg-muted border border-border shrink-0 select-none">
                            {getAvatarUrl(u.avatar, u.email) ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={getAvatarUrl(u.avatar, u.email) || ""} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              u.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                              <span>{u.name}</span>
                              {u.username && (
                                <span className="text-[10px] font-mono text-muted-foreground">@{u.username}</span>
                              )}
                              {u.verified ? (
                                <span title="Verified Account">
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/10 shrink-0 animate-in fade-in" />
                                </span>
                              ) : (
                                <span title="Unverified Account">
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 fill-amber-500/10 shrink-0 animate-in fade-in" />
                                </span>
                              )}
                            </div>
                            <div className="text-[10.5px] text-muted-foreground/80 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                              <span>{u.email}</span>
                              {u.discord_id && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-sm border text-[9px] font-mono bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 group relative cursor-help">
                                  <MessageCircle className="w-2.5 h-2.5" />
                                  Discord
                                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded-md bg-popover text-popover-foreground text-[9px] font-mono shadow-md border border-border whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                    ID: {u.discord_id}
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[10px] font-mono ${
                          roleOpt?.className || 'text-muted-foreground'
                        } ${roleOpt ? 'bg-muted/20 border-border/40' : ''}`}>
                          {roleOpt && <roleOpt.icon className="w-3 h-3" />}
                          {roleOpt?.label || u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          ${Number(u.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-semibold text-foreground bg-muted/30 border border-border/40 px-2 py-0.5 rounded">
                          {u.keys_count || 0} Key{u.keys_count !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-mono ${
                          u.used_hwids && u.used_hwids > 0
                            ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20'
                            : 'bg-muted/30 text-muted-foreground border-border/40'
                        }`}>
                          {u.used_hwids || 0} / {(u.used_hwids || 0) + (u.unused_hwids || 0)} used
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
                      <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground">{formatDate(u.created_at)}</td>
                      <td className="px-5 py-3.5 text-xs text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {u.id !== user.id && (
                            <>
                              <button
                                title={u.suspended ? 'Unsuspend User' : 'Suspend User'}
                                onClick={() => openSuspendDialog(u)}
                                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                                  u.suspended
                                    ? 'text-emerald-500 hover:bg-emerald-500/10'
                                    : 'text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10'
                                }`}
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                              <button
                                title="Change Role"
                                onClick={() => openEditDialog(u)}
                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                title="Delete User"
                                onClick={() => openDeleteDialog(u)}
                                className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-md transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-8 text-center text-xs font-mono text-muted-foreground">
                      {searchTerm ? `No users found matching "${searchTerm}"` : 'No users in the system yet'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-2 text-xs font-mono">
              <span className="text-muted-foreground">
                Page <span className="font-bold text-foreground">{page}</span> of{' '}
                <span className="font-bold text-foreground">{totalPages}</span> ({totalUsers} total)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Edit User Dialog ──────────────────────────── */}
      <Modal
        open={editTarget !== null}
        onClose={() => { if (!isSavingUser) setEditTarget(null) }}
        title="Edit User"
      >
        {editTarget && (
          <div className="space-y-4">
            {/* User info card */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/20 border border-border/50">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-muted border border-border shrink-0">
                {getAvatarUrl(editTarget.avatar, editTarget.email) ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={getAvatarUrl(editTarget.avatar, editTarget.email) || ""} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  editTarget.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground truncate">{editTarget.name}</div>
                <div className="text-[10px] font-mono text-muted-foreground truncate">{editTarget.email}</div>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[8px] font-mono ${editTarget.suspended ? 'bg-red-500/5 text-red-500 border-red-500/20' : 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20'}`}>
                <span className={`h-1 w-1 rounded-full ${editTarget.suspended ? 'bg-red-500' : 'bg-emerald-500'}`} />
                {editTarget.suspended ? 'Suspended' : 'Active'}
              </span>
            </div>

            {/* Editable fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 font-bold select-none">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground focus:outline-hidden focus:border-primary/50"
                />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 font-bold select-none">Username</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground focus:outline-hidden focus:border-primary/50"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 font-bold select-none">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground focus:outline-hidden focus:border-primary/50"
                />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 font-bold select-none">Role</label>
                <div className="relative" ref={roleDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsRoleOpen(!isRoleOpen)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground focus:outline-hidden focus:border-primary/50 cursor-pointer hover:border-primary/30 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      {(() => {
                        const opt = ROLE_OPTIONS.find((r) => r.value === editRole)
                        if (!opt) return null
                        const Icon = opt.icon
                        return <Icon className={`w-3.5 h-3.5 ${opt.className}`} />
                      })()}
                      {ROLE_OPTIONS.find((r) => r.value === editRole)?.label || editRole}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${isRoleOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isRoleOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                      {ROLE_OPTIONS.map((opt) => {
                        const Icon = opt.icon
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => { setEditRole(opt.value); setIsRoleOpen(false) }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-left transition-colors cursor-pointer ${
                              editRole === opt.value
                                ? 'bg-primary/10 text-primary font-bold'
                                : 'text-foreground hover:bg-muted/60'
                            }`}
                          >
                            <Icon className={`w-3.5 h-3.5 ${opt.className}`} />
                            <span>{opt.label}</span>
                            {editRole === opt.value && (
                              <CheckCircle className="w-3 h-3 ml-auto text-primary" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 font-bold select-none">Balance</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editBalance}
                  onChange={(e) => setEditBalance(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground focus:outline-hidden focus:border-primary/50"
                />
              </div>
            </div>

            {/* Read-only info */}
            <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
              <div className="px-2.5 py-1.5 rounded bg-muted/10 border border-border/30">
                <span className="text-muted-foreground block mb-0.5">Provider</span>
                <span className="text-foreground font-semibold flex items-center gap-1">
                  {editTarget.discord_id ? <MessageCircle className="w-3 h-3 text-indigo-500" /> : <Mail className="w-3 h-3" />}
                  {editTarget.discord_id ? 'Discord' : 'Email'}
                </span>
              </div>
              <div className="px-2.5 py-1.5 rounded bg-muted/10 border border-border/30">
                <span className="text-muted-foreground block mb-0.5">Verified</span>
                <span className={`font-semibold ${editTarget.verified ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {editTarget.verified ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="px-2.5 py-1.5 rounded bg-muted/10 border border-border/30">
                <span className="text-muted-foreground block mb-0.5">Joined</span>
                <span className="text-foreground font-semibold">{formatDate(editTarget.created_at)}</span>
              </div>
            </div>

            {dialogError && (
              <div className="px-3 py-2 rounded-md bg-red-500/5 border border-red-500/20 text-[11px] font-mono text-red-600 dark:text-red-500">
                {dialogError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
              <button
                onClick={() => setEditTarget(null)}
                disabled={isSavingUser}
                className="px-4 py-2 text-[11px] font-mono text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUserUpdate}
                disabled={isSavingUser}
                className="px-4 py-2 bg-primary text-primary-foreground text-[11px] font-mono rounded-lg hover:opacity-90 active:scale-98 transition-all font-bold cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isSavingUser ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5" />
                )}
                {isSavingUser ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Suspend / Unsuspend Dialog ─────────────────── */}
      <Modal
        open={suspendTarget !== null}
        onClose={() => { if (!isTogglingSuspend) setSuspendTarget(null) }}
        title={suspendTarget?.suspended ? 'Unsuspend User' : 'Suspend User'}
      >
        {suspendTarget && (
          <div className="space-y-4">
            <div className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border ${suspendTarget.suspended ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
              <Ban className={`w-5 h-5 shrink-0 mt-0.5 ${suspendTarget.suspended ? 'text-emerald-500' : 'text-amber-500'}`} />
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">
                  {suspendTarget.suspended
                    ? 'Restore access for this user?'
                    : 'Suspend this user account?'}
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
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-amber-600 text-white hover:bg-amber-700'
                }`}
              >
                {isTogglingSuspend ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Ban className="w-3.5 h-3.5" />
                )}
                {isTogglingSuspend
                  ? 'Processing...'
                  : suspendTarget.suspended
                    ? 'Unsuspend'
                    : 'Suspend'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Delete Confirmation Dialog ───────────────── */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => { if (!isDeleting) setDeleteTarget(null) }}
        title="Delete User"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-red-500/5 border border-red-500/20">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">
                  Are you sure you want to delete this user?
                </p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  This action cannot be undone. All data associated with{' '}
                  <span className="text-foreground font-bold">{deleteTarget.name}</span>
                  {' '}({deleteTarget.email}) will be permanently removed.
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
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-[11px] font-mono text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white text-[11px] font-mono rounded-lg hover:bg-red-700 active:scale-98 transition-all font-bold cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                {isDeleting ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
