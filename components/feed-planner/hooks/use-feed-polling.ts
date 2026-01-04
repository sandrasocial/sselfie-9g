"use client"

import { useRef } from "react"
import useSWR from "swr"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  
  // If the response has an error and is not a 200 status, throw to let SWR handle it
  if (!res.ok && data.error) {
    // Return the error data so SWR can handle it properly
    return data
  }
  
  // Validate response structure
  if (data && !data.feed && !data.error && !data.exists) {
    console.warn("[v0] Fetcher: Unexpected response structure:", {
      url,
      dataKeys: Object.keys(data),
      status: res.status,
    })
  }
  
  return data
}

/**
 * Hook for fetching feed data with intelligent polling
 * Polls every 3s when posts are generating, stops when complete
 */
export function useFeedPolling(feedId: number | null) {
  // Track last update time to continue polling for a grace period after updates
  const lastUpdateRef = useRef<number>(Date.now())
  
  const { data: feedData, error: feedError, mutate, isLoading, isValidating } = useSWR(
    feedId ? `/api/feed/${feedId}` : null,
    fetcher,
    {
      refreshInterval: (data) => {
        // Poll if:
        // 1. Posts are generating images (prediction_id but no image_url)
        // 2. Feed is processing prompts/captions (status: processing/queueing/generating)
        const hasGeneratingPosts = data?.posts?.some(
          (p: any) => p.prediction_id && !p.image_url
        )
        const isProcessing = data?.feed?.status === 'processing' || 
                            data?.feed?.status === 'queueing' ||
                            data?.feed?.status === 'generating'
        
        // Continue polling if generating or processing
        if (hasGeneratingPosts || isProcessing) {
          lastUpdateRef.current = Date.now()
          return 3000 // Poll every 3s (faster for better UX)
        }
        
        // Grace period: Continue polling for 15s after last update
        // This ensures UI catches database updates even if timing is slightly off
        const timeSinceLastUpdate = Date.now() - lastUpdateRef.current
        const shouldContinuePolling = timeSinceLastUpdate < 15000
        
        return shouldContinuePolling ? 3000 : 0
      },
      refreshWhenHidden: false, // Stop when tab hidden
      revalidateOnFocus: true, // Refresh when tab becomes visible
      onSuccess: (data) => {
        // Update last update time when data changes
        if (data?.posts) {
          const hasNewImages = data.posts.some((p: any) => p.image_url)
          if (hasNewImages) {
            lastUpdateRef.current = Date.now()
          }
        }
      },
    }
  )

  return {
    feedData,
    feedError,
    mutate,
    isLoading,
    isValidating,
  }
}

