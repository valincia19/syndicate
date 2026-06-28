'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { api, ApiError } from '@/lib/api'
import { Settings, Save, Key, Shield, CheckCircle2, AlertCircle, Loader2, ExternalLink, ChevronDown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FreeKeySettings {
  key_prefix?: string
  duration_days: number
  duration_unit?: 'days' | 'hours'
  hwid_limit: number
  is_enabled: boolean
  turnstile_enabled: boolean
  valinc_checkpoints: number
  valinc_countdown_seconds: number
  max_keys_per_ip: number
  checkpoint1_url?: string
  checkpoint2_url?: string
  checkpoint3_url?: string
}

interface CustomSelectOption<T extends string | number | boolean> {
  value: T
  label: string
  description?: string
}

function CustomSelect<T extends string | number | boolean>({
  value,
  onChange,
  options,
  disabled = false,
}: {
  value: T
  onChange: (val: T) => void
  options: CustomSelectOption<T>[]
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value) || options[0]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2.5 text-xs font-mono rounded-lg border border-border bg-card hover:bg-muted/40 text-foreground flex items-center justify-between transition-all cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-primary/50 disabled:opacity-50 select-none shadow-xs"
      >
        <span className="font-medium truncate">{selectedOption?.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ml-2 ${isOpen ? 'rotate-180 text-foreground' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg overflow-hidden py-1 animate-in fade-in-0 zoom-in-95 duration-150">
          {options.map((opt, idx) => {
            const isSelected = opt.value === value
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onChange(opt.value)
                  setIsOpen(false)
                }}
                className={`w-full px-3.5 py-2 text-xs font-mono flex items-center justify-between text-left transition-colors cursor-pointer ${
                  isSelected ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted/50 text-foreground'
                }`}
              >
                <div className="flex flex-col min-w-0">
                  <span>{opt.label}</span>
                  {opt.description && (
                    <span className="text-[10px] text-muted-foreground font-normal truncate">{opt.description}</span>
                  )}
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function OwnerSettingsPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savingFreeKey, setSavingFreeKey] = useState(false)
  
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Free Key Settings State
  const [freeKeyConfig, setFreeKeyConfig] = useState<FreeKeySettings>({
    key_prefix: 'SYNDICATE',
    duration_days: 7,
    duration_unit: 'days',
    hwid_limit: 1,
    is_enabled: true,
    turnstile_enabled: true,
    valinc_checkpoints: 2,
    valinc_countdown_seconds: 10,
    max_keys_per_ip: 2,
    checkpoint1_url: '',
    checkpoint2_url: '',
    checkpoint3_url: '',
  })

  // General & Security states for UI completeness
  const [maintenanceMode, setMaintenanceMode] = useState(false)

  useEffect(() => {
    Promise.resolve().then(() => setMounted(true))
  }, [])

  // Auth Protection
  useEffect(() => {
    if (!authLoading && mounted) {
      if (!user || user.role !== 'owner') {
        router.push('/studio')
      }
    }
  }, [user, authLoading, mounted, router])

  // Fetch dynamic settings from backend API
  useEffect(() => {
    if (mounted && user?.role === 'owner') {
      const fetchFreeKeySettings = async () => {
        try {
          setLoading(true)
          const res = await api.get<{ data: FreeKeySettings }>('/v1/admin/settings/free_key_settings')
          if (res.data) {
            setFreeKeyConfig({
              key_prefix: res.data.key_prefix || 'SYNDICATE',
              duration_days: res.data.duration_days ?? 7,
              duration_unit: res.data.duration_unit || 'days',
              hwid_limit: res.data.hwid_limit ?? 1,
              is_enabled: res.data.is_enabled ?? true,
              turnstile_enabled: res.data.turnstile_enabled ?? true,
              valinc_checkpoints: res.data.valinc_checkpoints ?? 2,
              valinc_countdown_seconds: res.data.valinc_countdown_seconds ?? 10,
              max_keys_per_ip: res.data.max_keys_per_ip ?? 2,
              checkpoint1_url: res.data.checkpoint1_url || '',
              checkpoint2_url: res.data.checkpoint2_url || '',
              checkpoint3_url: res.data.checkpoint3_url || '',
            })
          }
        } catch (err) {
          console.error('Failed to load free key settings:', err)
        } finally {
          setLoading(false)
        }
      }
      fetchFreeKeySettings()
    }
  }, [mounted, user])

  const handleSaveFreeKeySettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingFreeKey(true)
    setSuccessMsg(null)
    setErrorMsg(null)

    try {
      await api.post('/v1/admin/settings/free_key_settings', freeKeyConfig)
      setSuccessMsg('Free key settings saved and applied successfully!')
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message || 'Failed to save free key settings')
      } else {
        setErrorMsg('Network error while saving settings')
      }
    } finally {
      setSavingFreeKey(false)
    }
  }

  if (authLoading || !mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-2.5 text-muted-foreground font-mono text-xs animate-pulse bg-card/80 border border-border px-4 py-3 rounded-xl shadow-xs">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>Loading system parameters...</span>
        </div>
      </div>
    )
  }

  if (!user || user.role !== 'owner') {
    return null
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto min-w-0 w-full pb-16 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4 select-none">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-black tracking-tight text-foreground uppercase">
              System Settings
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Manage system configurations, license generators, and anti-bypass gateways
          </p>
        </div>
      </div>

      {/* Alert Banners */}
      {successMsg && (
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200 shadow-xs">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200 shadow-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-destructive" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── FREE KEY & BYPASS CONFIGURATION CARD ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs w-full">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-mono text-foreground uppercase tracking-wider font-bold">Free Key & Gateway Settings</h2>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase font-semibold">
            Live Database Sync
          </span>
        </div>

        <form onSubmit={handleSaveFreeKeySettings} className="p-5 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Free Key System Status */}
            <div className="space-y-2">
              <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider font-bold select-none">
                Free Key System Status
              </label>
              <CustomSelect
                value={freeKeyConfig.is_enabled ? 'enabled' : 'disabled'}
                onChange={(val) => setFreeKeyConfig({ ...freeKeyConfig, is_enabled: val === 'enabled' })}
                options={[
                  { value: 'enabled', label: 'Active (Allowed Claims)', description: 'Public generator is online and active' },
                  { value: 'disabled', label: 'Disabled (Maintenance Pause)', description: 'Public key claims are temporarily paused' },
                ]}
              />
              <p className="text-[10px] text-muted-foreground/80">
                Toggle public key generation system status.
              </p>
            </div>

            {/* Key Prefix / Format */}
            <div className="space-y-2">
              <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider font-bold select-none">
                License Key Prefix / Format
              </label>
              <input
                type="text"
                placeholder="e.g. SYNDICATE, VALINC, VIP"
                value={freeKeyConfig.key_prefix || ''}
                onChange={(e) => setFreeKeyConfig({ ...freeKeyConfig, key_prefix: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:ring-1 focus:ring-primary/50 uppercase transition-all shadow-xs"
              />
              <p className="text-[10px] text-muted-foreground/80">
                Format: <span className="font-mono text-foreground font-bold">{freeKeyConfig.key_prefix || 'SYNDICATE'}_XXXXXX</span>
              </p>
            </div>

            {/* Cloudflare Turnstile Verification */}
            <div className="space-y-2">
              <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider font-bold select-none">
                Turnstile Captcha (Step 1)
              </label>
              <CustomSelect
                value={freeKeyConfig.turnstile_enabled ? 'enabled' : 'disabled'}
                onChange={(val) => setFreeKeyConfig({ ...freeKeyConfig, turnstile_enabled: val === 'enabled' })}
                options={[
                  { value: 'enabled', label: 'Enabled (Required Captcha)', description: 'Enforce Cloudflare Turnstile bot protection' },
                  { value: 'disabled', label: 'Disabled (Instant Bypass Step 1)', description: 'Skip captcha validation for public claims' },
                ]}
              />
              <p className="text-[10px] text-muted-foreground/80">
                Controls Cloudflare Turnstile bot verification requirement.
              </p>
            </div>

            {/* Key Duration & Unit */}
            <div className="space-y-2">
              <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider font-bold select-none">
                Key Duration Value & Unit
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={freeKeyConfig.duration_days}
                  onChange={(e) => setFreeKeyConfig({ ...freeKeyConfig, duration_days: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="flex-1 px-3.5 py-2.5 text-xs font-mono rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:ring-1 focus:ring-primary/50 shadow-xs"
                />
                <div className="w-32 shrink-0">
                  <CustomSelect
                    value={freeKeyConfig.duration_unit || 'days'}
                    onChange={(val) => setFreeKeyConfig({ ...freeKeyConfig, duration_unit: val as 'days' | 'hours' })}
                    options={[
                      { value: 'days', label: 'Hari (Days)' },
                      { value: 'hours', label: 'Jam (Hours)' },
                    ]}
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/80">
                Active lifetime duration for newly claimed free keys.
              </p>
            </div>

            {/* HWID Limit */}
            <div className="space-y-2">
              <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider font-bold select-none">
                Device HWID Limit
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={freeKeyConfig.hwid_limit}
                onChange={(e) => setFreeKeyConfig({ ...freeKeyConfig, hwid_limit: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:ring-1 focus:ring-primary/50 shadow-xs"
              />
              <p className="text-[10px] text-muted-foreground/80">
                Maximum hardware devices allowed per license key.
              </p>
            </div>

            {/* Max Free Keys Per IP */}
            <div className="space-y-2">
              <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider font-bold select-none">
                Max Free Keys Per IP Limit
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={freeKeyConfig.max_keys_per_ip}
                onChange={(e) => setFreeKeyConfig({ ...freeKeyConfig, max_keys_per_ip: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:ring-1 focus:ring-primary/50 shadow-xs"
              />
              <p className="text-[10px] text-muted-foreground/80">
                Maximum claim limit per IP address / device.
              </p>
            </div>

            {/* Valinc Checkpoints Count */}
            <div className="space-y-2">
              <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider font-bold select-none">
                Valinc Link Checkpoints Count
              </label>
              <CustomSelect
                value={freeKeyConfig.valinc_checkpoints}
                onChange={(val) => setFreeKeyConfig({ ...freeKeyConfig, valinc_checkpoints: Number(val) })}
                options={[
                  { value: 1, label: '1 Checkpoint', description: 'Fast gateway process' },
                  { value: 2, label: '2 Checkpoints', description: 'Standard balanced gateway' },
                  { value: 3, label: '3 Checkpoints', description: 'Extended verification process' },
                ]}
              />
              <p className="text-[10px] text-muted-foreground/80">
                Number of gateway screens required for verification.
              </p>
            </div>

            {/* Valinc Countdown Time */}
            <div className="space-y-2">
              <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider font-bold select-none">
                Valinc Countdown Time (Seconds)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={freeKeyConfig.valinc_countdown_seconds}
                onChange={(e) => setFreeKeyConfig({ ...freeKeyConfig, valinc_countdown_seconds: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:ring-1 focus:ring-primary/50 shadow-xs"
              />
              <p className="text-[10px] text-muted-foreground/80">
                Timer delay per gateway checkpoint screen.
              </p>
            </div>

          </div>

          {/* ── DIRECT AD LINKS SECTION ── */}
          <div className="border-t border-border pt-5 space-y-4">
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-mono text-foreground uppercase tracking-wider font-bold">Checkpoint Direct Ad Links (Optional Monetization)</h3>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Optional direct ad network destinations for each gateway checkpoint.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 font-bold select-none">
                  Checkpoint 1 Direct Ad URL
                </label>
                <input
                  type="url"
                  placeholder="https://your-ad-network-link.com/ad1"
                  value={freeKeyConfig.checkpoint1_url || ''}
                  onChange={(e) => setFreeKeyConfig({ ...freeKeyConfig, checkpoint1_url: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:ring-1 focus:ring-primary/50 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 font-bold select-none">
                  Checkpoint 2 Direct Ad URL
                </label>
                <input
                  type="url"
                  placeholder="https://your-ad-network-link.com/ad2"
                  value={freeKeyConfig.checkpoint2_url || ''}
                  onChange={(e) => setFreeKeyConfig({ ...freeKeyConfig, checkpoint2_url: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:ring-1 focus:ring-primary/50 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider mb-1 font-bold select-none">
                  Checkpoint 3 Direct Ad URL
                </label>
                <input
                  type="url"
                  placeholder="https://your-ad-network-link.com/ad3"
                  value={freeKeyConfig.checkpoint3_url || ''}
                  onChange={(e) => setFreeKeyConfig({ ...freeKeyConfig, checkpoint3_url: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:ring-1 focus:ring-primary/50 shadow-xs"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={savingFreeKey}
            className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-mono font-bold rounded-lg cursor-pointer flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            {savingFreeKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{savingFreeKey ? 'Saving Settings...' : 'Save Free Key Settings'}</span>
          </Button>
        </form>
      </div>

      {/* General Settings */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs w-full">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2 bg-muted/20">
          <Settings className="w-4 h-4 text-primary" />
          <h2 className="text-xs font-mono text-foreground uppercase tracking-wider font-bold">General Configuration</h2>
        </div>
        <div className="p-5 sm:p-6 space-y-4">
          <div className="space-y-2">
            <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider font-bold select-none">System Name</label>
            <input
              type="text"
              defaultValue="VALINC SYNDICATE"
              className="w-full px-3.5 py-2.5 text-xs font-mono rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:ring-1 focus:ring-primary/50 shadow-xs"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider font-bold select-none">Maintenance Mode</label>
            <CustomSelect
              value={maintenanceMode}
              onChange={(val) => setMaintenanceMode(val)}
              options={[
                { value: false, label: 'Disabled (System Online)', description: 'All studio portals and APIs operational' },
                { value: true, label: 'Enabled (Maintenance Lock)', description: 'Restrict user logins for updates' },
              ]}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider font-bold select-none">Max Active Sessions</label>
            <input
              type="number"
              defaultValue="5000"
              className="w-full px-3.5 py-2.5 text-xs font-mono rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:ring-1 focus:ring-primary/50 shadow-xs"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full h-10 text-xs font-mono font-bold rounded-lg cursor-pointer flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Save General Settings</span>
          </Button>
        </div>
      </div>

      {/* Security Settings */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs w-full">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2 bg-muted/20">
          <Shield className="w-4 h-4 text-primary" />
          <h2 className="text-xs font-mono text-foreground uppercase tracking-wider font-bold">Security Configuration</h2>
        </div>
        <div className="p-5 sm:p-6 space-y-4">
          <div className="space-y-2">
            <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider font-bold select-none">JWT Expiration (hours)</label>
            <input
              type="number"
              defaultValue="168"
              className="w-full px-3.5 py-2.5 text-xs font-mono rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:ring-1 focus:ring-primary/50 shadow-xs"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] text-muted-foreground font-mono uppercase tracking-wider font-bold select-none">Rate Limit (requests/15min)</label>
            <input
              type="number"
              defaultValue="100"
              className="w-full px-3.5 py-2.5 text-xs font-mono rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:ring-1 focus:ring-primary/50 shadow-xs"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full h-10 text-xs font-mono font-bold rounded-lg cursor-pointer flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Save Security Settings</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
