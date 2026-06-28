/**
 * VirtualTreeList - High-Performance File Explorer
 *
 * Key optimizations:
 * - react-window List: only renders visible rows (~30 DOM nodes
 *   regardless of 10,000+ total nodes)
 * - React.memo on every row: zero re-renders unless props change
 * - CSS-driven hover (group-hover) instead of JS event
 * - Shallow Zustand selectors: each row subscribes only to its own node data
 */

'use client'

import { memo, useCallback, useRef, useEffect, useState, useMemo } from 'react'
import { List } from 'react-window'
import type { RowComponentProps } from 'react-window'
import {
  Folder, FolderOpen, FileCode, ChevronRight,
  Loader2, Edit2, Trash2, Copy, Clipboard, Link, Globe, Clock, CheckCircle
} from 'lucide-react'
import { useExplorerStore } from '@/stores/explorer-store'
import { ContextMenu, type ContextMenuAction } from './context-menu'

// ── Constants ────────────────────────────────────────────
const ROW_HEIGHT = 28
const INDENT_WIDTH = 14

// ── Row Data Type ────────────────────────────────────────
interface RowData {
  visibleIds: string[]
  onToggle: (id: string) => void
  onSelect: (id: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onContextMenu: (e: React.MouseEvent, nodeId: string) => void
  onDragStart: (e: React.DragEvent, nodeId: string) => void
  onDragOver: (e: React.DragEvent, nodeId: string) => void
  onDrop: (e: React.DragEvent, nodeId: string) => void
  renamingNodeId: string | null
  setRenamingNodeId: (id: string | null) => void
}

// ── TreeNode Row (React.memo + shallow selector) ─────────
function TreeNodeRowFn({
  index, style, visibleIds, onToggle, onSelect, onRename, onDelete, onContextMenu, onDragStart, onDragOver, onDrop, renamingNodeId, setRenamingNodeId,
}: RowComponentProps<RowData>): React.ReactElement | null {
  const nodeId = visibleIds[index]

  const node = useExplorerStore(useCallback((s) => s.nodeMap[nodeId], [nodeId]))
  const isSelected = useExplorerStore(useCallback((s) => s.selectedId === nodeId, [nodeId]))
  const dragOverId = useExplorerStore((s) => s.dragOverId)
  const nodeMap = useExplorerStore((s) => s.nodeMap)
  const childLists = useExplorerStore((s) => s.childLists)

  const isRenaming = renamingNodeId === nodeId
  const [localRenaming, setLocalRenaming] = useState(false)
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const showRename = isRenaming || localRenaming

  useEffect(() => {
    if (showRename && inputRef.current) {
      setName(node?.name || '')
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [showRename, node?.name])

  if (!node) return null

  const handleClick = () => onSelect(nodeId)

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggle(nodeId)
  }

  const startRename = () => {
    setLocalRenaming(true)
    setRenamingNodeId(null) // clear any container-triggered rename
  }

  const commitRename = () => {
    if (isRenaming) setRenamingNodeId(null)
    setLocalRenaming(false)
    if (name.trim() && name.trim() !== node.name) {
      onRename(nodeId, name.trim())
    }
  }

  const cancelRename = () => {
    if (isRenaming) setRenamingNodeId(null)
    setLocalRenaming(false)
  }

  const isDragOver = dragOverId === nodeId

  // Compute folder statuses reactively from loaded children & SQL stats
  let folderHasPublished = (node.folderData?.published_count || 0) > 0
  let folderHasDraft = (node.folderData?.draft_count || 0) > 0

  if (node.type === 'folder') {
    const checkChildren = (fId: string) => {
      const children = childLists[fId] || []
      for (const cid of children) {
        const child = nodeMap[cid]
        if (child) {
          if (child.type === 'script' && child.scriptData) {
            if (child.scriptData.status === 'published') folderHasPublished = true
            if (child.scriptData.status === 'draft') folderHasDraft = true
          } else if (child.type === 'folder') {
            checkChildren(cid)
          }
        }
      }
    }
    checkChildren(nodeId)
  }

  return (
    <div style={style}>
      <div
        onClick={handleClick}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(e, nodeId) }}
        draggable={!showRename}
        onDragStart={(e) => onDragStart(e, nodeId)}
        onDragOver={(e) => { e.preventDefault(); onDragOver(e, nodeId) }}
        onDrop={(e) => { e.preventDefault(); onDrop(e, nodeId) }}
        className={`group flex items-center h-full select-none cursor-pointer transition-colors duration-75 ${
          isSelected
            ? 'bg-primary/10 text-primary'
            : isDragOver
              ? 'bg-primary/5 text-foreground ring-1 ring-primary/30 ring-inset'
              : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
        }`}
        style={{ paddingLeft: `${8 + node.depth * INDENT_WIDTH}px` }}
      >
        {/* Expand chevron (folders only) */}
        {node.type === 'folder' ? (
          <button
            onClick={handleToggle}
            className="shrink-0 w-4 h-4 flex items-center justify-center text-muted-foreground/40 hover:text-foreground cursor-pointer ml-1"
          >
            {node.isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <ChevronRight
                className={`w-3 h-3 transition-transform duration-150 ${
                  node.isExpanded ? 'rotate-90' : ''
                }`}
              />
            )}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}

        {/* Icon */}
        <span className="shrink-0 ml-0.5">
          {node.type === 'folder' ? (
            node.isExpanded ? (
              <FolderOpen className="w-3.5 h-3.5 text-amber-500/70" />
            ) : (
              <Folder className="w-3.5 h-3.5" />
            )
          ) : (
            <FileCode className="w-3.5 h-3.5 text-sky-500/70" />
          )}
        </span>

        {/* Name / rename input */}
        {showRename ? (
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') cancelRename()
            }}
            onBlur={commitRename}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 ml-1.5 text-[12px] px-1 py-0 rounded border border-primary/40 bg-muted text-foreground focus:outline-none min-w-0"
          />
        ) : (
          <span className="flex-1 ml-1.5 text-[12px] truncate leading-tight flex items-center gap-1">
            <span className="truncate">{node.name}</span>

            {/* Script Status Badge */}
            {node.type === 'script' && node.scriptData && (
              <span className={`px-1 py-0.2 text-[8px] font-mono font-bold rounded shrink-0 ${
                node.scriptData.status === 'published'
                  ? 'bg-blue-500/15 text-blue-500 dark:text-blue-400 border border-blue-500/30'
                  : node.scriptData.status === 'draft'
                    ? 'bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30'
                    : 'bg-muted/30 text-muted-foreground border border-border/40'
              }`}>
                {node.scriptData.status === 'published' ? 'PUB' : node.scriptData.status === 'draft' ? 'DRAFT' : 'DEP'}
              </span>
            )}

            {/* Folder Status Indicators */}
            {node.type === 'folder' && (
              <div className="flex items-center gap-1 ml-1 shrink-0">
                {folderHasPublished && (
                  <span className="px-1 py-0.2 text-[7.5px] font-mono font-bold rounded bg-blue-500/15 text-blue-500 dark:text-blue-400 border border-blue-500/30" title="Contains Published scripts">
                    PUB
                  </span>
                )}
                {folderHasDraft && (
                  <span className="px-1 py-0.2 text-[7.5px] font-mono font-bold rounded bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30" title="Contains Draft scripts">
                    DRAFT
                  </span>
                )}
              </div>
            )}
          </span>
        )}

        {/* Hover actions - both files and folders */}
        {!showRename && (
          <div className="hidden group-hover:flex items-center gap-0.5 shrink-0 pr-1">
            <button
              onClick={(e) => { e.stopPropagation(); startRename() }}
              className="p-0.5 text-muted-foreground hover:text-foreground rounded cursor-pointer"
              title="Rename"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(nodeId) }}
              className="p-0.5 text-muted-foreground hover:text-red-500 rounded cursor-pointer"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const TreeNodeRow = memo(TreeNodeRowFn, (prev, next) => {
  return (
    prev.index === next.index &&
    prev.visibleIds[prev.index] === next.visibleIds[next.index] &&
    prev.style === next.style &&
    prev.renamingNodeId === next.renamingNodeId
  )
})

