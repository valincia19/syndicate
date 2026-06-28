'use client'

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/context/auth-context"
import { tokenManager } from "@/lib/api"
import {
  Plus, Trash2, Check, Loader2, Edit3, DollarSign,
  RefreshCw, TrendingUp, Save, AlertTriangle
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const BASE_API = process.env.NEXT_PUBLIC_API_URL || ""

function getFlagEmoji(code: string) {
  const flags: Record<string, string> = {
    IDR: '🇮🇩', USD: '🇺🇸', SGD: '🇸🇬', MYR: '🇲🇾', EUR: '🇪🇺',
    GBP: '🇬🇧', AUD: '🇦🇺', CAD: '🇨🇦', HKD: '🇭🇰', JPY: '🇯🇵',
    KRW: '🇰🇷', CNY: '🇨🇳', INR: '🇮🇳', PHP: '🇵🇭', THB: '🇹🇭',
    VND: '🇻🇳', SAR: '🇸🇦', AED: '🇦🇪', BRL: '🇧🇷', TRY: '🇹🇷',
    RUB: '🇷🇺', MXN: '🇲🇽'
  }
  return flags[code.toUpperCase()] || '🏳️'
}

// Master plan prices in USD (used for informational previews)
const PLAN_PRICES_USD = {
  premium: { price_usd: 2, original_usd: 5, label: 'Premium', duration: '30 Days' },
  pro:     { price_usd: 6, original_usd: 15, label: 'Pro', duration: '90 Days' },
}

interface Currency {
  id: number
  currency_code: string
  currency_name: string
  rate_to_idr: number
  rate_code: string
  is_active: boolean
  pendingUpdate?: boolean
  isEdited?: boolean
}

export default function OwnerCurrencyPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingAll, setSavingAll] = useState(false)
  const [fetchingLive, setFetchingLive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  
  const [editForm, setEditForm] = useState({
    currency_name: '',
    rate_to_idr: 0,
    rate_code: '',
    is_active: true
  })
  
  const [showAdd, setShowAdd] = useState(false)
  const [deleteConfirmCode, setDeleteConfirmCode] = useState<string | null>(null)
  const [addForm, setAddForm] = useState({
    currency_code: '',
    currency_name: '',
    rate_to_idr: 0,
    rate_code: '',
    is_active: true
  })

  const fetchCurrencies = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const t = tokenManager.getToken()
      if (!t) return setLoading(false)
      const res = await fetch(BASE_API + '/v1/currency/all', {
        headers: { Authorization: 'Bearer ' + t },
      })
      const data = await res.json()
      if (data.success) {
        const mapped = data.data.map((c: Currency) => ({
          ...c,
          pendingUpdate: false,
          isEdited: false
        }))
        setCurrencies(mapped)
      } else {
        setError(data.error || 'Failed to load currencies')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true)
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!authLoading && user?.role === 'owner') {
      const timer = setTimeout(() => {
        fetchCurrencies()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [authLoading, user?.role, fetchCurrencies])

  // Auto-clear success / error messages
  useEffect(() => {
    if (!successMsg) return
    const t = setTimeout(() => setSuccessMsg(null), 3500)
    return () => clearTimeout(t)
  }, [successMsg])

  // ─── Sync Live Rates relative to current USD Row Rate ─────────────────────
  const handleSyncLiveRates = async () => {
    const usdCurrency = currencies.find(c => c.rate_code === 'USD' || c.currency_code === 'USD')
    const usdRate = usdCurrency ? Number(usdCurrency.rate_to_idr) : 20000

    if (!usdRate || usdRate <= 0) {
      setError('Please ensure USD currency has a valid rate in the table first.')
      return
    }

    setFetchingLive(true)
    setError(null)
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD')
      if (!res.ok) throw new Error('Exchange rate API unavailable for USD base')
      const data = await res.json()

      if (data.result !== 'success') throw new Error(data['error-type'] || 'API error')

      setCurrencies(prev => prev.map(c => {
        if (c.currency_code === 'IDR' || c.currency_code === 'USD') {
          return c
        }

        const codeToFetch = c.rate_code || c.currency_code
        const liveRateOfRateCode = data.rates[codeToFetch]
        if (liveRateOfRateCode && liveRateOfRateCode > 0) {
          const newRate = Math.round((usdRate / liveRateOfRateCode) * 100) / 100
          if (newRate !== Number(c.rate_to_idr)) {
            return {
              ...c,
              rate_to_idr: newRate,
              pendingUpdate: true // Mark as pending
            }
          }
        }
        return c
      }))

      setSuccessMsg('Live rates calculated relative to USD rate. Review highlighted rows and click "Save All".')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to calculate rates from live API')
    } finally {
      setFetchingLive(false)
    }
  }

  // ─── Save all pending and edited rates at once ──────────────────────────────
  const handleSaveAll = async () => {
    const updates = currencies.filter(c => c.pendingUpdate || c.isEdited)
    if (updates.length === 0) return

    setSavingAll(true)
    setError(null)
    const token = tokenManager.getToken()

    try {
      const res = await fetch(BASE_API + '/v1/currency/bulk', {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          updates: updates.map(c => ({
            currency_code: c.currency_code,
            currency_name: c.currency_name,
            rate_to_idr: Number(c.rate_to_idr),
            rate_code: c.rate_code,
            is_active: c.is_active
          }))
        })
      })
      const data = await res.json()
      if (data.success) {
        setSuccessMsg(`✅ Saved ${updates.length} currencies successfully.`)
        await fetchCurrencies()
      } else {
        setError(data.error || 'Save all failed')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save all failed')
    } finally {
      setSavingAll(false)
    }
  }

  // ─── Save inline edits locally to state ─────────────────────────────────────
  const handleInlineSave = (code: string) => {
    setCurrencies(prev => prev.map(c => {
      if (c.currency_code === code) {
        return {
          ...c,
          rate_to_idr: Number(editForm.rate_to_idr),
          rate_code: editForm.rate_code.toUpperCase() || c.rate_code,
          currency_name: editForm.currency_name || c.currency_name,
          is_active: editForm.is_active,
          isEdited: true,
          pendingUpdate: false // Clear pending flag if edited manually
        }
      }
      return c
    }))
    setEditing(null)
  }

  // ─── Toggle active state locally ───────────────────────────────────────────
  const handleToggleActive = (c: Currency) => {
    setCurrencies(prev => prev.map(curr => {
      if (curr.currency_code === c.currency_code) {
        return {
          ...curr,
          is_active: !curr.is_active,
          isEdited: true
        }
      }
      return curr
    }))
  }

  // ─── Add new currency (immediate database POST + list refresh) ──────────────
  const handleAdd = async () => {
    setSaving(true)
    setError(null)
    try {
      const t = tokenManager.getToken()
      const res = await fetch(BASE_API + '/v1/currency', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...addForm,
          rate_to_idr: Number(addForm.rate_to_idr)
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccessMsg('Currency added')
        setShowAdd(false)
        setAddForm({ currency_code: '', currency_name: '', rate_to_idr: 0, rate_code: '', is_active: true })
        fetchCurrencies()
      } else setError(data.error || 'Failed to add')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally { setSaving(false) }
  }

  // ─── Delete currency ────────────────────────────────────────────────────────
  const handleDelete = async (code: string) => {
    if (code === 'IDR') return
    try {
      const t = tokenManager.getToken()
      await fetch(BASE_API + '/v1/currency/' + code, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + t },
      })
      setSuccessMsg(`${code} deleted`)
      fetchCurrencies()
    } catch { /* ignore */ }
  }

  const hasChanges = currencies.some(c => c.pendingUpdate || c.isEdited)
  const usdCurrency = currencies.find(c => c.rate_code === 'USD' || c.currency_code === 'USD')
  const activeUSDRate = usdCurrency ? Number(usdCurrency.rate_to_idr) : 20000

  if (authLoading || !mounted) return <div className="p-6 text-xs text-muted-foreground">Loading...</div>

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-black tracking-tight text-foreground uppercase flex items-center gap-2">
            <DollarSign className="w-4.5 h-4.5 text-primary" />
            Currency Settings
          </h1>
          <p className="text-[11px] text-muted-foreground font-mono">
            {currencies.filter(c => c.is_active).length} active · {currencies.length} total currencies
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap font-mono">
          <button 
            onClick={fetchCurrencies} 
            title="Refresh from DB"
            className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={loading && !fetchingLive && !savingAll ? "animate-spin" : ""} />
          </button>

          {/* Sync Live Rates Button */}
          <button
            onClick={handleSyncLiveRates}
            disabled={fetchingLive || currencies.length === 0}
            className="px-3 py-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-lg hover:opacity-95 disabled:opacity-50 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-98"
          >
            {fetchingLive ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
            {fetchingLive ? 'Syncing...' : 'Sync Live Rates'}
          </button>

          {/* Save All (only shown when pending changes exist) */}
          {hasChanges && (
            <button
              onClick={handleSaveAll}
              disabled={savingAll}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg disabled:opacity-60 flex items-center gap-1.5 transition-colors animate-in fade-in duration-200 cursor-pointer active:scale-98"
            >
              {savingAll
                ? <Loader2 size={13} className="animate-spin" />
                : <Save size={13} />
              }
              {savingAll ? 'Saving...' : `Save All (${currencies.filter(c => c.pendingUpdate || c.isEdited).length})`}
            </button>
          )}

          {hasChanges && (
            <button 
              onClick={fetchCurrencies}
              className="px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors cursor-pointer"
            >
              Discard
            </button>
          )}

          <button 
            onClick={() => setShowAdd(true)}
            className="px-3 py-1.5 bg-muted hover:bg-muted/80 border border-border text-[10px] font-bold text-foreground rounded-lg flex items-center gap-1.5 cursor-pointer active:scale-98"
          >
            <Plus size={13} /> Add Currency
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3 text-[11px] font-mono bg-red-500/10 text-red-600 rounded-md border border-red-500/20 flex items-center gap-2">
          <AlertTriangle size={13} /> {error}
        </div>
      )}
      {successMsg && (
        <div className="p-3 text-[11px] font-mono bg-emerald-500/10 text-emerald-600 rounded-md border border-emerald-500/20">
          {successMsg}
        </div>
      )}

      {/* Pending changes banner */}
      {hasChanges && (
        <div className="p-3 text-[11px] font-mono bg-amber-500/10 text-amber-600 rounded-md border border-amber-500/20 flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <TrendingUp size={13} />
            {currencies.filter(c => c.pendingUpdate || c.isEdited).length} updates ready to save - highlighted below. Click <strong>Save All</strong>.
          </span>
        </div>
      )}

      {/* Plan Price Preview (Derived dynamically from USD table rate) */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <DollarSign size={14} className="text-primary" />
            Plan Price Preview
            {hasChanges && <span className="text-[9px] font-mono text-amber-500 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded">PREVIEW (UNSAVED)</span>}
          </h2>
          <span className="text-[10px] font-mono text-muted-foreground/60">USD Master Rate = {activeUSDRate.toLocaleString('en-US')} IDR</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(PLAN_PRICES_USD).map(([key, p]) => {
            const priceIDR = p.price_usd * activeUSDRate
            const originalIDR = p.original_usd * activeUSDRate

            return (
              <div key={key} className="rounded-lg border border-border bg-muted/20 p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-foreground uppercase">{p.label}</span>
                  <span className="text-[9px] font-mono text-muted-foreground">{p.duration}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-mono font-black text-foreground">
                      Rp {priceIDR.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground/50 line-through">
                      Rp {originalIDR.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-primary/80 font-bold">
                    Master Price: ${p.price_usd.toFixed(2)} USD
                  </span>
                </div>
                {/* Equivalents in active currencies */}
                <div className="flex flex-wrap gap-1.5">
                  {currencies
                    .filter(c => c.is_active)
                    .map(c => {
                      const rate = Number(c.rate_to_idr)
                      const equiv = rate > 0 ? (priceIDR / rate) : 0
                      return (
                        <span key={c.currency_code}
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                            c.pendingUpdate
                              ? 'border-amber-500/30 bg-amber-500/10 text-amber-600'
                              : c.isEdited
                                ? 'border-blue-500/30 bg-blue-500/10 text-blue-600'
                                : 'border-border bg-muted/40 text-muted-foreground'
                          }`}>
                          <span>{getFlagEmoji(c.currency_code)}</span>
                          <span>{c.currency_code} {equiv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </span>
                      )
                    })
                  }
                </div>
              </div>
            )
          })}
        </div>
      </div>



      {/* Currency Table */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto shadow-xs">
        <table className="w-full text-left border-collapse min-w-[720px]">
          <thead className="bg-muted/10 border-b border-border">
            <tr>
              <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider font-bold">Code</th>
              <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider font-bold">Name</th>
              <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider font-bold text-right">1 Unit → IDR</th>
              <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider font-bold text-center">Ratecode</th>
              <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider font-bold text-right">Premium equiv.</th>
              <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider font-bold text-right">Pro equiv.</th>
              <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider font-bold text-center">Status</th>
              <th className="px-5 py-3 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading ? (
              <tr><td colSpan={8} className="p-8 text-center text-xs text-muted-foreground">
                <Loader2 className="animate-spin inline mr-2" />Loading...
              </td></tr>
            ) : currencies.map(c => {
              const _isEditing = editing === c.currency_code
              const displayRate = Number(c.rate_to_idr)

              // Premium equivalent: 40000 IDR base price ÷ this currency's rate_to_idr
              const premiumEquiv = displayRate > 0 ? 40000 / displayRate : 0
              const formattedPremiumEquiv = c.currency_code + ' ' + premiumEquiv.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })

              // Pro equivalent: 120000 IDR base price ÷ this currency's rate_to_idr
              const proEquiv = displayRate > 0 ? 120000 / displayRate : 0
              const formattedProEquiv = c.currency_code + ' ' + proEquiv.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })

              return (
                <tr key={c.id} className={`transition-colors group ${
                  c.pendingUpdate
                    ? 'bg-amber-500/5 hover:bg-amber-500/10'
                    : c.isEdited
                      ? 'bg-blue-500/5 hover:bg-blue-500/10'
                      : 'hover:bg-muted/5'
                }`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm select-none">{getFlagEmoji(c.currency_code)}</span>
                      <span className="text-xs font-mono font-bold">{c.currency_code}</span>
                      {c.pendingUpdate && (
                        <span className="text-[8px] font-mono bg-amber-500/20 text-amber-600 border border-amber-500/30 px-1 rounded">
                          PENDING
                        </span>
                      )}
                      {c.isEdited && (
                        <span className="text-[8px] font-mono bg-blue-500/20 text-blue-600 border border-blue-500/30 px-1 rounded">
                          EDITED
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground">
                    {c.currency_name}
                  </td>
                  <td className="px-5 py-3.5 text-xs font-mono font-semibold text-right">
                    <span className={c.pendingUpdate ? 'text-amber-500 font-bold' : c.isEdited ? 'text-blue-500 font-bold' : ''}>
                      {displayRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground text-center">
                    {c.rate_code || c.currency_code}
                  </td>
                  <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground text-right">
                    <span className="font-semibold text-foreground">
                      {formattedPremiumEquiv}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground text-right">
                    <span className="font-semibold text-foreground">
                      {formattedProEquiv}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      onClick={() => handleToggleActive(c)}
                      disabled={c.currency_code === 'IDR'}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[8.5px] font-bold font-mono border transition-colors cursor-pointer ${
                        c.is_active
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                      } disabled:cursor-not-allowed disabled:opacity-80`}
                    >
                      <span className={`h-1 w-1 rounded-full ${c.is_active ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                      {c.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={() => {
                          setEditing(c.currency_code);
                          setEditForm({
                            currency_name: c.currency_name,
                            rate_to_idr: Number(c.rate_to_idr),
                            rate_code: c.rate_code || c.currency_code,
                            is_active: c.is_active
                          });
                        }}
                        className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded cursor-pointer"
                      >
                        <Edit3 size={14} />
                      </button>
                      {c.currency_code !== 'IDR' && (
                        <button 
                          onClick={() => setDeleteConfirmCode(c.currency_code)}
                          className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Sticky Save All bar when changes exist */}
      {hasChanges && (
        <div className="sticky bottom-4 flex items-center justify-between gap-4 p-4 rounded-xl border border-amber-500/30 bg-card/95 backdrop-blur shadow-lg animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-3">
            <TrendingUp size={16} className="text-amber-500" />
            <div>
              <p className="text-[12px] font-bold text-foreground">
                {currencies.filter(c => c.pendingUpdate || c.isEdited).length} updates ready to save
              </p>
              <p className="text-[10px] text-muted-foreground font-mono">Changes exist locally · click Save All to push updates to server</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchCurrencies}
              className="px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors cursor-pointer">
              Discard
            </button>
            <button onClick={handleSaveAll} disabled={savingAll}
              className="px-5 py-2 bg-emerald-600 text-white text-[11px] font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-2 transition-colors cursor-pointer">
              {savingAll ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {savingAll ? 'Saving...' : 'Save All'}
            </button>
          </div>
        </div>
      )}
      {/* Add Currency Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md p-5 bg-card border border-border/80 rounded-xl select-none">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">Add New Currency</DialogTitle>
            <DialogDescription className="text-[10px] font-mono text-muted-foreground">
              Create a new currency and specify its conversion rate to IDR.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-muted-foreground uppercase font-bold font-mono">Currency Code</span>
              <input 
                placeholder="e.g. SGD" 
                className="px-3 py-1.5 text-xs font-mono rounded-md border border-border bg-muted/20 text-foreground focus:outline-none focus:border-primary uppercase"
                value={addForm.currency_code}
                onChange={e => setAddForm({...addForm, currency_code: e.target.value.toUpperCase()})} 
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-muted-foreground uppercase font-bold font-mono">Currency Name</span>
              <input 
                placeholder="e.g. Singapore Dollar" 
                className="px-3 py-1.5 text-xs font-mono rounded-md border border-border bg-muted/20 text-foreground focus:outline-none focus:border-primary"
                value={addForm.currency_name}
                onChange={e => setAddForm({...addForm, currency_name: e.target.value})} 
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-muted-foreground uppercase font-bold font-mono">Rate (1 Unit to IDR)</span>
              <input 
                type="number" 
                step="any" 
                placeholder="e.g. 12000" 
                className="px-3 py-1.5 text-xs font-mono rounded-md border border-border bg-muted/20 text-foreground focus:outline-none focus:border-primary"
                value={addForm.rate_to_idr || ''}
                onChange={e => setAddForm({...addForm, rate_to_idr: parseFloat(e.target.value) || 0})} 
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-muted-foreground uppercase font-bold font-mono">Rate Code (API base)</span>
              <input 
                placeholder="e.g. SGD" 
                className="px-3 py-1.5 text-xs font-mono rounded-md border border-border bg-muted/20 text-foreground focus:outline-none focus:border-primary uppercase"
                value={addForm.rate_code}
                onChange={e => setAddForm({...addForm, rate_code: e.target.value.toUpperCase()})} 
              />
            </div>
          </div>
          <DialogFooter className="flex items-center justify-end gap-2 mt-4 font-mono">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdd(false)}
              className="text-[9.5px] font-mono h-7 px-3 border border-border bg-transparent hover:bg-muted/50 text-foreground cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={saving}
              className="text-[9.5px] font-mono h-7 px-3 bg-primary text-primary-foreground cursor-pointer"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save Currency
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Currency Dialog */}
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-md p-5 bg-card border border-border/80 rounded-xl select-none">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">Edit Currency: {editing}</DialogTitle>
            <DialogDescription className="text-[10px] font-mono text-muted-foreground">
              Modify the configuration or rate details for this currency.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="flex flex-col gap-1 col-span-2">
              <span className="text-[9px] text-muted-foreground uppercase font-bold font-mono">Currency Name</span>
              <input 
                placeholder="e.g. US Dollar" 
                className="px-3 py-1.5 text-xs font-mono rounded-md border border-border bg-muted/20 text-foreground focus:outline-none focus:border-primary"
                value={editForm.currency_name}
                onChange={e => setEditForm({...editForm, currency_name: e.target.value})} 
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-muted-foreground uppercase font-bold font-mono">Rate (1 Unit to IDR)</span>
              <input 
                type="number" 
                step="any" 
                placeholder="e.g. 15000" 
                className="px-3 py-1.5 text-xs font-mono rounded-md border border-border bg-muted/20 text-foreground focus:outline-none focus:border-primary"
                value={editForm.rate_to_idr || ''}
                onChange={e => setEditForm({...editForm, rate_to_idr: parseFloat(e.target.value) || 0})} 
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-muted-foreground uppercase font-bold font-mono">Rate Code (API base)</span>
              <input 
                placeholder="e.g. USD" 
                className="px-3 py-1.5 text-xs font-mono rounded-md border border-border bg-muted/20 text-foreground focus:outline-none focus:border-primary uppercase"
                value={editForm.rate_code}
                onChange={e => setEditForm({...editForm, rate_code: e.target.value.toUpperCase()})} 
              />
            </div>
          </div>
          <DialogFooter className="flex items-center justify-end gap-2 mt-4 font-mono">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(null)}
              className="text-[9.5px] font-mono h-7 px-3 border border-border bg-transparent hover:bg-muted/50 text-foreground cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => handleInlineSave(editing || '')}
              className="text-[9.5px] font-mono h-7 px-3 bg-primary text-primary-foreground cursor-pointer"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmCode !== null} onOpenChange={(open) => !open && setDeleteConfirmCode(null)}>
        <DialogContent className="max-w-xs p-5 bg-card border border-border/80 rounded-xl select-none">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">Confirm Deletion</DialogTitle>
            <DialogDescription className="text-[10px] font-mono text-muted-foreground">
              Are you sure you want to delete the currency <strong>{deleteConfirmCode}</strong>? This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex items-center justify-end gap-2 mt-3 font-mono">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmCode(null)}
              className="text-[9.5px] font-mono h-7 px-3 border border-border bg-transparent hover:bg-muted/50 text-foreground cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (deleteConfirmCode) {
                  handleDelete(deleteConfirmCode)
                  setDeleteConfirmCode(null)
                }
              }}
              className="text-[9.5px] font-mono h-7 px-3 bg-red-600 hover:bg-red-700 text-white cursor-pointer"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
