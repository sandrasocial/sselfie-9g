"use client"

import Image from "next/image"
import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { ArrowUp, Check, ChevronDown, Loader2, Plus, RotateCcw, X } from "lucide-react"

import { ClarifyCard } from "@/components/app-v3/clarify-card"
import { Markdown } from "@/components/app-v3/markdown"
import { CalendarPlanSettingsCard } from "./calendar-plan-settings-card"
import { CalendarTextStudio } from "./calendar-text-studio"
import {
  CalendarDirectionOptions,
  type CalendarDirectionOption,
} from "./calendar-direction-options"
import type { CalendarAgentProposal, CalendarAgentResult } from "@/lib/feed-planner/calendar-agent"
import type { ClarifyPrompt } from "@/lib/app-v3/maya/concept-types"
import type { CalendarPlanSettings } from "@/lib/feed-planner/calendar-plan-settings"
import type { FeedVisualDirectionMode } from "./feed-style-modal"

const MAYA_AVATAR = "/images/ai-prompts/clean-girl-morning-shot-1.jpg"
const MAYA_DIRECTION_OPTIONS = [
  { mode: "maya", label: "Let Maya decide" },
  { mode: "curated", label: "Use Sandra’s favourites" },
  { mode: "inspiration", label: "Upload inspiration" },
  { mode: "custom", label: "Describe the look I want" },
] as const satisfies readonly CalendarDirectionOption[]

interface CalendarPostSummary {
  id: number
  position: number
  caption?: string | null
  contentPillar?: string | null
  scheduledAt?: string | null
  hasImage?: boolean
  imageUrl?: string | null
  generationStatus?: string | null
  predictionId?: string | null
}

interface CalendarFeedSummary {
  title?: string | null
  bio?: string | null
  visualDirectionMode?: FeedVisualDirectionMode | null
  visualDirectionBrief?: string | null
  inspirationImageUrl?: string | null
  feedStyle?: string | null
  feedStyleVariationId?: number | null
  posts: CalendarPostSummary[]
}

interface CalendarMessage {
  id: string
  role: "user" | "assistant"
  content: string
  proposal?: CalendarAgentProposal | null
}

interface CalendarMayaWorkspaceProps {
  feedId: number | null
  selectedPost: CalendarPostSummary | null
  feedSummary: CalendarFeedSummary | null
  onApplyProposal: (proposal: CalendarAgentProposal) => Promise<{ undoAvailable: boolean }>
  onUndo: () => Promise<void>
  busy?: boolean
  activityLabel?: string
  planSettings?: CalendarPlanSettings
  onSavePlanSettings?: (settings: CalendarPlanSettings) => Promise<void>
  planSettingsOpen?: boolean
  onPlanSettingsClosed?: () => void
  onPlanSettingsConfirmed?: () => void
  onPreviewProposal?: (proposal: CalendarAgentProposal) => void
  onClearPreview?: () => void
  onOpenPostDetails?: (postId: number) => void
  onClearSelectedPost?: () => void
  onOpenPhotoPicker?: (postId: number) => void
  onCreateNewGrid?: () => void
  onChooseVisualDirection?: (mode: FeedVisualDirectionMode) => void
  hasVisualDirection?: boolean
  hasContentContext?: boolean
  onOpenContentContext?: () => void
  onPostUpdated?: (updatedPost?: unknown) => void | Promise<void>
  displayMode?: "sidebar" | "embedded"
}

const storageKey = (feedId: number | null) => `calendar:maya-thread:v1:${feedId ?? "new"}`

function isUntouchedFeed(feedSummary: CalendarFeedSummary | null): boolean {
  return Boolean(
    feedSummary?.posts.length &&
    feedSummary.posts.every(post => !post.hasImage && !post.caption?.trim())
  )
}

