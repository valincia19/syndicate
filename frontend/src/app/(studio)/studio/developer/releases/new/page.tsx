/* eslint-disable @next/next/no-img-element */
'use client'

import { useEffect, useState, Suspense, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { useFormDraft } from '@/hooks/use-form-draft'
import {
  Loader2, ArrowLeft, Plus, X, Gamepad2, Save,
  AlertCircle, CheckCircle, ImageIcon, Link, Tag, Hash,
  Terminal, FileCode, Activity, Search, Shield,
} from 'lucide-react'

interface GameInfo {
  game_name: string
  game_description: string
  game_id: string
  game_logo: string | null
  game_banner: string | null
  genre: string
  playing: number
}

const CATEGORIES = ['Universal', 'Anime', 'Shooter', 'Simulator', 'RPG', 'Tycoon']

const CATEGORY_GRADIENTS: Record<string, string> = {
  Universal: 'from-yellow-500/20 to-amber-600/20 text-yellow-500 border-yellow-500/30',
  Anime: 'from-purple-500/20 to-indigo-600/20 text-purple-500 border-purple-500/30',
  Shooter: 'from-rose-500/20 to-red-600/20 text-rose-500 border-rose-500/30',
  Simulator: 'from-blue-500/20 to-cyan-600/20 text-blue-500 border-blue-500/30',
  RPG: 'from-orange-500/20 to-amber-600/20 text-orange-400 border-orange-500/30',
  Tycoon: 'from-emerald-400/20 to-green-600/20 text-emerald-400 border-emerald-400/30',
}

function generateLogoText(name: string): string {
  const cleaned = name.trim()
  if (!cleaned) return '??'
  // Take first 2 uppercase letters or first 2 chars
  const upper = cleaned.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  if (upper.length >= 2) return upper.slice(0, 2)
  return cleaned.slice(0, 2).toUpperCase()
}

function NewReleaseContent() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [mounted, setMounted] = useState(false)

  // ── Form fields ──
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Universal')
  const [version, setVersion] = useState('v1.0.0')
  const [scriptId, setScriptId] = useState('')
  const [scriptType, setScriptType] = useState<'free' | 'plan'>('free')
  const [operationalStatus, setOperationalStatus] = useState<'Online' | 'Maintenance'>('Online')
  const [publishStatus, setPublishStatus] = useState<'draft' | 'published'>('draft')
  const [gameId, setGameId] = useState('')
  const [features, setFeatures] = useState<string[]>([''])
  const [restoredDraft, setRestoredDraft] = useState(false)

  // ── Auto-save draft to localStorage ──
  const { scheduleSave, clearDraft } = useFormDraft({
    key: 'release-new-draft',
    initialData: {
      name: '',
      description: '',
      category: 'Universal',
      version: 'v1.0.0',
      scriptId: '',
      scriptType: 'free',
      operationalStatus: 'Online',
      publishStatus: 'draft',
      gameId: '',
      features: [''],
    },
    getData: () => ({
      name, description, category, version, scriptId,
      scriptType, operationalStatus, publishStatus, gameId, features,
    }),
    setData: (data) => {
      if (data.name !== undefined) setName(data.name as string)
      if (data.description !== undefined) setDescription(data.description as string)
      if (data.category !== undefined) setCategory(data.category as string)
      if (data.version !== undefined) setVersion(data.version as string)
      if (data.scriptId !== undefined) setScriptId(data.scriptId as string)
      if (data.scriptType !== undefined) setScriptType(data.scriptType as 'free' | 'plan')
      if (data.operationalStatus !== undefined) setOperationalStatus(data.operationalStatus as 'Online' | 'Maintenance')
      if (data.publishStatus !== undefined) setPublishStatus(data.publishStatus as 'draft' | 'published')
      if (data.gameId !== undefined) setGameId(data.gameId as string)
      if (data.features !== undefined) setFeatures(data.features as string[])
      setRestoredDraft(true)
    },
    onRestored: () => setRestoredDraft(true),
    warnBeforeUnload: true,
  })

  // Auto-save on any form field change
  useEffect(() => {
    if (!restoredDraft) return
    scheduleSave()
  }, [name, description, category, version, scriptId, scriptType, operationalStatus, publishStatus, gameId, features, scheduleSave, restoredDraft])

  // ── Scripts list for selector ──
  const [scripts, setScripts] = useState<{ id: string; name: string; file_url: string }[]>([])
  const [isLoadingScripts, setIsLoadingScripts] = useState(true)
  const [scriptSearch, setScriptSearch] = useState('')

  // Auto-generated logo text from name
  const logoText = useMemo(() => generateLogoText(name), [name])
  const logoGradient = useMemo(() => CATEGORY_GRADIENTS[category] || CATEGORY_GRADIENTS.Universal, [category])

  // ── Game info fetching ──
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null)
  const [isFetchingGame, setIsFetchingGame] = useState(false)
  const [gameError, setGameError] = useState<string | null>(null)
  const gameIdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Submit ──
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  useEffect(() => { Promise.resolve().then(() => setMounted(true)) }, [])

  // ── Fetch user's scripts for selector ──
  useEffect(() => {
    if (!authLoading && mounted && user && ['owner', 'developer'].includes(user.role)) {
      const fetchScripts = async () => {
        try {
          const res = await api.get<{ status: string; data: { scripts: { id: string; name: string; file_url: string }[] } }>('/v1/scripts?status=published')
          setScripts(res.data.scripts || [])
        } catch (err) {
          console.error('Failed to fetch scripts:', err)
        } finally {
          setIsLoadingScripts(false)
        }
      }
      fetchScripts()
    }
  }, [user, authLoading, mounted])

  // ── Game ID helpers ──

  /** Extract numeric Roblox Place ID from a full URL */
  const extractGameId = useCallback((input: string): string => {
    const trimmed = input.trim()
    const match = trimmed.match(/roblox\.com\/games\/(\d+)/i)
    if (match) return match[1]
    if (/^\d+$/.test(trimmed)) return trimmed
    return trimmed
  }, [])

  const [detectedUrl, setDetectedUrl] = useState(false)

  const fetchGameInfo = useCallback(async (id: string) => {
    if (!id.trim()) {
      setGameInfo(null)
      setGameError(null)
      return
    }
    setIsFetchingGame(true)
    setGameError(null)
    setGameInfo(null)
    try {
      const res = await api.get<{ status: string; data: GameInfo }>(`/v1/releases/game-info/${encodeURIComponent(id.trim())}`)
      setGameInfo(res.data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch game info'
      setGameError(msg)
    } finally {
      setIsFetchingGame(false)
    }
  }, [])

  const handleGameIdChange = useCallback((value: string) => {
    setGameId(value)
    if (gameIdTimer.current) clearTimeout(gameIdTimer.current)

    const trimmed = value.trim()
    if (!trimmed) {
      setGameInfo(null)
      setGameError(null)
      setDetectedUrl(false)
      return
    }

    const isUrl = /roblox\.com\/games\//i.test(trimmed)
    setDetectedUrl(isUrl)

    const extractedId = extractGameId(value)
    if (extractedId) {
      gameIdTimer.current = setTimeout(() => fetchGameInfo(extractedId), 800)
    }
  }, [fetchGameInfo, extractGameId])

  useEffect(() => {
    return () => {
      if (gameIdTimer.current) clearTimeout(gameIdTimer.current)
    }
  }, [])

  // ── Features management ──
  const addFeature = useCallback(() => {
    setFeatures(prev => [...prev, ''])
  }, [])

  const removeFeature = useCallback((index: number) => {
    setFeatures(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updateFeature = useCallback((index: number, value: string) => {
    setFeatures(prev => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }, [])

  // ── Submit ──
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !gameId.trim()) return

    // ── Guard: game ID must be validated before submit ──
    if (!gameInfo && gameId.trim()) {
      setSubmitError('Game ID not recognized. Please enter a valid Roblox Place/Universe ID or URL.')
      return
    }
    if (isFetchingGame) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const extractedId = extractGameId(gameId)
      const payload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim(),
        category,
        version: version.trim() || 'v1.0.0',
        script_id: scriptId || null,
        script_type: scriptType,
        logo_text: logoText,
        logo_gradient: logoGradient,
        operational_status: operationalStatus,
        status: publishStatus,
        game_id: extractedId,
        features: features.filter(f => f.trim()).map(f => f.trim()),
      }

      if (gameInfo) {
        payload.game_name = gameInfo.game_name
        payload.game_logo = gameInfo.game_logo
        payload.game_banner = gameInfo.game_banner
      }

      await api.post('/v1/releases', payload)
      clearDraft()
      setSubmitSuccess(true)
      setTimeout(() => router.push('/studio/developer/releases'), 1500)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create release'
      setSubmitError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }, [name, description, category, version, scriptId, scriptType, logoText, logoGradient, operationalStatus, publishStatus, gameId, gameInfo, isFetchingGame, features, extractGameId, clearDraft, router])

  // ── Auth guard ──
  if (authLoading || !mounted) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      <span className="ml-2 text-[11px] font-mono text-muted-foreground animate-pulse">Loading...</span>
    </div>
  )
  if (!user || !['owner', 'developer'].includes(user.role)) return null

  if (submitSuccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle className="w-10 h-10 text-emerald-500" />
          <p className="text-sm font-mono text-emerald-500 font-bold">Release Created Successfully!</p>
          <p className="text-[11px] font-mono text-muted-foreground">Redirecting to releases list...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-w-3xl mx-auto min-w-0 w-full pb-12">
      {/* Header */}
      <div className="flex flex-row items-center justify-between border-b border-border pb-2.5 gap-2 select-none">
        <div className="flex flex-row items-center gap-3">
          <button
            onClick={() => router.push('/studio/developer/releases')}
            type="button"
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded-md border border-border bg-muted/20 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-lg font-black tracking-tight text-foreground uppercase">New Release</h1>
            <p className="text-[11px] text-muted-foreground">Create a new script release with game details</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">

        {/* ── Script Name ── */}
        <div className="rounded-md border border-border bg-card p-4 shadow-xs">
          <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
            Script Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Valinc Hub (Universal)"
            required
            className="w-full px-3 py-2 text-xs font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:border-primary/50 transition-all"
          />
          {name.trim() && gameInfo?.game_logo ? (
            <div className="flex items-center gap-2 mt-2">
              <img
                src={gameInfo.game_logo}
                alt={gameInfo.game_name || ''}
                className="w-6 h-6 rounded object-cover border border-border"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              <span className="text-[9px] font-mono text-muted-foreground">
                Game logo: {gameInfo.game_name}
              </span>
            </div>
          ) : name.trim() && (
            <div className="flex items-center gap-2 mt-2">
              <div className={`h-6 w-6 rounded border bg-gradient-to-br ${logoGradient} flex items-center justify-center font-heading text-[9px] tracking-tight shrink-0 select-none`}>
                {logoText}
              </div>
              <span className="text-[9px] font-mono text-muted-foreground">
                Logo preview: &quot;{logoText}&quot;
              </span>
            </div>
          )}
        </div>

        {/* ── Category + Version row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Category */}
          <div className="rounded-md border border-border bg-card p-4 shadow-xs">
            <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
              <Tag className="w-3 h-3 inline-block mr-1" />Category
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-2.5 py-1 text-[9px] font-mono rounded-md border transition-all cursor-pointer ${
                    category === cat
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-secondary hover:bg-accent/40 text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Or type custom category..."
              className="w-full px-3 py-1.5 text-[10px] font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:border-primary/50 transition-all"
            />
          </div>

          {/* Version */}
          <div className="rounded-md border border-border bg-card p-4 shadow-xs">
            <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
              <Hash className="w-3 h-3 inline-block mr-1" />Version
            </label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="v1.0.0"
              className="w-full px-3 py-2 text-xs font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:border-primary/50 transition-all"
            />
          </div>
        </div>

        {/* ── Script Type + Status row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Description (span 2) */}
          <div className="sm:col-span-2 rounded-md border border-border bg-card p-4 shadow-xs">
            <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this script does..."
              rows={3}
              className="w-full px-3 py-2 text-xs font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:border-primary/50 transition-all resize-none"
            />
          </div>

          {/* Script Type */}
          <div className="rounded-md border border-border bg-card p-4 shadow-xs">
            <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
              <Terminal className="w-3 h-3 inline-block mr-1" />Script Type
            </label>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setScriptType('free')}
                className={`flex items-center gap-2 px-3 py-2 text-[10px] font-mono rounded-md border transition-all cursor-pointer ${
                  scriptType === 'free'
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    : 'bg-secondary hover:bg-accent/40 border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Free
              </button>
              <button
                type="button"
                onClick={() => setScriptType('plan')}
                className={`flex items-center gap-2 px-3 py-2 text-[10px] font-mono rounded-md border transition-all cursor-pointer ${
                  scriptType === 'plan'
                    ? 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                    : 'bg-secondary hover:bg-accent/40 border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                User Plan
              </button>
            </div>
          </div>

          {/* Operational Status */}
          <div className="rounded-md border border-border bg-card p-4 shadow-xs">
            <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
              <Activity className="w-3 h-3 inline-block mr-1" />Status
            </label>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setOperationalStatus('Online')}
                className={`flex items-center gap-2 px-3 py-2 text-[10px] font-mono rounded-md border transition-all cursor-pointer ${
                  operationalStatus === 'Online'
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    : 'bg-secondary hover:bg-accent/40 border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${operationalStatus === 'Online' ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/30'}`} />
                Online
              </button>
              <button
                type="button"
                onClick={() => setOperationalStatus('Maintenance')}
                className={`flex items-center gap-2 px-3 py-2 text-[10px] font-mono rounded-md border transition-all cursor-pointer ${
                  operationalStatus === 'Maintenance'
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    : 'bg-secondary hover:bg-accent/40 border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${operationalStatus === 'Maintenance' ? 'bg-amber-500' : 'bg-muted-foreground/30'}`} />
                Maintenance
              </button>
            </div>
          </div>
        </div>

        {/* ── Script Select ── */}
        <div className="rounded-md border border-border bg-card p-4 shadow-xs">
          <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
            <FileCode className="w-3 h-3 inline-block mr-1" />Select Script
          </label>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
            <input
              type="text"
              value={scriptSearch}
              onChange={(e) => setScriptSearch(e.target.value)}
              placeholder="Search scripts..."
              className="w-full pl-8 pr-3 py-1.5 text-[10px] font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:border-primary/50 transition-all"
            />
          </div>

          {/* Script list */}
          <div className="max-h-48 overflow-y-auto space-y-1 rounded-md border border-border bg-muted/20 p-1">
            {isLoadingScripts ? (
              <div className="flex items-center justify-center py-6 gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                <span className="text-[10px] font-mono text-muted-foreground">Loading scripts...</span>
              </div>
            ) : scripts.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-[10px] font-mono text-muted-foreground/50">No scripts found</p>
                <button
                  type="button"
                  onClick={() => router.push('/studio/developer/deploy')}
                  className="text-[10px] font-mono text-primary hover:underline mt-1 cursor-pointer"
                >
                  Upload a script first →
                </button>
              </div>
            ) : (
              scripts
                .filter(s => !scriptSearch || s.name.toLowerCase().includes(scriptSearch.toLowerCase()))
                .map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setScriptId(s.id)}
                    className={`w-full text-left px-3 py-2 text-[10px] font-mono rounded-md border transition-all cursor-pointer flex items-center gap-2 ${
                      scriptId === s.id
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : 'bg-transparent text-muted-foreground hover:text-foreground border-transparent hover:bg-muted/20'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate flex-1">{s.name}</span>
                    {scriptId === s.id && <CheckCircle className="w-3 h-3 text-primary shrink-0" />}
                  </button>
                ))
            )}
          </div>
          {scriptId && (
            <p className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-1.5 font-mono flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Selected: {scripts.find(s => s.id === scriptId)?.name || 'Unknown script'}
            </p>
          )}
        </div>

        {/* ── Game ID + Game Info Preview ── */}
        <div className="rounded-md border border-border bg-card p-4 shadow-xs space-y-3">
          <div>
            <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
              Game ID (Roblox Place/Universe ID) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              {detectedUrl ? (
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/60" />
              ) : (
                <Gamepad2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
              )}
              <input
                type="text"
                value={gameId}
                onChange={(e) => handleGameIdChange(e.target.value)}
                placeholder="e.g. 4483383387 or paste Roblox URL"
                required
                className="w-full pl-9 pr-10 py-2.5 text-sm font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:border-primary/50 transition-all"
              />
              {isFetchingGame && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[10px] text-muted-foreground/50 font-mono">
                Enter a Roblox Place ID, Universe ID, or paste the full game URL - auto-detected.
              </p>
              {detectedUrl && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-mono rounded-sm bg-primary/10 text-primary border border-primary/20">
                  <Link className="w-2.5 h-2.5" />URL detected
                </span>
              )}
            </div>
          </div>

          {/* Game Error */}
          {gameError && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-md bg-red-500/5 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-[11px] font-mono text-red-600 dark:text-red-500">{gameError}</p>
            </div>
          )}

          {/* Game Info Preview */}
          {gameInfo && (
            <div className="rounded-md border border-primary/20 bg-primary/5 overflow-hidden">
              {gameInfo.game_banner && (
                <div className="w-full h-28 sm:h-32 overflow-hidden bg-muted relative">
                  <img
                    src={gameInfo.game_banner}
                    alt={`${gameInfo.game_name} banner`}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
              )}
              <div className="p-4 flex items-start gap-4">
                <div className="w-14 h-14 rounded-md overflow-hidden shrink-0 bg-muted border border-border flex items-center justify-center">
                  {gameInfo.game_logo ? (
                    <img
                      src={gameInfo.game_logo}
                      alt={`${gameInfo.game_name} logo`}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-foreground truncate">{gameInfo.game_name}</h3>
                  {gameInfo.genre && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-mono rounded-sm bg-muted/60 text-muted-foreground border border-border/50">
                      {gameInfo.genre}
                    </span>
                  )}
                  {gameInfo.game_description && (
                    <p className="mt-1.5 text-[11px] text-muted-foreground line-clamp-2">{gameInfo.game_description}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Features ── */}
        <div className="rounded-md border border-border bg-card p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
              Features
            </label>
            <button
              type="button"
              onClick={addFeature}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono bg-secondary hover:bg-accent/40 text-muted-foreground hover:text-foreground rounded-md border border-border transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />Add Feature
            </button>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground/50">
            List the key features of your script. Add as many as you need.
          </p>

          <div className="space-y-2">
            {features.length === 0 && (
              <p className="text-xs font-mono text-muted-foreground/30 text-center py-6">
                No features added yet. Click &quot;Add Feature&quot; to start listing them.
              </p>
            )}
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 group">
                <span className="text-[10px] font-mono text-muted-foreground/40 w-5 text-right shrink-0">
                  {index + 1}.
                </span>
                <input
                  type="text"
                  value={feature}
                  onChange={(e) => updateFeature(index, e.target.value)}
                  placeholder="e.g. Auto-execute on join"
                  className="flex-1 px-3 py-2 text-xs font-mono rounded-md border border-border bg-muted/50 dark:bg-[#070708] text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:border-primary/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => removeFeature(index)}
                  className="p-1.5 text-muted-foreground/50 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all cursor-pointer shrink-0"
                  title="Remove feature"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Publish Status ── */}
        <div className="rounded-md border border-border bg-card p-4 shadow-xs">
          <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
            Visibility
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPublishStatus('draft')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono rounded-md border transition-all cursor-pointer ${
                publishStatus === 'draft'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  : 'bg-secondary hover:bg-accent/40 border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
              Draft
            </button>
            <button
              type="button"
              onClick={() => setPublishStatus('published')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono rounded-md border transition-all cursor-pointer ${
                publishStatus === 'published'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-secondary hover:bg-accent/40 border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              Published
            </button>
            <span className="ml-auto text-[9px] font-mono text-muted-foreground/50 self-center">
              {publishStatus === 'draft' ? 'Private - not visible on portal' : 'Public - visible on portal'}
            </span>
          </div>
        </div>

        {/* Error */}
        {submitError && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-md bg-red-500/5 border border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-[11px] font-mono text-red-600 dark:text-red-500">{submitError}</p>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push('/studio/developer/releases')}
            className="px-4 py-2 text-[11px] font-mono text-muted-foreground hover:text-foreground border border-border bg-transparent hover:bg-muted/20 rounded-md transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || !gameId.trim() || isSubmitting}
            className="flex items-center gap-1.5 px-5 py-2 bg-primary text-primary-foreground text-[11px] font-mono font-bold rounded-md hover:opacity-90 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating...</>
            ) : (
              <><Save className="w-3.5 h-3.5" /> {publishStatus === 'published' ? 'Create & Publish' : 'Save as Draft'}</>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function NewReleasePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    }>
      <NewReleaseContent />
    </Suspense>
  )
}
