"use client"

import { useSearchParams, useRouter } from "next/navigation"
import useSWR from "swr"
import InstagramFeedView from "./instagram-feed-view"
import UnifiedLoading from "../sselfie/unified-loading"
import { ArrowLeft } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface FeedPlannerScreenProps {
  feedId?: number | null
}

/**
 * Simplified Feed Planner Screen - View Only
 * 
 * This screen displays a feed in view-only mode.
 * Feed creation is handled in Maya Chat (Feed tab).
 * 
 * Accepts feedId as:
 * - Prop (from parent)
 * - Query parameter (?feedId=123)
 */
export default function FeedPlannerScreen({ feedId: feedIdProp }: FeedPlannerScreenProps = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get feedId from prop, query param, or null
  const feedId = feedIdProp ?? (searchParams.get('feedId') ? parseInt(searchParams.get('feedId')!, 10) : null)

  // Fetch feed data
  const { data: feedData, error: feedError, isLoading } = useSWR(
    feedId ? `/api/feed/${feedId}` : null,
    fetcher,
    {
      refreshInterval: 3000, // Poll every 3 seconds for real-time updates
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  )

  const handleBackToMaya = () => {
    // Route to Maya Feed tab using hash navigation
    if (typeof window !== "undefined") {
      // Use window.location.hash for client-side hash navigation
      window.location.hash = "#maya/feed"
      // Also navigate to root to ensure we're on the right page
      router.push("/")
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden min-h-0">
        <div className="flex items-center justify-center min-h-[400px]">
          <UnifiedLoading message="Loading your feed..." />
        </div>
      </div>
    )
  }

  // Error state
  if (feedError || !feedData) {
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

  // No feedId provided
  if (!feedId) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden min-h-0">
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <div className="text-center space-y-4">
            <p className="text-sm text-stone-600">No feed selected.</p>
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

  // Success: Show feed view
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

      {/* Feed View */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <InstagramFeedView
          feedId={feedId}
          onBack={handleBackToMaya}
        />
      </div>
    </div>
  )
}
