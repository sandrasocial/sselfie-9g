"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ChevronLeft, MoreHorizontal, Plus, Settings } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface FeedHeaderProps {
  feedData: any
  currentFeedId: number
  onBack?: () => void
  onProfileImageClick: () => void
  onWriteBio: () => void
  onCreateHighlights?: () => void
  onOpenWizard?: () => void // Callback to open wizard
}

export default function FeedHeader({
  feedData,
  currentFeedId,
  onBack,
  onProfileImageClick,
  onWriteBio,
  onCreateHighlights,
  onOpenWizard,
}: FeedHeaderProps) {
  const router = useRouter()
  const [isCreatingFeed, setIsCreatingFeed] = useState(false)
  const [isCreatingPreviewFeed, setIsCreatingPreviewFeed] = useState(false)

  const handleCreatePreviewFeed = async () => {
    setIsCreatingPreviewFeed(true)
    try {
      const response = await fetch('/api/feed/create-free-example', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create preview feed' }))
        throw new Error(error.error || 'Failed to create preview feed')
      }

      const data = await response.json()
      
      // Navigate to the new preview feed
      router.push(`/feed-planner?feedId=${data.feedId}`)
      
      toast({
        title: "Preview feed created",
        description: "Your preview feed is ready. Generate your preview image!",
      })
    } catch (error) {
      console.error("[v0] Error creating preview feed:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create preview feed. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingPreviewFeed(false)
    }
  }

  const handleCreateNewFeed = async () => {
    setIsCreatingFeed(true)
    try {
      const response = await fetch('/api/feed/create-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create feed' }))
        throw new Error(error.error || 'Failed to create feed')
      }

      const data = await response.json()
      
      // Navigate to the new feed
      router.push(`/feed-planner?feedId=${data.feedId}`)
      
      toast({
        title: "Feed created",
        description: "Your new feed is ready. Start adding images!",
      })
    } catch (error) {
      console.error("[v0] Error creating feed:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create feed. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingFeed(false)
    }
  }

  const hasProfileImage = !!feedData?.feed?.profile_image_url
  const hasBio = !!feedData?.bio?.bio_text

  // Get feed name (title) - prefer title, then brand_name, then fallback
  const feedName = feedData?.feed?.title || 
    feedData?.feed?.brand_name || 
    `Feed ${currentFeedId}` ||
    "My Feed"

  // Get feed color for checkmark (default to blue if not set)
  const feedColor = feedData?.feed?.display_color || "#3b82f6" // Default blue

  return (
    <div className="bg-white border-b border-stone-200">
      <div className="flex items-center justify-between px-4 py-3">
        {onBack && (
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-stone-50 rounded-full transition-colors">
            <ChevronLeft size={24} className="text-stone-900" strokeWidth={2} />
          </button>
        )}
        <div className="flex items-center gap-2">
          {/* Color badge */}
          {feedData?.feed?.display_color && (
            <div
              className="w-3 h-3 rounded-full border-2 shrink-0"
              style={{
                backgroundColor: feedData.feed.display_color,
                borderColor: feedData.feed.display_color,
              }}
              title={`Feed color: ${feedData.feed.display_color}`}
            />
          )}
          <span className="text-base font-semibold text-stone-900">{feedName}</span>
          <svg 
            className="w-4 h-4" 
            fill="currentColor" 
            viewBox="0 0 24 24"
            style={{ color: feedColor }}
          >
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div className="flex items-center gap-1">
          {onOpenWizard && (
            <button
              onClick={onOpenWizard}
              className="p-2 hover:bg-stone-50 rounded-full transition-colors"
              title="Edit wizard answers"
            >
              <Settings size={20} className="text-stone-600" strokeWidth={2} />
            </button>
          )}
          <button className="p-2 -mr-2 hover:bg-stone-50 rounded-full transition-colors">
            <MoreHorizontal size={24} className="text-stone-900" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="px-4 md:px-8 pb-4">
        <div className="flex flex-col md:flex-row md:items-start md:gap-12 mb-4">
          <button
            onClick={onProfileImageClick}
            className="relative group w-20 h-20 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-[3px] mb-4 md:mb-0 flex-shrink-0 transition-opacity hover:opacity-90"
          >
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden relative">
              {hasProfileImage ? (
                <Image
                  src={feedData.feed.profile_image_url}
                  alt="Profile"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 80px, 128px"
                  style={{ borderRadius: '50%' }}
                />
              ) : (
                <span className="text-2xl md:text-4xl font-bold text-stone-900 relative z-10">S</span>
              )}
            </div>
            <div className="absolute inset-0 bg-stone-950/0 group-hover:bg-stone-950/40 rounded-full transition-all flex items-center justify-center pointer-events-none">
              <span className="text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity font-medium text-center px-2">
                {hasProfileImage ? "Change" : "Add photo"}
              </span>
            </div>
            {!hasProfileImage && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Click to add profile picture
              </div>
            )}
          </button>

          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-sm md:text-base font-semibold text-stone-900">9</div>
                <div className="text-xs md:text-sm text-stone-500">posts</div>
              </div>
              <div className="text-center">
                <div className="text-sm md:text-base font-semibold text-stone-900">1.2K</div>
                <div className="text-xs md:text-sm text-stone-500">followers</div>
              </div>
              <div className="text-center">
                <div className="text-sm md:text-base font-semibold text-stone-900">342</div>
                <div className="text-xs md:text-sm text-stone-500">following</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-stone-900">
                {feedData?.userDisplayName || feedData?.feed?.brand_name || "User"}
              </div>
              <div className="text-sm text-stone-900 whitespace-pre-wrap">
                {hasBio ? feedData.bio.bio_text : "Your Instagram feed strategy created by Maya"}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={onWriteBio}
                className="flex-1 md:flex-none md:px-8 bg-stone-100 hover:bg-stone-200 text-stone-900 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
              >
                Write Bio
              </button>
              <button
                onClick={handleCreatePreviewFeed}
                disabled={isCreatingPreviewFeed}
                className="flex-1 md:flex-none md:px-6 bg-stone-100 hover:bg-stone-200 text-stone-900 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {isCreatingPreviewFeed ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>New Preview</span>
                  </>
                )}
              </button>
              <button
                onClick={handleCreateNewFeed}
                disabled={isCreatingFeed}
                className="flex-1 md:flex-none md:px-8 bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {isCreatingFeed ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>New Feed</span>
                  </>
                )}
              </button>
              <button
                onClick={onCreateHighlights}
                className="flex-1 md:flex-none md:px-8 bg-stone-100 hover:bg-stone-200 text-stone-900 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
              >
                Create Highlights
              </button>
            </div>

            {/* Highlights - below buttons, mobile optimized */}
            {feedData?.highlights && feedData.highlights.length > 0 && (
              <div className="w-full mt-4 -mx-4 px-4 md:mx-0 md:px-0">
                <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 scrollbar-hide">
                  {feedData.highlights.map((highlight: any) => {
                    const isColorHighlight = !highlight.image_url || highlight.image_url.startsWith("#")
                    const displayColor = isColorHighlight
                      ? (highlight.image_url?.startsWith("#")
                          ? highlight.image_url
                          : "#D4C5B9")
                      : null
                    
                    // Extract brand colors from feed
                    const brandColors = feedData?.feed?.color_palette
                      ? typeof feedData.feed.color_palette === "string"
                        ? JSON.parse(feedData.feed.color_palette)
                            .filter((c: any) => typeof c === "string")
                            .slice(0, 4)
                        : Array.isArray(feedData.feed.color_palette)
                        ? feedData.feed.color_palette
                            .filter((c: any) => typeof c === "string")
                            .slice(0, 4)
                        : Object.values(feedData.feed.color_palette)
                            .filter((c: any) => typeof c === "string")
                            .slice(0, 4)
                      : []
                    const defaultColors = ["#D4C5B9", "#E8D5C4", "#F5E6D3", "#C9B8A8"]
                    const availableColors = brandColors.length > 0 ? brandColors : defaultColors
                    const highlightColor = displayColor || availableColors[feedData.highlights.indexOf(highlight) % availableColors.length]

                    return (
                      <div key={highlight.id || highlight.title} className="flex flex-col items-center gap-2 min-w-[64px] md:min-w-[70px] flex-shrink-0">
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
                          <div className="w-full h-full rounded-full bg-white p-[2px]">
                            {isColorHighlight ? (
                              <div
                                className="w-full h-full rounded-full flex items-center justify-center"
                                style={{ backgroundColor: highlightColor }}
                              >
                                <span className="text-base md:text-lg font-bold text-white drop-shadow-lg">
                                  {highlight.title ? highlight.title.charAt(0).toUpperCase() : "H"}
                                </span>
                              </div>
                            ) : (
                              <div className="relative w-full h-full rounded-full overflow-hidden">
                                <Image
                                  src={highlight.image_url}
                                  alt={highlight.title || "Highlight"}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 768px) 56px, 64px"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-stone-900 text-center leading-tight max-w-[64px] md:max-w-[70px] truncate">
                          {highlight.title}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

