"use client"

// SSELFIE Studio 3.0 — Concierge Handoff state.
// Clicking an aesthetic tile opens Maya with that vibe preloaded. This context holds
// that session so the front door and the concierge panel stay in sync.

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import type {
  Aesthetic,
  ConciergeContextValue,
  ConciergeSession,
  GraphicTextSpec,
  OpenConciergeOptions,
  OutputFormat,
} from "./types"
import {
  cacheServerMayaDraftSnapshot,
  readConciergeSnapshot,
  saveConciergeSnapshot,
} from "./continuity"

const ConciergeContext = createContext<ConciergeContextValue | null>(null)

export function ConciergeProvider({ children }: { children: React.ReactNode }) {
  const restoredSavedAtRef = useRef<number | null>(null)
  const [session, setSession] = useState<ConciergeSession | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const openWithAesthetic = useCallback((aesthetic: Aesthetic, opts?: OpenConciergeOptions) => {
    // Stamp now (cheap, urgent), but mark the heavy concierge mount as a non-urgent transition
    // so the tap paints immediately instead of blocking the main thread (fixes the INP stall).
    const startedAt = Date.now()
    startTransition(() => {
      setSession({
        aesthetic,
        outputFormat: opts?.format ?? null,
        referenceSelfieUrl: opts?.referenceSelfieUrl ?? null,
        graphicText: null,
        seedPrompt: opts?.seed ?? null,
        startedAt,
      })
      setIsOpen(true)
    })
  }, [])

  const setOutputFormat = useCallback((format: OutputFormat | null) => {
    setSession(prev => (prev ? { ...prev, outputFormat: format } : prev))
  }, [])

  const setReferenceSelfieUrl = useCallback((url: string | null) => {
    setSession(prev => (prev ? { ...prev, referenceSelfieUrl: url } : prev))
  }, [])

  const resetCurrentSession = useCallback(() => {
    setSession(prev =>
      prev
        ? {
            ...prev,
            outputFormat: null,
            graphicText: null,
            seedPrompt: null,
            startedAt: Date.now(),
          }
        : prev,
    )
    setIsOpen(true)
  }, [])

  const setGraphicText = useCallback((spec: GraphicTextSpec) => {
    setSession(prev => (prev ? { ...prev, graphicText: spec } : prev))
  }, [])

  const close = useCallback(() => setIsOpen(false), [])

  useEffect(() => {
    saveConciergeSnapshot({ isOpen, session })
  }, [isOpen, session])

  useEffect(() => {
    const local = readConciergeSnapshot()
    if (local) {
      restoredSavedAtRef.current = local.savedAt
      setSession(local.session)
      setIsOpen(local.isOpen)
    }

    let cancelled = false
    fetch("/api/app-v3/maya/draft")
      .then(r => (r.ok ? r.json() : null))
      .then(payload => {
        if (cancelled) return
        const serverDraft = cacheServerMayaDraftSnapshot(payload?.draft)
        if (!serverDraft) return
        if (restoredSavedAtRef.current && restoredSavedAtRef.current >= serverDraft.savedAt) return
        restoredSavedAtRef.current = serverDraft.savedAt
        setSession(serverDraft.session as ConciergeSession)
        setIsOpen(serverDraft.isOpen)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<ConciergeContextValue>(
    () => ({
      session,
      isOpen,
      openWithAesthetic,
      resetCurrentSession,
      setOutputFormat,
      setReferenceSelfieUrl,
      setGraphicText,
      close,
    }),
    [
      session,
      isOpen,
      openWithAesthetic,
      resetCurrentSession,
      setOutputFormat,
      setReferenceSelfieUrl,
      setGraphicText,
      close,
    ]
  )

  return <ConciergeContext.Provider value={value}>{children}</ConciergeContext.Provider>
}

export function useConcierge(): ConciergeContextValue {
  const ctx = useContext(ConciergeContext)
  if (!ctx) throw new Error("useConcierge must be used within a ConciergeProvider")
  return ctx
}
