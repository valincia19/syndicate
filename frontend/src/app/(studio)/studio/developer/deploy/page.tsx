'use client'

import { useEffect, useState, useRef, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { api, tokenManager } from '@/lib/api'
import { Upload, CheckCircle, FileText, Loader2, AlertCircle, ArrowLeft, Folder, FolderOpen, ChevronRight, ChevronDown, Plus, Home, Clock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'

import { cn } from '@/lib/utils'

interface Release {
  id: string; name: string; version: string
  status?: 'draft' | 'published' | 'deprecated'
  file_path: string; file_url: string; user_id: string
  created_at: string; developer_name?: string; developer_email?: string
}

const STATUS_CONFIG = {
  published:  { label: 'Published',  icon: CheckCircle,  badgeClass: 'bg-blue-500/10 text-blue-500 dark:text-blue-400 border-blue-500/20' },
  draft:      { label: 'Draft',      icon: Clock,        badgeClass: 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20' },
  deprecated: { label: 'Deprecated', icon: AlertTriangle, badgeClass: 'bg-muted/30 text-muted-foreground border-border/40' },
}

interface FolderItem {
  id: string
  name: string
  parent_id: string | null
  user_id: string
  script_count: number
  subfolder_count: number
  creator_name?: string
  created_at?: string
  children?: FolderItem[]
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 60000) return 'just now'
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function FolderTreeItem({
  folder,
  depth,
  selectedFolderId,
  expandedFolders,
  onToggle,
  onSelect,
}: {
  folder: FolderItem
  depth: number
  selectedFolderId: string | null
  expandedFolders: Set<string>
  onToggle: (id: string) => void
  onSelect: (id: string, name: string) => void
}) {
  const hasChildren = folder.subfolder_count > 0
  const isExpanded = expandedFolders.has(folder.id)
  const isSelected = selectedFolderId === folder.id

  return (
    <>
      <button
        onClick={() => {
          if (hasChildren) onToggle(folder.id)
          onSelect(folder.id, folder.name)
        }}
        className={cn(
          "flex items-center gap-2 w-full px-2.5 py-1.5 text-[10px] font-mono rounded-md transition-all cursor-pointer text-left",
          isSelected ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
        )}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {hasChildren ? (
          isExpanded ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />
        ) : (
          <span className="w-3 h-3 shrink-0" />
        )}
        {isExpanded ? <FolderOpen className="w-3.5 h-3.5 shrink-0 text-amber-500" /> : <Folder className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />}
        <span className={cn("truncate", isSelected && "font-bold")}>{folder.name}</span>
        <span className="ml-auto text-[8px] text-muted-foreground/40 shrink-0">{folder.script_count}</span>
      </button>
      {hasChildren && isExpanded && (
        <SubFolderList
          parentId={folder.id}
          depth={depth + 1}
          selectedFolderId={selectedFolderId}
          expandedFolders={expandedFolders}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      )}
    </>
  )
}

function SubFolderList({
  parentId,
  depth,
  selectedFolderId,
  expandedFolders,
  onToggle,
  onSelect,
}: {
  parentId: string
  depth: number
  selectedFolderId: string | null
  expandedFolders: Set<string>
  onToggle: (id: string) => void
  onSelect: (id: string, name: string) => void
}) {
  const [subFolders, setSubFolders] = useState<FolderItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchSub = async () => {
      try {
        const res = await api.get<{ status: string; data: { folders: FolderItem[] } }>(`/v1/scripts/folders?parent_id=${parentId}`)
        setSubFolders(res.data.folders || [])
      } catch { /* ignore */ }
      finally { setIsLoading(false) }
    }
    fetchSub()
  }, [parentId])

  if (isLoading) return (
    <div className="flex items-center justify-center py-1">
      <Loader2 className="w-3 h-3 animate-spin text-muted-foreground/30" />
    </div>
  )

  return (
    <>
      {subFolders.map((f) => (
        <FolderTreeItem
          key={f.id}
          folder={f}
          depth={depth}
          selectedFolderId={selectedFolderId}
          expandedFolders={expandedFolders}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      ))}
    </>
  )
}

export default function DeveloperDeployPage() {
  return (
    <Suspense fallback={<LoadingShell />}>
      <DeployContent />
    </Suspense>
  )
}

function DeployContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [releases, setReleases] = useState<Release[]>([])
  const [isLoadingReleases, setIsLoadingReleases] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderId = searchParams.get('folder') || null

  // Folder tree
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [isLoadingFolders, setIsLoadingFolders] = useState(true)
  const [isFolderOpen, setIsFolderOpen] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(folderId)
  const [selectedFolderName, setSelectedFolderName] = useState<string>('Root')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const folderDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => { Promise.resolve().then(() => setMounted(true)) }, [])

  const fetchReleases = useCallback(async () => {
    setIsLoadingReleases(true)
    try {
      const qs = selectedFolderId ? `?folder_id=${selectedFolderId}` : ''
      const res = await api.get<{ status: string; data: { scripts: Release[] } }>(`/v1/scripts${qs}`)
      setReleases(res.data.scripts || [])
    } catch (err) { console.error('Failed to fetch:', err) }
    finally { setIsLoadingReleases(false) }
  }, [selectedFolderId])

  const fetchFolders = useCallback(async () => {
    try {
      const res = await api.get<{ status: string; data: { folders: FolderItem[] } }>('/v1/scripts/folders')
      setFolders(res.data.folders || [])
    } catch (err) { console.error('Failed to fetch folders:', err) }
    finally { setIsLoadingFolders(false) }
  }, [])

  useEffect(() => {
    if (!isLoading && mounted) {
      if (!user || !['owner', 'developer'].includes(user.role)) {
        router.push('/studio')
      } else {
        Promise.resolve().then(() => { fetchFolders() })
      }
    }
  }, [user, isLoading, mounted, fetchFolders, router])

  // Click outside to close folder dropdown
  useEffect(() => {
    if (!isFolderOpen) return
    const handler = (e: MouseEvent) => {
      if (folderDropdownRef.current && !folderDropdownRef.current.contains(e.target as Node)) {
        setIsFolderOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isFolderOpen])

  // Re-fetch releases when target folder changes
  useEffect(() => {
    if (!mounted || !user) return
    let isMounted = true;
    (async () => {
      try {
        setIsLoadingReleases(true)
        const qs = selectedFolderId ? `?folder_id=${selectedFolderId}` : ''
        const res = await api.get<{ status: string; data: { scripts: Release[] } }>(`/v1/scripts${qs}`)
        if (!isMounted) return
        setReleases(res.data.scripts || [])
      } catch (err) { console.error('Failed to fetch:', err) }
      finally { if (isMounted) setIsLoadingReleases(false) }
    })()
    return () => { isMounted = false }
  }, [selectedFolderId, mounted, user])

  const handleFileUpload = async (file: File) => {
    if (!file) return
    if (!file.name.endsWith('.lua') && !file.name.endsWith('.txt')) { setUploadError('Only .lua or .txt files are allowed.'); return }
    setIsUploading(true); setUploadError(null); setUploadSuccess(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (selectedFolderId) formData.append('folder_id', selectedFolderId)

      const token = tokenManager.getToken()
      const headers = new Headers()
      if (token) headers.set("Authorization", `Bearer ${token}`)

      const res = await fetch('/v1/scripts', { method: 'POST', headers, body: formData, credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Upload failed')

      setUploadSuccess(`Deployed ${file.name}!`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      fetchReleases()
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally { setIsUploading(false) }
  }

  if (isLoading || !mounted) return <LoadingShell />
  if (!user || !['owner', 'developer'].includes(user.role)) return null

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-black tracking-tight text-foreground uppercase">Deploy Scripts</h1>
          <p className="text-[11px] text-muted-foreground">
            Upload Lua scripts {selectedFolderId && <span className="text-primary font-bold font-mono">to {selectedFolderName}</span>}
          </p>
        </div>
        <Link
          href={`/studio/developer/scripts${selectedFolderId ? `?folder=${selectedFolderId}` : ''}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 border border-border/50 text-[10px] font-mono text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Scripts
        </Link>
      </div>

      {/* Folder Target Selector */}
      <div className="relative" ref={folderDropdownRef}>
        <button
          onClick={() => setIsFolderOpen(!isFolderOpen)}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-border bg-card hover:border-primary/30 text-foreground transition-all cursor-pointer text-left"
        >
          <Folder className="w-4 h-4 text-primary shrink-0" />
          <span className="text-[11px] font-mono flex-1">
            Target: <span className="font-bold text-primary">{selectedFolderName}</span>
          </span>
          <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", isFolderOpen && "rotate-180")} />
        </button>

        {isFolderOpen && (
          <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="max-h-60 overflow-y-auto p-1 space-y-0.5">
              {/* Root option */}
              <button
                onClick={() => { setSelectedFolderId(null); setSelectedFolderName('Root'); setIsFolderOpen(false) }}
                className={cn(
                  "flex items-center gap-2 w-full px-2.5 py-2 text-[10px] font-mono rounded-md transition-all cursor-pointer text-left",
                  !selectedFolderId ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                <Home className="w-3.5 h-3.5 shrink-0" />
                <span className="font-semibold">Root</span>
                <span className="ml-auto text-[9px] text-muted-foreground/50">No folder</span>
              </button>
              <div className="border-t border-border/40 mx-2" />

              {/* Folder tree */}
              {isLoadingFolders ? (
                <div className="flex items-center justify-center py-4 gap-2">
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  <span className="text-[10px] font-mono text-muted-foreground">Loading folders...</span>
                </div>
              ) : folders.length === 0 ? (
                <div className="py-4 text-center text-[10px] font-mono text-muted-foreground/50">No folders yet</div>
              ) : (
                folders.map((folder) => (
                  <FolderTreeItem
                    key={folder.id}
                    folder={folder}
                    depth={0}
                    selectedFolderId={selectedFolderId}
                    expandedFolders={expandedFolders}
                    onToggle={(id) => {
                      setExpandedFolders(prev => {
                        const next = new Set(prev)
                        if (next.has(id)) next.delete(id)
                        else next.add(id)
                        return next
                      })
                    }}
                    onSelect={(id, name) => {
                      setSelectedFolderId(id)
                      setSelectedFolderName(name)
                      setIsFolderOpen(false)
                    }}
                  />
                ))
              )}

              <div className="border-t border-border/40 mx-2" />
              {/* Create folder button */}
              {isCreatingFolder ? (
                <div className="p-2 space-y-1.5">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Folder name..."
                    className="w-full px-2 py-1.5 text-[10px] font-mono rounded-md border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground/30 focus:outline-hidden focus:border-primary/50"
                    autoFocus
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && newFolderName.trim()) {
                        try {
                          await api.post('/v1/scripts/folders', { name: newFolderName.trim(), parent_id: null })
                          fetchFolders()
                          setNewFolderName('')
                          setIsCreatingFolder(false)
                        } catch { /* ignore */ }
                      }
                      if (e.key === 'Escape') { setIsCreatingFolder(false); setNewFolderName('') }
                    }}
                  />
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={async () => {
                        if (!newFolderName.trim()) return
                        try {
                          await api.post('/v1/scripts/folders', { name: newFolderName.trim(), parent_id: null })
                          fetchFolders()
                          setNewFolderName('')
                          setIsCreatingFolder(false)
                        } catch { /* ignore */ }
                      }}
                      className="px-2 py-1 text-[9px] font-mono bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-all cursor-pointer"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => { setIsCreatingFolder(false); setNewFolderName('') }}
                      className="px-2 py-1 text-[9px] font-mono text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreatingFolder(true)}
                  className="flex items-center gap-2 w-full px-2.5 py-2 text-[10px] font-mono text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Folder
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <input type="file" ref={fileInputRef}
            onChange={(e) => { const files = e.target.files; if (files?.length) handleFileUpload(files[0]) }}
            accept=".lua,.txt" className="hidden" />
          <div
            onClick={() => !isUploading && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); if (!isUploading) setIsDragOver(true) }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragOver(false); if (isUploading) return; const files = e.dataTransfer.files; if (files?.length) handleFileUpload(files[0]) }}
            className={cn(
              "border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-3",
              isUploading ? "border-muted bg-muted/5 cursor-not-allowed opacity-60"
              : isDragOver ? "border-primary bg-primary/5 scale-[1.002] shadow-md shadow-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/20 bg-muted/10 hover:scale-[1.002]"
            )}>
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
              isUploading ? "bg-primary/10 text-primary animate-pulse" : "bg-muted text-muted-foreground/60"
            )}>
              {isUploading ? <Loader2 className="w-6 h-6 animate-spin text-primary" />
                : <Upload className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground mb-1 uppercase tracking-wider font-mono">
                {isUploading ? "Uploading & Deploying..." : "Drop Lua files here"}
              </h3>
              <p className="text-[10px] text-muted-foreground font-mono">
                {isUploading ? "Saving to Cloudflare R2 object storage" : ".lua or .txt · or click to browse from system files"}
              </p>
            </div>
          </div>
          {uploadError && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-[11px] font-mono leading-relaxed">{uploadError}</p>
            </div>
          )}
          {uploadSuccess && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-500">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-[11px] font-mono leading-relaxed">{uploadSuccess}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-3.5 py-2 border-b border-border/60 bg-muted/20">
          <h3 className="text-[9.5px] font-mono text-muted-foreground uppercase tracking-wider font-bold">Recent Deployments</h3>
        </div>
        {isLoadingReleases ? (
          <div className="flex items-center justify-center py-6 gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground/40" />
            <span className="text-[9px] font-mono text-muted-foreground/50">Loading recent deployments...</span>
          </div>
        ) : releases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 gap-1.5">
            <FileText className="w-6 h-6 text-muted-foreground/15" />
            <span className="text-[9px] font-mono text-muted-foreground/40">No script deployments found</span>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {releases.map((r) => {
              const statusKey = r.status || 'published'
              const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.published
              const StatusIcon = cfg.icon
              return (
                <div key={r.id} className="flex items-center justify-between gap-2.5 px-3 py-1.5 hover:bg-muted/15 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-3 h-3 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10.5px] font-medium text-foreground truncate flex items-center gap-1.5 leading-tight">
                        <span>{r.name}</span>
                        {r.version && <span className="text-[8.5px] font-mono text-muted-foreground/60">v{r.version}</span>}
                      </div>
                      <div className="text-[8.5px] text-muted-foreground/70 font-mono truncate leading-none mt-0.5">
                        deployed {relativeTime(r.created_at)} · {r.developer_name || r.developer_email || 'Developer'}
                      </div>
                    </div>
                  </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[7.5px] font-mono shrink-0 border ${cfg.badgeClass}`}>
                        <StatusIcon className="w-2.5 h-2.5" />
                        {cfg.label}
                      </span>
                      <Link href={`/studio/developer/scripts?script=${r.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-5 px-1.5 text-[8.5px] font-mono")}>
                        Source
                      </Link>
                    </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function LoadingShell() {
  return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-muted-foreground font-mono text-xs animate-pulse">Loading deploy options...</div></div>
}
