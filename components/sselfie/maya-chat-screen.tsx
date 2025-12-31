"use client"

import type React from "react"
import VideoCard from "./video-card"
import {
  Camera,
  Send,
  ArrowDown,
  X,
  Home,
  Aperture,
  MessageCircle,
  ImageIcon,
  Grid,
  User,
  SettingsIcon,
  LogOut,
  Sliders,
  Plus,
  Clock,
  Sparkles,
  Image,
  Menu,
  ChevronDown,
  ChevronRight,
  Film,
  GraduationCap,
} from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
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
import { useRouter } from "next/navigation"
// SessionUser type removed - not exported from next-auth
import { PromptSuggestionCard as NewPromptSuggestionCard } from "./prompt-suggestion-card"
import type { PromptSuggestion } from "@/lib/maya/prompt-generator"
import ImageUploadFlow from "./pro-mode/ImageUploadFlow"
import { getConceptPrompt } from "@/lib/maya/concept-templates"
import BuyCreditsModal from "./buy-credits-modal"
import { ConceptConsistencyToggle } from './concept-consistency-toggle'
// Pro Mode Components
import MayaHeader from "./maya/maya-header"
import ImageLibraryModal from "./pro-mode/ImageLibraryModal"
import ProModeChatHistory from "./pro-mode/ProModeChatHistory"
import { Typography, Colors } from '@/lib/maya/pro/design-system'
import { useToast } from "@/hooks/use-toast"
import { DesignClasses } from "@/lib/design-tokens"

interface MayaChatScreenProps {
  onImageGenerated?: () => void
  user: any | null // User object passed down (type from parent component)
  setActiveTab?: (tab: string) => void // Navigation handler from parent
  userId?: string // User ID (optional, can be derived from user, also used for admin guide controls)
  initialChatId?: number // Initial chat ID to load
  studioProMode?: boolean // Force Pro Mode (for admin)
  isAdmin?: boolean // Admin mode - enables save to guide functionality
  selectedGuideId?: number | null // Selected guide ID for saving
  selectedGuideCategory?: string | null // Selected guide category
  onGuideChange?: (id: number | null, category: string | null) => void // Callback when guide selection changes
  hasTrainedModel?: boolean // Whether user has a trained model
}

