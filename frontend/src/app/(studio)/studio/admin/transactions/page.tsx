'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import {
  Loader2, History, Ticket, CreditCard, Wallet, Banknote, QrCode, Store,
  CheckCircle2, XCircle, AlertCircle, Search, Filter, RefreshCw, ChevronDown,
  ChevronLeft, ChevronRight
} from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { useRouter } from 'next/navigation'

interface Transaction {
  id: number
  user_id: string
  user_email?: string
  user_name?: string
  license_id: string | null
  ref_id: string
  trx_id: string | null
  payment_method: string
  plan_type: string
  amount: number
  total_bayar: number | null
  total_diterima: number | null
  status: 'pending' | 'paid' | 'failed' | 'expired'
  pay_url: string | null
  va_number: string | null
  bank_code: string | null
  voucher_code: string | null
  expired_at: string | null
  paid_at: string | null
  created_at: string
}

interface TransactionsResponse {
  success: boolean
  data: {
    transactions: Transaction[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}


function formatIDR(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = (n: number) => n.toString().padStart(2, '0')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[d.getMonth()]
  const datePart = `${month} ${d.getDate()}, ${d.getFullYear()}`
  const hours = d.getHours()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const formattedHours = hours % 12 || 12
  const timePart = `${pad(formattedHours)}:${pad(d.getMinutes())} ${ampm}`
  return `${datePart} • ${timePart}`
}

function getMethodDetails(method: string, bankCode: string | null) {
  switch (method) {
    case 'qris':
      return { label: 'QRIS', icon: QrCode, color: 'text-amber-500 bg-amber-500/5 border-amber-500/10' }
    case 'bank':
      return { label: bankCode ? `${bankCode.replace('VA', '')} VA` : 'VA', icon: Banknote, color: 'text-blue-500 bg-blue-500/5 border-blue-500/10' }
    case 'emoney':
      return { label: bankCode || 'E-Money', icon: Wallet, color: 'text-emerald-500 bg-emerald-500/5 border-emerald-500/10' }
    case 'retail':
      return { label: bankCode || 'Retail', icon: Store, color: 'text-purple-500 bg-purple-500/5 border-purple-500/10' }
    default:
      return { label: method.toUpperCase(), icon: CreditCard, color: 'text-muted-foreground bg-muted/5 border-border/10' }
  }
}

function getStatusDetails(status: string) {
  switch (status) {
    case 'paid':
      return { label: 'Paid', icon: CheckCircle2, className: 'text-emerald-500 bg-emerald-500/5 border-emerald-500/10' }
    case 'pending':
      return { label: 'Pending', icon: AlertCircle, className: 'text-amber-500 bg-amber-500/5 border-amber-500/10' }
    case 'failed':
      return { label: 'Failed', icon: XCircle, className: 'text-red-500 bg-red-500/5 border-red-500/10' }
    case 'expired':
      return { label: 'Expired', icon: XCircle, className: 'text-muted-foreground bg-muted/5 border-border/10' }
    default:
      return { label: status.toUpperCase(), icon: AlertCircle, className: 'text-muted-foreground bg-muted/5 border-border/10' }
  }
}
const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'expired', label: 'Expired' },
  { value: 'failed', label: 'Failed' },
]

const METHOD_OPTIONS = [
  { value: 'all', label: 'All Methods' },
  { value: 'qris', label: 'QRIS' },
  { value: 'bank', label: 'Bank / VA' },
  { value: 'emoney', label: 'E-Money' },
  { value: 'retail', label: 'Retail Store' },
]

const PLAN_OPTIONS = [
  { value: 'all', label: 'All Plans' },
  { value: 'premium', label: 'Premium' },
  { value: 'pro', label: 'Pro' },
]

