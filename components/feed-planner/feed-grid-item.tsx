"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Square } from "lucide-react"
import { useFeedPostPolling } from "@/lib/hooks/use-feed-post-polling"
import { toast } from "@/hooks/use-toast"
import { Spinner } from "@/components/app-v3/loading"
import { StopGenerationDialog } from "./stop-generation-dialog"
import { isPersonalStoryPosition } from "@/lib/feed-planner/caption-truth"

interface FeedGridItemProps {
  post: any
  feedId: number
  isDragging: boolean
  isSavingOrder: boolean
  showGenerateButton: boolean
  /** Feed Planner Phase 2c: Suite members generate photos in Create/Chat, not on the grid -
   *  empty tiles become a quiet, non-interactive placeholder for them. Paid-blueprint-only
   *  buyers (no Chat surface) keep today's Generate/Different-idea buttons unchanged. */
  isMembership?: boolean
  isSelected?: boolean
  onPostClick: (post: any) => void
  onAddImage?: (postId: number) => void
  onGenerateImage?: (postId: number) => Promise<void>
  onDragStart: () => void
  onDragOver: (e: React.DragEvent<HTMLElement>) => void
  onDragEnd: () => void
  onMoveLeft: () => void
  onMoveRight: () => void
  onGenerate: (postId: number) => Promise<any>
  /** Feed Planner Phase 2b: "Different idea" for a post Maya auto-drafted, before generation.
   *  Paid-blueprint-only path only as of Phase 2c - see isMembership above. */
  onRegenerateIdea?: (postId: number) => Promise<void>
}

const getInitialPredictionId = (post: any) =>
  post?.prediction_id && post?.generation_status === "generating" && !post?.image_url
    ? post.prediction_id
    : null

const syncPredictionId = (
  post: any,
  predictionId: string | null,
  setPredictionId: (value: string | null) => void
) => {
  if (post?.image_url) {
    if (predictionId) {
      setPredictionId(null)
    }
    return
  }

  if (post?.prediction_id && post.prediction_id !== predictionId) {
    setPredictionId(post.prediction_id)
  }
}

const getIsGenerating = ({
  displayImageUrl,
  pollingStatus,
  predictionId,
  post,
}: {
  displayImageUrl: string | null
  pollingStatus: string
  predictionId: string | null
  post: any
}) =>
  !displayImageUrl &&
  (pollingStatus === "generating" ||
    !!predictionId ||
    (post.generation_status === "generating" && post.prediction_id && !post.image_url) ||
    (post.prediction_id && !post.image_url))

async function stopGeneration({
  canStop,
  isStopping,
  postId,
  onGenerateImage,
  setPredictionId,
  setIsStopping,
}: {
  canStop: boolean
  isStopping: boolean
  postId: number
  onGenerateImage?: (postId: number) => Promise<void>
  setPredictionId: (value: string | null) => void
  setIsStopping: (value: boolean) => void
}) {
  if (!canStop || isStopping) {
    return
  }

  setIsStopping(true)
  try {
    const response = await fetch(`/api/feed/post/${postId}/cancel`, { method: "POST" })
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.error || "Failed to stop generation")
    }

    setPredictionId(null)
    onGenerateImage?.(postId).catch(() => {})

    toast({
      title: "Generation stopped",
      description: data.refunded ? "Credit refunded." : "No credit refund needed.",
    })
  } catch (error) {
    toast({
      title: "Could not stop generation",
      description: error instanceof Error ? error.message : "Please try again",
      variant: "destructive",
    })
  } finally {
    setIsStopping(false)
  }
}

async function startGeneration({
  event,
  postId,
  onGenerate,
  setPredictionId,
}: {
  event: React.MouseEvent<HTMLButtonElement>
  postId: number
  onGenerate: (postId: number) => Promise<any>
  setPredictionId: (value: string | null) => void
}) {
  event.stopPropagation()

  const tempPredictionId = `temp-${Date.now()}`
  setPredictionId(tempPredictionId)
  console.log("[Feed Grid Item] 🚀 Starting generation (optimistic UI) for post", postId)

  try {
    const data = await onGenerate(postId)
    if (data?.predictionId) {
      setPredictionId(data.predictionId)
      console.log(
        "[Feed Grid Item] ✅ Generation started for post",
        postId,
        "predictionId:",
        data.predictionId
      )
      return
    }

    setPredictionId(null)
  } catch (error) {
    setPredictionId(null)
    console.error("[Feed Grid Item] Error starting generation:", error)
  }
}

