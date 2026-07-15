"use client"

import { useRef, useState, useEffect, useMemo } from "react"
import useSWR from "swr"
import type { FeedPost } from "@/components/feed-planner/feed-preview-types"
import type { FeedStrategy } from "@/lib/maya/feed-generation-handler"
import { countCompletedFeedPosts, isFeedPostGenerating } from "./feed-generation-state"

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
 * FIX 4: Added timeout to prevent infinite polling
 * UPDATED: Increased timeout to 10 minutes to account for longer Nano Banana Pro prompts
 * (Preview prompts: 500-700 words, Single scene: 200-270 words)
 */
const MAX_POLLING_DURATION = 10 * 60 * 1000 // 10 minutes in milliseconds (increased from 5 minutes)

export function useFeedPolling(feedId: number | null) {
  // Track last update time to continue polling for a grace period after updates
  const lastUpdateRef = useRef<number>(Date.now())
  // FIX 4: Track when polling started for timeout detection
  const pollingStartTimeRef = useRef<number | null>(null)
  const [hasTimedOut, setHasTimedOut] = useState(false)
  // Track last known completed count to detect new completions
  const lastCompletedCountRef = useRef<number>(0)
  const recoveryTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())
  // Track if polling has taken longer than 3 minutes
  const [isTakingLonger, setIsTakingLonger] = useState(false)

  useEffect(() => {
    const recoveryTimeouts = recoveryTimeoutsRef.current
    return () => {
      recoveryTimeouts.forEach((timeoutId) => clearTimeout(timeoutId))
      recoveryTimeouts.clear()
    }
  }, [])
  
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
          const elapsedMinutes = Math.floor(elapsedTime / 60000)
          const elapsedSeconds = Math.floor((elapsedTime % 60000) / 1000)
          
          // Show "taking longer" message after 3 minutes
          if (elapsedTime > 3 * 60 * 1000 && !isTakingLonger) {
            console.log(`[useFeedPolling] ℹ️ Generation taking longer than 3 minutes, showing friendly message`)
            console.log(`[useFeedPolling] Elapsed time: ${elapsedMinutes}m ${elapsedSeconds}s`)
            setIsTakingLonger(true)
          }
          
          // Debug: Log every 30 seconds while polling
          if (elapsedTime % 30000 < 3000) { // Log roughly every 30 seconds
            console.log(`[useFeedPolling] ⏱️ Still polling... ${elapsedMinutes}m ${elapsedSeconds}s elapsed, isTakingLonger: ${isTakingLonger}`)
          }
          
          if (elapsedTime > MAX_POLLING_DURATION) {
            console.warn(`[useFeedPolling] ⏱️ Polling timeout reached (10 minutes). Elapsed: ${elapsedMinutes}m ${elapsedSeconds}s`)
            console.log(`[useFeedPolling] 🔍 Checking for stuck posts and attempting final recovery...`)
            
            // Check Replicate status one more time before marking as failed
            const stuckPosts = data?.posts?.filter((p: any) => p.prediction_id && !p.image_url) || []
            if (stuckPosts.length > 0) {
              console.warn(`[useFeedPolling] ⚠️ ${stuckPosts.length} post(s) still generating after timeout:`, stuckPosts.map((p: any) => ({
                id: p.id,
                position: p.position,
                predictionId: p.prediction_id?.substring(0, 20),
                status: p.generation_status
              })))
              
              // Call progress endpoint one final time to check status
              if (feedId) {
                const stuckPostIds = stuckPosts.map((p: any) => p.id)
                fetch(`/api/feed/${feedId}/progress`)
                  .then(res => res.json())
                  .then(progressData => {
                    console.log(`[useFeedPolling] Final progress check:`, progressData)
                    mutate() // Refresh to get any updates
                    
                    // Only mark as failed if still no image after final check
                    // Wait a bit for mutate to complete, then check again
                    const recoveryTimeout = setTimeout(() => {
                      recoveryTimeoutsRef.current.delete(recoveryTimeout)
                      // Re-check feed data after progress endpoint update
                      mutate().then(() => {
                        // Check if posts are still stuck by re-fetching feed data
                        fetch(`/api/feed/${feedId}`)
                          .then(res => res.json())
                          .then(updatedData => {
                            const stillStuck = updatedData?.posts?.filter((p: any) => 
                              stuckPostIds.includes(p.id) && p.prediction_id && !p.image_url
                            ) || []
                            
                            if (stillStuck.length > 0) {
                              console.log(`[useFeedPolling] ⏱️ ${stillStuck.length} post(s) still stuck after final check, marking as failed`)
                              console.log(`[useFeedPolling] ℹ️ User will be able to retry these posts manually`)
                              setHasTimedOut(true)
                              
                              stillStuck.forEach((post: any) => {
                                fetch(`/api/feed/post/${post.id}/mark-failed`, { method: 'POST' })
                                  .then(res => res.json())
                                  .then(result => {
                                    if (result.success) {
                                      console.log(`[useFeedPolling] ✅ Post ${post.position} marked as failed, user can retry`)
                                      mutate()
                                    }
                                  })
                                  .catch(err => {
                                    console.warn(`[useFeedPolling] ⚠️ Could not mark post ${post.position} as failed:`, err)
                                  })
                              })
                            } else {
                              console.log(`[useFeedPolling] ✅ All posts completed after final check`)
                            }
                          })
                          .catch(err => {
                            console.error('[useFeedPolling] ❌ Error re-checking feed data:', err)
                          })
                      })
                    }, 3000) // Wait 3 seconds for progress endpoint to update database
                    recoveryTimeoutsRef.current.add(recoveryTimeout)
                  })
                  .catch(err => {
                    console.error('[useFeedPolling] ❌ Error in final progress check:', err)
                    // Mark as failed if progress check fails
                    setHasTimedOut(true)
                    stuckPosts.forEach((post: any) => {
                      fetch(`/api/feed/post/${post.id}/mark-failed`, { method: 'POST' })
                        .catch(err => console.error(`[useFeedPolling] ❌ Failed to mark post ${post.id} as failed:`, err))
                    })
                  })
              } else {
                // No feedId - mark as failed immediately
                setHasTimedOut(true)
                stuckPosts.forEach((post: any) => {
                  fetch(`/api/feed/post/${post.id}/mark-failed`, { method: 'POST' })
                    .catch(err => console.error(`[useFeedPolling] ❌ Failed to mark post ${post.id} as failed:`, err))
                })
              }
            }
            
            // Reset polling start time
            pollingStartTimeRef.current = null
            return 0 // Stop polling
          } else if (elapsedMinutes >= 8) {
            // Warn when approaching timeout (8+ minutes)
            console.warn(`[useFeedPolling] ⚠️ Polling approaching timeout: ${elapsedMinutes}m ${elapsedSeconds}s elapsed (10 min max)`)
          }
        }
        
        // CRITICAL FIX: Simplified polling logic for free blueprint (single post)
        // For free users, there's only ONE post - stop polling immediately when it has image_url
        // This matches the working concept card pattern: stop when image is complete
        
        // Check if ANY post is generating (prediction_id but no image_url)
        // CRITICAL: Also check generation_status === 'generating' to catch posts marked as generating
        const hasGeneratingPosts = data?.posts?.some(isFeedPostGenerating)
        
        // Check if feed is processing (Maya is setting up the feed)
        const isProcessing = data?.feed?.status === 'processing' || 
                            data?.feed?.status === 'queueing' ||
                            data?.feed?.status === 'generating'
        
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
        
        const isPreviewFeed = data?.feed?.layout_type === 'preview'

        // Continue polling if generating or processing
        if (hasGeneratingPosts || isProcessing) {
          // Record start time on first poll
          if (pollingStartTimeRef.current === null) {
            pollingStartTimeRef.current = Date.now()
            console.log('[useFeedPolling] ✅ Polling started, will timeout after 10 minutes (longer prompts may take more time)')
          }
          
          // CRITICAL FIX: Always call progress endpoint when there are generating posts
          // This ensures database is updated even for single posts
          // Progress endpoint checks Replicate and updates image_url + generation_status
          if (feedId && hasGeneratingPosts && !isPreviewFeed) {
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
                  
                  // CRITICAL FIX: Revalidate to fetch updated post data with image_url
                  // This ensures placeholders see the newly generated images
                  // Only revalidate when posts actually complete (prevents excessive polling)
                  mutate()
                }
                // Silently poll without updating UI (prevents flashing and excessive re-renders)
              })
              .catch(err => {
                // Only log errors, not every poll attempt
                console.error('[useFeedPolling] ❌ Error calling progress endpoint:', err)
                // Don't fail polling if progress endpoint fails - just log and continue
              })
          } else if (feedId && !isPreviewFeed && singlePost && singlePost.prediction_id && !singlePost.image_url) {
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
                  // CRITICAL FIX: Revalidate to fetch updated post data with image_url
                  // This ensures placeholders see the newly generated images
                  mutate()
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
          const completedCount = countCompletedFeedPosts(data.posts)
          
          // Initialize or update completed count ref to track progress
          // Only update if this is the first load or if count increased
          if (lastCompletedCountRef.current === 0 || completedCount > lastCompletedCountRef.current) {
            lastCompletedCountRef.current = completedCount
          }
          
          // Reduced logging - only log when there are actual changes
          if (hasNewImages) {
            lastUpdateRef.current = Date.now()
            console.log(`[useFeedPolling] ✅ ${completedCount}/${data.posts.length} posts completed`)
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
    isTakingLonger,
  }
}

