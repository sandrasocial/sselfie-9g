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
import { getActivationChecklist, getActivationContinueHref, getFreeUserWizardDecision } from "@/lib/onboarding/activation"
import type { FeedStyle } from "@/components/feed-planner/feed-style-modal"

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.error || `Request failed with ${response.status}`)
  return data
}

interface FeedPlannerClientProps {
  access?: FeedPlannerAccess // Optional - will be fetched if not provided (for use in SselfieApp)
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
export default function FeedPlannerClient({ access: accessProp, userName }: FeedPlannerClientProps) {
  const router = useRouter()
  const [showWizard, setShowWizard] = useState(false)
  const [showWelcomeWizard, setShowWelcomeWizard] = useState(false)
  const [isCheckingWizard, setIsCheckingWizard] = useState(true)
  const [wizardMode, setWizardMode] = useState<"selfie_first" | "none">("none")
  // State to track if we should open wizard at step 4 (visual style selection)
  const [wizardInitialStep, setWizardInitialStep] = useState<number | undefined>(undefined)
  const [showFeedStyleModal, setShowFeedStyleModal] = useState(false)
  const [welcomeFeedStyle, setWelcomeFeedStyle] = useState<FeedStyle | null>(null)
  const [welcomeVariationId, setWelcomeVariationId] = useState<number | null>(null)
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
  const { data: accessData, error: accessError, isLoading: isLoadingAccess } = useSWR<FeedPlannerAccess>(
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
  const { data: personalBrandData, mutate: mutatePersonalBrand } = useSWR(
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

  // Feed Planner Phase 2b: Maya auto-drafts the month. Single trigger site - this client
  // powers both the standalone /feed-planner route and the Suite Calendar tab
  // (components/app-v3/feed-planner-view.tsx wraps it unchanged), so wiring it here covers
  // both without risking a second, racing trigger. The draft route re-checks "does a plan
  // already exist for this month" itself under an advisory lock, so it's safe (cheap, just a
  // couple of guard SELECTs) to fire once per mount for any eligible user - no separate
  // client-side "does a plan exist" check needed, and no risk of double-drafting.
  const autoDraftFiredRef = useRef(false)
  useEffect(() => {
    if (autoDraftFiredRef.current) return
    if (showWizard) return
    if (!access || !(access.isPaidBlueprint || access.isMembership)) return

    autoDraftFiredRef.current = true
    fetch("/api/app-v3/maya/feed-plan/draft", { method: "POST" })
      .then(res => res.json())
      .then(data => {
        if (data?.created) {
          console.log("[FeedPlannerClient] Maya auto-drafted this month's plan:", data)
          mutate("/api/feed/latest")
        }
      })
      .catch(error => {
        console.error("[FeedPlannerClient] Auto-draft request failed:", error)
      })
  }, [access, showWizard, mutate])

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
        requiresModelTraining: !Boolean(access?.isFree),
      }),
    [access?.isFree, hasGeneratedAny, onboardingStatus?.hasSelfies, setupStatus?.hasTrainedModel],
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
    // Paid blueprint: Skip full wizard entirely - show feed list view with inline "Set up in 30 seconds" card (A-02)
    if (access.isPaidBlueprint) {
      setWizardMode("none")
      setShowWizard(false)
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
  }, [personalBrandData?.exists, personalBrandData?.data])

  // Show loading while checking wizard status
  if (!accessProp && accessError) {
    return (
      <div className="flex min-h-[320px] items-center justify-center p-5 text-center">
        <div>
          <p role="alert" className="text-[14px] text-[#282728]">Calendar access couldn&apos;t be checked.</p>
          <button
            type="button"
            onClick={() => void mutate("/api/feed-planner/access")}
            className="mt-3 min-h-11 rounded-[6px] bg-[#0D0E10] px-5 text-[11px] uppercase tracking-[0.16em] text-white"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

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
          // Closing the wizard must never eject an embedded Calendar user from /app.
          setShowWizard(false)
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
  const handleUsePreviewStyle = (feedStyle?: string | null, variationId?: number | null) => {
    console.log("[Welcome Wizard] User chose to use preview style")
    setShowWelcomeWizard(false)
    setWelcomeFeedStyle((feedStyle as FeedStyle | null) ?? null)
    setWelcomeVariationId(variationId ?? null)
    setShowFeedStyleModal(true)
  }

  // Handle "Choose New Style" - open feed style picker modal (not full wizard)
  const handleChooseNewStyle = () => {
    console.log("[Welcome Wizard] User chose to select new style - opening feed style picker modal")
    // Close welcome wizard and open feed style modal
    setShowWelcomeWizard(false)
    setWelcomeFeedStyle(null)
    setWelcomeVariationId(null)
    setShowFeedStyleModal(true)
  }

  // Handle feed style selection from modal
  const handleFeedStyleSelected = async (feedStyle: string) => {
    console.log("[Welcome Wizard] Feed style selected:", feedStyle)
    setShowFeedStyleModal(false)
    setWelcomeFeedStyle(null)
    setWelcomeVariationId(null)
    await handleWelcomeWizardComplete()
  }

  const shouldShowActivationChecklist = Boolean(
    access?.isFree &&
      !showWizard &&
      onboardingStatus &&
      !onboardingStatus.onboarding_completed &&
      activationChecklist.nextAction !== "none",
  )

  const activationCardCopy =
    activationChecklist.nextAction === "upload_selfie"
      ? {
          title: "Start with Maya",
          subtitle: "Upload one selfie first. Then Maya can make your first photo with you.",
          cta: "Upload my selfie →",
        }
      : activationChecklist.nextAction === "generate_first_image"
        ? {
            title: "Your first photo is next",
            subtitle: "Open Maya and make one image first. That is the quick win that gets everything moving.",
            cta: "Open Maya →",
          }
        : {
          title: "Keep going with Maya",
          subtitle: "Maya will help with the next photo, caption, or post right inside chat.",
            cta: "Continue →",
          }

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

    const nextHref = getActivationContinueHref(activationChecklist.nextAction)
    if (nextHref) {
      router.push(nextHref)
    }
  }

  // Show Feed Planner with welcome wizard overlay if needed
  return (
    <>
      {shouldShowActivationChecklist && (
        <div className="mx-auto w-full max-w-6xl px-4 pt-6">
          <div className="rounded-[16px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-glass-bg)] px-5 py-5 backdrop-blur-2xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-['Cormorant_Garamond'] text-xl font-light tracking-[0.14em] uppercase text-[color:var(--app-text-primary)]">
                  {activationCardCopy.title}
                </h3>
                <p className="mt-2 text-sm text-[color:var(--app-text-secondary)]">
                  {activationCardCopy.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={handleActivationContinue}
                className="h-11 min-w-[160px] rounded-[6px] border border-[color:var(--app-btn-primary-bg)] bg-[color:var(--app-btn-primary-bg)] px-6 text-xs font-medium tracking-[0.22em] uppercase text-[color:var(--app-btn-primary-text)] transition-opacity hover:opacity-90"
              >
                {activationCardCopy.cta}
              </button>
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
        initialFeedStyle={welcomeFeedStyle}
        initialFeedStyleVariationId={welcomeVariationId}
      />
      {showWelcomeWizard && (
        <WelcomeWizard
          open={showWelcomeWizard}
          onComplete={handleWelcomeWizardComplete}
          onDismiss={handleWelcomeWizardComplete}
          onCreateFeed={handleChooseNewStyle}
          onUsePreviewStyle={handleUsePreviewStyle}
          onChooseNewStyle={handleChooseNewStyle}
        />
      )}
    </>
  )
}
