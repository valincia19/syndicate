'use client'

import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import { useLanguage } from '@/components/providers/language-provider'
import {
  Loader2, History, Ticket, CreditCard, Wallet, Banknote, QrCode, Store,
  CheckCircle2, XCircle, AlertCircle, ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import PricingSection from "@/components/landing/pricing-section"

interface Transaction {
  id: number
  user_id: string
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

export default function PlansPage() {
  const { t } = useLanguage()
  const tKey = (key: string) => t(key as Parameters<typeof t>[0])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.get<TransactionsResponse>('/v1/payment/history')
      if (res.success) {
        setTransactions(res.data.transactions || [])
      } else {
        setError('Failed to fetch transaction history')
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      setError(errMsg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching pattern
    fetchHistory()
  }, [fetchHistory])

  return (
    <div className="container mx-auto py-8 space-y-12">
      <PricingSection />

      {/* Transaction History Section */}
      <div className="space-y-3 w-full px-4 animate-in fade-in duration-300">
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <History className="w-4 h-4 text-primary animate-pulse" />
          <div>
            <h2 className="text-sm font-black tracking-tight text-foreground uppercase">{tKey("transactionHistoryTitle")}</h2>
            <p className="text-[10px] text-muted-foreground">{tKey("transactionHistorySub")}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="ml-2 text-[10px] font-mono text-muted-foreground">{tKey("loadingTransactions")}</span>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-center text-[10px] font-mono text-red-600 dark:text-red-500">
            {error}
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-lg border border-border/40 bg-muted/10 p-6 text-center text-[10px] font-mono text-muted-foreground">
            {tKey("noTransactionsSub")}
          </div>
        ) : (
          <>
            {/* Desktop Table view */}
            <div className="hidden md:block rounded-lg border border-border bg-card/50 overflow-x-auto shadow-xs w-full backdrop-blur-xs">
              <table className="w-full text-left border-collapse min-w-[800px] table-auto">
                <thead className="bg-muted/5 border-b border-border">
                  <tr>
                    <th className="px-2.5 py-1.5 text-[8.5px] font-mono text-muted-foreground/60 uppercase tracking-wider font-bold whitespace-nowrap">Date</th>
                    <th className="px-2.5 py-1.5 text-[8.5px] font-mono text-muted-foreground/60 uppercase tracking-wider font-bold whitespace-nowrap">Order ID</th>
                    <th className="px-2.5 py-1.5 text-[8.5px] font-mono text-muted-foreground/60 uppercase tracking-wider font-bold whitespace-nowrap">Plan</th>
                    <th className="px-2.5 py-1.5 text-[8.5px] font-mono text-muted-foreground/60 uppercase tracking-wider font-bold whitespace-nowrap">Method</th>
                    <th className="px-2.5 py-1.5 text-[8.5px] font-mono text-muted-foreground/60 uppercase tracking-wider font-bold whitespace-nowrap">Amount</th>
                    <th className="px-2.5 py-1.5 text-[8.5px] font-mono text-muted-foreground/60 uppercase tracking-wider font-bold whitespace-nowrap">Voucher</th>
                    <th className="px-2.5 py-1.5 text-[8.5px] font-mono text-muted-foreground/60 uppercase tracking-wider font-bold whitespace-nowrap">Status</th>
                    <th className="px-2.5 py-1.5 text-[8.5px] font-mono text-muted-foreground/60 uppercase tracking-wider font-bold text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {transactions.map((tx) => {
                    const isExpired = tx.status === 'pending' && tx.expired_at && new Date(tx.expired_at) < new Date()
                    const displayStatus = isExpired ? 'expired' : tx.status
                    const method = getMethodDetails(tx.payment_method, tx.bank_code)
                    const MIcon = method.icon
                    const status = getStatusDetails(displayStatus)
                    const SIcon = status.icon

                    return (
                      <tr key={tx.id} className="hover:bg-muted/5 transition-colors group">
                        <td className="px-2.5 py-1.5 text-[9px] font-mono text-muted-foreground whitespace-nowrap">{formatDate(tx.created_at)}</td>
                        <td className="px-2.5 py-1.5 text-[9px] font-mono text-foreground/90 font-medium tracking-tight whitespace-nowrap">{tx.ref_id}</td>
                        <td className="px-2.5 py-1.5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-1.5 py-0.2 rounded-xs border text-[7.5px] font-mono font-bold uppercase tracking-tight ${
                            tx.plan_type === 'pro' ? 'text-purple-500 bg-purple-500/5 border-purple-500/10' : 'text-amber-500 bg-amber-500/5 border-amber-500/10'
                          }`}>
                            {tx.plan_type}
                          </span>
                        </td>
                        <td className="px-2.5 py-1.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-xs border text-[7.5px] font-mono whitespace-nowrap ${method.color}`}>
                            <MIcon className="w-2.5 h-2.5 shrink-0" />
                            {method.label}
                          </span>
                        </td>
                        <td className="px-2.5 py-1.5 text-[9.5px] font-mono text-foreground font-bold whitespace-nowrap">{formatIDR(tx.amount)}</td>
                        <td className="px-2.5 py-1.5 text-[9px] font-mono whitespace-nowrap">
                          {tx.voucher_code ? (
                            <span className="inline-flex items-center gap-0.5 text-emerald-500 bg-emerald-500/5 border border-emerald-500/15 px-1.5 py-0.2 rounded-xs text-[7.5px] font-bold uppercase">
                              <Ticket className="w-2.5 h-2.5 shrink-0" />
                              {tx.voucher_code}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30">-</span>
                          )}
                        </td>
                        <td className="px-2.5 py-1.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-xs border text-[7.5px] font-mono ${status.className}`}>
                            <SIcon className="w-2.5 h-2.5 shrink-0" />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-2.5 py-1.5 text-right font-mono whitespace-nowrap">
                          {displayStatus === 'pending' ? (
                            <Link
                              href={`/portal/payment/${tx.payment_method}?orderId=${tx.ref_id}`}
                              className="inline-flex items-center gap-0.5 text-[7.5px] bg-primary text-primary-foreground px-1.5 py-0.2 rounded-xs hover:opacity-90 active:scale-98 transition-all font-bold cursor-pointer"
                            >
                              Pay Now
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </Link>
                          ) : (
                            <span className="text-muted-foreground/30 text-[9.5px]">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card list view */}
            <div className="md:hidden space-y-2 w-full">
              {transactions.map((tx) => {
                const isExpired = tx.status === 'pending' && tx.expired_at && new Date(tx.expired_at) < new Date()
                const displayStatus = isExpired ? 'expired' : tx.status
                const method = getMethodDetails(tx.payment_method, tx.bank_code)
                const MIcon = method.icon
                const status = getStatusDetails(displayStatus)
                const SIcon = status.icon

                return (
                  <div key={tx.id} className="rounded-lg border border-border bg-card/45 p-2.5 space-y-2 select-none">
                    {/* Top: Date & Status */}
                    <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground whitespace-nowrap">
                      <span>{formatDate(tx.created_at)}</span>
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-xs border text-[7.5px] font-mono ${status.className}`}>
                        <SIcon className="w-2.5 h-2.5 shrink-0" />
                        {status.label}
                      </span>
                    </div>

                    {/* Middle: Order ID & Plan Type */}
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[9px] font-mono text-foreground/90 font-medium tracking-tight truncate max-w-[200px]" title={tx.ref_id}>
                        {tx.ref_id}
                      </span>
                      <span className={`inline-flex items-center px-1.5 py-0.2 rounded-xs border text-[7.5px] font-mono font-bold uppercase tracking-tight whitespace-nowrap shrink-0 ${
                        tx.plan_type === 'pro' ? 'text-purple-500 bg-purple-500/5 border-purple-500/10' : 'text-amber-500 bg-amber-500/5 border-amber-500/10'
                      }`}>
                        {tx.plan_type}
                      </span>
                    </div>

                    {/* Bottom: Method & Voucher, Price & Pay Button */}
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

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono text-foreground font-bold whitespace-nowrap">
                          {formatIDR(tx.amount)}
                        </span>
                        {displayStatus === 'pending' && (
                          <Link
                            href={`/portal/payment/${tx.payment_method}?orderId=${tx.ref_id}`}
                            className="inline-flex items-center gap-0.5 text-[7.5px] bg-primary text-primary-foreground px-1.5 py-0.2 rounded-xs hover:opacity-90 active:scale-98 transition-all font-bold cursor-pointer"
                          >
                            Pay Now
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
