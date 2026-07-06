"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Square } from "lucide-react"
import { useFeedPostPolling } from "@/lib/hooks/use-feed-post-polling"
import { toast } from "@/hooks/use-toast"
import { Spinner } from "@/components/app-v3/loading"

interface FeedGridItemProps {
  post: any
  feedId: number
  isManualFeed: boolean
  isDragging: boolean
  isSavingOrder: boolean
  showGenerateButton: boolean
  /** Feed Planner Phase 2c: Suite members generate photos in Create/Chat, not on the grid -
   *  empty tiles become a quiet, non-interactive placeholder for them. Paid-blueprint-only
   *  buyers (no Chat surface) keep today's Generate/Different-idea buttons unchanged. */
  isMembership?: boolean
  onPostClick: (post: any) => void
  onAddImage?: (postId: number) => void
  onGenerateImage?: (postId: number) => Promise<void>
  onDragStart: () => void
  onDragOver: (e: React.DragEvent<HTMLElement>) => void
  onDragEnd: () => void
  onGenerate: (postId: number) => Promise<any>
  /** Feed Planner Phase 2b: "Different idea" for a post Maya auto-drafted, before generation.
   *  Paid-blueprint-only path only as of Phase 2c - see isMembership above. */
  onRegenerateIdea?: (postId: number) => Promise<void>
}

const getInitialPredictionId = (post: any) =>
  post?.prediction_id && !post?.image_url ? post.prediction_id : null

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
  isManualFeed,
  displayImageUrl,
  pollingStatus,
  predictionId,
  post,
}: {
  isManualFeed: boolean
  displayImageUrl: string | null
  pollingStatus: string
  predictionId: string | null
  post: any
}) =>
  !isManualFeed &&
  !displayImageUrl &&
  (pollingStatus === "generating" ||
    !!predictionId ||
    (post.generation_status === "generating" && post.prediction_id && !post.image_url) ||
    (post.prediction_id && !post.image_url))

