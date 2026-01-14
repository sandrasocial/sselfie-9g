"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import useSWR, { useSWRConfig } from "swr"
import FeedViewScreen from "@/components/feed-planner/feed-view-screen"
import UnifiedOnboardingWizard from "@/components/onboarding/unified-onboarding-wizard"
import WelcomeWizard from "@/components/feed-planner/welcome-wizard"
import type { FeedPlannerAccess } from "@/lib/feed-planner/access-control"
import UnifiedLoading from "@/components/sselfie/unified-loading"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface FeedPlannerClientProps {
  access?: FeedPlannerAccess // Optional - will be fetched if not provided (for use in SselfieApp)
  userId: string
  userName?: string | null
}

/**
 * Phase 3: Feed Planner Client Wrapper
 * 
 * Handles wizard logic and shows FeedViewScreen after wizard completion
 * - Free users: Always show wizard (unless already completed)
 * - Paid first-time users: Show wizard (skip free example)
 * - Paid returning users: Skip wizard
 */
export default function FeedPlannerClient({ access: accessProp, userId, userName }: FeedPlannerClientProps) {
  const [showWizard, setShowWizard] = useState(false)
  const [showWelcomeWizard, setShowWelcomeWizard] = useState(false)
  const [isCheckingWizard, setIsCheckingWizard] = useState(true)
  // State to track if we should open wizard at step 4 (visual style selection)
  const [wizardInitialStep, setWizardInitialStep] = useState<number | undefined>(undefined)
  const { mutate } = useSWRConfig()
  
  // 🔴 CRITICAL: Track if welcome wizard has been auto-shown in this session
  // This prevents showing it multiple times on refresh before the API updates
  const welcomeWizardAutoShownRef = useRef(false)

  // Handler to open wizard from header button
  const handleOpenWizard = () => {
    setShowWizard(true)
  }

  // Handler to open welcome wizard from header button (for paid blueprint users)
  const handleOpenWelcomeWizard = () => {
    setShowWelcomeWizard(true)
  }

  // Fetch access control if not provided (for use in SselfieApp)
  const { data: accessData, isLoading: isLoadingAccess } = useSWR<FeedPlannerAccess>(
    accessProp ? null : "/api/feed-planner/access",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  )

  // Use provided access or fetched access
  const access = accessProp || accessData

  // Fetch onboarding status to determine if wizard is needed
  const { data: onboardingStatus, isLoading: isLoadingOnboarding } = useSWR(
    "/api/user/onboarding-status",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
      // For new users, fetch immediately without deduplication delay
      revalidateOnMount: true,
      revalidateOnReconnect: false,
    }
  )

  // Fetch user info for wizard
  const { data: userInfo } = useSWR("/api/user/info", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  // Get user's display name (prefer name from userInfo, fallback to userName prop, then "there")
  const displayName = userInfo?.name && !userInfo.name.includes('@') 
    ? userInfo.name 
    : (userName && !userName.includes('@') 
      ? userName 
      : "there")

  // Fetch existing personal brand data (always fetch, SWR handles caching)
  // This is the single source of truth - no localStorage needed
  const { data: personalBrandData, mutate: mutatePersonalBrand, isLoading: isLoadingPersonalBrand } = useSWR(
    "/api/profile/personal-brand",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
      // Prevent excessive re-fetching
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    }
  )

  // Fetch welcome wizard status (for paid blueprint users)
  const { data: welcomeStatus, isLoading: isLoadingWelcome } = useSWR(
    "/api/feed-planner/welcome-status",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  )

  // Determine if wizard is needed
  // React to access and onboardingStatus changes, but respect manual close
  useEffect(() => {
    console.log('[FeedPlannerClient] Wizard check:', {
      isLoadingOnboarding,
      isLoadingAccess,
      hasOnboardingStatus: !!onboardingStatus,
      hasAccess: !!access,
      onboardingStatus,
      access,
    })

    // Wait for both access and onboarding status to load
    if (isLoadingOnboarding || (!accessProp && isLoadingAccess)) {
      setIsCheckingWizard(true)
      return
    }

    // Both APIs have finished loading - now we can make a decision
    // If onboardingStatus is null/undefined after loading, it means user doesn't exist or API error
    // In this case, we should still show wizard for new users (default behavior)
    if (!onboardingStatus) {
      // Data loaded but is null - could be new user or API error
      // If we have access data, use it to decide
      if (access) {
        // For free users without onboarding data, show wizard
        if (access.isFree) {
          console.log('[FeedPlannerClient] ✅ Showing wizard for new free user')
          setShowWizard(true)
          setIsCheckingWizard(false)
          return
        }
      }
      // Otherwise, wait for access or don't show wizard
      setIsCheckingWizard(false)
      setShowWizard(false)
      return
    }

    // Wait for access to be loaded before determining wizard
    if (!access) {
      // Access not loaded yet - but we can still check onboarding status
      // If onboarding is completed, we know to hide wizard
      if (onboardingStatus.onboarding_completed) {
        setShowWizard(false)
        setIsCheckingWizard(false)
        return
      }
      // For new users (not completed), wait for access to load
      setIsCheckingWizard(true)
      return
    }

    const hasBaseWizardData = onboardingStatus.hasBaseWizardData || false
    const hasExtensionData = onboardingStatus.hasExtensionData || false
    const onboardingCompleted = onboardingStatus.onboarding_completed || false

    // If onboarding is completed, don't show wizard (even if data seems missing - API is source of truth)
    if (onboardingCompleted) {
      setShowWizard(false)
      setIsCheckingWizard(false)
      return
    }

    // Free users: Show wizard if not completed (missing base or extension data OR onboarding not marked complete)
    if (access.isFree) {
      // Wizard should show if:
      // 1. Missing base wizard data, OR
      // 2. Missing extension data, OR
      // 3. Onboarding not marked complete
      // Note: We check onboarding_completed as the final gate (set when wizard completes)
      // Don't check hasSelfies here - that's handled in the wizard itself (step 4 validation)
      const needsWizard = !hasBaseWizardData || !hasExtensionData || !onboardingCompleted
      console.log('[FeedPlannerClient] Free user wizard check:', {
        hasBaseWizardData,
        hasExtensionData,
        onboardingCompleted,
        needsWizard,
      })
      setShowWizard(needsWizard)
      setIsCheckingWizard(false)
      return
    }

    // Paid users (first-time): Show wizard if missing extension data (skip free example)
    // Paid users (returning): Skip wizard if already completed
    if (access.isPaidBlueprint) {
      // First-time paid users need wizard if missing extension data
      // Returning paid users skip wizard if onboarding completed
      const needsWizard = !hasExtensionData && !onboardingCompleted
      setShowWizard(needsWizard)
      setIsCheckingWizard(false)
      return
    }

    // One-time and membership users: Skip wizard (not needed)
    setShowWizard(false)
    setIsCheckingWizard(false)
  }, [isLoadingOnboarding, isLoadingAccess, onboardingStatus, access, accessProp]) // React to access and onboardingStatus changes

  // Check if welcome wizard should be shown (for paid blueprint users only)
  // 🔴 CRITICAL: Only show automatically ONCE for first-time users
  // After that, users can access it via the help button (already implemented)
  useEffect(() => {
    // Only check for paid blueprint users
    if (!access || !access.isPaidBlueprint) {
      return
    }

    // Wait for welcome status to load completely
    // Don't show wizard if still loading (prevents showing on every refresh)
    if (isLoadingWelcome) {
      return
    }

    // 🔴 CRITICAL LOGIC: Only show automatically ONCE for first-time users
    // - If welcomeStatus is undefined: Don't show (still loading or error)
    // - If welcomeStatus.welcomeShown is true: Don't show (already shown in database)
    // - If welcomeStatus.welcomeShown is false AND not already auto-shown: Show (first-time user, once per session)
    // - If already auto-shown in this session: Don't show again (prevents showing on refresh)
    
    // Check if welcome status data exists
    if (!welcomeStatus || typeof welcomeStatus !== 'object') {
      // No status data - don't show (could be error or still loading)
      console.log('[FeedPlannerClient] ⚠️ Welcome status not available - not showing wizard')
      setShowWelcomeWizard(false)
      return
    }

    // Check if welcome wizard has been shown in database
    const hasBeenShownInDB = welcomeStatus.welcomeShown === true

    if (hasBeenShownInDB) {
      // Already shown in database - don't show again (this prevents showing on refresh)
      console.log('[FeedPlannerClient] ✅ Welcome wizard already shown in database - not showing automatically')
      welcomeWizardAutoShownRef.current = true // Mark as shown
      setShowWelcomeWizard(false)
    } else if (!welcomeWizardAutoShownRef.current) {
      // Not shown yet AND not already auto-shown in this session - show for first-time user (only once)
      console.log('[FeedPlannerClient] ✅ Showing welcome wizard for first-time paid user (once per session)')
      welcomeWizardAutoShownRef.current = true // Mark as shown to prevent showing again on refresh
      setShowWelcomeWizard(true)
    } else {
      // Already auto-shown in this session - don't show again (prevents showing on refresh before API updates)
      console.log('[FeedPlannerClient] ✅ Welcome wizard already auto-shown in this session - not showing again')
      setShowWelcomeWizard(false)
    }
  }, [access, welcomeStatus, isLoadingWelcome])

  // Handle wizard completion
  const handleWizardComplete = async (data: {
    businessType: string
    idealAudience: string
    audienceChallenge: string
    audienceTransformation: string
    transformationStory: string
    currentSituation?: string
    futureVision?: string
    visualAesthetic: string[]
    feedStyle: string
    selfieImages: string[]
    fashionStyle?: string[]
    brandInspiration?: string
    inspirationLinks?: string
  }) => {
    console.log("[Feed Planner Wizard] ✅ Unified wizard completed with data:", data)
    
    // Close wizard immediately BEFORE cache invalidation
    // This prevents the useEffect from re-opening it while cache is refreshing
    setShowWizard(false)
    
    // Invalidate SWR cache to refresh data without full page reload
    // CRITICAL: Wait for onboarding-status to refresh first, as it controls wizard visibility
    await mutate("/api/user/onboarding-status", undefined, { revalidate: true })
    
    // Then refresh other caches
    await Promise.all([
      mutate("/api/feed-planner/access"),
      mutate("/api/feed/latest"),
      mutate("/api/blueprint/state"),
      mutate("/api/images?type=avatar"), // Refresh selfie images
      mutatePersonalBrand(), // Explicitly refresh personal brand data
    ])
    
    console.log("[Feed Planner Wizard] ✅ Cache invalidated, wizard closed, feed planner should refresh")
  }

  // Memoize existingData BEFORE any conditional returns (Rules of Hooks)
  // Use a stable key based on the actual data values to prevent unnecessary recalculations
  const existingData = useMemo(() => {
    if (!personalBrandData?.exists || !personalBrandData?.data) {
      return {}
    }

    const data = personalBrandData.data

    // Map personal brand data to unified wizard format
    // API already returns camelCase, so use it directly
    return {
      businessType: data.businessType || "",
      idealAudience: data.idealAudience || "",
      audienceChallenge: data.audienceChallenge || "",
      audienceTransformation: data.audienceTransformation || "",
      transformationStory: data.transformationStory || "",
      currentSituation: data.currentSituation || "",
      futureVision: data.futureVision || "",
      visualAesthetic: data.visualAesthetic
        ? (typeof data.visualAesthetic === "string"
            ? (() => {
                try {
                  return JSON.parse(data.visualAesthetic)
                } catch (e) {
                  console.warn("[Feed Planner Client] Failed to parse visualAesthetic:", e)
                  return Array.isArray(data.visualAesthetic) ? data.visualAesthetic : []
                }
              })()
            : Array.isArray(data.visualAesthetic)
            ? data.visualAesthetic
            : [])
        : [],
      feedStyle: data.settingsPreference
        ? (typeof data.settingsPreference === "string"
            ? (() => {
                try {
                  const parsed = JSON.parse(data.settingsPreference)
                  return Array.isArray(parsed) ? parsed[0] || "" : parsed || ""
                } catch (e) {
                  console.warn("[Feed Planner Client] Failed to parse settingsPreference:", e)
                  return ""
                }
              })()
            : Array.isArray(data.settingsPreference)
            ? data.settingsPreference[0] || ""
            : "")
        : "",
      fashionStyle: data.fashionStyle
        ? (typeof data.fashionStyle === "string"
            ? (() => {
                try {
                  return JSON.parse(data.fashionStyle)
                } catch (e) {
                  console.warn("[Feed Planner Client] Failed to parse fashionStyle:", e)
                  return Array.isArray(data.fashionStyle) ? data.fashionStyle : []
                }
              })()
            : Array.isArray(data.fashionStyle)
            ? data.fashionStyle
            : [])
        : [],
      brandInspiration: data.brandInspiration || "",
      inspirationLinks: data.inspirationLinks || "",
      contentPillars: data.contentPillars
        ? (typeof data.contentPillars === "string"
            ? (() => {
                try {
                  return JSON.parse(data.contentPillars)
                } catch (e) {
                  console.warn("[Feed Planner Client] Failed to parse contentPillars:", e)
                  return Array.isArray(data.contentPillars) ? data.contentPillars : []
                }
              })()
            : Array.isArray(data.contentPillars)
            ? data.contentPillars
            : [])
        : [],
      // Note: selfieImages are loaded separately via /api/images?type=avatar
      // They're not stored in user_personal_brand, so we don't include them here
      // The wizard component will fetch them via SWR
    }
    // Create a stable key from the actual data values, not the object reference
    // This prevents recalculation when the object reference changes but data is the same
  }, [
    personalBrandData?.exists,
    personalBrandData?.data?.businessType,
    personalBrandData?.data?.idealAudience,
    personalBrandData?.data?.transformationStory,
    // Use JSON.stringify for arrays/objects to create stable keys
    personalBrandData?.data?.visualAesthetic ? JSON.stringify(personalBrandData.data.visualAesthetic) : null,
    personalBrandData?.data?.settingsPreference ? JSON.stringify(personalBrandData.data.settingsPreference) : null,
    personalBrandData?.data?.fashionStyle ? JSON.stringify(personalBrandData.data.fashionStyle) : null,
    personalBrandData?.data?.contentPillars ? JSON.stringify(personalBrandData.data.contentPillars) : null,
  ])

  // Show loading while checking wizard status
  if (isCheckingWizard) {
    return <UnifiedLoading message="Loading Feed Planner..." />
  }

  // Show wizard if needed
  if (showWizard) {
    // Removed excessive logging that was causing re-renders

    return (
      <UnifiedOnboardingWizard
        isOpen={true}
        onComplete={handleWizardComplete}
        onDismiss={() => {
          // Don't allow dismissing wizard - user must complete it
          // But we can redirect to home if they really want to leave
          window.location.href = "/studio"
        }}
        userName={displayName}
        userEmail={userInfo?.email || null}
        existingData={existingData}
        initialStep={wizardInitialStep} // Start at step 4 if user chose "Choose New Style"
      />
    )
  }

  // Handle welcome wizard completion
  const handleWelcomeWizardComplete = async () => {
    console.log('[FeedPlannerClient] ✅ Welcome wizard completed - marking as shown')
    
    // Close wizard immediately (optimistic update)
    setShowWelcomeWizard(false)
    
    // Mark as shown in ref (prevents showing again on refresh before API updates)
    welcomeWizardAutoShownRef.current = true
    
    // Mark welcome wizard as shown in database
    try {
      const response = await fetch("/api/feed-planner/welcome-status", {
        method: "POST",
      })
      
      if (!response.ok) {
        console.error('[FeedPlannerClient] ⚠️ Failed to mark welcome wizard as shown:', response.status)
      } else {
        console.log('[FeedPlannerClient] ✅ Welcome wizard marked as shown in database')
      }
    } catch (error) {
      console.error('[FeedPlannerClient] ⚠️ Error marking welcome wizard as shown:', error)
    }
    
    // Refresh welcome status to update SWR cache
    // This ensures the useEffect won't show it again on refresh
    await mutate("/api/feed-planner/welcome-status")
    
    console.log('[FeedPlannerClient] ✅ Welcome wizard closed and status refreshed')
  }

  // Handle "Use Preview Style" - create feed with existing data
  const handleUsePreviewStyle = async () => {
    console.log("[Welcome Wizard] User chose to use preview style")
    // The existing onboarding data will be used when creating the feed
    // We just need to trigger feed creation - this happens automatically
    // when the user completes onboarding or when they navigate to feed planner
    // For now, we'll just close the welcome wizard and let the normal flow continue
  }

  // Handle "Choose New Style" - open onboarding wizard at step 4 (visual style)
  const handleChooseNewStyle = () => {
    console.log("[Welcome Wizard] User chose to select new style - opening wizard at step 4")
    // Step 4 is the visual style selection step (0-indexed: welcome=0, business=1, audience=2, story=3, visual=4)
    setWizardInitialStep(4)
    setShowWelcomeWizard(false)
    setShowWizard(true)
  }

  // Show Feed Planner with welcome wizard overlay if needed
  return (
    <>
      <FeedViewScreen 
        access={access} 
        onOpenWizard={handleOpenWizard}
        onOpenWelcomeWizard={access?.isPaidBlueprint ? handleOpenWelcomeWizard : undefined}
      />
      {showWelcomeWizard && (
        <WelcomeWizard
          open={showWelcomeWizard}
          onComplete={handleWelcomeWizardComplete}
          onDismiss={handleWelcomeWizardComplete}
          onUsePreviewStyle={handleUsePreviewStyle}
          onChooseNewStyle={handleChooseNewStyle}
        />
      )}
    </>
  )
}