const previewFetcher = (url: string) => fetch(url).then((res) => res.json())

const isStrategyDocument = (text: string | null | undefined): boolean => {
  if (!text) return false
  return /^#{1,3}\s/m.test(text) && text.length > 500
}

const getSafeDescription = (desc: string | null | undefined): string => {
  if (!desc) return ""
  return isStrategyDocument(desc) ? "" : desc
}

const getExistingStrategyImageUrl = (post: any): string | null => {
  const imageUrl = typeof post?.image_url === "string"
    ? post.image_url.trim()
    : typeof post?.imageUrl === "string"
      ? post.imageUrl.trim()
      : ""
  if (!imageUrl) return null

  const source = String(post?.source || post?.assetSource || "").toLowerCase()
  const postType = String(post?.postType || post?.type || "").toLowerCase()
  return source === "existing_gallery_image" || postType === "existing" ? imageUrl : null
}

interface UseFeedPollingParams {
  feedIdProp?: number
  feedTitle?: string
  feedDescription?: string
  posts: FeedPost[]
  needsRestore: boolean
  strategy?: FeedStrategy
  isSavedProp: boolean
}

export function useFeedPreviewPolling({
  feedIdProp,
  feedTitle,
  feedDescription,
  posts,
  needsRestore,
  strategy,
  isSavedProp,
}: UseFeedPollingParams) {
  const [savedFeedId, setSavedFeedId] = useState<number | null>(feedIdProp || null)
  const [postsData, setPostsData] = useState<FeedPost[]>(posts)
  const [displayTitle, setDisplayTitle] = useState<string>(feedTitle || "Instagram Feed")
  const [displayDescription, setDisplayDescription] = useState<string>(getSafeDescription(feedDescription))
  const [feedStatus, setFeedStatus] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(
    posts.some(isFeedPostGenerating),
  )

  const hasFetchedRef = useRef<string | false>(false)
  const preserveStrategyPostsRef = useRef(false)

  const feedId = savedFeedId || feedIdProp || null
  const isSaved = (isSavedProp || !!savedFeedId) && !!feedId

  const { mutate } = useSWR(feedId ? `/api/feed/${feedId}` : null, previewFetcher, {
    refreshInterval: (data) => {
      const hasGeneratingPosts = data?.posts?.some(isFeedPostGenerating)
      if (!hasGeneratingPosts || !feedId) return 0
      fetch(`/api/feed/${feedId}/progress`).finally(() => mutate())
      return 3000
    },
    revalidateOnFocus: true,
    refreshWhenHidden: false,
    onSuccess: (data) => {
      if (!feedId || !Array.isArray(data?.posts)) return
      setPostsData(data.posts)
      preserveStrategyPostsRef.current = false
      setIsGenerating(
        data.posts.some(isFeedPostGenerating),
      )
      if (data.feed?.brand_name) {
        setDisplayTitle((prev) => (prev === data.feed.brand_name ? prev : data.feed.brand_name))
      }
      if (data.feed?.description !== undefined) {
        const safeDesc = getSafeDescription(data.feed.description)
        setDisplayDescription((prev) => (prev === safeDesc ? prev : safeDesc))
      }
      setFeedStatus(data.feed?.status || data.status || null)
    },
  })

  useEffect(() => {
    if (feedId) hasFetchedRef.current = false
  }, [feedId])

  useEffect(() => {
    if (feedIdProp) setSavedFeedId(feedIdProp)
  }, [feedIdProp])

  useEffect(() => {
    setDisplayTitle(feedTitle || "Instagram Feed")
    setDisplayDescription(getSafeDescription(feedDescription))
    if (!feedId || !needsRestore || hasFetchedRef.current === false) {
      setPostsData(posts)
    }
  }, [feedTitle, feedDescription, posts, feedId, needsRestore])

  useEffect(() => {
    if (!feedId) return
    const fetchKey = `${feedId}-${needsRestore}`
    const shouldFetch =
      (needsRestore && hasFetchedRef.current !== fetchKey) ||
      (hasFetchedRef.current === false && (!posts || posts.length === 0))
    if (!shouldFetch) return

    hasFetchedRef.current = fetchKey
    fetch(`/api/feed/${feedId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch feed: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        const restoredPosts = Array.isArray(data.posts)
          ? data.posts
          : Array.isArray(data.feed?.posts)
            ? data.feed.posts
            : null
        if (restoredPosts) {
          setPostsData(restoredPosts)
          preserveStrategyPostsRef.current = false
        }

        const restoredTitle =
          data.title || data.brand_name || data.feed?.title || data.feed?.brand_name || data.feed?.gridPattern
        if (restoredTitle) setDisplayTitle(restoredTitle)

        const restoredDescription =
          data.description || data.feed?.description || data.feed?.gridPattern || data.feed?.overall_vibe
        setDisplayDescription(getSafeDescription(restoredDescription))

        setFeedStatus(data.feed?.status || data.status || null)
      })
      .catch(() => {
        hasFetchedRef.current = false
      })
  }, [feedId, needsRestore, posts])

  const effectivePosts = useMemo(() => {
    const useStrategyPosts = strategy?.posts && (!feedId || postsData.length === 0 || preserveStrategyPostsRef.current)
    if (!useStrategyPosts || !strategy?.posts?.length) return postsData

    return strategy.posts.map((p: any, index: number) => {
      const existingImageUrl = getExistingStrategyImageUrl(p)

      return {
        id: index + 1,
        position: p.position || index + 1,
        image_url: existingImageUrl,
        generation_status: existingImageUrl ? "completed" : "pending",
        prompt: p.prompt || p.imagePrompt || p.visualDirection || "",
        caption: p.caption || "",
        post_type: existingImageUrl ? "existing" : p.postType || p.type || "user",
        content_pillar: p.purpose || "",
        prediction_id: undefined,
      }
    }) as FeedPost[]
  }, [feedId, postsData, strategy])

  const sortedPosts = useMemo(() => [...effectivePosts].sort((a, b) => a.position - b.position), [effectivePosts])

  const readyCount = countCompletedFeedPosts(effectivePosts)
  const pendingCount = effectivePosts.filter(
    (p) => !p.image_url && p.generation_status !== "generating" && p.generation_status !== "failed",
  ).length
  const failedCount = effectivePosts.filter((p) => p.generation_status === "failed").length
  const generatingCount = effectivePosts.filter(isFeedPostGenerating).length

  const hasPendingPosts = pendingCount > 0
  const hasFailedPosts = failedCount > 0
  const isAnyGenerating = generatingCount > 0 || isGenerating

  return {
    feedId,
    isSaved,
    savedFeedId,
    setSavedFeedId,
    postsData,
    setPostsData,
    displayTitle,
    setDisplayTitle,
    displayDescription,
    setDisplayDescription,
    feedStatus,
    setFeedStatus,
    isGenerating,
    setIsGenerating,
    mutateFeed: mutate,
    markJustSaved: () => {
      preserveStrategyPostsRef.current = true
    },
    sortedPosts,
    readyCount,
    pendingCount,
    failedCount,
    generatingCount,
    hasPendingPosts,
    hasFailedPosts,
    isAnyGenerating,
  }
}
