/**
 * Explorer Store - High-Performance Flat Tree State
 * 
 * Architecture:
 * - Flat map (O(1) lookup) instead of deep nested tree (O(n) traversal)
 * - Visible node list is a derived flat array computed via visibleIds()
 * - Toggle folder = O(1): just flip expanded flag + recompute visible list
 * - Uses Zustand with shallow equality selectors to prevent global re-renders
 */

import { create } from 'zustand'

// ── Types ──────────────────────────────────────────────
export interface ScriptData {
  id: string; name: string; version: string; file_url: string
  status: 'draft' | 'published' | 'deprecated'
  folder_id: string | null; created_at: string
}
export interface FolderData {
  id: string; name: string; parent_id: string | null
  script_count: number; subfolder_count: number
  published_count?: number; draft_count?: number
}

export interface TreeNode {
  id: string
  name: string
  type: 'folder' | 'script'
  parentId: string | null  // null = root
  depth: number
  hasChildren: boolean     // for folders: subfolder_count > 0
  isExpanded: boolean
  isLoading: boolean
  // Payload
  folderData?: FolderData
  scriptData?: ScriptData
}

export interface BreadcrumbItem {
  id: string; name: string
}

interface ExplorerState {
  // Flat tree map: nodeId → TreeNode
  nodeMap: Record<string, TreeNode>
  // Per-parent child ID lists (ordered): "__root__" | folderId → child node IDs
  childLists: Record<string, string[]>
  // Which nodes are expanded (for quick lookup)
  expandedIds: Set<string>
  // Currently selected node
  selectedId: string | null
  // Current folder context (for breadcrumb + upload target)
  currentFolderId: string | null
  // Breadcrumb for current folder
  breadcrumb: BreadcrumbItem[]
  // Monaco file content
  activeFileContent: string
  loadingFile: boolean
  visibleIds: string[]
  // Drag-and-drop state
  dragOverId: string | null
  dragItems: string[]

  // ── Actions ──────────────────────────────────────────
  /** Initialize root level */
  initRoot: (folders: FolderData[], scripts: ScriptData[]) => void

  /** Toggle folder expand/collapse - O(1) + recompute visible */
  toggleFolder: (folderId: string) => void

  /** Load children into the tree after API fetch */
  loadChildren: (parentId: string | null, folders: FolderData[], scripts: ScriptData[]) => void

  /** Set folder as loading */
  setLoading: (folderId: string, loading: boolean) => void

  /** Select a node */
  selectNode: (nodeId: string) => void

  /** Set current folder context */
  setCurrentFolder: (folderId: string | null) => void

  /** Set breadcrumb */
  setBreadcrumb: (items: BreadcrumbItem[]) => void

  /** Load file content for Monaco */
  setFileContent: (content: string) => void
  setLoadingFile: (loading: boolean) => void

  /** Drag-and-drop */
  setDragOver: (nodeId: string | null) => void
  setDragItems: (items: string[]) => void

  /** CRUD invalidation */
  invalidateParent: (parentId: string | null) => void
  removeNode: (nodeId: string) => void
  renameNode: (nodeId: string, newName: string) => void
  updateScriptStatus: (scriptId: string, newStatus: 'published' | 'draft' | 'deprecated') => void
  reset: () => void

  // ── Derived (computed on demand) ─────────────────────
  /** Get flat ordered list of visible node IDs (depth-first, respect expanded state) */
  getVisibleIds: () => string[]
}

// ── Helpers ────────────────────────────────────────────

