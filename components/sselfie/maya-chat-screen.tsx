"use client"

import type React from "react"
import VideoCard from "./video-card"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { createPortal } from "react-dom"
import ConceptCard from "./concept-card"
import MayaChatHistory from "./maya-chat-history"
import MayaConceptCards from "./maya/maya-concept-cards"
import MayaQuickPrompts from "./maya/maya-quick-prompts"
import MayaSettingsPanel from "./maya/maya-settings-panel"
import MayaChatInterface from "./maya/maya-chat-interface"
import UnifiedLoading from "./unified-loading"
import { useMayaSettings } from "./maya/hooks/use-maya-settings"
import { useMayaMode } from "./maya/hooks/use-maya-mode"
import { useMayaImages } from "./maya/hooks/use-maya-images"
import { useMayaChat } from "./maya/hooks/use-maya-chat"
import { useMayaSharedImages } from "./maya/hooks/use-maya-shared-images"
import MayaUnifiedInput from "./maya/maya-unified-input"
import MayaTabSwitcher from "./maya/maya-tab-switcher"
import MayaVideosTab from "./maya/maya-videos-tab"
import MayaPromptsTab from "./maya/maya-prompts-tab"
import MayaTrainingTab from "./maya/maya-training-tab"
import { MayaInlineAction, MayaInlineCard } from "./maya/maya-inline-card"
import StudioMemberOnboarding from "./maya/studio-member-onboarding"
import MembershipHomeCard from "./maya/membership-home-card"
import MayaWelcomePanel from "./maya/maya-welcome-panel"
import MayaPhotosSetupDisclosure from "./maya/maya-photos-setup-disclosure"
import WelcomeFirstGenerationFlow from "./maya/welcome-first-generation-flow"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { trackAnalyticsEvent } from "@/lib/analytics/client"
// Note: User type comes from Supabase auth (not next-auth)
import type { PromptSuggestion } from "@/lib/maya/prompt-generator"
import ImageUploadFlow from "./pro-mode/ImageUploadFlow"
import { getConceptPrompt } from "@/lib/maya/concept-templates"
import BuyCreditsModal from "./buy-credits-modal"
import { parseMayaToolMarkers } from "@/lib/maya/tool-markers"
import {
  encodeOfferBriefMarkerPayload,
  type MayaOfferBrief,
  type MayaOfferBriefAssetType,
} from "@/lib/maya/offer-brief"
import {
  encodeMayaVideoCardMarker,
  stripMayaVideoCardMarkers,
} from "@/lib/maya/video-card-marker"
// Pro Mode Components
import MayaHeader from "./maya/maya-header"
import ImageLibraryModal from "./pro-mode/ImageLibraryModal"
import ProModeChatHistory from "./pro-mode/ProModeChatHistory"
import { Typography, Colors } from '@/lib/maya/pro/design-system'
import { useToast } from "@/hooks/use-toast"
import { DesignClasses, ComponentClasses } from "@/lib/design-tokens"
import { handleCheckoutFailure } from "@/lib/checkout-failure"
import { openEmbeddedCheckout } from "@/lib/start-embedded-checkout"
import {
  extractFeedStrategyJson,
  stripFeedStrategyArtifacts,
  shouldRetryInlineFeedGeneration,
} from "@/lib/maya/feed-strategy"
import {
  isMayaTabScopedChatEnabled,
  resolveMayaChatTypeForTab,
} from "@/lib/maya/tab-scope"
import {
  MAYA_SURFACE_TOP_OFFSET,
} from "@/lib/maya/layout-contract"
import { getMayaSurfaceQuickPrompts, getMayaInputPlaceholder } from "@/lib/maya/prompt-contract"
import { shouldOpenStudioMemberOnboarding } from "@/lib/onboarding/studio-onboarding-routing"
import MayaUpsellCard from "./maya/maya-upsell-card"

const MINI_PRODUCT_IDS = ["what_to_say", "show_up", "get_paid", "ai_photo_prompts"] as const
type MiniProductId = (typeof MINI_PRODUCT_IDS)[number]
type MayaDismissibleUpsellId = MiniProductId | "zero_credits"
const MAYA_DISMISSED_UPSELLS_STORAGE_KEY = "sselfie.maya.dismissedUpsells"

const ACADEMY_PRODUCT_ID_ALIASES: Record<string, MiniProductId> = {
  what_to_say: "what_to_say",
  "what-to-say": "what_to_say",
  show_up: "show_up",
  "show-up": "show_up",
  get_paid: "get_paid",
  "get-paid": "get_paid",
  ai_photo_prompts: "ai_photo_prompts",
  "ai-photo-prompts": "ai_photo_prompts",
}

function normalizeMiniProductId(value?: string | null): MiniProductId | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  return ACADEMY_PRODUCT_ID_ALIASES[normalized] ?? null
}

type MyProductsResponse = {
  purchases?: Array<{ id?: string | null }>
}

type MonthlyDropRow = {
  title?: string | null
}

type MonthlyDropsResponse = {
  monthlyDrops?: MonthlyDropRow[]
}

type WelcomeFirstGenerationState = {
  enabled?: boolean
  eligible?: boolean
  hasBonusCredits?: boolean
  hasNoImageSpend?: boolean
}

const simpleFetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }
  return (await response.json()) as T
}

function isFeatureEnabled(value?: string | null): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === "1" || normalized === "true"
}

interface MayaChatScreenProps {
  onImageGenerated?: () => void
  user: any | null // User object passed down (type from parent component)
  setActiveTab?: (tab: string) => void // Navigation handler from parent
  userId?: string // User ID (optional, can be derived from user, also used for admin guide controls)
  initialChatId?: number // Initial chat ID to load
  proMode?: boolean // Force Pro Mode (for admin)
  isAdmin?: boolean // Admin mode - enables save to guide functionality
  selectedGuideId?: number | null // Selected guide ID for saving
  selectedGuideCategory?: string | null // Selected guide category
  onGuideChange?: (id: number | null, category: string | null) => void // Callback when guide selection changes
  hasTrainedModel?: boolean // Whether user has a trained model
  isMembership?: boolean // Whether user has membership (for Pro/Classic toggle visibility)
  academyPurchaseProduct?: string
  firstTimeProductUser?: boolean
  pendingPostPurchaseStudioOnboarding?: boolean
  onPostPurchaseStudioOnboardingHandled?: () => void
  /** When set, Maya ≡ is rendered in StudioAppTopBar; drawer state is controlled by the parent. */
  mayaNavMenuOpen?: boolean
  onMayaNavMenuOpenChange?: (open: boolean) => void
}

type PhaseTwoGenerationSource = "selfies" | "custom_model" | "base_model"
type PhaseTwoUploadCategory = "selfies" | "products" | "people" | "vibes"
type PhaseTwoVideoImage = {
  id: string
  imageUrl: string
  prompt?: string
  description?: string
  category?: string
}

type OfferBriefFormValues = Omit<MayaOfferBrief, "assetType">
type PendingMayaChatMessage = {
  parts: Array<{ type: "text"; text: string } | { type: "image"; image: string }>
}

