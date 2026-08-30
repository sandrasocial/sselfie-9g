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
  LessonMayaTarget,
  OpenConciergeOptions,
  OutputFormat,
} from "./types"
import {
  isFormatAllowedForMayaPath,
  mayaWorkspacePathForFormat,
  type MayaWorkspacePath,
} from "@/lib/app-v3/maya/workspace-path"
import {
  cacheServerMayaDraftSnapshot,
  clearMayaDraft,
  readConciergeSnapshot,
  readMayaDraftForSession,
  saveConciergeSnapshot,
} from "./continuity"
import {
  calendarMayaTaskId,
  createMayaContextEnvelope,
  mayaContextMatchesCalendarPost,
  learningMayaTaskId,
  newMayaTaskId,
  type MayaContextEnvelope,
  type MayaJob,
  type MayaSurface,
} from "@/lib/app-v3/maya/context-envelope"

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

function isCalendarCaptionTask(target: CalendarPostTarget | null): boolean {
  return (
    target?.requestedAction === "redo_caption" ||
    target?.requestedAction === "improve_caption"
  )
}

function calendarWorkspacePath(target: CalendarPostTarget | null): MayaWorkspacePath | null {
  if (!target) return null
  return isCalendarCaptionTask(target)
    ? "build-post"
    : mayaWorkspacePathForFormat(target.plannedFormat)
}

function calendarOutputFormat(target: CalendarPostTarget | null): OutputFormat | null {
  return target && !isCalendarCaptionTask(target) ? target.plannedFormat : null
}

function jobForSurface(surface: MayaSurface): MayaJob {
  if (surface === "calendar") return "decide_post"
  if (surface === "learn") return "learn_next"
  return "create_content"
}

function newSurfaceContext(surface: MayaSurface, taskId = newMayaTaskId()): MayaContextEnvelope {
  return createMayaContextEnvelope({
    taskId,
    job: jobForSurface(surface),
    surface,
    startedAt: new Date().toISOString(),
  })
}

function createCleanSession({
  previous,
  context,
  aesthetic = GENERAL_MAYA_AESTHETIC,
  options,
  calendarTarget = null,
}: {
  previous: ConciergeSession | null
  context: MayaContextEnvelope
  aesthetic?: Aesthetic
  options?: OpenConciergeOptions
  calendarTarget?: CalendarPostTarget | null
}): ConciergeSession {
  const startedAt = Date.parse(context.startedAt)
  return {
    mayaContext: context,
    workspacePath:
      options?.workspacePath ??
      (calendarTarget
        ? calendarWorkspacePath(calendarTarget)
        : mayaWorkspacePathForFormat(options?.format ?? null)),
    aesthetic,
    outputFormat: options?.format ?? calendarOutputFormat(calendarTarget),
    referenceSelfieUrl: options?.referenceSelfieUrl ?? previous?.referenceSelfieUrl ?? null,
    videoSourceUrl: options?.videoSourceUrl ?? null,
    inspirationImageUrl: options?.inspirationImageUrl ?? null,
    graphicText: null,
    seedPrompt: options?.seed ?? null,
    creationIdea:
      options?.creationIdea ?? (calendarTarget ? calendarCreationIdea(calendarTarget) : null),
    creationIntent:
      options?.creationIntent ??
      (calendarTarget && !isCalendarCaptionTask(calendarTarget)
        ? { format: calendarTarget.plannedFormat, source: "content_card", confidence: "high" }
        : options?.format
          ? { format: options.format, source: "manual", confidence: "high" }
          : null),
    shotDirector: options?.shotDirector ?? null,
    generationSource: options?.generationSource ?? null,
    initialSetupAction: options?.initialSetupAction ?? null,
    calendarTarget,
    startedAt: Number.isFinite(startedAt) ? startedAt : Date.now(),
  }
}

function migrateLegacySession(session: ConciergeSession, taskId: string): ConciergeSession {
  if (session.mayaContext) return session
  return {
    ...session,
    mayaContext: createMayaContextEnvelope({
      taskId,
      job: "create_content",
      surface: "create",
      startedAt: new Date(session.startedAt).toISOString(),
    }),
    // A legacy Calendar target cannot prove which thread owns it. History is preserved, while
    // ambiguous targeting is cleared so a reload cannot act on the wrong post.
    calendarTarget: null,
  }
}