function initialMessage(
  feedId: number | null,
  untouchedGrid = false,
  hasVisualDirection = false,
  hasContentContext = false
): CalendarMessage {
  return {
    id: "maya-welcome",
    role: "assistant",
    content: feedId
      ? untouchedGrid
        ? !hasVisualDirection
          ? "Your grid is empty, so let’s start with the visual direction. Choose the easiest way to show me what you like. Then I’ll shape each post with you, one image at a time, without making up your story."
          : !hasContentContext
            ? "Your visual direction is saved. Before I write anything, tell me what you do, who you help and what this month needs to do. That gives me enough real context to help without inventing your story."
            : "Your direction and real content context are ready. Let’s create your first post together, or you can create images and captions in bulk."
        : "I’ve got your month open. Tap any post and I’ll help you shape it right here."
      : "Let’s start with how you want your grid to feel. Choose what is easiest: I can decide, use one of Sandra’s favourites, follow your own description, or learn from an inspiration image. Then I’ll ask for any real business context I still need before I write your posts.",
  }
}

function savedMessages(value: unknown): CalendarMessage[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((message): message is CalendarMessage =>
      Boolean(
        message &&
        typeof message === "object" &&
        typeof message.id === "string" &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string"
      )
    )
    .slice(-16)
}

function suggestionsFor(selectedPost: CalendarPostSummary | null, hasFeed: boolean): ClarifyPrompt {
  if (!selectedPost) {
    return {
      question: hasFeed ? "What should we shape next?" : "Where should I start?",
      options: hasFeed
        ? [
            "Adjust my content mix",
            "Make the grid feel more like me",
            "Plan around my current offer",
          ]
        : ["Build my month", "Plan around my current offer", "Make the grid feel more like me"],
      allowFreeText: true,
    }
  }
  const generationStatus = selectedPost.generationStatus?.toLowerCase()
  if (generationStatus === "failed") {
    return {
      question: `Post ${selectedPost.position} image did not finish. What should I do next?`,
      options: ["Retry the image", "Use one from my Gallery", "Adjust the visual direction"],
      allowFreeText: true,
    }
  }
  if (
    !selectedPost.hasImage &&
    (generationStatus === "queued" ||
      generationStatus === "generating" ||
      Boolean(selectedPost.predictionId))
  ) {
    return {
      question: `Post ${selectedPost.position} is creating its image. What can we finish meanwhile?`,
      options: ["Write the caption", "Review the post idea", "Work on another post"],
      allowFreeText: true,
    }
  }
  if (selectedPost.hasImage && selectedPost.caption?.trim()) {
    return {
      question: `Post ${selectedPost.position} is ready. What would you like to adjust?`,
      options: [
        "Replace the photo",
        "Rewrite the hook",
        "Make the caption more personal",
        "Give this a softer CTA",
        "Swap this with another post",
      ],
      allowFreeText: true,
    }
  }
  if (selectedPost.hasImage) {
    return {
      question: `Post ${selectedPost.position} needs a caption. What should I do next?`,
      options: ["Write the caption", "Make this a personal post", "Start with a stronger hook"],
      allowFreeText: true,
    }
  }
  if (selectedPost.caption?.trim()) {
    return {
      question: `Post ${selectedPost.position} needs a photo. What should I do next?`,
      options: [
        "Create the image",
        "Use one from my Gallery",
        "Change the post idea",
        "Review the caption",
      ],
      allowFreeText: true,
    }
  }
  return {
    question: `Post ${selectedPost.position} needs an idea and caption. Where should I start?`,
    options: [
      "Shape the post idea",
      "Write the caption",
      "Make this a personal post",
      "Use one from my Gallery",
    ],
    allowFreeText: true,
  }
}

function proposalPreview(proposal: CalendarAgentProposal): string | null {
  if (proposal.kind === "update_caption") return proposal.caption
  if (proposal.kind === "update_bio") return proposal.bio
  if (proposal.kind === "move_post") return `Move post to position ${proposal.targetPosition}`
  if (proposal.kind === "generate_image")
    return "Create this post with the grid’s current visual direction"
  if (proposal.kind === "open_photo_picker")
    return "Open your Photos and choose an image for this post"
  if (proposal.kind === "open_style_picker") return "Open the visual direction picker"
  if (proposal.kind === "open_highlights") return "Open your Instagram highlights"
  if (proposal.kind === "create_plan") return "Plan the first version of this grid"
  return null
}