export default function MayaChatScreen({ 
  onImageGenerated, 
  user, 
  setActiveTab,
  userId,
  initialChatId,
  proMode: forcedProMode,
  isAdmin = false,
  selectedGuideId = null,
  selectedGuideCategory = null,
  onGuideChange,
  hasTrainedModel = true, // Default to true to avoid breaking existing usage
  isMembership = false, // Default to false - only membership users see Pro/Classic toggle
  academyPurchaseProduct,
  firstTimeProductUser = false,
  pendingPostPurchaseStudioOnboarding = false,
  onPostPurchaseStudioOnboardingHandled,
  mayaNavMenuOpen,
  onMayaNavMenuOpenChange,
}: MayaChatScreenProps) {
  const { toast } = useToast()
  const isLandingPagesUiEnabled = false
  const isTabScopedChatEnabled = isMayaTabScopedChatEnabled(
    process.env.NEXT_PUBLIC_FEATURE_MAYA_TAB_SCOPED_CHAT,
  )
  const [inputValue, setInputValue] = useState("")
  const [showHistory, setShowHistory] = useState(false)
  const [internalNavMenuOpen, setInternalNavMenuOpen] = useState(false)
  const shellControlsMayaNav = onMayaNavMenuOpenChange != null
  const showNavMenu = shellControlsMayaNav ? Boolean(mayaNavMenuOpen) : internalNavMenuOpen
  const toggleNavMenu = () => {
    if (shellControlsMayaNav) {
      onMayaNavMenuOpenChange!(!Boolean(mayaNavMenuOpen))
    } else {
      setInternalNavMenuOpen((v) => !v)
    }
  }
  const closeNavMenu = () => {
    if (shellControlsMayaNav) {
      onMayaNavMenuOpenChange!(false)
    } else {
      setInternalNavMenuOpen(false)
    }
  }
  // savedMessageIds is now provided by useMayaChat hook
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const isAtBottomRef = useRef(true)
  const inputBarRef = useRef<HTMLDivElement>(null)
  const [inputBarHeight, setInputBarHeight] = useState(140)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const retryQueue = useRef<Array<{ messageId: string; payload: any }>>([])
  const [isDragging, setIsDragging] = useState(false)
  const [contentFilter, setContentFilter] = useState<"all" | "photos" | "videos">("all")
  const [currentPrompts, setCurrentPrompts] = useState<Array<{ label: string; prompt: string }>>([])
  const [showHeader, setShowHeader] = useState(true)
  const [creditBalance, setCreditBalance] = useState<number>(0)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showBuyCreditsModal, setShowBuyCreditsModal] = useState(false)
  const [academyJourneyPrompt, setAcademyJourneyPrompt] = useState<"first_gen" | "three_gen" | null>(null)
  const [isLoadingAcademyJourneyState, setIsLoadingAcademyJourneyState] = useState(false)
  const [welcomeFlowDismissed, setWelcomeFlowDismissed] = useState(false)
  const [calendarSuggestionDismissed, setCalendarSuggestionDismissed] = useState(false)
  const [dismissedUpsells, setDismissedUpsells] = useState<Set<MayaDismissibleUpsellId>>(new Set())
  const router = useRouter()

  const { data: myProductsData } = useSWR<MyProductsResponse>(
    user ? "/api/academy/my-products" : null,
    simpleFetcher,
  )
  const { data: monthlyDropsData } = useSWR<MonthlyDropsResponse>(
    user && myProductsData?.hasStudioMembership ? "/api/academy/monthly-drops" : null,
    simpleFetcher,
  )
  const ownedMiniProductIds = useMemo<Set<MiniProductId>>(() => {
    const owned = new Set<MiniProductId>()

    if (isMembership) {
      MINI_PRODUCT_IDS.forEach((id) => owned.add(id))
    }

    const purchasedFromContext = normalizeMiniProductId(academyPurchaseProduct)
    if (purchasedFromContext) {
      owned.add(purchasedFromContext)
    }

    for (const row of myProductsData?.purchases ?? []) {
      const normalized = normalizeMiniProductId(row?.id ?? null)
      if (normalized) {
        owned.add(normalized)
      }
    }

    return owned
  }, [academyPurchaseProduct, isMembership, myProductsData?.purchases])
  
  // Tab state for Photos/Videos/Prompts/Training/Feed tabs
  const [activeMayaTab, setActiveMayaTab] = useState<"photos" | "videos" | "prompts" | "training" | "feed">(() => {
    // Check URL hash for tab selection (e.g., #maya/videos, #maya/prompts, #maya/training, #maya/feed)
    if (typeof window !== "undefined") {
      const hash = window.location.hash
      if (hash === "#maya/videos" || hash === "#videos") {
        return "videos"
      }
      if (hash === "#maya/prompts" || hash === "#prompts") {
        return "prompts"
      }
      if (hash === "#maya/training" || hash === "#training") {
        return "training"
      }
      // Check localStorage for persisted tab selection
      const savedTab = localStorage.getItem("mayaActiveTab")
      if (savedTab === "photos" || savedTab === "videos" || savedTab === "prompts" || savedTab === "training") {
        return savedTab as "photos" | "videos" | "prompts" | "training"
      }
    }
    return "photos" // Default to Photos tab
  })
  const { data: welcomeFirstGenerationState } = useSWR<WelcomeFirstGenerationState>(
    user && !isMembership && activeMayaTab === "photos" ? "/api/onboarding/welcome-first-generation-state" : null,
    simpleFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    },
  )
  
  // Mode managed by useMayaMode hook
  const { proMode, setProMode, getModeString, hasModeChanged } = useMayaMode(forcedProMode)
  const [showProTooltip, setShowProTooltip] = useState(() => {
    if (typeof window === "undefined") return false
    return !localStorage.getItem("sselfie_pro_tooltip_seen")
  })
  const currentChatType = resolveMayaChatTypeForTab({
    activeTab: activeMayaTab,
    proMode,
    enabled: isTabScopedChatEnabled,
  })

  const formattedCreditBalance = Number.isFinite(creditBalance)
    ? Math.round(creditBalance).toLocaleString()
    : "0"


  useEffect(() => {
    const node = inputBarRef.current
    if (!node || typeof ResizeObserver === "undefined") return

    const updateHeight = () => {
      const height = Math.ceil(node.getBoundingClientRect().height)
      if (height > 0) {
        setInputBarHeight(height)
        document.documentElement.style.setProperty("--input-bar-height", `${height}px`)
      }
    }

    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const node = headerRef.current
    if (!node || typeof ResizeObserver === "undefined") return

    const updateHeaderHeight = () => {
      const height = Math.ceil(node.getBoundingClientRect().height)
      if (height > 0) {
        document.documentElement.style.setProperty("--maya-header-height", `${height}px`)
      }
    }

    updateHeaderHeight()
    const observer = new ResizeObserver(updateHeaderHeight)
    observer.observe(node)

    return () => {
      observer.disconnect()
    }
  }, [])
  // Settings managed by useMayaSettings hook
  const {
    settings,
    setStyleStrength,
    setPromptAccuracy,
    setAspectRatio,
    setRealismStrength,
    setEnhancedAuthenticity,
  } = useMayaSettings()
  
  const { styleStrength, promptAccuracy, aspectRatio, realismStrength, enhancedAuthenticity } = settings
  
  const [showSettings, setShowSettings] = useState(false)
  const messageSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastMessageCountRef = useRef(0)
  const isSavingMessageRef = useRef(false)
  
  // Chat managed by useMayaChat hook (must be after mode hook since it depends on getModeString)
  const {
    chatId,
    chatTitle,
    isLoadingChat,
    hasUsedMayaBefore,
    loadChat,
    handleNewChat: baseHandleNewChat,
    handleSelectChat: baseHandleSelectChat,
    handleDeleteChat: baseHandleDeleteChat,
    setChatId,
    setChatTitle,
    setIsLoadingChat,
    savedMessageIds,
    hasLoadedChatRef,
    messages,
    sendMessage,
    status,
    setMessages,
    chatError,
    setChatError,
  } = useMayaChat({
    initialChatId,
    proMode,
    user,
    getModeString,
    activeTab: activeMayaTab,
    academyPurchaseProduct,
    firstTimeProductUser, // Pass Feed tab flag
  })

  const [pendingConceptRequest, setPendingConceptRequest] = useState<string | null>(null)
  const pendingMessageAfterChatCreateRef = useRef<PendingMayaChatMessage | null>(null)
  const [isGeneratingConcepts, setIsGeneratingConcepts] = useState(false)
  const [pendingCaptionTopic, setPendingCaptionTopic] = useState<string | null>(null)
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false)
  const [isCreatingFeed, setIsCreatingFeed] = useState(false)
  const [pendingFeedRequest, setPendingFeedRequest] = useState<{
    strategyJson: string
    messageId: string
  } | null>(null)
  
  // Track messages that should show image upload module
  const [messagesWithUploadModule, setMessagesWithUploadModule] = useState<Set<string>>(new Set())
  
  const [selectedPrompt, setSelectedPrompt] = useState<string>("")
  
  // Concept consistency mode state - persist user preference in localStorage
  // Smart default: Only apply when no saved preference exists, and only based on concept count
  
  // hasUsedMayaBefore is now provided by useMayaChat hook
  
  // Images managed by useMayaImages hook
  const {
    imageLibrary,
    isLibraryLoading,
    libraryError,
    libraryTotalImages,
    loadLibrary,
    saveLibrary,
    updateIntent,
    refreshLibrary,
    uploadedImages,
    setUploadedImages,
    galleryImages,
    loadGalleryImages,
  } = useMayaImages(proMode)

  // Keep quick prompts as a first-message helper only. Once the chat has momentum,
  // hiding the row gives the composer more room on mobile.
  const shouldShowInputPrompts = messages.length <= 1

  // Shared images between Photos and Videos tabs
  const {
    sharedImages,
    addImage,
    addImages: addSharedImages,
    clearSharedImages,
    getSharedImages,
  } = useMayaSharedImages({
    persistToStorage: true,
    autoExtractFromMessages: true,
    messages,
  })

  // Feature flags - derived from mode for clearer conditional rendering
  // These make it explicit what features are enabled, rather than just checking proMode
  // Must be defined after useMayaImages hook since hasImageLibrary depends on imageLibrary
  // 
  // Progressive Enhancement Pattern:
  // - Base UI is the same for both modes
  // - Pro features conditionally appear when hasProFeatures is true
  // - No conditional rendering of entire components (use unified components instead)
  // - Only conditionally show/hide specific features within unified components
  const hasProFeatures = proMode
  const hasImageLibrary = proMode && imageLibrary
  const hasLibraryManagement = proMode
  
  // Shared images from first concept card - auto-populates other cards
  const [sharedConceptImages, setSharedConceptImages] = useState<Array<string | null>>([null, null, null])
  const [showGallerySelector, setShowGallerySelector] = useState(false)
  const [isGeneratingPro, setIsGeneratingPro] = useState(false)
  const promptGenerationTriggeredRef = useRef<Set<string>>(new Set()) // Track messages that have already triggered prompt generation
  const processedFeedMessagesRef = useRef<Set<string>>(new Set())
  // CRITICAL FIX: Track processed concept messages to prevent duplication on page refresh
  const processedConceptMessagesRef = useRef<Set<string>>(new Set())
  const processedCaptionMessagesRef = useRef<Set<string>>(new Set())
  const processedToolMessagesRef = useRef<Set<string>>(new Set())
  const videoPollIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  
  // Pro features onboarding state
  const [showStudioProOnboarding, setShowStudioProOnboarding] = useState(false)
  const [showStudioMemberOnboarding, setShowStudioMemberOnboarding] = useState(false)
  
  // Pro features library management state
  const [showLibraryModal, setShowLibraryModal] = useState(false)
  const [showUploadFlow, setShowUploadFlow] = useState(false)
  const [showProModeHistory, setShowProModeHistory] = useState(false)
  const [manageCategory, setManageCategory] = useState<'selfies' | 'products' | 'people' | 'vibes' | null>(null)
  
  // Prompt suggestions state
  const [promptSuggestions, setPromptSuggestions] = useState<PromptSuggestion[]>([])
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false)
  // Extract user authentication status and the chat ID to load from props or context (if available)
  // For this example, we'll assume they are available as `isAuthenticated` and `chatIdToLoad`
  const isAuthenticated = !!user // Simple check for demonstration
  const chatIdToLoad = user ? Number(user.chatId) : null // Replace with actual logic to get chatIdToLoad

  // Refs are now managed by useMayaChat hook

  // Settings loading and persistence are now handled by useMayaSettings hook

  // Helper function to extract text content from UIMessage
  const getMessageText = useCallback((message: any): string => {
    // UIMessage uses parts array, not content property
    if (message.parts && Array.isArray(message.parts)) {
      return message.parts
        .filter((p: any) => p && p.type === "text" && p.text)
        .map((p: any) => p.text)
        .join("") || ""
    }
    // Fallback for legacy format (content property)
    if (typeof message.content === "string") {
      return message.content
    }
    return ""
  }, [])

  const sanitizeInlineFeedMessage = useCallback((targetMessageId?: string | null) => {
    setMessages((prevMessages: any[]) => {
      const nextMessages = [...prevMessages]
      let targetIndex = targetMessageId
        ? nextMessages.findIndex((message: any) => String(message?.id) === String(targetMessageId))
        : -1

      if (targetIndex < 0) {
        for (let i = nextMessages.length - 1; i >= 0; i -= 1) {
          if (nextMessages[i]?.role !== "assistant") continue
          if (extractFeedStrategyJson(getMessageText(nextMessages[i]))) {
            targetIndex = i
            break
          }
        }
      }

      if (targetIndex < 0) return prevMessages

      const message = nextMessages[targetIndex]
      const sanitizedText = stripFeedStrategyArtifacts(getMessageText(message))
      const nonTextParts = Array.isArray(message?.parts)
        ? message.parts.filter((part: any) => part?.type !== "text")
        : []

      nextMessages[targetIndex] = {
        ...message,
        content: sanitizedText,
        parts: sanitizedText ? [{ type: "text", text: sanitizedText }, ...nonTextParts] : nonTextParts,
      }

      return nextMessages
    })
  }, [getMessageText, setMessages])

  const updateAssistantToolPart = useCallback(
    (partType: string, output: any, targetMessageId?: string | null) => {
      setMessages((prevMessages: any[]) => {
        const nextMessages = [...prevMessages]
        let targetIndex = -1

        if (targetMessageId) {
          targetIndex = nextMessages.findIndex((message: any) => message.id === targetMessageId)
        }
        if (targetIndex < 0) {
          for (let i = nextMessages.length - 1; i >= 0; i -= 1) {
            if (nextMessages[i]?.role === "assistant") {
              targetIndex = i
              break
            }
          }
        }
        if (targetIndex < 0) return prevMessages

        const targetMessage = nextMessages[targetIndex]
        const existingParts = Array.isArray(targetMessage.parts) ? [...targetMessage.parts] : []
        const existingIndex = existingParts.findIndex((part: any) => part?.type === partType)
        const nextPart = { type: partType, output }

        if (existingIndex >= 0) {
          existingParts[existingIndex] = nextPart
        } else {
          existingParts.push(nextPart)
        }

        nextMessages[targetIndex] = { ...targetMessage, parts: existingParts }
        return nextMessages
      })
    },
    [setMessages],
  )

  const clearVideoPollForMessage = useCallback((messageId: string) => {
    const interval = videoPollIntervalsRef.current.get(messageId)
    if (interval) {
      clearInterval(interval)
      videoPollIntervalsRef.current.delete(messageId)
    }
  }, [])

  const clearAllVideoPolls = useCallback(() => {
    videoPollIntervalsRef.current.forEach((interval) => clearInterval(interval))
    videoPollIntervalsRef.current.clear()
  }, [])

  // useChat hook and loadChat function are now managed by useMayaChat hook
  
  // Wrapper for loadChat that also closes history panel (component-specific UI state)
  const loadChatWithUI = useCallback(
    async (specificChatId?: number) => {
      await loadChat(specificChatId)
        setShowHistory(false)
    },
    [loadChat],
  )

  // Chat history checking is now handled by useMayaChat hook

  // Chat loading and persistence are now handled by useMayaChat hook

  // Mode persistence is now handled by useMayaMode hook

  // Image persistence and gallery loading are now handled by useMayaImages hook

  // Feed creation notification callback shared by the legacy feed tab and the inline Maya flow.
  const createFeedFromStrategy = useCallback(async (strategy: any) => {
    console.log("[FEED] Feed strategy prepared:", strategy?.posts?.length || 0, "posts")
  }, [])

  const handleCreateInlineFeed = useCallback(
    async (strategy: any) => {
      try {
        setMessages((prevMessages: any[]) => {
          let attachedToAssistant = false
          const updatedMessages = prevMessages.map((message) => ({
            ...message,
            parts: Array.isArray(message.parts) ? [...message.parts] : undefined,
          }))

          for (let i = updatedMessages.length - 1; i >= 0; i -= 1) {
            const message = updatedMessages[i]
            if (message.role !== "assistant") continue

            const hasFeedCard = message.parts?.some((part: any) => part.type === "tool-generateFeed")
            if (hasFeedCard) {
              attachedToAssistant = true
              break
            }

            const existingParts = Array.isArray(message.parts) ? [...message.parts] : []
            updatedMessages[i] = {
              ...message,
              parts: [
                ...existingParts,
                {
                  type: "tool-generateFeed",
                  output: {
                    strategy,
                    title: strategy.feedTitle || strategy.title || "Instagram Feed",
                    description: strategy.overallVibe || strategy.colorPalette || "",
                    posts: strategy.posts || [],
                    isSaved: false,
                    proMode,
                    styleStrength,
                    promptAccuracy,
                    aspectRatio,
                    realismStrength,
                  },
                },
              ],
            }
            attachedToAssistant = true
            break
          }

          if (!attachedToAssistant) {
            console.warn("[FEED] No assistant message available for inline feed card attachment")
          }

          return updatedMessages
        })

        await createFeedFromStrategy(strategy)
      } catch (error) {
        console.error("[FEED] ❌ Error creating inline feed card:", error)
      } finally {
        setIsCreatingFeed(false)
      }
    },
    [
      setMessages,
      createFeedFromStrategy,
      proMode,
      styleStrength,
      promptAccuracy,
      aspectRatio,
      realismStrength,
    ],
  )

  // CRITICAL FIX: Clear processed concept messages ref when chatId changes (new chat created)
  // This prevents re-processing messages when switching chats or creating new chats
  useEffect(() => {
    processedFeedMessagesRef.current.clear()
    processedConceptMessagesRef.current.clear()
    processedCaptionMessagesRef.current.clear()
    processedToolMessagesRef.current.clear()
    clearAllVideoPolls()
    setPendingConceptRequest(null) // Clear pending request on chat change
    setPendingFeedRequest(null)
    setIsCreatingFeed(false)
    setPendingCaptionTopic(null)
    setIsGeneratingCaption(false)
    console.log("[v0] ✅ Cleared processedConceptMessagesRef for new chat:", chatId)
  }, [chatId, clearAllVideoPolls])

  useEffect(() => {
    return () => {
      clearAllVideoPolls()
    }
  }, [clearAllVideoPolls])

  useEffect(() => {
    if (
      shouldOpenStudioMemberOnboarding({
        isMember: isMembership,
        firstTimeProductUser,
        pendingPostPurchaseOnboarding: false,
      })
    ) {
      setShowStudioMemberOnboarding(true)
    }
  }, [isMembership, firstTimeProductUser])

  useEffect(() => {
    if (
      !shouldOpenStudioMemberOnboarding({
        isMember: isMembership,
        firstTimeProductUser: false,
        pendingPostPurchaseOnboarding: pendingPostPurchaseStudioOnboarding,
      })
    ) {
      return
    }

    setShowStudioMemberOnboarding(true)
    onPostPurchaseStudioOnboardingHandled?.()
  }, [isMembership, onPostPurchaseStudioOnboardingHandled, pendingPostPurchaseStudioOnboarding])

  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const stored = window.sessionStorage.getItem(MAYA_DISMISSED_UPSELLS_STORAGE_KEY)
      if (!stored) return
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        setDismissedUpsells(
          new Set(
            parsed.filter(
              (value): value is MayaDismissibleUpsellId =>
                value === "zero_credits" || MINI_PRODUCT_IDS.includes(value),
            ),
          ),
        )
      }
    } catch {
      // Ignore storage failures.
    }
  }, [])

  useEffect(() => {
    if (!isCreatingFeed) return

    const hasFeedCard = messages.some((message: any) =>
      message.parts?.some((part: any) => part.type === "tool-generateFeed"),
    )

    if (hasFeedCard) {
      console.log("[FEED] ✅ Feed card detected in Maya chat - clearing loader")
      setIsCreatingFeed(false)
    }
  }, [messages, isCreatingFeed])

  const dismissUpsellCard = useCallback((productId: MayaDismissibleUpsellId) => {
    setDismissedUpsells((previous) => {
      const next = new Set(previous)
      next.add(productId)

      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem(
            MAYA_DISMISSED_UPSELLS_STORAGE_KEY,
            JSON.stringify(Array.from(next)),
          )
        } catch {
          // Ignore storage failures.
        }
      }

      return next
    })
  }, [])

  const handleOpenStudioCheckout = useCallback(async (source: string) => {
    try {
      await openEmbeddedCheckout("sselfie_studio_membership")
    } catch (error) {
      console.error("[Maya] Failed to start Studio checkout:", error)
      handleCheckoutFailure({
        error,
        source,
        productId: "sselfie_studio_membership",
        fallbackPath: "/checkout/membership",
      })
    }
  }, [])

  useEffect(() => {
    if (messages.length === 0) return
    if (isCreatingFeed) return
    if (pendingFeedRequest) return

    const lastAssistantMessage = messages
      .filter((message: any) => message.role === "assistant")
      .slice(-1)[0]

    if (!lastAssistantMessage) return

    const messageId = lastAssistantMessage.id
    const textContent = getMessageText(lastAssistantMessage)
    if (!textContent) return

    let messageKey: string
    if (messageId) {
      messageKey = messageId
    } else {
      let hash = 0
      for (let i = 0; i < textContent.length; i += 1) {
        const char = textContent.charCodeAt(i)
        hash = (hash << 5) - hash + char
        hash &= hash
      }
      messageKey = `streaming-${Math.abs(hash).toString(36)}`
    }

    if (processedFeedMessagesRef.current.has(messageKey)) {
      return
    }

    const alreadyHasFeedCard = lastAssistantMessage.parts?.some(
      (part: any) => part.type === "tool-generateFeed",
    )
    if (alreadyHasFeedCard) {
      processedFeedMessagesRef.current.add(messageKey)
      return
    }

    const strategyJson = extractFeedStrategyJson(textContent)
    if (!strategyJson) return

    console.log("[FEED] ✅ Detected inline feed trigger in Maya chat:", {
      messageKey,
      messageId: messageId || "no-id-yet",
      strategyLength: strategyJson.length,
    })
    processedFeedMessagesRef.current.add(messageKey)
    setIsCreatingFeed(true)
    setPendingFeedRequest({ strategyJson, messageId: messageId || messageKey })
  }, [
    messages,
    isCreatingFeed,
    pendingFeedRequest,
    activeMayaTab,
    getMessageText,
  ])

  useEffect(() => {
    if (!pendingFeedRequest) return
    if (status === "streaming" || status === "submitted") return

    const processFeed = async () => {
      if (!isCreatingFeed) {
        setIsCreatingFeed(true)
      }

      try {
        const latestAssistantMessage = [...messages]
          .filter((message: any) => message.role === "assistant")
          .slice(-1)[0]
        const latestStrategyJson =
          extractFeedStrategyJson(
            getMessageText(
              messages.find((message: any) => String(message?.id) === String(pendingFeedRequest.messageId)) ||
                latestAssistantMessage,
            ),
          ) || pendingFeedRequest.strategyJson

        const apiEndpoint = proMode ? "/api/maya/pro/generate-feed" : "/api/maya/generate-feed"
        const requestBody = proMode
          ? {
              strategyJson: latestStrategyJson,
              chatId,
              imageLibrary,
              conversationContext: undefined,
            }
          : {
              strategyJson: latestStrategyJson,
              chatId,
              conversationContext: undefined,
            }

        const response = await fetch(apiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
          const errorMessage = errorData.error || "Failed to process feed strategy"

          if (shouldRetryInlineFeedGeneration(response.status)) {
            throw new Error(errorMessage)
          }

          console.warn("[FEED] Inline feed validation blocked card creation:", {
            status: response.status,
            messageId: pendingFeedRequest.messageId,
            code: errorData.code,
            error: errorMessage,
          })
          sanitizeInlineFeedMessage(pendingFeedRequest.messageId)

          if (errorData.code === "UNSUPPORTED_FEED_POST_COUNT") {
            toast({
              title: "Feed card needs a full grid",
              description: "Maya can only turn 9- or 12-post strategies into feed cards right now.",
            })
          } else {
            toast({
              title: "Feed card not created",
              description: errorMessage,
            })
          }

          setIsCreatingFeed(false)
          return
        }

        const data = await response.json()
        if (!data.success || !data.strategy) {
          throw new Error("Invalid response from generate-feed endpoint")
        }

        await handleCreateInlineFeed(data.strategy)
      } catch (error) {
        console.error("[FEED] ❌ Error processing inline Maya feed:", error)
        processedFeedMessagesRef.current.delete(pendingFeedRequest.messageId)
        setIsCreatingFeed(false)
      } finally {
        setPendingFeedRequest(null)
      }
    }

    processFeed()
  }, [
    pendingFeedRequest,
    isCreatingFeed,
    chatId,
    handleCreateInlineFeed,
    proMode,
    imageLibrary,
    messages,
    status,
    activeMayaTab,
    getMessageText,
    sanitizeInlineFeedMessage,
    toast,
  ])

  // Detect [GENERATE_CONCEPTS] trigger in messages
  useEffect(() => {
    // Allow processing when ready OR when messages change (to catch newly saved messages)
    if (messages.length === 0) return
    // 🔴 CRITICAL: Don't process while actively streaming - this is the main check
    // Once status is NOT "streaming" or "submitted", the message is complete and safe to process
    if (status === "streaming" || status === "submitted") {
      console.log("[v0] ⏳ Skipping trigger detection - status is:", status)
      return
    }
    
    // If we get here, streaming is complete - safe to process triggers

    // Find the last assistant message
    const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant")
    if (!lastAssistantMessage) return

    const messageId = lastAssistantMessage.id?.toString() || `msg-${Date.now()}`
    
    // Extract text content early (needed for both messageKey generation and trigger detection)
    const textContent = getMessageText(lastAssistantMessage)
    if (!textContent) return
    
    // CRITICAL FIX: Use messageId if available, otherwise use content hash for tracking
    // This allows detection even during streaming before message has ID
    let messageKey: string
    if (messageId && messageId !== `msg-${Date.now()}`) {
      messageKey = messageId
    } else {
      // Generate hash from content for messages without ID yet
      // Simple hash for tracking
      let hash = 0
      for (let i = 0; i < textContent.length; i++) {
        const char = textContent.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
      }
      messageKey = `streaming-${Math.abs(hash).toString(36)}`
    }

    // CRITICAL FIX: Skip if already processed (prevents duplication on page refresh)
    if (processedConceptMessagesRef.current.has(messageKey)) {
      console.log("[v0] Message already processed, skipping:", messageKey)
      return
    }
    
    const alreadyHasConceptCards = lastAssistantMessage.parts?.some(
      (p: any) => p.type === "tool-generateConcepts" && p.output?.concepts?.length > 0,
    )
    if (alreadyHasConceptCards) {
      // CRITICAL FIX: Mark as processed if concept cards already exist (loaded from DB)
      processedConceptMessagesRef.current.add(messageKey)
      console.log("[v0] Message already has concepts (loaded from DB), marking as processed:", messageKey)
      return
    }

    // 🔴 CRITICAL: Since status is NOT "streaming", the message is complete
    // Process the trigger immediately - the status check above ensures we only get here when streaming is done

    console.log("[v0] Checking message for triggers:", {
      messageId,
      hasContent: !!textContent,
      contentType: typeof textContent,
      hasParts: !!lastAssistantMessage.parts,
      partsLength: lastAssistantMessage.parts?.length,
      textContentLength: textContent.length,
      textContentPreview: textContent.substring(0, 200),
      isGeneratingPro,
      status,
    })

    // DISABLED: No longer auto-triggering upload module from Maya's responses
    // Users should click the image icon in chat input to change images/products/categories
    // Maya will guide them to do this instead of programmatically triggering the module
    // 
    // const uploadModuleMatch = textContent.match(/\[SHOW_IMAGE_UPLOAD_MODULE\]\s*(.+?)(?:\n|$|\[|$)/i) || 
    //                          textContent.match(/\[SHOW_IMAGE_UPLOAD_MODULE\]/i)
    // 
    // if (uploadModuleMatch && proMode && !messagesWithUploadModule.has(messageId)) {
    //   const categoryContext = uploadModuleMatch[1]?.trim() || textContent.split('[SHOW_IMAGE_UPLOAD_MODULE]')[1]?.trim() || ''
    //   console.log("[v0] ✅ Detected image upload module trigger:", {
    //     categoryContext,
    //     messageId,
    //     proMode
    //   })
    //   
    //   // Mark this message to show upload module
    //   setMessagesWithUploadModule(prev => new Set(prev).add(messageId))
    //   processedConceptMessagesRef.current.add(messageId)
    //   return // Don't check other triggers
    // }
    
    // Check for [GENERATE_CONCEPTS] trigger (after images are uploaded)
    // CRITICAL: In Pro mode, only process this trigger if images have been uploaded
    // CRITICAL: Only process if message appears complete (trigger at end or minimal text after)
    const conceptMatch = textContent.match(/\[GENERATE_CONCEPTS\]\s*(.+?)(?:\n|$|\[|$)/i) || 
                        textContent.match(/\[GENERATE_CONCEPTS\]/i)
    
    if (conceptMatch && !isGeneratingConcepts && !pendingConceptRequest) {
      const conceptRequest = conceptMatch[1]?.trim() || textContent.split('[GENERATE_CONCEPTS]')[1]?.trim() || ''
      console.log("[v0] ✅ Detected concept generation trigger:", {
        conceptRequest,
        fullText: textContent.substring(0, 200),
        messageKey,
        messageId,
        proMode
      })
      
      // CRITICAL FIX: Mark as processed immediately to prevent duplicate processing
      processedConceptMessagesRef.current.add(messageKey)
      setPendingConceptRequest(conceptRequest || 'concept generation')
      return // Don't check other triggers for concept generation
    } else if (proMode && textContent.toLowerCase().includes('concept') && !isGeneratingConcepts && !pendingConceptRequest) {
      // FALLBACK: If Maya mentions "concept" but didn't include trigger, log for debugging
      console.log("[v0] ⚠️ Pro mode: Maya mentioned 'concept' but no [GENERATE_CONCEPTS] trigger found:", {
        textContent: textContent.substring(0, 300),
        messageId,
        hasTrigger: textContent.includes('[GENERATE_CONCEPTS]')
      })
    }

    const toolMarkers = parseMayaToolMarkers(textContent)
    if (toolMarkers.length > 0) {
      const alreadyHasToolResults = lastAssistantMessage.parts?.some(
        (p: any) =>
          p?.type === "tool-showCapabilities" ||
          p?.type === "tool-showStudioHub" ||
          p?.type === "tool-showGallery" ||
          p?.type === "tool-saveToGallery" ||
          p?.type === "tool-generateImage" ||
          p?.type === "tool-generateVideo" ||
          p?.type === "tool-showUploadZone" ||
          p?.type === "tool-switchMayaTab" ||
          p?.type === "tool-mayaGapOffer" ||
          p?.type === "tool-collectOfferBrief" ||
          p?.type === "tool-editAsset" ||
          p?.type === "tool-createAssetPreview" ||
          p?.type === "tool-structuredAssetBlocked",
      )

      const toolProcessKey = `${messageKey}-phase2-tools`
      if (alreadyHasToolResults || processedToolMessagesRef.current.has(toolProcessKey)) {
        processedToolMessagesRef.current.add(toolProcessKey)
        return
      }

      processedToolMessagesRef.current.add(toolProcessKey)
      const targetMessageId = lastAssistantMessage.id

      const resolvePhaseTwoTools = async () => {
        for (const marker of toolMarkers) {
          if (marker.tool === "show_capabilities") {
            updateAssistantToolPart("tool-showCapabilities", {
              state: "ready",
            }, targetMessageId)
          }

          if (marker.tool === "show_studio_hub") {
            updateAssistantToolPart("tool-showStudioHub", {
              state: "loading",
              stats: { feedCount: 0, pageCount: 0, photoCount: 0, videoCount: 0 },
              feeds: [],
              pages: [],
              recentPhotos: [],
              recentVideos: [],
            }, targetMessageId)

            try {
              const response = await fetch("/api/studio/hub", {
                credentials: "include",
              })
              const data = await response.json()
              if (!response.ok) {
                throw new Error(data?.error || "Failed to load Studio Hub")
              }

              updateAssistantToolPart("tool-showStudioHub", {
                state: "ready",
                stats: data?.stats || { feedCount: 0, pageCount: 0, photoCount: 0, videoCount: 0 },
                feeds: Array.isArray(data?.feeds) ? data.feeds : [],
                pages: Array.isArray(data?.pages) ? data.pages : [],
                recentPhotos: Array.isArray(data?.recentPhotos) ? data.recentPhotos : [],
                recentVideos: Array.isArray(data?.recentVideos) ? data.recentVideos : [],
              }, targetMessageId)
            } catch (error: any) {
              updateAssistantToolPart("tool-showStudioHub", {
                state: "error",
                message: error?.message || "Could not load Studio Hub",
                stats: { feedCount: 0, pageCount: 0, photoCount: 0, videoCount: 0 },
                feeds: [],
                pages: [],
                recentPhotos: [],
                recentVideos: [],
              }, targetMessageId)
            }
          }

          if (marker.tool === "show_gallery") {
            updateAssistantToolPart("tool-showGallery", { state: "loading", images: [], total: 0 }, targetMessageId)
            try {
              const response = await fetch("/api/gallery/images?limit=6", {
                credentials: "include",
              })
              const data = await response.json()
              if (!response.ok) {
                throw new Error(data?.error || "Failed to load gallery")
              }

              const images = Array.isArray(data?.images)
                ? data.images.map((image: any) => ({
                    id: `ai_${image.id}`,
                    imageUrl: image.image_url,
                    prompt: image.prompt || "",
                    createdAt: image.created_at,
                  }))
                : []

              updateAssistantToolPart("tool-showGallery", {
                state: "ready",
                images,
                total: Number(data?.total ?? images.length),
              }, targetMessageId)
            } catch (error: any) {
              updateAssistantToolPart("tool-showGallery", {
                state: "error",
                message: error?.message || "Could not load gallery",
                images: [],
                total: 0,
              }, targetMessageId)
            }
          }

          if (marker.tool === "switch_maya_tab") {
            updateAssistantToolPart("tool-switchMayaTab", {
              targetTab: marker.targetTab,
              title: marker.title,
              subtitle: marker.subtitle,
              ctaLabel: marker.ctaLabel,
            }, targetMessageId)
          }

          if (marker.tool === "save_to_gallery") {
            updateAssistantToolPart("tool-saveToGallery", { state: "loading", target: marker.target }, targetMessageId)
            try {
              let resolvedImageId = marker.imageId

              if (!resolvedImageId) {
                const latestResponse = await fetch("/api/gallery/images?limit=1", {
                  credentials: "include",
                })
                const latestData = await latestResponse.json()
                if (!latestResponse.ok) {
                  throw new Error(latestData?.error || "Failed to read latest gallery image")
                }
                const latestImage = Array.isArray(latestData?.images) ? latestData.images[0] : null
                if (!latestImage?.id) {
                  throw new Error("No gallery image available to save")
                }
                resolvedImageId = `ai_${latestImage.id}`
              }

              const saveResponse = await fetch("/api/images/bulk-save", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  imageIds: [resolvedImageId],
                }),
              })
              const saveData = await saveResponse.json()
              if (!saveResponse.ok || saveData?.success !== true) {
                throw new Error(saveData?.error || "Failed to save image")
              }

              updateAssistantToolPart("tool-saveToGallery", {
                state: "ready",
                target: marker.target,
                imageId: resolvedImageId,
                savedCount: Number(saveData?.savedCount ?? 0),
                message: "Saved to your gallery.",
              }, targetMessageId)
            } catch (error: any) {
              updateAssistantToolPart("tool-saveToGallery", {
                state: "error",
                target: marker.target,
                message: error?.message || "Could not save to gallery",
              }, targetMessageId)
            }
          }

          if (marker.tool === "generate_image") {
            updateAssistantToolPart("tool-generateImage", {
              state: "ready",
              source: marker.source,
            }, targetMessageId)
          }

          if (marker.tool === "generate_video") {
            updateAssistantToolPart("tool-generateVideo", {
              state: "loading_images",
              images: [],
            }, targetMessageId)

            try {
              const response = await fetch("/api/maya/b-roll-images?limit=8", {
                credentials: "include",
              })
              const data = await response.json()
              if (!response.ok) {
                throw new Error(data?.error || "Failed to load images")
              }

              const images: PhaseTwoVideoImage[] = Array.isArray(data?.images)
                ? data.images
                    .map((image: any, index: number) => {
                      const imageId = String(image?.id ?? `image-${index}`)
                      const imageUrl = image?.image_url || image?.imageUrl || ""
                      return {
                        id: imageId,
                        imageUrl,
                        prompt: image?.prompt || "",
                        description: image?.description || "",
                        category: image?.category || "",
                      }
                    })
                    .filter((image: PhaseTwoVideoImage) => image.imageUrl.length > 0)
                : []

              updateAssistantToolPart("tool-generateVideo", {
                state: "choose_image",
                images,
              }, targetMessageId)
            } catch (error: any) {
              updateAssistantToolPart("tool-generateVideo", {
                state: "error",
                message: error?.message || "Could not load images for video",
              }, targetMessageId)
            }
          }

          if (marker.tool === "show_upload_zone") {
            updateAssistantToolPart("tool-showUploadZone", {
              state: "ready",
              category: marker.category,
            }, targetMessageId)
          }

          if (marker.tool === "collect_offer_brief") {
            if (marker.assetType === "page") {
              continue
            }
            updateAssistantToolPart("tool-collectOfferBrief", {
              state: "ready",
              assetType: marker.assetType,
              prefill: marker.prefill || {},
              missingFields: marker.missingFields || [],
            }, targetMessageId)
          }

          if (marker.tool === "edit_asset") {
            if (marker.assetType === "page") {
              continue
            }
            updateAssistantToolPart("tool-editAsset", {
              state: "ready",
              assetType: marker.assetType,
              assetLabel: marker.assetLabel,
              message: `Active ${marker.assetLabel} editing context ready.`,
            }, targetMessageId)
          }

          if (marker.tool === "create_asset") {
            if (marker.assetType === "page") {
              continue
            }
            updateAssistantToolPart("tool-createAssetPreview", {
              state: "ready",
              assetType: marker.assetType,
              assetLabel: marker.assetLabel,
              assetId: marker.assetId || null,
              previewText: marker.previewText || "",
              url: marker.url || "",
            }, targetMessageId)
          }

          if (marker.tool === "maya_gap_offer") {
            updateAssistantToolPart("tool-mayaGapOffer", {
              dayLabels: marker.dayLabels || [],
            }, targetMessageId)
          }

          if (marker.tool === "structured_asset_blocked") {
            if (marker.assetType === "page") {
              continue
            }
            updateAssistantToolPart("tool-structuredAssetBlocked", {
              state: "blocked",
              assetType: marker.assetType,
              reason: marker.reason,
              missingFields: marker.missingFields || [],
              recoveryHint: marker.recoveryHint || "",
            }, targetMessageId)
          }
        }
      }

      resolvePhaseTwoTools()
    }

    // Caption card trigger: detect [GENERATE_CAPTIONS] in the last assistant message
    const alreadyHasCaption = lastAssistantMessage.parts?.some(
      (p: any) => p.type === "tool-generateCaptions" && p.output?.state === "ready",
    )
    if (alreadyHasCaption) {
      // Already restored from DB — mark processed so we don't regenerate
      processedCaptionMessagesRef.current.add(messageKey)
    }
    const captionMatch = textContent.match(/\[GENERATE_CAPTIONS\](?:\s+context="([^"]*)")?/i)
    if (
      captionMatch &&
      !alreadyHasCaption &&
      !isGeneratingCaption &&
      !pendingCaptionTopic &&
      !processedCaptionMessagesRef.current.has(messageKey)
    ) {
      const topic = captionMatch[1]?.trim() || "personal branding"
      processedCaptionMessagesRef.current.add(messageKey)
      setPendingCaptionTopic(topic)
      return
    }

    // Feed trigger detection handled inline in message processing
    // (Feed tab handles its own triggers: [CREATE_FEED_STRATEGY], [GENERATE_STRATEGY])
  }, [
    messages,
    status,
    isGeneratingConcepts,
    pendingConceptRequest,
    isGeneratingCaption,
    pendingCaptionTopic,
    proMode,
    messagesWithUploadModule,
    activeMayaTab,
    isCreatingFeed,
    updateAssistantToolPart,
    isLandingPagesUiEnabled,
  ])

  // Generate caption card when [GENERATE_CAPTIONS] trigger detected
  useEffect(() => {
    if (!pendingCaptionTopic || isGeneratingCaption) return

    const generateCaption = async () => {
      setIsGeneratingCaption(true)

      // Target the last assistant message
      const lastMsg = [...messages].reverse().find((m: any) => m.role === "assistant")
      const targetMsgId = lastMsg?.id ?? null

      // Show loading skeleton immediately
      updateAssistantToolPart("tool-generateCaptions", { state: "loading" }, targetMsgId)

      try {
        const res = await fetch("/api/maya/generate-caption", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ topic: pendingCaptionTopic }),
        })
        const data = await res.json()
        if (!res.ok) {
          console.error("[v0] Caption API error:", res.status, data?.error)
          throw new Error(data?.error || `HTTP ${res.status}`)
        }
        const { caption, hashtags } = data

        if (caption) {
          updateAssistantToolPart(
            "tool-generateCaptions",
            { state: "ready", caption, hashtags: hashtags ?? [] },
            targetMsgId,
          )
          // Persist to DB (fire-and-forget)
          if (chatId && targetMsgId) {
            fetch("/api/maya/update-message", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                messageId: targetMsgId,
                chatId,
                captionCards: [{ caption, hashtags: hashtags ?? [] }],
              }),
            }).catch((e) => console.warn("[v0] Caption card persist failed:", e))
          }
        } else {
          // Remove loading skeleton on empty response
          updateAssistantToolPart("tool-generateCaptions", null, targetMsgId)
        }
      } catch (err) {
        console.warn("[v0] Caption generation error:", err)
        updateAssistantToolPart("tool-generateCaptions", null, targetMsgId)
      } finally {
        setIsGeneratingCaption(false)
        setPendingCaptionTopic(null)
      }
    }

    generateCaption()
  }, [pendingCaptionTopic, isGeneratingCaption, messages, updateAssistantToolPart, chatId])

  // The problem was: message was saved BEFORE concepts were generated, so concepts were never persisted
  useEffect(() => {
    if (!pendingConceptRequest || isGeneratingConcepts) return
    

    const generateConcepts = async () => {
      setIsGeneratingConcepts(true)

      try {
        // Extract reference image from user messages (check all user messages, most recent first)
        let referenceImageUrl: string | undefined = undefined
        const userMessages = messages.filter((m) => m.role === "user").reverse() // Most recent first

        for (const userMessage of userMessages) {
          // Check if message has image in parts
          if (userMessage.parts && Array.isArray(userMessage.parts)) {
            const imagePart = userMessage.parts.find((p: any) => {
              if (!p) return false

              // Check for image type
              if (p.type === "image") {
                return true
              }
              // Check for file type with image mediaType
              if (p.type === "file" && p.mediaType && p.mediaType.startsWith("image/")) {
                return true
              }
              return false
            })
            
            if (imagePart) {
              // Try multiple possible property names (type assertion needed for image parts)
              const imagePartAny = imagePart as any
              referenceImageUrl = imagePartAny.image || imagePartAny.url || imagePartAny.src || imagePartAny.data
              if (referenceImageUrl) {
                break // Found it, stop searching
              }
            }
          }
          
          // Also check for text marker (backward compatibility)
          if (!referenceImageUrl) {
            const textContent = getMessageText(userMessage)
            
            const inspirationImageMatch = textContent.match(/\[Inspiration Image: (https?:\/\/[^\]]+)\]/)
            if (inspirationImageMatch) {
              referenceImageUrl = inspirationImageMatch[1]
              break // Found it, stop searching
            }
          }
        }

        // 🔴 CRITICAL: Detect and extract guide prompt from user messages
        // Wrapped in try-catch to prevent errors from breaking normal chat flow
        let extractedGuidePrompt: string | null = null
        let guidePromptActive = false
        
        try {
          // Check all user messages for [USE_GUIDE_PROMPT] pattern
          for (const m of messages) {
            if (m.role === "user") {
              let messageText = ""
              
              try {
                messageText = getMessageText(m)
              } catch (textError) {
                // Skip this message if we can't extract text
                continue
              }
              
              // Detect [USE_GUIDE_PROMPT] pattern (case-insensitive, multiline)
              try {
                const guidePromptMatch = messageText.match(/\[USE_GUIDE_PROMPT\]\s*([\s\S]*?)(?=\[|$)/i)
                if (guidePromptMatch && guidePromptMatch[1]) {
                  const prompt = guidePromptMatch[1].trim()
                  if (prompt && prompt.length > 0) {
                    extractedGuidePrompt = prompt
                    guidePromptActive = true
                    break // Use the most recent guide prompt
                  }
                }
              } catch (matchError) {
                // Skip guide prompt detection for this message
                console.error("[v0] Error matching guide prompt:", matchError)
              }
              
              // Check if user is clearing the guide prompt
              try {
                const clearGuidePromptKeywords = /different|change|instead|new.*prompt|clear.*guide|stop.*using.*guide/i.test(messageText)
                if (clearGuidePromptKeywords && extractedGuidePrompt) {
                  guidePromptActive = false
                }
              } catch (clearError) {
                // Skip clear detection if it fails
              }
            }
          }
          
          // Store guide prompt in localStorage for persistence (only in browser)
          if (typeof window !== "undefined" && window.localStorage) {
            try {
              if (extractedGuidePrompt && guidePromptActive) {
                localStorage.setItem("maya-guide-prompt", JSON.stringify({
                  prompt: extractedGuidePrompt,
                  active: true,
                  setAt: new Date().toISOString()
                }))
              } else if (!guidePromptActive) {
                // Clear if user requested to clear
                localStorage.removeItem("maya-guide-prompt")
              } else {
                // Try to load from localStorage if not in current messages
                const stored = localStorage.getItem("maya-guide-prompt")
                if (stored) {
                  const parsed = JSON.parse(stored)
                  if (parsed && parsed.active && parsed.prompt) {
                    extractedGuidePrompt = parsed.prompt
                    guidePromptActive = true
                  }
                }
              }
            } catch (storageError) {
              // Silently fail - guide prompt is optional feature
              console.error("[v0] Error with guide prompt storage:", storageError)
            }
          }
        } catch (guidePromptError) {
          // If guide prompt detection fails, continue without it - don't break chat
          console.error("[v0] Error in guide prompt detection, continuing without it:", guidePromptError)
          extractedGuidePrompt = null
          guidePromptActive = false
        }
        
        const conversationContext = messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .slice(-10)
          .map((m) => {
            const content = getMessageText(m)
            const cleanContent = content.replace(/\[GENERATE_CONCEPTS\][^\n]*/g, "").trim()
            const cleanContent2 = cleanContent.replace(/\[USE_GUIDE_PROMPT\]/gi, "").trim()
            if (!cleanContent2) return null
            return `${m.role === "user" ? "User" : "Maya"}: ${cleanContent2.substring(0, 500)}`
          })
          .filter(Boolean)
          .join("\n")

        // Use reference image if available, or images from library in Pro Mode
        const allImages = referenceImageUrl 
          ? [referenceImageUrl]
          : hasImageLibrary && imageLibrary.selfies.length > 0
          ? imageLibrary.selfies.slice(0, 1) // Use first selfie as reference
          : []

        let response: Response
        try {
          // Determine whether to use the Pro (selfie-based) endpoint.
          // Use Pro if proMode is already on, OR if the user explicitly asked for
          // selfie-based generation AND they have selfies in their library.
          // NOTE: check imageLibrary directly — hasImageLibrary is gated on proMode
          // and would always be false in Classic mode, defeating the purpose.
          const latestUserMsgText = userMessages[0] ? getMessageText(userMessages[0]) : ""
          const SELFIE_SIGNAL_RE = /\b(selfie|selfies|my selfies|use selfies|my photos|my uploads|my references)\b/i
          const hasSelfieSignal =
            SELFIE_SIGNAL_RE.test(latestUserMsgText) ||
            SELFIE_SIGNAL_RE.test(pendingConceptRequest ?? "")
          const selfiesAvailable = imageLibrary != null && (imageLibrary?.selfies?.length ?? 0) > 0
          const currentProMode = proMode || (hasSelfieSignal && selfiesAvailable)
          const apiEndpoint = currentProMode
            ? "/api/maya/pro/generate-concepts"
            : "/api/maya/generate-concepts"
          
          // Pro Mode API expects: userRequest, imageLibrary, category (optional), essenceWords (optional)
          // Classic Mode API expects: userRequest, count, conversationContext, referenceImageUrl, proMode, etc.
          const requestBody = currentProMode
            ? {
                userRequest: pendingConceptRequest,
                imageLibrary: imageLibrary, // Required for Pro Mode
                category: null, // Let Maya determine dynamically
                essenceWords: pendingConceptRequest?.split(' ').slice(0, 5).join(' ') || undefined, // Extract essence words from request
              }
            : {
                userRequest: pendingConceptRequest,
                count: 6, // Changed from hardcoded 3 to 6, allowing Maya to create more concepts
                conversationContext: conversationContext || undefined,
                referenceImageUrl: allImages.length > 0 ? allImages[0] : referenceImageUrl, // Primary image
                proMode: proMode, // Pass Pro mode to use Nano Banana prompting
                enhancedAuthenticity: !hasProFeatures && enhancedAuthenticity, // Only pass if Classic mode and toggle is ON
                guidePrompt: guidePromptActive && extractedGuidePrompt ? extractedGuidePrompt : undefined, // Pass guide prompt if active
                // Include full image library in Pro Mode
                ...(hasImageLibrary ? {
                  imageLibrary: imageLibrary,
                } : {}),
              }
          
          response = await fetch(apiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          })
        } catch (fetchError) {
          console.error("[v0] ❌ Error fetching generate-concepts:", fetchError)
          setIsGeneratingConcepts(false)
          setPendingConceptRequest(null)
          return
        }

        if (!response.ok) {
          let errorText = ""
          try {
            errorText = await response.text()
          } catch {
            errorText = `HTTP ${response.status}`
          }
          console.error("[v0] ❌ generate-concepts failed:", response.status, errorText)
          setIsGeneratingConcepts(false)
          setPendingConceptRequest(null)
          return
        }

        const result = await response.json().catch(() => null)
        if (!result) {
          console.error("[v0] ❌ generate-concepts returned invalid JSON")
          setIsGeneratingConcepts(false)
          setPendingConceptRequest(null)
          return
        }
        
        // 🔴 FIX: Both Classic Mode and Pro Mode now return { state: "ready", concepts: [...] }
        // This ensures consistent handling across both modes
        const concepts = (result.state === "ready" && result.concepts && Array.isArray(result.concepts))
          ? result.concepts
          : (result.concepts && Array.isArray(result.concepts))
          ? result.concepts // Fallback for backward compatibility
          : null
        console.log("[v0] Concept generation result:", {
          hasState: !!result.state,
          state: result.state,
          conceptsCount: concepts?.length,
          isProMode: proMode,
        })

        if (concepts && Array.isArray(concepts) && concepts.length > 0) {
          // Find the current last assistant message ID before updating
          const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant")
          const messageId = lastAssistantMessage?.id?.toString()
          const normalizedConcepts = concepts.map((concept: any, index: number) => ({
            ...concept,
            id: concept.id || `concept-${messageId || "pending"}-${index}`,
          }))
          const normalizedResult = {
            ...result,
            concepts: normalizedConcepts,
          }
          
          // Category context will be handled by new Pro Mode system
          if (pendingConceptRequest) {
            // Extract category from request (first few words or common patterns)
            const categoryMatch = pendingConceptRequest.match(/(travel|beauty|fashion|luxury|wellness|tech|selfie|brand|alo|chanel|glossier|airport|skincare|makeup)/i)
            if (categoryMatch) {
              // Category will be stored in new Pro Mode system
            } else {
              // Fallback: category will be detected by Pro Mode system
            }
          }

          // In Pro mode, show concept cards (they now support image upload/selection)
          // Workbench is kept separate for manual prompt creation
          // Always show concept cards - they work in both Classic and Pro modes
          setMessages((prevMessages: any[]) => {
            const newMessages = [...prevMessages]
            const lastIndex = newMessages.length - 1
            if (lastIndex >= 0 && newMessages[lastIndex].role === "assistant") {
              const existingParts = newMessages[lastIndex].parts || []
              newMessages[lastIndex] = {
                ...newMessages[lastIndex],
                parts: [
                  ...existingParts,
                  {
                    type: "tool-generateConcepts",
                    output: normalizedResult,
                  } as any,
                ],
              }
            }
            return newMessages
          })

          // Assistant persistence is centralized in the save effect below to avoid duplicate rows.
          // No direct save call here.
        }
        } catch (error: any) {
          console.error("[v0] ❌ Error generating concepts:", error)
          console.error("[v0] Error details:", {
            message: error?.message,
            stack: error?.stack,
            pendingRequest: pendingConceptRequest,
          })
          // Reset state on error so user can try again
          setIsGeneratingConcepts(false)
          setPendingConceptRequest(null)
        } finally {
          setIsGeneratingConcepts(false)
          // Clear pending request after processing (success or error)
          setPendingConceptRequest(null)
        }
    }

    generateConcepts()
  }, [pendingConceptRequest, isGeneratingConcepts, setMessages, messages, chatId, proMode, imageLibrary, hasImageLibrary, hasProFeatures, enhancedAuthenticity, getMessageText])

  useEffect(() => {
    // Don't save if we're currently generating concepts - wait for them to be added first
    if (status !== "ready" || !chatId || messages.length === 0 || isGeneratingConcepts || pendingConceptRequest) {
      return
    }

    // Find the last assistant message
    const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant")
    if (!lastAssistantMessage) {
      return
    }

    // Skip if already saved
    if (savedMessageIds.current.has(lastAssistantMessage.id)) {
      return
    }

    // Check if this message has a [GENERATE_CONCEPTS] trigger but no concepts yet
    // If so, don't save yet - wait for concept generation
    const textContent = getMessageText(lastAssistantMessage)

    const hasConceptTrigger = /\[GENERATE_CONCEPTS\]/i.test(textContent)
    const hasConceptCards = lastAssistantMessage.parts?.some(
      (p: any) => p.type === "tool-generateConcepts" && p.output?.concepts?.length > 0,
    )

    // If there's a trigger but no concepts yet, wait for concept generation
    if (hasConceptTrigger && !hasConceptCards) {
      return
    }

    // Check if this message has a [CREATE_FEED_STRATEGY] trigger but no feed card yet
    // If so, don't save yet - wait for feed card creation
    // CRITICAL: For unsaved feeds, the CREATE_FEED_STRATEGY trigger must stay in text
    // so it can be detected again on page reload (like concept cards work)
    const hasFeedTrigger =
      !!extractFeedStrategyJson(textContent) || textContent.includes("[CREATE_FEED_STRATEGY]")
    const hasFeedCard = lastAssistantMessage.parts?.some(
      (p: any) => p.type === "tool-generateFeed",
    )

    // If there's a feed trigger but no feed card yet, wait for feed card creation
    if (hasFeedTrigger && !hasFeedCard) {
      return
    }

    // Extract text content from parts for saving
    // CRITICAL: Keep CREATE_FEED_STRATEGY trigger in text for unsaved feeds
    // This allows the feed card to be recreated on page reload (same as concept cards)
    let saveTextContent = ""
    if (lastAssistantMessage.parts && Array.isArray(lastAssistantMessage.parts)) {
      const textParts = lastAssistantMessage.parts.filter((p: any) => p.type === "text")
      saveTextContent = textParts
        .map((p: any) => p.text)
        .join("\n")
        .trim()
    }
    
    // If message has content property (fallback), use that
    if (!saveTextContent && typeof lastAssistantMessage.content === "string") {
      saveTextContent = lastAssistantMessage.content
    }
    
    // CRITICAL: Extract feed cards and add persistence markers
    // Feed cards need [FEED_CARD:feedId] markers to persist across page reloads
    const feedCards: Array<{ feedId: number }> = []
    if (lastAssistantMessage.parts && Array.isArray(lastAssistantMessage.parts)) {
      for (const part of lastAssistantMessage.parts) {
        if (part.type === "tool-generateFeed") {
          const toolPart = part as any
          const output = toolPart.output
          if (output && output.feedId) {
            feedCards.push({ feedId: output.feedId })
          }
        }
      }
    }
    
    // Add feed card markers to content text (for persistence)
    // These markers allow the load-chat API to restore feed cards on reload
    if (feedCards.length > 0) {
      // CRITICAL: Remove [CREATE_FEED_STRATEGY] trigger for SAVED feeds
      // Unsaved feeds keep the trigger so they can be recreated on reload
      // Saved feeds use [FEED_CARD:feedId] markers instead
      saveTextContent = stripFeedStrategyArtifacts(saveTextContent)
      
      const feedMarkers = feedCards.map(f => `[FEED_CARD:${f.feedId}]`).join(" ")
      saveTextContent = `${saveTextContent}\n${feedMarkers}`.trim()
      console.log("[v0] Save effect - added feed card markers to content:", feedMarkers)
    }

    // Extract completed video cards and persist as [VIDEO_CARD:...] markers.
    const videoCards: Array<{ videoUrl: string; motionPrompt?: string; imageUrl?: string }> = []
    if (lastAssistantMessage.parts && Array.isArray(lastAssistantMessage.parts)) {
      const seenVideoUrls = new Set<string>()
      for (const part of lastAssistantMessage.parts) {
        if (part.type !== "tool-generateVideo") continue
        const output = (part as any)?.output
        const videoUrl = typeof output?.videoUrl === "string" ? output.videoUrl.trim() : ""
        if (!videoUrl || seenVideoUrls.has(videoUrl)) continue
        seenVideoUrls.add(videoUrl)
        videoCards.push({
          videoUrl,
          motionPrompt: typeof output?.motionPrompt === "string" ? output.motionPrompt : undefined,
          imageUrl: typeof output?.imageUrl === "string" ? output.imageUrl : undefined,
        })
      }
    }

    if (videoCards.length > 0) {
      // Once a video is complete, persist card markers and remove dispatch triggers.
      saveTextContent = stripMayaVideoCardMarkers(saveTextContent)
      saveTextContent = saveTextContent.replace(/\[GENERATE_VIDEO(?:\s*:\s*[^\]]+)?\]/gi, "").trim()

      const videoMarkers = videoCards
        .map((videoCard) => encodeMayaVideoCardMarker(videoCard))
        .filter((marker) => marker.length > 0)
        .join(" ")

      if (videoMarkers) {
        saveTextContent = `${saveTextContent}\n${videoMarkers}`.trim()
        console.log("[v0] Save effect - added video card markers to content:", {
          count: videoCards.length,
        })
      }
    }

    // Extract concept cards from parts
    // 🔴 FIX: Both Classic Mode and Pro Mode now return { state: "ready", concepts: [...] }
    // This ensures consistent handling across both modes
    const conceptCards: any[] = []
    if (lastAssistantMessage.parts && Array.isArray(lastAssistantMessage.parts)) {
      for (const part of lastAssistantMessage.parts) {
        if (part.type === "tool-generateConcepts") {
          const toolPart = part as any
          const output = toolPart.output
          if (output) {
            // Both modes now use: output.state === "ready" && output.concepts
            if (output.state === "ready" && Array.isArray(output.concepts)) {
              conceptCards.push(...output.concepts)
            } else if (Array.isArray(output.concepts)) {
              // Fallback for backward compatibility (old Pro Mode format)
              conceptCards.push(...output.concepts)
            }
          }
        }
      }
    }
    
    // Only save if we have something to save
    // CRITICAL: Check for feed cards too, not just concepts!
    if (!saveTextContent && conceptCards.length === 0 && feedCards.length === 0 && videoCards.length === 0) {
      return
    }

    // Mark as saved immediately to prevent duplicate saves
    savedMessageIds.current.add(lastAssistantMessage.id)

    // Save to database
    fetch("/api/maya/save-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId,
        role: "assistant",
        content: saveTextContent || "",
        conceptCards: conceptCards.length > 0 ? conceptCards : null,
        feedCards: feedCards.length > 0 ? feedCards : null,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          console.error("[v0] Failed to save message:", data.error)
          savedMessageIds.current.delete(lastAssistantMessage.id)
        }
      })
      .catch((error) => {
        console.error("[v0] Save error:", error)
        savedMessageIds.current.delete(lastAssistantMessage.id)
      })
  }, [status, chatId, messages, isGeneratingConcepts, pendingConceptRequest]) // Updated dependency to messages
  
  // CRITICAL: Handle feed save callback to update database with [FEED_CARD:feedId] marker
  // This ensures saved feeds persist across page reloads and tab switches with their images
  const handleFeedSaved = useCallback(async (messageId: string, feedId: number) => {
    if (!chatId) {
      console.warn("[v0] ❌ No chatId available, cannot save feed card")
      return
    }
    
    // Find the message in current state
    const message = messages.find((m: any) => m.id === messageId)
    if (!message) {
      console.error("[v0] ❌ Message not found:", messageId)
      return
    }
    
    // Extract feed card data from message parts
    const feedCardPart = message.parts?.find((p: any) => p.type === "tool-generateFeed")
    if (!feedCardPart || !feedCardPart.output) {
      console.error("[v0] ❌ Feed card part not found in message:", messageId)
      return
    }
    
    // Extract text content (preserve existing content)
    let textContent = ""
    if (message.parts && Array.isArray(message.parts)) {
      const textParts = message.parts.filter((p: any) => p.type === "text")
      textContent = textParts.map((p: any) => p.text).join("\n").trim()
    }
    if (!textContent && typeof message.content === "string") {
      textContent = message.content
    }
    
    // Prepare updated feed card data with feedId
    // CRITICAL FIX: When feedId exists, don't include posts in styling_details
    // Posts will be fetched fresh from database when feed card is restored
    // This ensures generated images are always included (not stale cached data)
    const { posts, ...feedCardWithoutPosts } = feedCardPart.output
    const updatedFeedCard = {
      ...feedCardWithoutPosts,
      feedId: feedId,
      isSaved: true,
      // Don't include posts - they'll be fetched fresh from database with images
    }
    
    console.log("[v0] 🔄 Updating message with feed card (feedId assigned):", {
      messageId,
      feedId,
      hasFeedCard: !!feedCardPart,
      hadPosts: !!posts,
      postsCount: posts?.length || 0,
      note: "Posts excluded from styling_details - will be fetched fresh from database with images",
    })
    
    // Save to database using update-message endpoint with feedCards parameter
    try {
      const response = await fetch("/api/maya/update-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messageId: messageId, // CRITICAL FIX: Pass as string - API handles string-to-number conversion
          // parseInt() would corrupt UUIDs (if they existed) or fail silently for invalid formats
          content: textContent, // Preserve existing text content
          feedCards: [updatedFeedCard], // Save to styling_details column
          append: false,
        }),
      })
      
      if (!response.ok) {
        throw new Error(`Failed to save message: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.success) {
        console.log("[v0] ✅ Feed card saved to styling_details column:", { messageId, feedId })
      } else {
        console.error("[v0] ❌ Failed to save feed card:", data.error)
      }
    } catch (error) {
      console.error("[v0] ❌ Error saving feed card:", error)
    }
  }, [chatId, messages])

  useEffect(() => {
    if (status !== "ready" || !chatId || messages.length === 0) return

    // Find unsaved user messages
    const unsavedUserMessages = messages.filter((msg) => msg.role === "user" && !savedMessageIds.current.has(msg.id))

    for (const userMsg of unsavedUserMessages) {
      // Extract text content
      let textContent = ""
      if (userMsg.parts && Array.isArray(userMsg.parts)) {
        const textParts = userMsg.parts.filter((p: any) => p.type === "text")
        textContent = textParts
          .map((p: any) => p.text)
          .join("\n")
          .trim()
      } else {
        textContent = getMessageText(userMsg)
      }

      if (!textContent) continue

      // Mark as saved immediately
      savedMessageIds.current.add(userMsg.id)

      // Save user message to database
      fetch("/api/maya/save-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          chatId,
          role: "user",
          content: textContent,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            console.log("[v0] ✅ User message saved")
          } else {
            console.error("[v0] ❌ Failed to save user message:", data.error)
            savedMessageIds.current.delete(userMsg.id)
          }
        })
        .catch((error) => {
          console.error("[v0] ❌ User message save error:", error)
          savedMessageIds.current.delete(userMsg.id)
        })
    }
  }, [status, chatId, messages])

  const isTyping = status === "submitted" || status === "streaming"


  // Update prompts based on the locked tab-scoped contract.
  useEffect(() => {
    setCurrentPrompts(
      getMayaSurfaceQuickPrompts({
        activeTab: activeMayaTab,
        proMode,
        hasTrainedModel,
      }),
    )
  }, [activeMayaTab, proMode, hasTrainedModel])

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const response = await fetch("/api/user/credits")
        const data = await response.json()
        setCreditBalance(data.balance || 0)
      } catch (error) {
        console.error("[v0] Error fetching credits:", error)
        setCreditBalance(0)
      }
    }
    fetchCredits()
  }, [])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }, [])

  const retryFailedSaves = async () => {
    if (retryQueue.current.length === 0) return

    console.log("[v0] 🔄 Retrying", retryQueue.current.length, "failed saves")

    const queue = [...retryQueue.current]
    retryQueue.current = []

    for (const item of queue) {
      try {
        const response = await fetch("/api/maya/save-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(item.payload),
        })

        if (response.ok) {
          console.log("[v0] ✅ Retry successful for message:", item.messageId)
          savedMessageIds.current.add(item.messageId)
        } else {
          console.log("[v0] ⚠️ Retry failed, re-queuing:", item.messageId)
          retryQueue.current.push(item)
        }
      } catch (error) {
        console.error("[v0] ❌ Retry error:", error)
        retryQueue.current.push(item)
      }
    }
  }

  useEffect(() => {
    const interval = setInterval(retryFailedSaves, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return

    const container = messagesContainerRef.current
    const scrollTop = container.scrollTop
    const scrollHeight = container.scrollHeight
    const clientHeight = container.clientHeight

    // Check if user is within 100px of bottom
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100

    // Update refs and state
    isAtBottomRef.current = isNearBottom
    setShowScrollButton(!isNearBottom)
  }, [])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    container.addEventListener("scroll", handleScroll)
    return () => container.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  useEffect(() => {
    // Only auto-scroll if user is at bottom (respects manual scrolling up)
    if (isAtBottomRef.current) {
      requestAnimationFrame(() => {
        scrollToBottom("smooth")
      })
    }
  }, [messages.length, scrollToBottom]) // Changed from messages to messages.length to prevent infinite loop

  // The loadChat function has been consolidated and is now being called in the useEffect below.
  // This useEffect is now responsible for the initial loadChat call.
  // NOTE: This useEffect is now redundant due to the new useEffect above that depends on 'user'

  useEffect(() => {
    console.log("[v0] Maya chat status:", status, "isTyping:", isTyping)
  }, [status, isTyping])

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be smaller than 10MB")
      return
    }

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file")
      return
    }

    setIsUploadingImage(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload image")
      }

      const { url } = await response.json()
      setUploadedImage(url)
      console.log("[v0] Image uploaded:", url)

      // Call the onImageGenerated callback if provided
      if (onImageGenerated) {
        onImageGenerated()
      }
    } catch (error) {
      console.error("[v0] Error uploading image:", error)
      alert("Failed to upload image. Please try again.")
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be smaller than 10MB")
      return
    }

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file")
      return
    }

    setIsUploadingImage(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload image")
      }

      const { url } = await response.json()
      setUploadedImage(url)
      console.log("[v0] Image uploaded:", url)

      // Call the onImageGenerated callback if provided
      if (onImageGenerated) {
        onImageGenerated()
      }
    } catch (error) {
      console.error("[v0] Error uploading image:", error)
      alert("Failed to upload image. Please try again.")
    } finally {
      setIsUploadingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  // Generate prompt suggestions based on uploaded images
  const generatePromptSuggestions = async (userMessage: string) => {
    setIsGeneratingSuggestions(true)

    try {
      // Get selected images from uploaded images
      const selectedImages = uploadedImages.map((img, idx) => ({
        id: img.url,
        type: img.type === "base" ? ("user_lora" as const) : ("product" as const),
        url: img.url,
        position: idx,
      }))

      const response = await fetch("/api/maya/generate-prompt-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workbenchImages: selectedImages, // API still expects workbenchImages key
          userIntent: userMessage,
          previousMessages: messages.slice(-5).map((msg) => ({
            role: msg.role,
            content: (msg.parts?.find((p: any) => p && p.type === "text") as any)?.text || "",
          })),
          contentType: "custom",
        }),
      })

      const data = await response.json()

      if (data.success && data.suggestions) {
        setPromptSuggestions(data.suggestions)
      }
    } catch (error) {
      console.error("Failed to generate prompt suggestions:", error)
    } finally {
      setIsGeneratingSuggestions(false)
    }
  }

  const sendMessageParts = useCallback(
    (parts: PendingMayaChatMessage["parts"]) => {
      sendMessage({
        role: "user",
        parts: parts as any,
      })
    },
    [sendMessage],
  )

  useEffect(() => {
    if (!chatId || !pendingMessageAfterChatCreateRef.current) return

    const pendingMessage = pendingMessageAfterChatCreateRef.current
    pendingMessageAfterChatCreateRef.current = null
    sendMessageParts(pendingMessage.parts)
  }, [chatId, sendMessageParts])

  const handleSendMessage = async (customPrompt?: string, imageOverride?: string) => {
    const messageText = customPrompt || inputValue.trim()
    const imageToSend = imageOverride || uploadedImage

    if ((messageText || imageToSend) && !isTyping) {
      setChatError(null)

      const messageParts: PendingMayaChatMessage["parts"] = []
      if (messageText.trim()) {
        messageParts.push({
          type: "text",
          text: messageText,
        })
      }

      if (imageToSend) {
        messageParts.push({
          type: "image",
          image: imageToSend,
        })
        console.log("[v0] ✅ Sending message with inspiration image:", imageToSend.substring(0, 100) + "...")
      }

      console.log("[v0] 📤 Sending message with settings:", {
        styleStrength,
        promptAccuracy,
        aspectRatio,
        realismStrength, // Include realism strength in log
        hasImage: !!imageToSend,
      })

      isAtBottomRef.current = true

      if (!chatId) {
        console.log("[v0] No chatId exists, creating new chat before sending message...")
        try {
          // 🔴 FIX: Use correct chatType based on mode (Pro Mode vs Classic Mode)
          const chatType = currentChatType
          const response = await fetch("/api/maya/new-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chatType }),
          })
          if (response.ok) {
            const data = await response.json()
            if (data.chatId) {
              pendingMessageAfterChatCreateRef.current = { parts: messageParts }
              setChatId(data.chatId)
              setChatTitle("New Chat")
              setInputValue("")
              setUploadedImage(null)
              console.log("[v0] Created new chat with ID:", data.chatId, "chatType:", chatType)
              return
            }
          }
          const errorText = await response.text().catch(() => "")
          throw new Error(errorText || `Failed to create new chat (${response.status})`)
        } catch (error) {
          console.error("[v0] Error creating new chat:", error)
          setChatError(error instanceof Error ? error.message : "Maya could not start a new chat. Please try again.")
          return
        }
      }

      sendMessageParts(messageParts)
      setInputValue("")
      setUploadedImage(null)
    }
  }

  const setMayaTabAndHash = useCallback((tab: "photos" | "videos" | "training") => {
    setActiveMayaTab(tab)
    if (typeof window !== "undefined") {
      localStorage.setItem("mayaActiveTab", tab)
      const nextHash =
        tab === "training" ? "#maya/training" : tab === "videos" ? "#maya/videos" : "#maya"
      window.history.replaceState(null, "", nextHash)
    }
  }, [])

  const handleSwitchScopedTab = useCallback(
    (tab: "photos" | "videos" | "training") => {
      setMayaTabAndHash(tab)
      trackAnalyticsEvent({
        event: "maya_tab_handoff_opened",
        properties: {
          fromTab: activeMayaTab,
          toTab: tab,
        },
      }).catch(() => {})
    },
    [activeMayaTab, setMayaTabAndHash],
  )

  const handlePhaseTwoUploadZone = useCallback(
    (category: PhaseTwoUploadCategory = "selfies") => {
      setMayaTabAndHash("photos")
      if (!proMode) {
        setProMode(true)
      }
      setManageCategory(category)
      setShowUploadFlow(true)
    },
    [proMode, setProMode, setMayaTabAndHash],
  )

  const handlePhaseTwoGenerationSourceSelect = useCallback(
    (messageId: string, source: PhaseTwoGenerationSource | "choose_source") => {
      updateAssistantToolPart(
        "tool-generateImage",
        {
          state: "ready",
          source,
        },
        messageId,
      )
    },
    [updateAssistantToolPart],
  )

  const handlePhaseTwoGenerationSourceConfirm = useCallback(
    (_messageId: string, source: PhaseTwoGenerationSource) => {
      const queueGenerationPrompt = (prompt: string) => {
        setTimeout(() => {
          void handleSendMessage(prompt)
        }, 0)
      }

      if (source === "selfies") {
        // If the user already has linked selfies, keep them in Photos and continue.
        if (hasImageLibrary && imageLibrary.selfies.length > 0) {
          if (!proMode) {
            setProMode(true)
          }
          setMayaTabAndHash("photos")
          toast({
            title: "Perfect — using your linked selfies",
            description: "Starting now with your linked selfies.",
          })
          queueGenerationPrompt("Use my linked selfies and create one photo I can post this week.")
          return
        }

        // No linked selfies yet: open upload flow.
        handlePhaseTwoUploadZone("selfies")
        return
      }

      if (source === "custom_model") {
        // If model exists, stay in Photos and use it directly.
        if (hasTrainedModel) {
          if (proMode) {
            setProMode(false)
          }
          setMayaTabAndHash("photos")
          toast({
            title: "My Model is ready",
            description: "Starting now with your trained model.",
          })
          queueGenerationPrompt("Use My Model and create one polished brand photo I can post this week.")
          return
        }

        // No trained model yet: move user to training.
        if (proMode) {
          setProMode(false)
        }
        setMayaTabAndHash("training")
        return
      }

      if (proMode) {
        setProMode(false)
      }
      setMayaTabAndHash("photos")
      toast({
        title: "Base model ready",
        description: "Starting now with the base model.",
      })
      queueGenerationPrompt("Use the base model and create one polished brand photo I can post this week.")
    },
    [
      handlePhaseTwoUploadZone,
      hasImageLibrary,
      hasTrainedModel,
      imageLibrary.selfies.length,
      handleSendMessage,
      proMode,
      setProMode,
      setMayaTabAndHash,
      toast,
    ],
  )

  const handleToolSubmitOfferBrief = useCallback(
    (assetType: MayaOfferBriefAssetType, values: OfferBriefFormValues) => {
      const brief: MayaOfferBrief = {
        assetType,
        designStyle: values.designStyle.trim(),
        offerType: values.offerType.trim(),
        transformation: values.transformation.trim(),
        pricePoint: values.pricePoint.trim(),
        formatAndDuration: values.formatAndDuration.trim(),
        idealClient: values.idealClient.trim(),
        biggestStruggle: values.biggestStruggle.trim(),
        uniqueMethod: values.uniqueMethod.trim(),
        proofPoints: values.proofPoints.trim(),
        callToAction: values.callToAction.trim(),
      }

      const markerPayload = encodeOfferBriefMarkerPayload(brief)
      const summaryText =
        `Here is my ${assetType === "calendar" ? "calendar" : "offer"} brief.\\n` +
        (brief.designStyle ? `Design style: ${brief.designStyle}\\n` : "") +
        `Offer: ${brief.offerType}\\n` +
        `Transformation: ${brief.transformation}\\n` +
        `Ideal client: ${brief.idealClient}\\n` +
        `[SUBMIT_OFFER_BRIEF:${markerPayload}]`

      void handleSendMessage(summaryText)
    },
    [handleSendMessage],
  )

  const persistVideoCardMarker = useCallback(
    async (input: { messageId: string; videoUrl: string; motionPrompt?: string; imageUrl?: string; chatIdOverride?: number }) => {
      const targetChatId = input.chatIdOverride ?? chatId
      if (!targetChatId) return

      const targetMessage = messages.find((message: any) => String(message?.id) === String(input.messageId))
      const fallbackAssistant = [...messages].reverse().find((message: any) => message?.role === "assistant")
      const messageToPersist = targetMessage || fallbackAssistant
      if (!messageToPersist) return

      let baseContent = ""
      if (Array.isArray(messageToPersist.parts)) {
        baseContent = messageToPersist.parts
          .filter((part: any) => part?.type === "text" && typeof part?.text === "string")
          .map((part: any) => part.text)
          .join("\n")
          .trim()
      } else if (typeof messageToPersist.content === "string") {
        baseContent = messageToPersist.content.trim()
      }

      const marker = encodeMayaVideoCardMarker({
        videoUrl: input.videoUrl,
        motionPrompt: input.motionPrompt,
        imageUrl: input.imageUrl,
      })
      if (!marker) return

      const cleanContent = stripMayaVideoCardMarkers(baseContent)
        .replace(/\[GENERATE_VIDEO(?:\s*:\s*[^\]]+)?\]/gi, "")
        .trim()

      const nextContent = `${cleanContent}\n${marker}`.trim()
      if (!nextContent) return

      const response = await fetch("/api/maya/update-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: targetChatId,
          messageId: messageToPersist.id,
          content: nextContent,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || "Failed to persist video marker")
      }
    },
    [chatId, messages],
  )

  const handleToolStartVideoGeneration = useCallback(
    async (input: {
      messageId: string
      imageId: string
      imageUrl: string
      prompt?: string
      description?: string
      category?: string
      chatIdOverride?: number
    }) => {
      const fallbackPrompt = input.prompt?.trim() || input.description?.trim() || "Cinematic lifestyle scene"

      clearVideoPollForMessage(input.messageId)
      updateAssistantToolPart(
        "tool-generateVideo",
        {
          state: "loading",
          imageUrl: input.imageUrl,
        },
        input.messageId,
      )

      try {
        const motionResponse = await fetch("/api/maya/generate-motion-prompt", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fluxPrompt: fallbackPrompt,
            description: input.description || "",
            category: input.category || "",
            imageUrl: input.imageUrl,
          }),
        })
        const motionData = await motionResponse.json()
        if (!motionResponse.ok) {
          throw new Error(motionData?.error || "Failed to create motion prompt")
        }
        const motionPrompt = motionData?.motionPrompt || fallbackPrompt

        updateAssistantToolPart(
          "tool-generateVideo",
          {
            state: "loading",
            imageUrl: input.imageUrl,
            motionPrompt,
          },
          input.messageId,
        )

        const generateResponse = await fetch("/api/maya/generate-video", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: input.imageUrl,
            imageId: input.imageId,
            motionPrompt,
            imageDescription: input.description || "",
            category: input.category || "",
          }),
        })
        const generateData = await generateResponse.json()

        if (!generateResponse.ok) {
          if (generateResponse.status === 402) {
            setShowBuyCreditsModal(true)
          }
          throw new Error(generateData?.message || generateData?.error || "Failed to start video generation")
        }

        const predictionId = generateData?.predictionId
        const videoId = generateData?.videoId
        if (!predictionId || !videoId) {
          throw new Error("Missing video job metadata")
        }
        const debugInfo =
          generateData?.debug && typeof generateData.debug === "object" ? generateData.debug : undefined
        const authorityMotionPrompt =
          typeof debugInfo?.authorityMotionPrompt === "string" ? debugInfo.authorityMotionPrompt.trim() : ""
        const appliedMotionPrompt = authorityMotionPrompt || motionPrompt

        updateAssistantToolPart(
          "tool-generateVideo",
          {
            state: "processing",
            progress: 5,
            motionPrompt: appliedMotionPrompt,
            imageUrl: input.imageUrl,
            debug: debugInfo,
          },
          input.messageId,
        )

        const pollInterval = setInterval(async () => {
          try {
            const pollResponse = await fetch(
              `/api/maya/check-video?predictionId=${encodeURIComponent(String(predictionId))}&videoId=${encodeURIComponent(String(videoId))}`,
              {
                credentials: "include",
              },
            )
            const pollData = await pollResponse.json()

            if (!pollResponse.ok) {
              throw new Error(pollData?.error || "Failed to check video status")
            }

            if (pollData?.status === "succeeded" && pollData?.videoUrl) {
              clearVideoPollForMessage(input.messageId)
              updateAssistantToolPart(
                "tool-generateVideo",
                {
                  state: "ready",
                  videoUrl: pollData.videoUrl,
                  motionPrompt: appliedMotionPrompt,
                  imageUrl: input.imageUrl,
                  debug: debugInfo,
                },
                input.messageId,
              )
              await persistVideoCardMarker({
                messageId: input.messageId,
                videoUrl: pollData.videoUrl,
                motionPrompt: appliedMotionPrompt,
                imageUrl: input.imageUrl,
                chatIdOverride: input.chatIdOverride,
              })

              try {
                const creditsRes = await fetch("/api/user/credits", { credentials: "include" })
                const creditsData = await creditsRes.json()
                if (creditsRes.ok && typeof creditsData?.balance === "number") {
                  setCreditBalance(creditsData.balance)
                }
              } catch {
                // Non-blocking.
              }
              return
            }

            if (pollData?.status === "failed") {
              clearVideoPollForMessage(input.messageId)
              updateAssistantToolPart(
                "tool-generateVideo",
                {
                  state: "error",
                  message: pollData?.error || "Video generation failed",
                  debug: debugInfo,
                },
                input.messageId,
              )
              return
            }

            updateAssistantToolPart(
              "tool-generateVideo",
              {
                state: "processing",
                progress: Number.isFinite(pollData?.progress) ? pollData.progress : 50,
                motionPrompt: appliedMotionPrompt,
                imageUrl: input.imageUrl,
                debug: debugInfo,
              },
              input.messageId,
            )
          } catch (error: any) {
            clearVideoPollForMessage(input.messageId)
            updateAssistantToolPart(
              "tool-generateVideo",
              {
                state: "error",
                message: error?.message || "Video generation failed",
                debug: debugInfo,
              },
              input.messageId,
            )
          }
        }, 3000)

        videoPollIntervalsRef.current.set(input.messageId, pollInterval)
      } catch (error: any) {
        clearVideoPollForMessage(input.messageId)
        updateAssistantToolPart(
          "tool-generateVideo",
          {
            state: "error",
            message: error?.message || "Could not start video generation",
          },
          input.messageId,
        )
      }
    },
    [clearVideoPollForMessage, persistVideoCardMarker, updateAssistantToolPart],
  )

  const startInlineVideoFromSource = useCallback(
    async (input: {
      imageId: string
      imageUrl: string
      prompt?: string
      description?: string
      category?: string
    }) => {
      let nextChatId = chatId

      if (!nextChatId) {
        await baseHandleNewChat()

        if (typeof window !== "undefined") {
          const storedChatId = localStorage.getItem(`mayaCurrentChatId_${currentChatType}`)
          nextChatId = storedChatId ? Number.parseInt(storedChatId, 10) : null
        }
      }

      const userMessageId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `maya-user-${Date.now().toString(36)}`
      const assistantMessageId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `maya-assistant-${Date.now().toString(36)}`

      setMessages((prev: any[]) => [
        ...prev,
        {
          id: userMessageId,
          role: "user",
          parts: [{ type: "text", text: "Turn this photo into a short video." }],
        },
        {
          id: assistantMessageId,
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "Perfect. I’m turning this photo into motion now.",
            },
            {
              type: "tool-generateVideo",
              output: {
                state: "loading",
                imageUrl: input.imageUrl,
              },
            },
          ],
        },
      ])

      await handleToolStartVideoGeneration({
        messageId: assistantMessageId,
        imageId: input.imageId,
        imageUrl: input.imageUrl,
        prompt: input.prompt,
        description: input.description,
        category: input.category,
        chatIdOverride: nextChatId ?? undefined,
      })
    },
    [baseHandleNewChat, chatId, currentChatType, handleToolStartVideoGeneration, setMessages],
  )

  // Wrapper for handleNewChat that adds component-specific logic
  const handleNewChat = useCallback(async () => {
    // Reset component-specific state for new chat
    setSelectedPrompt("")
    setMessagesWithUploadModule(new Set())
    setPendingConceptRequest(null)
    setCalendarSuggestionDismissed(false)
      promptGenerationTriggeredRef.current.clear() // Clear prompt generation tracking
    clearAllVideoPolls()

    // Clear shared images when starting new chat
    clearSharedImages()

    // Call hook's base handler
    await baseHandleNewChat()
  }, [baseHandleNewChat, clearSharedImages, clearAllVideoPolls])

  // Handle mode switching - creates a new chat when switching between Classic and Pro
  // Handle saving concept to guide (admin mode)
  const handleSaveToGuide = useCallback(async (concept: any, imageUrl?: string) => {
    if (!isAdmin) return // Only available in admin mode
    
    if (!selectedGuideId) {
      toast({
        title: "No guide selected",
        description: "Please select a guide from the dropdown at the top of the page",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/admin/prompt-guide/approve-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideId: selectedGuideId,
          // CRITICAL: Extract prompt text from all possible fields
          // Concepts may have: fullPrompt, prompt, description, or prompt_text
          promptText: concept.fullPrompt || concept.prompt || concept.prompt_text || concept.description || '',
          conceptTitle: concept.title || concept.label || concept.concept_title || 'Untitled Concept',
          conceptDescription: concept.description || concept.concept_description || concept.conceptDescription || '',
          category: concept.category || selectedGuideCategory || "General",
          imageUrl: imageUrl || concept.image_url || concept.imageUrl || null,
          replicatePredictionId: concept.replicate_prediction_id || concept.replicatePredictionId || null,
          generationSettings: concept.generation_settings || concept.generationSettings || {},
        }),
      })

      // Handle duplicate (409 Conflict) - don't throw error, just show info toast
      if (response.status === 409) {
        const data = await response.json().catch(() => ({ message: "Already exists" }))
        toast({
          title: "Already saved",
          description: data.message || "This prompt and image combination already exists in the guide",
          variant: "default",
        })
        return // Exit early, don't throw error
      }

      // Handle success (200-299)
      if (response.ok) {
        const data = await response.json()
        // Use same fallback chain as API call to ensure consistent concept name display
        const conceptName = concept.title || concept.label || concept.concept_title || 'Untitled Concept'
        toast({
          title: "Saved to guide",
          description: `Added "${conceptName}" ${imageUrl ? "with image" : ""} to your guide`,
        })
        return // Exit early on success
      }

      // Handle other errors (400, 401, 403, 500, etc.)
      let errorMessage = `Failed to save (HTTP ${response.status})`
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorData.message || errorData.details || errorMessage
      } catch (parseError) {
        // If JSON parsing fails, use status text
        errorMessage = response.statusText || errorMessage
      }
      
      // Show error toast and throw (but don't let it propagate to outer catch)
      toast({
        title: "Failed to save",
        description: errorMessage,
        variant: "destructive",
      })
      // Don't throw - we've already shown the error toast
      return
    } catch (error) {
      // Only catch network errors or unexpected errors
      console.error("[v0] Error saving to guide:", error)
      const errorMessage = error instanceof Error ? error.message : "Could not save prompt to guide. Please try again."
      toast({
        title: "Failed to save",
        description: errorMessage,
        variant: "destructive",
      })
      // Don't re-throw - we've handled the error
    }
  }, [isAdmin, selectedGuideId, selectedGuideCategory, toast])

  const handleModeSwitch = async (newMode: boolean) => {
    // Only create new chat if mode is actually changing
    if (proMode === newMode) {
      console.log("[v0] Mode switch skipped - already in", newMode ? "Pro" : "Classic", "mode")
      return
    }

    // When switching to My Model (classic) and user has no trained model, show training CTA instead of switching
    if (!newMode && !hasTrainedModel) {
      setMayaTabAndHash("training")
      toast({
        title: "Train My Model",
        description: "Train your model once to use My Model for consistent results. Selfie mode is ready whenever you need it.",
      })
      return
    }

    console.log("[v0] 🔄 Switching mode:", {
      from: proMode ? "Pro" : "Classic",
      to: newMode ? "Pro" : "Classic",
      forcedMode: forcedProMode
    })

    try {
      // 🔴 FIX: Create new chat with correct chatType based on mode
      const chatType = newMode ? 'pro' : 'maya'
      console.log("[v0] Creating new chat with type:", chatType)
      
      const response = await fetch("/api/maya/new-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatType }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] ❌ Failed to create new chat:", response.status, errorText)
        throw new Error(`Failed to create new chat: ${response.status}`)
      }

      const data = await response.json()
      console.log("[v0] ✅ New chat created:", data.chatId)
      
      // Switch mode first (this will be saved to localStorage by the hook)
      console.log("[v0] Setting mode to:", newMode ? "Pro" : "Classic")
      setProMode(newMode)
      if (newMode && !localStorage.getItem("sselfie_pro_tooltip_seen")) {
        setShowProTooltip(true)
      }
      
      // Then reset chat state
      setChatId(data.chatId)
      setChatTitle("New Chat")
      setMessages([])
      savedMessageIds.current.clear()
      setUploadedImages([]) // Clear Pro mode images
      setPromptSuggestions([]) // Clear prompt suggestions
      promptGenerationTriggeredRef.current.clear() // Clear prompt generation tracking
      setPendingConceptRequest(null) // 🔴 CRITICAL: Clear any pending concept requests to prevent using old mode
      setIsGeneratingConcepts(false) // Also clear generation state

      localStorage.setItem("mayaCurrentChatId", data.chatId.toString())

      console.log("[v0] ✅ Mode switched successfully:", {
        mode: newMode ? "Pro" : "Classic",
        chatId: data.chatId
      })
    } catch (error) {
      console.error("[v0] ❌ Error switching mode:", error)
      toast({
        title: "Failed to switch mode",
        description: error instanceof Error ? error.message : "An error occurred while switching modes. Please try again.",
        variant: "destructive",
      })
    }
  }

  const dismissProTooltip = () => {
    localStorage.setItem("sselfie_pro_tooltip_seen", "true")
    setShowProTooltip(false)
  }

  // Wrapper for handleSelectChat that adds component-specific logic
  const handleSelectChat = useCallback(async (selectedChatId: number, selectedChatTitle?: string) => {
      promptGenerationTriggeredRef.current.clear() // Clear prompt generation tracking
    setShowHistory(false) // Close history panel
    await baseHandleSelectChat(selectedChatId, selectedChatTitle)
  }, [baseHandleSelectChat])

  // Wrapper for handleDeleteChat (hook handles the logic, but we expose it)
  const handleDeleteChat = baseHandleDeleteChat

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        router.push("/auth/login")
      } else {
        console.error("[v0] Logout failed")
        setIsLoggingOut(false)
      }
    } catch (error) {
      console.error("[v0] Error during logout:", error)
      setIsLoggingOut(false)
    }
  }

  const handleNavigation = (tab: string) => {
    // Update parent's activeTab state if provided
    if (setActiveTab) {
      setActiveTab(tab)
    }
    // Update URL without triggering a page reload (matches sselfie-app.tsx pattern)
    window.history.pushState(null, "", `#${tab}`)
    closeNavMenu()
  }

  const closeTrainingTab = () => {
    const tab = "photos"
    setActiveMayaTab(tab)
    if (typeof window !== "undefined") {
      localStorage.setItem("mayaActiveTab", tab)
      window.history.replaceState(null, "", "#maya")
    }
  }

  useEffect(() => {
    let mounted = true
    const fetchAcademyJourneyState = async () => {
      if (activeMayaTab !== "photos") return
      setIsLoadingAcademyJourneyState(true)
      try {
        const res = await fetch("/api/onboarding/academy-journey-state", {
          credentials: "include",
          cache: "no-store",
        })
        if (!res.ok) return
        const data = await res.json()
        if (!mounted) return

        if (data?.showAfterFirstGenerationPrompt) {
          setAcademyJourneyPrompt("first_gen")
          return
        }
        if (data?.showAfterThreeGenerationsPrompt) {
          setAcademyJourneyPrompt("three_gen")
          return
        }
        setAcademyJourneyPrompt(null)
      } catch {
        // Non-blocking: academy prompt should never break chat.
      } finally {
        if (mounted) {
          setIsLoadingAcademyJourneyState(false)
        }
      }
    }

    fetchAcademyJourneyState()
    return () => {
      mounted = false
    }
  }, [activeMayaTab, messages.length])

  const handleOpenAcademyFromMaya = () => {
    trackAnalyticsEvent({
      event: "academy_opens_from_maya",
      properties: {
        prompt_type: academyJourneyPrompt,
      },
    })
    if (setActiveTab) {
      setActiveTab("academy")
    }
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "#academy")
    }
  }


  const filteredMessages = messages.filter((msg) => {
    if (contentFilter === "all") return true

    if (contentFilter === "photos") {
      // Show messages with concept cards (photos)
      return msg.parts?.some((inv: any) => inv.type === "tool-generateConcepts" && inv.output?.state === "ready")
    }

    if (contentFilter === "videos") {
      // Show messages with video cards
      return msg.parts?.some((inv: any) => inv.type === "tool-generateVideo")
    }

    return true
  })

  // Helper function to parse prompt suggestions from Maya's messages
  const parsePromptSuggestions = (text: string): Array<{ label: string; prompt: string; description?: string }> => {
    if (!text || !proMode) return []
    
    const suggestions: Array<{ label: string; prompt: string; description?: string }> = []
    
    // Pattern 1: Carousel slides with complete template structure
    // Look for "Slide X - Label:" followed by the full template structure
    const slideMatches = text.matchAll(/(?:\*\*)?Slide\s+(\d+)\s*(?:of\s+(\d+))?\s*[-–]\s*([^:\n]+):/gi)
    const slideArray = Array.from(slideMatches)
    
    if (slideArray.length > 0) {
      slideArray.forEach((slideMatch, idx) => {
        const slideNum = slideMatch[1]
        const totalSlides = slideMatch[2] || ''
        const label = slideMatch[3]?.trim() || `Slide ${slideNum}`
        const matchIndex = slideMatch.index || 0
        
        // Find the start of the prompt (after the colon)
        const afterColon = text.substring(matchIndex + slideMatch[0].length)
        
        // Find the end of this slide's content (next slide header or end)
        const nextSlideMatch = slideArray[idx + 1]
        const endIndex = nextSlideMatch ? (nextSlideMatch.index || text.length) : text.length
        
        // Extract the complete prompt structure
        let prompt = text.substring(matchIndex + slideMatch[0].length, endIndex).trim()
        
        // Remove any trailing instructions or navigation text
        prompt = prompt
          .replace(/\n\n(Copy|Then|This is going|Once you|Here are all|Copy slide|Perfect! For carousels).*$/is, '') // Remove instructions
          .replace(/^[\s\n]+|[\s\n]+$/g, '') // Trim whitespace
          .trim()
        
        // Only include if it's a substantial prompt with the complete template structure
        // The complete template should have multiple sections (Character Consistency, Subject, Action, etc.)
        // Check for key indicators of complete template structure (NO ** markdown in prompts)
        const hasTemplateStructure = 
          (prompt.includes('EXACTLY identical') || prompt.includes('facial features EXACTLY')) &&
          (prompt.includes('Composition:') || prompt.includes('Composition')) &&
          (prompt.includes('Style:') || prompt.includes('Style')) &&
          (prompt.includes('Lighting:') || prompt.includes('Lighting')) &&
          (prompt.includes('Color Palette:') || prompt.includes('Color Palette')) &&
          (prompt.includes('Technical Details:') || prompt.includes('Technical Details')) &&
          (prompt.includes('Final Use:') || prompt.includes('Final Use')) &&
          prompt.length > 500 // Must be long enough to be a complete prompt (increased threshold)
        
        if (prompt && hasTemplateStructure) {
          suggestions.push({ 
            label: `Slide ${slideNum}${totalSlides ? ` of ${totalSlides}` : ''} - ${label}`,
            prompt: prompt,
            description: label
          })
        }
      })
    }
    
    // Pattern 2: Carousel slides in quotes or code blocks (simpler format)
    const carouselSlidePatternQuoted = /(?:\*\*)?Slide\s+(\d+)\s+(?:of\s+(\d+))?\s*[-–]\s*([^:]+):[\s\n]*(?:"([^"]{100,})"|`([^`]{100,})`)/gi
    let match
    while ((match = carouselSlidePatternQuoted.exec(text)) !== null) {
      const slideNum = match[1]
      const totalSlides = match[2] || ''
      const label = match[3]?.trim() || `Slide ${slideNum}`
      const prompt = match[4] || match[5] || ''
      
      // Check if we already have this slide
      const existingIndex = suggestions.findIndex(s => s.label.includes(`Slide ${slideNum}`))
      if (existingIndex === -1 && prompt && prompt.trim().length > 100) {
        suggestions.push({ 
          label: `Slide ${slideNum}${totalSlides ? ` of ${totalSlides}` : ''} - ${label}`,
          prompt: prompt.trim(),
          description: label
        })
      }
    }
    
    // Pattern 2: "Option 1 - Label:" followed by prompt in quotes or code block or plain text
    const optionPattern = /(?:\*\*)?Option\s+(\d+)[\s-]+([^:]+):[\s\n]*(?:"([^"]+)"|`([^`]+)`|```[\s\S]*?```|([^"`\n]+(?:\n[^"`\n]+)*?)(?=\n\n|\nOption|\n\*\*Option|$))/gi
    while ((match = optionPattern.exec(text)) !== null) {
      const optionNum = match[1]
      const label = match[2]?.trim() || `Option ${optionNum}`
      const prompt = match[3] || match[4] || match[5] || ''
      if (prompt && prompt.trim().length > 20) {
        suggestions.push({ label, prompt: prompt.trim() })
      }
    }
    
    // Pattern 3: Prompts in quotes after "Here are" or "Here's" (only if no slides/options found)
    if (suggestions.length === 0 && (text.includes('Here are') || text.includes("Here's") || text.includes('prompt'))) {
      const quotedPrompts = text.match(/"([^"]{20,})"/g)
      if (quotedPrompts && quotedPrompts.length > 0) {
        quotedPrompts.forEach((quoted, idx) => {
          const prompt = quoted.replace(/^"|"$/g, '')
          if (prompt.length > 20) {
            suggestions.push({
              label: `Prompt ${idx + 1}`,
              prompt: prompt.trim()
            })
          }
        })
      }
    }
    
    // Pattern 4: Code blocks with prompts (only if no other patterns found)
    if (suggestions.length === 0) {
      const codeBlockPattern = /```[\s\S]*?```/g
      const codeBlocks = text.match(codeBlockPattern)
      if (codeBlocks) {
        codeBlocks.forEach((block, idx) => {
          const prompt = block.replace(/```/g, '').trim()
          if (prompt.length > 20 && !prompt.includes('STUDIO_PRO_MODE')) {
            suggestions.push({
              label: `Prompt ${idx + 1}`,
              prompt: prompt.trim()
            })
          }
        })
      }
    }
    
    return suggestions
  }
  
  // Helper function to remove prompts from text when they appear in cards
  const removePromptsFromText = (text: string, suggestions: Array<{ prompt: string }>): string => {
    if (suggestions.length === 0) return text
    
    let cleanedText = text
    
    // Remove each prompt from the text
    suggestions.forEach((suggestion) => {
      const prompt = suggestion.prompt
      // Escape special regex characters in prompt
      const escapedPrompt = prompt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      
      // Remove the prompt if it appears in quotes (with or without quotes)
      cleanedText = cleanedText.replace(new RegExp(`"${escapedPrompt}"`, 'g'), '')
      cleanedText = cleanedText.replace(new RegExp(`'${escapedPrompt}'`, 'g'), '')
      
      // Remove the prompt if it appears in code blocks
      cleanedText = cleanedText.replace(new RegExp(`\`\`\`[\\s\\S]*?${escapedPrompt}[\\s\\S]*?\`\`\``, 'g'), '')
      cleanedText = cleanedText.replace(new RegExp(`\`${escapedPrompt}\``, 'g'), '')
      
      // Remove lines that contain the full prompt (but keep label lines)
      const lines = cleanedText.split('\n')
      cleanedText = lines.filter(line => {
        const trimmedLine = line.trim()
        // Keep label lines (Slide, Option, Prompt headers)
        if (trimmedLine.match(/^(Slide|Option|Prompt|\*\*Slide|\*\*Option)/i)) {
          return true
        }
        // Keep lines that are just labels or descriptions
        if (trimmedLine.match(/^[-*]\s+/) || trimmedLine.length < 50) {
          return true
        }
        // Remove if line contains a significant portion of the prompt
        const lineLower = trimmedLine.toLowerCase()
        const promptLower = prompt.toLowerCase()
        // Check if line contains more than 30 chars of the prompt
        if (promptLower.length > 30) {
          return !lineLower.includes(promptLower.substring(0, 30))
        }
        return !lineLower.includes(promptLower)
      }).join('\n')
    })
    
    // Clean up extra blank lines
    cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n').trim()
    
    return cleanedText
  }
  
  // Helper function to remove carousel slide prompts from text when they appear in cards
  const removeCarouselSlidesFromText = (text: string, suggestions: Array<{ label: string; prompt: string }>): string => {
    if (suggestions.length === 0) return text
    
    let cleanedText = text
    
    // Sort slides by number to process in order
    const sortedSlides = [...suggestions]
      .filter(s => s.label.includes('Slide'))
      .sort((a, b) => {
        const numA = parseInt(a.label.match(/Slide\s+(\d+)/)?.[1] || '0')
        const numB = parseInt(b.label.match(/Slide\s+(\d+)/)?.[1] || '0')
        return numA - numB
      })
    
    // Remove each slide from the text
    sortedSlides.forEach((suggestion) => {
      const slideNumMatch = suggestion.label.match(/Slide\s+(\d+)/)
      if (!slideNumMatch) return
      
      const slideNum = slideNumMatch[1]
      
      // Pattern to match: "Slide X - Label:" followed by all content until next slide or end
      // This should match the complete template structure
      const slidePattern = new RegExp(
        `Slide\\s+${slideNum}\\s*(?:of\\s+\\d+)?\\s*[-–]\\s*[^:]+:.*?(?=\\n\\nSlide\\s+\\d+|\\n\\*\\*Slide\\s+\\d+|$)`,
        'gis'
      )
      
      cleanedText = cleanedText.replace(slidePattern, '')
    })
    
    // Clean up extra blank lines and trailing text
    cleanedText = cleanedText
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\n\n(Copy|Then|This is going|Once you|Here are all).*$/is, '')
      .trim()
    
    return cleanedText
  }

  // Helper function to remove emojis from text
  const removeEmojis = (text: string): string => {
    if (!text) return text
    // Comprehensive emoji removal regex (covers all Unicode emoji ranges)
    // This includes: Emoticons, Miscellaneous Symbols, Dingbats, Supplemental Symbols, Symbols and Pictographs, etc.
    return text
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Miscellaneous Symbols and Pictographs
      .replace(/[\u{2600}-\u{26FF}]/gu, '') // Miscellaneous Symbols
      .replace(/[\u{2700}-\u{27BF}]/gu, '') // Dingbats
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
      .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess Symbols
      .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
      .replace(/[\u{200D}]/gu, '') // Zero Width Joiner
      .replace(/[\u{FE0F}]/gu, '') // Variation Selector-16
      .replace(/\s+/g, ' ') // Clean up multiple spaces
      .trim()
  }

  // Helper function to parse and render markdown-style text
  const renderMarkdownText = (text: string): React.ReactNode => {
    // Keep emojis - Maya's responses should include emojis
    let cleanedText = text
    
    // Split by lines to handle lists and paragraphs
    const lines = cleanedText.split('\n')
    const elements: React.ReactNode[] = []
    let currentList: React.ReactNode[][] = []
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim()
      
      // Handle list items (lines starting with - or *)
      if (trimmedLine.match(/^[-*]\s+/)) {
        const listItem = trimmedLine.replace(/^[-*]\s+/, '')
        // Parse bold text in list items (handle **text** patterns anywhere in the string)
        const processedItem: React.ReactNode[] = []
        const parts = listItem.split(/(\*\*[^*]+\*\*)/g)
        
        parts.forEach((part, partIdx) => {
          if (part.match(/^\*\*[^*]+\*\*$/)) {
            // This is a bold pattern
            const boldText = part.replace(/\*\*/g, '')
            processedItem.push(
              <strong key={`bold-${partIdx}`} className="font-semibold text-[#f0ede8]">
                {boldText}
              </strong>
            )
          } else if (part) {
            // Regular text
            processedItem.push(<span key={`text-${partIdx}`}>{part}</span>)
          }
        })
        
        if (processedItem.length === 0) {
          processedItem.push(<span key="text-0">{listItem}</span>)
        }
        currentList.push(processedItem)
      } else {
        // Flush current list if exists
        if (currentList.length > 0) {
          elements.push(
            <ul key={`list-${index}`} className="list-disc list-inside space-y-1.5 my-2 ml-4">
              {currentList.map((item, itemIdx) => (
                <li key={itemIdx} className="text-sm leading-relaxed text-[#a8a49c]">
                  {item}
                </li>
              ))}
            </ul>
          )
          currentList = []
        }
        
        // Handle regular paragraphs with bold text (handle **text** patterns anywhere in the string)
        if (trimmedLine) {
          const parts = trimmedLine.split(/(\*\*[^*]+\*\*)/g)
          const processedLine: React.ReactNode[] = []
          
          parts.forEach((part, partIdx) => {
            if (part.match(/^\*\*[^*]+\*\*$/)) {
              // This is a bold pattern
              const boldText = part.replace(/\*\*/g, '')
              processedLine.push(
                <strong key={`bold-${partIdx}`} className="font-semibold text-[#f0ede8]">
                  {boldText}
                </strong>
              )
            } else if (part) {
              // Regular text
              processedLine.push(<span key={`text-${partIdx}`}>{part}</span>)
            }
          })
          
          if (processedLine.length === 0) {
            processedLine.push(<span key="text-0">{trimmedLine}</span>)
          }
          
          // Only add paragraph if it's not empty after processing
          if (trimmedLine.length > 0) {
            elements.push(
              <p key={`para-${index}`} className="text-sm leading-relaxed text-[#a8a49c] mb-2 last:mb-0">
                {processedLine}
              </p>
            )
          }
        } else if (index < lines.length - 1) {
          // Empty line - add spacing
          elements.push(<div key={`spacer-${index}`} className="h-2" />)
        }
      }
    })
    
    // Flush any remaining list
    if (currentList.length > 0) {
      elements.push(
        <ul key="list-final" className="list-disc list-inside space-y-1.5 my-2 ml-4">
          {currentList.map((item, itemIdx) => (
            <li key={itemIdx} className="text-sm leading-relaxed text-[#a8a49c]">
              {item}
            </li>
          ))}
        </ul>
      )
    }
    
    return elements.length > 0 ? <div className="space-y-1">{elements}</div> : null
  }

  const renderMessageContent = (text: string, isUser: boolean) => {
    // Remove GENERATE_PROMPTS trigger from display
    let cleanedText = text.replace(/\[GENERATE_PROMPTS[:\s]+[^\]]+\]/gi, "").trim()
    // Also remove GENERATE_CONCEPTS trigger
    cleanedText = cleanedText.replace(/\[GENERATE_CONCEPTS\]\s*[^\n]*/gi, "").trim()
    cleanedText = cleanedText.replace(/\[GENERATE_VIDEO(?:\s*:\s*[^\]]+)?\]/gi, "").trim()
    cleanedText = cleanedText.replace(/\[VIDEO_CARD:[^\]]+\]/gi, "").trim()
    cleanedText = cleanedText.replace(/\[COLLECT_OFFER_BRIEF(?:\s*:\s*[^\]]+)?\]/gi, "").trim()
    cleanedText = cleanedText.replace(/\[SUBMIT_OFFER_BRIEF:\s*[^\]]+\]/gi, "").trim()

    // Check if message contains an inspiration image
    const inspirationImageMatch = cleanedText.match(/\[Inspiration Image: (https?:\/\/[^\]]+)\]/)

    if (inspirationImageMatch) {
      const imageUrl = inspirationImageMatch[1]
      const textWithoutImage = cleanedText.replace(/\[Inspiration Image: https?:\/\/[^\]]+\]/g, "").trim()

      return (
        <div className="space-y-3">
          {textWithoutImage && (
            <div className="text-sm leading-relaxed">
              {renderMarkdownText(textWithoutImage)}
            </div>
          )}
          <div className="mt-2">
            <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-[rgba(195,190,182,0.25)] shadow-lg">
              <img src={imageUrl || "/placeholder.svg"} alt="Inspiration" className="w-full h-full object-cover" />
            </div>
            <p className="text-xs text-stone-500 mt-1.5 tracking-wide">Inspiration Image</p>
          </div>
        </div>
      )
    }

    if (!cleanedText) return null

    // For user messages, keep simple styling
    if (isUser) {
      return <p className="text-sm leading-relaxed font-medium whitespace-pre-wrap">{removeEmojis(cleanedText)}</p>
    }

    // For Maya's messages (assistant), render with markdown support
    return (
      <div className="text-sm leading-relaxed text-[#a8a49c]">
        {renderMarkdownText(cleanedText)}
      </div>
    )
  }

  // CRITICAL FIX: Don't return early on loading - show loading indicator but still render UI
  // This prevents blank screen if loading gets stuck
  // Instead, show loading indicator within the UI structure

  // CRITICAL FIX: isEmpty should only be true if:
  // 1. Not currently loading AND
  // 2. No messages (new chat = no messages) AND
  // 3. Chat has been loaded (prevents showing during initial load)
  // NOTE: Welcome screen should show for NEW chats regardless of:
  // - Whether user has used Maya before (hasUsedMayaBefore)
  // - Whether chatId exists (new chats get chatId immediately but have no messages)
  // The key indicator of a "new chat" is: no messages
  const stripChatControlText = (text: string): string =>
    stripFeedStrategyArtifacts(
      text
      .replace(/\[GENERATE_PROMPTS[:\s]+[^\]]+\]/gi, "")
      .replace(/\[GENERATE_CONCEPTS\]\s*[^\n]*/gi, "")
      .replace(/\[SHOW_CAPABILITIES\]/gi, "")
      .replace(/\[SHOW_STUDIO_HUB\]/gi, "")
      .replace(/\[SHOW_GALLERY\]/gi, "")
      .replace(/\[SAVE_TO_GALLERY(?:\s*:\s*[^\]]+)?\]/gi, "")
      .replace(/\[GENERATE_IMAGE(?:\s*:\s*[^\]]+)?\]/gi, "")
      .replace(/\[GENERATE_VIDEO(?:\s*:\s*[^\]]+)?\]/gi, "")
      .replace(/\[VIDEO_CARD:[^\]]+\]/gi, "")
      .replace(/\[SHOW_UPLOAD_ZONE(?:\s*:\s*[^\]]+)?\]/gi, "")
      .replace(/\[SWITCH_MAYA_TAB(?:\s*:\s*[^\]]+)?\]/gi, "")
      .replace(/\[COLLECT_OFFER_BRIEF(?:\s*:\s*[^\]]+)?\]/gi, "")
      .replace(/\[SUBMIT_OFFER_BRIEF:\s*[^\]]+\]/gi, "")
      .replace(/\[EDIT_ASSET(?:\s*:\s*[^\]]+)?\]/gi, "")
      .replace(/\[CREATE_ASSET(?:\s*:\s*[^\]]+)?\]/gi, "")
      .replace(/\[STRUCTURED_ASSET_BLOCKED(?:\s*:\s*[^\]]+)?\]/gi, "")
      .replace(/\[GENERATE_CAPTIONS\]\s*[^\n]*/gi, "")
      .replace(/\[GENERATE_STRATEGY\]/gi, "")
      .replace(/\[Inspiration Image: https?:\/\/[^\]]+\]/g, "")
      .replace(/\s{2,}/g, " ")
      .trim(),
    )

  const hasVisibleMessages = useMemo(() => {
    return (messages || []).some((message: any) => {
      if (!message) return false

      if (message.parts && Array.isArray(message.parts)) {
        const hasVisiblePart = message.parts.some((part: any) => {
          if (!part || !part.type) return false
          if (part.type === "image") return true
          if (
            part.type === "tool-generateConcepts" ||
            part.type === "tool-showCapabilities" ||
            part.type === "tool-showStudioHub" ||
            part.type === "tool-showGallery" ||
            part.type === "tool-saveToGallery" ||
            part.type === "tool-generateImage" ||
            part.type === "tool-showUploadZone" ||
            part.type === "tool-switchMayaTab" ||
            (part.type === "tool-collectOfferBrief" &&
              (isLandingPagesUiEnabled || (part as any)?.output?.assetType !== "page")) ||
            (part.type === "tool-editAsset" &&
              (isLandingPagesUiEnabled || (part as any)?.output?.assetType !== "page")) ||
            (part.type === "tool-createAssetPreview" &&
              (isLandingPagesUiEnabled || (part as any)?.output?.assetType !== "page")) ||
            (part.type === "tool-structuredAssetBlocked" &&
              (isLandingPagesUiEnabled || (part as any)?.output?.assetType !== "page")) ||
            part.type === "tool-generateFeed" ||
            part.type === "tool-generateCaptions" ||
            part.type === "tool-generateStrategy" ||
            part.type === "tool-generateVideo"
          ) {
            return true
          }
          return false
        })
        if (hasVisiblePart) return true
      }

      const visibleText = stripChatControlText(getMessageText(message))
      return visibleText.length > 0
    })
  }, [messages, getMessageText, isLandingPagesUiEnabled])

  const isEmpty = 
    !isLoadingChat && // Don't show welcome screen while loading
    !hasVisibleMessages && // No visible messages = new/empty chat
    hasLoadedChatRef.current // Only show empty if we've actually loaded (prevents showing during initial load)

  /**
   * Empty / home surface precedence (mutually exclusive for chat vs home cards):
   * - showReturningMemberHome: Studio members with no visible messages → MembershipHomeCard.
   * - showProEmptyState: Pro-capable user, not returning-home branch, no messages → MayaWelcomePanel (Pro).
   * - showClassicEmptyState: Classic mode empty chat → classic welcome.
   * - showAnyEmptyState: any of the above; when true, the main MayaChatInterface is hidden.
   */
  const showReturningMemberHome =
    isMembership &&
    !firstTimeProductUser &&
    hasLoadedChatRef.current &&
    !isLoadingChat &&
    !isTyping &&
    !hasVisibleMessages

  const showProEmptyState = !showReturningMemberHome && !isLoadingChat && !hasVisibleMessages && hasProFeatures && !isTyping
  const showClassicEmptyState = !showReturningMemberHome && isEmpty && !proMode && !isTyping
  const showAnyEmptyState = showReturningMemberHome || showProEmptyState || showClassicEmptyState
  /** Welcome / home surfaces already include starters — hide duplicate chip row above input */
  const showInputBarQuickPrompts =
    shouldShowInputPrompts && !(activeMayaTab === "photos" && showAnyEmptyState)
  const photoTabBottomSpacing = "calc(var(--input-bar-height, 168px) + max(16px, env(safe-area-inset-bottom, 0px)))"
  const generatedPhotoCountInChat = useMemo(() => {
    return (messages || []).reduce((count: number, message: any) => {
      if (message?.role !== "assistant") return count
      if (!Array.isArray(message?.parts)) return count
      const hasImage = message.parts.some(
        (part: any) => part?.type === "image" && typeof part?.image === "string",
      )
      return count + (hasImage ? 1 : 0)
    }, 0)
  }, [messages])
  const hasGeneratedPhotoInChat = generatedPhotoCountInChat > 0
  const showCalendarSuggestion =
    generatedPhotoCountInChat >= 2 && !calendarSuggestionDismissed && activeMayaTab === "photos"
  const hasPhotoMomentum =
    hasGeneratedPhotoInChat || (libraryTotalImages ?? 0) > 0 || (sharedImages?.length ?? 0) > 0

  const returningMemberLastSessionTitle =
    typeof chatTitle === "string" && chatTitle.trim().length > 0 && !/^new chat$/i.test(chatTitle.trim())
      ? chatTitle
      : null
  const latestMonthlyDropName = useMemo(() => {
    const drops = monthlyDropsData?.monthlyDrops
    if (!Array.isArray(drops)) return null

    for (const drop of drops) {
      const title = typeof drop?.title === "string" ? drop.title.trim() : ""
      if (title.length > 0) {
        return title
      }
    }

    return null
  }, [monthlyDropsData?.monthlyDrops])

  const hasWhatToSayAccess = ownedMiniProductIds.has("what_to_say")
  const hasShowUpAccess = ownedMiniProductIds.has("show_up")
  const hasAiPhotoPromptsAccess = ownedMiniProductIds.has("ai_photo_prompts")

  const assistantTextCorpus = useMemo(() => {
    return (messages || [])
      .filter((message: any) => message?.role === "assistant")
      .map((message: any) => getMessageText(message).toLowerCase())
      .filter((text: string) => text.length > 0)
  }, [messages, getMessageText])

  const hasBrandStrategyOutput = assistantTextCorpus.some((text) => {
    return (
      text.includes("brand strategy") ||
      text.includes("content pillars") ||
      text.includes("positioning") ||
      text.includes("caption starters")
    )
  })

  const hasFeedPlannerSignal = assistantTextCorpus.some((text) => {
    return (
      text.includes("feed planner") ||
      text.includes("9-post") ||
      text.includes("9 post") ||
      text.includes("plan your feed") ||
      text.includes("posting plan")
    )
  })

  const showWhatToSayUpsellCard =
    activeMayaTab === "photos" &&
    !isMembership &&
    !hasWhatToSayAccess &&
    hasBrandStrategyOutput &&
    !dismissedUpsells.has("what_to_say")
  const showShowUpUpsellCard =
    activeMayaTab === "photos" &&
    !isMembership &&
    !hasShowUpAccess &&
    hasFeedPlannerSignal &&
    !dismissedUpsells.has("show_up")
  const showWelcomeFirstGenerationFlow =
    activeMayaTab === "photos" &&
    !isMembership &&
    !showReturningMemberHome &&
    !isLoadingChat &&
    !isTyping &&
    hasLoadedChatRef.current &&
    !hasVisibleMessages &&
    welcomeFirstGenerationState?.eligible === true &&
    !welcomeFlowDismissed

  // NOTE: Workbench should always be available in Pro mode for manual creation
  // Therefore, we always show the chat UI when in Pro mode, which includes the workbench
  // The old ProModeWrapper (form-based interface) has been removed in favor of the workbench-based chat UI

  return (
    <>
    <div
      className="flex flex-col h-full relative overflow-x-hidden"
      style={{
        background:
          "var(--app-bg-primary), radial-gradient(80% 55% at 20% 0%, var(--app-bg-glow-1) 0%, transparent 70%), radial-gradient(90% 60% at 80% 10%, var(--app-bg-glow-2) 0%, transparent 72%), linear-gradient(180deg, rgba(18,14,11,0.82) 0%, rgba(14,11,9,0.9) 52%, rgba(10,8,7,0.94) 100%)",
        // No paddingBottom here — the messages container handles its own input-bar
        // clearance. Adding it here was creating a stacked empty gap on mobile.
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-[rgba(13,12,11,0.80)] backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-[rgba(28,27,25,0.96)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.20)] rounded-3xl p-12 text-center max-w-md mx-4">
            <h3 className="text-xl font-serif font-extralight tracking-[0.2em] uppercase text-[#f0ede8] mb-2">
              Drop Image Here
            </h3>
            <p className="text-sm text-[#8a8780] tracking-wide">Upload a reference image for Maya to work with</p>
          </div>
        </div>
      )}

      {/* Fixed Header with Integrated Tabs - Always visible */}
      {/* Mobile optimized: safe area insets, responsive padding */}
      {/* Use a real Tailwind arbitrary z-index so the fixed header stays above cards and drawers. */}
      <div
        ref={headerRef}
        className="fixed left-0 right-0 z-[100] border-b border-[rgba(195,190,182,0.15)] bg-[rgba(175,170,162,0.08)] backdrop-blur-[50px]"
        style={{
          top: "var(--studio-app-header-height, 72px)",
        }}
      >
        <MayaHeader
          proMode={proMode}
          chatTitle={chatTitle}
          showNavMenu={showNavMenu}
          onToggleNavMenu={toggleNavMenu}
          hideMenuButton={shellControlsMayaNav}
          libraryCount={libraryTotalImages}
          credits={creditBalance}
          onManageLibrary={undefined}
          onAddImages={undefined}
          isAdmin={isAdmin}
          selectedGuideId={selectedGuideId}
          selectedGuideCategory={selectedGuideCategory}
          onGuideChange={onGuideChange}
          userId={userId}
          showModeToggle={activeMayaTab === "photos"}
          onEditIntent={undefined}
          onNavigation={handleNavigation}
          onNewProject={handleNewChat}
          onHistory={() => {
            if (hasProFeatures) {
              setShowProModeHistory(true)
              return
            }
            setShowHistory(true)
          }}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
          onOpenCredits={() => setShowBuyCreditsModal(true)}
          onSwitchToClassic={() => handleModeSwitch(false)}
          onSettings={() => setShowSettings(true)}
          activeTab={activeMayaTab}
          onTabChange={(tab) => {
            setActiveMayaTab(tab)
            // Persist to localStorage
            if (typeof window !== "undefined") {
              localStorage.setItem("mayaActiveTab", tab)
              // Update URL hash
              const hashMap: Record<string, string> = {
                photos: "#maya",
                videos: "#maya/videos",
                prompts: "#maya/prompts",
                training: "#maya/training",
                feed: "#maya/feed",
              }
              window.history.replaceState(null, "", hashMap[tab] || "#maya")
            }
          }}
          photosCount={undefined} // Can be added later if needed
          videosCount={undefined} // Can be added later if needed
          disableFeedTab={true}
        />
      </div>

      {proMode && showProTooltip && (
        <div
          className="fixed left-0 right-0 z-[95] border-b border-[rgba(195,190,182,0.16)] bg-[rgba(245,245,245,0.96)] px-4 py-3 backdrop-blur-sm"
          style={{
            top: "calc(var(--studio-app-header-height, 72px) + var(--maya-header-height, 88px))",
          }}
        >
          <div className="mx-auto flex max-w-5xl items-start justify-between gap-3">
            <p className="text-sm font-light leading-snug text-[#333333]">
              Pro Mode uses your reference photos instead of your trained model. Perfect for product shots,
              lifestyle content, and trying new looks.
            </p>
            <button
              type="button"
              onClick={dismissProTooltip}
              className="shrink-0 text-lg leading-none text-[#777777]"
              aria-label="Dismiss Pro Mode tip"
            >
              x
            </button>
          </div>
        </div>
      )}

      {activeMayaTab === "photos" && (
        <div
          className="shrink-0"
          style={{ marginTop: MAYA_SURFACE_TOP_OFFSET }}
        >
          <MayaPhotosSetupDisclosure
            isMembership={isMembership}
            creditBalance={creditBalance}
            isMessageListEmpty={!messages || messages.length === 0}
            showZeroCreditsNudge={!isMembership && creditBalance === 0 && !dismissedUpsells.has("zero_credits")}
            onDismissZeroCredits={() => dismissUpsellCard("zero_credits")}
            hasTrainedModel={hasTrainedModel}
            onGoToTraining={() => setMayaTabAndHash("training")}
            onOpenStudioCheckout={handleOpenStudioCheckout}
            onOpenBuyCredits={() => setShowBuyCreditsModal(true)}
          />
        </div>
      )}

      {/* Old Simplified Pro Mode Guidance removed - now using ImageUploadFlow component */}

      {/* Old Pro Mode Controls removed - now using ImageUploadFlow component */}

      {/* Gallery Selector Modal */}
      {showGallerySelector && (
        <div className="fixed inset-0 z-50 bg-[rgba(13,12,11,0.80)] backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[rgba(28,27,25,0.96)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.20)] rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[rgba(195,190,182,0.15)] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-[#f0ede8]">Select Base Images from Gallery</h3>
                <p className="text-xs text-[#8a8780] mt-1">
                  {uploadedImages.length} / 14 images selected • Click images to add
                </p>
              </div>
              <button
                onClick={() => setShowGallerySelector(false)}
                className="px-2 py-1.5 hover:bg-[rgba(175,170,162,0.12)] rounded-lg transition-colors"
              >
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#8a8780]">Close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {galleryImages.map((image) => (
                  <button
                    key={image.id}
                    onClick={() => {
                      // Check if we've reached the limit
                      if (uploadedImages.length >= 14) {
                        alert('Maximum 14 images allowed. Please remove some images first.')
                        return
                      }
                      
                      // Check if this image is already selected
                      const alreadySelected = uploadedImages.some(img => img.url === image.image_url)
                      if (alreadySelected) {
                        alert('This image is already selected')
                        return
                      }
                      
                      // Add new base image (don't remove existing ones)
                      setUploadedImages(prev => [
                        ...prev,
                        {
                          url: image.image_url,
                          type: 'base',
                          source: 'gallery',
                          label: 'Your photo'
                        }
                      ])
                      
                      // Don't close modal if we can add more
                      if (uploadedImages.length + 1 >= 14) {
                        setShowGallerySelector(false)
                      }
                    }}
                    disabled={uploadedImages.length >= 14 || uploadedImages.some(img => img.url === image.image_url)}
                    className="relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-[rgba(195,190,182,0.50)] transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <img
                      src={image.image_url}
                      alt="Gallery image"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-2">
                      <span className="text-[#f0ede8] text-xs font-medium">Select</span>
                    </div>
                  </button>
                ))}
              </div>
              
              {galleryImages.length === 0 && (
                <div className="text-center py-12">
                  <div className="mx-auto mb-3 text-[10px] uppercase tracking-[0.25em] text-[#8a8780]">No Images</div>
                  <p className="text-sm text-[#8a8780]">No images in gallery yet</p>
                  <p className="text-xs text-[#8a8780] mt-1">Generate some photos with Maya first!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Classic Mode: Chat History Modal (consistent with Pro Mode) */}
      {!hasProFeatures && (
        <MayaChatHistory
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          currentChatId={chatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          chatType={currentChatType}
        />
      )}

        <MayaSettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        styleStrength={styleStrength}
        promptAccuracy={promptAccuracy}
        aspectRatio={aspectRatio}
        realismStrength={realismStrength}
        enhancedAuthenticity={enhancedAuthenticity}
        onStyleStrengthChange={setStyleStrength}
        onPromptAccuracyChange={setPromptAccuracy}
        onAspectRatioChange={setAspectRatio}
        onRealismStrengthChange={setRealismStrength}
        onEnhancedAuthenticityChange={setEnhancedAuthenticity}
        studioProMode={proMode}
      />

      {/* Tab Content - Photos Tab */}
      {/* Add padding-top to account for fixed header + tabs, padding-bottom for fixed input */}
      {activeMayaTab === "photos" && (
        <>
          {/* CRITICAL FIX: Show loading indicator during chat load, but don't block UI */}
          {isLoadingChat && messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center min-h-[400px]">
              <UnifiedLoading message="Loading chat..." variant="section" />
            </div>
          )}
          <div 
            className="flex-1 min-h-0 flex flex-col"
          >
      {!isLoadingAcademyJourneyState && academyJourneyPrompt && (
        <div className="px-4 sm:px-6 py-3">
          <div className="rounded-2xl border border-[rgba(195,190,182,0.20)] bg-[rgba(175,170,162,0.10)] backdrop-blur-[20px] p-4">
            {academyJourneyPrompt === "first_gen" ? (
              <>
                <p className="text-sm text-[#f0ede8]">
                  Want to see exactly how to use this image for your Instagram?
                </p>
                <p className="text-sm text-[#f0ede8] mt-1">
                  I have a quick 2-minute tutorial. Type SHOW ME to see it.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-[#f0ede8]">
                  You&apos;ve created some beautiful images.
                </p>
                <p className="text-sm text-[#f0ede8] mt-1">
                  Want me to show you how to turn these into a full month of content?
                </p>
                <p className="text-sm text-[#f0ede8] mt-1">
                  I have a system that takes 20 minutes.
                </p>
              </>
            )}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleOpenAcademyFromMaya}
                className="px-3 py-2 text-xs tracking-wide uppercase rounded-lg bg-[rgba(175,170,162,0.18)] text-[#f0ede8] border border-[rgba(195,190,182,0.25)]"
              >
                Show Me
              </button>
              <button
                type="button"
                onClick={() => setAcademyJourneyPrompt(null)}
                className="px-3 py-2 text-xs tracking-wide uppercase rounded-lg border border-[rgba(195,190,182,0.20)] text-[#8a8780]"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

      {showWhatToSayUpsellCard && (
        <div className="px-4 sm:px-6 py-3">
          <MayaUpsellCard
            eyebrow="Want This With Captions?"
            description="What To Say includes 30 caption templates matched to your brand pillars."
            onUpgrade={() => void handleOpenStudioCheckout("maya_what_to_say_upsell")}
            onDismiss={() => dismissUpsellCard("what_to_say")}
          />
        </div>
      )}

      {showShowUpUpsellCard && (
        <div className="px-4 sm:px-6 py-3">
          <MayaUpsellCard
            eyebrow="Want a 7-day posting plan?"
            description="Show Up builds your consistency schedule around your content."
            onUpgrade={() => void handleOpenStudioCheckout("maya_show_up_upsell")}
            onDismiss={() => dismissUpsellCard("show_up")}
          />
        </div>
      )}

      {!showAnyEmptyState && (
        <MayaChatInterface
          messages={messages}
          filteredMessages={filteredMessages}
          setMessages={setMessages}
          proMode={proMode}
          isTyping={isTyping}
          isGeneratingConcepts={isGeneratingConcepts}
          isGeneratingPro={isGeneratingPro}
          contentFilter={contentFilter}
          messagesContainerRef={messagesContainerRef as React.RefObject<HTMLDivElement>}
          messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
          showScrollButton={showScrollButton}
          isAtBottomRef={isAtBottomRef}
          scrollToBottom={scrollToBottom}
          onFeedSaved={handleFeedSaved}
          chatId={chatId ?? undefined}
          uploadedImages={uploadedImages}
          setCreditBalance={setCreditBalance}
          onImageGenerated={onImageGenerated}
          isAdmin={isAdmin}
          selectedGuideId={selectedGuideId}
          selectedGuideCategory={selectedGuideCategory}
          onSaveToGuide={handleSaveToGuide}
          userId={userId}
          user={user}
          promptSuggestions={promptSuggestions}
          generationSettings={settings}
          enhancedAuthenticity={enhancedAuthenticity}
          userHasTrainedModel={hasTrainedModel}
          linkedSelfieCount={imageLibrary.selfies.length}
          onToolSelectGenerationSource={handlePhaseTwoGenerationSourceSelect}
          onToolConfirmGenerationSource={handlePhaseTwoGenerationSourceConfirm}
          onToolOpenUploadZone={handlePhaseTwoUploadZone}
          onToolPromptSelect={handleSendMessage}
          onToolSubmitOfferBrief={handleToolSubmitOfferBrief}
          onToolStartVideoGeneration={handleToolStartVideoGeneration}
          activeTab={activeMayaTab}
          onSwitchTab={handleSwitchScopedTab}
        />
      )}
          {showReturningMemberHome && (
            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 animate-in fade-in duration-500">
              <div
                className="flex flex-col items-center justify-start py-6"
                style={{
                  paddingTop: MAYA_SURFACE_TOP_OFFSET,
                  paddingBottom: photoTabBottomSpacing,
                }}
              >
                <MembershipHomeCard
                  creditsReady={creditBalance}
                  lastSessionTitle={returningMemberLastSessionTitle}
                  monthlyDropName={latestMonthlyDropName}
                  onContinue={() => {
                    if (hasProFeatures) {
                      setShowProModeHistory(true)
                      return
                    }
                    setShowHistory(true)
                  }}
                  onGeneratePhoto={() => {
                    handleSendMessage("Plan my content for this week with photo ideas, captions, and the first post I should create.")
                  }}
                  onBrowseStyles={() => {
                    handleSendMessage("Show me fresh photo directions for this week's content.")
                  }}
                  // [STABILIZATION] onCreateCalendar not passed — content calendar feature hidden
                  onUploadAssets={() => {
                    handleSendMessage("I want to upload brand references for this week's content plan.")
                  }}
                  onExploreMonthlyDrop={() => {
                    if (typeof window !== "undefined") {
                      const nextUrl = new URL(window.location.href)
                      nextUrl.searchParams.set("academy_view", "monthly-drops")
                      window.history.replaceState(null, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`)
                    }
                    setActiveTab?.("academy")
                  }}
                />
              </div>
            </div>
          )}
          {/* Empty State - Pro Features: reference upload, Classic: Welcome Screen */}
          {showProEmptyState && (
            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6">
              <div
                className="mx-auto flex w-full max-w-xl flex-col items-center justify-center gap-4 text-center"
                style={{
                  paddingTop: MAYA_SURFACE_TOP_OFFSET,
                  paddingBottom: photoTabBottomSpacing,
                  minHeight: "calc(100vh - var(--maya-header-height, 88px) - var(--input-bar-height, 168px) - 140px)",
                }}
              >
                <div className="flex h-12 w-12 items-center justify-center">
                  <span className="h-7 w-7 border border-[#8a8780]" aria-hidden />
                </div>
                  <p className="max-w-xs text-[16px] font-light leading-relaxed text-[#a8a49c]">
                  Add one selfie or reference photo so Maya can plan content that looks like you.
                </p>
                <button
                  type="button"
                  onClick={() => setShowUploadFlow(true)}
                  className="bg-[#c8c4bb] px-6 py-3 text-sm font-medium uppercase tracking-[0.16em] text-[#0d0c0b]"
                >
                  Add Reference Photos
                </button>
              </div>
            </div>
          )}

          {/* Classic Mode Empty State */}
          {showClassicEmptyState && (
            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 animate-in fade-in duration-500">
              <div
                className="flex flex-col items-center justify-start py-6"
                style={{
                  paddingTop: MAYA_SURFACE_TOP_OFFSET,
                  paddingBottom: photoTabBottomSpacing,
                }}
              >
                <div className="w-full max-w-xl space-y-10">
                  <MayaWelcomePanel
                    eyebrow="Maya"
                    title={
                      hasTrainedModel
                        ? hasPhotoMomentum
                          ? "Let’s plan this week’s content"
                          : "Your weekly content stylist is ready"
                        : hasPhotoMomentum
                          ? "Let’s plan this week’s content"
                          : "Let’s make showing up easier"
                    }
                    subtitle={
                      hasTrainedModel
                        ? "Tell Maya what you’re selling, launching, or showing this week. She’ll map the photo ideas, captions, and first next step."
                        : "Start with your week, your offer, or the post you’ve been avoiding. Maya will turn it into a simple content plan."
                    }
                    previewImageUrls={uploadedImages.map((image) => image.url)}
                    onThemeChipClick={handleSendMessage}
                    actions={[
                      {
                        label: "Plan this week’s content",
                        onClick: () =>
                          handleSendMessage(
                            hasTrainedModel
                              ? "Plan my content for this week using my trained model for photo ideas. Include captions and tell me which post to create first."
                              : "Plan my content for this week. Include photo ideas, captions, and tell me which post to create first.",
                          ),
                        variant: "primary",
                      },
                      {
                        label: hasTrainedModel ? "Create one photo idea" : "Start with photo ideas",
                        onClick: () =>
                          handleSendMessage(
                            hasTrainedModel
                              ? "Give me one strong photo idea for this week's content using my trained model."
                              : "Give me three photo ideas for this week's content.",
                          ),
                      },
                    ]}
                  />
                  <MayaQuickPrompts
                    prompts={currentPrompts}
                    onSelect={handleSendMessage}
                    disabled={isTyping}
                    variant="empty-state"
                    studioProMode={proMode}
                  />
                </div>
              </div>
            </div>
          )}
          </div>
        </>
      )}

      {showWelcomeFirstGenerationFlow && (
        <WelcomeFirstGenerationFlow
          userHasTrainedModel={hasTrainedModel}
          onDone={() => setWelcomeFlowDismissed(true)}
          onGenerated={() => {
            setWelcomeFlowDismissed(true)
            onImageGenerated?.()
          }}
        />
      )}

      {/* Fixed Bottom Input Area - Show in tab-scoped Maya chats */}
      {/* Subtle background for contrast - positioned above nav, z-index below nav */}
      {(activeMayaTab === "photos" || activeMayaTab === "feed") && (
        <div
          ref={inputBarRef}
          className="fixed left-0 right-0 z-[90] flex flex-col border-t border-[rgba(195,190,182,0.15)] bg-[rgba(175,170,162,0.06)] px-3 py-2 backdrop-blur-[30px] sm:px-4 sm:py-2.5"
          style={{
            // Dock above bottom nav; avoid blocking the chat area while scrolling.
            bottom: "calc(var(--sselfie-bottom-nav-height, 12px) + 4px)",
            paddingBottom: "max(0.25rem, env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div className="mx-auto w-full max-w-5xl">
            {/* [STABILIZATION] Calendar suggestion banner hidden — content calendar feature not stable */}
            {/* showCalendarSuggestion && (...) */}

            {chatError && (
              <div
                role="alert"
                className="mb-2 rounded-xl border border-[rgba(195,190,182,0.22)] bg-[rgba(175,170,162,0.12)] px-3 py-2 text-sm font-light leading-relaxed text-[#f0ede8]"
              >
                {chatError}
              </div>
            )}

            {/* Quick Actions */}
            {showInputBarQuickPrompts ? (
              <MayaQuickPrompts
                prompts={currentPrompts}
                onSelect={(prompt) => {
                  handleSendMessage(prompt)
                }}
                disabled={isTyping}
                variant={activeMayaTab === "photos" ? "quick-chips" : "input-area"}
                studioProMode={proMode}
                isEmpty={isEmpty}
                uploadedImage={uploadedImage}
              />
            ) : null}

            {/* Input Area - Unified for both Classic and Pro Mode */}
            {/* Unified Input Component - Works for Photos and Feed tabs */}
            <MayaUnifiedInput
              onSend={(message, imageUrl) => {
                // Handle message sending - match Pro Mode pattern
                if (imageUrl) {
                  const messageToSend = message || ""
                  if (messageToSend || imageUrl) {
                    handleSendMessage(messageToSend || undefined, imageUrl)
                  }
                } else {
                  // Just send text message
                  handleSendMessage(message || undefined)
                }
              }}
              onImageUpload={hasProFeatures ? () => setShowUploadFlow(true) : undefined}
              onFileChange={hasProFeatures ? undefined : handleImageUpload}
              fileInputRef={hasProFeatures ? undefined : (fileInputRef as React.RefObject<HTMLInputElement>)}
              uploadedImage={uploadedImage}
              isUploadingImage={isUploadingImage}
              onRemoveImage={() => setUploadedImage(null)}
              isLoading={isTyping || isGeneratingConcepts}
              disabled={isTyping || isGeneratingConcepts}
              placeholder={getMayaInputPlaceholder(activeMayaTab as any)}
              showSettingsButton={activeMayaTab === "photos"}
              onSettingsClick={() => {
                setShowSettings(true)
              }}
              showLibraryButton={false} // Removed - image icon handles library access
              onManageLibrary={undefined} // Removed - image icon handles library access
              onNewProject={handleNewChat}
              onHistory={() => hasProFeatures ? setShowProModeHistory(true) : setShowHistory(true)}
              showModeToggle={activeMayaTab === "photos"}
              onModeSwitch={handleModeSwitch}
              onSwitchToClassic={() => handleModeSwitch(false)}
              proMode={proMode}
              imageCount={hasProFeatures ? libraryTotalImages : undefined}
            />
          </div>
        </div>
      )}

      {/* Tab Content - Videos Tab */}
      {/* Pure gallery surface — pick a photo, tap Animate, done. No chat or text input here. */}
      {activeMayaTab === "videos" && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div
            className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6"
            style={{
              paddingTop: MAYA_SURFACE_TOP_OFFSET,
              paddingBottom: "calc(var(--sselfie-bottom-nav-height, 12px) + 24px)",
            }}
          >
            <MayaVideosTab
              user={user}
              creditBalance={creditBalance}
              onCreditsUpdate={setCreditBalance}
              sharedImages={getSharedImages().map(img => ({
                url: img.url,
                id: img.id,
                prompt: img.prompt,
                description: img.description,
                category: img.category,
              }))}
              chatGuided={false}
              onSelectSourceImage={undefined}
            />
          </div>
        </div>
      )}

      {/* Tab Content - Prompts Tab */}
      {activeMayaTab === "prompts" && (
        <div
          style={{
            paddingTop: MAYA_SURFACE_TOP_OFFSET,
            paddingBottom: '20px', // Space for content
          }}
        >
          {/* CRITICAL FIX: Show loading indicator during chat load */}
          {isLoadingChat && messages.length === 0 && (
            <div className="flex items-center justify-center min-h-[400px]">
              <UnifiedLoading message="Loading prompts..." variant="section" />
            </div>
          )}
          <MayaPromptsTab
            onSelectPrompt={(prompt, title) => {
              // Switch to Photos tab and send the prompt
              setActiveMayaTab("photos")
              // Persist to localStorage and URL
              if (typeof window !== "undefined") {
                localStorage.setItem("mayaActiveTab", "photos")
                window.history.replaceState(null, "", "#maya")
              }
              // Send the prompt message
              handleSendMessage(prompt)
            }}
            sharedImages={getSharedImages().map(img => ({
              url: img.url,
              id: img.id,
              prompt: img.prompt,
              description: img.description,
              category: img.category,
            }))}
            userId={userId}
            creditBalance={creditBalance}
            onCreditsUpdate={setCreditBalance}
            proMode={proMode}
            imageLibrary={imageLibrary}
            onOpenUploadFlow={() => handlePhaseTwoUploadZone("selfies")}
            onOpenTrainingFlow={() => handlePhaseTwoGenerationSource("custom_model")}
            onOpenCreditsModal={() => setShowBuyCreditsModal(true)}
            aiPhotoPromptsLocked={!hasAiPhotoPromptsAccess}
            onUpgradeToStudio={() => void handleOpenStudioCheckout("maya_prompts_lock")}
          />
        </div>
      )}


      {/* Tab Content - Training Tab */}
      {activeMayaTab === "training" && (
        <div
          className="flex-1 min-h-0 overflow-y-auto relative z-10"
          style={{
            paddingTop: MAYA_SURFACE_TOP_OFFSET,
            paddingBottom: "20px",
          }}
        >
          <MayaTrainingTab
            userId={userId}
            setActiveTab={setActiveTab}
            userName={user?.name || user?.email?.split('@')[0] || null}
            creditBalance={creditBalance}
            isMembership={isMembership}
            onBuyCredits={() => setShowBuyCreditsModal(true)}
            onJoinStudio={() => void handleOpenStudioCheckout("maya_training_low_credits")}
          />
        </div>
      )}

      <StudioMemberOnboarding
        open={showStudioMemberOnboarding}
        creditBalance={creditBalance}
        onClose={() => setShowStudioMemberOnboarding(false)}
        onShowSelfieMode={() => {
          if (!proMode) {
            handleModeSwitch(true)
          }
          setActiveMayaTab("photos")
          if (typeof window !== "undefined") {
            localStorage.setItem("mayaActiveTab", "photos")
            window.history.replaceState(null, "", "#maya")
          }
        }}
        onUploadSelfie={() => {
          if (!proMode) {
            handleModeSwitch(true)
          }
          setActiveMayaTab("photos")
          if (typeof window !== "undefined") {
            localStorage.setItem("mayaActiveTab", "photos")
            window.history.replaceState(null, "", "#maya")
          }
          toast({
            title: "Use Add Image",
            description: "Upload from the Add Image button in the chat input to start creating.",
          })
        }}
        onStartTraining={() => {
          setActiveMayaTab("training")
          if (typeof window !== "undefined") {
            localStorage.setItem("mayaActiveTab", "training")
            window.history.replaceState(null, "", "#maya/training")
          }
        }}
      />

        {/* Pro Mode Onboarding Modal - Rendered via Portal to avoid stacking context issues */}
        {showStudioProOnboarding && typeof window !== 'undefined' && createPortal(
          <div
            className="fixed inset-0 bg-[rgba(13,12,11,0.80)] flex items-start sm:items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowStudioProOnboarding(false)}
            style={{ zIndex: 9999 }}
          >
            <div
              className="bg-[rgba(28,27,25,0.96)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.20)] rounded-2xl p-6 sm:p-8 max-w-md w-full my-4 sm:my-8 shadow-xl relative flex flex-col max-h-[calc(100vh-2rem)] text-[#f0ede8]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setShowStudioProOnboarding(false)}
                className="absolute top-4 right-4 px-2 py-1.5 text-[#8a8780] hover:text-[#f0ede8] transition-colors rounded-full hover:bg-[rgba(175,170,162,0.12)] z-10"
                aria-label="Close"
              >
                <span className="text-[10px] uppercase tracking-[0.2em]">Close</span>
              </button>

              {/* Header */}
              <h2 className="text-xl font-serif font-light tracking-[0.15em] uppercase text-[#f0ede8] mb-2 pr-8">
                SELFIE
              </h2>
              <p className="text-sm text-[#8a8780] mb-6 leading-relaxed">
                Professional content creation guided by Maya
              </p>
              
              {/* Content */}
              <div className="space-y-6 overflow-y-auto flex-1 min-h-0 pb-4">
                
                {/* Step 1 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[rgba(175,170,162,0.18)] border border-[rgba(195,190,182,0.25)] flex items-center justify-center shrink-0">
                      <span className="text-[#f0ede8] text-sm font-serif">1</span>
                    </div>
                    <h3 className="text-sm font-medium text-[#f0ede8] tracking-wide">
                      Tell Maya What You Want
                    </h3>
                  </div>
                  <p className="text-xs text-[#8a8780] leading-relaxed ml-11">
                    Describe the content you want to create. Examples: &quot;Alo Yoga style workout photos&quot;, &quot;Professional LinkedIn headshot&quot;, or &quot;Coffee shop entrepreneur vibes&quot;
                  </p>
                </div>
                
                {/* Step 2 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[rgba(175,170,162,0.18)] border border-[rgba(195,190,182,0.25)] flex items-center justify-center shrink-0">
                      <span className="text-[#f0ede8] text-sm font-serif">2</span>
                    </div>
                    <h3 className="text-sm font-medium text-[#f0ede8] tracking-wide">
                      Choose Your Concept
                    </h3>
                  </div>
                  <p className="text-xs text-[#8a8780] leading-relaxed ml-11">
                    Maya creates 3 professional concepts for you. Each concept includes a detailed prompt you can use as-is or customize.
                  </p>
                </div>
                
                {/* Step 3 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[rgba(175,170,162,0.18)] border border-[rgba(195,190,182,0.25)] flex items-center justify-center shrink-0">
                      <span className="text-[#f0ede8] text-sm font-serif">3</span>
                    </div>
                    <h3 className="text-sm font-medium text-[#f0ede8] tracking-wide">
                      Add Your Images
                    </h3>
                  </div>
                  <p className="text-xs text-[#8a8780] leading-relaxed ml-11">
                    Select at least one image from your gallery or upload new photos. You can add up to 4 reference images per concept.
                  </p>
                </div>
                
                {/* Step 4 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[rgba(175,170,162,0.18)] border border-[rgba(195,190,182,0.25)] flex items-center justify-center shrink-0">
                      <span className="text-[#f0ede8] text-sm font-serif">4</span>
                    </div>
                    <h3 className="text-sm font-medium text-[#f0ede8] tracking-wide">
                      Generate
                    </h3>
                  </div>
                  <p className="text-xs text-[#8a8780] leading-relaxed ml-11">
                    Click the generate button to create your professional content. Each generation costs 5 credits and takes about 30 seconds.
                  </p>
                </div>
                
                {/* SELFIE Tips */}
                <div className="border-t border-[rgba(195,190,182,0.20)] pt-4 mt-6">
                  <h3 className="text-xs tracking-[0.15em] uppercase text-[#f0ede8] font-medium mb-3">
                    SELFIE Tips
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-xs text-[#8a8780] mt-0.5">—</span>
                      <p className="text-xs text-[#8a8780] leading-relaxed flex-1">
                        Click the three-dot menu on any concept to view or edit the detailed prompt
                      </p>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-xs text-[#8a8780] mt-0.5">—</span>
                      <p className="text-xs text-[#8a8780] leading-relaxed flex-1">
                        Your first image should be your main photo. Additional images can be style references
                      </p>
                    </li>
                  </ul>
                </div>
                
              </div>
              
              {/* Footer Button */}
              <div className="pt-4 border-t border-[rgba(195,190,182,0.20)]">
                <button
                  onClick={() => setShowStudioProOnboarding(false)}
                  className="w-full py-3 bg-[#c8c4bb] text-[#0d0c0b] rounded-lg hover:bg-[#f0ede8] transition-colors text-sm font-medium tracking-wide uppercase"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      </div>

      <BuyCreditsModal
        open={showBuyCreditsModal}
        onOpenChange={setShowBuyCreditsModal}
        onSuccess={() => {
          setShowBuyCreditsModal(false)
          // Refresh credit balance after purchase (with retry for webhook delay)
          const refreshCredits = async (retries = 3, delay = 1000) => {
            for (let i = 0; i < retries; i++) {
              try {
                const res = await fetch("/api/user/credits")
                const data = await res.json()
                if (data.balance !== undefined) {
                  setCreditBalance(data.balance)
                  return // Success, exit retry loop
                }
              } catch (err) {
                console.error("[v0] Error refreshing credits (attempt", i + 1, "):", err)
              }
              // Wait before retry (webhook might need time to process)
              if (i < retries - 1) {
                await new Promise((resolve) => setTimeout(resolve, delay))
              }
            }
          }
          refreshCredits()
        }}
      />

      {/* Pro Feature: Library Management Modal (Pro Mode only) */}
      {hasLibraryManagement && showLibraryModal && (
        <ImageLibraryModal
          isOpen={showLibraryModal}
          library={imageLibrary}
          onClose={() => setShowLibraryModal(false)}
          onManageCategory={(category) => {
            // Open upload flow for specific category - store category to focus on it
            console.log('[Pro Mode] Manage category:', category)
            setManageCategory(category)
            setShowLibraryModal(false)
            // Use requestAnimationFrame to ensure modal close completes before opening upload flow
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                setShowUploadFlow(true)
              })
            })
          }}
          onEditIntent={async () => {
            // TODO: Open intent editor modal
            const newIntent = prompt('Enter your creative intent:', imageLibrary.intent || '')
            if (newIntent !== null) {
              await updateIntent(newIntent)
            }
          }}
        />
      )}

      {/* Pro Feature: Chat History Modal (Pro Mode uses ProModeChatHistory, Classic uses MayaChatHistory) */}
      {hasProFeatures && (
        <ProModeChatHistory
          isOpen={showProModeHistory}
          onClose={() => setShowProModeHistory(false)}
          currentChatId={chatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          chatType={currentChatType}
        />
      )}

      {/* Pro Feature: Image Upload Flow Modal (Pro Mode only - for library management) */}
      {/* Modal must be above header (z-[100]) and bottom nav (z-[70]) */}
      {hasProFeatures && showUploadFlow && (
        <div className="fixed inset-0 z-[150] bg-[rgba(13,12,11,0.80)] backdrop-blur-sm flex items-center justify-center p-4" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="bg-[rgba(28,27,25,0.96)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.20)] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-[rgba(195,190,182,0.15)] flex items-center justify-between">
              <h3 className="text-lg font-medium text-[#f0ede8]">Add Images to Library</h3>
              <button
                onClick={() => setShowUploadFlow(false)}
                className="px-2 py-1.5 hover:bg-[rgba(175,170,162,0.12)] rounded-lg transition-colors"
              >
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#8a8780]">Close</span>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              <ImageUploadFlow
                initialLibrary={imageLibrary}
                showAfterState={!manageCategory}
                editCategory={manageCategory || undefined}
                onComplete={async (library) => {
                  await saveLibrary(library)
                  if (library.intent) {
                    await updateIntent(library.intent)
                  }
                  // Stay in a single flow after editing so users can continue to "Start Creating".
                  if (manageCategory) {
                    setManageCategory(null)
                  }
                }}
                onStartCreating={async (library) => {
                  // 🔴 FIX: Navigate to creation flow after "Start Creating" button
                  console.log("[v0] [PRO MODE] Start Creating clicked from upload flow modal", library)
                  
                  // Use the library passed from ImageUploadFlow, not the stale imageLibrary
                  // saveLibrary expects Partial<ImageLibrary>, so we pass the full library
                  await saveLibrary({
                    selfies: library.selfies,
                    products: library.products,
                    people: library.people,
                    vibes: library.vibes,
                    intent: library.intent,
                  })
                  
                  // Refresh library to ensure Prompts tab gets updated state
                  await refreshLibrary()
                  
                  if (library.intent) {
                    await updateIntent(library.intent)
                  }
                  
                  if (sendMessage && library.selfies.length > 0) {
                    // Use feed message if in Feed tab, otherwise use concepts message
                    const defaultMessage = activeMayaTab === "feed" 
                      ? "Create an Instagram feed layout"
                      : "I'm ready to create concepts with my images"
                    const messageText = library.intent || defaultMessage
                    const allImages = [
                      ...library.selfies,
                      ...library.products,
                      ...library.people,
                      ...library.vibes,
                    ]
                    
                    const messageParts: Array<{ type: string; text?: string; image?: string }> = []
                    if (messageText) {
                      messageParts.push({ type: "text", text: messageText })
                    }
                    allImages.forEach(imageUrl => {
                      messageParts.push({ type: "image", image: imageUrl })
                    })
                    
                    sendMessage({
                      role: "user",
                      parts: messageParts as any, // Type assertion for parts array
                    })
                    
                    // Close the upload flow modal
                    setShowUploadFlow(false)
                  }
                }}
                onManageCategory={(category) => {
                  // Keep edits inside the same upload flow modal (no nested modal reopen).
                  setManageCategory(category)
                }}
                onCancel={() => {
                  setShowUploadFlow(false)
                  setManageCategory(null)
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
