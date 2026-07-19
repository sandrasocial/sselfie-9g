"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { toast } from "@/hooks/use-toast"
import { isPersonalStoryPosition } from "@/lib/feed-planner/caption-truth"

interface FeedPostCardProps {
  post: {
    id: number
    position: number
    prompt: string
    caption: string
    content_pillar: string
    post_type?: string
    image_url: string | null
    preview_image_url?: string | null
    generation_status: string
    prediction_id?: string | null
    scheduled_at?: string | null
    media_urls?: string[] | null
    purpose?: string | null
    shot_type?: string | null
    visual_direction?: string | null
    pro_mode_type?: string | null
  }
  feedId: number
  accountName?: string | null
  onUpdate?: (updatedPost?: FeedPostCardProps["post"]) => void | Promise<void>
  onNavigateToMaya?: () => void // Navigate to Maya Chat for image generation
}

export default function FeedPostCard({
  post,
  feedId,
  accountName,
  onUpdate,
  onNavigateToMaya,
}: FeedPostCardProps) {
  const [showFullCaption, setShowFullCaption] = useState(false)
  const [copiedCaption, setCopiedCaption] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedCaption, setEditedCaption] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [copiedHashtags, setCopiedHashtags] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [isRemovingImage, setIsRemovingImage] = useState(false)
  const [activeMediaIndex, setActiveMediaIndex] = useState(0)
  const [isSavingSlides, setIsSavingSlides] = useState(false)

  const mediaUrls = Array.isArray(post.media_urls)
    ? post.media_urls.filter(
        (url): url is string => typeof url === "string" && url.startsWith("https://")
      )
    : []
  const savedMediaUrls = mediaUrls.length > 0 ? mediaUrls : post.image_url ? [post.image_url] : []

  useEffect(() => setActiveMediaIndex(0), [post.id, savedMediaUrls.length])

  async function handleSaveAllSlides() {
    if (savedMediaUrls.length < 2 || isSavingSlides) return
    setIsSavingSlides(true)
    try {
      const { default: JSZip } = await import("jszip")
      const zip = new JSZip()
      await Promise.all(
        savedMediaUrls.map(async (url, index) => {
          const response = await fetch(url)
          if (!response.ok) throw new Error("A slide could not be downloaded")
          zip.file(`post-${post.position}-slide-${index + 1}.png`, await response.arrayBuffer())
        })
      )
      const bundle = await zip.generateAsync({ type: "blob" })
      const downloadUrl = URL.createObjectURL(bundle)
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = `post-${post.position}-slides.zip`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(downloadUrl)
    } catch {
      toast({
        title: "Couldn't save the slides",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSavingSlides(false)
    }
  }

  async function handleRemoveImage() {
    if (!confirmRemove) {
      setConfirmRemove(true)
      // Confirmation window resets itself so a stray tap doesn't arm the button forever.
      setTimeout(() => setConfirmRemove(false), 4000)
      return
    }
    setIsRemovingImage(true)
    try {
      const res = await fetch(`/api/feed/${feedId}/remove-post-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ postId: post.id }),
      })
      if (!res.ok) throw new Error("Failed to remove image")
      toast({
        title: "Photo removed",
        description: "The day is open again. The photo is still in your Gallery.",
      })
      await onUpdate?.({
        ...post,
        image_url: null,
        media_urls: [],
        preview_image_url: null,
        prediction_id: null,
        generation_status: "pending",
      })
    } catch {
      toast({
        title: "Couldn't remove the photo",
        description: "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsRemovingImage(false)
      setConfirmRemove(false)
    }
  }

  // Get post type label (portrait, carousel, quote, etc.)
  const postTypeLabel =
    post.pro_mode_type === "carousel-slides"
      ? "carousel"
      : post.pro_mode_type === "reel-cover"
        ? "reel cover"
        : post.post_type?.toLowerCase() || "portrait"

  // Get a cleaner description from content_pillar or a default
  const getPostDescription = () => {
    if (post.content_pillar && post.content_pillar.length > 0) {
      return post.content_pillar
    }
    // Fallback based on post type
    const typeDescriptions: Record<string, string> = {
      portrait: "Portrait photo",
      carousel: "Carousel post",
      quote: "Quote graphic",
      infographic: "Infographic",
    }
    return typeDescriptions[postTypeLabel] || `Post ${post.position}`
  }

  const handleNavigateToMaya = () => {
    if (onNavigateToMaya) {
      onNavigateToMaya()
    } else if (typeof window !== "undefined") {
      window.location.assign("/app?view=create")
    }
  }

  const caption = post.caption || ""
  const needsStory = !caption.trim() && isPersonalStoryPosition(Number(post.position))
  const scheduledDate = post.scheduled_at ? new Date(post.scheduled_at) : null
  const validScheduledDate =
    scheduledDate && !Number.isNaN(scheduledDate.getTime()) ? scheduledDate : null
  const dateLabel = validScheduledDate
    ? validScheduledDate.toLocaleDateString("en", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : `Post ${post.position}`
  const displayAccount = String(accountName || "Your Instagram").replace(/^@/, "")
  const truncatedCaption = caption.length > 100 ? caption.substring(0, 100) + "..." : caption

  // Extract hashtags from caption
  const extractHashtags = (text: string): string => {
    const hashtagRegex = /#[\w]+/g
    const hashtags = text.match(hashtagRegex) || []
    return hashtags.join(" ")
  }

  const hashtags = extractHashtags(caption)

  // Get caption length indicator color
  const getLengthColor = (length: number): string => {
    if (length >= 125 && length <= 150) return "text-green-600" // Optimal range
    if (length > 150 && length <= 300) return "text-yellow-600" // Good but getting long
    if (length > 300) return "text-orange-600" // Very long
    return "text-stone-500" // Too short
  }

  const getLengthIndicator = (length: number): string => {
    if (length >= 125 && length <= 150) return "Optimal" // Best engagement
    if (length > 150 && length <= 300) return "Good"
    if (length > 300) return "Long"
    return "Short" // Better if 125-150 chars
  }

  const copyCaptionToClipboard = async () => {
    if (!caption) {
      toast({
        title: "No caption",
        description: "This post doesn't have a caption yet",
        variant: "destructive",
      })
      return
    }
    try {
      await navigator.clipboard.writeText(caption)
      setCopiedCaption(true)
      setTimeout(() => setCopiedCaption(false), 2000)
      toast({
        title: "Copied!",
        description: "Caption copied to clipboard",
      })
    } catch (error) {
      console.error("[v0] Failed to copy caption:", error)
      toast({
        title: "Copy failed",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  const handleEnhanceCaption = async () => {
    if (!caption) {
      toast({
        title: "No caption to enhance",
        description: "Please regenerate the caption first",
        variant: "destructive",
      })
      return
    }

    setIsEnhancing(true)
    try {
      const response = await fetch(`/api/feed/${feedId}/enhance-caption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ postId: post.id, currentCaption: caption }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to enhance caption")
      }

      const data = await response.json()

      if (data.enhancedCaption) {
        await onUpdate?.({ ...post, caption: data.enhancedCaption })
        toast({
          title: "Caption enhanced!",
          description: "Maya has improved your caption.",
        })
      } else {
        throw new Error("No enhanced caption returned")
      }
    } catch (error) {
      console.error("[v0] Enhance caption error:", error)
      toast({
        title: "Enhancement failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsEnhancing(false)
    }
  }

  const handleRegenerateCaption = async () => {
    setIsRegenerating(true)
    try {
      const response = await fetch(`/api/feed/${feedId}/regenerate-caption`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ postId: post.id }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 409 && errorData.code === "STORY_CONTEXT_REQUIRED") {
          onNavigateToMaya?.()
          toast({
            title: "Maya needs one real detail",
            description: "Tell her what happened and she’ll write from your story, not invent one.",
          })
          return
        }
        throw new Error(errorData.error || "Failed to regenerate caption")
      }

      const data = await response.json()

      if (data.caption) {
        await onUpdate?.({ ...post, caption: data.caption })
        toast({
          title: "Caption regenerated!",
          description: "Maya has created a new caption for this post.",
        })
      } else {
        throw new Error("No caption returned")
      }
    } catch (error) {
      console.error("[v0] Regenerate caption error:", error)
      toast({
        title: "Regeneration failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleStartEdit = () => {
    setEditedCaption(caption)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setEditedCaption("")
    setIsEditing(false)
  }

  const handleSaveEdit = async () => {
    if (editedCaption.trim() === caption) {
      // No changes
      setIsEditing(false)
      return
    }

    if (editedCaption.trim().length > 2200) {
      toast({
        title: "Caption too long",
        description: "Instagram captions can be at most 2,200 characters",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/feed/${feedId}/update-caption`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ postId: post.id, caption: editedCaption.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to update caption")
      }

      await onUpdate?.({ ...post, caption: editedCaption.trim() })
      setIsEditing(false)
      toast({
        title: "Caption updated!",
        description: "Your changes have been saved.",
      })
    } catch (error) {
      console.error("[v0] Save caption error:", error)
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCopyHashtags = async () => {
    if (!hashtags) {
      toast({
        title: "No hashtags",
        description: "This caption doesn't have any hashtags",
        variant: "destructive",
      })
      return
    }

    try {
      await navigator.clipboard.writeText(hashtags)
      setCopiedHashtags(true)
      setTimeout(() => setCopiedHashtags(false), 2000)
      toast({
        title: "Hashtags copied!",
        description: `${hashtags.split(" ").length} hashtags copied to clipboard`,
      })
    } catch (error) {
      console.error("[v0] Failed to copy hashtags:", error)
      toast({
        title: "Copy failed",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="mx-auto max-w-[470px] overflow-hidden rounded-[14px] border border-[#C5C6C8]/35 bg-white shadow-[0_1px_2px_rgba(13,14,16,0.04),0_10px_28px_rgba(13,14,16,0.06)]">
      {/* Editorial date with familiar Instagram account context. */}
      <div className="flex items-center justify-between gap-3 border-b border-[#C5C6C8]/35 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0D0E10]">
            <span className="text-xs font-bold text-white">S</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0D0E10]">{displayAccount}</p>
            {post.content_pillar && (
              <p className="text-xs capitalize text-[#818283]">{post.content_pillar}</p>
            )}
          </div>
        </div>
        <p className="max-w-[50%] text-right font-serif text-[18px] font-light leading-tight text-[#0D0E10]">
          {dateLabel}
        </p>
      </div>

      {/* Instagram Image */}
      <div className="relative aspect-[4/5] bg-[#F1F2F2]">
        {/* PHASE 5 FIX: Use preview_image_url as fallback for preview feeds */}
        {(() => {
          const imageUrl =
            savedMediaUrls[activeMediaIndex] || post.image_url || post.preview_image_url
          return imageUrl ? (
            <>
              <Image
                src={imageUrl || "/placeholder.svg"}
                alt={`Post ${post.position}`}
                fill
                className="object-cover object-top"
                sizes="(max-width: 768px) 100vw, 470px"
              />
              {/* Remove from grid (2026-07-07): clears the slot back to planned - the photo
                itself stays in her Gallery. Two-tap confirm, no modal. */}
              <button
                type="button"
                onClick={() => void handleRemoveImage()}
                disabled={isRemovingImage}
                className={`absolute right-2 top-2 min-h-11 rounded-full px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] backdrop-blur-sm transition-colors ${
                  confirmRemove
                    ? "bg-[#0D0E10] text-white"
                    : "bg-white/85 text-[#4F5052] hover:bg-white hover:text-[#0D0E10]"
                } disabled:opacity-50`}
              >
                {isRemovingImage ? "Removing…" : confirmRemove ? "Tap again to remove" : "Remove"}
              </button>
              {savedMediaUrls.length > 1 ? (
                <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 rounded-full bg-[#0D0E10]/70 px-3 py-2 backdrop-blur-sm">
                  <div className="flex items-center gap-1" aria-label="Carousel slides">
                    {savedMediaUrls.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setActiveMediaIndex(index)}
                        aria-label={`Show slide ${index + 1}`}
                        aria-pressed={activeMediaIndex === index}
                        className={`h-2.5 w-2.5 rounded-full border border-white/70 ${
                          activeMediaIndex === index ? "bg-white" : "bg-transparent"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-medium text-white">
                    {activeMediaIndex + 1} / {savedMediaUrls.length}
                  </span>
                </div>
              ) : null}
            </>
          ) : post.generation_status === "generating" && post.prediction_id ? (
            <div className="flex h-full w-full flex-col items-center justify-center">
              <div className="relative mb-4">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-[#C5C6C8] border-t-[#0D0E10]"></div>
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] uppercase tracking-[0.16em] text-[#0D0E10]">
                  AI
                </span>
              </div>
              <p className="text-sm font-light tracking-wider text-[#4F5052]">
                Creating your image...
              </p>
              <p className="mt-1 text-xs text-[#818283]">This usually takes 1-2 minutes</p>
            </div>
          ) : (
            <div className="relative flex h-full w-full flex-col items-center justify-center p-8">
              {/* Subtle background pattern */}
              <div className="absolute inset-0 opacity-5">
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 2px 2px, rgb(0 0 0) 1px, transparent 0)",
                    backgroundSize: "24px 24px",
                  }}
                ></div>
              </div>

              {/* Content */}
              <div className="relative z-10 flex w-full max-w-xs flex-col items-center">
                {/* Post Type Badge */}
                <div className="mb-6 rounded-full border border-[#C5C6C8]/50 bg-white/80 px-4 py-1.5 backdrop-blur-sm">
                  <span className="text-xs font-medium uppercase tracking-wider text-[#0D0E10]">
                    {postTypeLabel}
                  </span>
                </div>

                {/* Icon */}
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-[#C5C6C8]/50 bg-white/60 shadow-sm backdrop-blur-sm">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-[#818283]">
                    Image
                  </span>
                </div>

                {/* Description */}
                <p className="mb-8 px-4 text-center text-sm font-light leading-relaxed text-[#4F5052]">
                  {getPostDescription()}
                </p>

                {/* Go to Maya Button */}
                {onNavigateToMaya && (
                  <button
                    onClick={handleNavigateToMaya}
                    className="group flex items-center gap-2 rounded-[8px] bg-[#0D0E10] px-8 py-3.5 text-sm font-medium tracking-wide text-white transition-all hover:scale-[1.02] hover:opacity-90 hover:shadow-xl"
                  >
                    <span className="text-[10px] uppercase tracking-[0.16em]">AI</span>
                    <span>Create with Maya</span>
                  </button>
                )}
              </div>

              {/* Position indicator - subtle in corner */}
              <div className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-[#0D0E10]/65 backdrop-blur-sm">
                <span className="text-[10px] font-medium text-white">{post.position}</span>
              </div>
            </div>
          )
        })()}
      </div>

      {savedMediaUrls.length > 1 ? (
        <div className="flex items-center justify-between border-b border-[#C5C6C8]/35 px-4 py-3">
          <p className="text-xs text-[#4F5052]">{savedMediaUrls.length} slides saved together</p>
          <button
            type="button"
            onClick={() => void handleSaveAllSlides()}
            disabled={isSavingSlides}
            className="min-h-11 rounded-[8px] border border-[#C5C6C8]/60 px-3 text-[10px] uppercase tracking-[0.14em] text-[#0D0E10] transition-colors hover:bg-[#F8FAFA] disabled:opacity-50"
          >
            {isSavingSlides ? "Saving..." : "Save all slides"}
          </button>
        </div>
      ) : null}

      {(post.purpose || post.shot_type || post.visual_direction) && (
        <div className="space-y-1 border-b border-[#C5C6C8]/35 bg-[#F8FAFA] px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#4F5052]">
            Maya&apos;s plan for this post
          </p>
          <p className="text-sm text-[#0D0E10]">
            {[post.purpose, post.shot_type]
              .filter(Boolean)
              .map(value => String(value).replace(/[-_]/g, " "))
              .join(" · ")}
          </p>
          {post.visual_direction ? (
            <p className="text-xs leading-relaxed text-[#4F5052]">{post.visual_direction}</p>
          ) : null}
        </div>
      )}

      {/* Real post actions only. Decorative Instagram controls created broken expectations. */}
      <div className="space-y-3 px-4 py-3">
        {/* Caption */}
        {isRegenerating ? (
          <div className="space-y-2 rounded-[10px] border border-[#C5C6C8]/50 bg-[#F8FAFA] px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-4 w-4 animate-spin rounded-full border border-[#C5C6C8] border-t-[#4F5052]" />
              <p className="text-sm text-[#4F5052]">Maya is creating a new caption...</p>
            </div>
          </div>
        ) : isEditing ? (
          <div className="space-y-3 px-4 py-3">
            <div className="flex items-start gap-2">
              <span className="text-sm font-semibold text-[#0D0E10]">{displayAccount}</span>
            </div>
            <textarea
              value={editedCaption}
              onChange={e => setEditedCaption(e.target.value)}
              className="min-h-[120px] w-full resize-y rounded-[10px] border border-[#C5C6C8] px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0D0E10]"
              placeholder="Write your caption here..."
              maxLength={2200}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${getLengthColor(editedCaption.length)}`}>
                  {editedCaption.length}/2,200 • {getLengthIndicator(editedCaption.length)}
                </span>
                {editedCaption.length >= 125 && editedCaption.length <= 150 && (
                  <span className="text-xs text-[#4F5052]">Optimal</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="flex min-h-11 items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-xs font-medium text-[#4F5052] transition-colors hover:bg-[#F8FAFA] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving || editedCaption.trim() === caption}
                  className="flex min-h-11 items-center gap-1.5 rounded-[8px] bg-[#0D0E10] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <span className="inline-flex h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white" />
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : caption ? (
          <div className="space-y-2">
            {/* caption then buttons stacked */}
            <div className="text-sm">
              <span className="font-semibold text-[#0D0E10]">{displayAccount}</span>{" "}
              <span className="whitespace-pre-wrap break-words text-[#0D0E10]">
                {showFullCaption ? caption : truncatedCaption}
              </span>
              {caption.length > 100 && (
                <button
                  onClick={() => setShowFullCaption(!showFullCaption)}
                  className="ml-1 text-[#818283] transition-colors hover:text-[#4F5052]"
                >
                  {showFullCaption ? "less" : "more"}
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={copyCaptionToClipboard}
                className="min-h-11 rounded-[8px] border border-[#C5C6C8]/50 px-3 py-2 transition-colors hover:border-[#C5C6C8] hover:bg-[#F8FAFA]"
                title="Copy caption"
              >
                {copiedCaption ? (
                  <span className="text-[10px] uppercase tracking-[0.16em] text-[#0D0E10]">
                    Done
                  </span>
                ) : (
                  <span className="text-[10px] uppercase tracking-[0.16em] text-[#4F5052]">
                    Copy
                  </span>
                )}
              </button>
              {hashtags && (
                <button
                  onClick={handleCopyHashtags}
                  className="min-h-11 rounded-[8px] border border-[#C5C6C8]/50 px-3 py-2 transition-colors hover:border-[#C5C6C8] hover:bg-[#F8FAFA]"
                  title="Copy hashtags"
                >
                  {copiedHashtags ? (
                    <span className="text-[10px] uppercase tracking-[0.16em] text-[#0D0E10]">
                      Done
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-[0.16em] text-[#4F5052]">
                      Tags
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={handleStartEdit}
                disabled={isRegenerating || isEnhancing}
                className="min-h-11 rounded-[8px] border border-[#C5C6C8]/50 px-3 py-2 transition-colors hover:border-[#C5C6C8] hover:bg-[#F8FAFA] disabled:cursor-not-allowed disabled:opacity-50"
                title="Edit caption"
              >
                <span className="text-[10px] uppercase tracking-[0.16em] text-[#4F5052]">Edit</span>
              </button>
              <button
                onClick={handleRegenerateCaption}
                disabled={isRegenerating || isEnhancing}
                className="rounded-[8px] border border-[#C5C6C8]/50 p-2 transition-colors hover:border-[#C5C6C8] hover:bg-[#F8FAFA] disabled:cursor-not-allowed disabled:opacity-50"
                title="Regenerate caption"
              >
                <span className="text-[10px] uppercase tracking-[0.16em] text-[#4F5052]">Redo</span>
              </button>
              <button
                onClick={handleEnhanceCaption}
                disabled={isEnhancing || isRegenerating}
                className="rounded-[8px] border border-[#C5C6C8]/50 p-2 transition-colors hover:border-[#C5C6C8] hover:bg-[#F8FAFA] disabled:cursor-not-allowed disabled:opacity-50"
                title="Enhance caption (make it longer)"
              >
                {isEnhancing ? (
                  <span className="inline-flex h-4 w-4 animate-spin rounded-full border border-[#C5C6C8] border-t-[#4F5052]" />
                ) : (
                  <span className="text-[10px] uppercase tracking-[0.16em] text-[#4F5052]">
                    Boost
                  </span>
                )}
              </button>
            </div>
            <div className="flex items-center justify-between px-4">
              <p className="text-xs uppercase tracking-wide text-[#818283]">{dateLabel}</p>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${getLengthColor(caption.length)}`}>
                  {caption.length} chars • {getLengthIndicator(caption.length)}
                </span>
                {caption.length >= 125 && caption.length <= 150 && (
                  <span className="text-xs text-[#4F5052]">Optimal</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 rounded-[10px] border border-[#C5C6C8]/50 bg-[#F8FAFA] px-4 py-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#4F5052]">
                  {needsStory ? "Needs your story" : "No caption yet"}
                </p>
                {needsStory ? (
                  <p className="mt-1 text-[11px] leading-relaxed text-[#818283]">
                    Maya will ask for one real moment before she writes this in your voice.
                  </p>
                ) : null}
              </div>
              <button
                onClick={
                  needsStory && onNavigateToMaya ? handleNavigateToMaya : handleRegenerateCaption
                }
                disabled={isRegenerating}
                className="flex items-center gap-2 rounded-[8px] bg-[#0D0E10] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRegenerating ? (
                  <>
                    <span className="inline-flex h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] uppercase tracking-[0.16em]">AI</span>
                    <span>{needsStory ? "Tell Maya" : "Generate caption"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
