"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { ImageIcon, Loader2, X, Wand2, Eye } from 'lucide-react'
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { createPortal } from "react-dom"
import useSWR from "swr"
import FeedPostCard from "./feed-post-card"
import { createFeedFromStrategyHandler, type FeedStrategy, type CreateFeedOptions } from "@/lib/maya/feed-generation-handler"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Using shared types from lib/feed/types.ts
// Note: FeedPost interface is compatible, keeping local type for now due to optional fields
interface FeedPost {
  id: number
  position: number
  image_url: string | null
  generation_status: string
  prediction_id?: string | null
  prompt?: string
  content_pillar?: string
  post_type?: string
  caption?: string
}

interface FeedPreviewCardProps {
  feedId?: number // Optional - if not provided, card is in "unsaved" state
  feedTitle?: string
  feedDescription?: string
  posts: FeedPost[]
  onViewFullFeed?: () => void
  needsRestore?: boolean // If true, fetch feed data on mount
  // NEW: Props for unsaved state
  strategy?: FeedStrategy // Strategy data for unsaved feeds
  isSaved?: boolean // Flag to indicate if feed is saved
  onSave?: (feedId: number) => void // Callback when feed is saved
  // Options for saving (passed from parent)
  proMode?: boolean // 🔴 FIX: Changed from studioProMode to proMode
  styleStrength?: number
  promptAccuracy?: number
  aspectRatio?: string
  realismStrength?: number
  // NEW: Prompt editing (similar to concept cards)
  messageId?: string // Message ID for updating prompts in chat
  onPromptUpdate?: (messageId: string, postId: number, newPrompt: string) => void // Callback when prompt is edited
}

