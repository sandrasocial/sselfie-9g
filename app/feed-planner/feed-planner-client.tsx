"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import useSWR, { useSWRConfig } from "swr"
import FeedViewScreen from "@/components/feed-planner/feed-view-screen"
import UnifiedOnboardingWizard from "@/components/onboarding/unified-onboarding-wizard"
import WelcomeWizard from "@/components/feed-planner/welcome-wizard"
import type { FeedPlannerAccess } from "@/lib/feed-planner/access-control"
import UnifiedLoading from "@/components/sselfie/unified-loading"
import { trackAnalyticsEvent } from "@/lib/analytics/client"
import { getActivationChecklist, getFreeUserWizardDecision } from "@/lib/onboarding/activation"

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
  const router = useRouter()
  const [showWizard, setShowWizard] = useState(false)
  const [showWelcomeWizard, setShowWelcomeWizard] = useState(false)
  const [isCheckingWizard, setIsCheckingWizard] = useState(true)
  const [wizardMode, setWizardMode] = useState<"selfie_first" | "none">("none")
  // State to track if we should open wizard at step 4 (visual style selection)
  const [wizardInitialStep, setWizardInitialStep] = useState<number | undefined>(undefined)
  // State to track user's choice from preview feed step (must be before conditional returns)
  const [userChosePreviewStyle, setUserChosePreviewStyle] = useState<boolean | null>(null)
  const [showFeedStyleModal, setShowFeedStyleModal] = useState(false)
  const { mutate } = useSWRConfig()
  
  // 🔴 CRITICAL: Track if welcome wizard has been auto-shown in this session
  // This prevents showing it multiple times on refresh before the API updates
  const welcomeWizardAutoShownRef = useRef(false)
  const activationJumpstartTrackedRef = useRef(false)

  // Handler to open wizard from header button
  const handleOpenWizard = () => {
    setWizardMode("none")
    setWizardInitialStep(undefined)
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

  const { data: setupStatus } = useSWR(
    showWizard ? null : "/api/user/setup-status",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    },
  )

  const { data: latestFeedData } = useSWR(
    showWizard ? null : "/api/feed/latest",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    },
  )

  const hasGeneratedAny = useMemo(() => {
    const posts = Array.isArray(latestFeedData?.posts)
      ? latestFeedData.posts
      : Array.isArray(latestFeedData?.feed?.posts)
        ? latestFeedData.feed.posts
        : []
    return posts.some((post: any) => Boolean(post?.image_url))
  }, [latestFeedData])

  const activationChecklist = useMemo(
    () =>
      getActivationChecklist({
        hasSelfies: Boolean(onboardingStatus?.hasSelfies),
        hasTrainedModel: Boolean(setupStatus?.hasTrainedModel),
        hasGeneratedAny,
      }),
    [hasGeneratedAny, onboardingStatus?.hasSelfies, setupStatus?.hasTrainedModel],
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
    const hasSelfies = onboardingStatus.hasSelfies || false

    // If onboarding is completed, don't show wizard (even if data seems missing - API is source of truth)
    if (onboardingCompleted) {
      setWizardMode("none")
      setShowWizard(false)
      setIsCheckingWizard(false)
      return
    }

    // Free users: activation jumpstart prioritizes first selfie upload.
    if (access.isFree) {
      const decision = getFreeUserWizardDecision({
        onboardingCompleted,
        hasSelfies,
      })

      console.log("[FeedPlannerClient] Free user wizard check:", {
        hasBaseWizardData,
        hasExtensionData,
        onboardingCompleted,
        hasSelfies,
        decision,
      })

      setWizardMode(decision.mode)
      setWizardInitialStep(decision.initialStep)
      setShowWizard(decision.showWizard)
      setIsCheckingWizard(false)

      if (decision.mode === "selfie_first" && !activationJumpstartTrackedRef.current) {
        activationJumpstartTrackedRef.current = true
        trackAnalyticsEvent({
          event: "activation_jumpstart_opened",
          properties: {
            flow: "free_user_selfie_first",
            has_base_data: hasBaseWizardData,
            has_extension_data: hasExtensionData,
          },
        }).catch(() => {})
      }

      return
    }

    // Paid users (first-time): Show wizard if missing extension data (skip free example)
    // Paid users (returning): Skip wizard if already completed
    if (access.isPaidBlueprint) {
      // First-time paid users need wizard if missing extension data
      // Returning paid users skip wizard if onboarding completed
      const needsWizard = !hasExtensionData && !onboardingCompleted
      setWizardMode("none")
      setShowWizard(needsWizard)
      setIsCheckingWizard(false)
      return
    }

    // One-time and membership users: Skip wizard (not needed)
    setWizardMode("none")
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
    feedStyleVariationId?: number | null
    selfieImages: string[]
    fashionStyle?: string[]
    brandInspiration?: string
    inspirationLinks?: string
  }) => {
    console.log("[Feed Planner Wizard] ✅ Unified wizard completed with data:", data)

    if (!(onboardingStatus?.hasSelfies) && Array.isArray(data.selfieImages) && data.selfieImages.length > 0) {
      trackAnalyticsEvent({
        event: "activation_selfie_uploaded",
        properties: {
          flow: wizardMode,
          selfie_count: data.selfieImages.length,
        },
      }).catch(() => {})
    }
    
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
    
    console.log("[Feed Planner Wizard] ✅ Cache invalidated, wizard closed")
    
    // 🔴 FIX ISSUE 2: Route user to their feed after wizard completion
    // Fetch the latest feed to get the feedId
    try {
      const latestFeedResponse = await fetch("/api/feed/latest")
      if (latestFeedResponse.ok) {
        const latestFeedData = await latestFeedResponse.json()
        if (latestFeedData?.feed?.id) {
          console.log("[Feed Planner Wizard] ✅ Routing to feed:", latestFeedData.feed.id)
          // Component will automatically show the feed when feedId is available via SWR
          // No need to manually route - FeedViewScreen will handle it
        } else {
          console.log("[Feed Planner Wizard] ⚠️ No feed found after wizard completion")
          // Stay on feed planner - user will see welcome wizard or creation screen
        }
      }
    } catch (error) {
      console.error("[Feed Planner Wizard] ❌ Error fetching latest feed:", error)
      // Stay on feed planner - graceful fallback
    }
    
    console.log("[Feed Planner Wizard] ✅ Feed planner should refresh with latest feed")
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
      feedStyleVariationId: data.feedStyleVariationId ?? null,
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
    
    // 🔴 FIX ISSUE 2: Route user to their feed after welcome wizard completion
    // Refresh the latest feed data so FeedViewScreen shows the correct feed
    await mutate("/api/feed/latest")
    
    console.log('[FeedPlannerClient] ✅ Welcome wizard closed, status refreshed, and feed data updated')
  }

  // Handle "Use Preview Style" - create feed with existing data
  const handleUsePreviewStyle = async () => {
    console.log("[Welcome Wizard] User chose to use preview style")
    setUserChosePreviewStyle(true)
    // The existing onboarding data will be used when creating the feed
    // Continue with tutorial (skip style selection step)
  }

  // Handle "Choose New Style" - open feed style picker modal (not full wizard)
  const handleChooseNewStyle = () => {
    console.log("[Welcome Wizard] User chose to select new style - opening feed style picker modal")
    setUserChosePreviewStyle(false)
    // Close welcome wizard and open feed style modal
    setShowWelcomeWizard(false)
    setShowFeedStyleModal(true)
  }

  // Handle feed style selection from modal
  const handleFeedStyleSelected = async (feedStyle: string) => {
    console.log("[Welcome Wizard] Feed style selected:", feedStyle)
    setShowFeedStyleModal(false)
    // After style selection, continue with tutorial (skip style selection step)
    // The style is already saved to personal brand via FeedStyleModal
    // Reopen welcome wizard to continue tutorial
    setShowWelcomeWizard(true)
  }

  const shouldShowActivationChecklist = Boolean(
    access?.isFree &&
      !showWizard &&
      onboardingStatus &&
      !onboardingStatus.onboarding_completed &&
      activationChecklist.nextAction !== "none",
  )

  const handleActivationContinue = () => {
    trackAnalyticsEvent({
      event: "activation_continue_clicked",
      properties: {
        next_action: activationChecklist.nextAction,
      },
    }).catch(() => {})

    if (activationChecklist.nextAction === "upload_selfie") {
      setWizardMode("selfie_first")
      setWizardInitialStep(5)
      setShowWizard(true)
      return
    }

    if (activationChecklist.nextAction === "train_model") {
      router.push("/studio?tab=maya")
      return
    }

    if (activationChecklist.nextAction === "generate_first_image") {
      router.push("/feed-planner")
    }
  }

  // Show Feed Planner with welcome wizard overlay if needed
  return (
    <>
      {shouldShowActivationChecklist && (
        <div className="mx-auto w-full max-w-6xl px-4 pt-6">
          <div className="border border-stone-200 bg-white px-5 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-['Times_New_Roman'] text-xl font-light tracking-[0.14em] uppercase text-stone-950">
                  Activation Checklist
                </h3>
                <p className="mt-2 text-sm text-stone-600">
                  Complete these three steps to get your first result faster.
                </p>
              </div>
              <button
                type="button"
                onClick={handleActivationContinue}
                className="h-11 min-w-[160px] border border-stone-950 bg-stone-950 px-6 text-xs font-medium tracking-[0.22em] uppercase text-white transition-colors hover:bg-stone-800"
              >
                Continue
              </button>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {activationChecklist.steps.map((step) => (
                <div key={step.key} className="flex items-center gap-2 border border-stone-200 px-3 py-3 text-sm text-stone-700">
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                      step.done ? "bg-stone-950 text-white" : "bg-stone-100 text-stone-500"
                    }`}
                  >
                    {step.done ? "✓" : "•"}
                  </span>
                  <span>{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <FeedViewScreen 
        access={access} 
        onOpenWizard={handleOpenWizard}
        onOpenWelcomeWizard={access?.isPaidBlueprint ? handleOpenWelcomeWizard : undefined}
        controlledFeedStyleModal={showFeedStyleModal}
        onFeedStyleModalChange={setShowFeedStyleModal}
        onFeedStyleSelected={handleFeedStyleSelected}
      />
      {showWelcomeWizard && (
        <WelcomeWizard
          open={showWelcomeWizard}
          onComplete={handleWelcomeWizardComplete}
          onDismiss={handleWelcomeWizardComplete}
          onUsePreviewStyle={handleUsePreviewStyle}
          onChooseNewStyle={handleChooseNewStyle}
          userChosePreviewStyle={userChosePreviewStyle}
        />
      )}
    </>
  )
}
