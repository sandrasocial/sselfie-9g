"use client"

import { useState, type ReactNode } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import FeedStyleModal, { type FeedStyle, type FeedStyleModalData } from "./feed-style-modal"
import useSWR, { mutate } from "swr"
import MayaModeToggle from "@/components/sselfie/maya/maya-mode-toggle"
import { useFeedNav } from "./feed-nav-context"

interface FeedHeaderProps {
  feedData: any
  currentFeedId: number
  onBack?: () => void
  onProfileImageClick?: () => void
  onWriteBio: () => void
  onCreateHighlights?: () => void
  onOpenWizard?: () => void // Callback to open wizard
  onOpenWelcomeWizard?: () => void // Callback to open welcome wizard (for paid blueprint users)
  access?: { isFree?: boolean; isPaidBlueprint?: boolean; isMembership?: boolean } // Access control to hide buttons for free users
  generationMode?: "classic" | "pro"
  onToggleGenerationMode?: () => void
  workspaceNavigation?: ReactNode
  showProfileDetails?: boolean
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const feedHeaderCompactChipClass =
  "min-h-11 rounded-[8px] border border-[#C5C6C8] bg-white px-3 text-[10px] uppercase tracking-[0.14em] text-[#4F5052] transition-colors hover:border-[#0D0E10]/40 hover:text-[#0D0E10]"

const feedHeaderChipClass =
  "min-h-11 rounded-[8px] border border-[#C5C6C8] bg-white px-3 text-[10px] uppercase tracking-[0.16em] text-[#4F5052] transition-colors hover:border-[#0D0E10]/40 hover:text-[#0D0E10] sm:px-4 sm:text-[11px]"

const feedHeaderPrimaryChipClass =
  "min-h-11 rounded-[8px] border border-[#0D0E10] bg-[#0D0E10] px-4 text-[10px] uppercase tracking-[0.16em] text-white transition-opacity hover:opacity-90 sm:text-[11px]"

const feedHeaderStatClass = "rounded-[8px] border border-[#C5C6C8]/60 bg-white px-2 py-1.5 text-center"

export default function FeedHeader({
  feedData,
  currentFeedId,
  onBack,
  onProfileImageClick,
  onWriteBio,
  onCreateHighlights,
  onOpenWizard,
  onOpenWelcomeWizard,
  access,
  generationMode = "pro",
  onToggleGenerationMode,
  workspaceNavigation,
  showProfileDetails = true,
}: FeedHeaderProps) {
  const router = useRouter()
  const feedNav = useFeedNav()
  // Inside /app the planner is embedded - switch feeds in place. Standalone route: navigate.
  const goToFeed = (feedId: number) => {
    if (feedNav) feedNav.navigateToFeed(feedId)
    else router.push(`/feed-planner?feedId=${feedId}`)
  }
  const [isCreatingFeed, setIsCreatingFeed] = useState(false)
  const [showFeedStyleModal, setShowFeedStyleModal] = useState(false)
  const [isCreatingNewFeed, setIsCreatingNewFeed] = useState(false) // Track if user explicitly wants to create NEW feed (vs update existing)
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false)

  const feedPosts: any[] = Array.isArray(feedData?.posts)
    ? feedData.posts
    : Array.isArray(feedData?.feed?.posts)
      ? feedData.feed.posts
      : []
  const needsCaptions = feedPosts.length > 0 && feedPosts.every((p) => !p?.caption)
  const readyPosts = feedPosts.filter((post) => Boolean(post?.image_url && post?.caption)).length
  const postedPosts = feedPosts.filter((post) => Boolean(post?.is_posted)).length
  
  // Fetch user's last feed style from personal brand
  const { data: personalBrandData, isLoading: isLoadingPersonalBrand } = useSWR(
    "/api/profile/personal-brand",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  )

  // V2 is always enabled - no need to check flag
  const useFeedPlannerV2 = true
  
  // Extract last feed style from settings_preference[0]
  const lastFeedStyle: FeedStyle | null = personalBrandData?.data?.settingsPreference?.[0] || null
  const needsFirstStyleChoice =
    !isLoadingPersonalBrand && !lastFeedStyle && feedPosts.every((post) => !post?.image_url)

