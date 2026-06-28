'use client'

import { useEffect, useRef, useCallback } from 'react'

interface DraftData {
  [key: string]: unknown
}

interface UseFormDraftOptions {
  /** localStorage key (use a unique, namespaced key) */
  key: string
  /** Initial/fallback data */
  initialData: DraftData
  /** Subscribe to data changes - the hook will call this to get the latest snapshot */
  getData: () => DraftData
  /** Restore data into the form */
  setData: (data: DraftData) => void
  /** Called after draft is restored on mount */
  onRestored?: () => void
  /** Whether to warn before closing tab/refresh (default: true) */
  warnBeforeUnload?: boolean
}

/**
 * useFormDraft - saves & restores form state to/from localStorage.
 *
 * - Immediate save via saveNow()
 * - Debounced auto-save (1.5s after last change) via scheduleSave()
 * - Saves synchronously on component unmount (catches SPA navigation)
 * - Restores saved draft on mount
 * - Clears draft on successful submit call
 * - Warns before page unload if draft exists
 */
export function useFormDraft({
  key,
  initialData,
  getData,
  setData,
  onRestored,
  warnBeforeUnload = true,
}: UseFormDraftOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const restoredRef = useRef(false)
  const getDataRef = useRef(getData)
  useEffect(() => {
    getDataRef.current = getData
  }, [getData])
  // Keep a fresh reference to getData so the unmount save always reads latest data

  /** Save current form data to localStorage (synchronous) */
  const saveNow = useCallback(() => {
    try {
      const data = getDataRef.current()
      localStorage.setItem(key, JSON.stringify(data))
    } catch {
      // localStorage might be full or unavailable
    }
  }, [key])

  /** Debounced save (called after each change) */
  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(saveNow, 1500)
  }, [saveNow])

  /** Clear draft from localStorage */
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
  }, [key])

  /** Save synchronously on unmount (catches SPA navigation like Back button) */
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      // Save immediately on unmount - this runs before SPA navigation completes
      saveNow()
    }
  }, [saveNow])

  /** Restore draft into the form on mount */
  useEffect(() => {
    if (restoredRef.current) return
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw) as DraftData
        setData({ ...initialData, ...parsed })
        restoredRef.current = true
        onRestored?.()
      }
    } catch {
      // corrupted data - ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Warn beforeunload if draft data exists
  useEffect(() => {
    if (!warnBeforeUnload) return

    const handler = (e: BeforeUnloadEvent) => {
      try {
        const raw = localStorage.getItem(key)
        if (raw) {
          e.preventDefault()
          e.returnValue = '' // triggers native warning
        }
      } catch {
        // ignore
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [key, warnBeforeUnload])

  return { saveNow, scheduleSave, clearDraft }
}