export default function AdminTransactionsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  // Dropdown open states
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [isMethodOpen, setIsMethodOpen] = useState(false)
  const [isPlanOpen, setIsPlanOpen] = useState(false)

  // Refs for closing on outside click
  const statusRef = useRef<HTMLDivElement>(null)
  const methodRef = useRef<HTMLDivElement>(null)
  const planRef = useRef<HTMLDivElement>(null)

  // Effect to close dropdowns when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setIsStatusOpen(false)
      }
      if (methodRef.current && !methodRef.current.contains(e.target as Node)) {
        setIsMethodOpen(false)
      }
      if (planRef.current && !planRef.current.contains(e.target as Node)) {
        setIsPlanOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')

  // Pagination State
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  // Debounce search query to prevent database overload
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value)
    setPage(1)
  }, [])

  const handleMethodChange = useCallback((value: string) => {
    setMethodFilter(value)
    setPage(1)
  }, [])

  const handlePlanChange = useCallback((value: string) => {
    setPlanFilter(value)
    setPage(1)
  }, [])

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
  }, [])

  const fetchHistory = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        search: debouncedSearch,
        status: statusFilter,
        method: methodFilter,
        plan: planFilter,
      })
      const res = await api.get<TransactionsResponse>(`/v1/payment/admin/all?${params.toString()}`)
      if (res.success) {
        setTransactions(res.data.transactions || [])
        setPagination(res.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 })
      } else {
        setError('Failed to fetch transaction history')
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setError(errMsg)
    } finally {
      setIsLoading(false)
    }
  }, [page, debouncedSearch, statusFilter, methodFilter, planFilter])

  useEffect(() => {
    if (!authLoading) {
      if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
        router.push('/studio')
        return
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching pattern
      fetchHistory()
    }
  }, [authLoading, user, router, fetchHistory])

  // Alias transactions as filteredTransactions to keep downstream rendering intact
  const filteredTransactions = transactions

  if (authLoading || (!user || (user.role !== 'owner' && user.role !== 'admin'))) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 w-full animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-black tracking-tight text-foreground uppercase flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Transactions Log
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Complete list of all client purchases and subscription orders
          </p>
        </div>
        
        <button 
          onClick={fetchHistory}
          disabled={isLoading}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium hover:bg-muted/40 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="relative z-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 p-3 rounded-xl border border-border bg-card/30 backdrop-blur-xs">
        {/* Search Input */}
        <div className="relative lg:col-span-2">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search by Order ID, User, Voucher..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8 w-full bg-background border border-border rounded-lg py-1.5 px-3 text-xs text-foreground placeholder-muted-foreground/75 hover:border-border/80 transition-colors focus:outline-hidden focus:ring-1 focus:ring-primary/45 font-medium"
          />
        </div>

        {/* Status Filter */}
        <div className="relative w-full" ref={statusRef}>
          <button
            type="button"
            onClick={() => setIsStatusOpen(!isStatusOpen)}
            className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted/20 hover:border-border/80 transition-all cursor-pointer"
          >
            <span className="flex items-center gap-1.5 truncate">
              <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {STATUS_OPTIONS.find(opt => opt.value === statusFilter)?.label}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/60 transition-transform duration-200 shrink-0 ${isStatusOpen ? 'rotate-180' : ''}`} />
          </button>
          {isStatusOpen && (
            <div className="absolute left-0 z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    handleStatusChange(opt.value)
                    setIsStatusOpen(false)
                  }}
                  className={`w-full flex items-center px-3 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                    statusFilter === opt.value
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-foreground hover:bg-muted/60'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Method Filter */}
        <div className="relative w-full" ref={methodRef}>
          <button
            type="button"
            onClick={() => setIsMethodOpen(!isMethodOpen)}
            className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted/20 hover:border-border/80 transition-all cursor-pointer"
          >
            <span className="truncate">
              {METHOD_OPTIONS.find(opt => opt.value === methodFilter)?.label}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/60 transition-transform duration-200 shrink-0 ${isMethodOpen ? 'rotate-180' : ''}`} />
          </button>
          {isMethodOpen && (
            <div className="absolute left-0 z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              {METHOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    handleMethodChange(opt.value)
                    setIsMethodOpen(false)
                  }}
                  className={`w-full flex items-center px-3 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                    methodFilter === opt.value
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-foreground hover:bg-muted/60'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Plan Filter */}
        <div className="relative w-full" ref={planRef}>
          <button
            type="button"
            onClick={() => setIsPlanOpen(!isPlanOpen)}
            className="w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted/20 hover:border-border/80 transition-all cursor-pointer"
          >
            <span className="truncate">
              {PLAN_OPTIONS.find(opt => opt.value === planFilter)?.label}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/60 transition-transform duration-200 shrink-0 ${isPlanOpen ? 'rotate-180' : ''}`} />
          </button>
          {isPlanOpen && (
            <div className="absolute left-0 z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              {PLAN_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    handlePlanChange(opt.value)
                    setIsPlanOpen(false)
                  }}
                  className={`w-full flex items-center px-3 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                    planFilter === opt.value
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-foreground hover:bg-muted/60'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-xs font-mono text-muted-foreground">Loading transaction list...</span>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center text-xs font-mono text-red-600 dark:text-red-500">
          {error}
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="rounded-xl border border-border/40 bg-muted/10 p-12 text-center text-xs font-mono text-muted-foreground">
          No transactions found matching the selected criteria.
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-xl border border-border bg-card/45 overflow-x-auto shadow-xs w-full backdrop-blur-xs">
            <table className="w-full text-left border-collapse min-w-[950px] table-auto">
              <thead className="bg-muted/5 border-b border-border">
                <tr>
                  <th className="px-3.5 py-2 text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider font-bold whitespace-nowrap">Date</th>
                  <th className="px-3.5 py-2 text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider font-bold whitespace-nowrap">Order ID</th>
                  <th className="px-3.5 py-2 text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider font-bold whitespace-nowrap">User</th>
                  <th className="px-3.5 py-2 text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider font-bold whitespace-nowrap">Plan</th>
                  <th className="px-3.5 py-2 text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider font-bold whitespace-nowrap">Method</th>
                  <th className="px-3.5 py-2 text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider font-bold whitespace-nowrap">Amount</th>
                  <th className="px-3.5 py-2 text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider font-bold whitespace-nowrap">Voucher</th>
                  <th className="px-3.5 py-2 text-[9px] font-mono text-muted-foreground/60 uppercase tracking-wider font-bold text-right whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredTransactions.map((tx) => {
                  const isExpired = tx.status === 'pending' && tx.expired_at && new Date(tx.expired_at) < new Date()
                  const displayStatus = isExpired ? 'expired' : tx.status
                  const method = getMethodDetails(tx.payment_method, tx.bank_code)
                  const MIcon = method.icon
                  const status = getStatusDetails(displayStatus)
                  const SIcon = status.icon

                  return (
                    <tr key={tx.id} className="hover:bg-muted/5 transition-colors group">
                      <td className="px-3.5 py-2.5 text-[10px] font-mono text-muted-foreground whitespace-nowrap">{formatDate(tx.created_at)}</td>
                      <td className="px-3.5 py-2.5 text-[10px] font-mono text-foreground/90 font-medium tracking-tight whitespace-nowrap">{tx.ref_id}</td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-foreground font-medium">{tx.user_name || 'No Name'}</span>
                          <span className="text-[9px] text-muted-foreground/80 font-mono">{tx.user_email || '-'}</span>
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-1.5 py-0.2 rounded-xs border text-[7.5px] font-mono font-bold uppercase tracking-tight ${
                          tx.plan_type === 'pro' ? 'text-purple-500 bg-purple-500/5 border-purple-500/10' : 'text-amber-500 bg-amber-500/5 border-amber-500/10'
                        }`}>
                          {tx.plan_type}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-xs border text-[7.5px] font-mono whitespace-nowrap ${method.color}`}>
                          <MIcon className="w-2.5 h-2.5 shrink-0" />
                          {method.label}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-[10px] font-mono text-foreground font-bold whitespace-nowrap">{formatIDR(tx.amount)}</td>
                      <td className="px-3.5 py-2.5 text-[9px] font-mono whitespace-nowrap">
                        {tx.voucher_code ? (
                          <span className="inline-flex items-center gap-0.5 text-emerald-500 bg-emerald-500/5 border border-emerald-500/15 px-1.5 py-0.2 rounded-xs text-[7.5px] font-bold uppercase">
                            <Ticket className="w-2.5 h-2.5 shrink-0" />
                            {tx.voucher_code}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30">-</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-xs border text-[7.5px] font-mono ${status.className}`}>
                          <SIcon className="w-2.5 h-2.5 shrink-0" />
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card list view */}
          <div className="md:hidden space-y-2 w-full">
            {filteredTransactions.map((tx) => {
              const isExpired = tx.status === 'pending' && tx.expired_at && new Date(tx.expired_at) < new Date()
              const displayStatus = isExpired ? 'expired' : tx.status
              const method = getMethodDetails(tx.payment_method, tx.bank_code)
              const MIcon = method.icon
              const status = getStatusDetails(displayStatus)
              const SIcon = status.icon

              return (
                <div key={tx.id} className="rounded-lg border border-border bg-card/45 p-3 space-y-2.5">
                  {/* Top: Date & Status */}
                  <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground whitespace-nowrap">
                    <span>{formatDate(tx.created_at)}</span>
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-xs border text-[7.5px] font-mono ${status.className}`}>
                      <SIcon className="w-2.5 h-2.5 shrink-0" />
                      {status.label}
                    </span>
                  </div>

                  {/* User Details */}
                  <div className="border-t border-border/10 pt-1.5">
                    <div className="text-[10px] text-foreground font-medium">{tx.user_name || 'No Name'}</div>
                    <div className="text-[9px] text-muted-foreground/80 font-mono">{tx.user_email || '-'}</div>
                  </div>

                  {/* Middle: Order ID & Plan Type */}
                  <div className="flex items-center justify-between gap-4 border-t border-border/10 pt-1.5">
                    <span className="text-[9px] font-mono text-foreground/90 font-medium tracking-tight truncate max-w-[200px]" title={tx.ref_id}>
                      {tx.ref_id}
                    </span>
                    <span className={`inline-flex items-center px-1.5 py-0.2 rounded-xs border text-[7.5px] font-mono font-bold uppercase tracking-tight whitespace-nowrap shrink-0 ${
                      tx.plan_type === 'pro' ? 'text-purple-500 bg-purple-500/5 border-purple-500/10' : 'text-amber-500 bg-amber-500/5 border-amber-500/10'
                    }`}>
                      {tx.plan_type}
                    </span>
                  </div>

                  {/* Bottom: Method & Voucher, Price */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-border/20 gap-2">
                    <div className="flex items-center gap-1">
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-xs border text-[7.5px] font-mono whitespace-nowrap ${method.color}`}>
                        <MIcon className="w-2.5 h-2.5 shrink-0" />
                        {method.label}
                      </span>
                      {tx.voucher_code && (
                        <span className="inline-flex items-center gap-0.5 text-emerald-500 bg-emerald-500/5 border border-emerald-500/15 px-1.5 py-0.2 rounded-xs text-[7.5px] font-bold uppercase whitespace-nowrap">
                          <Ticket className="w-2.5 h-2.5 shrink-0" />
                          {tx.voucher_code}
                        </span>
                      )}
                    </div>

                    <div className="shrink-0">
                      <span className="text-[10px] font-mono text-foreground font-bold whitespace-nowrap">
                        {formatIDR(tx.amount)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination Controls */}
          {pagination.total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/20 pt-4 px-1 mt-4">
              <div className="text-[11px] font-mono text-muted-foreground">
                Showing <span className="font-bold text-foreground">{(page - 1) * pagination.limit + 1}</span> - <span className="font-bold text-foreground">{Math.min(page * pagination.limit, pagination.total)}</span> of <span className="font-bold text-foreground">{pagination.total}</span> records
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="h-8 px-3 rounded-lg border border-border bg-card/60 flex items-center justify-center text-xs font-mono font-bold text-foreground whitespace-nowrap">
                  Page {page} / {pagination.totalPages || 1}
                </div>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages || isLoading}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