  // Preview feed creation removed with the free blueprint funnel (Sandra, 2026-07-07).

  // Feed Planner Phase 2b: ported from the retired Posts tab - bulk
  // caption generation for a legacy/manual plan where no post has a caption yet. A Maya
  // auto-drafted plan always writes a caption per post at creation time, so this only ever
  // shows for older plans - per-post caption edit/enhance/copy already lives in the post
  // editor overlay (FeedPostCard), unchanged.
  const handleCreateCaptions = async () => {
    if (!currentFeedId) return
    setIsGeneratingCaptions(true)
    try {
      const response = await fetch(`/api/feed/${currentFeedId}/generate-captions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to generate captions" }))
        throw new Error(errorData.error || "Failed to generate captions")
      }
      await Promise.all([
        mutate(`/api/feed/${currentFeedId}`),
        mutate("/api/feed/latest"),
      ])
      toast({ title: "Captions created", description: "Maya wrote captions for this month's posts." })
    } catch (error) {
      toast({
        title: "Couldn't create captions",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingCaptions(false)
    }
  }

  const handleCreateNewFeedClick = () => {
    // Show feed style modal first
    setIsCreatingNewFeed(true) // Explicitly mark as "create new" (not update)
    setShowFeedStyleModal(true)
  }

  const handleChooseLookClick = () => {
    setIsCreatingNewFeed(false)
    setShowFeedStyleModal(true)
  }

  const handleFeedStyleConfirm = async (data: FeedStyleModalData) => {
    // Check if user explicitly wants to create NEW feed (not update existing)
    // OR if there's no existing feed to update
    if (isCreatingNewFeed || !currentFeedId || !feedData?.feed?.id) {
      await handleFullFeedStyleConfirm(data)
    } else {
      // User is updating existing feed
      await handleUpdateFeedStyle(data)
    }
    // Reset the flag after handling
    setIsCreatingNewFeed(false)
  }

  const handleUpdateFeedStyle = async (data: FeedStyleModalData) => {
    setShowFeedStyleModal(false)
    setIsCreatingFeed(true)
    
    try {
      // Update personal brand first (same as create flow)
      try {
        const currentBrandResponse = await fetch('/api/profile/personal-brand', {
          credentials: 'include',
        })
        let currentSettingsPreference: string[] | null = null
        
        if (currentBrandResponse.ok) {
          const currentBrand = await currentBrandResponse.json()
          if (currentBrand?.data?.settingsPreference) {
            const rawSettings = Array.isArray(currentBrand.data.settingsPreference)
              ? currentBrand.data.settingsPreference
              : [currentBrand.data.settingsPreference].filter(Boolean)
            
            const validStyles = useFeedPlannerV2
              ? [
                  "Dark & Moody",
                  "Beige Aesthetic",
                  "Light & Minimalistic",
                  "Luxury Future Self",
                  "Casual Bohemian",
                  "Athletic & Wellness",
                  "Coastal Aesthetics",
                ]
              : ["luxury", "minimal", "beige"]

            currentSettingsPreference = rawSettings
              .filter((s: any) => {
                if (typeof s !== 'string') return false
                if (s.length > 100) return false
                if (s.includes('{\\"') || s.includes('\\\\')) return false
                return validStyles.some((style) => style.toLowerCase() === s.toLowerCase().trim())
              })
              .map((s: string) => {
                const trimmed = s.trim()
                if (!useFeedPlannerV2) return trimmed.toLowerCase()
                return validStyles.find((style) => style.toLowerCase() === trimmed.toLowerCase()) || trimmed
              })
          }
        }
        
        const updatedSettingsPreference = currentSettingsPreference 
          ? [data.feedStyle, ...currentSettingsPreference.filter((s: string) => s !== data.feedStyle)]
          : [data.feedStyle]
        
        const updatePayload: Record<string, any> = {
          settingsPreference: updatedSettingsPreference,
        }
        
        if (data.feedStyleVariationId !== undefined) {
          updatePayload.feedStyleVariationId = data.feedStyleVariationId
        }

        if (data.visualAesthetic && Array.isArray(data.visualAesthetic) && data.visualAesthetic.length > 0) {
          updatePayload.visualAesthetic = data.visualAesthetic
        }
        
        await fetch('/api/profile/personal-brand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updatePayload),
        })
      } catch (error) {
        console.error('[Feed Header] Error updating personal brand:', error)
        // Continue with feed update even if personal brand fails
      }

      // Update the feed's style and variation
      const updateResponse = await fetch(`/api/feed/${currentFeedId}/update-style`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          feedStyle: data.feedStyle,
          feedStyleVariationId: data.feedStyleVariationId,
        }),
      })

      if (!updateResponse.ok) {
        const error = await updateResponse.json().catch(() => ({ error: 'Failed to update feed style' }))
        throw new Error(error.error || 'Failed to update feed style')
      }

      // Refresh only the planner caches. A route refresh remounts the Calendar shell and
      // loses the member's open-plan state.
      await Promise.all([
        mutate(`/api/feed/${currentFeedId}`),
        mutate("/api/feed/latest"),
        mutate("/api/feed/list"),
      ])
      
      toast({
        title: "Feed style updated",
        description: "Your feed style has been updated. Generate new images to see the changes!",
      })
    } catch (error) {
      console.error("[v0] Error updating feed style:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update feed style. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingFeed(false)
    }
  }

  const handleFullFeedStyleConfirm = async (data: FeedStyleModalData) => {
    setShowFeedStyleModal(false)
    setIsCreatingFeed(true)
    
    try {
      // Always update personal brand to sync feedStyle and visualAesthetic
      // This ensures style selections are saved to personal brand
      try {
        console.log('[Feed Header] Syncing personal brand with feed style selection:', {
          feedStyle: data.feedStyle,
          visualAesthetic: data.visualAesthetic,
        })
        
        // Fetch current personal brand to preserve existing settings_preference
        const currentBrandResponse = await fetch('/api/profile/personal-brand', {
          credentials: 'include',
        })
        let currentSettingsPreference: string[] | null = null
        
        if (currentBrandResponse.ok) {
          const currentBrand = await currentBrandResponse.json()
          if (currentBrand?.data?.settingsPreference) {
            // Preserve existing settings_preference array, but sanitize corrupted data
            const rawSettings = Array.isArray(currentBrand.data.settingsPreference)
              ? currentBrand.data.settingsPreference
              : [currentBrand.data.settingsPreference].filter(Boolean)
            
            // Sanitize: filter out corrupted nested JSON strings, keep only valid simple strings
            // Corrupted data looks like: '{"luxury","{\\"luxury\\"...' (contains nested JSON)
            // Valid data looks like: 'luxury', 'minimal', 'beige' (simple strings)
            const validStyles = useFeedPlannerV2
              ? [
                  "Dark & Moody",
                  "Beige Aesthetic",
                  "Light & Minimalistic",
                  "Luxury Future Self",
                  "Casual Bohemian",
                  "Athletic & Wellness",
                  "Coastal Aesthetics",
                ]
              : ["luxury", "minimal", "beige"]

            currentSettingsPreference = rawSettings
              .filter((s: any) => {
                if (typeof s !== 'string') return false
                // If it's a very long string (>100 chars) or contains nested JSON patterns, it's corrupted
                if (s.length > 100) return false
                if (s.includes('{\\"') || s.includes('\\\\')) return false
                // Only keep simple strings that match valid feed styles
                return validStyles.some((style) => style.toLowerCase() === s.toLowerCase().trim())
              })
              .map((s: string) => {
                const trimmed = s.trim()
                if (!useFeedPlannerV2) return trimmed.toLowerCase()
                return validStyles.find((style) => style.toLowerCase() === trimmed.toLowerCase()) || trimmed
              })
          }
        }
        
        // Update settings_preference: set feedStyle as first element, preserve rest (now sanitized)
        const updatedSettingsPreference = currentSettingsPreference 
          ? [data.feedStyle, ...currentSettingsPreference.filter((s: string) => s !== data.feedStyle)]
          : [data.feedStyle]
        
        // Build update payload - only include fields that have values
        const updatePayload: Record<string, any> = {
          settingsPreference: updatedSettingsPreference,
        }
        
        if (data.feedStyleVariationId !== undefined) {
          updatePayload.feedStyleVariationId = data.feedStyleVariationId
        }

        // Only include visualAesthetic if it's provided and not empty
        if (data.visualAesthetic && Array.isArray(data.visualAesthetic) && data.visualAesthetic.length > 0) {
          updatePayload.visualAesthetic = data.visualAesthetic
        }
        
        console.log('[Feed Header] Sending personal brand update payload:', updatePayload)
        
        const updateResponse = await fetch('/api/profile/personal-brand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updatePayload),
        })
        
        if (updateResponse.ok) {
          const updateResult = await updateResponse.json()
          console.log('[Feed Header] Personal brand synced successfully:', updateResult)
          // Revalidate SWR cache to refresh the modal data
          await mutate('/api/profile/personal-brand')
          console.log('[Feed Header] SWR cache revalidated')
        } else {
          // Try to get error details from response
          let errorData: any = null
          const status = updateResponse?.status ?? 'unknown'
          const statusText = updateResponse?.statusText ?? 'Unknown error'
          let errorMessage = `HTTP ${status}: ${statusText}`
          
          try {
            if (!updateResponse) {
              errorMessage = 'No response received from server'
            } else {
              const text = await updateResponse.text()
              if (text && text.trim()) {
                try {
                  errorData = JSON.parse(text)
                  errorMessage = errorData.details || errorData.error || errorMessage
                } catch {
                  // Not JSON, use text as error message
                  errorMessage = text.substring(0, 200) || errorMessage
                }
              } else {
                // Empty response body - use status-based message
                if (status === 500) {
                  errorMessage = 'Internal server error - please try again'
                } else if (status === 400) {
                  errorMessage = 'Invalid data format - please check your selections'
                } else if (status === 401) {
                  errorMessage = 'Unauthorized - please refresh and try again'
                } else if (status === 404) {
                  errorMessage = 'User not found - please refresh and try again'
                }
              }
            }
          } catch (parseError) {
            console.warn('[Feed Header] Could not parse error response:', parseError)
            errorMessage = `Failed to parse error response: ${parseError instanceof Error ? parseError.message : String(parseError)}`
          }
          
          const errorLog: Record<string, any> = {
            status: status,
            statusText: statusText,
            error: errorMessage,
            url: '/api/profile/personal-brand',
          }
          
          if (errorData !== null) {
            errorLog.errorData = errorData
          } else {
            errorLog.errorData = 'No error data in response'
          }
          
          console.error('[Feed Header] Failed to update personal brand:', errorLog)
          
          // Don't throw - continue with feed creation even if personal brand update fails
          // This is intentional - feed creation should succeed even if personal brand sync fails
        }
      } catch (error) {
        // Network error or fetch failure
        const errorMessage = error instanceof Error ? error.message : String(error)
        const errorStack = error instanceof Error ? error.stack : undefined
        console.error('[Feed Header] Network error updating personal brand:', {
          error: errorMessage,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          stack: errorStack,
          url: '/api/profile/personal-brand',
        })
        // Continue with feed creation even if personal brand update fails
        // This is intentional - feed creation should succeed even if personal brand sync fails
      }

      // CRITICAL: Always pass feedStyleVariationId to feed creation (even if null)
      // This ensures the feed uses the user's selection, not a fallback
      const feedCreationPayload = {
        feedStyle: data.feedStyle,
        visualAesthetic: data.visualAesthetic,
        feedStyleVariationId: data.feedStyleVariationId, // Explicitly pass (can be null)
      }
      console.log('[Feed Header] Creating full feed with:', {
        feedStyle: feedCreationPayload.feedStyle,
        feedStyleVariationId: feedCreationPayload.feedStyleVariationId,
      })
      
      const response = await fetch('/api/feed/create-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(feedCreationPayload),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create feed' }))
        throw new Error(error.error || 'Failed to create feed')
      }

      const responseData = await response.json()
      
      // Navigate to the new feed (in place when embedded in /app)
      goToFeed(responseData.feedId)
      
      toast({
        // DRAFT UX copy for Sandra approval before release.
        title: "Grid created",
        description: "Your new grid is ready.",
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

  return (
    <div className="overflow-hidden rounded-[14px] border border-[#C5C6C8]/35 bg-[#F8FAFA] shadow-[0_1px_2px_rgba(13,14,16,0.04),0_10px_28px_rgba(13,14,16,0.06)]">
      <div className="space-y-2 border-b border-[#C5C6C8]/40 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            {onBack && (
              <button
                onClick={onBack}
                className={feedHeaderCompactChipClass}
              >
                Back
              </button>
            )}
            {feedData?.feed?.display_color && (
              <div
                className="w-2.5 h-2.5 rounded-full border shrink-0"
                style={{
                  backgroundColor: feedData.feed.display_color,
                  borderColor: feedData.feed.display_color,
                }}
                title={`Feed color: ${feedData.feed.display_color}`}
              />
            )}
            <span className="truncate font-serif text-[17px] font-light leading-tight text-[#0D0E10] sm:text-[19px]">{feedName}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {access?.isMembership && onToggleGenerationMode && (
              <div className="pl-0.5">
                <MayaModeToggle
                  currentMode={generationMode}
                  onToggle={onToggleGenerationMode}
                  variant="compact"
                  surface="light"
                  showModeHint={false}
                />
              </div>
            )}
          </div>
        </div>

        {(onOpenWizard || (onOpenWelcomeWizard && access?.isPaidBlueprint)) && (
          <div className="flex items-center gap-1.5">
            {onOpenWizard && (
              <button
                onClick={onOpenWizard}
                className={feedHeaderCompactChipClass}
                title="Edit your grid setup"
              >
                {/* DRAFT UX copy for Sandra approval before release. */}
                Plan settings
              </button>
            )}
            {onOpenWelcomeWizard && access?.isPaidBlueprint && (
              <button
                onClick={onOpenWelcomeWizard}
                className={feedHeaderCompactChipClass}
                title="View welcome guide"
              >
                Quick guide
              </button>
            )}
          </div>
        )}
      </div>

      {workspaceNavigation}

      <div className={showProfileDetails ? "px-3 sm:px-4 md:px-8 py-3 sm:py-4" : "hidden"}>
        <div className="mb-3 flex items-start gap-4 md:gap-8">
          <button
            onClick={onProfileImageClick}
            disabled={!onProfileImageClick}
            aria-label={onProfileImageClick ? (hasProfileImage ? "Change profile image" : "Add profile image") : "Profile image"}
            className="group relative h-[72px] w-[72px] shrink-0 rounded-full border border-[#C5C6C8]/50 bg-white p-[2px] transition-opacity enabled:hover:opacity-90 disabled:cursor-default sm:h-20 sm:w-20 md:h-28 md:w-28"
          >
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-[#C5C6C8]/40 bg-[#0D0E10]">
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
                <span className="relative z-10 text-2xl font-bold md:text-4xl text-white">S</span>
              )}
            </div>
            {onProfileImageClick && <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-[#0D0E10]/0 transition-all group-hover:bg-[#0D0E10]/50">
              <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity font-medium text-center px-2 text-white">
                {hasProfileImage ? "Change" : "Add photo"}
              </span>
            </div>}
            {onProfileImageClick && !hasProfileImage && (
              <div className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[4px] border border-[#C5C6C8]/50 bg-white px-2 py-0.5 text-[10px] text-[#0D0E10] opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                Click to add profile picture
              </div>
            )}
          </button>

          <div className="flex-1 space-y-3">
            <div className="grid grid-cols-3 gap-2 max-w-sm">
              <div className={feedHeaderStatClass}>
                <div className="text-sm font-semibold text-[#0D0E10]">{feedPosts.length}</div>
                <div className="text-[11px] text-[#4F5052]">posts</div>
              </div>
              <div className={feedHeaderStatClass}>
                <div className="text-sm font-semibold text-[#0D0E10]">{readyPosts}</div>
                <div className="text-[11px] text-[#4F5052]">ready</div>
              </div>
              <div className={feedHeaderStatClass}>
                <div className="text-sm font-semibold text-[#0D0E10]">{postedPosts}</div>
                <div className="text-[11px] text-[#4F5052]">posted</div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="font-serif text-[15px] font-light text-[#0D0E10]">
                {feedData?.userDisplayName || feedData?.feed?.brand_name || "User"}
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#4F5052]">
                {hasBio ? feedData.bio.bio_text : "Your next posts planned with Maya"}
              </div>
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {/* Preview feed retired with the free blueprint funnel (Sandra, 2026-07-07). */}
              {!access?.isFree && (access?.isPaidBlueprint || access?.isMembership) && needsFirstStyleChoice && (
                <button
                  onClick={handleChooseLookClick}
                  disabled={isCreatingFeed}
                  className={`${feedHeaderPrimaryChipClass} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  Choose your look
                </button>
              )}
              {!access?.isFree && (access?.isPaidBlueprint || access?.isMembership) && !needsFirstStyleChoice && !isLoadingPersonalBrand && (
                <button
                  onClick={handleCreateNewFeedClick}
                  disabled={isCreatingFeed}
                  className={`${feedHeaderPrimaryChipClass} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {isCreatingFeed ? (
                    <>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <span>New Grid</span>
                    </>
                  )}
                </button>
              )}
              {!access?.isFree && (
                <button
                  onClick={onWriteBio}
                  className={feedHeaderChipClass}
                >
                  Bio
                </button>
              )}
              {!access?.isFree && onCreateHighlights && (
                <button
                  onClick={onCreateHighlights}
                  className={feedHeaderChipClass}
                >
                  Highlights
                </button>
              )}
              {!access?.isFree && needsCaptions && (
                <button
                  onClick={handleCreateCaptions}
                  disabled={isGeneratingCaptions}
                  className={`${feedHeaderChipClass} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {isGeneratingCaptions ? "Creating..." : "Create Captions"}
                </button>
              )}
            </div>

            {/* Highlights - below buttons, mobile optimized */}
            {feedData?.highlights && feedData.highlights.length > 0 && (
              <div className="w-full mt-2 -mx-3 px-3 sm:-mx-4 sm:px-4 md:mx-0 md:px-0">
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
                      <div key={highlight.id || highlight.title} className="flex flex-col items-center gap-2 min-w-[64px] md:min-w-[70px] shrink-0">
                        <div className="h-14 w-14 rounded-full border border-[#C5C6C8]/50 bg-white p-[2px] md:h-16 md:w-16">
                          <div className="h-full w-full rounded-full border border-[#C5C6C8]/40 bg-[#0D0E10] p-[2px]">
                            {isColorHighlight ? (
                              <div
                                className="w-full h-full rounded-full flex items-center justify-center"
                                style={{ backgroundColor: highlightColor }}
                              >
                                <span className="text-base md:text-lg font-bold text-white">
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
                        <span className="max-w-[64px] truncate text-center text-xs leading-tight text-[#4F5052] md:max-w-[70px]">
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

      {/* Feed Style Selection Modal */}
      <FeedStyleModal
        open={showFeedStyleModal}
        onOpenChange={(open) => {
          setShowFeedStyleModal(open)
          if (!open) {
            setIsCreatingNewFeed(false) // Reset flag when modal closes
          }
        }}
        onConfirm={handleFeedStyleConfirm}
        mode={isCreatingNewFeed ? "new" : "style"}
        defaultFeedStyle={lastFeedStyle}
        defaultFeedStyleVariationId={lastFeedStyle ? (feedData?.feed?.feed_style_variation_id ?? undefined) : undefined}
        isLoading={isCreatingFeed}
      />
    </div>
  )
}
