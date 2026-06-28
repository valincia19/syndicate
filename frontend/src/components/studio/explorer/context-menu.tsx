/**
 * ContextMenu - Right-click context menu for file explorer
 *
 * Renders a portal-based dropdown at the cursor position.
 * Closes on click outside, Escape, or any action click.
 */

'use client'

import { useEffect, useRef, useCallback } from 'react'
import { Copy, Clipboard, Link, Edit2, Trash2 } from 'lucide-react'

export interface ContextMenuAction {
  id: string
  label: string
  icon?: React.ReactNode
  danger?: boolean
  disabled?: boolean
  onClick: () => void
}

interface ContextMenuProps {
  x: number
  y: number
  actions: ContextMenuAction[]
  onClose: () => void
}

export function ContextMenu({ x, y, actions, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      onClose()
    }
  }, [onClose])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleClickOutside, handleKeyDown])

  // Clamp position to viewport
  const clampedX = Math.min(x, window.innerWidth - 180)
  const clampedY = Math.min(y, window.innerHeight - actions.length * 32 - 16)

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] min-w-[160px] bg-popover border border-border rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
      style={{ left: clampedX, top: clampedY }}
    >
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => { action.onClick(); onClose() }}
          disabled={action.disabled}
          className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] font-mono text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            action.danger
              ? 'text-red-500 hover:bg-red-500/10'
              : 'text-popover-foreground hover:bg-muted/60'
          }`}
        >
          <span className="w-4 h-4 shrink-0 flex items-center justify-center">
            {action.icon}
          </span>
          {action.label}
        </button>
      ))}
    </div>
  )
}

export const CONTEXT_ACTIONS = {
  copy: (nodeId: string, nodeName: string): ContextMenuAction => ({
    id: 'copy',
    label: 'Copy',
    icon: <Copy className="w-3.5 h-3.5" />,
    onClick: () => {
      navigator.clipboard.writeText(nodeName)
    },
  }),
  copyPath: (path: string): ContextMenuAction => ({
    id: 'copy-path',
    label: 'Copy Path',
    icon: <Clipboard className="w-3.5 h-3.5" />,
    onClick: () => {
      navigator.clipboard.writeText(path)
    },
  }),
  copyUrl: (url: string): ContextMenuAction => ({
    id: 'copy-url',
    label: 'Copy URL',
    icon: <Link className="w-3.5 h-3.5" />,
    onClick: () => {
      navigator.clipboard.writeText(url)
    },
  }),
  rename: (onRename: () => void): ContextMenuAction => ({
    id: 'rename',
    label: 'Rename',
    icon: <Edit2 className="w-3.5 h-3.5" />,
    onClick: onRename,
  }),
  delete: (onDelete: () => void): ContextMenuAction => ({
    id: 'delete',
    label: 'Delete',
    icon: <Trash2 className="w-3.5 h-3.5" />,
    danger: true,
    onClick: onDelete,
  }),
}