function renderContent({
  displayImageUrl,
  isGenerating,
  canStop,
  isStopping,
  showGenerateButton,
  isMembership,
  post,
  onAddImage,
  onGenerateClick,
  onStopGeneration,
  onRegenerateIdeaClick,
  isRegeneratingIdea,
}: {
  displayImageUrl: string | null
  isGenerating: boolean
  canStop: boolean
  isStopping: boolean
  showGenerateButton: boolean
  isMembership?: boolean
  post: any
  onAddImage?: (postId: number) => void
  onGenerateClick: (event: React.MouseEvent<HTMLButtonElement>) => void
  onStopGeneration: (event: React.MouseEvent<HTMLButtonElement>) => void
  onRegenerateIdeaClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
  isRegeneratingIdea?: boolean
}) {
  if (displayImageUrl && !isGenerating) {
    return (
      <Image
        src={displayImageUrl}
        alt={`Post ${post.position}`}
        fill
        // Instagram's current profile grid is portrait-first. Keep the crop top-biased so
        // a generated portrait never loses the member's face inside the smaller preview.
        className="object-cover object-[center_20%]"
        sizes="(max-width: 768px) 33vw, 311px"
      />
    )
  }

  if (post.generation_status === "queued") {
    return (
      <div
        role="status"
        aria-label={`Post ${post.position} status: Queued`}
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#F8FAFA]/90"
      >
        <span className="h-2 w-2 animate-pulse rounded-full bg-[color:var(--app-text-secondary)] motion-reduce:animate-none" />
        <span className="text-[9px] uppercase tracking-[0.18em] text-[color:var(--app-text-secondary)]">
          Queued
        </span>
      </div>
    )
  }

  if (isGenerating) {
    return (
      <div
        role="status"
        aria-label={`Post ${post.position} status: Creating image`}
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#F8FAFA]/90 backdrop-blur-sm"
      >
        <Spinner className="h-5 w-5" />
        <span className="rounded-full bg-[color:var(--app-btn-primary-bg)]/65 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-[color:var(--app-btn-primary-text)] backdrop-blur-sm">
          Creating…
        </span>
        <button
          type="button"
          onClick={onStopGeneration}
          disabled={!canStop || isStopping}
          aria-label={isStopping ? "Stopping generation" : "Stop generation"}
          className={`mt-1 flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
            !canStop || isStopping
              ? "text-[#818283] opacity-40"
              : "text-[#4F5052] hover:bg-[color:var(--app-btn-primary-bg)]/[0.06] hover:text-[color:var(--app-text-primary)]"
          }`}
        >
          <Square size={12} className={isStopping ? "animate-pulse" : ""} />
        </button>
      </div>
    )
  }

  if (showGenerateButton) {
    const isMayaDraft =
      typeof post?.content_pillar === "string" && post.content_pillar.trim().length > 0

    // Feed Planner Phase 2c: Suite members generate photos in Create/Chat and Maya places
    // them on the calendar herself - so no Generate button here. But an empty day IS
    // tappable (2026-07-07, Sandra's report): it opens the image picker so she can upload
    // a photo or pull one from her gallery onto that day. Creation stays chat-owned;
    // placing an existing photo is calendar work.
    if (isMembership) {
      return (
        <button
          type="button"
          aria-label={`Add photo to post ${post.position}`}
          className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-1.5 bg-[#F8FAFA] p-3 text-center transition-colors hover:bg-[#F1F2F2]"
          onClick={event => {
            event.stopPropagation()
            onAddImage?.(post.id)
          }}
        >
          {isMayaDraft && (
            <span className="line-clamp-3 px-1 text-[11px] leading-snug text-[#818283]">
              {post.content_pillar}
            </span>
          )}
          <span className="text-[9px] uppercase tracking-[0.18em] text-[color:var(--app-text-muted)]">
            Add photo
          </span>
        </button>
      )
    }

    return (
      <div className="absolute inset-0 flex flex-col bg-[#F8FAFA]">
        <button
          type="button"
          aria-label={`Generate image for post ${post.position}`}
          className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 p-3 text-center transition-colors hover:bg-[#F1F2F2]"
          onClick={onGenerateClick}
        >
          {isMayaDraft && (
            <>
              <span className="rounded-full bg-[color:var(--app-btn-primary-bg)]/[0.06] px-2 py-0.5 text-[8px] font-medium uppercase tracking-[0.18em] text-[#4F5052]">
                Maya&apos;s idea
              </span>
              <span className="line-clamp-2 px-1 text-[11px] leading-snug text-[color:var(--app-text-primary)]">
                {post.content_pillar}
              </span>
            </>
          )}
          <span className="text-center text-[10px] font-medium uppercase tracking-[0.2em] text-[#4F5052]">
            Generate image
          </span>
        </button>
        {isMayaDraft && onRegenerateIdeaClick && (
          <button
            type="button"
            onClick={onRegenerateIdeaClick}
            disabled={isRegeneratingIdea}
            className="shrink-0 border-t border-[#C5C6C8]/40 py-1.5 text-[8px] uppercase tracking-[0.16em] text-[#818283] transition-colors hover:text-[color:var(--app-text-primary)] disabled:opacity-50"
          >
            {isRegeneratingIdea ? "Asking Maya…" : "Different idea"}
          </button>
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-1 bg-[#F8FAFA] p-3 transition-colors hover:bg-[#F1F2F2]"
      onClick={event => {
        event.stopPropagation()
        onAddImage?.(post.id)
      }}
    >
      <span className="text-center text-[10px] font-medium uppercase tracking-[0.2em] text-[#4F5052]">
        Click to add image
      </span>
    </button>
  )
}

export default function FeedGridItem({
  post,
  feedId,
  isDragging,
  isSavingOrder,
  showGenerateButton,
  isMembership,
  isSelected = false,
  onPostClick,
  onAddImage,
  onGenerateImage,
  onDragStart,
  onDragOver,
  onDragEnd,
  onMoveLeft,
  onMoveRight,
  onGenerate,
  onRegenerateIdea,
}: Readonly<FeedGridItemProps>) {
  const [predictionId, setPredictionId] = useState<string | null>(getInitialPredictionId(post))
  const [isStopping, setIsStopping] = useState(false)
  const [showStopDialog, setShowStopDialog] = useState(false)
  const [isRegeneratingIdea, setIsRegeneratingIdea] = useState(false)
  const touchStartXRef = useRef<number | null>(null)
  const didSwipeRef = useRef(false)

  const { status: pollingStatus, imageUrl: pollingImageUrl } = useFeedPostPolling({
    feedId,
    postId: post.id,
    predictionId,
    // Suite members never self-trigger generation from an empty tile (Phase 2c) - no
    // prediction to poll for, so skip the polling hook entirely for that population.
    enabled: !!predictionId && !predictionId.startsWith("maya:") && !post?.image_url,
    onComplete: imageUrl => {
      console.log(
        "[Feed Grid Item] ✅ Generation completed for post",
        post.id,
        "imageUrl:",
        imageUrl
      )
      setPredictionId(null)
      onGenerateImage?.(post.id)
    },
    onError: error => {
      console.error("[Feed Grid Item] ❌ Generation failed for post", post.id, ":", error)
      setPredictionId(null)
    },
  })

  useEffect(() => {
    syncPredictionId(post, predictionId, setPredictionId)
  }, [post, predictionId])

  const displayImageUrl = pollingImageUrl || post.image_url || null
  const isGenerating = getIsGenerating({
    displayImageUrl,
    pollingStatus,
    predictionId,
    post,
  })
  const isComplete = !!displayImageUrl
  const canStop =
    !!predictionId && !predictionId.startsWith("temp-") && !predictionId.startsWith("maya:")
  const completeInteractionClassName = isSavingOrder
    ? "cursor-pointer"
    : "cursor-move hover:opacity-90"

  const handleGenerateClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    void startGeneration({
      event,
      postId: post.id,
      onGenerate,
      setPredictionId,
    })
  }

  const handleStopGeneration = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (canStop && !isStopping) setShowStopDialog(true)
  }

  const confirmStopGeneration = async () => {
    await stopGeneration({
      canStop,
      isStopping,
      postId: post.id,
      onGenerateImage,
      setPredictionId,
      setIsStopping,
    })
    setShowStopDialog(false)
  }

  const handleRegenerateIdeaClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (!onRegenerateIdea || isRegeneratingIdea) return
    setIsRegeneratingIdea(true)
    try {
      await onRegenerateIdea(post.id)
    } finally {
      setIsRegeneratingIdea(false)
    }
  }

  const content = renderContent({
    displayImageUrl,
    isGenerating,
    canStop,
    isStopping,
    showGenerateButton,
    isMembership,
    post,
    onAddImage,
    onGenerateClick: handleGenerateClick,
    onStopGeneration: handleStopGeneration,
    onRegenerateIdeaClick: onRegenerateIdea ? handleRegenerateIdeaClick : undefined,
    isRegeneratingIdea,
  })

  // Suite members' empty tiles are a quiet, non-interactive preview (Phase 2c) - no pointer
  // cursor, since there's nothing to tap. Paid-blueprint-only buyers keep the generate-button
  // affordance's pointer cursor.
  const isQuietPlaceholder = isMembership && showGenerateButton && !isComplete && !isGenerating

  const baseClassName = `relative block aspect-[3/4] w-full overflow-hidden rounded-[6px] border bg-[color:var(--calendar-stone-1)] transition-all duration-200 ${
    isSelected
      ? "z-10 border-[color:var(--app-text-primary)] ring-2 ring-[color:var(--app-focus-ring)] ring-offset-2 ring-offset-white"
      : "border-[color:var(--calendar-stone-4)]/70"
  } ${isDragging ? "scale-95 opacity-50" : ""}`

  if (isComplete) {
    const isReadyPost = Boolean(post.caption?.trim())
    const needsStory = !isReadyPost && isPersonalStoryPosition(Number(post.position))
    return (
      <button
        type="button"
        draggable={!isSavingOrder}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onTouchStart={event => {
          touchStartXRef.current = event.touches[0]?.clientX ?? null
          didSwipeRef.current = false
        }}
        onTouchEnd={event => {
          if (touchStartXRef.current === null) return
          const delta =
            (event.changedTouches[0]?.clientX ?? touchStartXRef.current) - touchStartXRef.current
          touchStartXRef.current = null
          if (Math.abs(delta) < 44) return
          didSwipeRef.current = true
          if (delta < 0) onMoveRight()
          else onMoveLeft()
        }}
        onKeyDown={event => {
          if (event.key === "ArrowLeft") {
            event.preventDefault()
            onMoveLeft()
          }
          if (event.key === "ArrowRight") {
            event.preventDefault()
            onMoveRight()
          }
        }}
        onClick={() => {
          if (didSwipeRef.current) {
            didSwipeRef.current = false
            return
          }
          onPostClick(post)
        }}
        aria-label={`Select post ${post.position}. Swipe or use left and right arrow keys to move it.`}
        className={`${baseClassName} ${completeInteractionClassName}`}
      >
        {content}
        <span className="absolute left-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border border-white/60 bg-white/85 px-1 text-[9px] font-medium text-[color:var(--app-text-primary)] backdrop-blur-md">
          {post.position}
        </span>
        <span
          role="status"
          aria-label={`Post ${post.position} status: ${isReadyPost ? "Ready" : needsStory ? "Needs your story" : "Needs caption"}`}
          className={`absolute right-1.5 top-1.5 rounded-full border px-2 py-1 text-[8px] font-medium uppercase tracking-[0.12em] backdrop-blur-md ${
            isReadyPost
              ? "border-white/25 bg-[color:var(--app-btn-primary-bg)] text-[color:var(--app-btn-primary-text)]"
              : "border-white/60 bg-white/85 text-[color:var(--app-text-secondary)]"
          }`}
        >
          {isReadyPost ? "Ready" : needsStory ? "Needs your story" : "Needs caption"}
        </span>
      </button>
    )
  }

  if (isMembership) {
    const rawConcept = typeof post.content_pillar === "string" ? post.content_pillar.trim() : ""
    const [rawRole, ...conceptParts] = rawConcept.split(":")
    const knownRoles = new Set(["Personal", "Trust", "Authority", "Offer"])
    const role = knownRoles.has(rawRole.trim()) ? rawRole.trim() : "Planned"
    const concept = conceptParts.length > 0 ? conceptParts.join(":").trim() : rawConcept
    const failed = post.generation_status === "failed" || pollingStatus === "failed"
    const queued = post.generation_status === "queued"
    const statusLabel = failed
      ? "Image failed"
      : queued
        ? "Queued"
        : isGenerating || post.generation_status === "generating"
          ? "Creating image"
          : !post.caption?.trim() && isPersonalStoryPosition(Number(post.position))
            ? "Needs your story"
            : post.caption?.trim()
              ? "Needs photo"
              : "Planned"
    const date = post.scheduled_at
      ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
          new Date(post.scheduled_at)
        )
      : null

    return (
      <>
        <div className={baseClassName}>
          <button
            type="button"
            onClick={() => onPostClick(post)}
            aria-label={`Select post ${post.position}`}
            aria-pressed={isSelected}
            className={`absolute inset-0 flex w-full flex-col p-2.5 text-left transition-colors hover:brightness-[0.98] ${
              Number(post.position) % 4 === 0
                ? "bg-[color:var(--calendar-stone-4)]"
                : Number(post.position) % 3 === 0
                  ? "bg-[color:var(--calendar-stone-3)]"
                  : Number(post.position) % 2 === 0
                    ? "bg-[color:var(--calendar-stone-2)]"
                    : "bg-[color:var(--calendar-stone-1)]"
            }`}
          >
            <span className="flex items-start justify-between gap-1 text-[8px] font-medium uppercase tracking-[0.12em] text-[color:var(--app-text-secondary)]">
              <span>{role}</span>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/75 px-1 text-[9px] text-[color:var(--app-text-primary)]">
                {post.position}
              </span>
            </span>
            <span className="mt-auto line-clamp-3 text-[10px] font-medium leading-snug text-[color:var(--app-text-primary)]">
              {concept || (post.caption?.trim() ? "Caption ready" : "Maya will shape this post")}
            </span>
            <span className="mt-1 flex items-center justify-between gap-1 text-[8px] text-[color:var(--app-text-secondary)]">
              <span>{date ?? "This month"}</span>
              <span
                role="status"
                aria-label={`Post ${post.position} status: ${statusLabel}`}
                className="inline-flex items-center gap-1"
              >
                {(isGenerating || post.generation_status === "generating") && !queued ? (
                  <span aria-hidden>
                    <Spinner className="h-2.5 w-2.5 motion-reduce:animate-none" />
                  </span>
                ) : queued ? (
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current motion-reduce:animate-none" />
                ) : null}
                {statusLabel}
              </span>
            </span>
          </button>
          {failed ? (
            <button
              type="button"
              aria-label={`Ask Maya to try post ${post.position} again`}
              onClick={event => {
                event.stopPropagation()
                onPostClick(post)
              }}
              className="absolute bottom-6 right-2 z-10 min-h-11 rounded-full bg-[color:var(--app-btn-primary-bg)] px-3 text-[9px] font-medium text-[color:var(--app-btn-primary-text)]"
            >
              Ask Maya to try again
            </button>
          ) : isGenerating && canStop ? (
            <button
              type="button"
              aria-label={`Stop image generation for post ${post.position}`}
              onClick={handleStopGeneration}
              className="absolute bottom-7 right-2 z-10 min-h-8 rounded-full bg-white/85 px-2.5 text-[9px] font-medium text-[color:var(--app-text-primary)]"
            >
              Stop
            </button>
          ) : null}
        </div>
        <StopGenerationDialog
          open={showStopDialog}
          isStopping={isStopping}
          onOpenChange={setShowStopDialog}
          onConfirm={() => void confirmStopGeneration()}
        />
      </>
    )
  }

  return (
    <>
      <div className={`${baseClassName} ${isQuietPlaceholder ? "" : "cursor-pointer"}`}>
        {content}
      </div>
      <StopGenerationDialog
        open={showStopDialog}
        isStopping={isStopping}
        onOpenChange={setShowStopDialog}
        onConfirm={() => void confirmStopGeneration()}
      />
    </>
  )
}
