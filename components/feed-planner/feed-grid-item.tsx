"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useFeedPostPolling } from "@/lib/hooks/use-feed-post-polling"
import { toast } from "@/hooks/use-toast"

interface FeedGridItemProps {
  post: any
  feedId: number
  isManualFeed: boolean
  isDragging: boolean
  isSavingOrder: boolean
  showGenerateButton: boolean
  onPostClick: (post: any) => void
  onAddImage?: (postId: number) => void
  onGenerateImage?: (postId: number) => Promise<void>
  onDragStart: () => void
  onDragOver: (e: React.DragEvent<HTMLElement>) => void
  onDragEnd: () => void
  onGenerate: (postId: number) => Promise<any>
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
  post,
  onAddImage,
  onGenerateClick,
  onStopGeneration,
}: {
  displayImageUrl: string | null
  isGenerating: boolean
  canStop: boolean
  isStopping: boolean
  showGenerateButton: boolean
  post: any
  onAddImage?: (postId: number) => void
  onGenerateClick: (event: React.MouseEvent<HTMLButtonElement>) => void
  onStopGeneration: (event: React.MouseEvent<HTMLButtonElement>) => void
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
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[rgba(28,27,25,0.72)] backdrop-blur-sm">
        <span className="mb-2 h-5 w-5 animate-spin rounded-full border border-[rgba(195,190,182,0.35)] border-t-[#c8c4bb]" />
        <div className="text-center text-[10px] font-['Inter'] font-medium text-[#8a8780]">
          Creating...
        </div>
        <button
          type="button"
          onClick={onStopGeneration}
          disabled={!canStop || isStopping}
          className={`mt-2 text-[10px] font-light ${
            !canStop || isStopping ? "text-[#8a8780] opacity-40" : "text-[#a8a49c] hover:text-[#f0ede8]"
          }`}
        >
          {isStopping ? "Stopping..." : "Stop generation"}
        </button>
      </div>
    )
  }

  if (showGenerateButton) {
    return (
      <button
        type="button"
        className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-[rgba(175,170,162,0.04)] p-3 transition-colors hover:bg-[rgba(175,170,162,0.10)]"
        onClick={onGenerateClick}
      >
        <div className="stone-chip mb-2 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#a8a49c]">
          Add
        </div>
        <div className="text-center font-['Inter'] text-[10px] font-medium uppercase tracking-[0.2em] text-[#8a8780]">
          Generate image
        </div>
      </button>
    )
  }

  return (
    <button
      type="button"
      className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center bg-[rgba(175,170,162,0.04)] p-3 transition-colors hover:bg-[rgba(175,170,162,0.10)]"
      onClick={(event) => {
        event.stopPropagation()
        onAddImage?.(post.id)
      }}
    >
      <div className="stone-chip mb-2 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#8a8780]">
        Add
      </div>
      <div className="text-center font-['Inter'] text-[10px] font-medium uppercase tracking-[0.2em] text-[#8a8780]">
        Click to add image
      </div>
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
  onPostClick,
  onAddImage,
  onGenerateImage,
  onDragStart,
  onDragOver,
  onDragEnd,
  onGenerate,
}: Readonly<FeedGridItemProps>) {
  const [predictionId, setPredictionId] = useState<string | null>(getInitialPredictionId(post))
  const [isStopping, setIsStopping] = useState(false)

  const { status: pollingStatus, imageUrl: pollingImageUrl } = useFeedPostPolling({
    feedId,
    postId: post.id,
    predictionId,
    enabled: !!predictionId && !post?.image_url,
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

  const content = renderContent({
    displayImageUrl,
    isGenerating,
    canStop,
    isStopping,
    showGenerateButton,
    post,
    onAddImage,
    onGenerateClick: (event) =>
      startGeneration({
        event,
        postId: post.id,
        onGenerate,
        setPredictionId,
      }),
    onStopGeneration: (event) =>
      stopGeneration({
        event,
        canStop,
        isStopping,
        postId: post.id,
        onGenerateImage,
        setPredictionId,
        setIsStopping,
      }),
  })

  const baseClassName = `relative block aspect-square w-full overflow-hidden rounded-[18px] border border-[color:var(--glass-border-subtle)] bg-[rgba(175,170,162,0.08)] backdrop-blur-[28px] transition-all duration-200 ${
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
        className={`${baseClassName} ${!isSavingOrder ? "cursor-move hover:opacity-90" : "cursor-pointer"}`}
      >
        {content}
      </button>
    )
  }

  return <div className={`${baseClassName} cursor-pointer`}>{content}</div>
}