export default function FeedPreviewCard({
  feedId: feedIdProp,
  feedTitle,
  feedDescription,
  posts,
  onViewFullFeed,
  needsRestore = false,
  // NEW: Props for unsaved state
  strategy,
  isSaved: isSavedProp = true, // Default to true for backward compatibility
  onSave,
  proMode = false, // 🔴 FIX: Changed from studioProMode to proMode
  styleStrength = 0.8,
  promptAccuracy = 0.8,
  aspectRatio = "1:1",
  realismStrength = 0.8,
  // NEW: Prompt editing
  messageId,
  onPromptUpdate,
}: FeedPreviewCardProps) {
  const router = useRouter()
  
  // Determine if feed is saved (has feedId)
  // CRITICAL FIX: Use the computed feedId (which includes savedFeedId), not just feedIdProp
  // This ensures isSaved updates correctly after saving a feed
  const [savedFeedId, setSavedFeedId] = useState<number | null>(feedIdProp || null)
  const [isSaving, setIsSaving] = useState(false)
  // Track if we just saved to preserve strategy posts until data is fetched
  const justSavedRef = useRef(false)
  
  // Use savedFeedId if available, otherwise use feedIdProp
  const feedId = savedFeedId || feedIdProp || null
  
  // Compute isSaved using the resolved feedId (not just the prop)
  const isSaved = (isSavedProp || !!savedFeedId) && !!feedId
  
  const [postsData, setPostsData] = useState<FeedPost[]>(posts)
  // State for title and description that can be updated from fetched data
  const [displayTitle, setDisplayTitle] = useState<string>(feedTitle || "Instagram Feed")
  
  // Helper function to detect if description is a full strategy document
  // Strategy documents should only appear in feed planner, not in chat feed cards
  const isStrategyDocument = (text: string | null | undefined): boolean => {
    if (!text) return false
    // Strategy documents have markdown headers (# ## ###) and are longer
    const hasHeaders = /^#{1,3}\s/m.test(text)
    const isLongEnough = text.length > 500
    return hasHeaders && isLongEnough
  }
  
  // Filter out strategy documents from description before setting state
  const getSafeDescription = (desc: string | null | undefined): string => {
    if (!desc) return ""
    return isStrategyDocument(desc) ? "" : desc
  }
  
  const [displayDescription, setDisplayDescription] = useState<string>(getSafeDescription(feedDescription))
  // Track feed status to determine if it's saved to planner
  const [feedStatus, setFeedStatus] = useState<string | null>(null) // 'chat', 'saved', 'pending', etc.
  const [isGenerating, setIsGenerating] = useState(() => {
    // Initialize generating state based on posts - if any have prediction_id or generating status
    return posts.some(p => p.generation_status === "generating" || (p.prediction_id && !p.image_url))
  })
  // REMOVED: generatingPostId state - Individual post generation is disabled
  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showPromptModal, setShowPromptModal] = useState(false)
  const [selectedPostForPrompt, setSelectedPostForPrompt] = useState<FeedPost | null>(null)
  // NEW: Prompt editing state (similar to ConceptCardPro)
  const [editingPostId, setEditingPostId] = useState<number | null>(null)
  const [editedPrompts, setEditedPrompts] = useState<Record<number, string>>({})
  
  // Track if we've attempted to fetch to avoid stale closure issues
  // Store fetchKey string to track fetches per feedId/needsRestore combination
  const hasFetchedRef = useRef<string | false>(false)
  
  // CRITICAL FIX: Use SWR for polling instead of setInterval (single source of truth)
  // This matches the pattern used in useFeedPolling hook
  // SWR automatically handles deduplication and caching
  // Note: We still use the manual fetch for needsRestore, but SWR handles polling
  const { data: swrFeedData, mutate: mutateFeed } = useSWR(
    feedId ? `/api/feed/${feedId}` : null,
    fetcher,
    {
      refreshInterval: (data) => {
        // Only poll if there are generating posts
        const hasGeneratingPosts = data?.posts?.some(
          (p: any) => (p.prediction_id && !p.image_url) || p.generation_status === 'generating'
        )
        
        if (hasGeneratingPosts) {
          // Also call progress endpoint to update database (same as useFeedPolling)
          if (feedId) {
            fetch(`/api/feed/${feedId}/progress`)
              .then(res => res.json())
              .then(() => mutateFeed()) // Refresh after progress update
              .catch(() => mutateFeed()) // Still refresh even if progress fails
          }
          return 3000 // Poll every 3 seconds
        }
        
        return 0 // Stop polling when no generating posts
      },
      refreshWhenHidden: false,
      revalidateOnFocus: true,
      onSuccess: (data) => {
        // Update local state when SWR data changes (only if feedId exists)
        // This ensures feed cards in chat stay up-to-date
        if (feedId && data?.posts && Array.isArray(data.posts)) {
          setPostsData(data.posts)
          
          // Update generating state
          const isAnyGenerating = data.posts.some(
            (p: any) => (p.prediction_id && !p.image_url) || p.generation_status === 'generating'
          )
          setIsGenerating(isAnyGenerating)
          
          // Update title/description if changed (use functional updates to avoid stale closures)
          if (data.feed?.brand_name) {
            setDisplayTitle(prev => data.feed.brand_name !== prev ? data.feed.brand_name : prev)
          }
          if (data.feed?.description) {
            const safeDesc = getSafeDescription(data.feed.description)
            setDisplayDescription(prev => safeDesc !== prev ? safeDesc : prev)
          }
        }
      },
    }
  )
  
  // CRITICAL FIX: Also sync SWR data when it changes (for cases where SWR updates but onSuccess doesn't fire)
  useEffect(() => {
    if (feedId && swrFeedData?.posts && Array.isArray(swrFeedData.posts)) {
      // Only update if data is different (prevent unnecessary re-renders)
      const currentPostsStr = JSON.stringify(postsData.map(p => ({ id: p.id, image_url: p.image_url, status: p.generation_status })))
      const swrPostsStr = JSON.stringify(swrFeedData.posts.map((p: any) => ({ id: p.id, image_url: p.image_url, status: p.generation_status })))
      
      if (currentPostsStr !== swrPostsStr) {
        console.log("[FeedPreviewCard] 🔄 Syncing posts from SWR data")
        setPostsData(swrFeedData.posts)
        
        // Update generating state
        const isAnyGenerating = swrFeedData.posts.some(
          (p: any) => (p.prediction_id && !p.image_url) || p.generation_status === 'generating'
        )
        setIsGenerating(isAnyGenerating)
      }
    }
  }, [feedId, swrFeedData?.posts, postsData])
  
  // Reset fetch flag when feedId changes (new feed card)
  // Only fetch if feed is saved (has feedId)
  useEffect(() => {
    if (feedId) {
      hasFetchedRef.current = false
      console.log("[FeedPreviewCard] 🔄 Feed ID changed, reset fetch flag:", feedId)
    }
  }, [feedId])
  
  // Update savedFeedId when feedIdProp changes (from parent)
  useEffect(() => {
    if (feedIdProp) {
      setSavedFeedId(feedIdProp)
    }
  }, [feedIdProp])
  
  // Update state from props when they change (separate effect to avoid resetting fetch flag)
  // CRITICAL FIX: Don't override postsData if feedId exists and needsRestore is true
  // This prevents stale props from overriding fresh data fetched from database
  useEffect(() => {
    setDisplayTitle(feedTitle || "Instagram Feed")
    // CRITICAL: Filter out strategy documents from description
    setDisplayDescription(getSafeDescription(feedDescription))
    // Only set posts from props if feed is unsaved (no feedId) or if we haven't fetched yet
    // For saved feeds, let the fetch effect handle posts data to ensure images are included
    if (!feedId || !needsRestore || hasFetchedRef.current === false) {
      setPostsData(posts)
    }
  }, [feedTitle, feedDescription, posts, feedId, needsRestore])
  
  // CRITICAL: Always fetch feed data when needsRestore is true OR when posts is empty/missing
  // This ensures feed cards restore correctly on page reload
  useEffect(() => {
    // Always fetch if:
    // 1. needsRestore is true (page refresh scenario) AND we haven't fetched for this restore yet
    // 2. OR posts prop is empty/missing AND we haven't fetched yet
    if (!feedId) {
      return // No feedId, can't fetch
    }
    
    // Use a combination of feedId and needsRestore to track if we've fetched for this specific restore
    // This prevents infinite loops while still allowing fresh fetches when needsRestore changes
    const fetchKey = `${feedId}-${needsRestore}`
    const hasFetchedForThisRestore = hasFetchedRef.current === fetchKey
    
    // Only fetch if feed is saved (has feedId)
    if (!feedId) {
      return // No feedId = unsaved feed, don't fetch
    }
    
    // Determine if we should fetch:
    // 1. If needsRestore is true and we haven't fetched for this restore combination yet
    // 2. OR if we haven't fetched at all AND posts are empty/missing
    // CRITICAL FIX: Always fetch if needsRestore is true (even if posts are provided)
    // This ensures we get fresh data with images from database, not stale cached props
    const shouldFetch = (needsRestore && !hasFetchedForThisRestore) || 
                       (hasFetchedRef.current === false && (!posts || posts.length === 0))
    
    // CRITICAL: If needsRestore is true, we MUST fetch to get fresh images from database
    // Don't rely on props - they might be stale cached data without images
    if (needsRestore && !hasFetchedForThisRestore) {
      console.log("[FeedPreviewCard] 🔄 needsRestore=true - will fetch fresh data with images from database")
    }
    
    if (shouldFetch) {
      // Set flag BEFORE fetch to prevent duplicate fetches on same render cycle
      hasFetchedRef.current = fetchKey
      
      console.log("[FeedPreviewCard] 🔄 Fetching feed data:", { 
        feedId, 
        needsRestore, 
        postsCount: posts?.length || 0,
        fetchKey,
        reason: needsRestore ? "needsRestore=true (restore fetch)" : "posts empty/missing"
      })
      
      fetch(`/api/feed/${feedId}`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`Failed to fetch feed: ${res.status} ${res.statusText}`)
          }
          return res.json()
        })
        .then(feedData => {
          console.log("[FeedPreviewCard] ✅ Feed data fetched:", { 
            hasPosts: !!(feedData.posts || feedData.feed?.posts),
            hasFeed: !!feedData.feed,
            hasTitle: !!(feedData.title || feedData.feed?.title || feedData.brand_name || feedData.feed?.brand_name),
            postsArrayLength: feedData.posts?.length || 0,
            feedPostsLength: feedData.feed?.posts?.length || 0,
          })
          
          // Update posts data - check both response formats
          let postsToSet: FeedPost[] | null = null
          
          // CRITICAL FIX: Removed .length > 0 checks to allow empty arrays (Bug 1)
          if (feedData.posts && Array.isArray(feedData.posts)) {
            postsToSet = feedData.posts
            console.log("[FeedPreviewCard] ✅ Using posts from root level:", postsToSet.length)
          } else if (feedData.feed?.posts && Array.isArray(feedData.feed.posts)) {
            // Fallback for legacy format
            postsToSet = feedData.feed.posts
            console.log("[FeedPreviewCard] ✅ Using posts from feed.posts (legacy format):", postsToSet.length)
          }
          
          // CRITICAL FIX: Allow empty arrays to be set (feeds with no posts are valid)
          // Empty arrays are now properly handled since we removed .length > 0 checks above
          if (postsToSet) {
            // Log image URL status for debugging
            const postsWithImages = postsToSet.filter(p => p.image_url)
            const postsWithoutImages = postsToSet.filter(p => !p.image_url)
            console.log("[FeedPreviewCard] 📸 Posts image status:", {
              total: postsToSet.length,
              withImages: postsWithImages.length,
              withoutImages: postsWithoutImages.length,
              imageUrls: postsWithImages.slice(0, 3).map(p => ({ position: p.position, url: p.image_url?.substring(0, 50) + '...' })),
            })
            
            setPostsData(postsToSet)
            // Clear justSavedRef now that we have real data
            justSavedRef.current = false
          } else {
            console.warn("[FeedPreviewCard] ⚠️ No posts found in feed data - structure:", {
              hasPosts: !!feedData.posts,
              postsIsArray: Array.isArray(feedData.posts),
              postsLength: feedData.posts?.length,
              hasFeedPosts: !!feedData.feed?.posts,
              feedPostsIsArray: Array.isArray(feedData.feed?.posts),
              feedPostsLength: feedData.feed?.posts?.length,
            })
          }
          
          // Update feed status from fetched data
          if (feedData.feed?.status || feedData.status) {
            setFeedStatus(feedData.feed?.status || feedData.status)
          }
          
          // Update title from fetched data (priority: title > brand_name > feed.title > feed.brand_name > existing)
          const fetchedTitle = feedData.title || 
                              feedData.brand_name || 
                              feedData.feed?.title || 
                              feedData.feed?.brand_name ||
                              feedData.feed?.gridPattern ||
                              null
          if (fetchedTitle && fetchedTitle !== displayTitle) {
            console.log("[FeedPreviewCard] ✅ Updated title from fetched data:", fetchedTitle)
            setDisplayTitle(fetchedTitle)
          }
          
          // Update description from fetched data (priority: description > feed.description > feed.gridPattern > existing)
          // CRITICAL: Filter out strategy documents - they should only appear in feed planner, not in chat feed cards
          const fetchedDescription = feedData.description || 
                                    feedData.feed?.description || 
                                    feedData.feed?.gridPattern ||
                                    feedData.feed?.overall_vibe ||
                                    null
          const safeDescription = getSafeDescription(fetchedDescription)
          if (safeDescription && safeDescription !== displayDescription) {
            console.log("[FeedPreviewCard] ✅ Updated description from fetched data:", safeDescription.substring(0, 50))
            setDisplayDescription(safeDescription)
          } else if (!safeDescription && displayDescription) {
            // Clear description if it was a strategy document
            setDisplayDescription("")
          }
          
          // Flag is already set before fetch to prevent duplicate fetches
          // No need to set it again here
        })
        .catch(err => {
          console.error("[FeedPreviewCard] ❌ Failed to restore feed data:", err)
          // Reset to false on error so it can retry (will create new fetchKey on next attempt)
          hasFetchedRef.current = false
        })
    }
  }, [needsRestore, feedId, posts?.length]) // Fetch when needsRestore changes, feedId changes, or posts length changes

  // REMOVED: Old polling effect (replaced by new polling effect below at line 353-423)
  // This was causing duplicate polling and incorrect state management

  // For unsaved feeds OR just-saved feeds (before data arrives), use strategy posts if available
  // CRITICAL FIX: Use strategy posts if we have strategy AND (no feedId OR postsData is empty)
  // This ensures unsaved feeds always show strategy posts, even if postsData has stale data
  const shouldUseStrategyPosts = strategy?.posts && (!feedId || postsData.length === 0 || justSavedRef.current)
  
  const effectivePosts = shouldUseStrategyPosts && strategy.posts.length > 0
    ? strategy.posts.map((p: any, index: number) => ({
        id: index + 1, // Temporary ID for display
        position: p.position || index + 1,
        image_url: null,
        generation_status: 'pending',
        // CRITICAL FIX: Maya's posts use visualDirection, not prompt
        // Also check for prompt/imagePrompt for backward compatibility
        prompt: p.prompt || p.imagePrompt || p.visualDirection || '',
        caption: p.caption || '',
        post_type: p.postType || p.type || 'user',
        content_pillar: p.purpose || '',
        prediction_id: undefined, // Strategy posts don't have prediction_id
      }))
    : postsData

  const sortedPosts = [...effectivePosts].sort((a, b) => a.position - b.position)
  const readyCount = effectivePosts.filter(p => p.image_url).length
  const totalPosts = effectivePosts.length
  const pendingCount = effectivePosts.filter(p => !p.image_url && p.generation_status !== "generating" && p.generation_status !== "failed").length
  const failedCount = effectivePosts.filter(p => p.generation_status === "failed").length
  const generatingCount = effectivePosts.filter(p => {
    const post = p as FeedPost
    return p.generation_status === "generating" || (post.prediction_id && !p.image_url)
  }).length
  const hasPendingPosts = pendingCount > 0
  const hasFailedPosts = failedCount > 0
  const hasImages = effectivePosts.some(p => p.image_url)
  const isAnyGenerating = generatingCount > 0 || isGenerating

  // CRITICAL FIX: Removed setInterval polling - now using SWR (single source of truth)
  // SWR handles polling automatically via refreshInterval (see SWR hook above)
  // This ensures no duplicate polling when feed card is shown in chat AND feed planner is open
  // SWR automatically deduplicates requests and manages cache

  const handleViewFullFeed = () => {
    // Guard against null feedId (race condition during save)
    if (!feedId) {
      console.warn("[FeedPreviewCard] Cannot view feed: feedId is null")
      return
    }
    
    if (onViewFullFeed) {
      onViewFullFeed()
    } else {
      // Route to feed planner with feedId query param
      router.push(`/feed-planner?feedId=${feedId}`)
    }
  }

  // Handle saving feed to Feed Planner (explicit action)
  const handleSaveToPlanner = async () => {
    if (!feedId) {
      console.error("[FeedPreviewCard] ❌ Cannot save to planner: no feedId")
      toast({
        title: "Error",
        description: "Feed must be saved first before adding to planner",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    
    try {
      console.log("[FeedPreviewCard] 💾 Saving feed to planner...", { feedId })

      const response = await fetch(`/api/feed-planner/save-to-planner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ feedId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save feed to planner')
      }

      const data = await response.json()
      
      console.log("[FeedPreviewCard] ✅ Feed saved to planner successfully")
      setFeedStatus('saved') // Update local status

      toast({
        title: "Saved to Planner",
        description: "Your feed has been added to Feed Planner. You can access it anytime from the Feed Planner screen.",
      })
    } catch (error) {
      console.error("[FeedPreviewCard] ❌ Error saving feed to planner:", error)
      toast({
        title: "Failed to save",
        description: error instanceof Error ? error.message : "An error occurred while saving to planner",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Handle saving an unsaved feed strategy (legacy - for explicit save action)
  const handleSaveFeed = async () => {
    if (!strategy) {
      console.error("[FeedPreviewCard] ❌ Cannot save feed: no strategy provided")
      toast({
        title: "Error",
        description: "No feed strategy to save",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    
    try {
      console.log("[FeedPreviewCard] 💾 Saving feed strategy...", {
        hasStrategy: !!strategy,
        proMode,
        styleStrength,
        promptAccuracy,
        aspectRatio,
        realismStrength,
      })

      const options: CreateFeedOptions = {
        // 🔴 FIX: Pass userModePreference based on proMode toggle
        userModePreference: proMode ? 'pro' : 'classic',
        customSettings: {
          styleStrength,
          promptAccuracy,
          aspectRatio,
          realismStrength,
        },
      }

      // CRITICAL: Pass saveToPlanner: true for explicit "Save Feed" action
      // This distinguishes from "Generate Feed" which saves with saveToPlanner: false
      const result = await createFeedFromStrategyHandler(strategy, {
        ...options,
        saveToPlanner: true, // Explicit save action → save to planner
      })
      
      if (!result || !result.success || !result.feedId) {
        throw new Error("Failed to save feed: no feed ID returned")
      }

      const newFeedId = Number(result.feedId)
      
      console.log("[FeedPreviewCard] ✅ Feed saved to planner successfully:", newFeedId)

      // Mark that we just saved to preserve strategy posts until data is fetched
      justSavedRef.current = true
      
      // Update local state
      setSavedFeedId(newFeedId)
      setFeedStatus('saved') // Mark as saved to planner

      // Call onSave callback to update parent component (e.g., update message part)
      if (onSave) {
        onSave(newFeedId)
      }

      toast({
        title: "Feed saved",
        description: "Your feed has been saved to Feed Planner.",
      })
      
      // CRITICAL FIX (Bug 2): Do NOT redirect when in chat context
      // Users expect to remain in chat after saving to continue the workflow
      // Only redirect if explicitly requested via onSave callback or if not in chat
      // The onSave callback will update the message state and keep the user in context
    } catch (error) {
      console.error("[FeedPreviewCard] ❌ Error saving feed:", error)
      toast({
        title: "Failed to save feed",
        description: error instanceof Error ? error.message : "An error occurred while saving",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // REMOVED: handleGeneratePost - Individual post generation is disabled
  // Users must click "Generate Feed" button to generate ALL images in batch
  // This prevents accidental single-image generation and ensures proper batch processing

  // Handle generating images for unsaved feeds (saves first, then generates)
  const handleGenerateImages = async () => {
    try {
      // First, save the feed if not saved
      if (!isSaved || !feedId) {
        console.log("[FeedPreviewCard] Feed not saved yet, saving first...")
        setIsSaving(true)
        
        try {
          const saveResponse = await fetch('/api/feed-planner/create-from-strategy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              strategy,
              userModePreference: proMode ? 'pro' : 'classic', // 🔴 FIX: Pass userModePreference instead of proMode
              customSettings: {
                styleStrength,
                promptAccuracy,
                aspectRatio,
                realismStrength,
              },
              saveToPlanner: false, // CRITICAL: Generate Feed saves to database but NOT to planner
            }),
          })

          if (!saveResponse.ok) {
            const errorData = await saveResponse.json().catch(() => ({}))
            throw new Error(errorData.error || 'Failed to save feed')
          }

          const saveData = await saveResponse.json()
          const newFeedId = saveData.feedLayoutId
          
          console.log("[FeedPreviewCard] ✅ Feed saved successfully:", newFeedId)
          setSavedFeedId(newFeedId)
          
          if (onSave) {
            onSave(newFeedId)
          }
          
          // Now generate images with the new feedId
          await handleGenerateFeedWithId(newFeedId)
        } catch (saveError) {
          console.error("[FeedPreviewCard] ❌ Error saving feed:", saveError)
          toast({
            title: "Failed to save feed",
            description: saveError instanceof Error ? saveError.message : "An error occurred while saving",
            variant: "destructive",
          })
          setIsSaving(false)
        }
      } else {
        // Feed is already saved, just generate
        await handleGenerateFeedWithId(feedId)
      }
    } catch (error) {
      console.error("[FeedPreviewCard] ❌ Error in handleGenerateImages:", error)
      setIsGenerating(false)
      setIsSaving(false)
      
      // User-friendly error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : "We couldn't generate your feed right now. Please try again."
      
      toast({
        title: "Generation failed",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  // Internal function to generate feed images (used by both handleGenerateFeed and handleGenerateImages)
  const handleGenerateFeedWithId = async (feedIdToUse: number) => {
    setIsGenerating(true)
    setIsSaving(false) // Clear saving state if it was set
    
    try {
      console.log("[FeedPreviewCard] 🚀 Generating ALL feed images for feed:", feedIdToUse)
      
      const response = await fetch(`/api/feed-planner/queue-all-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ feedLayoutId: feedIdToUse }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        let errorMessage = errorData.message || errorData.error || errorData.details || 'Failed to generate feed images'
        
        // Provide user-friendly messages based on status code
        if (response.status === 402) {
          errorMessage = "You don't have enough credits. Please purchase more credits or upgrade your plan."
        } else if (response.status === 401) {
          errorMessage = "Your session has expired. Please refresh the page and try again."
        } else if (response.status === 400) {
          errorMessage = errorData.message || "Your feed request is invalid. Please check your feed and try again."
        } else if (response.status === 500) {
          errorMessage = "We're experiencing technical difficulties. Please try again in a moment."
        }
        
        console.error("[FeedPreviewCard] ❌ API Error:", {
          status: response.status,
          error: errorMessage,
          fullError: errorData,
        })
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      console.log("[FeedPreviewCard] ✅ Generation started:", data)
      
      // Check if any posts were actually queued
      if (data.queuedCount === 0 && data.failedCount > 0) {
        // All posts failed to queue
        toast({
          title: "Generation failed",
          description: data.message || `Failed to queue ${data.failedCount} post(s). Please check your credits and try again.`,
          variant: "destructive",
        })
        setIsGenerating(false)
        return
      }
      
      if (data.queuedCount > 0) {
        toast({
          title: "Generating feed images",
          description: `Started generating ${data.queuedCount} of ${data.totalPosts} images. This usually takes 1-2 minutes per image.`,
        })
      }
      
      // Update feedId state if this was called from handleGenerateImages (unsaved feed)
      if (!feedId || feedId !== feedIdToUse) {
        setSavedFeedId(feedIdToUse)
        if (onSave) {
          onSave(feedIdToUse)
        }
      }

      // Refresh posts data immediately to show generating status
      // The polling will continue to update, but we need an immediate refresh
      try {
        const feedResponse = await fetch(`/api/feed/${feedIdToUse}`)
        if (feedResponse.ok) {
          const feedData = await feedResponse.json()
          if (feedData.posts && Array.isArray(feedData.posts)) {
            setPostsData(feedData.posts)
            
            // Update title and description if available
            const refreshedTitle = feedData.title || 
                                  feedData.brand_name || 
                                  feedData.feed?.title || 
                                  feedData.feed?.brand_name ||
                                  feedData.feed?.gridPattern ||
                                  null
            if (refreshedTitle && refreshedTitle !== displayTitle) {
              setDisplayTitle(refreshedTitle)
            }
            
            const refreshedDescription = feedData.description || 
                                        feedData.feed?.description || 
                                        feedData.feed?.gridPattern ||
                                        feedData.feed?.overall_vibe ||
                                        null
            // CRITICAL: Filter out strategy documents - they should only appear in feed planner, not in chat feed cards
            const safeRefreshedDescription = getSafeDescription(refreshedDescription)
            if (safeRefreshedDescription && safeRefreshedDescription !== displayDescription) {
              setDisplayDescription(safeRefreshedDescription)
            } else if (!safeRefreshedDescription && displayDescription) {
              // Clear description if it was a strategy document
              setDisplayDescription("")
            }
            
            // Check if posts are actually generating after queue
            const hasGeneratingPosts = feedData.posts.some((p: FeedPost) => 
              p.generation_status === "generating" || (p.prediction_id && !p.image_url)
            )
            if (hasGeneratingPosts) {
              setIsGenerating(true) // Keep generating state if posts are actually generating
            } else {
              // Wait a bit more for posts to update, then check again
              setTimeout(async () => {
                const recheckResponse = await fetch(`/api/feed/${feedIdToUse}`)
                if (recheckResponse.ok) {
                  const recheckData = await recheckResponse.json()
                  if (recheckData.posts && Array.isArray(recheckData.posts)) {
                    setPostsData(recheckData.posts)
                    
                    // Update title and description from recheck
                    const recheckTitle = recheckData.title || 
                                        recheckData.brand_name || 
                                        recheckData.feed?.title || 
                                        recheckData.feed?.brand_name ||
                                        recheckData.feed?.gridPattern ||
                                        null
                    if (recheckTitle && recheckTitle !== displayTitle) {
                      setDisplayTitle(recheckTitle)
                    }
                    
                    const recheckDescription = recheckData.description || 
                                              recheckData.feed?.description || 
                                              recheckData.feed?.gridPattern ||
                                              recheckData.feed?.overall_vibe ||
                                              null
                    // CRITICAL: Filter out strategy documents - they should only appear in feed planner, not in chat feed cards
                    const safeRecheckDescription = getSafeDescription(recheckDescription)
                    if (safeRecheckDescription && safeRecheckDescription !== displayDescription) {
                      setDisplayDescription(safeRecheckDescription)
                    } else if (!safeRecheckDescription && displayDescription) {
                      // Clear description if it was a strategy document
                      setDisplayDescription("")
                    }
                    
                    const stillGenerating = recheckData.posts.some((p: FeedPost) => 
                      p.generation_status === "generating" || (p.prediction_id && !p.image_url)
                    )
                    setIsGenerating(stillGenerating)
                    
                    // If nothing is generating after retry, there might be an issue
                    if (!stillGenerating && data.queuedCount > 0) {
                      console.warn("[FeedPreviewCard] ⚠️ Posts were queued but not showing as generating")
                      toast({
                        title: "Generation status unclear",
                        description: "Images were queued but status update is delayed. Please refresh the page.",
                        variant: "default",
                      })
                    }
                  }
                }
              }, 2000)
            }
          }
        }
      } catch (refreshError) {
        console.error("[FeedPreviewCard] Error refreshing posts after generation start:", refreshError)
        // Don't fail the whole operation if refresh fails
        // But reset generating state since we can't verify
        setIsGenerating(false)
      }
    } catch (error) {
      console.error("[FeedPreviewCard] ❌ Error generating feed:", error)
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : 'Please try again',
        variant: "destructive",
      })
      setIsGenerating(false)
    }
  }

  const handleImageClick = (post: FeedPost) => {
    if (post.image_url) {
      setSelectedPost(post)
      setIsModalOpen(true)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedPost(null)
  }

  // CRITICAL: Close modal if feedId becomes null (race condition during save)
  // This prevents empty modal from displaying when feedId is temporarily null
  useEffect(() => {
    if (isModalOpen && !feedId) {
      console.warn("[FeedPreviewCard] feedId became null while modal is open, closing modal")
      setIsModalOpen(false)
      setSelectedPost(null)
    }
  }, [feedId, isModalOpen])

  const handleRefreshPosts = async () => {
    try {
      const response = await fetch(`/api/feed/${feedId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.posts) {
          setPostsData(data.posts)
          // Update selected post if modal is open
          if (selectedPost) {
            const updatedPost = data.posts.find((p: FeedPost) => p.id === selectedPost.id)
            if (updatedPost) {
              setSelectedPost(updatedPost)
            }
          }
        }
        
        // Update title and description from refreshed data
        const refreshedTitle = data.title || 
                              data.brand_name || 
                              data.feed?.title || 
                              data.feed?.brand_name ||
                              data.feed?.gridPattern ||
                              null
        if (refreshedTitle && refreshedTitle !== displayTitle) {
          setDisplayTitle(refreshedTitle)
        }
        
        const refreshedDescription = data.description || 
                                    data.feed?.description || 
                                    data.feed?.gridPattern ||
                                    data.feed?.overall_vibe ||
                                    null
        // CRITICAL: Filter out strategy documents - they should only appear in feed planner, not in chat feed cards
        const safeRefreshedDescription = getSafeDescription(refreshedDescription)
        if (safeRefreshedDescription && safeRefreshedDescription !== displayDescription) {
          setDisplayDescription(safeRefreshedDescription)
        } else if (!safeRefreshedDescription && displayDescription) {
          // Clear description if it was a strategy document
          setDisplayDescription("")
        }
      }
    } catch (error) {
      console.error("[FeedPreviewCard] Error refreshing posts:", error)
    }
  }

  // Handle ESC key to close modal and prevent body scroll
  useEffect(() => {
    if (!isModalOpen) return
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden'
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false)
        setSelectedPost(null)
      }
    }
    window.addEventListener('keydown', handleEscape)
    
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isModalOpen])

  return (
    <div className={`rounded-none border overflow-hidden transition-colors duration-200 ${
      isSaved 
        ? 'bg-black border-stone-700' 
        : 'bg-white border-stone-200'
    }`}>
      {/* Saved to Feed Banner - Show only when saved */}
      {isSaved && (
        <div className="bg-black border-b border-stone-700 px-3 sm:px-4 md:px-6 py-2">
          <p className="text-[10px] sm:text-xs text-white uppercase tracking-wider sm:tracking-widest font-light">
            Saved to Feed
          </p>
        </div>
      )}
      
      {/* Header - Editorial Style */}
      <div className={`border-b px-3 sm:px-4 md:px-6 py-3 sm:py-4 ${
        isSaved ? 'border-stone-700' : 'border-stone-200'
      }`}>
        <h3 
          className={`text-base sm:text-lg md:text-xl font-light tracking-wide break-words ${
            isSaved ? 'text-white' : 'text-stone-950'
          }`}
          style={{ fontFamily: "'Times New Roman', serif" }}
        >
          {displayTitle}
        </h3>
        <p className={`text-[10px] sm:text-xs mt-1 uppercase tracking-wider sm:tracking-widest ${
          isSaved ? 'text-stone-300' : 'text-stone-500'
        }`}>
          Instagram Feed Preview
        </p>
        {displayDescription && (
          <p className={`text-xs sm:text-sm mt-2 font-light leading-relaxed break-words ${
            isSaved ? 'text-stone-300' : 'text-stone-600'
          }`}>
            {displayDescription}
          </p>
        )}
        {/* Status indicators - Editorial style - Stack on mobile */}
        <div className={`flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-[10px] sm:text-xs uppercase tracking-wider ${
          isSaved ? 'text-stone-300' : 'text-stone-500'
        }`}>
          <span>{readyCount} Ready</span>
          {pendingCount > 0 && <span>{pendingCount} Pending</span>}
          {generatingCount > 0 && <span>{generatingCount} Generating</span>}
        </div>
      </div>

      {/* 3x3 Grid - Real Instagram Layout - Full width on mobile */}
      <div className={`p-2 sm:p-3 md:p-4 ${
        isSaved ? 'bg-stone-900' : 'bg-stone-50'
      }`}>
        {/* Show grid only if we have posts */}
        {sortedPosts.length > 0 ? (
          <div className={`grid grid-cols-3 gap-0.5 sm:gap-1 w-full sm:max-w-[600px] sm:mx-auto ${
            isSaved ? 'bg-stone-800' : 'bg-white'
          }`}>
          {sortedPosts.slice(0, 9).map((post, index) => {
          const postWithPrediction = post as FeedPost
          const isGeneratingPost = post.generation_status === "generating" || 
            (postWithPrediction.prediction_id && !post.image_url) ||
            (isAnyGenerating && !post.image_url && post.generation_status !== "failed")
          const hasImage = !!post.image_url
          
          return (
            <div
              key={post.id || `post-${post.position || index}`}
              className="relative aspect-square group cursor-pointer overflow-hidden bg-stone-100 touch-manipulation active:scale-[0.98] transition-transform duration-150 min-h-[100px] sm:min-h-[120px]"
              onClick={() => {
                // CRITICAL: Only allow clicking to view images - NO individual generation
                // Users must click "Generate Feed" button to generate ALL images in batch
                if (hasImage) {
                  handleImageClick(post)
                }
                // Removed: Individual post generation - users must use "Generate Feed" button
              }}
            >
              {/* Generated Image */}
              {hasImage && (
                <>
                  <Image
                    src={post.image_url!}
                    alt={`Post ${post.position}`}
                    fill
                    sizes="(max-width: 640px) 33vw, (max-width: 1024px) 200px, 200px"
                    className="object-cover"
                    loading="lazy"
                    quality={85}
                  />
                  {/* Hover/Tap Overlay - Instagram Style - Show on tap for mobile */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      View Post
                    </span>
                  </div>
                </>
              )}

              {/* Generating State */}
              {!hasImage && isGeneratingPost && (
                <div className="absolute inset-0 flex items-center justify-center bg-stone-50">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-5 h-5 text-stone-400 animate-spin" strokeWidth={1.5} />
                    <span className="text-[10px] text-stone-500 uppercase tracking-wider">
                      Creating
                    </span>
                  </div>
                </div>
              )}

              {/* Pending State - Elegant Placeholder */}
              {!hasImage && !isGeneratingPost && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-stone-50 to-stone-100 group-hover:from-stone-100 group-hover:to-stone-200 group-active:from-stone-100 group-active:to-stone-200 transition-all">
                  <div className="flex flex-col items-center gap-1 sm:gap-2">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-stone-400" strokeWidth={1.5} />
                    </div>
                    <span className="text-[9px] sm:text-[10px] text-stone-500 uppercase tracking-wider">
                      Pending
                    </span>
                  </div>
                </div>
              )}

              {/* Position Number - Subtle Corner Tag */}
              <div className="absolute top-1 right-1 w-5 h-5 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center">
                <span className="text-[10px] font-medium text-stone-700">
                  {post.position}
                </span>
              </div>
            </div>
          )
        })}
          </div>
        ) : (
          // Loading state when posts are being fetched
          <div className={`w-full sm:max-w-[600px] sm:mx-auto aspect-square flex items-center justify-center min-h-[300px] ${
            isSaved ? 'bg-stone-800' : 'bg-white'
          }`}>
            <div className="flex flex-col items-center gap-2">
              <Loader2 className={`w-6 h-6 animate-spin ${isSaved ? 'text-stone-400' : 'text-stone-400'}`} strokeWidth={1.5} />
              <span className={`text-xs uppercase tracking-wider ${isSaved ? 'text-stone-300' : 'text-stone-500'}`}>Loading feed posts...</span>
            </div>
          </div>
        )}
      </div>

      {/* Caption Preview - Editorial Format */}
      {sortedPosts.length > 0 && sortedPosts[0].caption && (
        <div className={`border-t px-3 sm:px-4 md:px-6 py-3 sm:py-4 ${
          isSaved ? 'border-stone-700 bg-black' : 'border-stone-200 bg-white'
        }`}>
          <p className={`text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest mb-2 ${
            isSaved ? 'text-stone-300' : 'text-stone-500'
          }`}>
            Feed Strategy
          </p>
          <p className={`text-xs sm:text-sm leading-relaxed font-light break-words ${
            isSaved ? 'text-stone-200' : 'text-stone-700'
          }`}>
            {sortedPosts[0].caption.substring(0, 150)}
            {sortedPosts[0].caption.length > 150 ? '...' : ''}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className={`border-t px-3 sm:px-4 md:px-6 py-3 sm:py-4 space-y-2 sm:space-y-3 ${
        isSaved ? 'border-stone-700 bg-black' : 'border-stone-200 bg-white'
      }`}>
        {/* Retry Failed Images Button - Show when there are failed posts */}
        {hasFailedPosts && feedId && !isAnyGenerating && (
          <button
            onClick={() => handleGenerateFeedWithId(feedId)}
            disabled={isGenerating || isSaving}
            className="w-full py-3 sm:py-3 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs sm:text-sm font-light tracking-wider uppercase transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-amber-600 min-h-[44px] touch-manipulation flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Retrying Failed Images...
              </>
            ) : (
              `Retry Failed Images (${failedCount})`
            )}
          </button>
        )}
        
        {/* Generate Feed Images Button - Single button for all cases (auto-saves if needed) */}
        {strategy && (pendingCount > 0 || (!isSaved || !feedId)) && !isAnyGenerating && !hasFailedPosts && (
          <button
            onClick={handleGenerateImages}
            disabled={isGenerating || isSaving}
            className="w-full py-3 sm:py-3 bg-stone-900 hover:bg-stone-800 active:bg-stone-700 text-white text-xs sm:text-sm font-light tracking-wider uppercase transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-stone-900 min-h-[44px] touch-manipulation flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving Feed...
              </>
            ) : isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Starting Generation...
              </>
            ) : (
              `Generate Feed Images${pendingCount > 0 && feedId ? ` (${pendingCount} remaining)` : ''}`
            )}
          </button>
        )}

        {/* Generating State - Show when any images are generating */}
        {isAnyGenerating && (
          <div className={`w-full py-3 text-xs font-light tracking-wider uppercase text-center border min-h-[44px] flex items-center justify-center ${
            isSaved 
              ? 'bg-stone-800 text-stone-200 border-stone-700' 
              : 'bg-stone-100 text-stone-600 border-stone-200'
          }`}>
            Generating {generatingCount > 0 ? `${generatingCount} ` : ''}Images...
          </div>
        )}
        
        {/* Save to Planner Button - Show when feed is saved but not yet in planner */}
        {isSaved && feedId && feedStatus !== 'saved' && feedStatus !== 'completed' && (
          <button
            onClick={handleSaveToPlanner}
            disabled={isSaving}
            className="w-full py-3 bg-stone-900 hover:bg-stone-800 active:bg-stone-700 text-white text-xs sm:text-sm font-light tracking-wider uppercase transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-stone-900 min-h-[44px] touch-manipulation flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving to Planner...
              </>
            ) : (
              "Save to Planner"
            )}
          </button>
        )}

        {/* View Feed Button - Show after feed is saved to planner */}
        {isSaved && feedId && (feedStatus === 'saved' || feedStatus === 'completed') && (
          <button
            onClick={handleViewFullFeed}
            className="w-full py-3 bg-white border border-stone-200 text-stone-900 hover:bg-stone-50 active:bg-stone-100 hover:border-stone-300 transition-all duration-200 text-xs font-light tracking-wider uppercase min-h-[44px] touch-manipulation"
          >
            View Feed
          </button>
        )}
        
        {/* View Prompts Button - Minimalistic, show for all feeds with posts */}
        {postsData.length > 0 && (
          <button
            onClick={() => setShowPromptModal(true)}
            className="w-full py-2 sm:py-2 bg-white hover:bg-stone-50 active:bg-stone-100 text-stone-600 text-[10px] sm:text-xs font-light tracking-wider uppercase transition-colors duration-200 border border-stone-200 min-h-[36px] touch-manipulation flex items-center justify-center gap-1.5"
          >
            <Eye size={14} className="opacity-60" />
            View Prompts
          </button>
        )}
      </div>

      {/* Fullscreen Post Card Modal */}
      {isModalOpen && selectedPost && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200 p-3 sm:p-4"
          onClick={handleCloseModal}
          style={{
            paddingTop: "calc(1rem + env(safe-area-inset-top))",
            paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
          }}
        >
          <div
            className="relative max-w-2xl w-full mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button - Touch-friendly */}
            <button
              onClick={handleCloseModal}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 p-2 sm:p-2 bg-black/50 hover:bg-black/70 active:bg-black/80 rounded-full text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
              aria-label="Close modal"
            >
              <X size={20} className="sm:w-6 sm:h-6" />
            </button>

            {/* FeedPostCard */}
            {feedId ? (
              <FeedPostCard
                post={{
                  id: selectedPost.id,
                  position: selectedPost.position,
                  prompt: selectedPost.prompt || '',
                  caption: selectedPost.caption || '',
                  content_pillar: selectedPost.post_type || selectedPost.content_pillar || '',
                  image_url: selectedPost.image_url,
                  generation_status: selectedPost.generation_status,
                }}
                feedId={feedId}
                onGenerate={handleRefreshPosts}
              />
            ) : (
              // Fallback UI when feedId is null (should be rare due to useEffect above)
              <div className="bg-white rounded-lg p-6 text-center">
                <p className="text-stone-600 mb-4">Feed needs to be saved before viewing post details.</p>
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-stone-900 text-white rounded hover:bg-stone-800"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
      
      {/* Prompt Viewer Modal - Same style as Pro Concept Cards */}
      {showPromptModal && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => {
            setShowPromptModal(false)
            // Reset editing state when modal closes
            setEditingPostId(null)
            setEditedPrompts({})
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <div>
                <h3 className="text-lg font-semibold text-stone-900">Feed Prompts</h3>
                <p className="text-sm text-stone-500 mt-1">Review prompts before generating</p>
              </div>
              <button
                onClick={() => {
                  setShowPromptModal(false)
                  // Reset editing state when modal closes
                  setEditingPostId(null)
                  setEditedPrompts({})
                }}
                className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-stone-600" />
              </button>
            </div>

            {/* Content - Scrollable list of prompts */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {sortedPosts.map((post) => (
                  <div key={post.id || post.position} className="border border-stone-200 rounded-lg overflow-hidden">
                    {/* Post Header */}
                    <div className="bg-stone-50 px-4 py-3 border-b border-stone-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white border border-stone-300 flex items-center justify-center">
                            <span className="text-xs font-medium text-stone-700">{post.position}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-stone-900">
                              Post {post.position}
                            </p>
                            <p className="text-xs text-stone-500">
                              {post.post_type || 'Portrait'} • {post.content_pillar || 'Feed post'}
                            </p>
                          </div>
                        </div>
                        {post.image_url && (
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-stone-200">
                            <Image
                              src={post.image_url}
                              alt={`Post ${post.position}`}
                              width={48}
                              height={48}
                              className="object-cover w-full h-full"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Prompt Content */}
                    <div className="p-4 bg-white">
                      {post.prompt || editedPrompts[post.id] ? (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-stone-700 uppercase tracking-wider">
                              Prompt
                            </p>
                            {!editingPostId && onPromptUpdate && messageId && (
                              <button
                                onClick={() => {
                                  setEditingPostId(post.id)
                                  setEditedPrompts(prev => ({
                                    ...prev,
                                    [post.id]: editedPrompts[post.id] || post.prompt || ''
                                  }))
                                }}
                                className="text-xs text-stone-600 hover:text-stone-900 px-2 py-1 border border-stone-300 rounded hover:bg-stone-50 transition-colors"
                              >
                                Edit
                              </button>
                            )}
                            {editingPostId === post.id && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    const newPrompt = editedPrompts[post.id] || post.prompt || ''
                                    if (onPromptUpdate && messageId && newPrompt.trim() !== (post.prompt || '')) {
                                      onPromptUpdate(messageId, post.id, newPrompt.trim())
                                    }
                                    setEditingPostId(null)
                                  }}
                                  className="text-xs text-white bg-stone-900 hover:bg-stone-800 px-3 py-1 rounded transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingPostId(null)
                                    setEditedPrompts(prev => {
                                      const updated = { ...prev }
                                      delete updated[post.id]
                                      return updated
                                    })
                                  }}
                                  className="text-xs text-stone-600 hover:text-stone-900 px-3 py-1 border border-stone-300 rounded hover:bg-stone-50 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="bg-stone-50 rounded-lg p-4 border border-stone-200">
                            {editingPostId === post.id ? (
                              <textarea
                                value={editedPrompts[post.id] || post.prompt || ''}
                                onChange={(e) => {
                                  setEditedPrompts(prev => ({
                                    ...prev,
                                    [post.id]: e.target.value
                                  }))
                                }}
                                className="w-full resize-none text-xs text-stone-700 font-mono leading-relaxed bg-transparent border-none outline-none min-h-[150px]"
                                rows={8}
                                autoFocus
                              />
                            ) : (
                              <p className="text-xs text-stone-700 font-mono leading-relaxed whitespace-pre-wrap">
                                {editedPrompts[post.id] || post.prompt}
                              </p>
                            )}
                          </div>
                          {!editingPostId && (
                            <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
                              <span>{(editedPrompts[post.id] || post.prompt || '').length} characters</span>
                              <span>{(editedPrompts[post.id] || post.prompt || '').split(/\s+/).filter(w => w.length > 0).length} words</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <p className="text-xs text-amber-800">
                            ⚠️ No prompt available for this post
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Caption Preview (if available) */}
                    {post.caption && (
                      <div className="px-4 pb-4">
                        <p className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">Caption Preview</p>
                        <p className="text-xs text-stone-600 leading-relaxed line-clamp-3">
                          {post.caption}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200 bg-stone-50">
              <p className="text-xs text-stone-500">
                {sortedPosts.filter(p => p.prompt).length} of {sortedPosts.length} prompts ready
              </p>
              <button
                onClick={() => {
                  setShowPromptModal(false)
                  // Reset editing state when modal closes
                  setEditingPostId(null)
                  setEditedPrompts({})
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
