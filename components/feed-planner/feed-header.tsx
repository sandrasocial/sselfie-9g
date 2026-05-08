"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import FeedStyleModal, { type FeedStyle, type FeedStyleModalData } from "./feed-style-modal"
import useSWR, { mutate } from "swr"
import MayaModeToggle from "@/components/sselfie/maya/maya-mode-toggle"

interface FeedHeaderProps {
  feedData: any
  currentFeedId: number
  onBack?: () => void
  onProfileImageClick: () => void
  onWriteBio: () => void
  onCreateHighlights?: () => void
  onOpenWizard?: () => void // Callback to open wizard
  onOpenWelcomeWizard?: () => void // Callback to open welcome wizard (for paid blueprint users)
  access?: { isFree?: boolean; isPaidBlueprint?: boolean; isMembership?: boolean } // Access control to hide buttons for free users
  generationMode?: "classic" | "pro"
  onToggleGenerationMode?: () => void
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const feedHeaderCompactChipClass =
  "stone-chip rounded-full px-3 py-1.5 text-[9px] uppercase tracking-[0.16em] text-[color:var(--app-text-secondary)] transition-colors hover:bg-[color:var(--app-btn-secondary-hover)] hover:text-[color:var(--app-text-primary)] min-h-[34px] sm:min-h-[36px]"

const feedHeaderChipClass =
  "stone-chip rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-[color:var(--app-text-secondary)] transition-colors hover:bg-[color:var(--app-btn-secondary-hover)] hover:text-[color:var(--app-text-primary)] sm:px-4 sm:text-[11px] min-h-[34px] sm:min-h-[36px]"

const feedHeaderStatClass = "rounded-[8px] border border-[color:var(--app-glass-border)] bg-[rgba(255,255,255,0.62)] px-2 py-1.5 text-center"

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
}: FeedHeaderProps) {
  const router = useRouter()
  const [isCreatingFeed, setIsCreatingFeed] = useState(false)
  const [isCreatingPreviewFeed, setIsCreatingPreviewFeed] = useState(false)
  const [showFeedStyleModal, setShowFeedStyleModal] = useState(false)
  const [isPreviewFeedModal, setIsPreviewFeedModal] = useState(false) // Track if modal is for preview or full feed
  const [isCreatingNewFeed, setIsCreatingNewFeed] = useState(false) // Track if user explicitly wants to create NEW feed (vs update existing)
  
  // Fetch user's last feed style from personal brand
  const { data: personalBrandData } = useSWR(
    showFeedStyleModal ? "/api/profile/personal-brand" : null,
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

  const handleCreatePreviewFeed = () => {
    // Show feed style modal first (same as new feed)
    setIsPreviewFeedModal(true)
    setShowFeedStyleModal(true)
  }

  const handlePreviewFeedStyleConfirm = async (data: FeedStyleModalData) => {
    setShowFeedStyleModal(false)
    setIsCreatingPreviewFeed(true)
    
    try {
      // Update personal brand in background (non-blocking) - don't await it
      fetch('/api/profile/personal-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          settingsPreference: [data.feedStyle],
          feedStyleVariationId: data.feedStyleVariationId,
        }),
      }).catch((error) => {
        console.error('[Feed Header] Background personal brand update failed (non-blocking):', error)
      })

      // CRITICAL: Always pass feedStyleVariationId to feed creation (even if null)
      const feedCreationPayload = {
        feedStyle: data.feedStyle,
        visualAesthetic: data.visualAesthetic,
        feedStyleVariationId: data.feedStyleVariationId,
      }
      console.log('[Feed Header] Creating preview feed with:', {
        feedStyle: feedCreationPayload.feedStyle,
        feedStyleVariationId: feedCreationPayload.feedStyleVariationId,
      })
      
      const response = await fetch('/api/feed/create-free-example', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(feedCreationPayload),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create preview feed' }))
        throw new Error(error.error || 'Failed to create preview feed')
      }

      const responseData = await response.json()
      
      // Navigate to the new preview feed
      router.push(`/feed-planner?feedId=${responseData.feedId}`)
      
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
      setIsPreviewFeedModal(false)
    }
  }

  const handleCreateNewFeedClick = () => {
    // Show feed style modal first
    setIsPreviewFeedModal(false)
    setIsCreatingNewFeed(true) // Explicitly mark as "create new" (not update)
    setShowFeedStyleModal(true)
  }

  const handleFeedStyleConfirm = async (data: FeedStyleModalData) => {
    // Route to appropriate handler based on modal type
    if (isPreviewFeedModal) {
      await handlePreviewFeedStyleConfirm(data)
    } else {
      // Check if user explicitly wants to create NEW feed (not update existing)
      // OR if there's no existing feed to update
      if (isCreatingNewFeed || !currentFeedId || !feedData?.feed?.id) {
        await handleFullFeedStyleConfirm(data)
      } else {
        // User is updating existing feed
        await handleUpdateFeedStyle(data)
      }
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

      // Refresh the feed data
      router.refresh()
      
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
      
      // Navigate to the new feed
      router.push(`/feed-planner?feedId=${responseData.feedId}`)
      
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
    <div className="overflow-hidden rounded-[20px] border border-[color:var(--app-glass-border)] bg-[rgba(255,255,255,0.74)] shadow-[0_18px_50px_rgba(61,56,48,0.08)] backdrop-blur-[18px]">
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 space-y-2">
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
            <span className="truncate text-sm sm:text-base font-['Cormorant_Garamond'] font-light text-[color:var(--app-text-primary)]">{feedName}</span>
            <span className="shrink-0 text-[9px] uppercase tracking-[0.16em]" style={{ color: feedColor }}>
              Live
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {access?.isMembership && onToggleGenerationMode && (
              <div className="pl-0.5">
                <MayaModeToggle
                  currentMode={generationMode}
                  onToggle={onToggleGenerationMode}
                  variant="compact"
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
                title="Edit wizard answers"
              >
                Wizard
              </button>
            )}
            {onOpenWelcomeWizard && access?.isPaidBlueprint && (
              <button
                onClick={onOpenWelcomeWizard}
                className={feedHeaderCompactChipClass}
                title="View welcome guide"
              >
                Guide
              </button>
            )}
          </div>
        )}
      </div>

      <div className="px-3 sm:px-4 md:px-8 pb-3 sm:pb-4">
        <div className="flex flex-col md:flex-row md:items-start md:gap-8 mb-3">
          <button
            onClick={onProfileImageClick}
            className="relative group mb-3 h-[72px] w-[72px] shrink-0 rounded-full border border-[color:var(--app-glass-border)] bg-white p-[2px] shadow-[0_12px_32px_rgba(61,56,48,0.10)] transition-opacity hover:opacity-90 sm:h-20 sm:w-20 md:mb-0 md:h-28 md:w-28"
          >
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-[color:var(--glass-border-subtle)] bg-[rgba(15,13,11,0.88)]">
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
                <span className="relative z-10 text-2xl font-bold md:text-4xl" style={{ color: "#F4F0E6" }}>S</span>
              )}
            </div>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-[rgba(15,13,11,0)] transition-all group-hover:bg-[rgba(15,13,11,0.42)]">
              <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity font-medium text-center px-2" style={{ color: "#F4F0E6" }}>
                {hasProfileImage ? "Change" : "Add photo"}
              </span>
            </div>
            {!hasProfileImage && (
              <div className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[4px] border border-[color:var(--app-glass-border)] bg-white px-2 py-0.5 text-[10px] text-[color:var(--app-text-primary)] opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                Click to add profile picture
              </div>
            )}
          </button>

          <div className="flex-1 space-y-3">
            <div className="grid grid-cols-3 gap-2 max-w-sm">
              <div className={feedHeaderStatClass}>
                <div className="text-sm font-semibold text-[color:var(--app-text-primary)]">9</div>
                <div className="text-[11px] text-[color:var(--app-text-secondary)]">posts</div>
              </div>
              <div className={feedHeaderStatClass}>
                <div className="text-sm font-semibold text-[color:var(--app-text-primary)]">1.2K</div>
                <div className="text-[11px] text-[color:var(--app-text-secondary)]">followers</div>
              </div>
              <div className={feedHeaderStatClass}>
                <div className="text-sm font-semibold text-[color:var(--app-text-primary)]">342</div>
                <div className="text-[11px] text-[color:var(--app-text-secondary)]">following</div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-sm font-['Cormorant_Garamond'] font-light text-[color:var(--app-text-primary)]">
                {feedData?.userDisplayName || feedData?.feed?.brand_name || "User"}
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--app-text-secondary)]">
                {hasBio ? feedData.bio.bio_text : "Your Instagram feed strategy created by Maya"}
              </div>
            </div>

            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={handleCreatePreviewFeed}
                disabled={isCreatingPreviewFeed}
                className={`${feedHeaderChipClass} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {isCreatingPreviewFeed ? (
                  <>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <span>Preview</span>
                  </>
                )}
              </button>
              {!access?.isFree && (access?.isPaidBlueprint || access?.isMembership) && (
                <button
                  onClick={handleCreateNewFeedClick}
                  disabled={isCreatingFeed}
                  className={`${feedHeaderChipClass} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {isCreatingFeed ? (
                    <>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <span>New Feed</span>
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
                        <div className="stone-chip h-14 w-14 rounded-full p-[2px] md:h-16 md:w-16">
                          <div className="h-full w-full rounded-full border border-[color:var(--glass-border-subtle)] bg-[rgba(15,13,11,0.88)] p-[2px]">
                            {isColorHighlight ? (
                              <div
                                className="w-full h-full rounded-full flex items-center justify-center"
                                style={{ backgroundColor: highlightColor }}
                              >
                                <span className="text-base md:text-lg font-bold drop-shadow-lg" style={{ color: "#F4F0E6" }}>
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
                        <span className="max-w-[64px] truncate text-center text-xs leading-tight text-[color:var(--app-text-secondary)] md:max-w-[70px]">
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
            setIsPreviewFeedModal(false)
            setIsCreatingNewFeed(false) // Reset flag when modal closes
          }
        }}
        onConfirm={handleFeedStyleConfirm}
        defaultFeedStyle={feedData?.feed?.feed_style || lastFeedStyle}
        defaultFeedStyleVariationId={feedData?.feed?.feed_style_variation_id ?? undefined}
        isLoading={isCreatingFeed || isCreatingPreviewFeed}
        isPreviewFeed={isPreviewFeedModal}
      />
    </div>
  )
}
