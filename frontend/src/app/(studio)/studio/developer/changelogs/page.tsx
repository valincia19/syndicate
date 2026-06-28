'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { ClientDate } from '@/components/ui/client-date'
import {
  History, Loader2, Plus, Trash2, Globe, Gamepad2, Tag, AlertTriangle, Sparkles, ChevronDown, Check, Gamepad, Pencil
} from 'lucide-react'
import { toast } from 'sonner'

interface Release {
  id: string
  name: string
  game_id: string
  game_name: string | null
  version: string
}

interface Changelog {
  id: string
  version: string
  title: string
  description: string | null
  type: 'web' | 'game'
  game_name?: string | null
  game_id?: string | null
  changes: string[] | string
  author_name?: string
  released_at: string
  created_at: string
}

function formatDate(d: string): React.ReactNode {
  return <ClientDate date={d} format="date" />
}

export default function DeveloperChangelogsPage() {
  const { user: _user } = useAuth()
  const [changelogs, setChangelogs] = useState<Changelog[]>([])
  const [releases, setReleases] = useState<Release[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingReleases, setIsLoadingReleases] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editingTarget, setEditingTarget] = useState<Changelog | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Changelog | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Custom Dropdown states
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false)
  const [isGameDropdownOpen, setIsGameDropdownOpen] = useState(false)

  // Form states
  const [version, setVersion] = useState('')
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'web' | 'game'>('web')
  const [selectedGame, setSelectedGame] = useState<Release | null>(null)
  const [description, setDescription] = useState('')
  const [changesText, setChangesText] = useState('')

  const fetchChangelogs = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await api.get<{ status: string; data: { changelogs: Changelog[] } }>('/v1/changelogs')
      setChangelogs(res.data.changelogs || [])
    } catch {
      toast.error('Failed to load changelogs')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchReleases = useCallback(async (autoSelectGameId?: string | null) => {
    try {
      setIsLoadingReleases(true)
      const res = await api.get<{ status: string; data: { releases: Release[] } }>('/v1/releases')
      const fetched = res.data.releases || []
      setReleases(fetched)
      
      if (fetched.length > 0) {
        if (autoSelectGameId) {
          const matched = fetched.find(r => r.game_id === autoSelectGameId || r.id === autoSelectGameId)
          setSelectedGame(matched || fetched[0])
        } else if (!selectedGame) {
          setSelectedGame(fetched[0])
        }
      }
    } catch (err) {
      console.error('Failed to load releases for game selection:', err)
    } finally {
      setIsLoadingReleases(false)
    }
  }, [selectedGame])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching pattern
    fetchChangelogs()
  }, [fetchChangelogs])

  const openCreateModal = () => {
    setEditingTarget(null)
    setVersion('')
    setTitle('')
    setType('web')
    setSelectedGame(null)
    setDescription('')
    setChangesText('')
    setShowModal(true)
    fetchReleases()
  }

  const openEditModal = (item: Changelog) => {
    setEditingTarget(item)
    setVersion(item.version || '')
    setTitle(item.title || '')
    setType(item.type || 'web')
    setDescription(item.description || '')
    
    const parsedChanges: string[] = Array.isArray(item.changes)
      ? item.changes
      : typeof item.changes === 'string'
      ? JSON.parse(item.changes || '[]')
      : []
    setChangesText(parsedChanges.join('\n'))

    setShowModal(true)
    fetchReleases(item.game_id)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!version.trim() || !title.trim()) {
      toast.error('Please fill in required fields')
      return
    }

    if (type === 'game' && !selectedGame) {
      toast.error('Please select a game script for this changelog')
      return
    }

    const changesArray = changesText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)

    const payload = {
      version: version.trim(),
      title: title.trim(),
      type,
      game_name: type === 'game' ? (selectedGame?.game_name || selectedGame?.name) : null,
      game_id: type === 'game' ? selectedGame?.game_id : null,
      description: description.trim() || null,
      changes: changesArray,
    }

    try {
      setIsSubmitting(true)
      if (editingTarget) {
        await api.patch(`/v1/changelogs/${editingTarget.id}`, payload)
        toast.success('Changelog updated successfully!')
      } else {
        await api.post('/v1/changelogs', payload)
        toast.success('Changelog published successfully!')
      }
      setShowModal(false)
      fetchChangelogs()
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to save changelog'
      toast.error(errMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      setIsDeleting(true)
      await api.delete(`/v1/changelogs/${deleteTarget.id}`)
      toast.success('Changelog deleted successfully')
      setDeleteTarget(null)
      fetchChangelogs()
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to delete changelog'
      toast.error(errMsg)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Changelogs Management</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Publish and manage release notes for Website updates and Game Script releases.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:opacity-90 transition-opacity cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          Publish New Changelog
        </button>
      </div>

      {/* List / Feed */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs font-mono">Loading changelogs...</span>
        </div>
      ) : changelogs.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-border bg-card/40 p-8 space-y-3">
          <History className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
          <p className="text-sm font-medium text-foreground">No changelogs published yet</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Click the publish button above to add release notes for game scripts or web updates.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {changelogs.map((item) => {
            const parsedChanges: string[] = Array.isArray(item.changes)
              ? item.changes
              : typeof item.changes === 'string'
              ? JSON.parse(item.changes || '[]')
              : []

            return (
              <div
                key={item.id}
                className="rounded-xl border border-border bg-card/40 p-5 space-y-3 hover:border-border/80 transition-all"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-sm font-bold px-2 py-0.5 rounded border border-border bg-muted/40 text-foreground">
                      {item.version}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                      item.type === 'game'
                        ? 'border-purple-500/30 bg-purple-500/10 text-purple-400'
                        : 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                    }`}>
                      {item.type === 'game' ? <Gamepad2 className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                      {item.type === 'game' ? 'Game Script' : 'Web Platform'}
                    </span>
                    {item.type === 'game' && item.game_name && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border border-border bg-muted/30 text-muted-foreground">
                        <Gamepad className="h-3 w-3 text-primary" />
                        {item.game_name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-muted-foreground mr-1">
                      {formatDate(item.released_at || item.created_at)}
                    </span>
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-all cursor-pointer"
                      title="Edit Changelog"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(item)}
                      className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                      title="Delete Changelog"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-foreground">{item.title}</h3>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                  )}
                </div>

                {parsedChanges.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {parsedChanges.map((change, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Tag className="h-3 w-3 text-muted-foreground/60 mt-0.5 shrink-0" />
                        <span>{change}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal / Dialog for Publishing and Editing */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in fade-in-0 zoom-in-95 overflow-visible">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                {editingTarget ? <Pencil className="h-4 w-4 text-primary" /> : <Sparkles className="h-4 w-4 text-primary" />}
                <h2 className="text-base font-bold text-foreground">
                  {editingTarget ? 'Edit Changelog Entry' : 'Publish New Changelog'}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Version Input */}
                <div>
                  <label className="block text-[11px] font-mono font-semibold text-muted-foreground uppercase mb-1">
                    Version <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. v1.0.2"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Custom Target Type Dropdown */}
                <div className="relative">
                  <label className="block text-[11px] font-mono font-semibold text-muted-foreground uppercase mb-1">
                    Target Type <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTypeDropdownOpen(!isTypeDropdownOpen)
                      setIsGameDropdownOpen(false)
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground flex items-center justify-between hover:border-border/80 cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      {type === 'web' ? <Globe className="h-3.5 w-3.5 text-blue-400" /> : <Gamepad2 className="h-3.5 w-3.5 text-purple-400" />}
                      {type === 'web' ? 'Web Platform' : 'Game Script'}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>

                  {isTypeDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-border bg-card shadow-xl p-1 space-y-1 animate-in fade-in-0 zoom-in-95">
                      <button
                        type="button"
                        onClick={() => {
                          setType('web')
                          setIsTypeDropdownOpen(false)
                        }}
                        className={`w-full px-3 py-2 rounded-md text-xs text-left flex items-center justify-between cursor-pointer transition-colors ${
                          type === 'web' ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-muted/40'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 text-blue-400" />
                          Web Platform
                        </span>
                        {type === 'web' && <Check className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setType('game')
                          setIsTypeDropdownOpen(false)
                        }}
                        className={`w-full px-3 py-2 rounded-md text-xs text-left flex items-center justify-between cursor-pointer transition-colors ${
                          type === 'game' ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-muted/40'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Gamepad2 className="h-3.5 w-3.5 text-purple-400" />
                          Game Script
                        </span>
                        {type === 'game' && <Check className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Conditional Game Selection Dropdown (When Game Script is chosen) */}
              {type === 'game' && (
                <div className="relative animate-in fade-in-0 slide-in-from-top-2 duration-200">
                  <label className="block text-[11px] font-mono font-semibold text-muted-foreground uppercase mb-1">
                    Select Release / Game Script <span className="text-rose-500">*</span>
                  </label>
                  {isLoadingReleases ? (
                    <div className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      <span>Loading game releases...</span>
                    </div>
                  ) : releases.length === 0 ? (
                    <div className="w-full px-3 py-2 rounded-lg border border-rose-500/20 bg-rose-500/5 text-xs text-rose-400">
                      No game releases found. Please publish a release in Studio first.
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setIsGameDropdownOpen(!isGameDropdownOpen)
                          setIsTypeDropdownOpen(false)
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground flex items-center justify-between hover:border-border/80 cursor-pointer transition-colors"
                      >
                        <span className="flex items-center gap-2 font-medium truncate">
                          <Gamepad className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="truncate">{selectedGame ? (selectedGame.game_name || selectedGame.name) : 'Select a game script...'}</span>
                          {selectedGame && <span className="text-[10px] font-mono text-muted-foreground">({selectedGame.version})</span>}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </button>

                      {isGameDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 z-50 max-h-48 overflow-y-auto rounded-lg border border-border bg-card shadow-xl p-1 space-y-1 animate-in fade-in-0 zoom-in-95">
                          {releases.map((rel) => {
                            const isSelected = selectedGame?.id === rel.id
                            return (
                              <button
                                key={rel.id}
                                type="button"
                                onClick={() => {
                                  setSelectedGame(rel)
                                  setIsGameDropdownOpen(false)
                                }}
                                className={`w-full px-3 py-2 rounded-md text-xs text-left flex items-center justify-between cursor-pointer transition-colors ${
                                  isSelected ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-muted/40'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <Gamepad className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <span className="truncate font-medium">{rel.game_name || rel.name}</span>
                                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">({rel.version})</span>
                                </div>
                                {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-mono font-semibold text-muted-foreground uppercase mb-1">
                  Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Anti-Cheat Bypass Update & Performance Fixes"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-semibold text-muted-foreground uppercase mb-1">
                  Short Description
                </label>
                <input
                  type="text"
                  placeholder="Optional summary note..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-semibold text-muted-foreground uppercase mb-1">
                  Changes List (One per line)
                </label>
                <textarea
                  rows={4}
                  placeholder="[New] Added auto-farm feature for Blox Fruits&#10;[Fixed] Resolved crash on execution teleport&#10;[Improved] VM execution speed increased by 30%"
                  value={changesText}
                  onChange={(e) => setChangesText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingTarget ? 'Save Changes' : 'Publish Release Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern Confirmation Dialog for Deletion */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Delete Changelog Entry?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to delete <span className="font-mono font-bold text-foreground">{deleteTarget.version}</span> ({deleteTarget.title})? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 text-white font-medium text-xs hover:bg-rose-700 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