// ── Virtual List Container ──────────────────────────────
interface VirtualTreeListProps {
  height: number
  onToggle: (id: string) => void
  onSelect: (id: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onDropItems?: (itemIds: string[], targetFolderId: string | null) => void
  onPublishScript?: (scriptId: string) => void
  onSetDraftScript?: (scriptId: string) => void
}

export const VirtualTreeList = memo(function VirtualTreeList({
  height, onToggle, onSelect, onRename, onDelete, onDropItems, onPublishScript, onSetDraftScript,
}: VirtualTreeListProps) {
  const visibleIds = useExplorerStore((s) => s.visibleIds)
  const setDragOver = useExplorerStore((s) => s.setDragOver)
  const setDragItems = useExplorerStore((s) => s.setDragItems)

  // Context menu state
  const [cm, setCm] = useState<{ x: number; y: number; nodeId: string } | null>(null)

  // Renaming state from container (for context menu trigger)
  const [renamingNodeId, setRenamingNodeId] = useState<string | null>(null)

  const contextHandler = useCallback((e: React.MouseEvent, nodeId: string) => {
    setCm({ x: e.clientX, y: e.clientY, nodeId })
  }, [])

  const cmActions: ContextMenuAction[] = useMemo(() => {
    if (!cm) return []
    const state = useExplorerStore.getState()
    const node = state.nodeMap[cm.nodeId]
    if (!node) return []

    if (node.type === 'script' && node.scriptData) {
      const scriptId = node.scriptData.id
      const currentStatus = node.scriptData.status
      return [
        { id: 'copy', label: 'Copy', icon: <Copy className="w-3.5 h-3.5" />, onClick: () => { navigator.clipboard.writeText(node.name) } },
        { id: 'copy-path', label: 'Copy Path', icon: <Clipboard className="w-3.5 h-3.5" />, onClick: () => { navigator.clipboard.writeText(node.scriptData?.file_url || '') } },
        { id: 'copy-url', label: 'Copy URL', icon: <Link className="w-3.5 h-3.5" />, onClick: () => { navigator.clipboard.writeText(node.scriptData?.file_url || '') } },
        { id: 'sep1', label: '', icon: undefined, onClick: () => {} },
        { id: 'publish', label: currentStatus === 'published' ? '✓ Published' : 'Publish Script', icon: <Globe className="w-3.5 h-3.5 text-blue-400" />, onClick: () => onPublishScript?.(scriptId) },
        { id: 'draft', label: currentStatus === 'draft' ? '✓ Draft' : 'Set as Draft', icon: <Clock className="w-3.5 h-3.5 text-amber-400" />, onClick: () => onSetDraftScript?.(scriptId) },
        { id: 'sep2', label: '', icon: undefined, onClick: () => {} },
        { id: 'rename', label: 'Rename', icon: <Edit2 className="w-3.5 h-3.5" />, onClick: () => setRenamingNodeId(cm.nodeId) },
        { id: 'delete', label: 'Delete', icon: <Trash2 className="w-3.5 h-3.5" />, danger: true, onClick: () => onDelete(cm.nodeId) },
      ]
    }

    if (node.type === 'folder') {
      return [
        { id: 'copy', label: 'Copy', icon: <Copy className="w-3.5 h-3.5" />, onClick: () => { navigator.clipboard.writeText(node.name) } },
        { id: 'sep1', label: '', icon: undefined, onClick: () => {} },
        { id: 'rename', label: 'Rename', icon: <Edit2 className="w-3.5 h-3.5" />, onClick: () => setRenamingNodeId(cm.nodeId) },
        { id: 'delete', label: 'Delete', icon: <Trash2 className="w-3.5 h-3.5" />, danger: true, onClick: () => onDelete(cm.nodeId) },
      ]
    }

    return []
  }, [cm, onDelete, onPublishScript, onSetDraftScript])

  const dragStartHandler = useCallback((e: React.DragEvent, nodeId: string) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', nodeId)
    setDragItems([nodeId])
  }, [setDragItems])

  const dragOverHandler = useCallback((e: React.DragEvent, nodeId: string) => {
    e.preventDefault()
    const node = useExplorerStore.getState().nodeMap[nodeId]
    if (node?.type === 'folder') {
      setDragOver(nodeId)
    }
  }, [setDragOver])

  const dropHandler = useCallback((e: React.DragEvent, nodeId: string) => {
    e.preventDefault()
    setDragOver(null)
    const draggedId = e.dataTransfer.getData('text/plain')
    if (!draggedId) return

    const state = useExplorerStore.getState()
    const targetNode = state.nodeMap[nodeId]
    if (!targetNode || targetNode.type !== 'folder') return
    const targetFolderId = targetNode.folderData?.id || nodeId.replace('folder:', '')
    onDropItems?.([draggedId], targetFolderId)
    setDragItems([])
  }, [setDragOver, onDropItems, setDragItems])

  const handleDragLeave = useCallback(() => {
    setDragOver(null)
  }, [setDragOver])

  const rowProps = useMemo(
    () => ({
      visibleIds,
      onToggle,
      onSelect,
      onRename,
      onDelete,
      onContextMenu: contextHandler,
      onDragStart: dragStartHandler,
      onDragOver: dragOverHandler,
      onDrop: dropHandler,
      renamingNodeId,
      setRenamingNodeId,
    }),
    [visibleIds, onToggle, onSelect, onRename, onDelete, contextHandler, dragStartHandler, dragOverHandler, dropHandler, renamingNodeId]
  )

  return (
    <div onDragLeave={handleDragLeave} className="h-full w-full">
      <List
        defaultHeight={height}
        rowCount={visibleIds.length}
        rowHeight={ROW_HEIGHT}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rowComponent={TreeNodeRow as any}
        rowProps={rowProps}
        overscanCount={10}
        className="scrollbar-thin"
        style={{ height, width: '100%' }}
      />
      {cm && (
        <ContextMenu
          x={cm.x}
          y={cm.y}
          actions={cmActions}
          onClose={() => setCm(null)}
        />
      )}
    </div>
  )
})

export { ROW_HEIGHT, INDENT_WIDTH }
