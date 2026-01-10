"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, Copy, Check } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { BlueprintEmailCapture } from "@/components/blueprint/blueprint-email-capture"
import { BlueprintConceptCard } from "@/components/blueprint/blueprint-concept-card"
import { BlueprintSelfieUpload } from "@/components/blueprint/blueprint-selfie-upload"
import { startEmbeddedCheckout } from "@/lib/start-embedded-checkout"

interface BrandBlueprintPageClientProps {
  initialEmail: string | null
  initialAccessToken: string | null
  initialResumeStep: number
  initialHasStrategy: boolean
  initialHasGrid: boolean
  initialIsCompleted: boolean
  initialIsPaid: boolean
  initialFormData: Record<string, any> | null
  initialSelectedFeedStyle: string | null
  initialSelfieImages: string[] | null
}

export default function BrandBlueprintPageClient({
  initialEmail,
  initialAccessToken,
  initialResumeStep,
  initialHasStrategy,
  initialHasGrid,
  initialIsCompleted,
  initialIsPaid,
  initialFormData,
  initialSelectedFeedStyle,
  initialSelfieImages,
}: BrandBlueprintPageClientProps) {
  const router = useRouter()
  const urlUpdateRef = useRef(false) // Guard against infinite loops for URL update

  // PR-8: Load email from localStorage if not provided by server
  const loadEmailFromStorage = (): string => {
    if (initialEmail) return initialEmail
    try {
      const storedEmail = localStorage.getItem("blueprint-email")
      if (storedEmail && typeof storedEmail === "string" && storedEmail.includes("@")) {
        return storedEmail
      }
    } catch (error) {
      console.error("[Blueprint] Error reading localStorage:", error)
    }
    return ""
  }

  // Initialize step from server props (resume logic)
  const [step, setStep] = useState(initialResumeStep)
  // PR-8: Email capture shown upfront if no email (REQUIRED before questions)
  const storedEmail = loadEmailFromStorage()
  const [showEmailCapture, setShowEmailCapture] = useState(!storedEmail && !initialEmail && initialResumeStep === 0)
  const [savedEmail, setSavedEmail] = useState(initialEmail || storedEmail)
  const [savedName, setSavedName] = useState(() => {
    try {
      return localStorage.getItem("blueprint-name") || ""
    } catch {
      return ""
    }
  })
  const [copiedCaption, setCopiedCaption] = useState<number | null>(null)
  const [selectedCalendarWeek, setSelectedCalendarWeek] = useState(1)
  const [formData, setFormData] = useState(
    initialFormData || {
      business: "",
      dreamClient: "",
      struggle: "",
      vibe: "",
      postFrequency: "",
      lightingKnowledge: "",
      angleAwareness: "",
      editingStyle: "",
      consistencyLevel: "",
      currentSelfieHabits: "",
    }
  )
  const [animatedScore, setAnimatedScore] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [selectedFeedStyle, setSelectedFeedStyle] = useState(initialSelectedFeedStyle || "")
  const [accessToken, setAccessToken] = useState<string | null>(initialAccessToken)

  const [concepts, setConcepts] = useState<Array<{ title: string; prompt: string; category: string; id?: number; image?: string }>>([])
  const [isLoadingConcepts, setIsLoadingConcepts] = useState(false)
  // Initialize grid from server props if exists
  const [generatedConceptImages, setGeneratedConceptImages] = useState<{ [key: number]: string }>(
    initialHasGrid ? { 0: "" } : {}
  )
  const [savedFrameUrls, setSavedFrameUrls] = useState<string[]>([])
  const [isEmailingConcepts, setIsEmailingConcepts] = useState(false)
  // Initialize selfie images from server props
  const [selfieImages, setSelfieImages] = useState<string[]>(initialSelfieImages || [])
  const [isPaidBlueprintEnabled, setIsPaidBlueprintEnabled] = useState(false)
  
  // Track completion state from server
  const [hasStrategy, setHasStrategy] = useState(initialHasStrategy)
  const [hasGrid, setHasGrid] = useState(initialHasGrid)
  const [isCompleted, setIsCompleted] = useState(initialIsCompleted)

  // Check if paid blueprint feature is enabled (client-side)
  // Uses API endpoint to ensure same source of truth as checkout page
  // Priority: NEXT_PUBLIC override (for local dev) > API endpoint (production)
  useEffect(() => {
    const checkFeatureFlag = async () => {
      try {
        // First, check if NEXT_PUBLIC override is set (for local dev/testing)
        // This allows quick local testing without API call
        const publicOverride = process.env.NEXT_PUBLIC_FEATURE_PAID_BLUEPRINT_ENABLED
        if (publicOverride !== undefined) {
          const enabled = publicOverride === "true" || publicOverride === "1"
          setIsPaidBlueprintEnabled(enabled)
          return
        }

        // Otherwise, fetch from API endpoint (same logic as checkout page)
        const response = await fetch("/api/feature-flags/paid-blueprint")
        if (response.ok) {
          const data = await response.json()
          setIsPaidBlueprintEnabled(data.enabled === true)
        } else {
          // If API fails, default to false (safe)
          console.error("[v0] Failed to fetch feature flag, defaulting to disabled")
          setIsPaidBlueprintEnabled(false)
        }
      } catch (error) {
        // If fetch fails, default to false (safe)
        console.error("[v0] Error checking feature flag:", error)
        setIsPaidBlueprintEnabled(false)
      }
    }

    checkFeatureFlag()
  }, [])

  // PR-8 Hydration Fix: URL update for localStorage-only users (must run first)
  useEffect(() => {
    // Check if URL has email param, if not and localStorage has email, update URL and refresh
    // This enables server-side hydration for localStorage-only users
    if (urlUpdateRef.current) return // Guard against infinite loops
    if (typeof window === "undefined") return // SSR guard

    const urlParams = new URLSearchParams(window.location.search)
    const urlEmail = urlParams.get("email")
    const storedEmail = localStorage.getItem("blueprint-email")

    // If no email param in URL but localStorage has email, update URL
    if (!urlEmail && storedEmail && storedEmail.includes("@") && !initialEmail) {
      urlUpdateRef.current = true // Mark as updated to prevent loop
      router.replace(`/blueprint?email=${encodeURIComponent(storedEmail)}`)
      router.refresh()
      return // Exit early - refresh will re-render with server props
    }
  }, []) // Run once on mount

  // PR-8 Hydration Fix: Unified hydration function
  const hydrateBlueprintState = useCallback(async () => {
    if (!savedEmail || !savedEmail.includes("@")) return
    if (urlUpdateRef.current) return // Don't hydrate if URL was updated (refresh will provide server props)

    try {
      const response = await fetch(`/api/blueprint/get-blueprint?email=${encodeURIComponent(savedEmail)}`)
      if (!response.ok) {
        console.error("[Blueprint] Hydration failed:", response.status)
        return
      }

      const data = await response.json()
      if (!data.success || !data.blueprint) {
        console.error("[Blueprint] Hydration failed: invalid response")
        return
      }

      const blueprint = data.blueprint

      // Hydrate form data if server didn't provide it
      if (!initialFormData || (typeof initialFormData === "object" && Object.keys(initialFormData).length === 0)) {
        if (blueprint.formData && typeof blueprint.formData === "object" && Object.keys(blueprint.formData).length > 0) {
          setFormData(blueprint.formData)
        }
      }

      // Hydrate feed style if server didn't provide it
      if (!initialSelectedFeedStyle && blueprint.feedStyle) {
        setSelectedFeedStyle(blueprint.feedStyle)
      }

      // Hydrate strategy if exists and server didn't indicate it
      if (!initialHasStrategy && blueprint.strategy?.generated && blueprint.strategy?.data) {
        setConcepts([blueprint.strategy.data])
        setHasStrategy(true)
      }

      // Hydrate grid if exists and server didn't indicate it
      if (!initialHasGrid && blueprint.grid?.generated && blueprint.grid?.gridUrl) {
        setGeneratedConceptImages({ 0: blueprint.grid.gridUrl })
        if (blueprint.grid.frameUrls && Array.isArray(blueprint.grid.frameUrls) && blueprint.grid.frameUrls.length === 9) {
          setSavedFrameUrls(blueprint.grid.frameUrls)
        }
        setHasGrid(true)
      }

      // Hydrate selfie images if server didn't provide them
      if ((!initialSelfieImages || initialSelfieImages.length === 0) && blueprint.selfieImages && Array.isArray(blueprint.selfieImages) && blueprint.selfieImages.length > 0) {
        setSelfieImages(blueprint.selfieImages)
      }

      // Hydrate completion status if server didn't indicate it
      if (!initialIsCompleted && blueprint.completed) {
        setIsCompleted(true)
        setHasGrid(true) // If completed, grid must exist
        setStep((currentStep) => currentStep !== 7 ? 7 : currentStep) // Show completed view if not already at step 7
      }
    } catch (error) {
      console.error("[Blueprint] Error hydrating blueprint state:", error)
    }
  }, [savedEmail, initialFormData, initialSelectedFeedStyle, initialHasStrategy, initialHasGrid, initialSelfieImages, initialIsCompleted])

  // Initialize from server props on mount, then hydrate if needed
  useEffect(() => {
    // If completed, ensure we're showing upgrade view (server props win - set step to 7)
    if (initialIsCompleted && step !== 7) {
      setStep(7)
      return // Don't hydrate if server says completed
    }

    // Load saved strategy if server indicated it exists (legacy path - server props win)
    if (initialHasStrategy && savedEmail) {
      loadSavedStrategy()
    }
    
    // Load saved grid if server indicated it exists (legacy path - server props win)
    if (initialHasGrid && savedEmail) {
      loadSavedGrid()
    }

    // PR-8 Hydration Fix: If server didn't provide props (localStorage-only user), hydrate from DB
    // Only hydrate if server didn't indicate any state exists AND URL update didn't happen
    // URL update will trigger refresh with server props, so no need to hydrate client-side
    const hasNoServerState = !initialHasStrategy && !initialHasGrid && !initialIsCompleted && !initialFormData
    if (hasNoServerState && savedEmail && savedEmail.includes("@") && !urlUpdateRef.current) {
      // Only hydrate if URL update didn't happen (URL update will trigger refresh with server props)
      // Small delay to ensure URL update effect has completed
      setTimeout(() => {
        if (!urlUpdateRef.current) {
          hydrateBlueprintState()
        }
      }, 100)
    }
  }, [hydrateBlueprintState]) // Include hydrateBlueprintState in deps (memoized with useCallback)

  // PR-8 Hotfix: Load form data from localStorage if not provided by server
  useEffect(() => {
    // Only load from localStorage if server did not provide form data
    // Check if initialFormData is null, undefined, or empty object
    const hasServerFormData = initialFormData && typeof initialFormData === "object" && Object.keys(initialFormData).length > 0
    
    if (!hasServerFormData) {
      try {
        const storedFormData = localStorage.getItem("blueprint-form-data")
        if (storedFormData) {
          const parsed = JSON.parse(storedFormData)
          // Validate: must be plain object with keys
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && Object.keys(parsed).length > 0) {
            setFormData(parsed)
          }
        }
      } catch (error) {
        console.error("[Blueprint] Error loading form data from localStorage:", error)
        // Continue execution - form data remains in default empty state
      }
    }
  }, []) // Run once on mount

  // PR-8 Hotfix Issue 2: Restore step from localStorage on mount (only if server did not provide resume step)
  // This runs after completion check useEffect above (order matters - server props must win)
  useEffect(() => {
    // Server props MUST win: Only restore if server provided initialResumeStep === 0
    // Guard conditions ensure server props always take precedence:
    // 1. initialResumeStep === 0: Server did not provide resume step (if > 0, server wins)
    // 2. !initialIsCompleted: Not completed (if true, server sets step to 7 via first useEffect)
    // 3. savedEmail exists: Email captured (user has progressed past landing)
    // 4. !showEmailCapture: Not showing email capture modal (email capture already completed)
    const shouldRestoreStep = 
      initialResumeStep === 0 && // Server did not provide resume step (server props win if > 0)
      !initialIsCompleted && // Not completed (completion check useEffect sets step to 7 if true)
      savedEmail && // Email exists (user has progressed past landing)
      savedEmail.length > 0 && // Email is not empty string
      !showEmailCapture // Not showing email capture modal (user has completed email capture)

    if (shouldRestoreStep) {
      try {
        const storedStep = localStorage.getItem("blueprint-last-step")
        if (storedStep) {
          const parsedStep = parseFloat(storedStep)
          // Validate: must be finite number, >= 1 (never restore to 0), and within allowed values
          // Allowed steps: 1, 2, 3, 3.5, 4, 5, 6, 7 (from existing implementation)
          // Step 0 = landing page (never restore to this - user must go through email capture)
          const allowedSteps = [1, 2, 3, 3.5, 4, 5, 6, 7]
          if (
            Number.isFinite(parsedStep) &&
            parsedStep >= 1 &&
            allowedSteps.includes(parsedStep)
          ) {
            setStep(parsedStep)
          }
        }
      } catch (error) {
        console.error("[Blueprint] Error loading step from localStorage:", error)
        // Continue execution - step remains at initialResumeStep (0)
      }
    }
  }, []) // Run once on mount

  // PR-8 Hotfix Issue 2: Persist step to localStorage whenever it changes
  useEffect(() => {
    // Only persist if step is valid (not 0) and email exists (user has progressed past landing)
    // Do not persist step 0 (landing page) as it's the default state
    if (step > 0 && savedEmail && savedEmail.length > 0) {
      try {
        localStorage.setItem("blueprint-last-step", step.toString())
      } catch (error) {
        console.error("[Blueprint] Error saving step to localStorage:", error)
        // Continue execution - step still works, just not persisted
      }
    }
  }, [step, savedEmail])

  // Load saved strategy from API
  const loadSavedStrategy = async () => {
    if (!savedEmail || hasStrategy) return
    
    try {
      const response = await fetch(`/api/blueprint/get-blueprint?email=${encodeURIComponent(savedEmail)}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.blueprint?.strategy?.generated && data.blueprint?.strategy?.data) {
          setConcepts([data.blueprint.strategy.data])
          setHasStrategy(true)
        }
      }
    } catch (error) {
      console.error("[Blueprint] Error loading strategy:", error)
    }
  }

  // Load saved grid from API
  const loadSavedGrid = async () => {
    if (!savedEmail || hasGrid) return
    
    try {
      const response = await fetch(`/api/blueprint/get-blueprint?email=${encodeURIComponent(savedEmail)}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.blueprint?.grid?.generated && data.blueprint?.grid?.gridUrl) {
          setGeneratedConceptImages({ 0: data.blueprint.grid.gridUrl })
          if (data.blueprint.grid.frameUrls && Array.isArray(data.blueprint.grid.frameUrls) && data.blueprint.grid.frameUrls.length === 9) {
            setSavedFrameUrls(data.blueprint.grid.frameUrls)
          }
          setHasGrid(true)
          setIsCompleted(true)
        }
      }
    } catch (error) {
      console.error("[Blueprint] Error loading grid:", error)
    }
  }

  // Save formData to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("blueprint-form-data", JSON.stringify(formData))
    } catch (error) {
      console.error("[v0] Error saving form data to localStorage:", error)
    }
  }, [formData])

  // PR-8: Update URL with email when it's captured (for resume capability)
  // Also sync localStorage with URL if email comes from URL param
  useEffect(() => {
    if (savedEmail) {
      // Update URL without reload if email not already in URL
      const url = new URL(window.location.href)
      if (!url.searchParams.has("email") && !url.searchParams.has("token")) {
        url.searchParams.set("email", savedEmail)
        window.history.replaceState({}, "", url.toString())
      }
      
      // Ensure localStorage is synced
      try {
        const storedEmail = localStorage.getItem("blueprint-email")
        if (storedEmail !== savedEmail) {
          localStorage.setItem("blueprint-email", savedEmail)
        }
      } catch (error) {
        console.error("[Blueprint] Error syncing localStorage:", error)
      }
    }
  }, [savedEmail, initialEmail])

  const calculateScore = useCallback(() => {
    let score = 0
    if (formData.lightingKnowledge === "expert") score += 20
    else if (formData.lightingKnowledge === "good") score += 15
    else if (formData.lightingKnowledge === "basic") score += 10
    else score += 5

    if (formData.angleAwareness === "yes") score += 20
    else score += 10

    if (formData.editingStyle === "consistent") score += 20
    else if (formData.editingStyle === "sometimes") score += 15
    else score += 8

    if (formData.consistencyLevel === "daily") score += 20
    else if (formData.consistencyLevel === "weekly") score += 15
    else if (formData.consistencyLevel === "monthly") score += 10
    else score += 5

    if (formData.currentSelfieHabits === "strategic") score += 20
    else if (formData.currentSelfieHabits === "regular") score += 15
    else score += 8

    return score
  }, [formData.lightingKnowledge, formData.angleAwareness, formData.editingStyle, formData.consistencyLevel, formData.currentSelfieHabits])

  useEffect(() => {
    if (step === 4) {
      const targetScore = calculateScore()
      let current = 0
      const increment = targetScore / 30
      const timer = setInterval(() => {
        current += increment
        if (current >= targetScore) {
          setAnimatedScore(targetScore)
          clearInterval(timer)
          setTimeout(() => setShowConfetti(true), 500)
        } else {
          setAnimatedScore(Math.floor(current))
        }
      }, 30)
      return () => clearInterval(timer)
    }
  }, [step, calculateScore])

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text)
    setCopiedCaption(id)
    setTimeout(() => setCopiedCaption(null), 2000)
  }

  const _getIndustryExample = () => {
    const examples: Record<string, string> = {
      coach: "life coaches and wellness experts",
      "life coach": "life coaches and wellness experts",
      designer: "fashion designers and creatives",
      fashion: "fashion designers and style experts",
      wellness: "wellness practitioners and health coaches",
      consultant: "consultants and business advisors",
      entrepreneur: "entrepreneurs and founders",
    }

    const business = formData.business.toLowerCase()
    for (const [key, value] of Object.entries(examples)) {
      if (business.includes(key)) return value
    }
    return "personal brand entrepreneurs"
  }

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

  const feedExamples = {
    luxury: {
      name: "Dark & Moody",
      colors: ["#0a0a0a", "#2d2d2d", "#4a4a4a"],
      grid: ["selfie", "selfie", "flatlay", "selfie", "selfie", "selfie", "flatlay", "selfie", "selfie"],
    },
    minimal: {
      name: "Light & Minimalistic",
      colors: ["#f5f5f5", "#e5e5e5", "#d4d4d4"],
      grid: ["selfie", "selfie", "selfie", "flatlay", "selfie", "selfie", "selfie", "flatlay", "selfie"],
    },
    beige: {
      name: "Beige Aesthetic",
      colors: ["#c9b8a8", "#a89384", "#8a7968"],
      grid: ["selfie", "flatlay", "selfie", "selfie", "selfie", "selfie", "selfie", "flatlay", "selfie"],
    },
  }

  const handleEmailSuccess = (email: string, name: string, accessToken: string) => {
    setSavedEmail(email)
    setSavedName(name)
    setAccessToken(accessToken)
    setShowEmailCapture(false)
    
    // PR-8: Save to localStorage for resume capability
    try {
      localStorage.setItem("blueprint-email", email)
      localStorage.setItem("blueprint-name", name)
      if (accessToken) {
        localStorage.setItem("blueprint-access-token", accessToken)
      }
    } catch (error) {
      console.error("[Blueprint] Error saving to localStorage:", error)
      // Continue even if localStorage fails
    }
    
    // PR-8: After email capture, proceed to step 1 (questions) if we're at step 0
    if (step === 0) {
      setStep(1)
    } else if (step === 2) {
      setStep(3) // Move to Feed Style selection (legacy path)
    } else if (step === 6) {
      // If coming from step 6 (caption templates) and email capture is triggered
      emailConcepts()
    }
  }

  const generateConcepts = async (): Promise<boolean> => {
    // PR-8: Email is required - should never reach here without email, but safety check
    if (!savedEmail) {
      console.error("[Blueprint] Attempted to generate concepts without email - this should not happen")
      setShowEmailCapture(true)
      setStep(0) // Force back to email capture
      return false
    }

    // PR-8: Never regenerate if strategy already exists
    if (hasStrategy) {
      console.log("[Blueprint] Strategy already exists, skipping regeneration")
      // Load existing strategy if not already loaded
      if (concepts.length === 0) {
        await loadSavedStrategy()
      }
      return true
    }

    setIsLoadingConcepts(true)
    try {
      const response = await fetch("/api/blueprint/generate-concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formData,
          selectedFeedStyle,
          email: savedEmail,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      setConcepts(data.concepts)
      setHasStrategy(true)
      return true
    } catch (error) {
      console.error("[Blueprint] Error generating concepts:", error)
      alert(error instanceof Error ? error.message : "Failed to generate strategy")
      return false
    } finally {
      setIsLoadingConcepts(false)
    }
  }

  const emailConcepts = async () => {
    // PR-8: Email is required - should never reach here without email, but safety check
    if (!savedEmail) {
      console.error("[Blueprint] Attempted to email concepts without email - this should not happen")
      setShowEmailCapture(true)
      setStep(0) // Force back to email capture
      return
    }

    setIsEmailingConcepts(true)
    try {
      const conceptsWithImages = concepts
        .map((concept, idx) => ({
          ...concept,
          imageUrl: generatedConceptImages[idx] || null,
        }))
        .filter((c) => c.imageUrl)

      if (conceptsWithImages.length === 0) {
        alert("Please generate at least one concept image first!")
        setIsEmailingConcepts(false)
        return
      }

      const blueprintData = {
        formData,
        selectedFeedStyle,
        score: calculateScore(),
        captionTemplates,
        contentCalendar: getContentCalendar(),
      }

      // console.log("[v0] Sending email with full blueprint:", {
      //   email: savedEmail,
      //   name: savedName,
      //   conceptCount: conceptsWithImages.length,
      // })

      const response = await fetch("/api/blueprint/email-concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: savedEmail,
          name: savedName,
          concepts: conceptsWithImages,
          blueprint: blueprintData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("[Blueprint] Email error response:", data)
        
        // Show user-friendly error message
        const errorMessage = data.error || "Failed to send email"
        
        // Special handling for test mode
        if (data.testMode) {
          alert("⚠️ Email sending is currently in test mode. Your email address needs to be whitelisted. Please contact support or try again later.")
        } else {
          alert(`❌ ${errorMessage}`)
        }
        
        throw new Error(errorMessage)
      }

      // console.log("[v0] Email sent successfully:", data)
      alert("✓ Blueprint sent to your email! Check your inbox (and spam folder just in case).")
    } catch (error) {
      console.error("[v0] Error emailing concepts:", error)
      alert(`Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsEmailingConcepts(false)
    }
  }

  const handleStartCheckout = async (productId: string = "one_time_session") => {
    try {
      const clientSecret = await startEmbeddedCheckout(productId)
      window.location.href = `/checkout?client_secret=${clientSecret}`
    } catch (error) {
      console.error("[v0] Checkout error:", error)
      alert("Failed to start checkout. Please try again.")
    }
  }

  if (showEmailCapture) {
    return <BlueprintEmailCapture onSuccess={handleEmailSuccess} formData={formData} currentStep={step} />
  }

  return (
    <div className="relative min-h-screen bg-stone-50">
      <div
        className="fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: "url(/images/2-20-281-29.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="fixed inset-0 z-0 bg-stone-50/95" />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-stone-50/80 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link
            href="/"
            style={{ fontFamily: "'Times New Roman', serif" }}
            className="text-lg sm:text-xl md:text-2xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] uppercase text-stone-950"
          >
            SSELFIE
          </Link>
          {isPaidBlueprintEnabled ? (
            <Link
              href={savedEmail ? `/checkout/blueprint?email=${encodeURIComponent(savedEmail)}` : "/checkout/blueprint"}
              className="bg-stone-950 text-stone-50 px-3 py-1.5 sm:px-6 sm:py-2 text-[10px] sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200"
            >
              Get 30 Photos
            </Link>
          ) : (
            <button
              onClick={() => handleStartCheckout("one_time_session")}
              className="bg-stone-950 text-stone-50 px-3 py-1.5 sm:px-6 sm:py-2 text-[10px] sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200"
            >
              Join Studio
            </button>
          )}
        </div>
      </nav>

      {/* Progress Bar */}
      {step > 0 && step < 6 && (
        <div className="fixed top-[57px] sm:top-[73px] left-0 right-0 h-1 bg-stone-200 z-40">
          <div className="h-full bg-stone-950 transition-all duration-500" style={{ width: `${(step / 6) * 100}%` }} />
        </div>
      )}

      {/* Content */}
      <div className="pt-20 sm:pt-24 relative z-10">
        {/* Step 0: Landing */}
        {step === 0 && (
          <div
            className="relative min-h-screen flex items-end justify-center overflow-hidden"
            style={{
              minHeight: "100dvh",
            }}
          >
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: "url('https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-pro-generations/x7d928rnjsrmr0cvknvss5q6xm-B9fjSTkpQhQHUq3pBPExL4Pjcm5jNU.png')",
                backgroundPosition: "50% 25%",
              }}
            />
            {/* Dark Overlay for Better Text Readability */}
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.4)",
              }}
            />
            {/* Gradient Overlay - same as homepage */}
            <div
              className="absolute inset-0"
              style={{
                background: "radial-gradient(circle at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.3) 100%)",
              }}
            />
            
            {/* Hero Content - positioned at bottom (matching Paid Blueprint) */}
            <div className="relative z-10 max-w-4xl mx-auto text-center px-4 sm:px-6 pb-8 sm:pb-20 pt-8 sm:pt-20">
              <span
                className="block mb-2 sm:mb-4 text-xs sm:text-base font-light tracking-[0.2em] uppercase text-white"
                style={{ textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}
              >
                Your Blueprint
              </span>
              <h1
                style={{
                  fontFamily: "'Times New Roman', serif",
                  fontStyle: "normal",
                  fontWeight: 300,
                  textShadow: "0 2px 20px rgba(0,0,0,0.3)",
                }}
                className="text-2xl sm:text-5xl md:text-6xl lg:text-7xl font-light mb-2 sm:mb-6 text-white leading-[1.1] tracking-tight"
              >
                Get your free custom blueprint
              </h1>
              <p
                className="text-sm sm:text-lg md:text-xl leading-relaxed mb-4 sm:mb-8 max-w-xl mx-auto text-white"
                style={{ textShadow: "0 1px 5px rgba(0,0,0,0.3)" }}
              >
                Get your free 30-day content calendar, caption templates, brand strategy guide, and generate your free Instagram grid with your selfies.
              </p>
              <div className="mb-6 sm:mb-8 max-w-xl mx-auto">
                <ul className="text-left space-y-2 sm:space-y-3 text-sm sm:text-base font-light text-white" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
                  <li className="flex items-start gap-2 sm:gap-3">
                    <span className="text-white mt-0.5 shrink-0">✓</span>
                    <span>Discover your unique content vibe</span>
                  </li>
                  <li className="flex items-start gap-2 sm:gap-3">
                    <span className="text-white mt-0.5 shrink-0">✓</span>
                    <span>Get 30 days of post ideas (done for you)</span>
                  </li>
                  <li className="flex items-start gap-2 sm:gap-3">
                    <span className="text-white mt-0.5 shrink-0">✓</span>
                    <span>Learn which photos work best for your audience</span>
                  </li>
                  <li className="flex items-start gap-2 sm:gap-3">
                    <span className="text-white mt-0.5 shrink-0">✓</span>
                    <span>100% free • No credit card • Takes 10 minutes</span>
                  </li>
                </ul>
              </div>
              <div style={{ transitionDelay: "0.2s", marginTop: "8px" }}>
                <button
                  onClick={() => {
                    // PR-8: Email capture REQUIRED before proceeding to questions
                    if (!savedEmail) {
                      setShowEmailCapture(true)
                      // Prevent proceeding without email
                      return
                    }
                    // If email exists, proceed to questions (step 1)
                    setStep(1)
                  }}
                  disabled={!savedEmail}
                  className="bg-white text-black px-4 sm:px-8 py-2.5 sm:py-3.5 rounded-lg text-xs sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200 min-h-[40px] sm:min-h-[44px] flex items-center justify-center whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savedEmail ? "Start your blueprint →" : "Get started →"}
                </button>
              </div>
              <p className="mt-4 text-xs sm:text-sm font-light text-white/90" style={{ textShadow: "0 1px 5px rgba(0,0,0,0.3)", fontSize: "14px", marginTop: "16px" }}>
                Join 2,700+ creators who&apos;ve done this
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="min-h-[calc(100vh-80px)] sm:min-h-[calc(100vh-96px)] flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
            <div className="max-w-2xl w-full">
              <h2
                style={{ fontFamily: "'Times New Roman', serif" }}
                className="text-2xl sm:text-3xl md:text-5xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-3 sm:mb-4 text-stone-950"
              >
                Let&apos;s build your brand
              </h2>
              <p className="text-xs sm:text-sm font-light text-stone-600 mb-6 sm:mb-8 leading-relaxed">
                Answer a few questions so we can create your personalized blueprint.
              </p>

              <div className="space-y-6 sm:space-y-8">
                <div>
                  <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                    What do you do? (Your business or profession)
                  </label>
                  <input
                    type="text"
                    value={formData.business}
                    onChange={(e) => setFormData({ ...formData, business: e.target.value })}
                    placeholder="e.g., Life Coach, Designer, Consultant..."
                    className="w-full border-b border-stone-300 py-3 sm:py-4 text-sm sm:text-base focus:outline-none focus:border-stone-950 transition-colors font-light bg-transparent"
                  />
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                    Who do you help?
                  </label>
                  <input
                    type="text"
                    value={formData.dreamClient}
                    onChange={(e) => setFormData({ ...formData, dreamClient: e.target.value })}
                    placeholder="e.g., Women entrepreneurs, New moms, Career changers..."
                    className="w-full border-b border-stone-300 py-3 sm:py-4 text-sm sm:text-base focus:outline-none focus:border-stone-950 transition-colors font-light bg-transparent"
                  />
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                    What&apos;s your vibe?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                    {["Luxury", "Minimal", "Beige", "Warm", "Edgy", "Professional"].map((vibe) => (
                      <button
                        key={vibe}
                        onClick={() => setFormData({ ...formData, vibe: vibe.toLowerCase() })}
                        className={`py-3 sm:py-3 px-3 sm:px-4 text-[10px] sm:text-xs tracking-wider uppercase border transition-all duration-200 ${
                          formData.vibe === vibe.toLowerCase()
                            ? "border-stone-950 bg-stone-950 text-stone-50"
                            : "border-stone-300 text-stone-700 hover:border-stone-950"
                        }`}
                      >
                        {vibe}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-8 sm:mt-12">
                <button
                  onClick={() => setShowEmailCapture(true)}
                  className="w-full sm:flex-1 py-3 sm:py-4 border border-stone-300 text-stone-600 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase font-light hover:border-stone-950 hover:text-stone-950 transition-all duration-300"
                >
                  Save progress
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!formData.business || !formData.dreamClient || !formData.vibe}
                  className="w-full sm:flex-1 py-3 sm:py-4 bg-stone-950 text-stone-50 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase font-light hover:bg-stone-800 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Continue →
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="min-h-[calc(100vh-80px)] sm:min-h-[calc(100vh-96px)] flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
            <div className="max-w-2xl w-full">
              <h2
                style={{ fontFamily: "'Times New Roman', serif" }}
                className="text-2xl sm:text-3xl md:text-5xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-3 sm:mb-4 text-stone-950"
              >
                Your content skills
              </h2>
              <p className="text-xs sm:text-sm font-light text-stone-600 mb-6 sm:mb-8 leading-relaxed">
                Let&apos;s understand where you&apos;re at so we can give you personalized guidance.
              </p>

              <div className="space-y-6 sm:space-y-8">
                <div>
                  <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                    How&apos;s your lighting knowledge?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {[
                      { value: "expert", label: "I know my angles & light" },
                      { value: "good", label: "Pretty good" },
                      { value: "basic", label: "Basic understanding" },
                      { value: "learning", label: "Still learning" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFormData({ ...formData, lightingKnowledge: option.value })}
                        className={`py-3 px-4 text-xs tracking-wider uppercase border transition-all duration-200 ${
                          formData.lightingKnowledge === option.value
                            ? "border-stone-950 bg-stone-950 text-stone-50"
                            : "border-stone-300 text-stone-700 hover:border-stone-950"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                    Do you know your best angles?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {[
                      { value: "yes", label: "Yes, I've got this!" },
                      { value: "no", label: "Not really" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFormData({ ...formData, angleAwareness: option.value })}
                        className={`py-3 px-4 text-xs tracking-wider uppercase border transition-all duration-200 ${
                          formData.angleAwareness === option.value
                            ? "border-stone-950 bg-stone-950 text-stone-50"
                            : "border-stone-300 text-stone-700 hover:border-stone-950"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                    How do you edit your photos?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {[
                      { value: "consistent", label: "Consistent preset/style" },
                      { value: "sometimes", label: "Sometimes I edit" },
                      { value: "minimal", label: "Minimal editing" },
                      { value: "none", label: "No editing" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFormData({ ...formData, editingStyle: option.value })}
                        className={`py-3 px-4 text-xs tracking-wider uppercase border transition-all duration-200 ${
                          formData.editingStyle === option.value
                            ? "border-stone-950 bg-stone-950 text-stone-50"
                            : "border-stone-300 text-stone-700 hover:border-stone-950"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                    How consistent are you with posting?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {[
                      { value: "daily", label: "Daily or almost daily" },
                      { value: "weekly", label: "Few times a week" },
                      { value: "monthly", label: "Once a week or less" },
                      { value: "sporadic", label: "Very sporadic" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFormData({ ...formData, consistencyLevel: option.value })}
                        className={`py-3 px-4 text-xs tracking-wider uppercase border transition-all duration-200 ${
                          formData.consistencyLevel === option.value
                            ? "border-stone-950 bg-stone-950 text-stone-50"
                            : "border-stone-300 text-stone-700 hover:border-stone-950"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                    How do you currently use selfies in your content?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {[
                      { value: "strategic", label: "Strategic & planned" },
                      { value: "regular", label: "Regular but random" },
                      { value: "occasional", label: "Occasionally" },
                      { value: "rarely", label: "Rarely or never" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFormData({ ...formData, currentSelfieHabits: option.value })}
                        className={`py-3 px-4 text-xs tracking-wider uppercase border transition-all duration-200 ${
                          formData.currentSelfieHabits === option.value
                            ? "border-stone-950 bg-stone-950 text-stone-50"
                            : "border-stone-300 text-stone-700 hover:border-stone-950"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-8 sm:mt-12">
                <button
                  onClick={() => setStep(1)}
                  className="w-full sm:flex-1 py-3 sm:py-4 border border-stone-300 text-stone-600 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase font-light hover:border-stone-950 hover:text-stone-950 transition-all duration-300"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    // PR-8: Email is required upfront, but safety check in case of edge cases
                    if (!savedEmail) {
                      console.error("[Blueprint] Email missing at step 2 - forcing email capture")
                      setShowEmailCapture(true)
                      setStep(0) // Force back to beginning
                      return
                    }
                    setStep(3)
                  }}
                  disabled={
                    !formData.lightingKnowledge ||
                    !formData.angleAwareness ||
                    !formData.editingStyle ||
                    !formData.consistencyLevel ||
                    !formData.currentSelfieHabits ||
                    !savedEmail
                  }
                  className="w-full sm:flex-1 py-3 sm:py-4 bg-stone-950 text-stone-50 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase font-light hover:bg-stone-800 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Continue →
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="min-h-[calc(100vh-80px)] sm:min-h-[calc(100vh-96px)] px-4 sm:px-6 py-8 sm:py-12">
            <div className="max-w-5xl mx-auto">
              <div className="mb-12 sm:mb-16">
                <h2
                  style={{ fontFamily: "'Times New Roman', serif" }}
                  className="text-2xl sm:text-3xl md:text-4xl font-light text-center mb-8 sm:mb-12 text-stone-950"
                >
                  Here&apos;s how creators who show up consistently structure their feeds
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
                  {/* 80% You */}
                  <div className="bg-white border border-stone-200 p-6 sm:p-8">
                    <div
                      style={{ fontFamily: "'Times New Roman', serif" }}
                      className="text-6xl sm:text-7xl font-light mb-4 text-stone-950"
                    >
                      80%
                    </div>
                    <h3 className="text-sm tracking-wider uppercase text-stone-700 mb-4">You</h3>
                    <p className="text-sm font-light leading-relaxed text-stone-600">
                      Selfies and personal brand photos that showcase your face, your story, your authority. This is
                      where connection happens.
                    </p>
                  </div>

                  {/* 20% Flatlays */}
                  <div className="bg-white border border-stone-200 p-6 sm:p-8">
                    <div
                      style={{ fontFamily: "'Times New Roman', serif" }}
                      className="text-6xl sm:text-7xl font-light mb-4 text-stone-950"
                    >
                      20%
                    </div>
                    <h3 className="text-sm tracking-wider uppercase text-stone-700 mb-4">Flatlays</h3>
                    <p className="text-sm font-light leading-relaxed text-stone-600">
                      Products, lifestyle shots, aesthetic imagery that adds visual variety while maintaining your brand
                      aesthetic.
                    </p>
                  </div>
                </div>

                {/* Grid Examples */}
                <div className="mt-12">
                  <div className="text-center mb-8">
                    <h3 className="text-lg font-medium text-stone-950 mb-2">See It In Action</h3>
                    <p className="text-sm font-light text-stone-600 max-w-2xl mx-auto mb-8">
                      Here are 3 grid examples showing the same personal branding strategy across different aesthetics.
                      Notice how each grid maintains consistent visibility while expressing a completely different style.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {/* Dark & Moody */}
                    <div className="space-y-3">
                      <div className="aspect-square rounded-lg border-2 border-stone-300 overflow-hidden relative">
                        <Image
                          src="https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/darkandmoody.png"
                          alt="Dark and moody aesthetic grid example"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="text-center">
                        <span className="inline-block px-4 py-1 bg-stone-950 text-stone-50 text-xs tracking-wider uppercase font-medium rounded-full">
                          Dark & Moody
                        </span>
                      </div>
                    </div>

                    {/* Light & Minimalistic */}
                    <div className="space-y-3">
                      <div className="aspect-square rounded-lg border-2 border-stone-300 overflow-hidden relative">
                        <Image
                          src="https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/Light%20%26%20Minimalistic.png"
                          alt="Light and minimalistic aesthetic grid example"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="text-center">
                        <span className="inline-block px-4 py-1 bg-stone-950 text-stone-50 text-xs tracking-wider uppercase font-medium rounded-full">
                          Light & Minimalistic
                        </span>
                      </div>
                    </div>

                    {/* Beige Aesthetic */}
                    <div className="space-y-3">
                      <div className="aspect-square rounded-lg border-2 border-stone-300 overflow-hidden relative">
                        <Image
                          src="https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/Beige%20Aesthetic.png"
                          alt="Beige aesthetic grid example"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="text-center">
                        <span className="inline-block px-4 py-1 bg-stone-950 text-stone-50 text-xs tracking-wider uppercase font-medium rounded-full">
                          Beige Aesthetic
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 bg-stone-100 p-6 rounded-lg max-w-3xl mx-auto">
                  <p className="text-sm font-light leading-relaxed text-stone-700 text-center">
                    <strong>See the pattern?</strong> Each grid uses a completely different aesthetic (light, dark, beige) but
                    they all maintain consistent visibility. That&apos;s what builds your personal brand. Your blueprint
                    will help you create this cohesive look based on YOUR unique style.
                  </p>
                </div>
              </div>
            </div>

            <h2
              style={{ fontFamily: "'Times New Roman', serif" }}
              className="text-2xl sm:text-3xl md:text-5xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-3 sm:mb-4 text-stone-950 text-center"
            >
              Choose your feed aesthetic
            </h2>
            <p className="text-xs sm:text-sm font-light text-stone-600 mb-8 sm:mb-12 leading-relaxed text-center px-4">
              Pick a vibe that feels like you. Don&apos;t worry, you can always switch things up later!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
              {Object.entries(feedExamples).map(([key, style]) => (
                <div
                  key={key}
                  onClick={() => setSelectedFeedStyle(key)}
                  className={`cursor-pointer transition-all duration-300 ${
                    selectedFeedStyle === key ? "scale-105" : "hover:scale-102"
                  }`}
                >
                  <div className="border-2 border-stone-200 p-4 bg-white">
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {style.grid.map((type, idx) => (
                        <div
                          key={idx}
                          className={`aspect-square rounded ${key === "minimal" ? "border border-stone-300" : ""}`}
                          style={{
                            backgroundColor: type === "selfie" ? style.colors[0] : style.colors[1],
                          }}
                        />
                      ))}
                    </div>
                    <h3 className="text-sm font-medium tracking-wider uppercase text-stone-950 mb-2">{style.name}</h3>
                    <div className="flex gap-2">
                      {style.colors.map((color, idx) => (
                        <div
                          key={idx}
                          className={`w-6 h-6 rounded-full ${key === "minimal" ? "border border-stone-300" : "border border-stone-200"}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    className={`w-full py-3 mt-4 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase border transition-all duration-200 ${
                      selectedFeedStyle === key
                        ? "border-stone-950 bg-stone-950 text-stone-50"
                        : "border-stone-300 text-stone-700 hover:border-stone-950"
                    }`}
                  >
                    {selectedFeedStyle === key ? "SELECTED" : "SELECT"}
                  </button>
                </div>
              ))}
            </div>

            {/* Selfie Upload Section */}
            <div className="mt-8 sm:mt-12 mb-8 sm:mb-12">
              <div className="bg-white border border-stone-200 rounded-lg p-6 sm:p-8">
                <h3
                  style={{ fontFamily: "'Times New Roman', serif" }}
                  className="text-xl sm:text-2xl font-light mb-2 text-stone-950"
                >
                  Upload your selfies
                </h3>
                <p className="text-sm font-light text-stone-600 mb-6">
                  Upload 1-3 selfies to generate your personalized photo grid. These will be used as reference images.
                </p>
                <BlueprintSelfieUpload
                  onUploadComplete={(imageUrls) => setSelfieImages(imageUrls)}
                  maxImages={3}
                  initialImages={selfieImages}
                  email={savedEmail}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-8 sm:mt-12">
              <button
                onClick={() => setStep(2)}
                className="w-full sm:flex-1 py-3 sm:py-4 border border-stone-300 text-stone-600 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase font-light hover:border-stone-950 hover:text-stone-950 transition-all duration-300"
              >
                Back
              </button>
              <div className="w-full sm:flex-1 flex flex-col gap-2">
                {/* PR-8: Email is required upfront - this is a safety check only */}
                {!savedEmail && (
                  <p className="text-xs text-red-500 text-center mb-1">
                    Email required - returning to start
                  </p>
                )}
                <button
                  onClick={async () => {
                    // PR-8: Email is required upfront, but safety check
                    if (!savedEmail) {
                      console.error("[Blueprint] Email missing at step 3 - forcing email capture")
                      setShowEmailCapture(true)
                      setStep(0) // Force back to beginning
                      return
                    }
                    const success = await generateConcepts()
                    // Only advance step if concepts were successfully generated
                    if (success) {
                      setStep(3.5)
                    }
                  }}
                  disabled={!selectedFeedStyle || selfieImages.length === 0 || !savedEmail}
                  className="w-full py-3 sm:py-4 bg-stone-950 text-stone-50 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase font-light hover:bg-stone-800 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Create my feed →
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3.5 && (
          <div className="min-h-[calc(100vh-80px)] sm:min-h-[calc(100vh-96px)] px-4 sm:px-6 py-8 sm:py-12">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-8 sm:mb-12">
                <h2
                  style={{ fontFamily: "'Times New Roman', serif" }}
                  className="text-2xl sm:text-3xl md:text-5xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-3 sm:mb-4 text-stone-950"
                >
                  Create your feed
                </h2>
                <p className="text-xs sm:text-sm font-light text-stone-600 leading-relaxed max-w-2xl mx-auto px-4">
                  Based on your {selectedFeedStyle} vibe, generate your personalized 3x3 photo grid. Click &quot;Generate Grid&quot;
                  to create your brand photos, then use them to build your consistent feed.
                </p>
              </div>

              {isLoadingConcepts ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
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
                  <p className="text-sm text-stone-600 font-light">Creating your feed...</p>
                </div>
              ) : (
                <>
                  <div className="max-w-md mx-auto mb-8">
                    {concepts.length > 0 && (
                      <BlueprintConceptCard
                        concept={concepts[0]}
                        index={0}
                        selfieImages={selfieImages}
                        selectedFeedStyle={selectedFeedStyle}
                        category={formData.vibe}
                        email={savedEmail}
                        initialGridUrl={generatedConceptImages[0] || undefined}
                        initialFrameUrls={savedFrameUrls.length === 9 ? savedFrameUrls : undefined}
                        onImageGenerated={(imageUrl) => {
                          setGeneratedConceptImages((prev) => ({ ...prev, [0]: imageUrl }))
                        }}
                      />
                    )}
                  </div>

                  <div className="text-center bg-stone-100 p-6 rounded-lg max-w-2xl mx-auto">
                    <p className="text-sm font-light leading-relaxed text-stone-700 mb-4">
                      💡 <strong>Pro tip:</strong> This grid is your personalized brand photoshoot. Generate it to see your
                      consistent feed style, then use it to build your Instagram presence with confidence.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-8 sm:mt-12">
                    <button
                      onClick={() => setStep(3)}
                      className="w-full sm:flex-1 py-3 sm:py-4 border border-stone-300 text-stone-600 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase font-light hover:border-stone-950 hover:text-stone-950 transition-all duration-300"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setStep(4)}
                      className="w-full sm:flex-1 py-3 sm:py-4 bg-stone-950 text-stone-50 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase font-light hover:bg-stone-800 transition-all duration-300"
                    >
                      See my score →
                    </button>
                  </div>

                  {/* Paid Blueprint CTA - Step 3.5 */}
                  {isPaidBlueprintEnabled && savedEmail && (
                    <div className="mt-8 sm:mt-12 bg-stone-50 border border-stone-200 rounded-lg p-6 sm:p-8 max-w-2xl mx-auto">
                      <h3 className="text-lg sm:text-xl font-medium tracking-wider uppercase text-stone-950 mb-2 text-center">
                        Bring your Blueprint to life
                      </h3>
                      <p className="text-sm sm:text-base text-stone-600 font-light leading-relaxed text-center mb-6">
                        Get 30 custom photos based on your strategy.
                      </p>
                      <div className="text-center">
                        <Link
                          href={`/checkout/blueprint?email=${encodeURIComponent(savedEmail)}`}
                          className="inline-block bg-stone-950 text-stone-50 px-8 sm:px-12 py-3 sm:py-4 text-xs sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200 rounded-lg"
                        >
                          Get my 30 photos
                        </Link>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="min-h-[calc(100vh-80px)] sm:min-h-[calc(100vh-96px)] flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 relative overflow-hidden">
            {/* Confetti */}
            {showConfetti && (
              <>
                {[...Array(30)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 rounded-full animate-fall"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `-10px`,
                      backgroundColor: ["#292524", "#78716c", "#a8a29e"][Math.floor(Math.random() * 3)],
                      animationDuration: `${2 + Math.random() * 2}s`,
                      animationDelay: `${Math.random() * 0.5}s`,
                    }}
                  />
                ))}
              </>
            )}

            <div className="max-w-3xl w-full text-center">
              <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 sm:mb-6 text-stone-950" />
              <h2
                style={{ fontFamily: "'Times New Roman', serif" }}
                className="text-2xl sm:text-3xl md:text-5xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-3 sm:mb-4 text-stone-950"
              >
                Your visibility score
              </h2>

              <div className="mb-8 sm:mb-12">
                <div className="text-7xl sm:text-8xl md:text-9xl font-extralight text-stone-950 mb-3 sm:mb-4">
                  {animatedScore}
                </div>
                <div className="text-xs sm:text-sm font-light tracking-wider uppercase text-stone-600">out of 100</div>
              </div>

              {animatedScore === calculateScore() && (
                <div className="space-y-4 sm:space-y-6 text-left max-w-xl mx-auto animate-fade-in px-4">
                  {animatedScore >= 80 && (
                    <div className="bg-stone-100 p-4 sm:p-6 rounded-lg">
                      <h3 className="text-base sm:text-lg font-medium tracking-wider uppercase text-stone-950 mb-2">
                        You&apos;re doing great
                      </h3>
                      <p className="text-xs sm:text-sm font-light text-stone-700 leading-relaxed">
                        You&apos;ve got the basics down. Now let&apos;s help you show up consistently with content that builds your brand.
                      </p>
                    </div>
                  )}
                  {animatedScore >= 50 && animatedScore < 80 && (
                    <div className="bg-stone-100 p-4 sm:p-6 rounded-lg">
                      <h3 className="text-base sm:text-lg font-medium tracking-wider uppercase text-stone-950 mb-2">
                        You&apos;re on the right track
                      </h3>
                      <p className="text-xs sm:text-sm font-light text-stone-700 leading-relaxed">
                        You&apos;re doing better than most. A few small tweaks to your lighting and posting rhythm, and you&apos;ll start seeing real results.
                      </p>
                    </div>
                  )}
                  {animatedScore < 50 && (
                    <div className="bg-stone-100 p-4 sm:p-6 rounded-lg">
                      <h3 className="text-base sm:text-lg font-medium tracking-wider uppercase text-stone-950 mb-2">
                        Perfect timing
                      </h3>
                      <p className="text-xs sm:text-sm font-light text-stone-700 leading-relaxed">
                        This is actually exciting. You&apos;re about to learn exactly how to use selfies strategically. Your blueprint will walk you through every step.
                      </p>
                    </div>
                  )}

                  <div className="bg-stone-950 text-stone-50 p-4 sm:p-6 rounded-lg">
                    <h3 className="text-xs sm:text-sm font-medium tracking-wider uppercase mb-2">
                      Here&apos;s what to focus on first
                    </h3>
                    <p className="text-xs sm:text-sm font-light leading-relaxed">
                      {formData.consistencyLevel === "sporadic" || formData.consistencyLevel === "monthly"
                        ? "Let's work on showing up consistently! Your calendar will make posting so much easier—no more staring at a blank screen wondering what to post."
                        : formData.lightingKnowledge === "learning" || formData.lightingKnowledge === "basic"
                          ? "Getting your lighting right will seriously level up your selfie game. Small changes = huge difference in how professional you look."
                          : "You're going to learn how to make every selfie work harder for your business. Not just pretty pics—content that actually converts."}
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={() => setStep(5)}
                className="mt-8 sm:mt-12 bg-stone-950 text-stone-50 px-8 sm:px-12 py-3 sm:py-4 text-xs sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200"
              >
                Show me my calendar →
              </button>

              {/* Paid Blueprint CTA - Step 4 */}
              {isPaidBlueprintEnabled && savedEmail && (
                <div className="mt-8 sm:mt-12 bg-stone-50 border border-stone-200 rounded-lg p-6 sm:p-8 max-w-2xl mx-auto">
                  <h3 className="text-lg sm:text-xl font-medium tracking-wider uppercase text-stone-950 mb-2 text-center">
                    Bring your Blueprint to life
                  </h3>
                  <p className="text-sm sm:text-base text-stone-600 font-light leading-relaxed text-center mb-6">
                    Get 30 custom photos based on your strategy.
                  </p>
                  <div className="text-center">
                    <Link
                      href={`/checkout/blueprint?email=${encodeURIComponent(savedEmail)}`}
                      className="inline-block bg-stone-950 text-stone-50 px-8 sm:px-12 py-3 sm:py-4 text-xs sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200 rounded-lg"
                    >
                      Get my 30 photos
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="min-h-[calc(100vh-80px)] sm:min-h-[calc(100vh-96px)] px-4 sm:px-6 py-8 sm:py-12">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-8 sm:mb-12">
                <h2
                  style={{ fontFamily: "'Times New Roman', serif" }}
                  className="text-2xl sm:text-3xl md:text-5xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-3 sm:mb-4 text-stone-950"
                >
                  Your 30-day content plan
                </h2>
                <p className="text-xs sm:text-sm font-light text-stone-600 leading-relaxed max-w-2xl mx-auto px-4">
                  No more &quot;what should I post today?&quot; moments. Here&apos;s your whole month planned out—just show up and
                  create!
                </p>
              </div>

              {/* Week Selector */}
              <div className="flex gap-2 mb-6 sm:mb-8 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                {[1, 2, 3, 4, 5].map((week) => (
                  <button
                    key={week}
                    onClick={() => setSelectedCalendarWeek(week)}
                    className={`px-4 sm:px-6 py-2 sm:py-3 text-xs tracking-wider uppercase whitespace-nowrap border transition-all duration-200 shrink-0 ${
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-8 sm:mb-12">
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
                      <h3 className="text-sm sm:text-base font-medium tracking-wide text-stone-950 mb-2">
                        {post.title}
                      </h3>
                      <p className="text-xs sm:text-sm font-light text-stone-600 leading-relaxed">{post.caption}</p>
                    </div>
                  ),
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={() => setStep(4)}
                  className="w-full sm:flex-1 py-3 sm:py-4 border border-stone-300 text-stone-600 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase font-light hover:border-stone-950 hover:text-stone-950 transition-all duration-300"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(6)}
                  className="w-full sm:flex-1 py-3 sm:py-4 bg-stone-950 text-stone-50 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase font-light hover:bg-stone-800 transition-all duration-300"
                >
                  Get caption templates →
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="min-h-[calc(100vh-80px)] sm:min-h-[calc(100vh-96px)] px-4 sm:px-6 py-8 sm:py-12">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-8 sm:mb-12">
                <h2
                  style={{ fontFamily: "'Times New Roman', serif" }}
                  className="text-2xl sm:text-3xl md:text-5xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-3 sm:mb-4 text-stone-950"
                >
                  Your caption templates
                </h2>
                <p className="text-xs sm:text-sm font-light text-stone-600 leading-relaxed max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
                  Struggling with what to say? We&apos;ve got you. Just copy these, fill in the blanks, and you&apos;re good to
                  go!
                </p>

                {/* PR-8: Email is required upfront - if missing at step 6, something went wrong */}
                {!savedEmail && (
                  <div className="bg-yellow-100 border border-yellow-300 p-4 sm:p-6 rounded-lg max-w-2xl mx-auto mb-8 sm:mb-12">
                    <p className="text-xs sm:text-sm font-light text-yellow-800 mb-3 sm:mb-4">
                      Email is required to continue. Please complete email capture first.
                    </p>
                    <button
                      onClick={() => {
                        setShowEmailCapture(true)
                        setStep(0) // Return to email capture
                      }}
                      className="bg-stone-950 text-stone-50 px-6 sm:px-8 py-2 sm:py-3 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase font-light hover:bg-stone-800 transition-all duration-300"
                    >
                      Enter email →
                    </button>
                  </div>
                )}
                {savedEmail && !accessToken && (
                  <div className="bg-stone-100 p-4 sm:p-6 rounded-lg max-w-2xl mx-auto mb-8 sm:mb-12">
                    <p className="text-xs sm:text-sm font-light text-stone-700 mb-3 sm:mb-4">
                      Want these templates in your inbox? We&apos;ll email everything to {savedEmail}.
                    </p>
                    <button
                      onClick={emailConcepts}
                      disabled={isEmailingConcepts}
                      className="bg-stone-950 text-stone-50 px-6 sm:px-8 py-2 sm:py-3 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase font-light hover:bg-stone-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isEmailingConcepts ? "Sending..." : "Email me →"}
                    </button>
                  </div>
                )}
              </div>

              {/* Caption Categories */}
              <div className="space-y-8 sm:space-y-12">
                {Object.entries(captionTemplates).map(([category, templates]) => (
                  <div key={category}>
                    <h3 className="text-base sm:text-xl font-medium tracking-wider uppercase text-stone-950 mb-4 sm:mb-6 border-b border-stone-200 pb-2 sm:pb-3">
                      {category === "cta" ? "Call to Action" : category} Captions
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {templates.map((template) => (
                        <div key={template.id} className="bg-white border border-stone-200 p-4 sm:p-6 rounded-lg">
                          <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <h4 className="text-xs sm:text-sm font-medium tracking-wide text-stone-950">
                              {template.title}
                            </h4>
                            <button
                              onClick={() => copyToClipboard(template.template, template.id)}
                              className="p-2 hover:bg-stone-100 rounded-full transition-colors shrink-0"
                            >
                              {copiedCaption === template.id ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4 text-stone-600" />
                              )}
                            </button>
                          </div>
                          <p className="text-[11px] sm:text-xs font-light text-stone-600 leading-relaxed whitespace-pre-wrap">
                            {template.template}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Upsell Section */}
              <div className="mt-8 sm:mt-12">
                <div className="text-center mb-8 sm:mb-12">
                  <h3
                    style={{ fontFamily: "'Times New Roman', serif" }}
                    className="text-2xl sm:text-3xl md:text-4xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-3 sm:mb-4 text-stone-950"
                  >
                    Join SSELFIE Studio
                  </h3>
                  <p className="text-sm sm:text-base font-light text-stone-600 max-w-2xl mx-auto">
                    Everything you need to stay visible, in one membership.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto mb-8 sm:mb-12">
                  {/* Card 1: One-Time Photoshoot */}
                  <div className="bg-stone-50 rounded-2xl p-6 sm:p-8 border border-stone-200 hover:border-stone-300 transition-all duration-300 hover:shadow-lg">
                    <h4
                      style={{ fontFamily: "'Times New Roman', serif" }}
                      className="text-xl sm:text-2xl font-light mb-2 text-stone-900"
                    >
                      Try One AI Photoshoot
                    </h4>
                    <div className="mb-4">
                      <div className="flex items-baseline gap-2">
                        <span
                          className="text-4xl sm:text-5xl font-light text-stone-900"
                          style={{ fontFamily: "'Times New Roman', serif" }}
                        >
                          $49
                        </span>
                      </div>
                    </div>
                    <p className="text-sm sm:text-base font-light text-stone-600 mb-6 leading-relaxed">
                      See your blueprint in action with 50 professional photos
                    </p>
                    <ul className="space-y-3 mb-6 sm:mb-8">
                      <li className="flex items-start gap-2 text-sm font-light text-stone-700">
                        <span className="text-stone-900 mt-0.5 shrink-0">✓</span>
                        <span>Your AI model trained on your photos</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm font-light text-stone-700">
                        <span className="text-stone-900 mt-0.5 shrink-0">✓</span>
                        <span>
                          50 images in your {formData.vibe ? formData.vibe.charAt(0).toUpperCase() + formData.vibe.slice(1) : "chosen"}{" "}
                          aesthetic
                        </span>
                      </li>
                      <li className="flex items-start gap-2 text-sm font-light text-stone-700">
                        <span className="text-stone-900 mt-0.5 shrink-0">✓</span>
                        <span>Ready to post in 2 hours</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm font-light text-stone-700">
                        <span className="text-stone-900 mt-0.5 shrink-0">✓</span>
                        <span>Download all in HD</span>
                      </li>
                    </ul>
                    <button
                      onClick={() => handleStartCheckout("one_time_session")}
                      className="w-full bg-stone-950 text-stone-50 px-6 py-3 rounded-lg text-xs sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200 min-h-[44px]"
                    >
                      Get Started
                    </button>
                  </div>

                  {/* Card 2: Studio Membership - MOST POPULAR */}
                  <div className="bg-stone-950 text-stone-50 rounded-2xl p-6 sm:p-8 border-2 border-stone-950 relative hover:shadow-lg transition-all duration-300">
                    <div className="absolute -top-3 right-4 bg-stone-950 text-stone-50 px-3 py-1.5 rounded-sm border border-stone-50/20">
                      <p className="text-[9px] sm:text-[10px] font-light tracking-[0.2em] uppercase whitespace-nowrap">
                        Most popular
                      </p>
                    </div>
                    <h4
                      style={{ fontFamily: "'Times New Roman', serif" }}
                      className="text-xl sm:text-2xl font-light mb-2 text-stone-50 mt-2"
                    >
                      Join Studio Membership
                    </h4>
                    <div className="mb-4">
                      <div className="flex items-baseline gap-2">
                        <span
                          className="text-4xl sm:text-5xl font-light text-stone-50"
                          style={{ fontFamily: "'Times New Roman', serif" }}
                        >
                          $97
                        </span>
                        <span className="text-sm sm:text-base font-light text-stone-300">/month</span>
                      </div>
                      <div className="mt-2">
                        <span className="inline-block bg-stone-800/50 text-stone-200 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-light tracking-wide">
                          Worth $1,500/month
                        </span>
                      </div>
                    </div>
                    <p className="text-sm sm:text-base font-light text-stone-100 mb-6 leading-relaxed">
                      Never run out of content again - everything automated monthly
                    </p>
                    <ul className="space-y-3 mb-6 sm:mb-8">
                      <li className="flex items-start gap-2 text-sm font-light text-stone-100">
                        <span className="text-stone-50 mt-0.5 shrink-0">✓</span>
                        <span>200 credits per month</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm font-light text-stone-100">
                        <span className="text-stone-50 mt-0.5 shrink-0">✓</span>
                        <span>~100 Pro photos OR ~200 Classic photos</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm font-light text-stone-100">
                        <span className="text-stone-50 mt-0.5 shrink-0">✓</span>
                        <span>Unlimited Maya AI strategist</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm font-light text-stone-100">
                        <span className="text-stone-50 mt-0.5 shrink-0">✓</span>
                        <span>Unlimited captions & feed planning</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm font-light text-stone-100">
                        <span className="text-stone-50 mt-0.5 shrink-0">✓</span>
                        <span>Video b-roll creation</span>
                      </li>
                    </ul>
                    <button
                      onClick={() => handleStartCheckout("sselfie_studio_membership")}
                      className="w-full bg-stone-50 text-stone-950 px-6 py-3 rounded-lg text-xs sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200 min-h-[44px]"
                    >
                      See Inside →
                    </button>
                  </div>
                </div>

                {/* Soft Close */}
                <div className="text-center mb-6 sm:mb-8">
                  <p className="text-sm sm:text-base font-light text-stone-600 max-w-2xl mx-auto leading-relaxed px-4">
                    Not ready yet? That&apos;s totally okay. You&apos;ll get your full blueprint and 30-day calendar via email in 2 minutes. We&apos;re here when you&apos;re ready.
                  </p>
                </div>

                {/* Email Blueprint Button */}
                <div className="text-center">
                  <button
                    onClick={emailConcepts}
                    disabled={isEmailingConcepts || Object.keys(generatedConceptImages).length === 0}
                    className="bg-stone-950 text-stone-50 px-6 sm:px-8 py-3 sm:py-4 text-xs sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {isEmailingConcepts ? "Sending..." : "Email my blueprint →"}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setStep(5)}
                className="mt-6 sm:mt-8 w-full py-3 sm:py-4 border border-stone-300 text-stone-600 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase font-light hover:border-stone-950 hover:text-stone-950 transition-all duration-300"
              >
                Back to calendar
              </button>
            </div>
          </div>
        )}

        {/* Step 7: Upgrade View (Completed Free Blueprint) */}
        {step === 7 && (
          <div className="min-h-[calc(100vh-80px)] sm:min-h-[calc(100vh-96px)] flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
            <div className="max-w-3xl w-full text-center">
              <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 sm:mb-6 text-stone-950" />
              <h2
                style={{ fontFamily: "'Times New Roman', serif" }}
                className="text-2xl sm:text-3xl md:text-5xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-3 sm:mb-4 text-stone-950"
              >
                Your Blueprint is Complete
              </h2>
              <p className="text-xs sm:text-sm font-light text-stone-600 mb-8 sm:mb-12 leading-relaxed max-w-xl mx-auto">
                You&apos;ve got your strategy, calendar, and caption templates. Ready to bring it to life with 30 custom photos?
              </p>

              {/* Upgrade CTA */}
              {isPaidBlueprintEnabled && savedEmail && (
                <div className="bg-stone-50 border border-stone-200 rounded-lg p-6 sm:p-8 max-w-2xl mx-auto mb-8">
                  <h3 className="text-lg sm:text-xl font-medium tracking-wider uppercase text-stone-950 mb-2 text-center">
                    Bring your Blueprint to life
                  </h3>
                  <p className="text-sm sm:text-base text-stone-600 font-light leading-relaxed text-center mb-6">
                    Get 30 custom photos based on your strategy.
                  </p>
                  <div className="text-center">
                    <Link
                      href={`/checkout/blueprint?email=${encodeURIComponent(savedEmail)}`}
                      className="inline-block bg-stone-950 text-stone-50 px-8 sm:px-12 py-3 sm:py-4 text-xs sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200 rounded-lg"
                    >
                      Get my 30 photos
                    </Link>
                  </div>
                </div>
              )}

              {/* View Results Links */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={() => setStep(5)}
                  className="text-xs sm:text-sm font-light text-stone-600 hover:text-stone-950 transition-colors underline"
                >
                  View my calendar →
                </button>
                <button
                  onClick={() => setStep(6)}
                  className="text-xs sm:text-sm font-light text-stone-600 hover:text-stone-950 transition-colors underline"
                >
                  View caption templates →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>


      <style jsx>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall linear forwards;
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        
        /* Mobile optimization: Prevent scroll issues on iOS */
        @supports (-webkit-touch-callout: none) {
          .-webkit-overflow-scrolling-touch {
            -webkit-overflow-scrolling: touch;
          }
        }
      `}</style>
    </div>
  )
}
