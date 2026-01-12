"use client"

import { useRef, useState, useEffect } from "react"
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
 * FIX 4: Added 5-minute timeout to prevent infinite polling
 */
const MAX_POLLING_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

export function useFeedPolling(feedId: number | null) {
  // Track last update time to continue polling for a grace period after updates
  const lastUpdateRef = useRef<number>(Date.now())
  // FIX 4: Track when polling started for timeout detection
  const pollingStartTimeRef = useRef<number | null>(null)
  const [hasTimedOut, setHasTimedOut] = useState(false)
  
  // Poll both feed data AND progress endpoint to update database
  const { data: feedData, error: feedError, mutate, isLoading, isValidating } = useSWR(
    feedId ? `/api/feed/${feedId}` : null,
    fetcher,
    {
      refreshInterval: (data) => {
        // Debug: Log data structure
        if (data) {
          console.log('[useFeedPolling] 🔍 refreshInterval check:', {
            hasData: !!data,
            hasPosts: !!data.posts,
            postsCount: data.posts?.length || 0,
            postsStructure: data.posts ? data.posts.map((p: any) => ({
              id: p.id,
              position: p.position,
              hasPredictionId: !!p.prediction_id,
              hasImageUrl: !!p.image_url,
              generationStatus: p.generation_status,
              predictionId: p.prediction_id?.substring(0, 20) + '...' || null
            })) : 'no posts',
            feedStatus: data.feed?.status,
            feedId: data.feed?.id
          })
        }
        
        // FIX 4: Check if polling has exceeded max duration
        if (pollingStartTimeRef.current !== null) {
          const elapsedTime = Date.now() - pollingStartTimeRef.current
          if (elapsedTime > MAX_POLLING_DURATION) {
            console.error('[useFeedPolling] ⚠️ Max polling duration exceeded (5 minutes), stopping poll')
            
            // Mark stuck posts as failed in database
            const stuckPosts = data?.posts?.filter((p: any) => p.prediction_id && !p.image_url) || []
            if (stuckPosts.length > 0) {
              console.error(`[useFeedPolling] Posts stuck:`, stuckPosts.map((p: any) => p.id))
              setHasTimedOut(true)
              
              // Mark each stuck post as failed in database
              stuckPosts.forEach((post: any) => {
                fetch(`/api/feed/post/${post.id}/mark-failed`, { method: 'POST' })
                  .then(res => res.json())
                  .then(result => {
                    if (result.success) {
                      console.log(`[useFeedPolling] ✅ Post ${post.id} marked as failed`)
                      // Refresh feed data to show failed status
                      mutate()
                    }
                  })
                  .catch(err => {
                    console.error(`[useFeedPolling] ❌ Failed to mark post ${post.id} as failed:`, err)
                  })
              })
            }
            
            // Reset polling start time
            pollingStartTimeRef.current = null
            return 0 // Stop polling
          }
        }
        
        // Poll if:
        // 1. Posts are generating images (prediction_id but no image_url)
        // 2. Feed is processing prompts/captions (status: processing/queueing/generating)
        // IMPORTANT: Also check generation_status to catch posts that are marked as generating
        const hasGeneratingPosts = data?.posts?.some(
          (p: any) => (p.prediction_id && !p.image_url) || p.generation_status === 'generating'
        )
        const isProcessing = data?.feed?.status === 'processing' || 
                            data?.feed?.status === 'queueing' ||
                            data?.feed?.status === 'generating'
        
        // Get detailed post status for debugging
        const generatingPosts = data?.posts?.filter((p: any) => 
          (p.prediction_id && !p.image_url) || p.generation_status === 'generating'
        ) || []
        
        console.log('[useFeedPolling] 🔍 Polling decision:', {
          hasGeneratingPosts,
          isProcessing,
          generatingPosts: generatingPosts.map((p: any) => ({
            id: p.id,
            position: p.position,
            hasPredictionId: !!p.prediction_id,
            hasImageUrl: !!p.image_url,
            generationStatus: p.generation_status,
            predictionId: p.prediction_id?.substring(0, 20) + '...' || null
          }))
        })
        
        // Continue polling if generating or processing
        if (hasGeneratingPosts || isProcessing) {
          // Record start time on first poll
          if (pollingStartTimeRef.current === null) {
            pollingStartTimeRef.current = Date.now()
            console.log('[useFeedPolling] ✅ Polling started, will timeout after 5 minutes')
          }
          
          // Call progress endpoint to update database (separate from feed fetch)
          // This keeps feed endpoint fast and simple (per audit recommendation)
          if (feedId && hasGeneratingPosts) {
            console.log('[useFeedPolling] 🔄 Calling progress endpoint to check Replicate status...')
            fetch(`/api/feed/${feedId}/progress`)
              .then(res => {
                if (!res.ok) {
                  throw new Error(`Progress endpoint returned ${res.status}`)
                }
                return res.json()
              })
              .then(progressData => {
                console.log('[useFeedPolling] 📊 Progress endpoint response:', {
                  completed: progressData.completed,
                  failed: progressData.failed,
                  total: progressData.total,
                  progress: progressData.progress
                })
                
                // Always refresh feed data after calling progress endpoint
                // Even if no posts completed, the database might have been updated
                console.log('[useFeedPolling] ✅ Refreshing feed data after progress check')
                mutate() // Refresh feed data after progress update
              })
              .catch(err => {
                console.error('[useFeedPolling] ❌ Error calling progress endpoint:', err)
                // Don't fail polling if progress endpoint fails, but still try to refresh
                mutate()
              })
          }
          
          lastUpdateRef.current = Date.now()
          console.log('[useFeedPolling] ✅ Returning 3000ms (polling active)')
          return 3000 // Poll every 3s (faster for better UX)
        } else {
          // No generating posts - reset polling start time
          if (pollingStartTimeRef.current !== null) {
            console.log('[useFeedPolling] ✅ All posts completed, resetting polling timer')
            pollingStartTimeRef.current = null
            setHasTimedOut(false)
          }
        }
        
        // Grace period: Continue polling for 15s after last update
        // This ensures UI catches database updates even if timing is slightly off
        const timeSinceLastUpdate = Date.now() - lastUpdateRef.current
        const shouldContinuePolling = timeSinceLastUpdate < 15000
        
        console.log('[useFeedPolling] 🔍 Grace period check:', {
          timeSinceLastUpdate,
          shouldContinuePolling,
          willPoll: shouldContinuePolling ? 'YES (3000ms)' : 'NO (0ms)'
        })
        
        // Reset polling start time when no longer generating
        if (!shouldContinuePolling && pollingStartTimeRef.current !== null) {
          pollingStartTimeRef.current = null
          setHasTimedOut(false)
          console.log('[useFeedPolling] ⏹️ Polling stopped (grace period ended)')
        }
        
        return shouldContinuePolling ? 3000 : 0
      },
      refreshWhenHidden: false, // Stop when tab hidden
      revalidateOnFocus: true, // Refresh when tab becomes visible
      onSuccess: (data) => {
        // Update last update time when data changes
        if (data?.posts) {
          const hasNewImages = data.posts.some((p: any) => p.image_url)
          const generatingPosts = data.posts.filter((p: any) => 
            (p.prediction_id && !p.image_url) || p.generation_status === 'generating'
          )
          const completedPosts = data.posts.filter((p: any) => p.image_url)
          
          console.log("[useFeedPolling] ✅ Data updated:", {
            totalPosts: data.posts.length,
            hasNewImages,
            generatingPostsCount: generatingPosts.length,
            completedPostsCount: completedPosts.length,
            generatingPostIds: generatingPosts.map((p: any) => ({
              id: p.id,
              position: p.position,
              hasPredictionId: !!p.prediction_id,
              hasImageUrl: !!p.image_url,
              generationStatus: p.generation_status
            })),
            completedPostIds: completedPosts.map((p: any) => ({ 
              id: p.id, 
              position: p.position,
              imageUrl: p.image_url?.substring(0, 50) + "..." 
            })),
          })
          
          if (hasNewImages) {
            lastUpdateRef.current = Date.now()
            console.log("[useFeedPolling] ✅ New images detected, updating lastUpdateRef")
          }
        }
      },
    }
  )

  // Force revalidation if we detect completed posts that might be stuck in cache
  useEffect(() => {
    if (feedData?.posts) {
      const postsWithPredictionButNoImage = feedData.posts.filter(
        (p: any) => p.prediction_id && !p.image_url && p.generation_status !== 'generating'
      )
      
      // If we have posts that should be completed but aren't showing image_url, force revalidation
      if (postsWithPredictionButNoImage.length > 0) {
        console.log('[useFeedPolling] 🔄 Detected posts that might be completed but missing image_url, forcing revalidation...')
        mutate() // Force SWR to revalidate
      }
    }
  }, [feedData?.posts, mutate])

  return {
    feedData,
    feedError,
    mutate,
    isLoading,
    isValidating,
    hasTimedOut, // FIX 4: Expose timeout state for UI
  }
}

