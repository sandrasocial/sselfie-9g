"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { ChevronLeft, MoreHorizontal, Plus, Settings, HelpCircle } from "lucide-react"
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

  const { data: userInfo } = useSWR(
    showFeedStyleModal ? "/api/user/info" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  )

  const useFeedPlannerV2 = Boolean(userInfo?.use_feed_planner_v2)
  
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
      // Always update personal brand to sync feedStyle and visualAesthetic
      // This ensures style selections are saved to personal brand
      try {
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
          const status = updateResponse?.status ?? 'unknown'
          const statusText = updateResponse?.statusText ?? 'Unknown error'
          let errorMessage = `HTTP ${status}: ${statusText}`
          let errorData: any = null
          let responseText: string = ''
          
          try {
            responseText = await updateResponse.text()
            console.log('[Feed Header] Error response text:', responseText.substring(0, 500))
            
            if (responseText && responseText.trim()) {
              try {
                errorData = JSON.parse(responseText)
                errorMessage = errorData.details || errorData.error || errorData.message || errorMessage
                console.log('[Feed Header] Parsed error data:', errorData)
              } catch (parseErr) {
                // Not JSON, use text as error message
                errorMessage = responseText.substring(0, 500) || errorMessage
                console.log('[Feed Header] Error response is not JSON, using text:', errorMessage)
              }
            } else {
              // Empty response body - use status-based message
              if (status === 500) {
                errorMessage = 'Internal server error - please check server logs'
              } else if (status === 400) {
                errorMessage = 'Invalid data format - please check your selections'
              } else if (status === 401) {
                errorMessage = 'Unauthorized - please refresh and try again'
              } else if (status === 404) {
                errorMessage = 'User not found - please refresh and try again'
              } else if (status === 413) {
                errorMessage = 'Request too large - data may be corrupted, please try again'
              }
            }
          } catch (parseError) {
            console.error('[Feed Header] Error reading response:', parseError)
            errorMessage = `Failed to read error response: ${parseError instanceof Error ? parseError.message : String(parseError)}`
          }
          
          console.error('[Feed Header] Failed to update personal brand:', {
            status,
            statusText,
            error: errorMessage,
            errorData: errorData || 'No error data',
            responseText: responseText.substring(0, 200) || 'Empty response',
            url: '/api/profile/personal-brand',
            payload: updatePayload,
          })
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

      const response = await fetch('/api/feed/create-free-example', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          feedStyle: data.feedStyle,
          visualAesthetic: data.visualAesthetic,
          feedStyleVariationId: data.feedStyleVariationId,
        }),
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

      const response = await fetch('/api/feed/create-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          feedStyle: data.feedStyle,
          visualAesthetic: data.visualAesthetic,
          feedStyleVariationId: data.feedStyleVariationId,
        }),
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
    <div className="bg-white border-b border-stone-200">
      <div className="flex items-center justify-between px-4 py-3">
        {onBack && (
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-stone-50 rounded-full transition-colors">
            <ChevronLeft size={24} className="text-stone-900" strokeWidth={2} />
          </button>
        )}
        <div className="flex items-center gap-2">
          {/* Color badge */}
          {feedData?.feed?.display_color && (
            <div
              className="w-3 h-3 rounded-full border-2 shrink-0"
              style={{
                backgroundColor: feedData.feed.display_color,
                borderColor: feedData.feed.display_color,
              }}
              title={`Feed color: ${feedData.feed.display_color}`}
            />
          )}
          <span className="text-base font-semibold text-stone-900">{feedName}</span>
          <svg 
            className="w-4 h-4" 
            fill="currentColor" 
            viewBox="0 0 24 24"
            style={{ color: feedColor }}
          >
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div className="flex items-center gap-1">
          {onOpenWizard && (
            <button
              onClick={onOpenWizard}
              className="p-2 hover:bg-stone-50 rounded-full transition-colors"
              title="Edit wizard answers"
            >
              <Settings size={20} className="text-stone-600" strokeWidth={2} />
            </button>
          )}
          {onOpenWelcomeWizard && access?.isPaidBlueprint && (
            <button
              onClick={onOpenWelcomeWizard}
              className="p-2 hover:bg-stone-50 rounded-full transition-colors"
              title="View welcome guide"
            >
              <HelpCircle size={20} className="text-stone-600" strokeWidth={2} />
            </button>
          )}
          {access?.isMembership && onToggleGenerationMode && (
            <div className="px-1">
              <MayaModeToggle
                currentMode={generationMode}
                onToggle={onToggleGenerationMode}
                variant="compact"
              />
            </div>
          )}
          <button className="p-2 -mr-2 hover:bg-stone-50 rounded-full transition-colors">
            <MoreHorizontal size={24} className="text-stone-900" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="px-4 md:px-8 pb-4">
        <div className="flex flex-col md:flex-row md:items-start md:gap-12 mb-4">
          <button
            onClick={onProfileImageClick}
            className="relative group w-20 h-20 md:w-32 md:h-32 rounded-full bg-linear-to-br from-purple-500 via-pink-500 to-orange-500 p-[3px] mb-4 md:mb-0 shrink-0 transition-opacity hover:opacity-90"
          >
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden relative">
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
                <span className="text-2xl md:text-4xl font-bold text-stone-900 relative z-10">S</span>
              )}
            </div>
            <div className="absolute inset-0 bg-stone-950/0 group-hover:bg-stone-950/40 rounded-full transition-all flex items-center justify-center pointer-events-none">
              <span className="text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity font-medium text-center px-2">
                {hasProfileImage ? "Change" : "Add photo"}
              </span>
            </div>
            {!hasProfileImage && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Click to add profile picture
              </div>
            )}
          </button>

          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-sm md:text-base font-semibold text-stone-900">9</div>
                <div className="text-xs md:text-sm text-stone-500">posts</div>
              </div>
              <div className="text-center">
                <div className="text-sm md:text-base font-semibold text-stone-900">1.2K</div>
                <div className="text-xs md:text-sm text-stone-500">followers</div>
              </div>
              <div className="text-center">
                <div className="text-sm md:text-base font-semibold text-stone-900">342</div>
                <div className="text-xs md:text-sm text-stone-500">following</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold text-stone-900">
                {feedData?.userDisplayName || feedData?.feed?.brand_name || "User"}
              </div>
              <div className="text-sm text-stone-900 whitespace-pre-wrap">
                {hasBio ? feedData.bio.bio_text : "Your Instagram feed strategy created by Maya"}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {/* Hide Write Bio and Create Highlights for free users */}
              {!access?.isFree && (
                <button
                  onClick={onWriteBio}
                  className="flex-1 md:flex-none md:px-8 bg-stone-100 hover:bg-stone-200 text-stone-900 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
                >
                  Write Bio
                </button>
              )}
              <button
                onClick={handleCreatePreviewFeed}
                disabled={isCreatingPreviewFeed}
                className="flex-1 md:flex-none md:px-6 bg-stone-100 hover:bg-stone-200 text-stone-900 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {isCreatingPreviewFeed ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>New Preview</span>
                  </>
                )}
              </button>
              {/* Hide "New Feed" button for free users - show for paid blueprint users AND members */}
              {!access?.isFree && (access?.isPaidBlueprint || access?.isMembership) && (
                <button
                  onClick={handleCreateNewFeedClick}
                  disabled={isCreatingFeed}
                  className="flex-1 md:flex-none md:px-8 bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {isCreatingFeed ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>New Feed</span>
                    </>
                  )}
                </button>
              )}
              {!access?.isFree && onCreateHighlights && (
                <button
                  onClick={onCreateHighlights}
                  className="flex-1 md:flex-none md:px-8 bg-stone-100 hover:bg-stone-200 text-stone-900 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
                >
                  Create Highlights
                </button>
              )}
            </div>

            {/* Highlights - below buttons, mobile optimized */}
            {feedData?.highlights && feedData.highlights.length > 0 && (
              <div className="w-full mt-4 -mx-4 px-4 md:mx-0 md:px-0">
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
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-linear-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
                          <div className="w-full h-full rounded-full bg-white p-[2px]">
                            {isColorHighlight ? (
                              <div
                                className="w-full h-full rounded-full flex items-center justify-center"
                                style={{ backgroundColor: highlightColor }}
                              >
                                <span className="text-base md:text-lg font-bold text-white drop-shadow-lg">
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
                        <span className="text-xs text-stone-900 text-center leading-tight max-w-[64px] md:max-w-[70px] truncate">
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
        defaultFeedStyle={feedData?.feed_style || lastFeedStyle}
        defaultFeedStyleVariationId={feedData?.feed_style_variation_id ?? undefined}
        isLoading={isCreatingFeed || isCreatingPreviewFeed}
        isPreviewFeed={isPreviewFeedModal}
        useFeedPlannerV2={useFeedPlannerV2}
      />
    </div>
  )
}