async function stopGeneration({
  event,
  canStop,
  isStopping,
  postId,
  onGenerateImage,
  setPredictionId,
  setIsStopping,
}: {
  event: React.MouseEvent<HTMLButtonElement>
  canStop: boolean
  isStopping: boolean
  postId: number
  onGenerateImage?: (postId: number) => Promise<void>
  setPredictionId: (value: string | null) => void
  setIsStopping: (value: boolean) => void
}) {
  event.stopPropagation()

  if (!canStop || isStopping) {
    return
  }

  if (!confirm("Stop this generation? If it doesn't complete, we'll refund your credit.")) {
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
      console.log("[Feed Grid Item] ✅ Generation started for post", postId, "predictionId:", data.predictionId)
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
        className="object-cover"
        sizes="(max-width: 768px) 33vw, 311px"
      />
    )
  }

  if (isGenerating) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#F8FAFA]/90 backdrop-blur-sm">
        <Spinner className="h-5 w-5" />
        <span className="rounded-full bg-[#0D0E10]/65 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-white backdrop-blur-sm">
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
              : "text-[#4F5052] hover:bg-[#0D0E10]/[0.06] hover:text-[#0D0E10]"
          }`}
        >
          <Square size={12} className={isStopping ? "animate-pulse" : ""} />
        </button>
      </div>
    )
  }

  if (showGenerateButton) {
    const isMayaDraft = typeof post?.content_pillar === "string" && post.content_pillar.trim().length > 0

    // Feed Planner Phase 2c: Suite members generate photos in Create/Chat and Maya places
    // them on the calendar herself - an empty day here is just a quiet preview of what's
    // planned, nothing to tap. (Paid-blueprint-only buyers, with no Chat surface, fall
    // through to the button treatment below - their only way to generate is still the grid.)
    if (isMembership) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[#F8FAFA] p-3 text-center">
          {isMayaDraft && (
            <span className="line-clamp-3 px-1 text-[11px] leading-snug text-[#818283]">
              {post.content_pillar}
            </span>
          )}
        </div>
      )
    }

    return (
      <div className="absolute inset-0 flex flex-col bg-[#F8FAFA]">
        <button
          type="button"
          className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 p-3 text-center transition-colors hover:bg-[#F1F2F2]"
          onClick={onGenerateClick}
        >
          {isMayaDraft && (
            <>
              <span className="rounded-full bg-[#0D0E10]/[0.06] px-2 py-0.5 text-[8px] font-medium uppercase tracking-[0.18em] text-[#4F5052]">
                Maya's idea
              </span>
              <span className="line-clamp-2 px-1 text-[11px] leading-snug text-[#0D0E10]">
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
            className="shrink-0 border-t border-[#C5C6C8]/40 py-1.5 text-[8px] uppercase tracking-[0.16em] text-[#818283] transition-colors hover:text-[#0D0E10] disabled:opacity-50"
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
      onClick={(event) => {
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
  isManualFeed,
  isDragging,
  isSavingOrder,
  showGenerateButton,
  isMembership,
  onPostClick,
  onAddImage,
  onGenerateImage,
  onDragStart,
  onDragOver,
  onDragEnd,
  onGenerate,
  onRegenerateIdea,
}: Readonly<FeedGridItemProps>) {
  const [predictionId, setPredictionId] = useState<string | null>(getInitialPredictionId(post))
  const [isStopping, setIsStopping] = useState(false)
  const [isRegeneratingIdea, setIsRegeneratingIdea] = useState(false)

  const { status: pollingStatus, imageUrl: pollingImageUrl } = useFeedPostPolling({
    feedId,
    postId: post.id,
    predictionId,
    // Suite members never self-trigger generation from an empty tile (Phase 2c) - no
    // prediction to poll for, so skip the polling hook entirely for that population.
    enabled: !isMembership && !!predictionId && !post?.image_url,
    onComplete: (imageUrl) => {
      console.log("[Feed Grid Item] ✅ Generation completed for post", post.id, "imageUrl:", imageUrl)
      setPredictionId(null)
      onGenerateImage?.(post.id)
    },
    onError: (error) => {
      console.error("[Feed Grid Item] ❌ Generation failed for post", post.id, ":", error)
      setPredictionId(null)
    },
  })

  useEffect(() => {
    syncPredictionId(post, predictionId, setPredictionId)
  }, [post, predictionId])

  const displayImageUrl = pollingImageUrl || post.image_url || null
  const isGenerating = getIsGenerating({
    isManualFeed,
    displayImageUrl,
    pollingStatus,
    predictionId,
    post,
  })
  const isComplete = !!displayImageUrl
  const canStop = !!predictionId && !predictionId.startsWith("temp-")
  const completeInteractionClassName = isSavingOrder ? "cursor-pointer" : "cursor-move hover:opacity-90"

  const handleGenerateClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    void startGeneration({
      event,
      postId: post.id,
      onGenerate,
      setPredictionId,
    })
  }

  const handleStopGeneration = (event: React.MouseEvent<HTMLButtonElement>) => {
    void stopGeneration({
      event,
      canStop,
      isStopping,
      postId: post.id,
      onGenerateImage,
      setPredictionId,
      setIsStopping,
    })
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

  const baseClassName = `relative block aspect-square w-full overflow-hidden rounded-[6px] border border-[#C5C6C8]/40 bg-[#F8FAFA] transition-all duration-200 ${
    isDragging ? "scale-95 opacity-50" : ""
  }`

  if (isComplete) {
    return (
      <button
        type="button"
        draggable={!isSavingOrder}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onClick={() => onPostClick(post)}
        aria-label={`Open post ${post.position}`}
        className={`${baseClassName} ${completeInteractionClassName}`}
      >
        {content}
      </button>
    )
  }

  return <div className={`${baseClassName} ${isQuietPlaceholder ? "" : "cursor-pointer"}`}>{content}</div>
}
