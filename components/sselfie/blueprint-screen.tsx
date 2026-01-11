"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import FeedViewScreen from "@/components/feed-planner/feed-view-screen"
import BlueprintOnboardingWizard from "@/components/onboarding/blueprint-onboarding-wizard"
import { BlueprintSelfieUpload } from "@/components/blueprint/blueprint-selfie-upload"
import { BlueprintConceptCard } from "@/components/blueprint/blueprint-concept-card"
import { Button } from "@/components/ui/button"
import { Copy, Check, Edit } from "lucide-react"

interface BlueprintScreenProps {
  userId: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

type TabType = "strategy" | "captions" | "grid"

/**
 * BlueprintScreen - Unified Blueprint Flow
 * 
 * Handles:
 * 1. Selfie upload (after wizard completes)
 * 2. Unified loader (during grid generation)
 * 3. Results with tabs (Strategy | Caption Templates | Grid Preview)
 * 4. Upsell component (for free users)
 */
export default function BlueprintScreen({ userId }: BlueprintScreenProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditWizard, setShowEditWizard] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>("grid")
  
  // Selfie upload state
  const [selfieImages, setSelfieImages] = useState<string[]>([])
  const [isUploadingSelfies, setIsUploadingSelfies] = useState(false)
  
  // Grid generation state
  const [isGeneratingGrid, setIsGeneratingGrid] = useState(false)
  const [gridPredictionId, setGridPredictionId] = useState<string | null>(null)
  const [generatedGridUrl, setGeneratedGridUrl] = useState<string | null>(null)
  
  // Caption templates state
  const [copiedCaption, setCopiedCaption] = useState<number | null>(null)
  
  // Calendar state
  const [selectedCalendarWeek, setSelectedCalendarWeek] = useState<number>(1)
  
  // User info for wizards and uploads
  const [userInfo, setUserInfo] = useState<{ name: string | null; email: string | null } | null>(null)

