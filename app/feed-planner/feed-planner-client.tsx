"use client"

import { useState, useEffect } from "react"
import useSWR, { useSWRConfig } from "swr"
import FeedViewScreen from "@/components/feed-planner/feed-view-screen"
import BlueprintOnboardingWizard from "@/components/onboarding/blueprint-onboarding-wizard"
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
    }
  )

  // Fetch user info for wizard
  const { data: userInfo } = useSWR("/api/user/info", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  // Fetch existing blueprint data if available (for wizard existing data)
  const { data: blueprintData } = useSWR(
    showWizard ? "/api/blueprint/state" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  )

  // Determine if wizard is needed
  // React to access and onboardingStatus changes, but only close wizard if user explicitly completes it
  useEffect(() => {
    // Wait for both access and onboarding status to load
    if (isLoadingOnboarding || (!accessProp && isLoadingAccess)) {
      setIsCheckingWizard(true)
      return
    }

    if (!onboardingStatus) {
      setIsCheckingWizard(false)
      setShowWizard(false)
      return
    }

    // Wait for access to be loaded before determining wizard
    if (!access) {
      setIsCheckingWizard(true)
      return
    }

    const hasBaseWizardData = onboardingStatus.hasBaseWizardData || false
    const hasExtensionData = onboardingStatus.hasExtensionData || false
    const onboardingCompleted = onboardingStatus.onboarding_completed || false

    // Free users: Show wizard if not completed (missing base or extension data OR onboarding not marked complete)
    if (access.isFree) {
      // Wizard should show if:
      // 1. Missing base wizard data, OR
      // 2. Missing extension data, OR
      // 3. Onboarding not marked complete
      // Note: We check onboarding_completed as the final gate (set when wizard completes)
      // Don't check hasSelfies here - that's handled in the wizard itself (step 4 validation)
      const needsWizard = !hasBaseWizardData || !hasExtensionData || !onboardingCompleted
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
  }, [isLoadingOnboarding, isLoadingAccess, onboardingStatus, access]) // React to access and onboardingStatus changes

  // Handle wizard completion
  const handleWizardComplete = async (data: {
    business: string
    dreamClient: string
    vibe: string
    lightingKnowledge: string
    angleAwareness: string
    editingStyle: string
    consistencyLevel: string
    currentSelfieHabits: string
    feedStyle: string
  }) => {
    console.log("[Feed Planner Wizard] ✅ Wizard completed with data:", data)
    
    // Close wizard immediately (API endpoint sets onboarding_completed = true)
    setShowWizard(false)
    
    // Invalidate SWR cache to refresh data without full page reload
    // This prevents losing wizard data and allows smooth transition
    await Promise.all([
      mutate("/api/user/onboarding-status"),
      mutate("/api/feed-planner/access"),
      mutate("/api/feed/latest"),
      mutate("/api/blueprint/state"),
    ])
    
    console.log("[Feed Planner Wizard] ✅ Cache invalidated, feed planner should refresh")
  }

  // Show loading while checking wizard status
  if (isCheckingWizard) {
    return <UnifiedLoading message="Loading Feed Planner..." />
  }

  // Show wizard if needed
  if (showWizard) {
    const existingData = blueprintData?.blueprint?.formData || {}

    return (
      <BlueprintOnboardingWizard
        isOpen={true}
        onComplete={handleWizardComplete}
        onDismiss={() => {
          // Don't allow dismissing wizard - user must complete it
          // But we can redirect to home if they really want to leave
          window.location.href = "/studio"
        }}
        userName={userName || userInfo?.name || null}
        userEmail={userInfo?.email || null}
        existingData={existingData}
      />
    )
  }

  // Show Feed Planner
  // Always pass onOpenWizard so wizard button is visible in header (for free users to check/edit their answers)
  return <FeedViewScreen access={access} onOpenWizard={handleOpenWizard} />
}
