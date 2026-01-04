"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import useSWR from "swr"
import InstagramFeedView from "./instagram-feed-view"
import { ArrowLeft, ImageIcon, Loader2, ChevronDown } from "lucide-react"
import { toast } from "@/hooks/use-toast"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface FeedViewScreenProps {
  feedId?: number | null
}

/**
 * Feed View Screen - View Only
 * 
 * This screen displays a feed in view-only mode.
 * Feed creation is handled in Maya Chat (Feed tab).
 * 
 * Accepts feedId as:
 * - Prop (from parent)
 * - Query parameter (?feedId=123)
 * 
 * When no feedId is provided, automatically fetches the latest feed.
 * Shows placeholder state if no feed exists.
 */
export default function FeedViewScreen({ feedId: feedIdProp }: FeedViewScreenProps = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isCreatingManual, setIsCreatingManual] = useState(false)
  
  // Get feedId from prop, query param, or null
  const feedIdFromQuery = feedIdProp ?? (searchParams.get('feedId') ? parseInt(searchParams.get('feedId')!, 10) : null)

  // Determine which endpoint to use: specific feedId or latest feed
  // Use /api/feed/latest which routes to [feedId] with feedId="latest"
  const swrKey = feedIdFromQuery 
    ? `/api/feed/${feedIdFromQuery}` 
    : '/api/feed/latest'

  // Fetch feed data (handles both specific feed and latest feed)
  const { data: feedData, error: feedError, isLoading } = useSWR(
    swrKey,
    fetcher,
    {
      refreshInterval: 3000, // Poll every 3 seconds for real-time updates
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  )

  // Extract effective feedId from response
  // If using latest endpoint, extract feedId from response
  const effectiveFeedId = feedIdFromQuery || feedData?.feed?.id || null

  // Check if feed exists (latest endpoint returns { exists: false } when no feed)
  const feedExists = feedData?.exists !== false && (feedData?.feed || feedData?.posts)

  // Fetch feed list for selector (only if we have a feed)
  const { data: feedListData, mutate: mutateFeedList } = useSWR(
    feedExists ? '/api/feed/list' : null,
    fetcher,
    {
      revalidateOnFocus: true, // Revalidate when tab becomes visible
      revalidateOnReconnect: true, // Revalidate on reconnect
      refreshInterval: 0, // Don't auto-poll, but allow manual refresh
    }
  )

  // Revalidate feed list when feedId changes (e.g., after creating new feed)
  useEffect(() => {
    if (effectiveFeedId && mutateFeedList) {
      mutateFeedList()
    }
  }, [effectiveFeedId, mutateFeedList])

  const feeds = feedListData?.feeds || []
  const hasMultipleFeeds = feeds.length > 1

  const handleBackToMaya = () => {
    // Route to Maya Feed tab using hash navigation
    if (typeof window !== "undefined") {
      // Navigate to studio with Maya feed tab
      window.location.href = "/studio#maya/feed"
    }
  }

  const handleCreateFeed = () => {
    // Navigate to Maya Feed tab to create a feed
    if (typeof window !== "undefined") {
      window.location.href = "/studio#maya/feed"
    }
  }

  const handleCreateManualFeed = async () => {
    setIsCreatingManual(true)
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
      
      // Invalidate feed list cache so selector appears immediately
      if (mutateFeedList) {
        await mutateFeedList()
      }
      
      // Navigate to the new feed
      router.push(`/feed-planner?feedId=${data.feedId}`)
      
      toast({
        title: "Feed created",
        description: "Your new feed is ready. Start adding images!",
      })
    } catch (error) {
      console.error("[v0] Error creating manual feed:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create feed. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingManual(false)
    }
  }

  // Loading state - show feed view immediately (data will load in background)
  // No loading indicator per requirements

  // Error state (actual errors, not "no feed exists")
  if (feedError || (feedData?.error && feedData.exists !== false)) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden min-h-0">
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <div className="text-center space-y-4">
            <p className="text-sm text-stone-600">Failed to load feed. Please try again.</p>
            <button
              onClick={handleBackToMaya}
              className="text-sm text-stone-500 hover:text-stone-900 underline flex items-center gap-2 mx-auto"
            >
              <ArrowLeft size={16} />
              Back to Maya Chat
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Placeholder state: No feed exists (exists: false from /api/feed/latest)
  if (!feedExists || (!feedIdFromQuery && feedData?.exists === false)) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden min-h-0">
        {/* Header with Back button */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-stone-200 bg-white/60 backdrop-blur-md">
          <button
            onClick={handleBackToMaya}
            className="text-sm font-light text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Maya Chat
          </button>
        </div>

        {/* Placeholder State */}
        <div className="flex-1 overflow-y-auto min-h-0 flex items-center justify-center p-4 sm:p-6 md:p-12">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Icon */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-stone-100 flex items-center justify-center">
              <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10 text-stone-400" />
            </div>

            {/* Heading */}
            <div className="space-y-2">
              <h2 
                className="text-xl sm:text-2xl font-light text-stone-900"
                style={{ fontFamily: "'Times New Roman', serif" }}
              >
                Create Your First Feed
              </h2>
              <p className="text-sm sm:text-base text-stone-600 font-light">
                Create a feed manually or generate one with Maya's AI assistance.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
              <button
                onClick={handleCreateManualFeed}
                disabled={isCreatingManual}
                className="w-full sm:w-auto px-6 py-3 bg-stone-900 hover:bg-stone-800 active:bg-stone-700 text-white text-sm font-light tracking-wider uppercase transition-colors duration-200 border border-stone-900 min-h-[44px] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCreatingManual ? "Creating..." : "+ Create New Feed"}
              </button>
              <button
                onClick={handleCreateFeed}
                className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-900 text-sm font-light tracking-wider uppercase transition-colors duration-200 border border-stone-300 min-h-[44px] touch-manipulation"
              >
                Create with Maya
              </button>
            </div>

            {/* Placeholder Grid Preview (Visual Guide) */}
            <div className="pt-8 border-t border-stone-200">
              <p className="text-xs text-stone-500 uppercase tracking-wider mb-4">
                Your Feed Preview
              </p>
              <div className="grid grid-cols-3 gap-1 max-w-[300px] mx-auto">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-stone-100 border border-stone-200 flex items-center justify-center"
                  >
                    <ImageIcon className="w-4 h-4 text-stone-300" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Success: Show feed view (must have effectiveFeedId at this point)
  if (!effectiveFeedId) {
    // Fallback (shouldn't happen, but TypeScript safety)
    return (
      <div className="flex flex-col flex-1 overflow-hidden min-h-0">
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <div className="text-center space-y-4">
            <p className="text-sm text-stone-600">Unable to determine feed ID.</p>
            <button
              onClick={handleBackToMaya}
              className="text-sm text-stone-500 hover:text-stone-900 underline flex items-center gap-2 mx-auto"
            >
              <ArrowLeft size={16} />
              Back to Maya Chat
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleFeedChange = (newFeedId: number) => {
    router.push(`/feed-planner?feedId=${newFeedId}`)
  }

  const currentFeedTitle = feedData?.feed?.brand_name || `Feed ${effectiveFeedId}`

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {/* Header with Back button, Feed Selector, and Create New Feed */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-stone-200 bg-white/60 backdrop-blur-md gap-3">
        <button
          onClick={handleBackToMaya}
          className="text-sm font-light text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-2 flex-shrink-0"
        >
          <ArrowLeft size={16} />
          Back to Maya Chat
        </button>
        
        <div className="flex items-center gap-3 flex-1 justify-end">
          {/* Feed Selector - show if multiple feeds exist */}
          {hasMultipleFeeds && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500 uppercase tracking-wider hidden sm:inline">
                My Feeds
              </span>
              <div className="relative">
                <select
                  value={effectiveFeedId || ''}
                  onChange={(e) => handleFeedChange(Number(e.target.value))}
                  className="appearance-none bg-white border border-stone-300 rounded-lg px-4 py-2 pr-8 text-sm font-light text-stone-900 hover:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-colors cursor-pointer"
                >
                  {feeds.map((feed: any) => (
                    <option key={feed.id} value={feed.id}>
                      {feed.title} {feed.image_count > 0 ? `(${feed.image_count}/9)` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown 
                  size={16} 
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" 
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feed View */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <InstagramFeedView
          feedId={effectiveFeedId}
          onBack={handleBackToMaya}
        />
      </div>
    </div>
  )
}
