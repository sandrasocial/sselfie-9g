"use client"

import { useState, type ReactNode } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import FeedStyleModal, { type FeedStyle, type FeedStyleModalData } from "./feed-style-modal"
import useSWR, { mutate } from "swr"
import { useFeedNav } from "./feed-nav-context"

interface FeedHeaderProps {
  feedData: any
  currentFeedId: number
  onBack?: () => void
  onProfileImageClick?: () => void
  onWriteBio: () => void
  onCreateHighlights?: () => void
  onHighlightClick?: (highlight: any) => void
  onAddRow?: () => void
  isAddingRow?: boolean
  onOpenWizard?: () => void // Callback to open wizard
  onOpenWelcomeWizard?: () => void // Callback to open welcome wizard (for paid blueprint users)
  access?: { isFree?: boolean; isPaidBlueprint?: boolean; isMembership?: boolean } // Access control to hide buttons for free users
  workspaceNavigation?: ReactNode
  showProfileDetails?: boolean
  onOpenVisualDirection?: () => void
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

const feedHeaderCompactChipClass =
  "min-h-11 rounded-[8px] border border-[#C5C6C8] bg-white px-3 text-[10px] uppercase tracking-[0.14em] text-[#4F5052] transition-colors hover:border-[#0D0E10]/40 hover:text-[#0D0E10]"

const feedHeaderChipClass =
  "min-h-11 rounded-[8px] border border-[#C5C6C8] bg-white px-3 text-[10px] uppercase tracking-[0.16em] text-[#4F5052] transition-colors hover:border-[#0D0E10]/40 hover:text-[#0D0E10] sm:px-4 sm:text-[11px]"

const feedHeaderPrimaryChipClass =
  "min-h-11 rounded-[8px] border border-[#0D0E10] bg-[#0D0E10] px-4 text-[10px] uppercase tracking-[0.16em] text-[color:var(--app-btn-primary-text)] transition-opacity hover:opacity-90 sm:text-[11px]"

export default function FeedHeader({
  feedData,
  currentFeedId,
  onBack,
  onProfileImageClick,
  onWriteBio,
  onCreateHighlights,
  onHighlightClick,
  onAddRow,
  isAddingRow = false,
  onOpenWizard,
  onOpenWelcomeWizard,
  access,
  workspaceNavigation,
  showProfileDetails = true,
  onOpenVisualDirection,
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
  const needsCaptions = feedPosts.length > 0 && feedPosts.every(p => !p?.caption)
  const readyPosts = feedPosts.filter(post => Boolean(post?.image_url && post?.caption)).length
  const postedPosts = feedPosts.filter(post => Boolean(post?.is_posted)).length

  // Fetch user's last feed style from personal brand
  const { data: personalBrandData } = useSWR("/api/profile/personal-brand", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // Cache for 1 minute
  })

  // V2 is always enabled - no need to check flag
  const useFeedPlannerV2 = true

  // Extract last feed style from settings_preference[0]
  const lastFeedStyle: FeedStyle | null = personalBrandData?.data?.settingsPreference?.[0] || null
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
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to generate captions" }))
        throw new Error(errorData.error || "Failed to generate captions")
      }
      await Promise.all([mutate(`/api/feed/${currentFeedId}`), mutate("/api/feed/latest")])
      toast({
        title: "Captions created",
        description: "Maya wrote captions for this month's posts.",
      })
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
    if (onOpenVisualDirection) {
      onOpenVisualDirection()
      return
    }
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
      // A curated choice becomes a saved personal preference. Maya-decided, custom and
      // inspiration directions belong to this grid and must not write an empty preset.
      if (data.feedStyle)
        try {
          const currentBrandResponse = await fetch("/api/profile/personal-brand", {
            credentials: "include",
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
                  if (typeof s !== "string") return false
                  if (s.length > 100) return false
                  if (s.includes('{\\"') || s.includes("\\\\")) return false
                  return validStyles.some(style => style.toLowerCase() === s.toLowerCase().trim())
                })
                .map((s: string) => {
                  const trimmed = s.trim()
                  if (!useFeedPlannerV2) return trimmed.toLowerCase()
                  return (
                    validStyles.find(style => style.toLowerCase() === trimmed.toLowerCase()) ||
                    trimmed
                  )
                })
            }
          }

          const updatedSettingsPreference = currentSettingsPreference
            ? [
                data.feedStyle,
                ...currentSettingsPreference.filter((s: string) => s !== data.feedStyle),
              ]
            : [data.feedStyle]

          const updatePayload: Record<string, any> = {
            settingsPreference: updatedSettingsPreference,
          }

          if (data.feedStyleVariationId !== undefined) {
            updatePayload.feedStyleVariationId = data.feedStyleVariationId
          }

          if (
            data.visualAesthetic &&
            Array.isArray(data.visualAesthetic) &&
            data.visualAesthetic.length > 0
          ) {
            updatePayload.visualAesthetic = data.visualAesthetic
          }

          await fetch("/api/profile/personal-brand", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(updatePayload),
          })
        } catch (error) {
          console.error("[Feed Header] Error updating personal brand:", error)
          // Continue with feed update even if personal brand fails
        }

      // Update the feed's style and variation
      const updateResponse = await fetch(`/api/feed/${currentFeedId}/update-style`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      })

      if (!updateResponse.ok) {
        const error = await updateResponse
          .json()
          .catch(() => ({ error: "Failed to update feed style" }))
        throw new Error(error.error || "Failed to update feed style")
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
        description:
          error instanceof Error ? error.message : "Failed to update feed style. Please try again.",
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
      // Curated choices update the reusable profile preference. Other direction modes stay
      // scoped to this grid and are persisted by create-manual.
      // This ensures style selections are saved to personal brand
      if (data.feedStyle)
        try {
          console.log("[Feed Header] Syncing personal brand with feed style selection:", {
            feedStyle: data.feedStyle,
            visualAesthetic: data.visualAesthetic,
          })

          // Fetch current personal brand to preserve existing settings_preference
          const currentBrandResponse = await fetch("/api/profile/personal-brand", {
            credentials: "include",
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
                  if (typeof s !== "string") return false
                  // If it's a very long string (>100 chars) or contains nested JSON patterns, it's corrupted
                  if (s.length > 100) return false
                  if (s.includes('{\\"') || s.includes("\\\\")) return false
                  // Only keep simple strings that match valid feed styles
                  return validStyles.some(style => style.toLowerCase() === s.toLowerCase().trim())
                })
                .map((s: string) => {
                  const trimmed = s.trim()
                  if (!useFeedPlannerV2) return trimmed.toLowerCase()
                  return (
                    validStyles.find(style => style.toLowerCase() === trimmed.toLowerCase()) ||
                    trimmed
                  )
                })
            }
          }

          // Update settings_preference: set feedStyle as first element, preserve rest (now sanitized)
          const updatedSettingsPreference = currentSettingsPreference
            ? [
                data.feedStyle,
                ...currentSettingsPreference.filter((s: string) => s !== data.feedStyle),
              ]
            : [data.feedStyle]

          // Build update payload - only include fields that have values
          const updatePayload: Record<string, any> = {
            settingsPreference: updatedSettingsPreference,
          }

          if (data.feedStyleVariationId !== undefined) {
            updatePayload.feedStyleVariationId = data.feedStyleVariationId
          }

          // Only include visualAesthetic if it's provided and not empty
          if (
            data.visualAesthetic &&
            Array.isArray(data.visualAesthetic) &&
            data.visualAesthetic.length > 0
          ) {
            updatePayload.visualAesthetic = data.visualAesthetic
          }

          console.log("[Feed Header] Sending personal brand update payload:", updatePayload)

          const updateResponse = await fetch("/api/profile/personal-brand", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(updatePayload),
          })

          if (updateResponse.ok) {
            const updateResult = await updateResponse.json()
            console.log("[Feed Header] Personal brand synced successfully:", updateResult)
            // Revalidate SWR cache to refresh the modal data
            await mutate("/api/profile/personal-brand")
            console.log("[Feed Header] SWR cache revalidated")
          } else {
            // Try to get error details from response
            let errorData: any = null
            const status = updateResponse?.status ?? "unknown"
            const statusText = updateResponse?.statusText ?? "Unknown error"
            let errorMessage = `HTTP ${status}: ${statusText}`

            try {
              if (!updateResponse) {
                errorMessage = "No response received from server"
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
                    errorMessage = "Internal server error - please try again"
                  } else if (status === 400) {
                    errorMessage = "Invalid data format - please check your selections"
                  } else if (status === 401) {
                    errorMessage = "Unauthorized - please refresh and try again"
                  } else if (status === 404) {
                    errorMessage = "User not found - please refresh and try again"
                  }
                }
              }
            } catch (parseError) {
              console.warn("[Feed Header] Could not parse error response:", parseError)
              errorMessage = `Failed to parse error response: ${parseError instanceof Error ? parseError.message : String(parseError)}`
            }

            const errorLog: Record<string, any> = {
              status: status,
              statusText: statusText,
              error: errorMessage,
              url: "/api/profile/personal-brand",
            }

            if (errorData !== null) {
              errorLog.errorData = errorData
            } else {
              errorLog.errorData = "No error data in response"
            }

            console.error("[Feed Header] Failed to update personal brand:", errorLog)

            // Don't throw - continue with feed creation even if personal brand update fails
            // This is intentional - feed creation should succeed even if personal brand sync fails
          }
        } catch (error) {
          // Network error or fetch failure
          const errorMessage = error instanceof Error ? error.message : String(error)
          const errorStack = error instanceof Error ? error.stack : undefined
          console.error("[Feed Header] Network error updating personal brand:", {
            error: errorMessage,
            errorType: error instanceof Error ? error.constructor.name : typeof error,
            stack: errorStack,
            url: "/api/profile/personal-brand",
          })
          // Continue with feed creation even if personal brand update fails
          // This is intentional - feed creation should succeed even if personal brand sync fails
        }

      // CRITICAL: Always pass feedStyleVariationId to feed creation (even if null)
      // This ensures the feed uses the user's selection, not a fallback
      const feedCreationPayload = { ...data }
      console.log("[Feed Header] Creating full feed with:", {
        feedStyle: feedCreationPayload.feedStyle,
        feedStyleVariationId: feedCreationPayload.feedStyleVariationId,
      })

      const response = await fetch("/api/feed/create-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(feedCreationPayload),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to create feed" }))
        throw new Error(error.error || "Failed to create feed")
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
        description:
          error instanceof Error ? error.message : "Failed to create feed. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingFeed(false)
    }
  }

  const hasProfileImage = !!feedData?.feed?.profile_image_url
  const hasBio = !!feedData?.bio?.bio_text

  // Get feed name (title) - prefer title, then brand_name, then fallback
  const feedName =
    feedData?.feed?.title || feedData?.feed?.brand_name || `Feed ${currentFeedId}` || "My Feed"
  const profileUsername =
    feedData?.feed?.username ||
    String(feedData?.userDisplayName || feedData?.feed?.brand_name || "mybrand")
      .toLowerCase()
      .replace(/[^a-z0-9._]/g, "")
  const displayName = feedData?.userDisplayName || feedData?.feed?.brand_name || "Your brand"

  return (
    <div className="overflow-hidden rounded-[14px] border border-[#C5C6C8]/35 bg-[#F8FAFA] shadow-[0_1px_2px_rgba(13,14,16,0.04),0_10px_28px_rgba(13,14,16,0.06)]">
      <div className="space-y-2 border-b border-[#C5C6C8]/40 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            {onBack && (
              <button onClick={onBack} className={feedHeaderCompactChipClass}>
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
            <span className="truncate font-serif text-[17px] font-light leading-tight text-[#0D0E10] sm:text-[19px]">
              {feedName}
            </span>
          </div>
          {onOpenWizard ? (
            <button
              onClick={onOpenWizard}
              className={`${feedHeaderCompactChipClass} shrink-0`}
              title="Edit your grid setup"
            >
              {/* DRAFT UX copy for Sandra approval before release. */}
              Content context
            </button>
          ) : (
            <div className="shrink-0" aria-hidden="true" />
          )}
        </div>

        {onOpenWelcomeWizard && (access?.isPaidBlueprint || access?.isMembership) && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenWelcomeWizard}
              className={feedHeaderCompactChipClass}
              title="View welcome guide"
            >
              Quick guide
            </button>
          </div>
        )}
      </div>

      {workspaceNavigation}

      <div className={showProfileDetails ? "px-4 py-5 sm:px-6 md:px-8 md:py-7" : "hidden"}>
        <div className="flex items-start gap-4 md:gap-8">
          <button
            onClick={onProfileImageClick}
            disabled={!onProfileImageClick}
            aria-label={
              onProfileImageClick
                ? hasProfileImage
                  ? "Change profile image"
                  : "Add profile image"
                : "Profile image"
            }
            className="group relative h-[76px] w-[76px] shrink-0 rounded-full border border-[#C5C6C8]/60 bg-white p-[3px] transition-opacity enabled:hover:opacity-90 disabled:cursor-default sm:h-24 sm:w-24 md:h-32 md:w-32"
          >
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-[#C5C6C8]/40 bg-[#0D0E10]">
              {hasProfileImage ? (
                <Image
                  src={feedData.feed.profile_image_url}
                  alt="Profile"
                  fill
                  className="object-cover object-[center_20%]"
                  sizes="(max-width: 768px) 80px, 128px"
                  style={{ borderRadius: "50%" }}
                />
              ) : (
                <span className="relative z-10 font-serif text-2xl font-light text-[color:var(--app-btn-primary-text)] md:text-4xl">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {onProfileImageClick && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-[#0D0E10]/0 transition-all group-hover:bg-[#0D0E10]/50">
                <span className="px-2 text-center text-xs font-medium text-[color:var(--app-btn-primary-text)] opacity-0 transition-opacity group-hover:opacity-100">
                  {hasProfileImage ? "Change" : "Add photo"}
                </span>
              </div>
            )}
            {onProfileImageClick && !hasProfileImage && (
              <div className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[4px] border border-[#C5C6C8]/50 bg-white px-2 py-0.5 text-[10px] text-[#0D0E10] opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                Click to add profile picture
              </div>
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <h1 className="font-serif text-[21px] font-light leading-none text-[#0D0E10] sm:text-[25px]">
                {profileUsername}
              </h1>
              <div className="flex items-center gap-4 text-[11px] text-[#4F5052] sm:text-[12px]">
                <span>
                  <strong className="font-medium text-[#0D0E10]">{feedPosts.length}</strong> posts
                </span>
                <span>
                  <strong className="font-medium text-[#0D0E10]">{readyPosts}</strong> ready
                </span>
                <span>
                  <strong className="font-medium text-[#0D0E10]">{postedPosts}</strong> posted
                </span>
              </div>
            </div>
            <p className="mt-4 text-[13px] font-medium text-[#0D0E10]">{displayName}</p>
            {hasBio ? (
              <p className="mt-1 max-w-xl whitespace-pre-wrap text-[13px] leading-relaxed text-[#4F5052]">
                {feedData.bio.bio_text}
              </p>
            ) : (
              <div className="mt-1 max-w-xl">
                <p className="text-[13px] leading-relaxed text-[#6D6E70]">
                  Add a short bio so people know what you do and who you help.
                </p>
                {!access?.isFree ? (
                  <button
                    type="button"
                    onClick={onWriteBio}
                    className="mt-1 min-h-11 text-[12px] font-medium text-[#0D0E10] underline underline-offset-4"
                  >
                    Create bio with Maya
                  </button>
                ) : null}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {!access?.isFree ? (
                <button
                  type="button"
                  onClick={handleChooseLookClick}
                  className={feedHeaderChipClass}
                >
                  Visual direction
                </button>
              ) : null}
              {!access?.isFree && (access?.isPaidBlueprint || access?.isMembership) ? (
                <button
                  type="button"
                  onClick={handleCreateNewFeedClick}
                  disabled={isCreatingFeed}
                  className={`${feedHeaderPrimaryChipClass} disabled:opacity-50`}
                >
                  {isCreatingFeed ? "Creating…" : "New grid"}
                </button>
              ) : null}
              {!access?.isFree && onAddRow && feedPosts.length < 30 ? (
                <button
                  type="button"
                  onClick={onAddRow}
                  disabled={isAddingRow}
                  className={`${feedHeaderChipClass} disabled:opacity-50`}
                >
                  {isAddingRow ? "Adding…" : "Add a row"}
                </button>
              ) : null}
              {!access?.isFree && hasBio ? (
                <button type="button" onClick={onWriteBio} className={feedHeaderChipClass}>
                  Edit bio
                </button>
              ) : null}
              {!access?.isFree && needsCaptions ? (
                <button
                  type="button"
                  onClick={handleCreateCaptions}
                  disabled={isGeneratingCaptions}
                  className={`${feedHeaderChipClass} disabled:opacity-50`}
                >
                  {isGeneratingCaptions ? "Creating…" : "Create captions"}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-start gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:ml-1">
          {Array.isArray(feedData?.highlights) && feedData.highlights.length > 0
            ? feedData.highlights.map((highlight: any) => (
                <button
                  type="button"
                  key={highlight.id || highlight.title}
                  onClick={() => onHighlightClick?.(highlight)}
                  aria-label={`Open ${highlight.title} story sequence`}
                  className="w-16 shrink-0 text-center"
                >
                  <div className="relative mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-[#C5C6C8] bg-[#EEEDE9] text-[14px] font-medium text-[#4F5052]">
                    {highlight.image_url && !String(highlight.image_url).startsWith("#") ? (
                      <Image
                        src={highlight.image_url}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover object-[center_20%]"
                      />
                    ) : (
                      highlight.title?.charAt(0).toUpperCase() || "H"
                    )}
                  </div>
                  <p className="mt-1.5 truncate text-[10px] text-[#4F5052]">{highlight.title}</p>
                </button>
              ))
            : ["About", "Work", "Life"].map(label => (
                <div key={label} className="w-16 shrink-0 text-center">
                  <div className="mx-auto h-14 w-14 rounded-full border border-dashed border-[#C5C6C8] bg-white" />
                  <p className="mt-1.5 text-[10px] text-[#6D6E70]">{label}</p>
                </div>
              ))}
          {!access?.isFree && onCreateHighlights ? (
            <button
              type="button"
              onClick={onCreateHighlights}
              aria-label="Create highlights with Maya"
              className="w-16 shrink-0 text-center text-[#0D0E10]"
            >
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#C5C6C8] bg-white text-[24px] font-light">
                +
              </span>
              <span className="mt-1.5 block text-[10px] text-[#4F5052]">New</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Feed Style Selection Modal */}
      <FeedStyleModal
        open={showFeedStyleModal}
        onOpenChange={open => {
          setShowFeedStyleModal(open)
          if (!open) {
            setIsCreatingNewFeed(false) // Reset flag when modal closes
          }
        }}
        onConfirm={handleFeedStyleConfirm}
        mode={isCreatingNewFeed ? "new" : "style"}
        defaultFeedStyle={lastFeedStyle}
        defaultFeedStyleVariationId={
          lastFeedStyle ? (feedData?.feed?.feed_style_variation_id ?? undefined) : undefined
        }
        isLoading={isCreatingFeed}
      />
    </div>
  )
}
