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
  // Track last known completed count to detect new completions
  const lastCompletedCountRef = useRef<number>(0)
  
  // Poll both feed data AND progress endpoint to update database
  const { data: feedData, error: feedError, mutate, isLoading, isValidating } = useSWR(
    feedId ? `/api/feed/${feedId}` : null,
    fetcher,
    {
      refreshInterval: (data) => {
        // Removed excessive logging that was causing performance issues
        
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
        
        // CRITICAL FIX: Simplified polling logic for free blueprint (single post)
        // For free users, there's only ONE post - stop polling immediately when it has image_url
        // This matches the working concept card pattern: stop when image is complete
        
        // Check if ANY post is generating (prediction_id but no image_url)
        // CRITICAL: Also check generation_status === 'generating' to catch posts marked as generating
        const hasGeneratingPosts = data?.posts?.some(
          (p: any) => {
            // Post is generating if:
            // 1. Has prediction_id but no image_url (classic case)
            // 2. OR generation_status is 'generating' (even if image_url exists, status might not be updated)
            const isGenerating = (p.prediction_id && !p.image_url) || p.generation_status === 'generating'
            return isGenerating
          }
        )
        
        // Check if feed is processing (Maya is setting up the feed)
        const isProcessing = data?.feed?.status === 'processing' || 
                            data?.feed?.status === 'queueing' ||
                            data?.feed?.status === 'generating'
        
        // Get detailed post status for debugging
        const generatingPosts = data?.posts?.filter((p: any) => 
          (p.prediction_id && !p.image_url) || p.generation_status === 'generating'
        ) || []
        
        // CRITICAL FIX: For free blueprint (single post), check if the post has image_url
        // If it does, STOP polling immediately (don't wait for grace period)
        // Note: We check for image_url only (not generation_status) because progress endpoint
        // might set image_url before updating generation_status, and we want to stop immediately
        const singlePost = data?.posts?.length === 1 ? data.posts[0] : null
        const singlePostHasImage = singlePost?.image_url // Simplified: just check if image_url exists
        
        // Reduced logging - only log when starting/stopping polling or on errors
        
        // CRITICAL FIX: For single post (free blueprint), stop immediately if image exists
        // This matches concept card behavior: stop polling when image is ready
        // We check image_url only (not generation_status) to handle edge cases where
        // progress endpoint sets image_url but hasn't updated status yet
        if (singlePostHasImage) {
          console.log('[useFeedPolling] ✅ Single post has image, stopping polling immediately')
          if (pollingStartTimeRef.current !== null) {
            pollingStartTimeRef.current = null
            setHasTimedOut(false)
          }
          return 0 // Stop polling immediately
        }
        
        // Continue polling if generating or processing
        if (hasGeneratingPosts || isProcessing) {
          // Record start time on first poll
          if (pollingStartTimeRef.current === null) {
            pollingStartTimeRef.current = Date.now()
            console.log('[useFeedPolling] ✅ Polling started, will timeout after 5 minutes')
          }
          
          // CRITICAL FIX: Always call progress endpoint when there are generating posts
          // This ensures database is updated even for single posts
          // Progress endpoint checks Replicate and updates image_url + generation_status
          if (feedId && hasGeneratingPosts) {
            // Silently call progress endpoint without logging on every poll
            fetch(`/api/feed/${feedId}/progress`)
              .then(res => {
                if (!res.ok) {
                  throw new Error(`Progress endpoint returned ${res.status}`)
                }
                return res.json()
              })
              .then(progressData => {
                // CRITICAL FIX: Only update UI when a new post is actually completed
                // This matches concept card behavior - only update on status change to "succeeded"
                // Don't refresh on every poll to prevent flashing
                const newCompletedCount = progressData.completed || 0
                const hasNewCompletions = newCompletedCount > lastCompletedCountRef.current
                
                if (hasNewCompletions) {
                  const newlyCompleted = newCompletedCount - lastCompletedCountRef.current
                  console.log(`[useFeedPolling] 🎉 ${newlyCompleted} post(s) completed! Updating UI...`)
                  lastCompletedCountRef.current = newCompletedCount
                  
                  // Only refresh when a post actually completes (like concept cards)
                  // Use revalidate: false to prevent unnecessary re-fetch, just update cache
                  // This prevents UI flashing while still showing new images
                  mutate(undefined, { revalidate: false })
                }
                // Silently poll without updating UI (prevents flashing and excessive re-renders)
              })
              .catch(err => {
                // Only log errors, not every poll attempt
                console.error('[useFeedPolling] ❌ Error calling progress endpoint:', err)
                // Don't fail polling if progress endpoint fails - just log and continue
              })
          } else if (feedId && singlePost && singlePost.prediction_id && !singlePost.image_url) {
            // CRITICAL FIX: For single posts, also call progress endpoint even if hasGeneratingPosts is false
            // This handles edge cases where the post has prediction_id but polling condition didn't catch it
            fetch(`/api/feed/${feedId}/progress`)
              .then(res => {
                if (!res.ok) {
                  throw new Error(`Progress endpoint returned ${res.status}`)
                }
                return res.json()
              })
              .then(progressData => {
                // Only update if post was just completed (matches concept card behavior)
                const newCompletedCount = progressData.completed || 0
                const hasNewCompletions = newCompletedCount > lastCompletedCountRef.current
                
                if (hasNewCompletions) {
                  console.log('[useFeedPolling] 🎉 Single post completed! Updating UI...')
                  lastCompletedCountRef.current = newCompletedCount
                  // Use revalidate: false to prevent unnecessary re-fetch, just update cache
                  mutate(undefined, { revalidate: false })
                }
                // Silently poll without logging
              })
              .catch(err => {
                console.error('[useFeedPolling] ❌ Error calling progress endpoint for single post:', err)
              })
          }
          
          lastUpdateRef.current = Date.now()
          return 3000 // Poll every 3s (faster for better UX)
        } else {
          // No generating posts - reset polling start time
          if (pollingStartTimeRef.current !== null) {
            console.log('[useFeedPolling] ✅ All posts completed, resetting polling timer')
            pollingStartTimeRef.current = null
            setHasTimedOut(false)
          }
        }
        
        // CRITICAL FIX: Removed grace period for free blueprint (single post)
        // Concept cards don't use grace period - they stop immediately when image is ready
        // Grace period was causing infinite polling for single posts
        
        // For single post feeds, we already checked above and returned 0 if image exists
        // For multi-post feeds, only continue if there are actually generating posts
        // No grace period needed - if posts are complete, stop immediately
        
        // Reset polling start time when no longer generating
        if (pollingStartTimeRef.current !== null) {
          pollingStartTimeRef.current = null
          setHasTimedOut(false)
        }
        
        return 0 // Stop polling
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
          
          // Initialize or update completed count ref to track progress
          // Only update if this is the first load or if count increased
          if (lastCompletedCountRef.current === 0 || completedPosts.length > lastCompletedCountRef.current) {
            lastCompletedCountRef.current = completedPosts.length
          }
          
          // Reduced logging - only log when there are actual changes
          if (hasNewImages) {
            lastUpdateRef.current = Date.now()
            console.log(`[useFeedPolling] ✅ ${completedPosts.length}/${data.posts.length} posts completed`)
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

