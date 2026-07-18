"use client"

// SSELFIE Studio 3.0 - Concierge Handoff state.
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
  CalendarPostTarget,
  ConciergeContextValue,
  ConciergeSession,
  GraphicTextSpec,
  OpenConciergeOptions,
  OutputFormat,
} from "./types"
import {
  cacheServerMayaDraftSnapshot,
  clearMayaDraft,
  readConciergeSnapshot,
  saveConciergeSnapshot,
} from "./continuity"

const ConciergeContext = createContext<ConciergeContextValue | null>(null)

const GENERAL_MAYA_AESTHETIC: Aesthetic = {
  id: "maya-general",
  name: "SSELFIE",
  blurb: "Let's make something that's truly you.",
  coverImage: "",
  thumbnails: [],
  shotCount: 0,
  intent:
    "A general SSELFIE editorial brand session. Help her decide the look from her brand, then create.",
}

function calendarCreationIdea(target: CalendarPostTarget): string {
  return (
    target.caption?.trim() ||
    target.contentPillar?.trim() ||
    `Post ${target.position} in my content calendar`
  ).slice(0, 400)
}

export function ConciergeProvider({
  children,
  suppressRestore = false,
}: {
  children: React.ReactNode
  /** An explicit external creation handoff outranks a previously saved draft. */
  suppressRestore?: boolean
}) {
  const restoredSavedAtRef = useRef<number | null>(null)
  const [session, setSession] = useState<ConciergeSession | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [workspaceBusy, setWorkspaceBusy] = useState(false)
  const hasSavedSession = Boolean(session)

  const openWithAesthetic = useCallback(
    (aesthetic: Aesthetic, opts?: OpenConciergeOptions) => {
      if (workspaceBusy) {
        setIsOpen(true)
        return
      }
      // Stamp now (cheap, urgent), but mark the heavy concierge mount as a non-urgent transition
      // so the tap paints immediately instead of blocking the main thread (fixes the INP stall).
      const startedAt = Date.now()
      startTransition(() => {
        setSession({
          aesthetic,
          outputFormat: opts?.format ?? null,
          referenceSelfieUrl: opts?.referenceSelfieUrl ?? null,
          videoSourceUrl: opts?.videoSourceUrl ?? null,
          inspirationImageUrl: opts?.inspirationImageUrl ?? null,
          graphicText: null,
          seedPrompt: opts?.seed ?? null,
          creationIntent:
            opts?.creationIntent ??
            (opts?.format ? { format: opts.format, source: "manual", confidence: "high" } : null),
          shotDirector: opts?.shotDirector ?? null,
          generationSource: opts?.generationSource ?? null,
          initialSetupAction: opts?.initialSetupAction ?? null,
          creationIdea: opts?.creationIdea ?? null,
          startedAt,
        })
        setIsOpen(true)
      })
    },
    [workspaceBusy]
  )

  const updateCurrentSession = useCallback((aesthetic: Aesthetic, opts?: OpenConciergeOptions) => {
    setSession(prev => {
      if (!prev) return prev
      return {
        ...prev,
        aesthetic,
        outputFormat: opts?.format ?? prev.outputFormat,
        referenceSelfieUrl:
          opts?.referenceSelfieUrl !== undefined
            ? opts.referenceSelfieUrl
            : prev.referenceSelfieUrl,
        videoSourceUrl:
          opts?.videoSourceUrl !== undefined ? opts.videoSourceUrl : prev.videoSourceUrl,
        inspirationImageUrl:
          opts?.inspirationImageUrl !== undefined
            ? opts.inspirationImageUrl
            : prev.inspirationImageUrl,
        seedPrompt: opts?.seed ?? prev.seedPrompt,
        creationIntent: opts?.creationIntent ?? prev.creationIntent,
        shotDirector: opts?.shotDirector ?? prev.shotDirector,
        generationSource: opts?.generationSource ?? prev.generationSource,
        initialSetupAction:
          opts && Object.prototype.hasOwnProperty.call(opts, "initialSetupAction")
            ? (opts.initialSetupAction ?? null)
            : prev.initialSetupAction,
        creationIdea: opts?.creationIdea ?? prev.creationIdea,
        // Keep the same workspace identity. Normal style/shot choices must never wipe the
        // visible conversation or generated cards.
        startedAt: prev.startedAt,
      }
    })
    setIsOpen(true)
  }, [])

  const openForCalendarPost = useCallback(
    (target: CalendarPostTarget) => {
      if (workspaceBusy) {
        setIsOpen(true)
        return
      }
      startTransition(() => {
        setSession(prev => {
          const existingTarget =
            prev?.calendarTarget?.requestId === target.requestId ? prev.calendarTarget : null
          const canKeepDelivery = existingTarget?.delivery?.imageUrl === target.imageUrl
          const calendarTarget: CalendarPostTarget = existingTarget
            ? {
                ...target,
                announced: existingTarget.announced,
                delivery: canKeepDelivery ? (existingTarget.delivery ?? null) : null,
              }
            : { ...target, announced: false, delivery: null }
          if (prev) {
            return {
              ...prev,
              outputFormat: "photo",
              seedPrompt: null,
              creationIdea: calendarCreationIdea(target),
              creationIntent: { format: "photo", source: "content_card", confidence: "high" },
              generationSource: null,
              initialSetupAction: null,
              calendarTarget,
              // Calendar is another surface for the same conversation, not a second chat.
              startedAt: prev.startedAt,
            }
          }
          return {
            aesthetic: GENERAL_MAYA_AESTHETIC,
            outputFormat: "photo",
            referenceSelfieUrl: null,
            videoSourceUrl: null,
            inspirationImageUrl: null,
            graphicText: null,
            seedPrompt: null,
            creationIdea: calendarCreationIdea(target),
            creationIntent: { format: "photo", source: "content_card", confidence: "high" },
            shotDirector: null,
            generationSource: null,
            initialSetupAction: null,
            calendarTarget,
            startedAt: Date.now(),
          }
        })
        setIsOpen(true)
      })
    },
    [workspaceBusy]
  )

  const markCalendarTargetAnnounced = useCallback((requestId: string) => {
    setSession(prev =>
      prev?.calendarTarget?.requestId === requestId
        ? {
            ...prev,
            calendarTarget: { ...prev.calendarTarget, announced: true },
          }
        : prev
    )
  }, [])

  const completeCalendarTarget = useCallback(
    (requestId: string, delivery: NonNullable<CalendarPostTarget["delivery"]>) => {
      setSession(prev =>
        prev?.calendarTarget?.requestId === requestId
          ? {
              ...prev,
              calendarTarget: {
                ...prev.calendarTarget,
                hasImage: true,
                imageUrl: delivery.imageUrl,
                aiImageId: delivery.aiImageId,
                delivery,
              },
            }
          : prev
      )
    },
    []
  )

  const clearCalendarDelivery = useCallback((requestId: string) => {
    setSession(prev =>
      prev?.calendarTarget?.requestId === requestId
        ? {
            ...prev,
            calendarTarget: {
              ...prev.calendarTarget,
              hasImage: Boolean(prev.calendarTarget.delivery?.previousImageUrl),
              imageUrl: prev.calendarTarget.delivery?.previousImageUrl ?? null,
              aiImageId: prev.calendarTarget.delivery?.previousAiImageId ?? null,
              delivery: null,
            },
          }
        : prev
    )
  }, [])

  const setOutputFormat = useCallback((format: OutputFormat | null) => {
    setSession(prev => (prev ? { ...prev, outputFormat: format } : prev))
  }, [])

  const setReferenceSelfieUrl = useCallback((url: string | null) => {
    setSession(prev => (prev ? { ...prev, referenceSelfieUrl: url } : prev))
  }, [])

  const setVideoSourceUrl = useCallback((url: string | null) => {
    setSession(prev => (prev ? { ...prev, videoSourceUrl: url } : prev))
  }, [])

  const resetCurrentSession = useCallback(() => {
    if (workspaceBusy) {
      setIsOpen(true)
      return
    }
    setSession(prev =>
      prev
        ? {
            ...prev,
            outputFormat: null,
            graphicText: null,
            seedPrompt: null,
            creationIntent: null,
            shotDirector: null,
            generationSource: null,
            inspirationImageUrl: null,
            initialSetupAction: null,
            creationIdea: null,
            calendarTarget: null,
            startedAt: Date.now(),
          }
        : prev
    )
    setIsOpen(true)
  }, [workspaceBusy])

  const setGraphicText = useCallback((spec: GraphicTextSpec) => {
    setSession(prev => (prev ? { ...prev, graphicText: spec } : prev))
  }, [])

  const open = useCallback(() => {
    startTransition(() => {
      setSession(
        prev =>
          prev ?? {
            aesthetic: GENERAL_MAYA_AESTHETIC,
            outputFormat: null,
            referenceSelfieUrl: null,
            videoSourceUrl: null,
            inspirationImageUrl: null,
            graphicText: null,
            seedPrompt: null,
            creationIntent: null,
            shotDirector: null,
            generationSource: null,
            initialSetupAction: null,
            creationIdea: null,
            startedAt: Date.now(),
          }
      )
      setIsOpen(true)
    })
  }, [])

  const openFresh = useCallback(
    (opts?: Pick<OpenConciergeOptions, "referenceSelfieUrl">) => {
      if (workspaceBusy) {
        setIsOpen(true)
        return
      }
      const startedAt = Date.now()
      clearMayaDraft()
      // Also outranks any in-flight server-draft GET: a draft saved before this moment must
      // never be restored over a session the member explicitly started clean.
      restoredSavedAtRef.current = startedAt
      void fetch("/api/app-v3/maya/draft", { method: "DELETE" }).catch(() => {})
      startTransition(() => {
        setSession({
          aesthetic: GENERAL_MAYA_AESTHETIC,
          outputFormat: null,
          referenceSelfieUrl: opts?.referenceSelfieUrl ?? session?.referenceSelfieUrl ?? null,
          videoSourceUrl: null,
          inspirationImageUrl: null,
          graphicText: null,
          seedPrompt: "Help me choose what to make today.",
          creationIntent: { format: null, source: "manual", confidence: "needs_clarify" },
          shotDirector: null,
          generationSource: null,
          initialSetupAction: null,
          creationIdea: null,
          startedAt,
        })
        setIsOpen(true)
      })
    },
    [session?.referenceSelfieUrl, workspaceBusy]
  )

  const close = useCallback(() => setIsOpen(false), [])

  // "Continue history" opens the real chat list inside the drawer (UX audit 2026-07-06 #2):
  // continuing means choosing a past thread explicitly, not re-showing in-memory state.
  const [historyRequestId, setHistoryRequestId] = useState(0)
  const openHistory = useCallback(() => {
    setSession(
      prev =>
        prev ?? {
          aesthetic: GENERAL_MAYA_AESTHETIC,
          outputFormat: null,
          referenceSelfieUrl: null,
          videoSourceUrl: null,
          inspirationImageUrl: null,
          graphicText: null,
          seedPrompt: null,
          creationIntent: null,
          shotDirector: null,
          generationSource: null,
          initialSetupAction: null,
          creationIdea: null,
          startedAt: Date.now(),
        }
    )
    setIsOpen(true)
    setHistoryRequestId(n => n + 1)
  }, [])

  useEffect(() => {
    saveConciergeSnapshot({ isOpen, session })
  }, [isOpen, session])

  useEffect(() => {
    if (suppressRestore) return

    const local = readConciergeSnapshot()
    if (local) {
      restoredSavedAtRef.current = local.savedAt
      setSession(local.session)
      setIsOpen(false)
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
        setIsOpen(false)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [suppressRestore])

  const value = useMemo<ConciergeContextValue>(
    () => ({
      session,
      isOpen,
      workspaceBusy,
      setWorkspaceBusy,
      hasSavedSession,
      open,
      openFresh,
      openHistory,
      historyRequestId,
      openWithAesthetic,
      updateCurrentSession,
      openForCalendarPost,
      markCalendarTargetAnnounced,
      completeCalendarTarget,
      clearCalendarDelivery,
      resetCurrentSession,
      setOutputFormat,
      setReferenceSelfieUrl,
      setVideoSourceUrl,
      setGraphicText,
      close,
    }),
    [
      session,
      isOpen,
      workspaceBusy,
      hasSavedSession,
      open,
      openFresh,
      openHistory,
      historyRequestId,
      openWithAesthetic,
      updateCurrentSession,
      openForCalendarPost,
      markCalendarTargetAnnounced,
      completeCalendarTarget,
      clearCalendarDelivery,
      resetCurrentSession,
      setOutputFormat,
      setReferenceSelfieUrl,
      setVideoSourceUrl,
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
