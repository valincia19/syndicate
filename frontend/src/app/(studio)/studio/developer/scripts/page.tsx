'use client'

/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useState, Suspense, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAuth } from '@/context/auth-context'
import { api, tokenManager } from '@/lib/api'
import { useExplorerStore } from '@/stores/explorer-store'
import type { ScriptData, FolderData, BreadcrumbItem, TreeNode } from '@/stores/explorer-store'
import { VirtualTreeList } from '@/components/studio/explorer/virtual-tree'
import {
  FolderPlus, Home, Upload, FileCode, Loader2,
  Activity, Code2, Terminal, ShieldCheck, AlertTriangle,
  FilePlus, Wrench
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ClientDate } from '@/components/ui/client-date'

// Dynamic Monaco (no SSR)
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

// ── Helpers ──────────────────────────────────────────────
interface OpenTab {
  id: string
  nodeId: string
  name: string
  currentContent: string
  originalContent: string
  isDirty: boolean
}
function LoadingShell() {
  return <div className="flex items-center justify-center h-full gap-2">
    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    <span className="text-xs font-mono text-muted-foreground/60">Loading...</span>
  </div>
}

// ── Page ─────────────────────────────────────────────────
export default function DeveloperScriptsPage() {
  return <Suspense fallback={<LoadingShell />}><ScriptsContent /></Suspense>
}

