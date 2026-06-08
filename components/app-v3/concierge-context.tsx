"use client"

// SSELFIE Studio 3.0 — Concierge Handoff state.
// Clicking an aesthetic tile opens Maya with that vibe preloaded. This context holds
// that session so the front door and the concierge panel stay in sync.

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { Aesthetic, ConciergeContextValue, ConciergeSession, OutputFormat } from "./types"

const ConciergeContext = createContext<ConciergeContextValue | null>(null)

export function ConciergeProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<ConciergeSession | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const openWithAesthetic = useCallback((aesthetic: Aesthetic) => {
    setSession({
      aesthetic,
      outputFormat: null,
      referenceSelfieUrl: null,
      startedAt: Date.now(),
    })
    setIsOpen(true)
  }, [])

  const setOutputFormat = useCallback((format: OutputFormat) => {
    setSession((prev) => (prev ? { ...prev, outputFormat: format } : prev))
  }, [])

  const setReferenceSelfieUrl = useCallback((url: string | null) => {
    setSession((prev) => (prev ? { ...prev, referenceSelfieUrl: url } : prev))
  }, [])

  const close = useCallback(() => setIsOpen(false), [])

  const value = useMemo<ConciergeContextValue>(
    () => ({ session, isOpen, openWithAesthetic, setOutputFormat, setReferenceSelfieUrl, close }),
    [session, isOpen, openWithAesthetic, setOutputFormat, setReferenceSelfieUrl, close],
  )

  return <ConciergeContext.Provider value={value}>{children}</ConciergeContext.Provider>
}

export function useConcierge(): ConciergeContextValue {
  const ctx = useContext(ConciergeContext)
  if (!ctx) throw new Error("useConcierge must be used within a ConciergeProvider")
  return ctx
}