export default function MayaChatScreen({ 
  onImageGenerated, 
  user, 
  setActiveTab,
  userId,
  initialChatId,
  studioProMode: forcedStudioProMode,
  isAdmin = false,
  selectedGuideId = null,
  selectedGuideCategory = null,
  onGuideChange,
  hasTrainedModel = true, // Default to true to avoid breaking existing usage
}: MayaChatScreenProps) {
  const { toast } = useToast()
  const [inputValue, setInputValue] = useState("")
  const [showHistory, setShowHistory] = useState(false)
  const [showNavMenu, setShowNavMenu] = useState(false)
  const [showChatMenu, setShowChatMenu] = useState(false)
  // savedMessageIds is now provided by useMayaChat hook
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const isAtBottomRef = useRef(true)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const retryQueue = useRef<Array<{ messageId: string; payload: any }>>([])
  const [isDragging, setIsDragging] = useState(false)
  const [contentFilter, setContentFilter] = useState<"all" | "photos" | "videos">("all")
  const [currentPrompts, setCurrentPrompts] = useState<Array<{ label: string; prompt: string }>>([])
  const [userGender, setUserGender] = useState<string | null>(null)
  const [showHeader, setShowHeader] = useState(true)
  const [creditBalance, setCreditBalance] = useState<number>(0)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showBuyCreditsModal, setShowBuyCreditsModal] = useState(false)
  const router = useRouter()
  
  // Tab state for Photos/Videos/Prompts/Training tabs
  const [activeMayaTab, setActiveMayaTab] = useState<"photos" | "videos" | "prompts" | "training">(() => {
    // Check URL hash for tab selection (e.g., #maya/videos, #maya/prompts, #maya/training)
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
  
  // Mode managed by useMayaMode hook
  const { studioProMode, setStudioProMode, getModeString, hasModeChanged } = useMayaMode(forcedStudioProMode)
  
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
  } = useMayaChat({
    initialChatId,
    studioProMode,
    user,
    getModeString,
  })

  const [pendingConceptRequest, setPendingConceptRequest] = useState<string | null>(null)
  const [isGeneratingConcepts, setIsGeneratingConcepts] = useState(false)
  
  // Track messages that should show image upload module
  const [messagesWithUploadModule, setMessagesWithUploadModule] = useState<Set<string>>(new Set())
  
  const [selectedPrompt, setSelectedPrompt] = useState<string>("")
  
  // Concept consistency mode state - persist user preference in localStorage
  // Smart default: Only apply when no saved preference exists, and only based on concept count
  const [consistencyMode, setConsistencyMode] = useState<'variety' | 'consistent'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mayaConsistencyMode')
      if (saved === 'variety' || saved === 'consistent') {
        return saved // Use saved preference if it exists
      }
    }
    return 'variety' // Default to variety if no saved preference
  })
  
  // Collapsible section state for quick prompts and concept style
  const [isOptionsExpanded, setIsOptionsExpanded] = useState(false)
  
  // hasUsedMayaBefore is now provided by useMayaChat hook
  
  // Images managed by useMayaImages hook
  const {
    imageLibrary,
    isLibraryLoading,
    libraryError,
    libraryTotalImages,
    loadLibrary,
    saveLibrary,
    addImages,
    removeImages,
    clearLibrary,
    updateIntent,
    refreshLibrary,
    uploadedImages,
    setUploadedImages,
    galleryImages,
    loadGalleryImages,
  } = useMayaImages(studioProMode)

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
  // These make it explicit what features are enabled, rather than just checking studioProMode
  // Must be defined after useMayaImages hook since hasImageLibrary depends on imageLibrary
  // 
  // Progressive Enhancement Pattern:
  // - Base UI is the same for both modes
  // - Pro features conditionally appear when hasProFeatures is true
  // - No conditional rendering of entire components (use unified components instead)
  // - Only conditionally show/hide specific features within unified components
  const hasProFeatures = studioProMode
  const hasImageLibrary = studioProMode && imageLibrary
  const hasLibraryManagement = studioProMode
  
  // Shared images from first concept card - auto-populates other cards
  const [sharedConceptImages, setSharedConceptImages] = useState<Array<string | null>>([null, null, null])
  const [showGallerySelector, setShowGallerySelector] = useState(false)
  const [isGeneratingStudioPro, setIsGeneratingStudioPro] = useState(false)
  const processedStudioProMessagesRef = useRef<Set<string>>(new Set())
  const promptGenerationTriggeredRef = useRef<Set<string>>(new Set()) // Track messages that have already triggered prompt generation
  const carouselCardsAddedRef = useRef<Set<string>>(new Set()) // Track messages that already have carousel cards added
  const generateCarouselRef = useRef<((params: { topic: string; slideCount: number }) => Promise<void>) | null>(null)
  const generateReelCoverRef = useRef<((params: { title: string; textOverlay?: string }) => Promise<void>) | null>(null)
  
  // Pro features onboarding state
  const [showStudioProOnboarding, setShowStudioProOnboarding] = useState(false)
  
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

  // Save consistency mode to localStorage when user changes it
  const handleConsistencyModeChange = useCallback((mode: 'variety' | 'consistent') => {
    setConsistencyMode(mode)
    if (typeof window !== 'undefined') {
      localStorage.setItem('mayaConsistencyMode', mode)
      console.log('[v0] User set consistency mode to:', mode, '(saved to localStorage)')
    }
  }, [])

  // Chat loading and persistence are now handled by useMayaChat hook

  // Mode persistence is now handled by useMayaMode hook

  // Image persistence and gallery loading are now handled by useMayaImages hook

  // Pro features: Generate carousel (defined BEFORE useEffect that processes messages)
  const generateCarousel = useCallback(async ({ topic, slideCount }: { topic: string; slideCount: number }) => {
    try {
      setIsGeneratingStudioPro(true)

      const response = await fetch('/api/studio-pro/generate/carousel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          slideCount,
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || 'Carousel generation failed'
        
        if (response.status === 402) {
          // Show buy credits modal instead of alert
          setShowBuyCreditsModal(true)
        } else {
          alert(`Failed to generate carousel: ${errorMessage}`)
        }
        
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log('[CAROUSEL] Generation result:', { 
        success: result.success, 
        imageCount: result.imageUrls?.length,
        generationId: result.generationId 
      })

      // Add carousel results as a message in chat
      if (result.imageUrls && result.imageUrls.length > 0) {
        console.log('[CAROUSEL] Adding carousel images to chat:', result.imageUrls.length)
        
        const carouselMessage = {
          id: `carousel-${result.generationId}-${Date.now()}`,
          role: 'assistant' as const,
          content: `Created your ${result.imageUrls.length}-slide carousel about "${topic}"! Here are your slides:`,
          parts: [
            {
              type: 'text' as const,
              text: `Created your ${result.imageUrls.length}-slide carousel about "${topic}"! Here are your slides:`,
            },
            ...result.imageUrls.map((url: string, index: number) => ({
              type: 'image' as const,
              image: url,
            })),
            {
              type: 'text' as const,
              text: `\n\nWant to turn this into a reel cover? Or adapt it for a different brand kit?`,
            },
          ],
        }

        console.log('[CAROUSEL] Carousel message structure:', {
          id: carouselMessage.id,
          partsCount: carouselMessage.parts.length,
          imageParts: carouselMessage.parts.filter(p => p.type === 'image').length,
        })

        setMessages((prev) => {
          const updated = [...prev, carouselMessage]
          console.log('[CAROUSEL] Updated messages, total count:', updated.length)
          return updated
        })

        // Add images to shared images for Videos tab
        if (result.imageUrls && result.imageUrls.length > 0) {
          addSharedImages(
            result.imageUrls.map((url: string, index: number) => ({
              url,
              id: `carousel-${result.generationId}-${index}`,
              prompt: `Carousel slide ${index + 1} about "${topic}"`,
              description: `Carousel slide ${index + 1} about "${topic}"`,
              category: "carousel",
            }))
          )
        }

        // Refresh gallery
        if (onImageGenerated) {
          onImageGenerated()
        }
      } else {
        console.warn('[CAROUSEL] No image URLs in result:', result)
      }

      setIsGeneratingStudioPro(false)
    } catch (error) {
      console.error('[CAROUSEL] Generation error:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      // Check if error is about insufficient credits
      if (errorMessage.toLowerCase().includes("insufficient credits") || 
          errorMessage.toLowerCase().includes("insufficient credit")) {
        setShowBuyCreditsModal(true)
      }
      
      setIsGeneratingStudioPro(false)
    }
  }, [onImageGenerated, setMessages, setIsGeneratingStudioPro])

  // Studio Pro: Generate reel cover (defined BEFORE useEffect that processes messages)
  const generateReelCover = useCallback(async ({ title, textOverlay }: { title: string; textOverlay?: string }) => {
    try {
      setIsGeneratingStudioPro(true)

      const response = await fetch('/api/studio-pro/generate/reel-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          textOverlay,
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || 'Reel cover generation failed'
        
        if (response.status === 402) {
          // Show buy credits modal instead of alert
          setShowBuyCreditsModal(true)
        } else {
          alert(`Failed to generate reel cover: ${errorMessage}`)
        }
        
        throw new Error(errorMessage)
      }

      const result = await response.json()

      // Add reel cover result as a message in chat
      if (result.imageUrl) {
        const reelCoverMessage = {
          id: `reel-cover-${result.generationId}-${Date.now()}`,
          role: 'assistant' as const,
          parts: [
            {
              type: 'text' as const,
              text: `Created your reel cover for "${title}"!${textOverlay ? ` With text: "${textOverlay}"` : ''}`,
            },
            {
              type: 'image' as const,
              image: result.imageUrl,
            },
            {
              type: 'text' as const,
              text: `\n\nWant to create a carousel to go with this reel? Or adapt it for a different brand kit?`,
            },
          ],
        }

        setMessages((prev) => {
          const updated = [...prev, reelCoverMessage as any]
          return updated as any
        })

        // Add image to shared images for Videos tab
        if (result.imageUrl) {
          addImage({
            url: result.imageUrl,
            id: `reel-cover-${result.generationId}`,
            prompt: `Reel cover for "${title}"${textOverlay ? ` with text: "${textOverlay}"` : ''}`,
            description: `Reel cover for "${title}"${textOverlay ? ` with text: "${textOverlay}"` : ''}`,
            category: "reel-cover",
          })
        }

        // Refresh gallery
        if (onImageGenerated) {
          onImageGenerated()
        }
      }

      setIsGeneratingStudioPro(false)
    } catch (error) {
      console.error('[REEL-COVER] Generation error:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      // Check if error is about insufficient credits
      if (errorMessage.toLowerCase().includes("insufficient credits") || 
          errorMessage.toLowerCase().includes("insufficient credit")) {
        setShowBuyCreditsModal(true)
      }
      
      setIsGeneratingStudioPro(false)
    }
  }, [onImageGenerated, setMessages, setIsGeneratingStudioPro])

  // Update refs when functions change
  useEffect(() => {
    generateCarouselRef.current = generateCarousel
    generateReelCoverRef.current = generateReelCover
  }, [generateCarousel, generateReelCover])

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
    
    // Check if we've already added a carousel card to this message (prevent infinite loops)
    if (carouselCardsAddedRef.current.has(messageId)) {
      // Already added carousel card, skip
      processedStudioProMessagesRef.current.add(messageId)
      return
    }
    
    // Also check if message already has carousel card in parts (from previous render)
    const hasCarouselCard = lastAssistantMessage.parts?.some(
      (p: any) => p.type === "tool-generateCarousel"
    )
    if (hasCarouselCard) {
      // Already has carousel card, mark as processed and skip
      carouselCardsAddedRef.current.add(messageId)
      processedStudioProMessagesRef.current.add(messageId)
      return
    }
    
    const alreadyHasConceptCards = lastAssistantMessage.parts?.some(
      (p: any) => p.type === "tool-generateConcepts" && p.output?.concepts?.length > 0,
    )
    if (alreadyHasConceptCards) {
      console.log("[v0] Message already has concepts, skipping:", messageId)
      return
    }

    const textContent = getMessageText(lastAssistantMessage)

    // 🔴 CRITICAL: Since status is NOT "streaming", the message is complete
    // Process the trigger immediately - the status check above ensures we only get here when streaming is done

    console.log("[CAROUSEL-DEBUG] Checking message for triggers:", {
      messageId,
      hasContent: !!textContent,
      contentType: typeof textContent,
      hasParts: !!lastAssistantMessage.parts,
      partsLength: lastAssistantMessage.parts?.length,
      textContentLength: textContent.length,
      textContentPreview: textContent.substring(0, 200),
      isGeneratingStudioPro,
      alreadyProcessed: processedStudioProMessagesRef.current.has(messageId),
      status,
    })

    // DISABLED: No longer auto-triggering upload module from Maya's responses
    // Users should click the image icon in chat input to change images/products/categories
    // Maya will guide them to do this instead of programmatically triggering the module
    // 
    // const uploadModuleMatch = textContent.match(/\[SHOW_IMAGE_UPLOAD_MODULE\]\s*(.+?)(?:\n|$|\[|$)/i) || 
    //                          textContent.match(/\[SHOW_IMAGE_UPLOAD_MODULE\]/i)
    // 
    // if (uploadModuleMatch && studioProMode && !messagesWithUploadModule.has(messageId)) {
    //   const categoryContext = uploadModuleMatch[1]?.trim() || textContent.split('[SHOW_IMAGE_UPLOAD_MODULE]')[1]?.trim() || ''
    //   console.log("[v0] ✅ Detected image upload module trigger:", {
    //     categoryContext,
    //     messageId,
    //     studioProMode
    //   })
    //   
    //   // Mark this message to show upload module
    //   setMessagesWithUploadModule(prev => new Set(prev).add(messageId))
    //   processedConceptMessagesRef.current.add(messageId)
    //   return // Don't check other triggers
    // }
    
    // Check for [GENERATE_CONCEPTS] trigger (after images are uploaded)
    // CRITICAL: In Studio Pro mode, only process this trigger if images have been uploaded
    // CRITICAL: Only process if message appears complete (trigger at end or minimal text after)
    const conceptMatch = textContent.match(/\[GENERATE_CONCEPTS\]\s*(.+?)(?:\n|$|\[|$)/i) || 
                        textContent.match(/\[GENERATE_CONCEPTS\]/i)
    
    if (conceptMatch && !isGeneratingConcepts && !pendingConceptRequest) {
      const conceptRequest = conceptMatch[1]?.trim() || textContent.split('[GENERATE_CONCEPTS]')[1]?.trim() || ''
      console.log("[v0] ✅ Detected concept generation trigger:", {
        conceptRequest,
        fullText: textContent.substring(0, 200),
        messageId,
        studioProMode
      })
      
      setPendingConceptRequest(conceptRequest || 'concept generation')
      return // Don't check other triggers for concept generation
    } else if (studioProMode && textContent.toLowerCase().includes('concept') && !isGeneratingConcepts && !pendingConceptRequest) {
      // FALLBACK: If Maya mentions "concept" but didn't include trigger, log for debugging
      console.log("[v0] ⚠️ Studio Pro mode: Maya mentioned 'concept' but no [GENERATE_CONCEPTS] trigger found:", {
        textContent: textContent.substring(0, 300),
        messageId,
        hasTrigger: textContent.includes('[GENERATE_CONCEPTS]')
      })
    }

    // Check for Studio Pro generation triggers FIRST (before other Studio Pro checks)
    // [GENERATE_CAROUSEL: ...]
    // Use a more robust regex that handles the full parameter string
    console.log("[CAROUSEL-DEBUG] Checking for carousel trigger in textContent:", {
      textContentLength: textContent.length,
      containsGenerateCarousel: textContent.includes('[GENERATE_CAROUSEL'),
      isGeneratingStudioPro,
    })
    
    const carouselMatch = textContent.match(/\[GENERATE_CAROUSEL:\s*([^\]]+)\]/i)
    console.log("[CAROUSEL-DEBUG] Regex match result:", carouselMatch ? "MATCHED" : "NO MATCH", carouselMatch)
    
    if (carouselMatch && !isGeneratingStudioPro) {
      const params = carouselMatch[1].trim()
      console.log("[CAROUSEL] Raw params extracted:", params)
      
      // Parse params: topic, slideCount
      // Format: [GENERATE_CAROUSEL: topic: X, slides: Y] or [GENERATE_CAROUSEL: X, slides: Y]
      // Try to match "topic: ..." first, then fall back to extracting before "slides:"
      let topic = ''
      let slideCount = 5
      
      // Try explicit "topic:" format
      const topicMatch = params.match(/topic[:\s]+([^,]+?)(?:\s*,\s*slides?|$)/i)
      if (topicMatch) {
        topic = topicMatch[1].trim()
      } else {
        // Try to extract everything before "slides:" or the last number
        const beforeSlides = params.split(/,\s*slides?[:\s]*/i)[0]
        if (beforeSlides) {
          topic = beforeSlides.trim()
        } else {
          // Fallback: take everything before the last comma or number
          topic = params.split(',').slice(0, -1).join(',').trim() || params.split(/\d+/)[0].trim() || 'carousel'
        }
      }
      
      // Extract slide count
      const slideCountMatch = params.match(/slides?[:\s]*(\d+)/i) || params.match(/(\d+)\s*slides?/i) || params.match(/(\d+)$/)
      if (slideCountMatch) {
        slideCount = parseInt(slideCountMatch[1])
      }
      
      // Clean up topic (remove any trailing commas or numbers)
      topic = topic.replace(/,\s*$/, '').trim()
      
      console.log("[CAROUSEL] Detected carousel generation trigger:", { topic, slideCount, originalParams: params })
      
      if (topic && slideCount > 0) {
        // Mark as processed FIRST to prevent infinite loops
        processedStudioProMessagesRef.current.add(messageId)
        
        // Check if carousel card already exists in the message
        const existingParts = lastAssistantMessage.parts || []
        const hasCarouselCard = existingParts.some(
          (p: any) => p.type === "tool-generateCarousel"
        )
        
        // Mark that we're adding a carousel card to prevent infinite loops
        carouselCardsAddedRef.current.add(messageId)
        
        // Instead of generating immediately, add a carousel card part to the message
        // This allows the user to click the card to generate (like concept cards)
        const carouselCardPart = {
          type: "tool-generateCarousel",
          output: {
            state: "ready",
            topic,
            slideCount,
            credits: slideCount * 5,
          },
        }
        
        // Add the carousel card part to the last assistant message
        setMessages((prev) => {
          const updated = [...prev]
          const lastIndex = updated.length - 1
          if (lastIndex >= 0 && updated[lastIndex].role === "assistant") {
            const lastMsg = updated[lastIndex]
            const msgParts = lastMsg.parts || []
            // Double-check it doesn't already exist (race condition protection)
            const alreadyHasCard = msgParts.some(
              (p: any) => p.type === "tool-generateCarousel"
            )
            if (!alreadyHasCard) {
              updated[lastIndex] = {
                ...lastMsg,
                parts: [...msgParts, carouselCardPart as any], // Type assertion for custom tool part
              }
            }
          }
          return updated
        })
        
        return // Don't check other triggers after carousel
      } else {
        console.warn("[CAROUSEL] Failed to parse carousel params:", { topic, slideCount, params })
      }
    }

    // Check for Studio Pro generation triggers: [GENERATE_REEL_COVER: ...]
    const reelCoverMatch = textContent.match(/\[GENERATE_REEL_COVER:\s*(.+?)\]/i)
    if (reelCoverMatch && !isGeneratingStudioPro) {
      const params = reelCoverMatch[1].trim()
      // Parse params: title, textOverlay
      // Format: [GENERATE_REEL_COVER: title: X, text: Y] or [GENERATE_REEL_COVER: X, Y]
      const titleMatch = params.match(/title[:\s]+([^,]+)/i) || params.match(/^([^,]+?)(?:\s*,\s*text|$)/i)
      const textMatch = params.match(/text[:\s]+([^,]+)/i) || params.match(/,\s*(.+)$/i)
      
      const title = titleMatch?.[1]?.trim() || params.split(',')[0]?.trim() || 'Reel Cover'
      const textOverlay = textMatch?.[1]?.trim() || undefined
      
      console.log("[REEL-COVER] Detected reel cover generation trigger:", { title, textOverlay })
      processedStudioProMessagesRef.current.add(messageId)
      // Call generateReelCover via ref to avoid dependency issues
      generateReelCoverRef.current?.({ title, textOverlay })
    }
  }, [messages, status, isGeneratingConcepts, pendingConceptRequest, isGeneratingStudioPro, studioProMode, messagesWithUploadModule])

  // The problem was: message was saved BEFORE concepts were generated, so concepts were never persisted
  useEffect(() => {
    if (!pendingConceptRequest || isGeneratingConcepts) return
    

    const generateConcepts = async () => {
      setIsGeneratingConcepts(true)
      console.log("[v0] Calling generate-concepts API for:", pendingConceptRequest)

      try {
        // Extract reference image from user messages (check all user messages, most recent first)
        let referenceImageUrl: string | undefined = undefined
        const userMessages = messages.filter((m) => m.role === "user").reverse() // Most recent first
        
        console.log("[v0] 🔍 Searching for reference image in", userMessages.length, "user messages")
        console.log("[v0] 📋 Message structure sample:", JSON.stringify(userMessages[0]?.parts?.slice(0, 2) || getMessageText(userMessages[0])?.substring(0, 100), null, 2))
        
        for (const userMessage of userMessages) {
          // Check if message has image in parts
          if (userMessage.parts && Array.isArray(userMessage.parts)) {
            console.log("[v0] 🔍 Checking message with", userMessage.parts.length, "parts")
            
            const imagePart = userMessage.parts.find((p: any) => {
              if (!p) return false
              console.log("[v0]   - Part type:", p.type, "keys:", Object.keys(p))
              
              // Check for image type
              if (p.type === "image") {
                console.log("[v0]   ✅ Found image part!")
                return true
              }
              // Check for file type with image mediaType
              if (p.type === "file" && p.mediaType && p.mediaType.startsWith("image/")) {
                console.log("[v0]   ✅ Found file image part!")
                return true
              }
              return false
            })
            
            if (imagePart) {
              // Try multiple possible property names (type assertion needed for image parts)
              const imagePartAny = imagePart as any
              referenceImageUrl = imagePartAny.image || imagePartAny.url || imagePartAny.src || imagePartAny.data
              if (referenceImageUrl) {
                console.log("[v0] ✅ Extracted reference image from message parts:", referenceImageUrl.substring(0, 100) + "...")
                break // Found it, stop searching
              } else {
                console.log("[v0] ⚠️ Image part found but no URL property:", Object.keys(imagePart))
              }
            }
          }
          
          // Also check for text marker (backward compatibility)
          if (!referenceImageUrl) {
            const textContent = getMessageText(userMessage)
            
            const inspirationImageMatch = textContent.match(/\[Inspiration Image: (https?:\/\/[^\]]+)\]/)
            if (inspirationImageMatch) {
              referenceImageUrl = inspirationImageMatch[1]
              console.log("[v0] ✅ Extracted reference image from text marker:", referenceImageUrl.substring(0, 100) + "...")
              break // Found it, stop searching
            }
          }
        }
        
        if (!referenceImageUrl) {
          console.log("[v0] ⚠️ No reference image found in any user messages")
          console.log("[v0] 📋 All user messages:", userMessages.map(m => ({
            hasParts: !!m.parts,
            partsCount: m.parts?.length || 0,
            hasText: !!getMessageText(m),
          })))
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
                    console.log("[v0] ✅ Detected guide prompt (length:", prompt.length, "chars)")
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
                  console.log("[v0] 🔄 User requested to clear guide prompt")
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
                    console.log("[v0] 📋 Loaded guide prompt from localStorage")
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

        console.log("[v0] 📤 Sending generate-concepts request with:", {
          userRequest: pendingConceptRequest,
          hasReferenceImage: !!referenceImageUrl,
          referenceImageUrl: referenceImageUrl ? referenceImageUrl.substring(0, 100) + "..." : undefined,
        })

        // Use reference image if available, or images from library in Pro Mode
        const allImages = referenceImageUrl 
          ? [referenceImageUrl]
          : hasImageLibrary && imageLibrary.selfies.length > 0
          ? imageLibrary.selfies.slice(0, 1) // Use first selfie as reference
          : []

        let response: Response
        try {
          // 🔴 CRITICAL FIX: Use Pro Mode API when studioProMode is true
          const apiEndpoint = studioProMode 
            ? "/api/maya/pro/generate-concepts"
            : "/api/maya/generate-concepts"
          
          console.log("[v0] 📤 Calling concept generation API:", apiEndpoint, "studioProMode:", studioProMode)
          
          // Pro Mode API expects: userRequest, imageLibrary, category (optional), essenceWords (optional)
          // Classic Mode API expects: userRequest, count, conversationContext, referenceImageUrl, studioProMode, etc.
          const requestBody = studioProMode
            ? {
                userRequest: pendingConceptRequest,
                imageLibrary: imageLibrary, // Required for Pro Mode
                category: null, // Let Maya determine dynamically
                essenceWords: pendingConceptRequest?.split(' ').slice(0, 5).join(' ') || undefined, // Extract essence words from request
                consistencyMode: consistencyMode, // NEW: Send consistency mode to backend
              }
            : {
                userRequest: pendingConceptRequest,
                count: 6, // Changed from hardcoded 3 to 6, allowing Maya to create more concepts
                // consistencyMode is Pro Mode only - not sent in Classic Mode
                conversationContext: conversationContext || undefined,
                referenceImageUrl: allImages.length > 0 ? allImages[0] : referenceImageUrl, // Primary image
                studioProMode: studioProMode, // Pass Studio Pro mode to use Nano Banana prompting
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
          isProMode: studioProMode,
        })

        if (concepts && Array.isArray(concepts) && concepts.length > 0) {
          // Find the current last assistant message ID before updating
          const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant")
          const messageId = lastAssistantMessage?.id?.toString()
          
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

          // In Studio Pro mode, show concept cards (they now support image upload/selection)
          // Workbench is kept separate for manual prompt creation
          // Always show concept cards - they work in both Classic and Studio Pro modes
          setMessages((prevMessages) => {
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
                    output: result,
                  } as any,
                ],
              }
            }
            return newMessages
          })

          // This ensures new concept cards are persisted and show in chat history
          if (chatId && concepts && concepts.length > 0) {
            // Extract text content from the message
            let textContent = ""
            if (lastAssistantMessage?.parts && Array.isArray(lastAssistantMessage.parts)) {
              const textParts = lastAssistantMessage.parts.filter((p: any) => p.type === "text")
              textContent = textParts
                .map((p: any) => p.text)
                .join("\n")
                .trim()
            }

            console.log("[v0] Saving concept cards to database:", concepts.length)

            // Remove the message from savedMessageIds so the save effect won't skip it
            // OR directly save/update the concepts
            fetch("/api/maya/save-message", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                chatId,
                role: "assistant",
                content: textContent || "",
                conceptCards: concepts,
                updateExisting: true, // Signal to update if message exists
              }),
            })
              .then((res) => res.json())
              .then((data) => {
                if (data.success) {
                  console.log("[v0] Concept cards saved successfully to database")
                  // Mark the message as saved now (with concepts)
                  if (messageId) {
                    savedMessageIds.current.add(messageId)
                  }
                } else {
                  console.error("[v0] Failed to save concept cards:", data.error)
                }
              })
              .catch((error) => {
                console.error("[v0] Error saving concept cards:", error)
              })
          }
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
  }, [pendingConceptRequest, isGeneratingConcepts, setMessages, messages, chatId])

  useEffect(() => {
    // Don't save if we're currently generating concepts - wait for them to be added first
    console.log(
      "[v0] Save effect triggered - status:",
      status,
      "chatId:",
      chatId,
      "messagesLen:",
      messages.length,
      "isGeneratingConcepts:",
      isGeneratingConcepts,
      "pendingConceptRequest:",
      !!pendingConceptRequest,
    )

    if (status !== "ready" || !chatId || messages.length === 0 || isGeneratingConcepts || pendingConceptRequest) {
      console.log("[v0] Save effect early return - conditions not met")
      return
    }

    // Find the last assistant message
    const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant")
    if (!lastAssistantMessage) {
      console.log("[v0] Save effect - no assistant message found")
      return
    }

    // Skip if already saved
    if (savedMessageIds.current.has(lastAssistantMessage.id)) {
      console.log("[v0] Save effect - message already saved:", lastAssistantMessage.id)
      return
    }

    // Check if this message has a [GENERATE_CONCEPTS] trigger but no concepts yet
    // If so, don't save yet - wait for concept generation
    const textContent = getMessageText(lastAssistantMessage)

    const hasConceptTrigger = /\[GENERATE_CONCEPTS\]/i.test(textContent)
    const hasConceptCards = lastAssistantMessage.parts?.some(
      (p: any) => p.type === "tool-generateConcepts" && p.output?.concepts?.length > 0,
    )

    console.log("[v0] Save effect - hasConceptTrigger:", hasConceptTrigger, "hasConceptCards:", hasConceptCards)

    // If there's a trigger but no concepts yet, wait for concept generation
    if (hasConceptTrigger && !hasConceptCards) {
      console.log("[v0] Message has concept trigger but no concepts yet, waiting for generation...")
      return
    }

    // Extract text content from parts for saving
    let saveTextContent = ""
    if (lastAssistantMessage.parts && Array.isArray(lastAssistantMessage.parts)) {
      const textParts = lastAssistantMessage.parts.filter((p: any) => p.type === "text")
      saveTextContent = textParts
        .map((p: any) => p.text)
        .join("\n")
        .trim()
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
    
    console.log("[v0] Save effect - extracted concept cards:", {
      conceptCardsCount: conceptCards.length,
      hasParts: !!lastAssistantMessage.parts,
      partsCount: lastAssistantMessage.parts?.length || 0,
      partsTypes: lastAssistantMessage.parts?.map((p: any) => p.type) || [],
    })

    // Only save if we have something to save
    if (!saveTextContent && conceptCards.length === 0) {
      console.log("[v0] Save effect - nothing to save (no text, no concepts)")
      return
    }

    // Mark as saved immediately to prevent duplicate saves
    savedMessageIds.current.add(lastAssistantMessage.id)

    console.log(
      "[v0] 📝 Saving assistant message with",
      conceptCards.length,
      "concept cards, text length:",
      saveTextContent.length,
    )
    // </CHANGE>

    // Save to database
    fetch("/api/maya/save-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId,
        role: "assistant",
        content: saveTextContent || "",
        conceptCards: conceptCards.length > 0 ? conceptCards : null,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          console.log("[v0] Assistant message saved successfully with concepts:", conceptCards.length)
        } else {
          console.error("[v0] Failed to save message:", data.error)
          savedMessageIds.current.delete(lastAssistantMessage.id)
        }
      })
      .catch((error) => {
        console.error("[v0] Save error:", error)
        savedMessageIds.current.delete(lastAssistantMessage.id)
      })
  }, [status, chatId, messages, isGeneratingConcepts, pendingConceptRequest]) // Updated dependency to messages

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


  const promptPoolWoman = {
    lifestyle: [
      {
        label: "Coffee Run",
        prompt: "Casual coffee run moment with cozy layered outfit",
      },
      {
        label: "Brunch Vibes",
        prompt: "Brunch date look with effortless chic styling",
      },
      {
        label: "Night Out",
        prompt: "Night out with elevated evening style",
      },
      {
        label: "Street Fashion",
        prompt: "Street style moment with trendy urban outfit",
      },
    ],
    aesthetic: [
      {
        label: "Scandinavian",
        prompt: "Scandinavian minimalism with neutral tones and clean lines",
      },
      {
        label: "Dark & Moody",
        prompt: "Dark moody aesthetic with rich tones",
      },
      {
        label: "Cozy Home",
        prompt: "Cozy home moment with comfortable relaxed style",
      },
      {
        label: "Luxury",
        prompt: "Luxury quiet elegance with sophisticated pieces",
      },
    ],
    outdoors: [
      {
        label: "Cabin Cozy",
        prompt: "Cabin cozy vibes with warm layered outfit",
      },
      {
        label: "Outdoors",
        prompt: "Outdoor moment with natural light and casual style",
      },
      {
        label: "Hiking",
        prompt: "Hiking adventure with functional sporty outfit",
      },
      {
        label: "Golden Hour",
        prompt: "Golden hour outdoor moment with soft natural light",
      },
    ],
  }

  const promptPoolMan = {
    lifestyle: [
      {
        label: "Coffee Run",
        prompt: "Casual coffee run with laid-back urban style",
      },
      {
        label: "Brunch",
        prompt: "Brunch spot with smart casual outfit",
      },
      {
        label: "Night Out",
        prompt: "Night out with sharp evening style",
      },
      {
        label: "Street Fashion",
        prompt: "Street style moment with contemporary urban look",
      },
    ],
    aesthetic: [
      {
        label: "Scandinavian",
        prompt: "Scandinavian minimal with clean architectural style",
      },
      {
        label: "Dark & Moody",
        prompt: "Dark moody aesthetic with strong contrast",
      },
      {
        label: "Cozy Home",
        prompt: "Cozy home moment with comfortable relaxed fit",
      },
      {
        label: "Luxury",
        prompt: "Luxury refined elegance with tailored pieces",
      },
    ],
    outdoors: [
      {
        label: "Cabin Cozy",
        prompt: "Cabin vibes with rugged layered style",
      },
      {
        label: "Outdoors",
        prompt: "Outdoor moment with natural setting and casual fit",
      },
      {
        label: "Sporty",
        prompt: "Sporty active look with athletic style",
      },
      {
        label: "Hiking",
        prompt: "Hiking adventure with functional outdoor gear",
      },
    ],
  }

  // Get Pro Mode quick suggestions based on categories
  const getProModeQuickSuggestions = (): Array<{ label: string; prompt: string }> => {
    const categories = ['WELLNESS', 'LUXURY', 'LIFESTYLE', 'FASHION', 'TRAVEL', 'BEAUTY']
    const suggestions: Array<{ label: string; prompt: string }> = []

    const categoryExamples: Record<string, Array<{ label: string; prompt: string }>> = {
      WELLNESS: [
        { label: 'Wellness Moment', prompt: 'Create wellness content with calm, grounded presence in minimal space' },
        { label: 'Athletic Ready', prompt: 'Alo Yoga athletic wear, natural movement, wellness aesthetic' },
      ],
      LUXURY: [
        { label: 'Quiet Luxury', prompt: 'Sophisticated editorial portrait, quiet luxury aesthetic, timeless pieces' },
        { label: 'Chic Minimal', prompt: 'Minimalist luxury look, refined styling, architectural setting' },
      ],
      LIFESTYLE: [
        { label: 'Coastal Living', prompt: 'Coastal lifestyle moment, effortless styling, natural light' },
        { label: 'Coffee Run', prompt: 'Relatable everyday moment, cafe setting, Pinterest aesthetic' },
      ],
      FASHION: [
        { label: 'Street Style', prompt: 'Editorial street style, fashion-forward outfit, urban setting' },
        { label: 'Editorial Look', prompt: 'Fashion editorial portrait, trend-aware styling, clean background' },
      ],
      TRAVEL: [
        { label: 'Airport Chic', prompt: 'Effortless travel style, airport terminal, sophisticated travel aesthetic' },
        { label: 'Destination Ready', prompt: 'Travel content, destination setting, aspirational calm energy' },
      ],
      BEAUTY: [
        { label: 'Clean Beauty', prompt: 'Natural beauty moment, fresh skin focus, editorial beauty lighting' },
        { label: 'Skincare Glow', prompt: 'Skincare routine content, glowing skin, minimal beauty aesthetic' },
      ],
    }

    // Get 1 example from each category
    categories.forEach(category => {
      const examples = categoryExamples[category]
      if (examples && examples.length > 0) {
        const randomExample = examples[Math.floor(Math.random() * examples.length)]
        suggestions.push(randomExample)
      }
    })

    // Shuffle and return 4 suggestions
    return suggestions.sort(() => Math.random() - 0.5).slice(0, 4)
  }

  const getRandomPrompts = (gender: string | null) => {
    const promptPool = gender === "woman" ? promptPoolWoman : promptPoolMan
    const allCategories = Object.values(promptPool)
    const selected: Array<{ label: string; prompt: string }> = []

    // Get 1-2 from each category, shuffled
    allCategories.forEach((category) => {
      const shuffled = [...category].sort(() => Math.random() - 0.5)
      selected.push(...shuffled.slice(0, Math.random() > 0.5 ? 2 : 1))
    })

    // Shuffle all selected and take 4
    return selected.sort(() => Math.random() - 0.5).slice(0, 4)
  }

  // Update prompts based on mode
  useEffect(() => {
    // Both modes now support quick suggestions
    const fetchUserGender = async () => {
      try {
        console.log("[v0] Fetching user gender from /api/user/profile")
        const response = await fetch("/api/user/profile")
        console.log("[v0] Profile API response status:", response.status)

        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Profile API data:", data)
          setUserGender(data.gender || null)
          
          // 🔴 FIX: Use Pro Mode prompts if in Pro Mode
          if (studioProMode) {
            // Get Pro Mode category-specific prompts
            const proPrompts = getProModeQuickSuggestions()
            console.log("[v0] Setting Pro Mode prompts:", proPrompts.length)
            setCurrentPrompts(proPrompts)
          } else {
            // Classic Mode prompts
            const prompts = getRandomPrompts(data.gender || null)
            console.log("[v0] Setting Classic Mode prompts for gender:", data.gender, "Prompts:", prompts.length)
            setCurrentPrompts(prompts)
          }
        } else {
          console.error("[v0] Profile API error:", response.status, response.statusText)
          setCurrentPrompts(hasProFeatures ? getProModeQuickSuggestions() : getRandomPrompts(null))
        }
      } catch (error) {
        console.error("[v0] Error fetching user gender:", error)
        // Fallback: use studioProMode directly if hasProFeatures not available
        setCurrentPrompts(studioProMode ? getProModeQuickSuggestions() : getRandomPrompts(null))
      }
    }
    fetchUserGender()
  }, [studioProMode])

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
  

  const handleSendMessage = async (customPrompt?: string) => {
    const messageText = customPrompt || inputValue.trim()
    if ((messageText || uploadedImage) && !isTyping) {
      // Build message content - use array format if there's an image, otherwise use string
      let messageContent: string | Array<{ type: string; text?: string; image?: string }>
      let savedMessageContent: string // For saving to database (keep the marker format for backward compatibility)

      if (uploadedImage) {
        // Use array format with both text and image for AI SDK
        const contentParts: Array<{ type: string; text?: string; image?: string }> = []
        
        if (messageText.trim()) {
          contentParts.push({
            type: "text",
            text: messageText,
          })
        }
        
        contentParts.push({
          type: "image",
          image: uploadedImage,
        })
        
        messageContent = contentParts
        // For database, keep the old format with marker for backward compatibility
        savedMessageContent = messageText ? `${messageText}\n\n[Inspiration Image: ${uploadedImage}]` : `[Inspiration Image: ${uploadedImage}]`
        console.log("[v0] ✅ Sending message with inspiration image:", uploadedImage.substring(0, 100) + "...")
      } else {
        messageContent = messageText
        savedMessageContent = messageText
      }

      console.log("[v0] 📤 Sending message with settings:", {
        styleStrength,
        promptAccuracy,
        aspectRatio,
        realismStrength, // Include realism strength in log
        hasImage: !!uploadedImage,
      })

      isAtBottomRef.current = true

      let currentChatId = chatId
      if (!currentChatId) {
        console.log("[v0] No chatId exists, creating new chat before sending message...")
        try {
          // 🔴 FIX: Use correct chatType based on mode (Pro Mode vs Classic Mode)
          const chatType = getModeString()
          const response = await fetch("/api/maya/new-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chatType }),
          })
          if (response.ok) {
            const data = await response.json()
            if (data.chatId) {
              currentChatId = data.chatId
              setChatId(data.chatId)
              setChatTitle("New Chat")
              console.log("[v0] Created new chat with ID:", data.chatId, "chatType:", chatType)
            }
          }
        } catch (error) {
          console.error("[v0] Error creating new chat:", error)
        }
      }

      // Save user message with the current chatId (using savedMessageContent for backward compatibility)
      if (currentChatId) {
        fetch("/api/maya/save-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            chatId: currentChatId,
            role: "user",
            content: savedMessageContent,
          }),
        }).catch((error) => {
          console.error("[v0] Error saving user message:", error)
        })
      }

      // Send message using proper format - use 'parts' array for multimodal content
      if (typeof messageContent === "string") {
        sendMessage({
          role: "user",
          parts: [{ type: "text", text: messageContent }],
          // experimental_providerMetadata removed - not supported in AI SDK
        })
      } else {
        // Array format for messages with images - convert to parts format
        sendMessage({
          role: "user",
          parts: messageContent.map((part) => {
            if (part.type === "text") {
              return { type: "text", text: part.text || "" }
            } else if (part.type === "image") {
              return { type: "image", image: part.image || "" }
            }
            return part
          }) as any, // Type assertion for parts array
          // experimental_providerMetadata removed - not supported in AI SDK
        })
      }
      setInputValue("")
      setUploadedImage(null)
    }
  }

  // Wrapper for handleNewChat that adds component-specific logic
  const handleNewChat = useCallback(async () => {
    // In Pro Mode, "New Project" should clear library (like "Start Fresh")
    if (hasProFeatures) {
      // Show confirmation dialog for Pro Mode (matching Start Fresh behavior)
      if (!confirm('Are you sure you want to start a new project? This will clear your image library and start fresh.')) {
        return
      }
      // Clear library before creating new chat
      await clearLibrary()
    }
    
    // Reset component-specific state for new chat
    setSelectedPrompt("")
    setMessagesWithUploadModule(new Set())
    setPendingConceptRequest(null)
      promptGenerationTriggeredRef.current.clear() // Clear prompt generation tracking

    // Clear shared images when starting new chat
    clearSharedImages()

    // Call hook's base handler
    await baseHandleNewChat()
  }, [studioProMode, clearLibrary, baseHandleNewChat, clearSharedImages])

  // Handle mode switching - creates a new chat when switching between Classic and Studio Pro
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
          promptText: concept.fullPrompt || concept.prompt || concept.description,
          conceptTitle: concept.title || concept.label,
          conceptDescription: concept.description,
          category: concept.category || selectedGuideCategory || "General",
          imageUrl: imageUrl || null,
          replicatePredictionId: null,
          generationSettings: {},
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
        toast({
          title: "Saved to guide! ✨",
          description: `Added "${concept.title || concept.label}" ${imageUrl ? 'with image' : ''} to your guide`,
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
    if (studioProMode === newMode) {
      console.log("[v0] Mode switch skipped - already in", newMode ? "Pro" : "Classic", "mode")
      return
    }

    console.log("[v0] 🔄 Switching mode:", {
      from: studioProMode ? "Pro" : "Classic",
      to: newMode ? "Pro" : "Classic",
      forcedMode: forcedStudioProMode
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
      setStudioProMode(newMode)
      
      // Then reset chat state
      setChatId(data.chatId)
      setChatTitle("New Chat")
      setMessages([])
      savedMessageIds.current.clear()
      setUploadedImages([]) // Clear Pro mode images
      setPromptSuggestions([]) // Clear prompt suggestions
      promptGenerationTriggeredRef.current.clear() // Clear prompt generation tracking

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

  // Wrapper for handleSelectChat that adds component-specific logic
  const handleSelectChat = useCallback((selectedChatId: number, selectedChatTitle?: string) => {
      promptGenerationTriggeredRef.current.clear() // Clear prompt generation tracking
    setShowHistory(false) // Close history panel
    baseHandleSelectChat(selectedChatId, selectedChatTitle)
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
    setShowNavMenu(false)
  }

  // Studio Pro: Handle product image upload
  const handleProductUpload = async (e: any) => {
    const files = Array.from(e.target?.files || []) as File[]
    if (files.length === 0) return

    // Check total limit
    const currentCount = uploadedImages.length
    const remainingSlots = 14 - currentCount
    const filesToUpload = files.slice(0, remainingSlots)
    
    if (files.length > remainingSlots) {
      alert(`Only ${remainingSlots} more image${remainingSlots !== 1 ? 's' : ''} can be added (14 total limit)`)
    }

    try {
      setIsUploadingImage(true)
      
      // Upload all files
      for (const file of filesToUpload) {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) throw new Error('Upload failed')

        const { url } = await response.json()

        // Prompt for product label
        const label = prompt(`What product is this? (${file.name})`) || 'Product'

        // Add to uploaded images
        setUploadedImages(prev => [
          ...prev,
          {
            url,
            type: 'product',
            source: 'upload',
            label
          }
        ])

        console.log('[STUDIO-PRO] Product uploaded:', label)
      }
    } catch (error) {
      console.error('[STUDIO-PRO] Upload error:', error)
      alert('Failed to upload image. Please try again.')
    } finally {
      setIsUploadingImage(false)
    }
  }

  // Studio Pro: Clear all uploaded images
  const clearStudioProImages = () => {
    setUploadedImages([])
  }

  // Studio Pro: Generate content
  const generateStudioProContent = async (mode: string, prompt: string) => {
    try {
      setIsGeneratingStudioPro(true)

      // Prepare input images from uploaded images
      const baseImages = uploadedImages
        .filter(img => img.type === 'base')
        .map(img => ({ url: img.url, type: 'user-photo' }))
      
      const productImages = uploadedImages
        .filter(img => img.type === 'product')
        .map(img => ({ url: img.url, label: img.label || 'product' }))

      if (baseImages.length === 0) {
        alert('Please select at least one base image from your gallery')
        setIsGeneratingStudioPro(false)
        return
      }

      // Validate total image count (Nano Banana Pro supports up to 14 images)
      const totalImages = baseImages.length + productImages.length
      if (totalImages > 14) {
        alert(`Too many images selected. Maximum 14 images allowed (you have ${totalImages}).`)
        setIsGeneratingStudioPro(false)
        return
      }

      const response = await fetch('/api/maya/generate-studio-pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          userRequest: prompt,
          inputImages: {
            baseImages,
            productImages
          },
          resolution: '2K',
          aspectRatio: '1:1'
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || 'Generation failed'
        
        // Handle insufficient credits
        if (response.status === 402) {
          console.error('[STUDIO-PRO] Insufficient credits:', errorMessage)
          // Show buy credits modal instead of alert
          setShowBuyCreditsModal(true)
        } else {
          console.error('[STUDIO-PRO] Generation failed:', errorMessage)
          alert(`Failed to generate: ${errorMessage}`)
        }
        
        throw new Error(errorMessage)
      }

      const result = await response.json()

      // Poll for completion
      pollStudioProStatus(result.predictionId)

    } catch (error) {
      console.error('[STUDIO-PRO] Generation error:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      // Check if error is about insufficient credits
      if (errorMessage.toLowerCase().includes("insufficient credits") || 
          errorMessage.toLowerCase().includes("insufficient credit")) {
        setShowBuyCreditsModal(true)
      }
      
      setIsGeneratingStudioPro(false)
    }
  }

  // Studio Pro: Poll status
  const pollStudioProStatus = async (predictionId: string) => {
    const maxAttempts = 60 // 5 minutes max
    let attempts = 0

    const checkStatus = async () => {
      try {
        const response = await fetch(
          `/api/maya/check-studio-pro?predictionId=${predictionId}`
        )
        const status = await response.json()

        if (status.status === 'succeeded') {
          setIsGeneratingStudioPro(false)
          
          // Refresh gallery to show new image
          if (studioProMode) {
            loadGalleryImages()
          }
          
          // Add result to messages
          setMessages(prev => {
            const newMessages = [...prev]
            const lastIndex = newMessages.length - 1
            
            if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
              newMessages[lastIndex] = {
                ...newMessages[lastIndex],
                parts: [
                  ...(newMessages[lastIndex].parts || []),
                  {
                    type: 'studio-pro-result',
                    output: {
                      state: 'ready',
                      imageUrl: status.output
                    }
                  } as any
                ]
              }
            }
            
            return newMessages
          })
          
          return
        }

        if (status.status === 'failed') {
          setIsGeneratingStudioPro(false)
          alert('Generation failed. Please try again.')
          return
        }

        // Still processing - check again
        if (attempts < maxAttempts) {
          attempts++
          setTimeout(checkStatus, 5000) // Check every 5 seconds
        } else {
          setIsGeneratingStudioPro(false)
        }

      } catch (error) {
        console.error('[STUDIO-PRO] Status check error:', error)
        setIsGeneratingStudioPro(false)
      }
    }

    checkStatus()
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
    if (!text || !studioProMode) return []
    
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
              <strong key={`bold-${partIdx}`} className="font-semibold text-stone-950">
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
                <li key={itemIdx} className="text-sm leading-relaxed text-stone-700">
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
                <strong key={`bold-${partIdx}`} className="font-semibold text-stone-950">
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
              <p key={`para-${index}`} className="text-sm leading-relaxed text-stone-700 mb-2 last:mb-0">
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
            <li key={itemIdx} className="text-sm leading-relaxed text-stone-700">
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
            <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-white/60 shadow-lg">
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
      <div className="text-sm leading-relaxed text-stone-700">
        {renderMarkdownText(cleanedText)}
      </div>
    )
  }

  if (isLoadingChat) {
    return <UnifiedLoading message="Loading chat..." />
  }

  const isEmpty = !messages || messages.length === 0

  // NOTE: Workbench should always be available in Studio Pro mode for manual creation
  // Therefore, we always show the chat UI when in Studio Pro mode, which includes the workbench
  // The old ProModeWrapper (form-based interface) has been removed in favor of the workbench-based chat UI

  return (
    <>
    <div
      className="flex flex-col h-full bg-linear-to-b from-stone-50 to-white relative"
      style={{
        paddingBottom: '80px', // Space for bottom navigation (approx 60-70px nav + safe area)
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white/90 backdrop-blur-xl border-2 border-dashed border-stone-400 rounded-3xl p-12 text-center max-w-md mx-4">
            <Camera size={48} className="mx-auto mb-4 text-stone-600" strokeWidth={1.5} />
            <h3 className="text-xl font-serif font-extralight tracking-[0.2em] uppercase text-stone-950 mb-2">
              Drop Image Here
            </h3>
            <p className="text-sm text-stone-600 tracking-wide">Upload a reference image for Maya to work with</p>
          </div>
        </div>
      )}

      {/* Fixed Header with Integrated Tabs - Always visible */}
      {/* Mobile optimized: safe area insets, responsive padding */}
      {/* Using z-[100] to ensure it's above all other content */}
      <div 
        className="fixed top-0 left-0 right-0 z-[100] bg-white/95 backdrop-blur-xl shadow-sm"
        style={{
          paddingTop: 'max(0.625rem, env(safe-area-inset-top, 0px))',
        }}
      >
        <MayaHeader
          studioProMode={studioProMode}
          chatTitle={chatTitle}
          showNavMenu={showNavMenu}
          onToggleNavMenu={() => setShowNavMenu(!showNavMenu)}
          onModeSwitch={handleModeSwitch}
          libraryCount={libraryTotalImages}
          credits={creditBalance}
          onManageLibrary={() => setShowLibraryModal(true)}
          onAddImages={() => setShowUploadFlow(true)}
          onStartFresh={async () => {
            if (confirm('Are you sure you want to start fresh? This will clear your image library.')) {
              await clearLibrary()
              setMessages([])
              handleNewChat()
            }
          }}
          isAdmin={isAdmin}
          selectedGuideId={selectedGuideId}
          selectedGuideCategory={selectedGuideCategory}
          onGuideChange={onGuideChange}
          userId={userId}
          onEditIntent={async () => {
            const newIntent = prompt('Enter your creative intent:', imageLibrary.intent || '')
            if (newIntent !== null) {
              await updateIntent(newIntent)
            }
          }}
          onNavigation={handleNavigation}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
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
              }
              window.history.replaceState(null, "", hashMap[tab] || "#maya")
            }
          }}
          photosCount={undefined} // Can be added later if needed
          videosCount={undefined} // Can be added later if needed
        />
      </div>

      {/* Training Prompt - Show if user doesn't have trained model */}
      {!hasTrainedModel && (
        <div className="shrink-0 mx-3 sm:mx-4 mt-4 mb-4">
          <div className={`${DesignClasses.card} text-center`}>
            <div className={`w-16 h-16 sm:w-20 sm:h-20 bg-white/70 ${DesignClasses.blur.md} ${DesignClasses.radius.md} flex items-center justify-center mx-auto ${DesignClasses.spacing.marginBottom.md} ${DesignClasses.border.strong} ${DesignClasses.shadows.button}`}>
              <Aperture size={28} className="sm:w-8 sm:h-8" strokeWidth={1.5} />
            </div>

            <h2 className={`${DesignClasses.typography.heading.h3} ${DesignClasses.text.primary} ${DesignClasses.spacing.marginBottom.md} px-4`}>
              Train Your AI First
            </h2>

            <p className={`${DesignClasses.typography.body.medium} ${DesignClasses.text.secondary} mb-6 sm:mb-8 max-w-md mx-auto leading-relaxed px-4`}>
              Before you can create stunning photos with Maya, you need to train your personal AI model with your selfies.
            </p>

                <button
                  onClick={() => {
                    // Trigger onboarding wizard instead of navigating to training tab
                    window.dispatchEvent(new CustomEvent('open-onboarding'))
                  }}
                  className={`group relative ${DesignClasses.buttonPrimary} min-h-[52px] sm:min-h-[60px] overflow-hidden w-full sm:w-auto`}
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Start Training Now
                    <ChevronRight
                      size={14}
                      strokeWidth={1.5}
                      className="group-hover:translate-x-1 transition-transform duration-500"
                    />
                  </span>
                </button>
          </div>
        </div>
      )}

      {/* Old Simplified Studio Pro Guidance removed - now using ImageUploadFlow component */}

      {/* Old Studio Pro Controls removed - now using ImageUploadFlow component */}

      {/* Gallery Selector Modal */}
      {showGallerySelector && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Select Base Images from Gallery</h3>
                <p className="text-xs text-stone-600 mt-1">
                  {uploadedImages.length} / 14 images selected • Click images to add
                </p>
              </div>
              <button
                onClick={() => setShowGallerySelector(false)}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
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
                    className="relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-stone-900 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <img 
                      src={image.image_url} 
                      alt="Gallery image"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-2">
                      <span className="text-white text-xs font-medium">Select</span>
                    </div>
                  </button>
                ))}
              </div>
              
              {galleryImages.length === 0 && (
                <div className="text-center py-12">
                  <Camera className="w-12 h-12 mx-auto text-stone-300 mb-3" />
                  <p className="text-sm text-stone-600">No images in gallery yet</p>
                  <p className="text-xs text-stone-400 mt-1">Generate some photos with Maya first!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showNavMenu && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-stone-950/20 backdrop-blur-sm z-40 animate-in fade-in duration-200"
            onClick={() => setShowNavMenu(false)}
          />

          {/* Sliding menu from right */}
          <div className="fixed top-0 right-0 bottom-0 w-80 bg-white/95 backdrop-blur-3xl border-l border-stone-200 shadow-2xl z-50 animate-in slide-in-from-right duration-300 flex flex-col">
            {/* Header with close button - fixed at top */}
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-stone-200/50">
              <h3 className="text-sm font-serif font-extralight tracking-[0.2em] uppercase text-stone-950">Menu</h3>
              <button
                onClick={() => setShowNavMenu(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 transition-colors"
                aria-label="Close menu"
              >
                <X size={18} className="text-stone-600" strokeWidth={2} />
              </button>
            </div>

            {/* Credits display - fixed below header */}
            <div className="shrink-0 px-6 py-6 border-b border-stone-200/50">
              <div className="text-[10px] tracking-[0.15em] uppercase font-light text-stone-500 mb-2">Your Credits</div>
              <div className="text-3xl font-serif font-extralight text-stone-950 tabular-nums">
                {creditBalance.toFixed(1)}
              </div>
            </div>

            {/* Navigation links - scrollable middle section with bottom padding */}
            <div className="flex-1 overflow-y-auto py-2 pb-32 min-h-0">
              <button
                onClick={() => handleNavigation("maya")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <Home size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Studio</span>
              </button>
              <button
                onClick={() => {
                  // Training moved to Account → Settings, trigger onboarding if needed
                  window.dispatchEvent(new CustomEvent('open-onboarding'))
                }}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <Aperture size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Training</span>
              </button>
              <button
                onClick={() => handleNavigation("maya")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left bg-stone-100/50 border-l-2 border-stone-950"
              >
                <MessageCircle size={18} className="text-stone-950" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-950">Maya</span>
              </button>
              <button
                onClick={() => handleNavigation("gallery")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <ImageIcon size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Gallery</span>
              </button>
              <button
                onClick={() => handleNavigation("academy")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <Grid size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Academy</span>
              </button>
              <button
                onClick={() => handleNavigation("account")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <User size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Account</span>
              </button>
            </div>

            {/* Sign out button - fixed at bottom */}
            <div className="shrink-0 px-6 py-4 border-t border-stone-200/50 bg-white/95">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                <LogOut size={16} strokeWidth={2} />
                <span>{isLoggingOut ? "Signing Out..." : "Sign Out"}</span>
              </button>
            </div>
          </div>
        </>
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
          chatType={getModeString()}
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
        studioProMode={studioProMode}
      />

      {/* Tab Content - Photos Tab */}
      {/* Add padding-top to account for fixed header + tabs, padding-bottom for fixed input */}
      {activeMayaTab === "photos" && (
        <>
          <div 
            className="flex-1 min-h-0 flex flex-col"
            style={{
              paddingBottom: '140px', // Space for fixed bottom input
            }}
          >
      <MayaChatInterface
        messages={messages}
        filteredMessages={filteredMessages}
        setMessages={setMessages}
        studioProMode={studioProMode}
        isTyping={isTyping}
        isGeneratingConcepts={isGeneratingConcepts}
        isGeneratingStudioPro={isGeneratingStudioPro}
        contentFilter={contentFilter}
        messagesContainerRef={messagesContainerRef}
        messagesEndRef={messagesEndRef}
        showScrollButton={showScrollButton}
        isAtBottomRef={isAtBottomRef}
        scrollToBottom={scrollToBottom}
        chatId={chatId}
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
        generateCarouselRef={generateCarouselRef}
      />
          {/* Empty State - Pro Features: Image Upload Flow, Classic: Welcome Screen */}
          {isEmpty && hasProFeatures && !isTyping && (
            <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
              <div className="max-w-2xl w-full space-y-8">
                {/* Show ImageUploadFlow if library is empty, otherwise show welcome */}
                {libraryTotalImages === 0 ? (
                  <ImageUploadFlow
                    initialLibrary={imageLibrary}
                    onComplete={async (library) => {
                      console.log("[v0] [Pro Features] Image upload flow completed:", library)
                      
                      // Save library using the hook
                      await saveLibrary(library)
                      
                      // If intent was provided, update it
                      if (library.intent) {
                        await updateIntent(library.intent)
                      }
                      
                      // Trigger concept generation with the library
                      if (sendMessage && library.selfies.length > 0) {
                        // Build message with intent
                        const messageText = library.intent || "I'm ready to create concepts with my images"
                        
                        // Add all images to message
                        const allImages = [
                          ...library.selfies,
                          ...library.products,
                          ...library.people,
                          ...library.vibes,
                        ]
                        
                        const messageParts: Array<{ type: string; text?: string; image?: string }> = []
                        
                        // Add text part
                        if (messageText) {
                          messageParts.push({ type: "text", text: messageText })
                        }
                        
                        // Add all images
                        allImages.forEach(imageUrl => {
                          messageParts.push({ type: "image", image: imageUrl })
                        })
                        
                        console.log("[v0] [PRO MODE] Sending message to Maya with library:", {
                          text: messageText,
                          imageCount: allImages.length,
                          selfies: library.selfies.length,
                          products: library.products.length,
                          people: library.people.length,
                          vibes: library.vibes.length,
                          intent: library.intent,
                        })
                        
                        sendMessage({
                          role: "user",
                          parts: messageParts as any, // Type assertion for parts array
                        })
                      }
                    }}
                    onStartCreating={async () => {
                      // 🔴 FIX: Navigate to creation flow after "Start Creating" button
                      console.log("[v0] [PRO MODE] Start Creating clicked - triggering concept generation")
                      
                      // Ensure library is saved
                      await saveLibrary(imageLibrary)
                      
                      // If intent exists, update it
                      if (imageLibrary.intent) {
                        await updateIntent(imageLibrary.intent)
                      }
                      
                      // Trigger concept generation by sending a message to Maya
                      if (sendMessage && imageLibrary.selfies.length > 0) {
                        const messageText = imageLibrary.intent || "I'm ready to create concepts with my images"
                        
                        const allImages = [
                          ...imageLibrary.selfies,
                          ...imageLibrary.products,
                          ...imageLibrary.people,
                          ...imageLibrary.vibes,
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
                      }
                    }}
                    onManageCategory={(category) => {
                      // 🔴 FIX: Open manage modal for category
                      console.log("[v0] [Pro Features] Manage category clicked:", category)
                      // Open library modal - it will show all categories, user can manage from there
                      setShowLibraryModal(true)
                    }}
                    onCancel={() => {
                      // Allow canceling - user can start chat without images
                      console.log("[v0] [Pro Features] Image upload flow cancelled")
                    }}
                  />
                ) : (
                  // Welcome message when library has images - matches Classic styling
                  <div className="flex flex-col items-center justify-center text-center space-y-6">
                    {/* Maya's Avatar - same styling as Classic */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-stone-200/60 overflow-hidden">
                      <img
                        src="https://i.postimg.cc/fTtCnzZv/out-1-22.png"
                        alt="Maya"
                        className="w-full h-full object-cover"
                      />
                    </div>
                        <div className="space-y-3">
                      <h2 className="text-xl sm:text-2xl font-serif font-extralight tracking-[0.3em] text-stone-950 uppercase">
                        Welcome
                      </h2>
                      <p className="text-xs sm:text-sm text-stone-600 tracking-wide max-w-md leading-relaxed px-4">
                        Hi, I'm Maya. I'll help you create beautiful photos and videos.
                      </p>
                        </div>

                    {/* Quick Suggestion Prompts - use same variant as Classic Mode for consistency */}
                          <MayaQuickPrompts
                            prompts={currentPrompts}
                            onSelect={handleSendMessage}
                            disabled={isTyping || isGeneratingConcepts}
                      variant="empty-state"
                            studioProMode={studioProMode}
                            isEmpty={isEmpty}
                          />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Classic Mode Empty State */}
          {isEmpty && !studioProMode && !isTyping && (
            <div className="flex flex-col items-center justify-center h-full px-4 py-8 animate-in fade-in duration-500">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-stone-200/60 overflow-hidden mb-4 sm:mb-6">
                <img
                  src="https://i.postimg.cc/fTtCnzZv/out-1-22.png"
                  alt="Maya"
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-extralight tracking-[0.3em] text-stone-950 uppercase mb-2 sm:mb-3 text-center">
                Welcome
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 tracking-wide text-center mb-4 sm:mb-6 max-w-md leading-relaxed px-4">
                Hi, I'm Maya. I'll help you create beautiful photos and videos.
              </p>
              <MayaQuickPrompts
                prompts={currentPrompts}
                onSelect={handleSendMessage}
                disabled={isTyping}
                variant="empty-state"
                studioProMode={studioProMode}
              />
            </div>
          )}
          </div>

          {/* Fixed Bottom Input Area - Only show in Photos tab */}
      {/* Positioned above bottom navigation (nav is ~70px tall) */}
      {/* Subtle background for contrast - positioned above nav, z-index below nav */}
      <div
            className="fixed left-0 right-0 bg-white/60 backdrop-blur-md border-t border-stone-200/30 px-3 sm:px-4 py-2.5 sm:py-3 z-[65] safe-bottom flex flex-col"
        style={{
          bottom: '80px', // Position above bottom navigation with extra spacing
          paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)",
          maxHeight: 'calc(100vh - 80px)', // Prevent extending beyond viewport
        }}
      >
        {/* Classic Mode Quick Actions */}
        <MayaQuickPrompts
          prompts={currentPrompts}
          onSelect={handleSendMessage}
          disabled={isTyping}
          variant="input-area"
          studioProMode={studioProMode}
          isEmpty={isEmpty}
          uploadedImage={uploadedImage}
        />

        {uploadedImage && (
          <div className="mb-2 relative inline-block">
            <div className="relative w-20 h-20 sm:w-16 sm:h-16 rounded-lg overflow-hidden border border-white/60 shadow-lg">
              <img src={uploadedImage || "/placeholder.svg"} alt="Inspiration" className="w-full h-full object-cover" />
              <button
                onClick={() => setUploadedImage(null)}
                className="absolute top-1 right-1 w-6 h-6 bg-stone-950 text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform touch-manipulation"
                aria-label="Remove image"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>
            <p className="text-xs text-stone-600 mt-1 tracking-wide">Inspiration Image</p>
          </div>
        )}

        {/* Input Area - Unified for both Classic and Pro Mode */}
        {/* Pro Feature: Generation Options (collapsible section with quick prompts and concept consistency)
            Progressive enhancement: This section only appears when Pro features are enabled */}
        {studioProMode && (
            <div 
              className="w-full border-b border-stone-200/30"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.4)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div className="max-w-[1200px] mx-auto">
                {/* Collapsible Header */}
                <button
                  onClick={() => setIsOptionsExpanded(!isOptionsExpanded)}
                  className="w-full flex items-center justify-between px-4 sm:px-6 py-3 hover:bg-stone-50/50 transition-colors touch-manipulation"
                  style={{
                    paddingLeft: 'clamp(12px, 3vw, 24px)',
                    paddingRight: 'clamp(12px, 3vw, 24px)',
                  }}
                >
                  <span
                  className="text-xs sm:text-sm font-serif font-extralight tracking-[0.2em] uppercase text-stone-600"
                  title="Advanced generation options: Quick prompts and concept consistency controls"
                  >
                    Generation Options
                  </span>
                  <ChevronDown
                    size={18}
                    className="text-stone-500 transition-transform duration-200"
                    style={{
                      transform: isOptionsExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  />
                </button>

                {/* Collapsible Content */}
                {isOptionsExpanded && (
                  <div 
                    className="px-4 sm:px-6 pb-4 space-y-4"
                    style={{
                      paddingLeft: 'clamp(12px, 3vw, 24px)',
                      paddingRight: 'clamp(12px, 3vw, 24px)',
                      paddingBottom: 'clamp(12px, 3vw, 16px)',
                    }}
                  >
                    {/* Quick Suggestions */}
                    <MayaQuickPrompts
                      prompts={currentPrompts}
                      onSelect={handleSendMessage}
                      disabled={isTyping || isGeneratingConcepts}
                      variant="pro-mode-options"
                      studioProMode={studioProMode}
                      isEmpty={isEmpty}
                      uploadedImage={uploadedImage}
                    />

                    {/* Concept Consistency Toggle */}
                    <div className="border-t border-stone-200/50 pt-4">
                      <ConceptConsistencyToggle
                        value={consistencyMode}
                        onChange={handleConsistencyModeChange}
                        count={6}
                        className=""
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
        )}

        {/* Unified Input Component - Works for both Classic and Pro Mode */}
        <MayaUnifiedInput
              onSend={(message, imageUrl) => {
            // Handle message sending - match Pro Mode pattern
                if (imageUrl) {
              // Set uploaded image state first, then send message
                  setUploadedImage(imageUrl)
              // Use message if provided, otherwise handleSendMessage will use inputValue (though unified component manages its own)
              const messageToSend = message || ""
                  if (messageToSend || imageUrl) {
                handleSendMessage(messageToSend || undefined)
                  }
                } else {
                  // Just send text message
              handleSendMessage(message || undefined)
            }
          }}
          onImageUpload={hasProFeatures ? () => setShowUploadFlow(true) : undefined}
          onFileChange={hasProFeatures ? undefined : handleImageUpload}
          fileInputRef={hasProFeatures ? undefined : fileInputRef}
          uploadedImage={uploadedImage}
          isUploadingImage={isUploadingImage}
          onRemoveImage={() => setUploadedImage(null)}
              isLoading={isTyping || isGeneratingConcepts}
              disabled={isTyping || isGeneratingConcepts}
          placeholder={hasProFeatures ? "What would you like to create?" : "Message Maya..."}
          showSettingsButton={!hasProFeatures}
          onSettingsClick={() => setShowChatMenu(!showChatMenu)}
          showLibraryButton={false} // Removed - image icon handles library access
          onManageLibrary={undefined} // Removed - image icon handles library access
          onNewProject={handleNewChat}
          onHistory={() => hasProFeatures ? setShowProModeHistory(true) : setShowHistory(true)}
          studioProMode={studioProMode}
        />
          </div>
        </>
      )}

      {/* Tab Content - Videos Tab */}
      {activeMayaTab === "videos" && (
        <div
          style={{
            // Header (~56-64px) + Tabs (~50px) + safe area = ~106-114px total
            paddingTop: 'calc(106px + max(0.625rem, env(safe-area-inset-top, 0px)))',
            paddingBottom: '20px', // Space for content
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
          />
        </div>
      )}

      {/* Tab Content - Prompts Tab */}
      {activeMayaTab === "prompts" && (
        <div
          style={{
            // Header (~56-64px) + Tabs (~50px) + safe area = ~106-114px total
            paddingTop: 'calc(106px + max(0.625rem, env(safe-area-inset-top, 0px)))',
            paddingBottom: '20px', // Space for content
          }}
        >
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
          />
        </div>
      )}

      {/* Tab Content - Training Tab */}
      {activeMayaTab === "training" && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-12">
              <GraduationCap size={48} className="mx-auto mb-4 text-stone-400" strokeWidth={1.5} />
              <h2 className="text-xl sm:text-2xl font-serif font-extralight tracking-[0.2em] uppercase text-stone-950 mb-3">
                Training Tab
              </h2>
              <p className="text-sm text-stone-600 max-w-md mx-auto mb-6">
                Train your personal AI model with your selfies. This takes about 5 minutes and you only need to do it once.
              </p>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('open-onboarding'))
                }}
                className="px-6 py-3 bg-stone-950 text-white rounded-lg hover:bg-stone-800 transition-colors text-sm font-medium tracking-wide uppercase"
              >
                Start Training
              </button>
            </div>
            </div>
          </div>
        )}

        {/* Studio Pro Onboarding Modal - Rendered via Portal to avoid stacking context issues */}
        {showStudioProOnboarding && typeof window !== 'undefined' && createPortal(
          <div 
            className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center p-4 overflow-y-auto" 
            onClick={() => setShowStudioProOnboarding(false)}
            style={{ zIndex: 9999 }}
          >
            <div
              className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full my-4 sm:my-8 shadow-xl relative flex flex-col max-h-[calc(100vh-2rem)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setShowStudioProOnboarding(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-600 transition-colors rounded-full hover:bg-stone-100 z-10"
                aria-label="Close"
              >
                <X size={20} strokeWidth={2} />
              </button>
              
              {/* Header */}
              <h2 className="text-xl font-serif font-light tracking-[0.15em] uppercase text-stone-900 mb-2 pr-8">
                Studio Pro
              </h2>
              <p className="text-sm text-stone-600 mb-6 leading-relaxed">
                Professional content creation guided by Maya
              </p>
              
              {/* Content */}
              <div className="space-y-6 overflow-y-auto flex-1 min-h-0 pb-4">
                
                {/* Step 1 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-stone-900 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-serif">1</span>
                    </div>
                    <h3 className="text-sm font-medium text-stone-900 tracking-wide">
                      Tell Maya What You Want
                    </h3>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed ml-11">
                    Describe the content you want to create. Examples: "Alo Yoga style workout photos", "Professional LinkedIn headshot", or "Coffee shop entrepreneur vibes"
                  </p>
                </div>
                
                {/* Step 2 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-stone-900 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-serif">2</span>
                    </div>
                    <h3 className="text-sm font-medium text-stone-900 tracking-wide">
                      Choose Your Concept
                    </h3>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed ml-11">
                    Maya creates 3 professional concepts for you. Each concept includes a detailed prompt you can use as-is or customize.
                  </p>
                </div>
                
                {/* Step 3 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-stone-900 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-serif">3</span>
                    </div>
                    <h3 className="text-sm font-medium text-stone-900 tracking-wide">
                      Add Your Images
                    </h3>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed ml-11">
                    Select at least one image from your gallery or upload new photos. You can add up to 4 reference images per concept.
                  </p>
                </div>
                
                {/* Step 4 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-stone-900 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-serif">4</span>
                    </div>
                    <h3 className="text-sm font-medium text-stone-900 tracking-wide">
                      Generate
                    </h3>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed ml-11">
                    Click the generate button to create your professional content. Each generation costs 5 credits and takes about 30 seconds.
                  </p>
                </div>
                
                {/* Pro Tips */}
                <div className="border-t border-stone-200 pt-4 mt-6">
                  <h3 className="text-xs tracking-[0.15em] uppercase text-stone-900 font-medium mb-3">
                    Pro Tips
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-xs text-stone-900 mt-0.5">—</span>
                      <p className="text-xs text-stone-600 leading-relaxed flex-1">
                        Click the three-dot menu on any concept to view or edit the detailed prompt
                      </p>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-xs text-stone-900 mt-0.5">—</span>
                      <p className="text-xs text-stone-600 leading-relaxed flex-1">
                        Your first image should be your main photo. Additional images can be style references
                      </p>
                    </li>
                  </ul>
                </div>
                
              </div>
              
              {/* Footer Button */}
              <div className="pt-4 border-t border-stone-200">
                <button
                  onClick={() => setShowStudioProOnboarding(false)}
                  className="w-full py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors text-sm font-medium tracking-wide uppercase"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {showChatMenu && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-white/95 backdrop-blur-3xl border border-stone-200 rounded-2xl overflow-hidden shadow-xl shadow-stone-950/10 animate-in slide-in-from-bottom-2 duration-300">
            {studioProMode ? (
              // Studio Pro Mode Menu (text-only, no icons)
              <>
                <button
                  onClick={() => {
                    // Upload functionality will be handled by new Pro Mode system
                    console.log("[v0] New reference images clicked - new Pro Mode system will handle this")
                    setShowChatMenu(false)
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-stone-700 hover:bg-stone-50 transition-colors border-b border-stone-100 touch-manipulation"
                >
                  <span className="font-medium">New reference images</span>
                </button>
                <button
                  onClick={() => {
                    handleNewChat()
                    setShowChatMenu(false)
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-stone-700 hover:bg-stone-50 transition-colors border-b border-stone-100 touch-manipulation"
                >
                  <span className="font-medium">New chat</span>
                </button>
                <button
                  onClick={() => {
                    setShowHistory(!showHistory)
                    setShowChatMenu(false)
                  }}
                  className="w-full px-4 py-3 text-left text-sm text-stone-700 hover:bg-stone-50 transition-colors touch-manipulation"
                >
                  <span className="font-medium">Chat history</span>
                </button>
              </>
            ) : (
              // Classic Mode Menu (with icons) - Only settings-related items (removed duplicates that are now in bottom nav or as icon buttons)
              <>
                <button
                  onClick={() => {
                    setShowSettings(!showSettings)
                    setShowChatMenu(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-stone-700 hover:bg-stone-50 transition-colors touch-manipulation"
                >
                  <Sliders size={18} strokeWidth={2} />
                  <span className="font-medium">Generation Settings</span>
                </button>
              </>
            )}
          </div>
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
          onStartFresh={async () => {
            if (confirm('Are you sure you want to start fresh? This will clear your image library.')) {
              await clearLibrary()
              setMessages([])
              handleNewChat()
              setShowLibraryModal(false)
            }
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
          chatType="pro"
        />
      )}

      {/* Pro Feature: Image Upload Flow Modal (Pro Mode only - for library management) */}
      {hasProFeatures && showUploadFlow && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between">
              <h3 className="text-lg font-medium">Add Images to Library</h3>
              <button
                onClick={() => setShowUploadFlow(false)}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <X size={20} />
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
                  // Close modal after saving when editing
                  if (manageCategory) {
                    setShowUploadFlow(false)
                    setManageCategory(null)
                    setShowLibraryModal(true) // Reopen library modal to show updated library
                  }
                }}
                onStartCreating={async () => {
                  // 🔴 FIX: Navigate to creation flow after "Start Creating" button
                  console.log("[v0] [PRO MODE] Start Creating clicked from upload flow modal")
                  
                  await saveLibrary(imageLibrary)
                  if (imageLibrary.intent) {
                    await updateIntent(imageLibrary.intent)
                  }
                  
                  if (sendMessage && imageLibrary.selfies.length > 0) {
                    const messageText = imageLibrary.intent || "I'm ready to create concepts with my images"
                    const allImages = [
                      ...imageLibrary.selfies,
                      ...imageLibrary.products,
                      ...imageLibrary.people,
                      ...imageLibrary.vibes,
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
                  // 🔴 FIX: Open manage modal for category
                  console.log("[v0] [PRO MODE] Manage category from upload flow:", category)
                  setShowUploadFlow(false)
                  setShowLibraryModal(true)
                }}
                onCancel={() => {
                  setShowUploadFlow(false)
                  setManageCategory(null)
                  // Reopen library modal when canceling from edit mode
                  if (manageCategory) {
                    setTimeout(() => {
                      setShowLibraryModal(true)
                    }, 100)
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