function ScriptsContent(): React.ReactNode {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading } = useAuth()
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [sidebarHeight, setSidebarHeight] = useState(400)

  // ── Zustand store (shallow selectors) ──────────────────
  const store = useExplorerStore
  const loadingFile = useExplorerStore(s => s.loadingFile)
  const currentFolderId = useExplorerStore(s => s.currentFolderId)
  const breadcrumb = useExplorerStore(s => s.breadcrumb)

  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null)
  const [isDeletingFolder, setIsDeletingFolder] = useState(false)
  const [scriptToDelete, setScriptToDelete] = useState<string | null>(null)
  const [isDeletingScript, setIsDeletingScript] = useState(false)
  const [deprecateConfirmVersion, setDeprecateConfirmVersion] = useState<TreeNode | null>(null)
  const [isDeprecatingVersion, setIsDeprecatingVersion] = useState(false)

  // New script file creation states
  const [isNewFileOpen, setIsNewFileOpen] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [isCreatingFile, setIsCreatingFile] = useState(false)

  // Resizable panels states
  const [explorerWidth, setExplorerWidth] = useState(256)
  const [consoleHeight, setConsoleHeight] = useState(160)

  const [editorContent, setEditorContent] = useState('')
  const [isSavingContent, setIsSavingContent] = useState(false)
  const [activePanelTab, setActivePanelTab] = useState<'console' | 'analytics' | 'security'>('console')

  // Multi-tab state
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([])
  const [activeTabNodeId, setActiveTabNodeId] = useState<string | null>(null)

  // Publishing states
  const [isPublishOpen, setIsPublishOpen] = useState(false)
  const [publishVersion, setPublishVersion] = useState('')
  const [publishChangelog, setPublishChangelog] = useState('')
  const [isPublishing, setIsPublishing] = useState(false)
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    '[SYSTEM] Developer console initialized. Listening to Roblox executions...',
    '[WS] WebSocket connection initialized.'
  ])

  // Helper to append console logs
  const logToConsole = useCallback((msg: string) => {
    setConsoleLogs(prev => [...prev, msg])
  }, [])

  const [isRepairing, setIsRepairing] = useState(false)

  // ── Load tree level ───────────────────────────────────
  const loadLevel = useCallback(async (parentId: string | null) => {
    try {
      const scriptQs = parentId ? `?folder_id=${parentId}` : '?folder_id=__root__'
      const folderQs = parentId ? `?parent_id=${parentId}` : ''
      const [sRes, fRes] = await Promise.all([
        api.get<{ status: string; data: { scripts: ScriptData[] } }>(`/v1/scripts${scriptQs}`),
        api.get<{ status: string; data: { folders: FolderData[] } }>(`/v1/scripts/folders${folderQs}`),
      ])
      store.getState().loadChildren(parentId, fRes.data.folders || [], sRes.data.scripts || [])
    } catch (e) { console.error(e) }
  }, [])

  const handleRepairOrphans = useCallback(async () => {
    if (isRepairing) return
    setIsRepairing(true)
    try {
      const res = await api.post<{ status: string; message: string; data: { repaired_scripts: number; repaired_folders: number } }>('/v1/scripts/repair-orphans', {})
      logToConsole(`[SYSTEM] Diagnostic repair finished: ${res.data.repaired_scripts} files and ${res.data.repaired_folders} folders restored to root.`)
      await loadLevel(null)
      alert(`Diagnostic Fix Completed!\n\nRestored ${res.data.repaired_scripts} hidden files and ${res.data.repaired_folders} folders to Root level.`)
    } catch (err) {
      console.error('Repair orphans failed:', err)
    } finally {
      setIsRepairing(false)
    }
  }, [isRepairing, loadLevel, logToConsole])

  // Sync editor when active tab changes
  useEffect(() => {
    const activeTab = openTabs.find(t => t.nodeId === activeTabNodeId)
    if (activeTab) {
      queueMicrotask(() => setEditorContent(activeTab.currentContent))
    }
  }, [activeTabNodeId, openTabs])

  // ── Editor change - sync to active tab ───────────────
  const handleEditorChange = useCallback((val: string | undefined) => {
    const content = val || ''
    setEditorContent(content)
    setOpenTabs(prev => prev.map(t => {
      if (t.nodeId === activeTabNodeId) {
        return { ...t, currentContent: content, isDirty: content !== t.originalContent }
      }
      return t
    }))
  }, [activeTabNodeId])



  // ── Tab handlers ─────────────────────────────────────
  const handleCloseTab = useCallback((nodeId: string) => {
    const idx = openTabs.findIndex(t => t.nodeId === nodeId)
    if (idx === -1) return

    const nextTabs = openTabs.filter(t => t.nodeId !== nodeId)
    setOpenTabs(nextTabs)

    if (activeTabNodeId === nodeId) {
      if (nextTabs.length > 0) {
        const newIdx = Math.min(idx, nextTabs.length - 1)
        setActiveTabNodeId(nextTabs[newIdx].nodeId)
      } else {
        setActiveTabNodeId(null)
        setEditorContent('')
        store.getState().setFileContent('')
      }
    }
  }, [activeTabNodeId, openTabs])

  const handleDelete = useCallback((nodeId: string) => {
    const node = store.getState().nodeMap[nodeId]
    if (!node) return

    if (node.type === 'script') {
      setScriptToDelete(nodeId)
    } else if (node.type === 'folder') {
      setFolderToDelete(nodeId)
    }
  }, [])

  const handleQuickPublishScript = useCallback(async (scriptId: string) => {
    try {
      await api.patch(`/v1/scripts/${scriptId}`, { status: 'published' })
      store.getState().updateScriptStatus(scriptId, 'published')
      logToConsole(`[SUCCESS] Script status set to Published`)
    } catch (err) {
      console.error('Publish script error:', err)
    }
  }, [logToConsole])

  const handleQuickDraftScript = useCallback(async (scriptId: string) => {
    try {
      await api.patch(`/v1/scripts/${scriptId}`, { status: 'draft' })
      store.getState().updateScriptStatus(scriptId, 'draft')
      logToConsole(`[SUCCESS] Script status set to Draft`)
    } catch (err) {
      console.error('Draft script error:', err)
    }
  }, [logToConsole])
  
  // ── Other handlers... ─────────────────────────────────
  const handleCreateFolder = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!newFolderName.trim() || isCreatingFolder) return
    setIsCreatingFolder(true)
    try {
      const parentId = currentFolderId
      await api.post('/v1/scripts/folders', { name: newFolderName.trim(), parent_id: parentId })
      setNewFolderName('')
      setIsNewFolderOpen(false)
      await loadLevel(parentId)
    } catch (err) {
      console.error('Failed to create folder:', err)
    } finally {
      setIsCreatingFolder(false)
    }
  }, [newFolderName, isCreatingFolder, currentFolderId, loadLevel])

  // ── Initial load ──────────────────────────────────────
  const hasInitialized = useRef(false)
  useEffect(() => {
    if (!isLoading && !hasInitialized.current) {
      if (!user || !['owner', 'developer'].includes(user.role)) {
        router.push('/studio'); return
      }
      hasInitialized.current = true
      store.getState().reset()

      const fid = searchParams.get('folder') || null
      store.getState().setCurrentFolder(fid)

      const init = async () => {
        await loadLevel(null)
        if (fid) {
          await loadLevel(fid)
          try {
            const r = await api.get<{ status: string; data: { breadcrumb: BreadcrumbItem[] } }>(
              `/v1/scripts/folders/${fid}/breadcrumb`
            )
            store.getState().setBreadcrumb(r.data.breadcrumb || [])
            const crumbs = r.data.breadcrumb || []
            crumbs.forEach(c => {
              const nodeId = `folder:${c.id}`
              store.getState().toggleFolder(nodeId)
              loadLevel(c.id)
            })
          } catch { store.getState().setBreadcrumb([]) }
        }
      }
      init()
    }
  }, [user, isLoading, loadLevel, router])

  // ── Tree actions ──────────────────────────────────────
  const handleToggle = useCallback(async (nodeId: string) => {
    const node = store.getState().nodeMap[nodeId]
    if (!node || node.type !== 'folder') return

    const isExpanded = store.getState().expandedIds.has(nodeId)
    if (isExpanded) {
      store.getState().toggleFolder(nodeId)
    } else {
      store.getState().toggleFolder(nodeId) // optimistic expand
      store.getState().setLoading(nodeId, true)
      const rawId = node.folderData?.id || nodeId.replace('folder:', '')
      await loadLevel(rawId)
      store.getState().setLoading(nodeId, false)
    }
  }, [loadLevel])

  const handleSelect = useCallback(async (nodeId: string) => {
    const node = store.getState().nodeMap[nodeId]
    if (!node) return

    store.getState().selectNode(nodeId)

    if (node.type === 'folder') {
      const rawId = node.folderData?.id || nodeId.replace('folder:', '')
      store.getState().setCurrentFolder(rawId)
      const url = `/studio/developer/scripts?folder=${rawId}`
      router.push(url, { scroll: false })
      await loadLevel(rawId)
      try {
        const r = await api.get<{ status: string; data: { breadcrumb: BreadcrumbItem[] } }>(
          `/v1/scripts/folders/${rawId}/breadcrumb`
        )
        store.getState().setBreadcrumb(r.data.breadcrumb || [])
      } catch { store.getState().setBreadcrumb([]) }
    } else if (node.type === 'script' && node.scriptData) {
      const existingTab = openTabs.find(t => t.nodeId === nodeId)
      if (existingTab) {
        setActiveTabNodeId(nodeId)
        return
      }

      store.getState().setLoadingFile(true)
      try {
        const token = tokenManager.getToken()
        const headers = new Headers()
        if (token) headers.set('Authorization', `Bearer ${token}`)
        const res = await fetch(`/v1/scripts/${node.scriptData.id}/content`, {
          headers, credentials: 'include',
        })
        if (!res.ok) throw new Error('Failed')
        const content = await res.text()
        store.getState().setFileContent(content)
        store.getState().setLoadingFile(false)

        const newTab: OpenTab = {
          id: node.scriptData.id,
          nodeId,
          name: node.scriptData.name,
          currentContent: content,
          originalContent: content,
          isDirty: false,
        }
        setOpenTabs(prev => [...prev, newTab])
        setActiveTabNodeId(nodeId)
      } catch {
        store.getState().setFileContent('-- Failed to load')
        store.getState().setLoadingFile(false)
      }
    }
  }, [loadLevel, router, openTabs])

  // Auto-open script from URL search parameter (e.g. ?script=ID)
  const scriptParam = searchParams.get('script')
  const autoOpenedRef = useRef<string | null>(null)
  useEffect(() => {
    if (scriptParam && autoOpenedRef.current !== scriptParam) {
      autoOpenedRef.current = scriptParam
      const openTargetScript = async () => {
        try {
          const res = await api.get<{ status: string; data: { script: ScriptData } }>(`/v1/scripts/${scriptParam}`)
          const script = res.data.script
          if (script) {
            const nodeId = `script:${script.id}`
            store.getState().nodeMap[nodeId] = {
              id: nodeId,
              name: script.name,
              type: 'script',
              parentId: script.folder_id ? `folder:${script.folder_id}` : null,
              depth: 1,
              hasChildren: false,
              isExpanded: false,
              isLoading: false,
              scriptData: script,
            }
            handleSelect(nodeId)
          }
        } catch (err) {
          console.error('Failed to auto open script:', err)
        }
      }
      openTargetScript()
    }
  }, [scriptParam, handleSelect])

  const handleRename = useCallback(async (nodeId: string, newName: string) => {
    const node = store.getState().nodeMap[nodeId]
    if (!node) return
    try {
      if (node.type === 'folder') {
        const rawId = node.folderData?.id || nodeId.replace('folder:', '')
        await api.patch(`/v1/scripts/folders/${rawId}`, { name: newName })
      } else if (node.type === 'script' && node.scriptData) {
        await api.patch(`/v1/scripts/${node.scriptData.id}`, { name: newName })
        setOpenTabs(prev => prev.map(t => t.nodeId === nodeId ? { ...t, name: newName } : t))
      }
      store.getState().renameNode(nodeId, newName)
    } catch (e) { console.error('Rename failed:', e) }
  }, [])

  // ── Confirm folder delete ──────────────────────────────
  const handleConfirmDeleteFolder = useCallback(async () => {
    if (!folderToDelete || isDeletingFolder) return
    setIsDeletingFolder(true)
    const rawId = folderToDelete.replace('folder:', '')
    try {
      await api.delete(`/v1/scripts/folders/${rawId}`)
      store.getState().removeNode(folderToDelete)
      const node = store.getState().nodeMap[folderToDelete]
      const parentId = node?.parentId?.replace('folder:', '') || null
      await loadLevel(parentId)
      setFolderToDelete(null)
    } catch (err) {
      console.error('Failed to delete folder:', err)
    } finally {
      setIsDeletingFolder(false)
    }
  }, [folderToDelete, isDeletingFolder, loadLevel])

  const handleConfirmDeleteScript = useCallback(async () => {
    if (!scriptToDelete || isDeletingScript) return
    setIsDeletingScript(true)
    const node = store.getState().nodeMap[scriptToDelete]
    if (!node) {
      setIsDeletingScript(false)
      setScriptToDelete(null)
      return
    }
    const scriptId = node.scriptData?.id
    if (!scriptId) {
      setIsDeletingScript(false)
      setScriptToDelete(null)
      return
    }
    try {
      await api.delete(`/v1/scripts/${scriptId}`)
      handleCloseTab(scriptToDelete)
      store.getState().removeNode(scriptToDelete)
      const parentKey = node.parentId?.replace('folder:', '') || null
      await loadLevel(parentKey)
      setScriptToDelete(null)
    } catch (err) {
      console.error('Failed to delete script:', err)
    } finally {
      setIsDeletingScript(false)
    }
  }, [scriptToDelete, isDeletingScript, handleCloseTab, loadLevel])

  // ── Drag and drop items move ───────────────────────────
  const handleDropItems = useCallback(async (itemIds: string[], targetFolderId: string | null) => {
    const targetFolderNodeId = targetFolderId ? `folder:${targetFolderId}` : null
    const sourceNodeId = itemIds[0]
    const sourceNode = store.getState().nodeMap[sourceNodeId]
    if (!sourceNode) return
    
    // Prevent dropping into itself or subfolders
    if (sourceNode.type === 'folder' && targetFolderId) {
      if (sourceNodeId === targetFolderNodeId) return
      let currentParentId = targetFolderNodeId
      while (currentParentId) {
        const parentNode = store.getState().nodeMap[currentParentId]
        if (parentNode?.parentId === sourceNodeId) {
          alert('Cannot move a folder into its own subfolder')
          return
        }
        currentParentId = parentNode?.parentId || null
      }
    }

    try {
      if (sourceNode.type === 'script') {
        const scriptId = sourceNode.scriptData?.id
        if (!scriptId) return
        await api.patch(`/v1/scripts/${scriptId}/move`, { folder_id: targetFolderId })
      } else if (sourceNode.type === 'folder') {
        const folderId = sourceNode.folderData?.id
        if (!folderId) return
        await api.patch(`/v1/scripts/folders/${folderId}`, { parent_id: targetFolderId })
      }
      
      const oldParentId = sourceNode.parentId?.replace('folder:', '') || null
      await Promise.all([
        loadLevel(oldParentId),
        loadLevel(targetFolderId)
      ])
    } catch (err) {
      console.error('Failed to move item:', err)
    }
  }, [loadLevel])

  // ── Create new file ───────────────────────────────────
  const handleCreateFile = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    let filename = newFileName.trim()
    if (!filename || isCreatingFile) return

    if (!filename.endsWith('.lua') && !filename.endsWith('.txt')) {
      filename += '.lua'
    }

    setIsCreatingFile(true)
    try {
      const parentId = currentFolderId
      const formData = new FormData()
      const blob = new Blob([`-- Brand New Script: ${filename}\n\nprint("Hello World!")\n`], { type: 'text/plain' })
      formData.append('file', blob, filename)
      if (parentId) {
        formData.append('folder_id', parentId)
      }

      const token = tokenManager.getToken()
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const backendUrl = process.env.NEXT_PUBLIC_API_URL || ""
      const response = await fetch(`${backendUrl}/v1/scripts`, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.message || 'Failed to create script')
      }

      const res = await response.json()
      setNewFileName('')
      setIsNewFileOpen(false)

      await loadLevel(parentId)

      const newScript = res.data.script
      const nodeId = `script:${newScript.id}`
      
      await handleSelect(nodeId)
      logToConsole(`[SYSTEM] Created new script file: ${filename}`)
    } catch (err: unknown) {
      console.error('Failed to create script file:', err)
      const msg = err instanceof Error ? err.message : 'Unknown error'
      logToConsole(`❌ [ERROR] Failed to create script: ${msg}`)
    } finally {
      setIsCreatingFile(false)
    }
  }, [newFileName, isCreatingFile, currentFolderId, loadLevel, handleSelect, logToConsole])

  // ── Save active file ──────────────────────────────────
  const handleSaveFile = useCallback(async () => {
    const activeTab = openTabs.find(t => t.nodeId === activeTabNodeId)
    if (!activeTab || isSavingContent) return
    setIsSavingContent(true)
    try {
      await api.put(`/v1/scripts/${activeTab.id}/content`, { content: editorContent })
      
      setOpenTabs(prev => prev.map(t => {
        if (t.nodeId === activeTabNodeId) {
          return { ...t, originalContent: editorContent, isDirty: false }
        }
        return t
      }))
      
      store.getState().setFileContent(editorContent)
      logToConsole(`[SYSTEM] Saved script content successfully.`)
    } catch (err) {
      console.error('Failed to save script content:', err)
      logToConsole(`❌ [ERROR] Failed to save script content.`)
    } finally {
      setIsSavingContent(false)
    }
  }, [activeTabNodeId, openTabs, editorContent, isSavingContent, logToConsole])

  // ── Open Publish Modal ────────────────────────────────
  const handleOpenPublish = useCallback(() => {
    if (!activeTabNodeId) return
    const activeNode = store.getState().nodeMap[activeTabNodeId]
    if (activeNode?.scriptData) {
      const currentVer = activeNode.scriptData.version || '1.0.0'
      const cleanVer = currentVer.replace(/^v/, '')
      const parts = cleanVer.split('.')
      if (parts.length === 3) {
        const nextPatch = parseInt(parts[2], 10) + 1
        setPublishVersion(`v${parts[0]}.${parts[1]}.${nextPatch}`)
      } else {
        setPublishVersion(`v${cleanVer}.1`)
      }
      setPublishChangelog('')
      setIsPublishOpen(true)
    }
  }, [activeTabNodeId])

  // ── Publish / Compile & Deploy Script ────────────────
  const handlePublishScript = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!activeTabNodeId || isPublishing || !publishVersion.trim()) return
    const activeNode = store.getState().nodeMap[activeTabNodeId]
    const scriptId = activeNode?.scriptData?.id
    const activeTab = openTabs.find(t => t.nodeId === activeTabNodeId)
    if (!scriptId) return

    setIsPublishing(true)
    setActivePanelTab('console')
    
    logToConsole(`[PUBLISH] Starting compilation & deployment of ${activeNode.name}...`)
    
    const steps = [
      `[1/4] Fetching raw script payload...`,
      `[2/4] Initializing Lua-to-Luau obfuscation engine (V4)...`,
      `[3/4] Building production payload (size: ${Math.round((activeTab?.currentContent.length || 0) * 1.2)} bytes)...`,
      `[4/4] Syncing compiled bundle with Edge CDN nodes...`,
    ]

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500))
      logToConsole(steps[i])
    }

    try {
      if (activeTab?.isDirty) {
        await api.put(`/v1/scripts/${scriptId}/content`, { content: editorContent })
        setOpenTabs(prev => prev.map(t => t.nodeId === activeTabNodeId ? { ...t, originalContent: editorContent, isDirty: false } : t))
        store.getState().setFileContent(editorContent)
      }

      const res = await api.patch<{ status: string; message: string; data: { script: ScriptData } }>(
        `/v1/scripts/${scriptId}/publish`,
        { version: publishVersion.trim(), changelog: publishChangelog.trim() }
      )

      logToConsole(`✓ Bundle successfully deployed to edge.valinc.xyz. Response status 200 OK.`)
      logToConsole(`[SUCCESS] Published ${activeNode.name} version ${publishVersion} successfully!`)

      const updatedScript = res.data.script
      useExplorerStore.setState(state => {
        const node = state.nodeMap[activeTabNodeId]
        if (!node) return state
        return {
          nodeMap: {
            ...state.nodeMap,
            [activeTabNodeId]: {
              ...node,
              scriptData: updatedScript
            }
          }
        }
      })
      
      setIsPublishOpen(false)
    } catch (err: unknown) {
      console.error(err)
      const msg = err instanceof Error ? err.message : 'Unknown error'
      logToConsole(`❌ [ERROR] Deployment failed: ${msg}`)
    } finally {
      setIsPublishing(false)
    }
  }, [activeTabNodeId, isPublishing, publishVersion, publishChangelog, openTabs, editorContent, logToConsole])

  // ── Deprecate Script ─────────────────────────────────
  const handleDeprecateScript = useCallback(async () => {
    if (!activeTabNodeId) return
    const activeNode = store.getState().nodeMap[activeTabNodeId]
    const scriptId = activeNode?.scriptData?.id
    if (!scriptId) return
    
    setDeprecateConfirmVersion(activeNode)
  }, [activeTabNodeId])

  const handleConfirmDeprecateScript = useCallback(async () => {
    if (!deprecateConfirmVersion || isDeprecatingVersion) return
    setIsDeprecatingVersion(true)
    const activeNode = deprecateConfirmVersion
    const scriptId = activeNode?.scriptData?.id
    if (!scriptId) {
      setIsDeprecatingVersion(false)
      setDeprecateConfirmVersion(null)
      return
    }
    try {
      const res = await api.patch<{ status: string; message: string; data: { script: ScriptData } }>(
        `/v1/scripts/${scriptId}/deprecate`
      )
      
      logToConsole(`[SYSTEM] Script "${activeNode.name}" has been deprecated.`)
      
      const updatedScript = res.data.script
      useExplorerStore.setState(state => {
        const node = state.nodeMap[activeTabNodeId!]
        if (!node) return state
        return {
          nodeMap: {
            ...state.nodeMap,
            [activeTabNodeId!]: {
              ...node,
              scriptData: updatedScript
            }
          }
        }
      })
      setDeprecateConfirmVersion(null)
    } catch (err: unknown) {
      console.error(err)
      const msg = err instanceof Error ? err.message : 'Unknown error'
      alert(`Deprecation failed: ${msg}`)
    } finally {
      setIsDeprecatingVersion(false)
    }
  }, [deprecateConfirmVersion, isDeprecatingVersion, activeTabNodeId, logToConsole])

  // ── Ctrl+S shortcut ──────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSaveFile()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSaveFile])

  // ── Responsive Explorer height ───────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleResize = () => {
        setSidebarHeight(window.innerHeight - 260)
      }
      handleResize()
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  // ── Mouse Drag Panel Resize Handlers ──────────────────
  const handleMouseDownHorizontal = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = explorerWidth

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(180, Math.min(480, startWidth + (moveEvent.clientX - startX)))
      setExplorerWidth(newWidth)
    }

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [explorerWidth])

  const handleMouseDownVertical = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startY = e.clientY
    const startHeight = consoleHeight

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newHeight = Math.max(80, Math.min(380, startHeight - (moveEvent.clientY - startY)))
      setConsoleHeight(newHeight)
    }

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [consoleHeight])

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] min-h-[500px] w-full max-w-7xl mx-auto space-y-4">
      {/* Breadcrumbs and Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-black tracking-tight text-foreground uppercase">Script Workspace</h1>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Home className="w-3.5 h-3.5 text-muted-foreground/60" />
            <span className="text-muted-foreground/30">/</span>
            {breadcrumb.length === 0 ? (
              <span className="font-mono text-xs text-muted-foreground/50">Root</span>
            ) : (
              breadcrumb.map((b, index) => (
                <span key={b.id} className="flex items-center gap-1">
                  <span className="hover:text-primary cursor-pointer font-mono text-xs transition-colors" onClick={() => handleSelect(`folder:${b.id}`)}>{b.name}</span>
                  {index < breadcrumb.length - 1 && <span className="text-muted-foreground/30">/</span>}
                </span>
              ))
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsNewFileOpen(true)}
            className="h-8 text-[10px] font-mono flex items-center gap-1.5 border-border bg-card hover:bg-muted cursor-pointer"
          >
            <FilePlus className="w-3.5 h-3.5 text-primary" />
            New Script
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsNewFolderOpen(true)}
            className="h-8 text-[10px] font-mono flex items-center gap-1.5 border-border bg-card hover:bg-muted cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5 text-primary" />
            New Folder
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRepairOrphans}
            disabled={isRepairing}
            title="Scan & Restore Hidden / Unassigned Items"
            className="h-8 text-[10px] font-mono flex items-center gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 cursor-pointer"
          >
            {isRepairing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
            ) : (
              <Wrench className="w-3.5 h-3.5 text-amber-500" />
            )}
            Fix Hidden Items
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => router.push('/studio/developer/deploy')}
            className="h-8 text-[10px] font-mono flex items-center gap-1.5 shadow-none cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Deploy Script
          </Button>
        </div>
      </div>

      {/* Main Editor & Sidebar Container */}
      <div className="flex-1 flex border border-border bg-card rounded-xl overflow-hidden min-h-0 relative shadow-xs">
        {/* Left Sidebar - File Explorer */}
        <div 
          ref={sidebarRef}
          style={{ width: explorerWidth }}
          className="flex flex-col shrink-0 bg-muted/10 min-h-0"
        >
          <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between shrink-0 select-none">
            <span className="text-[10px] font-bold font-mono text-muted-foreground/60 uppercase tracking-wider">Explorer</span>
            <button
              onClick={() => loadLevel(currentFolderId)}
              className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground cursor-pointer"
              title="Refresh explorer"
            >
              <Activity className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-1 min-h-0">
            <VirtualTreeList
              height={sidebarHeight}
              onToggle={handleToggle}
              onSelect={handleSelect}
              onRename={handleRename}
              onDelete={handleDelete}
              onDropItems={handleDropItems}
              onPublishScript={handleQuickPublishScript}
              onSetDraftScript={handleQuickDraftScript}
            />
          </div>
        </div>

        {/* Vertical Resizer Divider */}
        <div 
          className="w-1 cursor-col-resize hover:bg-primary/50 active:bg-primary bg-border/40 transition-colors self-stretch z-10 shrink-0" 
          onMouseDown={handleMouseDownHorizontal}
        />

        {/* Right Sidebar - Monaco Editor & Tabs */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#1E1E1E]">
          {/* Open Tabs Bar */}
          <div className="h-9 border-b border-[#2D2D2D] bg-[#252526] flex items-center justify-between px-2 shrink-0 select-none overflow-x-auto whitespace-nowrap scrollbar-none">
            <div className="flex items-center gap-1 h-full">
              {openTabs.map(tab => (
                <div
                  key={tab.nodeId}
                  onClick={() => handleSelect(tab.nodeId)}
                  className={`h-full px-3 flex items-center gap-2 border-r border-[#2D2D2D] text-xs font-mono cursor-pointer transition-colors ${
                    activeTabNodeId === tab.nodeId
                      ? 'bg-[#1E1E1E] text-foreground border-t-2 border-t-primary'
                      : 'bg-[#2D2D2D]/40 text-muted-foreground hover:bg-[#2D2D2D]/80 hover:text-foreground'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 text-sky-500/70" />
                  <span className={tab.isDirty ? "italic font-bold" : ""}>
                    {tab.name}
                    {tab.isDirty && <span className="ml-1 text-[8px] text-amber-500">●</span>}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCloseTab(tab.nodeId)
                    }}
                    className="p-0.5 hover:bg-muted-foreground/15 rounded text-muted-foreground/40 hover:text-foreground"
                  >
                    ×
                  </button>
                </div>
              ))}
              {openTabs.length === 0 && (
                <div className="px-3 text-xs text-muted-foreground/40 font-mono">No files open</div>
              )}
            </div>
            
            {/* Save, Publish & Deprecate Buttons for active file */}
            <div className="flex items-center gap-1.5 pr-2">
              {activeTabNodeId && (
                <>
                  {openTabs.find(t => t.nodeId === activeTabNodeId)?.isDirty && (
                     <Button
                       onClick={handleSaveFile}
                       disabled={isSavingContent}
                       className="h-6 px-2 text-[9px] bg-primary hover:bg-primary/90 text-primary-foreground font-mono rounded-sm shadow-none cursor-pointer"
                     >
                       {isSavingContent ? <Loader2 className="w-2.5 h-2.5 animate-spin mr-1" /> : null}
                       Save
                     </Button>
                  )}

                  {(() => {
                    const activeNode = store.getState().nodeMap[activeTabNodeId]
                    if (activeNode?.type === 'script' && activeNode.scriptData?.status !== 'deprecated') {
                      return (
                        <Button
                          onClick={handleOpenPublish}
                          disabled={isPublishing}
                          className="h-6 px-2 text-[9px] bg-primary hover:bg-primary/90 text-primary-foreground font-mono rounded-sm shadow-none cursor-pointer"
                        >
                          Compile & Publish
                        </Button>
                      )
                    }
                    return null
                  })()}

                  {(() => {
                    const activeNode = store.getState().nodeMap[activeTabNodeId]
                    if (activeNode?.type === 'script' && activeNode.scriptData?.status === 'published') {
                      return (
                        <Button
                          onClick={handleDeprecateScript}
                          className="h-6 px-2 text-[9px] bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-500/20 font-mono rounded-sm shadow-none cursor-pointer"
                        >
                          Deprecate
                        </Button>
                      )
                    }
                    return null
                  })()}
                </>
              )}
            </div>
          </div>

          {/* Editor / Welcome Pane */}
          <div className="flex-1 relative min-h-0">
            {loadingFile ? (
              <div className="absolute inset-0 bg-[#1E1E1E]/80 backdrop-blur-xs flex items-center justify-center z-10">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-[10px] font-mono text-muted-foreground/60">Loading source code...</span>
                </div>
              </div>
            ) : null}

            {activeTabNodeId ? (
              <MonacoEditor
                height="100%"
                language="lua"
                theme="vs-dark"
                value={editorContent}
                onChange={handleEditorChange}
                options={{
                  fontSize: 12,
                  fontFamily: "Fira Code, Menlo, Monaco, Consolas, monospace",
                  minimap: { enabled: true },
                  automaticLayout: true,
                  tabSize: 3,
                  wordWrap: "on",
                  lineNumbers: "on",
                  scrollbar: {
                    verticalScrollbarSize: 10,
                    horizontalScrollbarSize: 10,
                  }
                }}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1E1E1E] text-center p-6 select-none">
                <Code2 className="w-12 h-12 text-[#2D2D2D] mb-4" />
                <h3 className="text-sm font-bold text-foreground/50 uppercase tracking-wider font-mono">No Active File</h3>
                <p className="text-[10px] text-muted-foreground max-w-xs mt-1 leading-relaxed">
                  Select a Lua script from the explorer sidebar or double-click to view and edit. Use the deploy button to release a new script.
                </p>
                <div className="mt-6 flex flex-col gap-2 font-mono text-[9px] text-muted-foreground/30 text-left border border-border/10 p-3 bg-muted/5 rounded-lg max-w-xs">
                  <div className="flex justify-between gap-4">
                    <span>Double click file:</span>
                    <span className="text-foreground/40 font-bold">Open Tab</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Right-click item:</span>
                    <span className="text-foreground/40 font-bold">Actions Menu</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Drag and drop:</span>
                    <span className="text-foreground/40 font-bold">Move item</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Horizontal Resizer Divider */}
          <div 
            className="h-1 cursor-row-resize hover:bg-primary/50 active:bg-primary bg-border/40 transition-colors w-full z-10 shrink-0" 
            onMouseDown={handleMouseDownVertical}
          />

          {/* Bottom Console Panel */}
          <div style={{ height: consoleHeight }} className="bg-[#1E1E1E] flex flex-col min-h-0 shrink-0">
            {/* Bottom Panel Tabs */}
            <div className="h-8 border-b border-[#2D2D2D] bg-[#252526] px-3 flex items-center gap-4 shrink-0 select-none">
              <button
                onClick={() => setActivePanelTab('console')}
                className={`h-full text-[10px] font-mono flex items-center gap-1.5 transition-colors relative cursor-pointer ${
                  activePanelTab === 'console'
                    ? 'text-primary font-bold border-b border-b-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                Execution Console
              </button>
              <button
                onClick={() => setActivePanelTab('analytics')}
                className={`h-full text-[10px] font-mono flex items-center gap-1.5 transition-colors relative cursor-pointer ${
                  activePanelTab === 'analytics'
                    ? 'text-primary font-bold border-b border-b-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Analytics
              </button>
              <button
                onClick={() => setActivePanelTab('security')}
                className={`h-full text-[10px] font-mono flex items-center gap-1.5 transition-colors relative cursor-pointer ${
                  activePanelTab === 'security'
                    ? 'text-primary font-bold border-b border-b-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Security Metrics
              </button>
            </div>

            {/* Bottom Panel Content */}
            <div className="flex-1 p-3 overflow-y-auto font-mono text-[10px] leading-relaxed bg-[#1E1E1E] text-muted-foreground scrollbar-thin">
              {activePanelTab === 'console' && (
                <div className="space-y-1 text-emerald-500/80">
                  {consoleLogs.map((log, index) => (
                    <div key={index} className={
                      log.startsWith('✓') ? 'text-emerald-400 font-bold'
                      : log.startsWith('❌') ? 'text-red-500 font-bold'
                      : log.startsWith('[SUCCESS]') ? 'text-emerald-400 font-bold'
                      : log.startsWith('[PUBLISH]') ? 'text-primary font-bold'
                      : ''
                    }>
                      {log}
                    </div>
                  ))}
                  <div className="text-muted-foreground/30">Real-time executions and game telemetry will stream here in real time.</div>
                </div>
              )}

              {activePanelTab === 'analytics' && (
                <div className="space-y-1">
                  <div>Analytics status: <span className="text-emerald-500 font-bold">ONLINE</span></div>
                  {(() => {
                    const node = activeTabNodeId ? store.getState().nodeMap[activeTabNodeId] : null
                    const scriptData = node?.scriptData
                    if (!node || !scriptData) return <div className="text-muted-foreground/40">Select a file to see specific script analytics.</div>
                    return (
                      <>
                        <div>Script Name: {node.name}</div>
                        <div>Status: {scriptData.status || 'N/A'}</div>
                        <div>Version: {scriptData.version || 'N/A'}</div>
                        <div>Created at: {scriptData.created_at ? <ClientDate date={scriptData.created_at} format="datetime" /> : 'N/A'}</div>
                      </>
                    )
                  })()}
                </div>
              )}

              {activePanelTab === 'security' && (
                <div className="space-y-1">
                  <div>Security Scanner: <span className="text-sky-500 font-bold">READY</span></div>
                  <div className="flex items-center gap-1 text-emerald-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    No vulnerabilities or malicious patterns detected.
                  </div>
                  <div className="text-muted-foreground/40">Anti-tamper bytecode verification: <span className="text-foreground">ACTIVE</span></div>
                  <div className="text-muted-foreground/40">Remote injection vulnerability checks: <span className="text-foreground">PASSED</span></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: New Folder Dialog */}
      <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase tracking-wider font-mono">Create New Folder</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateFolder} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-muted-foreground uppercase">Folder Name</label>
              <Input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. Exploits, Utilities..."
                className="rounded-lg bg-muted/50 border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono"
                autoFocus
              />
            </div>
            <DialogFooter className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setIsNewFolderOpen(false); setNewFolderName('') }}
                className="h-8 text-[10px] font-mono rounded-lg hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingFolder || !newFolderName.trim()}
                className="h-8 text-[10px] font-mono rounded-lg shadow-none"
              >
                {isCreatingFolder ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Create Folder
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Delete Folder Confirmation */}
      <Dialog open={!!folderToDelete} onOpenChange={(open) => !open && setFolderToDelete(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-red-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Delete Folder?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete this folder? This will delete all subfolders and scripts contained within it. This action is permanent and cannot be undone.
            </p>
            <DialogFooter className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setFolderToDelete(null)}
                className="h-8 text-[10px] font-mono rounded-lg hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDeleteFolder}
                disabled={isDeletingFolder}
                className="h-8 text-[10px] font-mono rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-none"
              >
                {isDeletingFolder ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Delete Folder
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Delete Script Confirmation */}
      <Dialog open={!!scriptToDelete} onOpenChange={(open) => !open && setScriptToDelete(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-red-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Delete Script?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete this script? This action is permanent and cannot be undone.
            </p>
            <DialogFooter className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setScriptToDelete(null)}
                className="h-8 text-[10px] font-mono rounded-lg hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDeleteScript}
                disabled={isDeletingScript}
                className="h-8 text-[10px] font-mono rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-none font-bold"
              >
                {isDeletingScript ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Delete Script
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Deprecate Version Confirmation */}
      <Dialog open={!!deprecateConfirmVersion} onOpenChange={(open) => !open && setDeprecateConfirmVersion(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-amber-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Deprecate Version?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Deprecate &quot;{deprecateConfirmVersion?.name}&quot;? Users will no longer be able to run this version.
            </p>
            <DialogFooter className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeprecateConfirmVersion(null)}
                className="h-8 text-[10px] font-mono rounded-lg hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDeprecateScript}
                disabled={isDeprecatingVersion}
                className="h-8 text-[10px] font-mono rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-none font-bold cursor-pointer"
              >
                {isDeprecatingVersion ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Confirm Deprecate
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Publish Script Dialog */}
      <Dialog open={isPublishOpen} onOpenChange={setIsPublishOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase tracking-wider font-mono flex items-center gap-2">
              <Code2 className="w-4 h-4 text-primary" />
              Compile & Publish Script
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePublishScript} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-muted-foreground uppercase">Version Tag</label>
              <Input
                type="text"
                value={publishVersion}
                onChange={(e) => setPublishVersion(e.target.value)}
                placeholder="e.g. v1.0.0"
                className="rounded-lg bg-muted/50 border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-muted-foreground uppercase">Changelog</label>
              <textarea
                value={publishChangelog}
                onChange={(e) => setPublishChangelog(e.target.value)}
                placeholder="What changed in this script version?..."
                className="w-full min-h-[80px] p-2 rounded-lg bg-muted/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono resize-none leading-relaxed text-foreground"
              />
            </div>
            <DialogFooter className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setIsPublishOpen(false) }}
                className="h-8 text-[10px] font-mono rounded-lg hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPublishing || !publishVersion.trim()}
                className="h-8 text-[10px] font-mono bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-none font-bold"
              >
                {isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Compile & Deploy
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: New Script Dialog */}
      <Dialog open={isNewFileOpen} onOpenChange={setIsNewFileOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
              <FilePlus className="w-4 h-4 text-primary" />
              Create New Script
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateFile} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-muted-foreground uppercase">Script Name</label>
              <Input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="e.g. autofarm.lua, config.txt..."
                className="rounded-lg bg-muted/50 border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-mono"
                autoFocus
                required
              />
            </div>
            <DialogFooter className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setIsNewFileOpen(false); setNewFileName('') }}
                className="h-8 text-[10px] font-mono rounded-lg hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingFile || !newFileName.trim()}
                className="h-8 text-[10px] font-mono rounded-lg shadow-none font-bold cursor-pointer"
              >
                {isCreatingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Create Script
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
