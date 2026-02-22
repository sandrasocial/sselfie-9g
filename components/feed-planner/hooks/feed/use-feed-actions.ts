import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { createFeedFromStrategyHandler, type CreateFeedOptions, type FeedStrategy } from "@/lib/maya/feed-generation-handler"
import type { FeedPost } from "@/components/feed-planner/feed-preview-types"

interface UseFeedActionsParams {
  feedId: number | null
  isSaved: boolean
  strategy?: FeedStrategy
  onViewFullFeed?: () => void
  onSave?: (feedId: number) => void
  proMode: boolean
  styleStrength: number
  promptAccuracy: number
  aspectRatio: string
  realismStrength: number
  isSaving: boolean
  setIsSaving: (value: boolean) => void
  setIsGenerating: (value: boolean) => void
  setSavedFeedId: (id: number) => void
  setFeedStatus: (status: string) => void
  setPostsData: (posts: FeedPost[]) => void
  setDisplayTitle: (title: string) => void
  setDisplayDescription: (description: string) => void
  displayTitle: string
  displayDescription: string
  mutateFeed: () => void
  markJustSaved: () => void
}

const getSafeDescription = (desc: string | null | undefined): string => {
  if (!desc) return ""
  if (/^#{1,3}\s/m.test(desc) && desc.length > 500) return ""
  return desc
}

export function useFeedActions(params: UseFeedActionsParams) {
  const router = useRouter()

  const handleViewFullFeed = () => {
    if (!params.feedId) return
    if (params.onViewFullFeed) {
      params.onViewFullFeed()
      return
    }
    router.push(`/feed-planner?feedId=${params.feedId}`)
  }

  const handleSaveToPlanner = async () => {
    if (!params.feedId) {
      toast({ title: "Error", description: "Feed must be saved first", variant: "destructive" })
      return
    }

    params.setIsSaving(true)
    try {
      const response = await fetch(`/api/feed-planner/save-to-planner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ feedId: params.feedId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to save feed to planner")
      }

      params.setFeedStatus("saved")
      toast({ title: "Saved to Planner", description: "Your feed has been added to Feed Planner." })
    } catch (error) {
      toast({
        title: "Failed to save",
        description: error instanceof Error ? error.message : "An error occurred while saving",
        variant: "destructive",
      })
    } finally {
      params.setIsSaving(false)
    }
  }

  const handleSaveFeed = async () => {
    if (!params.strategy) {
      toast({ title: "Error", description: "No feed strategy to save", variant: "destructive" })
      return
    }

    params.setIsSaving(true)
    try {
      const options: CreateFeedOptions = {
        userModePreference: params.proMode ? "pro" : "classic",
        customSettings: {
          styleStrength: params.styleStrength,
          promptAccuracy: params.promptAccuracy,
          aspectRatio: params.aspectRatio,
          realismStrength: params.realismStrength,
        },
      }

      const result = await createFeedFromStrategyHandler(params.strategy, {
        ...options,
        saveToPlanner: true,
      })

      if (!result?.success || !result.feedId) {
        throw new Error("Failed to save feed")
      }

      const newFeedId = Number(result.feedId)
      params.markJustSaved()
      params.setSavedFeedId(newFeedId)
      params.setFeedStatus("saved")
      params.onSave?.(newFeedId)
      toast({ title: "Feed saved", description: "Your feed has been saved to Feed Planner." })
    } catch (error) {
      toast({
        title: "Failed to save feed",
        description: error instanceof Error ? error.message : "An error occurred while saving",
        variant: "destructive",
      })
    } finally {
      params.setIsSaving(false)
    }
  }

  const refreshFeedData = async (feedIdToUse: number) => {
    const feedResponse = await fetch(`/api/feed/${feedIdToUse}`)
    if (!feedResponse.ok) return
    const feedData = await feedResponse.json()
    if (Array.isArray(feedData.posts)) {
      params.setPostsData(feedData.posts)
      const refreshedTitle =
        feedData.title ||
        feedData.brand_name ||
        feedData.feed?.title ||
        feedData.feed?.brand_name ||
        feedData.feed?.gridPattern
      if (refreshedTitle && refreshedTitle !== params.displayTitle) {
        params.setDisplayTitle(refreshedTitle)
      }

      const refreshedDescription =
        feedData.description || feedData.feed?.description || feedData.feed?.gridPattern || feedData.feed?.overall_vibe
      const safeDescription = getSafeDescription(refreshedDescription)
      if (safeDescription !== params.displayDescription) {
        params.setDisplayDescription(safeDescription)
      }
    }
  }

  const handleGenerateFeedWithId = async (feedIdToUse: number) => {
    params.setIsGenerating(true)
    params.setIsSaving(false)

    try {
      const response = await fetch(`/api/feed-planner/queue-all-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ feedLayoutId: feedIdToUse }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || "Failed to generate feed images")
      }

      const data = await response.json()
      if (data.queuedCount === 0 && data.failedCount > 0) {
        toast({
          title: "Generation failed",
          description: data.message || `Failed to queue ${data.failedCount} post(s).`,
          variant: "destructive",
        })
        params.setIsGenerating(false)
        return
      }

      if (data.queuedCount > 0) {
        toast({
          title: "Generating feed images",
          description: `Started generating ${data.queuedCount} of ${data.totalPosts} images.`,
        })
      }

      if (!params.feedId || params.feedId !== feedIdToUse) {
        params.setSavedFeedId(feedIdToUse)
        params.onSave?.(feedIdToUse)
      }

      await refreshFeedData(feedIdToUse)
      params.mutateFeed()
    } catch (error) {
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
      params.setIsGenerating(false)
    }
  }

  const handleGenerateImages = async () => {
    try {
      if (!params.isSaved || !params.feedId) {
        if (!params.strategy) {
          throw new Error("No feed strategy available")
        }

        params.setIsSaving(true)
        const saveResponse = await fetch("/api/feed-planner/create-from-strategy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            strategy: params.strategy,
            userModePreference: params.proMode ? "pro" : "classic",
            customSettings: {
              styleStrength: params.styleStrength,
              promptAccuracy: params.promptAccuracy,
              aspectRatio: params.aspectRatio,
              realismStrength: params.realismStrength,
            },
            saveToPlanner: false,
          }),
        })

        if (!saveResponse.ok) {
          const errorData = await saveResponse.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to save feed")
        }

        const saveData = await saveResponse.json()
        const newFeedId = Number(saveData.feedLayoutId)
        params.markJustSaved()
        params.setSavedFeedId(newFeedId)
        params.onSave?.(newFeedId)
        await handleGenerateFeedWithId(newFeedId)
        return
      }

      await handleGenerateFeedWithId(params.feedId)
    } catch (error) {
      params.setIsGenerating(false)
      params.setIsSaving(false)
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    }
  }

  const handleRefreshPosts = async () => {
    if (!params.feedId) return
    try {
      await refreshFeedData(params.feedId)
      params.mutateFeed()
    } catch {
      // noop
    }
  }

  return {
    handleViewFullFeed,
    handleSaveToPlanner,
    handleSaveFeed,
    handleGenerateFeedWithId,
    handleGenerateImages,
    handleRefreshPosts,
  }
}