  // Fetch blueprint state using user_id (authenticated)
  const {
    data: blueprintData,
    error: blueprintError,
    isLoading: blueprintLoading,
    mutate: mutateBlueprint,
  } = useSWR("/api/blueprint/state", fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  })

  // Fetch user info
  const { data: userInfoData } = useSWR("/api/user/info", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  useEffect(() => {
    if (userInfoData) {
      setUserInfo({
        name: userInfoData.name || null,
        email: userInfoData.email || null,
      })
    }
  }, [userInfoData])

  // Load selfie images from blueprint state
  // Only sync from database when not uploading (prevents overwriting during upload)
  useEffect(() => {
    if (isUploadingSelfies) {
      // Don't sync during upload - let handleSelfieUploadComplete handle state
      return
    }
    
    if (blueprintData?.blueprint) {
      const dbImages = blueprintData.blueprint.selfieImages || []
      // Always sync from database when not uploading (database is source of truth)
      setSelfieImages(dbImages)
    } else {
      // If no blueprint data and not uploading, reset to empty array
      if (!isUploadingSelfies) {
        setSelfieImages([])
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blueprintData, isUploadingSelfies])

  // Load generated grid from blueprint state
  useEffect(() => {
    if (blueprintData?.blueprint?.grid?.gridUrl) {
      setGeneratedGridUrl(blueprintData.blueprint.grid.gridUrl)
    }
  }, [blueprintData])

  useEffect(() => {
    if (blueprintError) {
      setError(blueprintError.message || "Failed to load blueprint")
      setIsLoading(false)
    } else if (!blueprintLoading) {
      setIsLoading(false)
    }
  }, [blueprintError, blueprintLoading])

  // Get blueprint data for debug logging (before any early returns)
  const blueprint = blueprintData?.blueprint
  const entitlement = blueprintData?.entitlement
  const hasStrategy = blueprint?.strategy?.generated && blueprint?.strategy?.data
  // Check both API response and local state (local state is set immediately from polling)
  const hasGrid = (blueprint?.grid?.generated && blueprint?.grid?.gridUrl) || !!generatedGridUrl

  // Debug logging (must be before any conditional returns)
  useEffect(() => {
    if (blueprint) {
      const needsSelfieUpload = blueprint.formData && selfieImages.length === 0
      console.log("[Blueprint Screen] State:", {
        hasBlueprint: !!blueprint,
        hasFormData: !!blueprint?.formData,
        selfieImagesCount: selfieImages.length,
        needsSelfieUpload,
        hasStrategy,
        hasGrid,
      })
    }
  }, [blueprint, selfieImages, hasStrategy, hasGrid])

  // Handle selfie upload completion
  const handleSelfieUploadComplete = async (imageUrls: string[]) => {
    console.log("[Blueprint Screen] Selfie upload complete, received URLs:", imageUrls)
    
    // Only update state if we have valid image URLs
    if (!imageUrls || imageUrls.length === 0) {
      console.warn("[Blueprint Screen] No image URLs received, upload may have failed")
      setIsUploadingSelfies(false)
      return
    }
    
    setSelfieImages(imageUrls)
    setIsUploadingSelfies(false)
    
    // Note: Images are already saved to database by /api/blueprint/upload-selfies endpoint
    // We just need to refresh the blueprint data to get the updated state
    try {
      // Refresh blueprint data to get updated selfie URLs from database
      await mutateBlueprint()
      
      // Wait a bit for mutateBlueprint to complete, then verify images were saved
      setTimeout(async () => {
        try {
          const freshResponse = await fetch("/api/blueprint/state")
          if (freshResponse.ok) {
            const freshData = await freshResponse.json()
            const freshBlueprint = freshData?.blueprint
            
            console.log("[Blueprint Screen] Fresh blueprint data after upload:", {
              hasBlueprint: !!freshBlueprint,
              hasFormData: !!freshBlueprint?.formData,
              selfieCount: freshBlueprint?.selfieImages?.length || 0,
              hasStrategy: !!freshBlueprint?.strategy?.generated,
            })
            
            // Verify images were actually saved to database
            const savedImageCount = freshBlueprint?.selfieImages?.length || 0
            if (savedImageCount === 0) {
              console.warn("[Blueprint Screen] Images were not saved to database, resetting state")
              setSelfieImages([])
              return
            }
            
            // Auto-generate strategy after selfie upload (only if images were saved)
            if (freshBlueprint && !freshBlueprint.strategy?.generated) {
              console.log("[Blueprint] Auto-generating strategy after selfie upload...")
              
              const formData = freshBlueprint.formData || {}
              const feedStyle = freshBlueprint.feedStyle || freshBlueprint.feed_style
              
              if (!formData || Object.keys(formData).length === 0) {
                console.warn("[Blueprint] No formData found, skipping strategy generation")
                return
              }
              
              const strategyResponse = await fetch("/api/blueprint/generate-concepts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  formData,
                  selectedFeedStyle: feedStyle,
                }),
              })

              if (strategyResponse.ok) {
                console.log("[Blueprint] ✅ Strategy auto-generated successfully")
                await mutateBlueprint() // Refresh to get strategy data
              } else {
                const errorData = await strategyResponse.json()
                console.error("[Blueprint] Strategy generation failed:", errorData)
              }
            }
          }
        } catch (error) {
          console.error("[Blueprint] Error verifying upload:", error)
        }
      }, 500) // Small delay to ensure database update is reflected
    } catch (error) {
      console.error("[Blueprint] Error refreshing blueprint data:", error)
      // If refresh fails, reset images to keep upload UI visible
      setSelfieImages([])
    }
  }

  // Generate strategy (first step before grid generation)
  const generateStrategy = async (): Promise<boolean> => {
    const blueprint = blueprintData?.blueprint
    if (!blueprint) return false

    // Check if strategy already exists
    if (blueprint.strategy?.generated) {
      return true
    }

    try {
      const formData = blueprint.formData || {}
      const feedStyle = blueprint.feedStyle || blueprint.feed_style

      const response = await fetch("/api/blueprint/generate-concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formData,
          selectedFeedStyle: feedStyle,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to generate strategy")

      mutateBlueprint() // Refresh to get strategy data
      return true
    } catch (error) {
      console.error("[Blueprint] Error generating strategy:", error)
      alert(error instanceof Error ? error.message : "Failed to generate strategy")
      return false
    }
  }

  // Generate grid (after strategy and selfies are ready)
  const handleGenerateGrid = async () => {
    if (selfieImages.length === 0) {
      alert("Please upload 1-3 selfies first")
      return
    }

    if (!userInfo?.email) {
      alert("User email is required")
      return
    }

    const blueprint = blueprintData?.blueprint
    if (!blueprint) {
      alert("Blueprint data is missing")
      return
    }

    // First generate strategy if it doesn't exist
    const strategySuccess = await generateStrategy()
    if (!strategySuccess) {
      return
    }

    setIsGeneratingGrid(true)
    setError(null)

    try {
      const formData = blueprint.formData || {}
      const feedStyle = blueprint.feedStyle || blueprint.feed_style
      const vibe = formData.vibe || formData.vibe

      const response = await fetch("/api/blueprint/generate-grid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selfieImages,
          category: vibe,
          mood: feedStyle,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to generate grid")

      setGridPredictionId(data.predictionId)
      pollGridStatus(data.predictionId)
    } catch (err) {
      console.error("[Blueprint] Error generating grid:", err)
      setError(err instanceof Error ? err.message : "Failed to generate grid")
      setIsGeneratingGrid(false)
    }
  }

  // Poll grid generation status
  const pollGridStatus = useCallback(async (predictionId: string) => {
    try {
      const response = await fetch("/api/blueprint/check-grid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ predictionId }),
      })

      const data = await response.json()

      if (data.status === "completed" && data.gridUrl) {
        setGeneratedGridUrl(data.gridUrl)
        setIsGeneratingGrid(false)
        setGridPredictionId(null)
        mutateBlueprint() // Refresh to get updated grid
      } else if (data.status === "failed") {
        setError(data.error || "Generation failed")
        setIsGeneratingGrid(false)
        setGridPredictionId(null)
      } else {
        // Still processing, poll again
        setTimeout(() => pollGridStatus(predictionId), 2000)
      }
    } catch (err) {
      console.error("[Blueprint] Error checking grid status:", err)
      setError("Failed to check generation status")
      setIsGeneratingGrid(false)
      setGridPredictionId(null)
    }
  }, [mutateBlueprint])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-950 mx-auto mb-4"></div>
          <p className="text-sm text-stone-600">Loading your blueprint...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px] px-4">
        <div className="text-center max-w-md">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null)
              setIsLoading(true)
              mutateBlueprint()
            }}
            className="px-4 py-2 bg-stone-950 text-white text-xs uppercase tracking-wider hover:bg-stone-800 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Calculate derived values (blueprint, entitlement, hasStrategy, hasGrid already defined above)
  const creditBalance = entitlement?.creditBalance ?? 0
  const isPaidBlueprint = entitlement?.type === "paid" || entitlement?.type === "studio"

  // Decision 2: For paid blueprint users with strategy, show FeedViewScreen (Feed Planner UI)
  if (isPaidBlueprint && hasStrategy) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden min-h-0 relative">
        <FeedViewScreen feedId={null} mode="blueprint" />
        {/* Edit Aesthetics button for paid users */}
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant="secondary"
            onClick={() => setShowEditWizard(true)}
            className="text-xs uppercase tracking-wider"
          >
            Edit Aesthetics
          </Button>
        </div>
        {showEditWizard && userInfo && (
          <BlueprintOnboardingWizard
            isOpen={showEditWizard}
            onComplete={async (data) => {
              console.log("[Blueprint Screen] ✅ Wizard completed, aesthetics updated")
              setShowEditWizard(false)
              mutateBlueprint()
            }}
            onDismiss={() => setShowEditWizard(false)}
            userName={userInfo.name}
            existingData={{
              business: blueprint?.formData?.business,
              dreamClient: blueprint?.formData?.dreamClient,
              vibe: blueprint?.formData?.vibe,
              lightingKnowledge: blueprint?.formData?.lightingKnowledge,
              angleAwareness: blueprint?.formData?.angleAwareness,
              editingStyle: blueprint?.formData?.editingStyle,
              consistencyLevel: blueprint?.formData?.consistencyLevel,
              currentSelfieHabits: blueprint?.formData?.currentSelfieHabits,
              feedStyle: blueprint?.feedStyle,
            }}
          />
        )}
      </div>
    )
  }

  // If no blueprint state exists, show nothing (wizards handle onboarding)
  if (!blueprint) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-sm text-stone-600">Loading your blueprint...</p>
        </div>
      </div>
    )
  }

  const formData = blueprint.formData || {}
  const strategy = blueprint.strategy?.data
  const feedStyle = blueprint.feedStyle || blueprint.feed_style

  // Generate caption templates based on formData (same as old blueprint form)
  const captionTemplates = {
    authority: [
      {
        id: 1,
        title: "The Truth Bomb",
        template: `Here's what nobody tells you about [topic]:\n\n[Reveal the insider secret]\n\nMost ${formData.business || "experts"} won't say this because [reason]. But you deserve to know the truth.\n\nSave this. You'll need it. ✨`,
      },
      {
        id: 2,
        title: "The Three Secrets",
        template: `3 things I wish someone told me when I started:\n\n1. [Secret one]\n2. [Secret two]  \n3. [Secret three]\n\nWhich one resonates most? Comment the number. 👇`,
      },
      {
        id: 3,
        title: "Unpopular Opinion",
        template: `Unpopular opinion:\n\n[Your controversial take]\n\nI know this goes against what everyone says. But after [X years/experience], I've learned that [why you believe this].\n\nAgree or disagree? Let's discuss.`,
      },
    ],
    engagement: [
      {
        id: 4,
        title: "This or That",
        template: `Quick question:\n\n[Option A] or [Option B]?\n\nComment A or B below!\n\nI'm team [your choice] because [brief reason]. What about you? 👇`,
      },
      {
        id: 5,
        title: "Fill in the Blank",
        template: `Fill in the blank:\n\n"The best part about being a ${formData.business || "entrepreneur"} is ___________"\n\nI'll go first: [Your answer]\n\nNow you! 💬`,
      },
      {
        id: 6,
        title: "Hot Take Poll",
        template: `Hot take that might be controversial:\n\n[Your bold statement]\n\n❤️ = Agree\n🔥 = Disagree\n💯 = Never thought about it\n\nLet's see where everyone stands!`,
      },
    ],
    story: [
      {
        id: 7,
        title: "The Transformation",
        template: `${formData.business ? "Three years ago" : "A few years ago"}, I was [your struggle].\n\nToday, I'm [your achievement].\n\nWhat changed?\n\n[The turning point or lesson]\n\nIf you're in that dark place right now, this is your sign: [encouraging message].\n\nYou've got this. ✨`,
      },
      {
        id: 8,
        title: "The Moment Everything Shifted",
        template: `There was a moment when everything shifted.\n\nI was [scene setting]. And suddenly, I realized [the revelation].\n\nThat's when I decided to [action you took].\n\nBest decision I ever made.\n\nWhat was YOUR turning point? Tell me below. 👇`,
      },
      {
        id: 9,
        title: "The Vulnerable Share",
        template: `Can I be honest for a second?\n\n[Vulnerable admission]\n\nI don't share this to get sympathy. I share it because someone needs to hear: [the message].\n\nYou're not alone in this. 💫`,
      },
    ],
    cta: [
      {
        id: 10,
        title: "Soft Sell DM",
        template: `Quick question:\n\nAre you struggling with [their pain point]?\n\nI created [your solution] specifically for ${formData.business || "people"} like you who [desire].\n\nIf you're curious, DM me "[keyword]" and I'll send you the details.\n\nNo pressure, just want to help. 💫`,
      },
      {
        id: 11,
        title: "Link in Bio",
        template: `If you're ready to [desired outcome], I put together something special for you.\n\n[Brief description of offer/freebie]\n\nLink in bio 👆 or comment "[keyword]" and I'll send it directly to you.\n\nLet's make this happen! ✨`,
      },
      {
        id: 12,
        title: "The Invitation",
        template: `I'm opening up [X] spots for [offer].\n\nThis is for you if:\n✓ [Qualifier 1]\n✓ [Qualifier 2]\n✓ [Qualifier 3]\n\nNot for you if: [Disqualifier]\n\nInterested? Drop a "🙋‍♀️" below and let's chat.`,
      },
    ],
  }

  // 30-day content calendar (same as old blueprint page)
  const getContentCalendar = () => {
    const calendars = {
      week1: [
        {
          day: 1,
          type: "selfie",
          title: "Power Authority Shot",
          caption: "Professional headshot establishing your expertise",
        },
        { day: 2, type: "selfie", title: "Behind the Scenes", caption: "Working on your craft, real and raw" },
        { day: 3, type: "flatlay", title: "Morning Routine", caption: "Tools of your trade flatlay" },
        { day: 4, type: "selfie", title: "Lifestyle Moment", caption: "Living your brand outside work" },
        { day: 5, type: "selfie", title: "Teaching Content", caption: "Educational carousel or tip" },
        { day: 6, type: "selfie", title: "Personal Story", caption: "Vulnerable share about your journey" },
        {
          day: 7,
          type: "selfie",
          title: "Inspiration Sunday",
          caption: "Aspirational image with motivational message",
        },
      ],
      week2: [
        { day: 8, type: "selfie", title: "Client Transformation", caption: "Share success story (with permission)" },
        { day: 9, type: "selfie", title: "Day in the Life", caption: "What your typical day looks like" },
        { day: 10, type: "flatlay", title: "Workspace Aesthetic", caption: "Your creative space or desk setup" },
        { day: 11, type: "selfie", title: "Hot Take", caption: "Controversial opinion in your niche" },
        { day: 12, type: "selfie", title: "Tutorial Thursday", caption: "Step-by-step how-to content" },
        { day: 13, type: "selfie", title: "Friday Feels", caption: "Casual, relaxed weekend vibes" },
        { day: 14, type: "selfie", title: "Reflection Post", caption: "Weekly wins and lessons learned" },
      ],
      week3: [
        { day: 15, type: "selfie", title: "Monday Motivation", caption: "Power quote or affirmation" },
        { day: 16, type: "selfie", title: "Process Post", caption: "How you do what you do" },
        { day: 17, type: "flatlay", title: "Product Feature", caption: "Your favorite tools or products" },
        { day: 18, type: "selfie", title: "Ask Me Anything", caption: "Interactive engagement prompt" },
        { day: 19, type: "selfie", title: "Before & After", caption: "Your transformation journey" },
        { day: 20, type: "selfie", title: "Collaboration", caption: "Partnership or feature post" },
        { day: 21, type: "selfie", title: "Weekend Lifestyle", caption: "How you recharge and reset" },
      ],
      week4: [
        { day: 22, type: "selfie", title: "New Week Energy", caption: "Fresh start, new goals" },
        { day: 23, type: "selfie", title: "Value Bomb", caption: "Your best tip this month" },
        { day: 24, type: "flatlay", title: "Essentials", caption: "Cannot live without these items" },
        { day: 25, type: "selfie", title: "Myth Busting", caption: "Common misconception in your industry" },
        { day: 26, type: "selfie", title: "Throwback", caption: "Where you started vs now" },
        { day: 27, type: "selfie", title: "Community Spotlight", caption: "Celebrate your audience" },
        { day: 28, type: "selfie", title: "Month Wrap-Up", caption: "Highlights and gratitude" },
      ],
      week5: [
        { day: 29, type: "selfie", title: "Power Selfie", caption: "Confident, bold, unapologetic" },
        { day: 30, type: "flatlay", title: "Vision Board", caption: "Goals and dreams visual" },
      ],
    }

    return calendars
  }

  // Copy to clipboard function
  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text)
    setCopiedCaption(id)
    setTimeout(() => setCopiedCaption(null), 2000)
  }

  // Determine current step:
  // 1. Wizard completed but no selfies → Show selfie upload
  // 2. Selfies uploaded but no strategy → Generate strategy (auto) then show grid generation
  // 3. Strategy exists but no grid → Show grid generation button
  // 4. Grid generating → Show unified loader
  // 5. Grid generated → Show results with tabs

  // Determine current step based on blueprint data
  // After wizard completion, blueprint should exist with formData but no selfies yet
  const needsSelfieUpload = blueprint && blueprint.formData && selfieImages.length === 0
  // Show grid generation button if selfies uploaded (strategy will be auto-generated if needed)
  const needsGridGeneration = !hasGrid && selfieImages.length > 0 && !isGeneratingGrid
  const isGridGenerating = isGeneratingGrid || (gridPredictionId !== null)

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-6 border-b border-stone-200">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1
              className="text-2xl md:text-3xl font-light mb-2"
              style={{ fontFamily: "'Times New Roman', serif" }}
            >
              Your Brand Blueprint
            </h1>
            <p className="text-sm text-stone-600">
              {hasGrid
                ? "All done!"
                : needsGridGeneration
                  ? "Ready to create your grid"
                  : needsSelfieUpload
                    ? "Add your photos to get started"
                    : "Finish setting up your blueprint"}
            </p>
          </div>
          {!needsSelfieUpload && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEditWizard(true)}
              className="bg-white border border-stone-300 hover:bg-stone-50 text-stone-950 text-xs uppercase tracking-wider gap-2"
            >
              <Edit size={14} />
              Edit Answers
            </Button>
          )}
        </div>
      </div>


      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Step 1: Selfie Upload */}
          {needsSelfieUpload && (
            <div className="space-y-6">
              <div className="bg-stone-50 border border-stone-200 rounded-lg p-6 md:p-8">
                <h2
                  className="text-xl md:text-2xl font-light mb-4"
                  style={{ fontFamily: "'Times New Roman', serif" }}
                >
                  Upload your selfies
                </h2>
                <p className="text-sm text-stone-600 mb-6">
                  Add 1-3 photos of yourself. We'll use them to create your personalized grid.
                </p>
                {userInfo?.email && (
                  <BlueprintSelfieUpload
                    onUploadComplete={handleSelfieUploadComplete}
                    maxImages={3}
                    initialImages={selfieImages}
                    email={userInfo.email}
                  />
                )}
              </div>
            </div>
          )}

          {/* Step 2: Grid Generation (after selfies uploaded) */}
          {!needsSelfieUpload && needsGridGeneration && (
            <div className="space-y-6">
              <div className="bg-stone-50 border border-stone-200 rounded-lg p-6 md:p-8 text-center">
                <h2
                  className="text-xl md:text-2xl font-light mb-4"
                  style={{ fontFamily: "'Times New Roman', serif" }}
                >
                  Generate your grid
                </h2>
                <p className="text-sm text-stone-600 mb-6">
                  Create your personalized photo grid based on your {feedStyle || "selected"} style.
                </p>
                <Button
                  onClick={handleGenerateGrid}
                  disabled={isGeneratingGrid}
                  className="bg-stone-950 text-stone-50 hover:bg-stone-800 text-xs uppercase tracking-wider px-6 py-3"
                >
                  {isGeneratingGrid ? "Creating..." : "Create Grid"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Unified Loader (during grid generation) */}
          {isGridGenerating && (
            <div className="flex flex-col items-center justify-center py-20 space-y-6">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-stone-950 animate-bounce"></div>
                <div
                  className="w-3 h-3 rounded-full bg-stone-950 animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="w-3 h-3 rounded-full bg-stone-950 animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                ></div>
              </div>
              <div className="text-center">
                <p className="text-base font-light text-stone-900 mb-2">Creating your grid...</p>
                <p className="text-sm text-stone-600">This might take a minute</p>
              </div>
            </div>
          )}

          {/* Step 4: Results with Tabs (after grid generated) */}
          {hasGrid && !isGridGenerating && (
            <div className="space-y-6">
              {/* Tabs */}
              <div className="flex gap-2 border-b border-stone-200">
                <button
                  onClick={() => setActiveTab("grid")}
                  className={`px-4 py-2 text-xs uppercase tracking-wider transition-colors ${
                    activeTab === "grid"
                      ? "border-b-2 border-stone-950 text-stone-950 font-medium"
                      : "text-stone-600 hover:text-stone-950"
                  }`}
                >
                  Grid Preview
                </button>
                <button
                  onClick={() => setActiveTab("captions")}
                  className={`px-4 py-2 text-xs uppercase tracking-wider transition-colors ${
                    activeTab === "captions"
                      ? "border-b-2 border-stone-950 text-stone-950 font-medium"
                      : "text-stone-600 hover:text-stone-950"
                  }`}
                >
                  Caption Templates
                </button>
                {hasStrategy && (
                  <button
                    onClick={() => setActiveTab("strategy")}
                    className={`px-4 py-2 text-xs uppercase tracking-wider transition-colors ${
                      activeTab === "strategy"
                        ? "border-b-2 border-stone-950 text-stone-950 font-medium"
                        : "text-stone-600 hover:text-stone-950"
                    }`}
                  >
                    Strategy
                  </button>
                )}
              </div>

              {/* Tab Content */}
              <div className="min-h-[400px]">
                {/* Grid Preview Tab */}
                {activeTab === "grid" && generatedGridUrl && (
                  <div className="space-y-6">
                    <div className="bg-stone-50 border border-stone-200 rounded-lg p-6">
                      <h3
                        className="text-lg font-light mb-4"
                        style={{ fontFamily: "'Times New Roman', serif" }}
                      >
                        Your Grid
                      </h3>
                      <div className="max-w-md mx-auto">
                        <img
                          src={generatedGridUrl}
                          alt="Blueprint grid"
                          className="w-full h-auto rounded-lg"
                        />
                      </div>
                    </div>

                    {/* Upsell for Free Users */}
                    {!isPaidBlueprint && (
                      <BlueprintUpsell onUpgrade={() => {
                        router.push("/checkout/blueprint")
                      }} />
                    )}
                  </div>
                )}

                {/* Strategy Tab */}
                {activeTab === "strategy" && strategy && (
                  <div className="space-y-6">
                    {/* Strategy Description */}
                    <div className="bg-stone-50 border border-stone-200 rounded-lg p-6">
                      <h3
                        className="text-lg font-light mb-4"
                        style={{ fontFamily: "'Times New Roman', serif" }}
                      >
                        Your Strategy
                      </h3>
                      <div className="prose prose-sm max-w-none">
                        <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
                          {strategy.prompt || strategy.description || "Strategy will be displayed here"}
                        </p>
                      </div>
                    </div>

                    {/* 30-Day Content Calendar */}
                    <div className="bg-stone-50 border border-stone-200 rounded-lg p-6">
                      <h3
                        className="text-lg font-light mb-2"
                        style={{ fontFamily: "'Times New Roman', serif" }}
                      >
                        Your 30-day content plan
                      </h3>
                      <p className="text-xs sm:text-sm font-light text-stone-600 leading-relaxed mb-6">
                        No more &quot;what should I post today?&quot; moments. Here&apos;s your whole month planned out—just show up and create!
                      </p>

                      {/* Week Selector */}
                      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                        {[1, 2, 3, 4, 5].map((week) => (
                          <button
                            key={week}
                            onClick={() => setSelectedCalendarWeek(week)}
                            className={`px-4 py-2 text-xs tracking-wider uppercase whitespace-nowrap border transition-all duration-200 shrink-0 ${
                              selectedCalendarWeek === week
                                ? "border-stone-950 bg-stone-950 text-stone-50"
                                : "border-stone-300 text-stone-700 hover:border-stone-950"
                            }`}
                          >
                            Week {week}
                          </button>
                        ))}
                      </div>

                      {/* Calendar Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {getContentCalendar()[`week${selectedCalendarWeek}` as keyof ReturnType<typeof getContentCalendar>].map(
                          (post) => (
                            <div key={post.day} className="bg-white border border-stone-200 p-4 sm:p-6 rounded-lg">
                              <div className="flex items-center justify-between mb-2 sm:mb-3">
                                <span className="text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-500">
                                  Day {post.day}
                                </span>
                                <span
                                  className={`text-[10px] sm:text-xs px-2 sm:px-3 py-1 rounded-full ${
                                    post.type === "selfie" ? "bg-stone-950 text-stone-50" : "bg-stone-200 text-stone-950"
                                  }`}
                                >
                                  {post.type}
                                </span>
                              </div>
                              <h4 className="text-sm sm:text-base font-medium tracking-wide text-stone-950 mb-2">
                                {post.title}
                              </h4>
                              <p className="text-xs sm:text-sm font-light text-stone-600 leading-relaxed">{post.caption}</p>
                            </div>
                          ),
                        )}
                      </div>
                    </div>

                    {/* Upsell for Free Users */}
                    {!isPaidBlueprint && (
                      <BlueprintUpsell onUpgrade={() => {
                        router.push("/checkout/blueprint")
                      }} />
                    )}
                  </div>
                )}

                {/* Caption Templates Tab */}
                {activeTab === "captions" && (
                  <div className="space-y-6">
                    <div className="bg-stone-50 border border-stone-200 rounded-lg p-6">
                      <h3
                        className="text-lg font-light mb-2"
                        style={{ fontFamily: "'Times New Roman', serif" }}
                      >
                        Caption Templates
                      </h3>
                      <p className="text-sm text-stone-600 mb-6">
                        Copy these templates and make them your own:
                      </p>

                      {/* Caption Categories */}
                      <div className="space-y-8">
                        {Object.entries(captionTemplates).map(([category, templates]) => (
                          <div key={category}>
                            <h4 className="text-base font-medium tracking-wider uppercase text-stone-950 mb-4 border-b border-stone-200 pb-2">
                              {category === "cta" ? "Call to Action" : category} Captions
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {templates.map((template) => (
                                <div key={template.id} className="bg-white border border-stone-200 p-4 rounded-lg">
                                  <div className="flex items-center justify-between mb-3">
                                    <h5 className="text-xs font-medium tracking-wide text-stone-950">
                                      {template.title}
                                    </h5>
                                    <button
                                      onClick={() => copyToClipboard(template.template, template.id)}
                                      className="p-2 hover:bg-stone-100 rounded-full transition-colors shrink-0"
                                      aria-label="Copy caption"
                                    >
                                      {copiedCaption === template.id ? (
                                        <Check className="w-4 h-4 text-green-600" />
                                      ) : (
                                        <Copy className="w-4 h-4 text-stone-600" />
                                      )}
                                    </button>
                                  </div>
                                  <p className="text-[11px] font-light text-stone-600 leading-relaxed whitespace-pre-wrap">
                                    {template.template}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Upsell for Free Users */}
                    {!isPaidBlueprint && (
                      <BlueprintUpsell onUpgrade={() => {
                        router.push("/checkout/blueprint")
                      }} />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Wizard */}
      {showEditWizard && userInfo && (
        <BlueprintOnboardingWizard
          isOpen={showEditWizard}
          onComplete={async (data) => {
            console.log("[Blueprint Screen] ✅ Wizard completed, answers updated")
            setShowEditWizard(false)
            // Wait for blueprint data to refresh
            await mutateBlueprint()
            // Force a small delay to ensure state updates
            setTimeout(() => {
              mutateBlueprint()
            }, 500)
          }}
          onDismiss={() => setShowEditWizard(false)}
          userName={userInfo.name}
          existingData={{
            business: formData.business,
            dreamClient: formData.dreamClient,
            vibe: formData.vibe,
            lightingKnowledge: formData.lightingKnowledge,
            angleAwareness: formData.angleAwareness,
            editingStyle: formData.editingStyle,
            consistencyLevel: formData.consistencyLevel,
            currentSelfieHabits: formData.currentSelfieHabits,
            feedStyle: blueprint.feedStyle,
          }}
        />
      )}
    </div>
  )
}

// Upsell Component - Promotes Paid Blueprint
function BlueprintUpsell({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="bg-stone-50 border border-stone-200 rounded-lg p-6 sm:p-8 max-w-2xl mx-auto">
      <div className="text-center space-y-6">
        <h3
          className="text-lg sm:text-xl font-medium tracking-wider uppercase text-stone-950"
          style={{ fontFamily: "'Times New Roman', serif" }}
        >
          Bring your Blueprint to life
        </h3>
        <p className="text-sm sm:text-base text-stone-600 font-light leading-relaxed">
          Get 30 custom photos based on your strategy.
        </p>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-md mx-auto">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-stone-950 text-stone-50 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">
                ✓
              </div>
              <p className="text-sm text-stone-700">30 brand photo grids</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-stone-950 text-stone-50 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">
                ✓
              </div>
              <p className="text-sm text-stone-700">Advanced feed planner</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-stone-950 text-stone-50 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">
                ✓
              </div>
              <p className="text-sm text-stone-700">Priority support</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-stone-950 text-stone-50 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">
                ✓
              </div>
              <p className="text-sm text-stone-700">60 credits included</p>
            </div>
          </div>
        </div>
        <div className="text-center pt-2">
          <Button
            onClick={onUpgrade}
            className="bg-stone-950 text-stone-50 px-8 sm:px-12 py-3 sm:py-4 text-xs sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200 rounded-lg"
          >
            Get my 30 photos
          </Button>
        </div>
      </div>
    </div>
  )
}