export function CalendarMayaWorkspace({
  feedId,
  selectedPost,
  feedSummary,
  onApplyProposal,
  onUndo,
  busy = false,
  activityLabel: externalActivityLabel,
  planSettings,
  onSavePlanSettings,
  planSettingsOpen = false,
  onPlanSettingsClosed,
  onPlanSettingsConfirmed,
  onPreviewProposal,
  onClearPreview,
  onOpenPostDetails,
  onClearSelectedPost,
  onOpenPhotoPicker,
  onCreateNewGrid,
  onChooseVisualDirection,
  hasVisualDirection = false,
  hasContentContext = false,
  onOpenContentContext,
  onPostUpdated,
  displayMode = "sidebar",
}: CalendarMayaWorkspaceProps) {
  const untouchedGrid = isUntouchedFeed(feedSummary)
  const needsVisualDirection = feedId === null || (untouchedGrid && !hasVisualDirection)
  const needsContentContext = Boolean(
    feedId !== null && untouchedGrid && hasVisualDirection && !hasContentContext
  )
  const readyToCreate = Boolean(
    feedId !== null && untouchedGrid && hasVisualDirection && hasContentContext
  )
  const firstPost = feedSummary?.posts
    .slice()
    .sort((left, right) => left.position - right.position)[0]
  const [expanded, setExpanded] = useState(displayMode === "embedded" || (busy && feedId === null))
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<CalendarMessage[]>(() => [
    initialMessage(feedId, untouchedGrid, hasVisualDirection, hasContentContext),
  ])
  const [status, setStatus] = useState<"idle" | "thinking" | "applying" | "syncing" | "error">(
    "idle"
  )
  const [error, setError] = useState<string | null>(null)
  const [appliedMessageId, setAppliedMessageId] = useState<string | null>(null)
  const [undoAvailable, setUndoAvailable] = useState(false)
  const [newMenuOpen, setNewMenuOpen] = useState(false)
  const [newChatConfirming, setNewChatConfirming] = useState(false)
  const [textStudioOpen, setTextStudioOpen] = useState(false)
  const threadEndRef = useRef<HTMLDivElement>(null)
  const scrollRegionRef = useRef<HTMLDivElement>(null)
  const skipNextPersistenceRef = useRef(true)
  const onClearPreviewRef = useRef(onClearPreview)
  const initialMessageRef = useRef(
    initialMessage(feedId, untouchedGrid, hasVisualDirection, hasContentContext)
  )
  initialMessageRef.current = initialMessage(
    feedId,
    untouchedGrid,
    hasVisualDirection,
    hasContentContext
  )

  useEffect(() => {
    onClearPreviewRef.current = onClearPreview
  }, [onClearPreview])

  useEffect(() => {
    skipNextPersistenceRef.current = true
    try {
      const saved = window.localStorage.getItem(storageKey(feedId))
      if (!saved) {
        setMessages([initialMessageRef.current])
        return
      }
      const parsed = JSON.parse(saved)
      const restored = savedMessages(parsed)
      setMessages(restored.length > 0 ? restored : [initialMessageRef.current])
    } catch {
      setMessages([initialMessageRef.current])
    }
    setInput("")
    setError(null)
    setStatus("idle")
    setAppliedMessageId(null)
    setUndoAvailable(false)
    setNewMenuOpen(false)
    setNewChatConfirming(false)
    if (displayMode === "sidebar") setExpanded(false)
    onClearPreviewRef.current?.()
  }, [displayMode, feedId])

  useEffect(() => {
    if (!feedId || !untouchedGrid) return
    setMessages(current => {
      if (current.length !== 1 || current[0]?.id !== "maya-welcome") return current
      const welcome = initialMessage(feedId, true, hasVisualDirection, hasContentContext)
      return current[0].content === welcome.content ? current : [welcome]
    })
  }, [feedId, hasContentContext, hasVisualDirection, untouchedGrid])

  useEffect(() => {
    if (displayMode === "embedded") setExpanded(true)
  }, [displayMode])

  useEffect(() => {
    if (displayMode === "sidebar" && busy && feedId === null) setExpanded(true)
  }, [busy, displayMode, feedId])

  useEffect(() => {
    if (planSettingsOpen) setExpanded(true)
    if (!planSettingsOpen && !selectedPost?.id) return
    const frame = window.requestAnimationFrame(() => {
      const region = scrollRegionRef.current
      if (!region) return
      if (typeof region.scrollTo === "function") region.scrollTo({ top: 0, behavior: "smooth" })
      else region.scrollTop = 0
    })
    return () => window.cancelAnimationFrame(frame)
  }, [planSettingsOpen, selectedPost?.id])

  useEffect(() => {
    if (skipNextPersistenceRef.current) {
      skipNextPersistenceRef.current = false
      return
    }
    try {
      window.localStorage.setItem(storageKey(feedId), JSON.stringify(messages.slice(-16)))
    } catch {
      // Conversation persistence is best effort; Calendar remains usable without storage.
    }
    if (typeof threadEndRef.current?.scrollIntoView === "function") {
      threadEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [feedId, messages, status])

  const history = useMemo(
    () => messages.slice(-10).map(message => ({ role: message.role, content: message.content })),
    [messages]
  )
  const isBusy = busy || status === "thinking" || status === "applying" || status === "syncing"
  const activityLabel =
    externalActivityLabel ??
    (busy
      ? feedId === null
        ? "Maya is mapping your month and drafting the captions"
        : "Maya is updating this grid"
      : status === "thinking"
        ? "Maya is reviewing this grid"
        : status === "applying"
          ? "Applying your approved change"
          : status === "syncing"
            ? "Syncing the grid"
            : null)

  async function sendMessage(rawMessage: string) {
    const message = rawMessage.trim()
    if (!message || isBusy) return

    const userMessage: CalendarMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
    }
    setMessages(current => [...current, userMessage])
    setInput("")
    setError(null)
    setStatus("thinking")

    try {
      const response = await fetch("/api/app-v3/maya/calendar-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message,
          feedId,
          selectedPostId: selectedPost?.id ?? null,
          history,
          feedSummary,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Maya could not review this grid.")

      const result = data as CalendarAgentResult
      if (result.proposal) onPreviewProposal?.(result.proposal)
      setMessages(current => [
        ...current,
        {
          id: `maya-${Date.now()}`,
          role: "assistant",
          content: result.message,
          proposal: result.proposal,
        },
      ])
      setStatus("idle")
    } catch (requestError) {
      setStatus("error")
      setError(
        requestError instanceof Error ? requestError.message : "Maya could not review this grid."
      )
    }
  }

  async function submitMessage(event: FormEvent) {
    event.preventDefault()
    await sendMessage(input)
  }

  async function applyProposal(message: CalendarMessage, proposal: CalendarAgentProposal) {
    if (isBusy) return
    setError(null)
    setStatus("applying")
    try {
      const outcome = await onApplyProposal(proposal)
      setStatus("syncing")
      setAppliedMessageId(message.id)
      setUndoAvailable(outcome.undoAvailable)
      onClearPreview?.()
      setStatus("idle")
    } catch (applyError) {
      setStatus("error")
      setError(applyError instanceof Error ? applyError.message : "The grid could not be updated.")
      onClearPreview?.()
    }
  }

  async function undoLastChange() {
    if (!undoAvailable || isBusy) return
    setStatus("applying")
    setError(null)
    try {
      await onUndo()
      setUndoAvailable(false)
      setAppliedMessageId(null)
      onClearPreview?.()
      setStatus("idle")
    } catch (undoError) {
      setStatus("error")
      setError(undoError instanceof Error ? undoError.message : "The change could not be undone.")
    }
  }

  function startNewChat() {
    skipNextPersistenceRef.current = true
    try {
      window.localStorage.removeItem(storageKey(feedId))
    } catch {
      // A fresh in-memory thread still works when storage is unavailable.
    }
    setMessages([initialMessage(feedId, untouchedGrid, hasVisualDirection, hasContentContext)])
    setInput("")
    setError(null)
    setStatus("idle")
    setAppliedMessageId(null)
    setUndoAvailable(false)
    setNewMenuOpen(false)
    setNewChatConfirming(false)
    onClearPreview?.()
    onClearSelectedPost?.()
  }

  if (!expanded && displayMode === "sidebar") {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-label="Open Maya for this Calendar"
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-30 flex min-h-12 items-center gap-2 rounded-full border border-[color:var(--app-glass-border)] bg-[color:var(--app-bg)] px-3 py-2 text-[color:var(--app-text-primary)] shadow-[0_12px_34px_rgba(13,14,16,0.18)] lg:sticky lg:bottom-auto lg:right-auto lg:top-4 lg:z-0 lg:ml-auto lg:mt-4 lg:rounded-[10px] lg:shadow-none"
      >
        <span className="relative h-8 w-8 overflow-hidden rounded-full bg-[color:var(--app-btn-secondary-bg)]">
          <Image src={MAYA_AVATAR} alt="" fill sizes="32px" className="object-cover" />
        </span>
        <span className="text-[12px] font-medium">Ask Maya</span>
      </button>
    )
  }

  return (
    <aside
      aria-label="Maya for this Calendar"
      className={
        displayMode === "embedded"
          ? "flex h-full min-h-[34rem] min-w-0 w-full max-w-full max-h-[calc(100dvh-9rem)] flex-col overflow-hidden rounded-[18px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-surface)] shadow-none"
          : "fixed inset-x-2 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 flex max-h-[56dvh] min-h-[18rem] flex-col overflow-hidden rounded-[20px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-surface)] shadow-[0_24px_64px_rgba(13,14,16,0.20)] lg:sticky lg:inset-auto lg:top-4 lg:z-0 lg:max-h-[calc(100dvh-8rem)] lg:min-h-[42rem] lg:rounded-[16px] lg:shadow-none"
      }
    >
      <header className="relative flex min-h-16 min-w-0 items-center gap-3 border-b border-[color:var(--app-glass-border)] bg-[color:var(--app-bg)] px-4">
        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[color:var(--app-btn-secondary-bg)]">
          <Image src={MAYA_AVATAR} alt="" fill sizes="40px" className="object-cover" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-medium text-[color:var(--app-text-primary)]">Maya</h2>
          <p className="truncate text-[11px] text-[color:var(--app-text-secondary)]">
            {selectedPost
              ? `Post ${selectedPost.position} selected`
              : "Your Calendar creative director"}
          </p>
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              setNewMenuOpen(value => !value)
              setNewChatConfirming(false)
            }}
            disabled={isBusy}
            aria-expanded={newMenuOpen}
            aria-controls="calendar-maya-new-menu"
            className="inline-flex min-h-11 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium text-[color:var(--app-text-secondary)] transition-colors hover:bg-[color:var(--app-btn-secondary-hover)] hover:text-[color:var(--app-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-text-primary)] disabled:opacity-40"
          >
            <Plus size={15} aria-hidden /> New
          </button>
          {newMenuOpen ? (
            <div
              id="calendar-maya-new-menu"
              role="group"
              aria-label="Start something new"
              className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-[10px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-bg)] p-1 shadow-[0_12px_32px_rgba(13,14,16,0.14)]"
            >
              {!newChatConfirming ? (
                <button
                  type="button"
                  onClick={() => setNewChatConfirming(true)}
                  className="min-h-11 w-full rounded-[7px] px-3 text-left text-[12px] text-[color:var(--app-text-primary)] hover:bg-[color:var(--app-btn-secondary-hover)]"
                >
                  New chat
                </button>
              ) : (
                <>
                  <p className="px-3 pb-1 pt-2 text-[10px] leading-relaxed text-[color:var(--app-text-secondary)]">
                    Clear this conversation? Your grid stays exactly as it is.
                  </p>
                  <button
                    type="button"
                    onClick={startNewChat}
                    className="min-h-11 w-full rounded-[7px] px-3 text-left text-[12px] font-medium text-[color:var(--app-text-primary)] hover:bg-[color:var(--app-btn-secondary-hover)]"
                  >
                    Start fresh
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewChatConfirming(false)}
                    className="min-h-11 w-full rounded-[7px] px-3 text-left text-[12px] text-[color:var(--app-text-secondary)] hover:bg-[color:var(--app-btn-secondary-hover)]"
                  >
                    Keep this chat
                  </button>
                </>
              )}
              {onCreateNewGrid && !newChatConfirming ? (
                <button
                  type="button"
                  onClick={() => {
                    setNewMenuOpen(false)
                    onCreateNewGrid()
                  }}
                  className="min-h-11 w-full rounded-[7px] px-3 text-left text-[12px] text-[color:var(--app-text-primary)] hover:bg-[color:var(--app-btn-secondary-hover)]"
                >
                  New grid
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        {displayMode === "sidebar" ? (
          <button
            type="button"
            onClick={() => {
              setExpanded(false)
              onPlanSettingsClosed?.()
            }}
            aria-label="Collapse Maya"
            className="flex h-11 w-11 items-center justify-center rounded-full text-[color:var(--app-text-secondary)] transition-colors hover:bg-[color:var(--app-btn-secondary-hover)] hover:text-[color:var(--app-text-primary)]"
          >
            <ChevronDown size={19} aria-hidden />
          </button>
        ) : null}
      </header>

      <div
        ref={scrollRegionRef}
        className="min-h-0 min-w-0 max-w-full flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4"
        aria-live="polite"
      >
        {selectedPost ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-[12px] border border-[color:var(--calendar-stone-4)]/70 bg-[color:var(--app-surface)] p-2.5">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-[color:var(--calendar-stone-3)] text-[12px] font-medium text-[color:var(--app-text-primary)]">
              {selectedPost.imageUrl ? (
                <Image
                  src={selectedPost.imageUrl}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-cover object-top"
                />
              ) : (
                selectedPost.position
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-[color:var(--app-text-primary)]">
                Post {selectedPost.position} selected
              </p>
              <p className="mt-0.5 truncate text-[10px] text-[color:var(--app-text-secondary)]">
                {selectedPost.hasImage
                  ? "Photo ready"
                  : selectedPost.generationStatus === "failed"
                    ? "Image failed"
                    : selectedPost.generationStatus === "queued" ||
                        selectedPost.generationStatus === "generating" ||
                        selectedPost.predictionId
                      ? "Image in progress"
                      : selectedPost.caption?.trim()
                        ? "Caption ready · needs a photo"
                        : "Planned post"}
              </p>
            </div>
            {onOpenPostDetails ? (
              <button
                type="button"
                onClick={() => onOpenPostDetails(selectedPost.id)}
                className="min-h-11 rounded-[8px] bg-white px-3 text-[11px] text-[color:var(--app-text-primary)]"
              >
                Details
              </button>
            ) : null}
            {onOpenPhotoPicker ? (
              <button
                type="button"
                onClick={() => onOpenPhotoPicker(selectedPost.id)}
                className="min-h-11 rounded-[8px] bg-white px-3 text-[11px] text-[color:var(--app-text-primary)]"
              >
                {selectedPost.hasImage ? "Replace photo" : "Add photo"}
              </button>
            ) : null}
            {selectedPost.hasImage && selectedPost.imageUrl ? (
              <button
                type="button"
                onClick={() => setTextStudioOpen(true)}
                className="min-h-11 rounded-[8px] bg-[color:var(--app-btn-primary-bg)] px-3 text-[11px] text-[color:var(--app-btn-primary-text)]"
              >
                Add text
              </button>
            ) : null}
            {onClearSelectedPost ? (
              <button
                type="button"
                onClick={onClearSelectedPost}
                aria-label={`Clear post ${selectedPost.position} selection`}
                className="flex h-11 w-11 items-center justify-center rounded-full text-[color:var(--app-text-secondary)] hover:bg-white"
              >
                <X size={15} aria-hidden />
              </button>
            ) : null}
          </div>
        ) : null}

        {planSettings && onSavePlanSettings && planSettingsOpen ? (
          <CalendarPlanSettingsCard
            settings={planSettings}
            forceEditing={planSettingsOpen}
            onSave={onSavePlanSettings}
            onConfirm={() => {
              onPlanSettingsConfirmed?.()
              onPlanSettingsClosed?.()
            }}
          />
        ) : null}

        {messages.map(message => {
          const applied = appliedMessageId === message.id
          const preview = message.proposal ? proposalPreview(message.proposal) : null
          return (
            <div
              key={message.id}
              className={message.role === "user" ? "flex min-w-0 justify-end" : "block min-w-0"}
            >
              <div
                className={
                  message.role === "user"
                    ? "min-w-0 max-w-[88%] break-words [overflow-wrap:anywhere] rounded-[16px] rounded-br-[5px] bg-[color:var(--app-btn-primary-bg)] px-3.5 py-2.5 text-[13px] leading-relaxed text-[color:var(--app-btn-primary-text)]"
                    : "min-w-0 max-w-[95%] break-words [overflow-wrap:anywhere] text-[13px] leading-relaxed text-[color:var(--app-text-primary)]"
                }
              >
                {message.role === "assistant" ? (
                  <div className="[&_ol]:!text-[13px] [&_p]:!text-[13px] [&_ul]:!text-[13px]">
                    <Markdown>{message.content}</Markdown>
                  </div>
                ) : (
                  message.content
                )}
              </div>

              {message.role === "assistant" && message.proposal && preview ? (
                <section
                  className="mt-3 overflow-hidden rounded-[12px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-bg)]"
                  aria-label="Proposed Calendar change"
                >
                  <div className="px-3.5 py-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--app-text-secondary)]">
                      Preview
                    </p>
                    <p className="mt-1.5 text-[12px] font-medium text-[color:var(--app-text-primary)]">
                      {message.proposal.label}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-[color:var(--app-text-secondary)]">
                      {preview}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 border-t border-[color:var(--app-glass-border)] p-2.5">
                    {applied ? (
                      <>
                        <span className="flex min-h-11 flex-1 items-center gap-2 px-2 text-[11px] font-medium text-[color:var(--app-text-primary)]">
                          <Check size={15} aria-hidden /> Applied
                        </span>
                        {undoAvailable ? (
                          <button
                            type="button"
                            onClick={() => void undoLastChange()}
                            aria-label="Undo change"
                            className="flex min-h-11 items-center gap-2 rounded-[8px] border border-[color:var(--app-glass-border)] px-3 text-[11px] text-[color:var(--app-text-primary)] hover:border-[color:var(--app-text-muted)]"
                          >
                            <RotateCcw size={14} aria-hidden /> Undo
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => (
                            onClearPreview?.(),
                            setMessages(current =>
                              current.map(item =>
                                item.id === message.id ? { ...item, proposal: null } : item
                              )
                            )
                          )}
                          aria-label="Dismiss proposed change"
                          className="flex min-h-11 items-center gap-2 rounded-[8px] px-3 text-[11px] text-[color:var(--app-text-secondary)] hover:text-[color:var(--app-text-primary)]"
                        >
                          <X size={14} aria-hidden /> Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => void applyProposal(message, message.proposal!)}
                          disabled={isBusy}
                          aria-label="Apply change"
                          className="ml-auto min-h-11 rounded-[8px] bg-[color:var(--app-btn-primary-bg)] px-4 text-[11px] font-medium text-[color:var(--app-btn-primary-text)] transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          Apply
                        </button>
                      </>
                    )}
                  </div>
                </section>
              ) : null}
            </div>
          )
        })}

        {!isBusy && needsVisualDirection && !selectedPost ? (
          <section
            aria-label="Choose the visual direction"
            className="rounded-[14px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-bg)] p-3"
          >
            <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--app-text-secondary)]">
              Start here
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-[color:var(--app-text-primary)]">
              Show me how you want this grid to feel. You can change the direction later.
            </p>
            <div className="mt-3">
              <CalendarDirectionOptions
                compact
                onSelect={mode => onChooseVisualDirection?.(mode)}
                options={MAYA_DIRECTION_OPTIONS}
              />
            </div>
            <a
              href="https://www.pinterest.com/search/pins/?q=instagram%20grid%20inspiration"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex min-h-11 items-center text-[11px] text-[color:var(--app-text-secondary)] underline underline-offset-4"
            >
              Find grid inspiration on Pinterest
            </a>
          </section>
        ) : !isBusy && needsContentContext && !selectedPost ? (
          <section
            aria-label="Add truthful content context"
            className="rounded-[14px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-bg)] p-3"
          >
            <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--app-text-secondary)]">
              Visual direction saved
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-[color:var(--app-text-primary)]">
              Add your business, audience and current focus so I can plan useful posts without
              inventing your story.
            </p>
            <button
              type="button"
              onClick={onOpenContentContext}
              className="mt-3 min-h-11 w-full rounded-[9px] bg-[color:var(--app-btn-primary-bg)] px-3 text-left text-[12px] font-medium text-[color:var(--app-btn-primary-text)]"
            >
              Add my content context
            </button>
          </section>
        ) : !isBusy && readyToCreate && !selectedPost ? (
          <section
            aria-label="Create the first post"
            className="rounded-[14px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-bg)] p-3"
          >
            <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--app-text-secondary)]">
              Ready to create
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-[color:var(--app-text-primary)]">
              Your direction and real context are ready. We can shape post 1 together, or you can
              create images and captions in bulk above the grid.
            </p>
            {firstPost && onOpenPostDetails ? (
              <button
                type="button"
                onClick={() => onOpenPostDetails(firstPost.id)}
                className="mt-3 min-h-11 w-full rounded-[9px] bg-[color:var(--app-btn-primary-bg)] px-3 text-left text-[12px] font-medium text-[color:var(--app-btn-primary-text)]"
              >
                Open post 1
              </button>
            ) : null}
          </section>
        ) : !isBusy ? (
          <ClarifyCard
            clarify={suggestionsFor(selectedPost, feedId !== null)}
            onPick={answer => void sendMessage(answer)}
            onFreeText={() =>
              document
                .querySelector<HTMLTextAreaElement>(
                  'textarea[aria-label="Message Maya about this grid"]'
                )
                ?.focus()
            }
          />
        ) : null}

        {activityLabel ? (
          <div
            role="status"
            className="flex items-center gap-2 text-[12px] text-[color:var(--app-text-secondary)]"
          >
            <Loader2 className="animate-spin motion-reduce:animate-none" size={15} aria-hidden />
            {activityLabel}
          </div>
        ) : null}
        {error ? (
          <div
            role="alert"
            className="rounded-[9px] bg-destructive/10 px-3 py-2.5 text-[12px] leading-relaxed text-destructive"
          >
            <p>{error}</p>
            {messages.findLast(message => message.role === "user") ? (
              <button
                type="button"
                onClick={() => {
                  const last = messages.findLast(message => message.role === "user")
                  if (last) void sendMessage(last.content)
                }}
                className="mt-2 min-h-11 rounded-[8px] border border-current px-3 text-[11px] font-medium"
              >
                Try again
              </button>
            ) : null}
          </div>
        ) : null}
        <div ref={threadEndRef} />
      </div>

      <form
        onSubmit={submitMessage}
        className="border-t border-[color:var(--app-glass-border)] bg-[color:var(--app-bg)] p-3"
      >
        <div className="flex min-w-0 items-end gap-2 rounded-[12px] border border-[color:var(--app-input-border)] bg-[color:var(--app-input-bg)] p-2 focus-within:border-[color:var(--app-text-muted)]">
          <textarea
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
            aria-label="Message Maya about this grid"
            placeholder={
              selectedPost
                ? `Ask Maya about post ${selectedPost.position}`
                : "Ask Maya about this grid"
            }
            rows={1}
            maxLength={1000}
            disabled={isBusy}
            className="max-h-24 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-1.5 py-2 text-[13px] leading-relaxed text-[color:var(--app-text-primary)] outline-none placeholder:text-[color:var(--app-text-muted)] disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || isBusy}
            aria-label="Send to Maya"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--app-btn-primary-bg)] text-[color:var(--app-btn-primary-text)] transition-transform active:scale-[0.96] disabled:bg-[color:var(--app-glass-border)]"
          >
            {status === "thinking" ? (
              <Loader2 className="animate-spin" size={16} aria-hidden />
            ) : (
              <ArrowUp size={17} aria-hidden />
            )}
          </button>
        </div>
        <p className="mt-2 px-1 text-[10px] text-[color:var(--app-text-muted)]">
          Review changes before applying.
        </p>
      </form>

      {selectedPost?.imageUrl ? (
        <CalendarTextStudio
          key={`${feedId}:${selectedPost.id}:${selectedPost.imageUrl}`}
          open={textStudioOpen}
          feedId={feedId as number}
          postId={selectedPost.id}
          position={selectedPost.position}
          cleanImageUrl={selectedPost.imageUrl}
          initialHeadline={selectedPost.caption?.split(/[.!?\n]/)[0] ?? null}
          onClose={() => setTextStudioOpen(false)}
          onApplied={updatedPost => onPostUpdated?.(updatedPost)}
        />
      ) : null}
    </aside>
  )
}
