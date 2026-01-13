"use client"

import { useState, useEffect, useMemo } from "react"
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
  const { mutate } = useSWRConfig()

  // Handler to open wizard from header button
  const handleOpenWizard = () => {
    setShowWizard(true)
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

  // Get user's display name (prefer name from userInfo, fallback to userName prop, then email, then "there")
  const displayName = userInfo?.name && !userInfo.name.includes('@') 
    ? userInfo.name 
    : (userName && !userName.includes('@') 
      ? userName 
      : (userInfo?.email && !userInfo.email.includes('@') 
        ? userInfo.email.split('@')[0] 
        : "there"))

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
  useEffect(() => {
    // Only check for paid blueprint users
    if (!access || !access.isPaidBlueprint) {
      return
    }

    // Wait for welcome status to load
    if (isLoadingWelcome || !welcomeStatus) {
      return
    }

    // Show welcome wizard if not shown yet
    if (!welcomeStatus.welcomeShown) {
      setShowWelcomeWizard(true)
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
            ? JSON.parse(data.visualAesthetic)
            : data.visualAesthetic)
        : [],
      feedStyle: data.settingsPreference
        ? (typeof data.settingsPreference === "string"
            ? JSON.parse(data.settingsPreference)[0] || ""
            : Array.isArray(data.settingsPreference)
            ? data.settingsPreference[0] || ""
            : "")
        : "",
      fashionStyle: data.fashionStyle
        ? (typeof data.fashionStyle === "string"
            ? JSON.parse(data.fashionStyle)
            : data.fashionStyle)
        : [],
      brandInspiration: data.brandInspiration || "",
      inspirationLinks: data.inspirationLinks || "",
      contentPillars: data.contentPillars
        ? (typeof data.contentPillars === "string"
            ? JSON.parse(data.contentPillars)
            : data.contentPillars)
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
      />
    )
  }

  // Handle welcome wizard completion
  const handleWelcomeWizardComplete = async () => {
    // Mark welcome wizard as shown
    await fetch("/api/feed-planner/welcome-status", {
      method: "POST",
    })
    
    // Close wizard
    setShowWelcomeWizard(false)
    
    // Refresh welcome status
    await mutate("/api/feed-planner/welcome-status")
  }

  // Show Feed Planner with welcome wizard overlay if needed
  return (
    <>
      <FeedViewScreen access={access} onOpenWizard={handleOpenWizard} />
      {showWelcomeWizard && (
        <WelcomeWizard
          open={showWelcomeWizard}
          onComplete={handleWelcomeWizardComplete}
          onDismiss={handleWelcomeWizardComplete}
        />
      )}
    </>
  )
}