/** Sanitize name - prevent XSS, strip dangerous chars */
function sanitize(s: string): string {
  return s.replace(/[<>&"']/g, '').trim()
}

function makeNodeId(type: 'folder' | 'script', id: string): string {
  return `${type}:${id}`
}

function makeFolderNode(f: FolderData, depth: number): TreeNode {
  return {
    id: makeNodeId('folder', f.id),
    name: sanitize(f.name),
    type: 'folder',
    parentId: f.parent_id ? makeNodeId('folder', f.parent_id) : null,
    depth,
    hasChildren: f.subfolder_count > 0,
    isExpanded: false,
    isLoading: false,
    folderData: f,
  }
}

function makeScriptNode(s: ScriptData, depth: number, parentId: string | null): TreeNode {
  return {
    id: makeNodeId('script', s.id),
    name: sanitize(s.name),
    type: 'script',
    parentId,
    depth,
    hasChildren: false,
    isExpanded: false,
    isLoading: false,
    scriptData: s,
  }
}

function computeVisibleIds(
  nodeMap: Record<string, TreeNode>,
  childLists: Record<string, string[]>,
  expandedIds: Set<string>
): string[] {
  const result: string[] = []
  const walk = (parentKey: string) => {
    const children = childLists[parentKey] || []
    for (const childId of children) {
      result.push(childId)
      const node = nodeMap[childId]
      if (node && node.type === 'folder' && (expandedIds.has(childId) || node.isExpanded)) {
        walk(childId)
      }
    }
  }
  walk('__root__')
  return result
}

// ── Store ──────────────────────────────────────────────

export const useExplorerStore = create<ExplorerState>()((set, get) => ({
  nodeMap: {},
  childLists: { '__root__': [] },
  expandedIds: new Set(),
  selectedId: null,
  currentFolderId: null,
  breadcrumb: [],
  activeFileContent: '',
  loadingFile: false,
  visibleIds: [],
  dragOverId: null,
  dragItems: [],

  // ── Init root ────────────────────────────────────────
  initRoot: (folders, scripts) => {
    const nodeMap: Record<string, TreeNode> = {}
    const rootChildren: string[] = []

    folders.forEach(f => {
      const node = makeFolderNode(f, 0)
      nodeMap[node.id] = node
      rootChildren.push(node.id)
    })
    scripts.forEach(s => {
      const node = makeScriptNode(s, 0, null)
      nodeMap[node.id] = node
      rootChildren.push(node.id)
    })

    const childLists = { '__root__': rootChildren }
    const expandedIds = new Set<string>()
    const visibleIds = computeVisibleIds(nodeMap, childLists, expandedIds)

    set({ nodeMap, childLists, expandedIds, visibleIds })
  },

  // ── Toggle folder - O(1) ─────────────────────────────
  toggleFolder: (folderId) => {
    const state = get()
    const node = state.nodeMap[folderId]
    if (!node || node.type !== 'folder') return

    const newExpanded = new Set(state.expandedIds)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }

    const newNodeMap = {
      ...state.nodeMap,
      [folderId]: { ...node, isExpanded: !node.isExpanded },
    }

    const visibleIds = computeVisibleIds(newNodeMap, state.childLists, newExpanded)

    set({
      expandedIds: newExpanded,
      nodeMap: newNodeMap,
      visibleIds,
    })
  },

  // ── Load children from API ───────────────────────────
  loadChildren: (parentId, folders, scripts) => {
    const state = get()
    const nodeId = parentId ? `folder:${parentId}` : null
    const parentKey = nodeId || '__root__'
    const parentNode = nodeId ? state.nodeMap[nodeId] : null
    const childDepth = parentNode ? parentNode.depth + 1 : 0

    const newNodeMap = { ...state.nodeMap }
    const children: string[] = []

    folders.forEach(f => {
      const node = makeFolderNode(f, childDepth)
      newNodeMap[node.id] = node
      children.push(node.id)
    })
    scripts.forEach(s => {
      const node = makeScriptNode(s, childDepth, nodeId)
      newNodeMap[node.id] = node
      children.push(node.id)
    })

    if (nodeId && parentNode) {
      newNodeMap[nodeId] = { ...parentNode, isLoading: false, hasChildren: children.length > 0 || folders.length > 0 }
    }

    const newChildLists = { ...state.childLists, [parentKey]: children }
    const visibleIds = computeVisibleIds(newNodeMap, newChildLists, state.expandedIds)

    set({
      nodeMap: newNodeMap,
      childLists: newChildLists,
      visibleIds,
    })
  },

  setLoading: (folderId, loading) => {
    set(state => ({
      nodeMap: { ...state.nodeMap, [folderId]: { ...state.nodeMap[folderId], isLoading: loading } },
    }))
  },

  // ── Selection ────────────────────────────────────────
  selectNode: (nodeId) => {
    set({ selectedId: nodeId })
  },

  setCurrentFolder: (folderId) => {
    set({ currentFolderId: folderId, selectedId: folderId ? `folder:${folderId}` : null })
  },

  setBreadcrumb: (items) => {
    set({ breadcrumb: items })
  },

  setFileContent: (content) => {
    set({ activeFileContent: content, loadingFile: false })
  },

  setLoadingFile: (loading) => {
    set({ loadingFile: loading })
  },

  // ── DnD ──────────────────────────────────────────────
  setDragOver: (nodeId) => {
    set({ dragOverId: nodeId })
  },

  setDragItems: (items) => {
    set({ dragItems: items })
  },

  // ── CRUD ─────────────────────────────────────────────
  invalidateParent: (parentId) => {
    const key = parentId || '__root__'
    set(state => {
      const newChildLists = { ...state.childLists, [key]: [] }
      const visibleIds = computeVisibleIds(state.nodeMap, newChildLists, state.expandedIds)
      return {
        childLists: newChildLists,
        visibleIds,
      }
    })
  },

  removeNode: (nodeId) => {
    set(state => {
      const newNodeMap = { ...state.nodeMap }
      delete newNodeMap[nodeId]

      const newChildLists = { ...state.childLists }
      delete newChildLists[nodeId]

      for (const parentKey in newChildLists) {
        if (newChildLists[parentKey].includes(nodeId)) {
          newChildLists[parentKey] = newChildLists[parentKey].filter(id => id !== nodeId)
        }
      }

      const newExpanded = new Set(state.expandedIds)
      newExpanded.delete(nodeId)

      const visibleIds = computeVisibleIds(newNodeMap, newChildLists, newExpanded)

      return {
        nodeMap: newNodeMap,
        childLists: newChildLists,
        expandedIds: newExpanded,
        selectedId: state.selectedId === nodeId ? null : state.selectedId,
        visibleIds,
      }
    })
  },

  renameNode: (nodeId, newName) => {
    set(state => {
      const node = state.nodeMap[nodeId]
      if (!node) return state
      return {
        nodeMap: {
          ...state.nodeMap,
          [nodeId]: { ...node, name: sanitize(newName) },
        },
      }
    })
  },

  updateScriptStatus: (scriptId, newStatus) => {
    set(state => {
      const nodeId = `script:${scriptId}`
      const node = state.nodeMap[nodeId]
      if (!node || node.type !== 'script' || !node.scriptData) return state
      const updatedScript = { ...node.scriptData, status: newStatus }
      return {
        nodeMap: {
          ...state.nodeMap,
          [nodeId]: { ...node, scriptData: updatedScript },
        },
      }
    })
  },

  reset: () => {
    set({
      nodeMap: {},
      childLists: { '__root__': [] },
      expandedIds: new Set(),
      selectedId: null,
      currentFolderId: null,
      breadcrumb: [],
      activeFileContent: '',
      loadingFile: false,
      visibleIds: [],
      dragOverId: null,
      dragItems: [],
    })
  },

  // ── Derived: flat ordered visible IDs ────────────────
  getVisibleIds: () => {
    const { nodeMap, childLists, expandedIds } = get()

    const result: string[] = []
    const walk = (parentKey: string) => {
      const children = childLists[parentKey] || []
      for (const childId of children) {
        result.push(childId)
        const node = nodeMap[childId]
        if (node && node.type === 'folder' && (expandedIds.has(childId) || node.isExpanded)) {
          walk(childId)
        }
      }
    }
    walk('__root__')
    return result
  },
}))