export function ConciergeProvider({
  children,
  suppressRestore = false,
  operatingLayerEnabled = false,
  initialSurface = "create",
}: {
  children: React.ReactNode
  /** An explicit external creation handoff outranks a previously saved draft. */
  suppressRestore?: boolean
  operatingLayerEnabled?: boolean
  initialSurface?: MayaSurface
}) {
  const restoredSavedAtRef = useRef<number | null>(null)
  // Once the member explicitly starts or restores a session in THIS tab, the mount-time
  // server-draft GET must never clobber it — a late-resolving restore was observed live
  // replacing an active mid-stream session and losing its just-sent messages
  // (UX audit 2026-07-29, issue B1).
  const explicitSessionRef = useRef(false)
  const [session, setSession] = useState<ConciergeSession | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [workspaceBusy, setWorkspaceBusy] = useState(false)
  const [activeSurface, setActiveSurfaceState] = useState<MayaSurface>(initialSurface)
  const hasSavedSession = Boolean(session)

  // Every user-initiated session action calls this so it outranks draft restoration —
  // both the in-flight mount GET and anything saved before this moment.
  const claimSessionAuthority = useCallback(() => {
    explicitSessionRef.current = true
    restoredSavedAtRef.current = Date.now()
  }, [])

  const openWithAesthetic = useCallback(
    (aesthetic: Aesthetic, opts?: OpenConciergeOptions) => {
      if (workspaceBusy) {
        setIsOpen(true)
        return
      }
      // Stamp now (cheap, urgent), but mark the heavy concierge mount as a non-urgent transition
      // so the tap paints immediately instead of blocking the main thread (fixes the INP stall).
      const startedAt = Date.now()
      claimSessionAuthority()
      startTransition(() => {
        if (operatingLayerEnabled) {
          const context = createMayaContextEnvelope({
            taskId: newMayaTaskId(),
            job: jobForSurface(activeSurface),
            surface: activeSurface,
            ...(opts?.inspirationImageUrl
              ? {
                  inspirationRef: {
                    url: opts.inspirationImageUrl,
                    explicitlyCarried: true,
                  },
                }
              : {}),
            startedAt: new Date(startedAt).toISOString(),
          })
          setSession(previous =>
            createCleanSession({ previous, context, aesthetic, options: opts })
          )
          setIsOpen(true)
          return
        }
        setSession({
          workspacePath:
            opts?.workspacePath ?? mayaWorkspacePathForFormat(opts?.format ?? null),
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
    [activeSurface, claimSessionAuthority, operatingLayerEnabled, workspaceBusy]
  )

  const updateCurrentSession = useCallback(
    (aesthetic: Aesthetic, opts?: OpenConciergeOptions) => {
      claimSessionAuthority()
      setSession(prev => {
        if (!prev) return prev
        return {
          ...prev,
          workspacePath:
            opts && Object.prototype.hasOwnProperty.call(opts, "workspacePath")
              ? (opts.workspacePath ?? null)
              : (prev.workspacePath ?? mayaWorkspacePathForFormat(opts?.format ?? null)),
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
      // Deliberately does NOT open the drawer: every interactive caller already has it open,
      // and the task-hydration effect calls this while the drawer is CLOSED on /app load —
      // the unconditional setIsOpen(true) here was the real "stale drawer auto-opens on every
      // load" bug (2026-07-29 live verification; survived e2a3445f, which only fixed restore).
    },
    [claimSessionAuthority]
  )

  const openForCalendarPost = useCallback(
    (target: CalendarPostTarget) => {
      if (workspaceBusy) {
        setIsOpen(true)
        return
      }
      claimSessionAuthority()
      startTransition(() => {
        if (operatingLayerEnabled) {
          setSession(previous => {
            const sameTask = mayaContextMatchesCalendarPost(
              previous?.mayaContext,
              target.feedId,
              target.postId
            )
            const existingTarget = sameTask ? previous?.calendarTarget : null
            const canKeepDelivery = existingTarget?.delivery?.imageUrl === target.imageUrl
            const canKeepCaptionAction =
              existingTarget != null &&
              existingTarget.requestedAction === target.requestedAction &&
              existingTarget.postId === target.postId
            const calendarTarget: CalendarPostTarget = existingTarget
              ? {
                  ...target,
                  announced: existingTarget.announced,
                  delivery: canKeepDelivery ? (existingTarget.delivery ?? null) : null,
                  actionPreviousCaption: canKeepCaptionAction
                    ? existingTarget.actionPreviousCaption
                    : undefined,
                  captionActionStatus: canKeepCaptionAction
                    ? existingTarget.captionActionStatus
                    : undefined,
                }
              : { ...target, announced: false, delivery: null }

            if (sameTask && previous) {
              return {
                ...previous,
                workspacePath: calendarWorkspacePath(target),
                outputFormat: calendarOutputFormat(target),
                creationIdea: calendarCreationIdea(target),
                creationIntent: isCalendarCaptionTask(target)
                  ? null
                  : {
                      format: target.plannedFormat,
                      source: "content_card",
                      confidence: "high",
                    },
                calendarTarget,
              }
            }

            const taskId = calendarMayaTaskId(target.feedId, target.postId)
            const context = createMayaContextEnvelope({
              taskId,
              job: "finish_calendar_post",
              surface: "calendar",
              feedId: target.feedId,
              postId: target.postId,
              postPosition: target.position,
              startedAt: new Date().toISOString(),
            })
            return createCleanSession({ previous, context, calendarTarget })
          })
          setIsOpen(true)
          return
        }
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
              workspacePath: calendarWorkspacePath(target),
              outputFormat: calendarOutputFormat(target),
              seedPrompt: null,
              creationIdea: calendarCreationIdea(target),
              creationIntent: isCalendarCaptionTask(target)
                ? null
                : {
                    format: target.plannedFormat,
                    source: "content_card",
                    confidence: "high",
                  },
              generationSource: null,
              initialSetupAction: null,
              calendarTarget,
              startedAt: prev.startedAt,
            }
          }
          return {
            aesthetic: GENERAL_MAYA_AESTHETIC,
            workspacePath: calendarWorkspacePath(target),
            outputFormat: calendarOutputFormat(target),
            referenceSelfieUrl: null,
            videoSourceUrl: null,
            inspirationImageUrl: null,
            graphicText: null,
            seedPrompt: null,
            creationIdea: calendarCreationIdea(target),
            creationIntent: isCalendarCaptionTask(target)
              ? null
              : {
                  format: target.plannedFormat,
                  source: "content_card",
                  confidence: "high",
                },
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
    [claimSessionAuthority, operatingLayerEnabled, workspaceBusy]
  )

  const openForLesson = useCallback(
    (target: LessonMayaTarget) => {
      if (workspaceBusy) {
        setIsOpen(true)
        return
      }
      claimSessionAuthority()
      startTransition(() => {
        if (!operatingLayerEnabled) {
          openWithAesthetic(GENERAL_MAYA_AESTHETIC, {
            seed: `Help me use what I learned in ${target.lessonTitle}.`,
            creationIdea: target.lessonTitle,
          })
          return
        }
        const taskId = target.taskId || learningMayaTaskId(target.courseId, target.lessonId)
        const context = createMayaContextEnvelope({
          taskId,
          job: "learn_next",
          surface: "learn",
          lessonRef: { courseId: target.courseId, lessonId: target.lessonId },
          startedAt: new Date().toISOString(),
        })
        setSession(previous => createCleanSession({ previous, context }))
        setIsOpen(true)
      })
    },
    [claimSessionAuthority, openWithAesthetic, operatingLayerEnabled, workspaceBusy]
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
                mediaUrls: delivery.imageUrls,
                aiImageId: delivery.aiImageId,
                caption: delivery.deliveredCaption,
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
              mediaUrls: prev.calendarTarget.delivery?.previousMediaUrls ?? [],
              aiImageId: prev.calendarTarget.delivery?.previousAiImageId ?? null,
              caption: prev.calendarTarget.delivery?.previousCaption ?? null,
              delivery: null,
            },
          }
        : prev
    )
  }, [])

  const updateCalendarTargetCaption = useCallback(
    (requestId: string, caption: string, status: "succeeded" | "undone") => {
      setSession(prev =>
        prev?.calendarTarget?.requestId === requestId
          ? {
              ...prev,
              calendarTarget: {
                ...prev.calendarTarget,
                caption,
                actionPreviousCaption:
                  status === "succeeded" && prev.calendarTarget.actionPreviousCaption === undefined
                    ? prev.calendarTarget.caption
                    : prev.calendarTarget.actionPreviousCaption,
                captionActionStatus: status,
              },
            }
          : prev
      )
    },
    []
  )

  const setOutputFormat = useCallback((format: OutputFormat | null) => {
    setSession(prev => {
      if (!prev) return prev
      if (prev.workspacePath && !isFormatAllowedForMayaPath(prev.workspacePath, format)) return prev
      return {
        ...prev,
        workspacePath: prev.workspacePath ?? mayaWorkspacePathForFormat(format),
        outputFormat: format,
      }
    })
  }, [])

  const setWorkspacePath = useCallback(
    (path: MayaWorkspacePath) => {
      if (workspaceBusy) {
        setIsOpen(true)
        return
      }
      claimSessionAuthority()
      const startedAt = Date.now()
      setActiveSurfaceState("create")
      setSession(previous => {
        if (previous?.workspacePath === path) return previous
        const context = createMayaContextEnvelope({
          taskId: newMayaTaskId(),
          job: "create_content",
          surface: "create",
          startedAt: new Date(startedAt).toISOString(),
        })
        return createCleanSession({
          previous,
          context,
          options: {
            workspacePath: path,
            referenceSelfieUrl: previous?.referenceSelfieUrl ?? null,
          },
        })
      })
      setIsOpen(true)
    },
    [claimSessionAuthority, workspaceBusy]
  )

  const setReferenceSelfieUrl = useCallback((url: string | null) => {
    setSession(prev => (prev ? { ...prev, referenceSelfieUrl: url } : prev))
  }, [])

  const setVideoSourceUrl = useCallback((url: string | null) => {
    setSession(prev => (prev ? { ...prev, videoSourceUrl: url } : prev))
  }, [])

  const setActiveSurface = useCallback(
    (surface: MayaSurface, options?: { preserveCurrentTask?: boolean }) => {
      setActiveSurfaceState(surface)
      if (!operatingLayerEnabled || !isOpen || workspaceBusy) return
      setSession(previous => {
        if (previous?.mayaContext?.surface === surface) return previous
        if (options?.preserveCurrentTask && previous?.mayaContext) {
          return {
            ...previous,
            mayaContext: { ...previous.mayaContext, surface },
          }
        }
        return createCleanSession({ previous, context: newSurfaceContext(surface) })
      })
    },
    [isOpen, operatingLayerEnabled, workspaceBusy]
  )

  const restoreHistoryTask = useCallback(
    (taskId: string, restoredSession?: ConciergeSession | null) => {
      claimSessionAuthority()
      if (!operatingLayerEnabled) {
        if (restoredSession) setSession(restoredSession)
        return
      }
      setSession(previous => {
        if (!restoredSession) {
          return createCleanSession({
            previous,
            context: newSurfaceContext(activeSurface, taskId),
          })
        }
        const migrated = migrateLegacySession(restoredSession, taskId)
        return {
          ...migrated,
          referenceSelfieUrl: migrated.referenceSelfieUrl ?? previous?.referenceSelfieUrl ?? null,
        }
      })
      setIsOpen(true)
    },
    [activeSurface, claimSessionAuthority, operatingLayerEnabled]
  )

  const resetCurrentSession = useCallback(
    (taskId?: string) => {
      if (workspaceBusy) {
        setIsOpen(true)
        return
      }
      claimSessionAuthority()
      if (operatingLayerEnabled) {
        setSession(previous =>
          createCleanSession({
            previous,
            context: newSurfaceContext(activeSurface, taskId ?? newMayaTaskId()),
          })
        )
        setIsOpen(true)
        return
      }
      setSession(prev =>
        prev
          ? {
              ...prev,
              workspacePath: null,
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
    },
    [activeSurface, claimSessionAuthority, operatingLayerEnabled, workspaceBusy]
  )

  const setGraphicText = useCallback((spec: GraphicTextSpec) => {
    setSession(prev => (prev ? { ...prev, graphicText: spec } : prev))
  }, [])

  const open = useCallback(() => {
    claimSessionAuthority()
    startTransition(() => {
      if (operatingLayerEnabled) {
        setSession(previous => {
          if (previous?.mayaContext?.surface === activeSurface) return previous
          return createCleanSession({ previous, context: newSurfaceContext(activeSurface) })
        })
        setIsOpen(true)
        return
      }
      setSession(
        prev =>
          prev ?? {
            workspacePath: null,
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
  }, [activeSurface, claimSessionAuthority, operatingLayerEnabled])

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
      claimSessionAuthority()
      void fetch("/api/app-v3/maya/draft", { method: "DELETE" }).catch(() => {})
      startTransition(() => {
        if (operatingLayerEnabled) {
          const context = createMayaContextEnvelope({
            taskId: newMayaTaskId(),
            job: jobForSurface(activeSurface),
            surface: activeSurface,
            startedAt: new Date(startedAt).toISOString(),
          })
          setSession(previous =>
            createCleanSession({
              previous,
              context,
              options: {
                referenceSelfieUrl:
                  opts?.referenceSelfieUrl ?? previous?.referenceSelfieUrl ?? null,
                seed: "Help me choose what to make today.",
                creationIntent: {
                  format: null,
                  source: "manual",
                  confidence: "needs_clarify",
                },
              },
            })
          )
          setIsOpen(true)
          return
        }
        setSession({
          workspacePath: null,
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
    [
      activeSurface,
      claimSessionAuthority,
      operatingLayerEnabled,
      session?.referenceSelfieUrl,
      workspaceBusy,
    ]
  )

  // Maya Home is a deterministic neutral front door. It preserves the member's selfie while
  // retiring any restored format, seed, target, or stale busy flag; the previous task remains
  // available through chat history and the visible Resume action.
  const openHome = useCallback(() => {
    const startedAt = Date.now()
    claimSessionAuthority()
    setWorkspaceBusy(false)
    setActiveSurfaceState("create")
    const context = createMayaContextEnvelope({
      taskId: newMayaTaskId(),
      job: "create_content",
      surface: "create",
      startedAt: new Date(startedAt).toISOString(),
    })
    setSession(previous => createCleanSession({ previous, context }))
    setIsOpen(true)
  }, [claimSessionAuthority])

  const close = useCallback(() => setIsOpen(false), [])

  // "Continue history" opens the real chat list inside the drawer (UX audit 2026-07-06 #2):
  // continuing means choosing a past thread explicitly, not re-showing in-memory state.
  const [historyRequestId, setHistoryRequestId] = useState(0)
  const openHistory = useCallback(() => {
    claimSessionAuthority()
    setSession(prev => {
      if (prev) return prev
      if (operatingLayerEnabled) {
        return createCleanSession({ previous: null, context: newSurfaceContext(activeSurface) })
      }
      return {
        workspacePath: null,
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
    })
    setIsOpen(true)
    setHistoryRequestId(n => n + 1)
  }, [activeSurface, claimSessionAuthority, operatingLayerEnabled])

  useEffect(() => {
    saveConciergeSnapshot({ isOpen, session })
  }, [isOpen, session])

  useEffect(() => {
    if (suppressRestore) return

    const local = readConciergeSnapshot()
    // Child surfaces can claim a fresh session during their mount effect before this provider
    // restore effect runs. That explicit choice outranks both local and server snapshots.
    if (local && !explicitSessionRef.current) {
      restoredSavedAtRef.current = local.savedAt
      const localDraft = readMayaDraftForSession(local.session.startedAt)
      setSession(
        operatingLayerEnabled
          ? migrateLegacySession(
              local.session,
              local.session.mayaContext?.taskId ?? localDraft?.chatId ?? newMayaTaskId()
            )
          : local.session
      )
      setIsOpen(false)
    }

    let cancelled = false
    fetch("/api/app-v3/maya/draft")
      .then(r => (r.ok ? r.json() : null))
      .then(payload => {
        if (cancelled) return
        const serverDraft = cacheServerMayaDraftSnapshot(payload?.draft)
        if (!serverDraft) return
        // A session the member explicitly started/restored in this tab always wins over the
        // mount-time draft, regardless of savedAt (clock skew, cross-device drafts).
        if (explicitSessionRef.current) return
        if (restoredSavedAtRef.current && restoredSavedAtRef.current >= serverDraft.savedAt) return
        restoredSavedAtRef.current = serverDraft.savedAt
        const restoredSession = serverDraft.session as ConciergeSession
        setSession(
          operatingLayerEnabled
            ? migrateLegacySession(
                restoredSession,
                restoredSession.mayaContext?.taskId ?? serverDraft.chatId
              )
            : restoredSession
        )
        setIsOpen(false)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [operatingLayerEnabled, suppressRestore])

  const value = useMemo<ConciergeContextValue>(
    () => ({
      session,
      isOpen,
      workspaceBusy,
      setWorkspaceBusy,
      setActiveSurface,
      restoreHistoryTask,
      hasSavedSession,
      open,
      openHome,
      openFresh,
      openHistory,
      historyRequestId,
      openWithAesthetic,
      updateCurrentSession,
      openForCalendarPost,
      openForLesson,
      markCalendarTargetAnnounced,
      completeCalendarTarget,
      clearCalendarDelivery,
      updateCalendarTargetCaption,
      resetCurrentSession,
      setOutputFormat,
      setWorkspacePath,
      setReferenceSelfieUrl,
      setVideoSourceUrl,
      setGraphicText,
      close,
    }),
    [
      session,
      isOpen,
      workspaceBusy,
      setActiveSurface,
      restoreHistoryTask,
      hasSavedSession,
      open,
      openHome,
      openFresh,
      openHistory,
      historyRequestId,
      openWithAesthetic,
      updateCurrentSession,
      openForCalendarPost,
      openForLesson,
      markCalendarTargetAnnounced,
      completeCalendarTarget,
      clearCalendarDelivery,
      updateCalendarTargetCaption,
      resetCurrentSession,
      setOutputFormat,
      setWorkspacePath,
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
