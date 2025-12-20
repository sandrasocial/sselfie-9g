"use client"

import type React from "react"
import VideoCard from "./video-card"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
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
} from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import ConceptCard from "./concept-card"
import MayaChatHistory from "./maya-chat-history"
import UnifiedLoading from "./unified-loading"
import { useRouter } from "next/navigation"
import type { SessionUser } from "next-auth" // Assuming SessionUser type is available
import { PromptSuggestionCard as NewPromptSuggestionCard } from "./prompt-suggestion-card"
import type { PromptSuggestion } from "@/lib/maya/prompt-generator"
import ImageUploadFlow from "./pro-mode/ImageUploadFlow"
import { getConceptPrompt } from "@/lib/maya/concept-templates"
import BuyCreditsModal from "./buy-credits-modal"
import { useImageLibrary } from "./pro-mode/hooks/useImageLibrary"
// Pro Mode Components
import ProModeChat from "./pro-mode/ProModeChat"
import ProModeHeader from "./pro-mode/ProModeHeader"
import ProModeInput from "./pro-mode/ProModeInput"
import ConceptCardPro from "./pro-mode/ConceptCardPro"
import ImageLibraryModal from "./pro-mode/ImageLibraryModal"

interface MayaChatScreenProps {
  onImageGenerated?: () => void
  user: SessionUser | null // Assuming user object is passed down
}

export default function MayaChatScreen({ onImageGenerated, user }: MayaChatScreenProps) {
  const [inputValue, setInputValue] = useState("")
  const [chatId, setChatId] = useState<number | null>(null)
  const [chatTitle, setChatTitle] = useState<string>("Chat with Maya") // Added for chat title
  const [isLoadingChat, setIsLoadingChat] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [showNavMenu, setShowNavMenu] = useState(false)
  const [showChatMenu, setShowChatMenu] = useState(false)
  const savedMessageIds = useRef(new Set<string>())
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [styleStrength, setStyleStrength] = useState(1.0) // Updated default from 1.05 to 1.0
  const [promptAccuracy, setPromptAccuracy] = useState(3.5) // Guidance scale: 2.5-5.0
  const [aspectRatio, setAspectRatio] = useState("4:5")
  const [realismStrength, setRealismStrength] = useState(0.2) // Extra LoRA scale: 0.0-0.8
  const [showSettings, setShowSettings] = useState(false)
  // Enhanced Authenticity toggle - only for Classic mode (injects more muted colors, iPhone quality, film grain)
  const [enhancedAuthenticity, setEnhancedAuthenticity] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mayaEnhancedAuthenticity')
      return saved === 'true'
    }
    return false // Default to off
  })

  const settingsSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const messageSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastMessageCountRef = useRef(0)
  const isSavingMessageRef = useRef(false)

  const [pendingConceptRequest, setPendingConceptRequest] = useState<string | null>(null)
  const [isGeneratingConcepts, setIsGeneratingConcepts] = useState(false)
  
  // Track messages that should show image upload module
  const [messagesWithUploadModule, setMessagesWithUploadModule] = useState<Set<string>>(new Set())
  
  const [selectedPrompt, setSelectedPrompt] = useState<string>("")
  
  // Track if user has used Maya before (has any chat history)
  // Default to false (show welcome screen) until we know otherwise
  const [hasUsedMayaBefore, setHasUsedMayaBefore] = useState<boolean>(false)
  
  // Studio Pro state
  const [studioProMode, setStudioProMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mayaStudioProMode')
      return saved === 'true'
    }
    return false
  })
  
  // Use centralized image library hook for Pro Mode
  const {
    library: imageLibrary,
    isLoading: isLibraryLoading,
    error: libraryError,
    totalImages: libraryTotalImages,
    loadLibrary,
    saveLibrary,
    addImages,
    removeImages,
    clearLibrary,
    updateIntent,
    refreshLibrary,
  } = useImageLibrary()
  
  // Legacy uploadedImages state (kept for backward compatibility with non-Pro Mode features)
  // In Pro Mode, use imageLibrary from useImageLibrary hook instead
  const [uploadedImages, setUploadedImages] = useState<Array<{
    url: string
    type: 'base' | 'product'
    label?: string
    source?: 'gallery' | 'upload'
  }>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mayaStudioProImages')
      try {
        return saved ? JSON.parse(saved) : []
      } catch {
        return []
      }
    }
    return []
  })
  
  // Shared images from first concept card - auto-populates other cards
  const [sharedConceptImages, setSharedConceptImages] = useState<Array<string | null>>([null, null, null])
  const [showGallerySelector, setShowGallerySelector] = useState(false)
  const [galleryImages, setGalleryImages] = useState<any[]>([])
  const [isGeneratingStudioPro, setIsGeneratingStudioPro] = useState(false)
  const processedStudioProMessagesRef = useRef<Set<string>>(new Set())
  const promptGenerationTriggeredRef = useRef<Set<string>>(new Set()) // Track messages that have already triggered prompt generation
  const carouselCardsAddedRef = useRef<Set<string>>(new Set()) // Track messages that already have carousel cards added
  const generateCarouselRef = useRef<((params: { topic: string; slideCount: number }) => Promise<void>) | null>(null)
  const generateReelCoverRef = useRef<((params: { title: string; textOverlay?: string }) => Promise<void>) | null>(null)
  
  // Studio Pro onboarding state
  const [showStudioProOnboarding, setShowStudioProOnboarding] = useState(false)
  
  // Pro Mode library management state
  const [showLibraryModal, setShowLibraryModal] = useState(false)
  const [showUploadFlow, setShowUploadFlow] = useState(false)
  
  // Prompt suggestions state
  const [promptSuggestions, setPromptSuggestions] = useState<PromptSuggestion[]>([])
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false)

  // Extract user authentication status and the chat ID to load from props or context (if available)
  // For this example, we'll assume they are available as `isAuthenticated` and `chatIdToLoad`
  const isAuthenticated = !!user // Simple check for demonstration
  const chatIdToLoad = user ? Number(user.chatId) : null // Replace with actual logic to get chatIdToLoad

  const hasLoadedChatRef = useRef(false)

  useEffect(() => {
    const settingsStr = localStorage.getItem("mayaGenerationSettings")
    if (settingsStr) {
      try {
        const settings = JSON.parse(settingsStr)
        console.log("[v0] 📊 Loaded saved settings from localStorage:", settings)
        const loadedStyleStrength = settings.styleStrength ?? 1.0 // Updated fallback default to 1.0
        setStyleStrength(loadedStyleStrength === 1.1 ? 1.0 : loadedStyleStrength) // Removed 1.05 migration, only migrate 1.1 to 1.0
        setPromptAccuracy(settings.promptAccuracy || 3.5)
        setAspectRatio(settings.aspectRatio || "4:5") // Updated default from "1:1" to "4:5"
        // Migrate old default (0.4) to new default (0.2), but preserve custom values
        const loadedRealismStrength = settings.realismStrength ?? 0.2
        setRealismStrength(loadedRealismStrength === 0.4 ? 0.2 : loadedRealismStrength)
      } catch (error) {
        console.error("[v0] ❌ Error loading settings:", error)
      }
    } else {
      console.log("[v0] 📊 No saved settings found, using defaults")
    }
  }, []) // Empty dependency array - only run once on mount

  useEffect(() => {
    // Clear any existing timer
    if (settingsSaveTimerRef.current) {
      clearTimeout(settingsSaveTimerRef.current)
    }

    // Set new timer to save after 500ms of no changes
    settingsSaveTimerRef.current = setTimeout(() => {
      const settings = {
        styleStrength,
        promptAccuracy,
        aspectRatio,
        realismStrength,
      }
      console.log("[v0] 💾 Saving settings to localStorage:", settings)
      localStorage.setItem("mayaGenerationSettings", JSON.stringify(settings))
    }, 500)

    // Cleanup timer on unmount
    return () => {
      if (settingsSaveTimerRef.current) {
        clearTimeout(settingsSaveTimerRef.current)
      }
    }
  }, [styleStrength, promptAccuracy, aspectRatio, realismStrength]) // Added realismStrength to dependencies

  // Save enhanced authenticity setting to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mayaEnhancedAuthenticity', enhancedAuthenticity.toString())
      console.log("[v0] 💾 Saved enhanced authenticity setting:", enhancedAuthenticity)
    }
  }, [enhancedAuthenticity])

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ 
      api: "/api/maya/chat",
      headers: {
        "x-studio-pro-mode": studioProMode ? "true" : "false",
      },
    }),
    initialMessages: [],
    body: {
      chatId: chatId,
      studioProMode: studioProMode,
      // Include image library in Pro Mode
      ...(studioProMode && {
        imageLibrary: imageLibrary,
      }),
    },
    onError: (error) => {
      // Simplified error handling - just extract message safely
      let errorMessage = "An error occurred while chatting with Maya. Please try again."
      
      // Minimal, safe error extraction
      if (error instanceof Error && error.message) {
        errorMessage = error.message
      } else if (typeof error === "string" && error) {
        errorMessage = error
      } else if (error && typeof error === "object") {
        const err = error as any
        if (err.message && typeof err.message === "string") {
          errorMessage = err.message
        } else if (err.error && typeof err.error === "string") {
          errorMessage = err.error
        }
      }
      
      // Minimal logging - avoid complex serialization that causes issues
      try {
        if (error instanceof Error) {
          console.error("[v0] Maya chat error:", errorMessage, error.stack ? "\nStack: " + error.stack.substring(0, 200) : "")
        } else {
          console.error("[v0] Maya chat error:", errorMessage)
        }
      } catch {
        // Silently fail if logging causes issues
      }
      
      // TODO: Add toast import if you want user-facing error notifications
      // import { toast } from "sonner"
      // toast.error(errorMessage || "An error occurred while chatting with Maya. Please try again.")
    },
  })

  const loadChat = useCallback(
    async (specificChatId?: number) => {
      try {
        setIsLoadingChat(true)

        // Build URL - either load specific chat or default maya chat
        // 🔴 FIX: Use correct chatType based on mode (Pro Mode vs Classic Mode)
        const chatType = studioProMode ? 'pro' : 'maya'
        const url = specificChatId
          ? `/api/maya/load-chat?chatId=${specificChatId}`
          : `/api/maya/load-chat?chatType=${chatType}`

        console.log("[v0] Loading chat from URL:", url, "chatType:", chatType, "studioProMode:", studioProMode)

        const response = await fetch(url)
        console.log("[v0] Load chat response status:", response.status)

        if (!response.ok) {
          throw new Error(`Failed to load chat: ${response.status}`)
        }

        let data: any
        try {
          data = await response.json()
        } catch (jsonError) {
          console.error("[v0] Error parsing chat response JSON")
          // Don't throw - just log and return empty state
          setIsLoadingChat(false)
          return
        }
        
        // Safely check if data exists before accessing properties
        if (!data || typeof data !== "object") {
          console.error("[v0] Invalid chat data received - data is not an object")
          // Don't throw - just log and return empty state
          setIsLoadingChat(false)
          return
        }
        
        console.log("[v0] Loaded chat ID:", data.chatId, "Messages:", data.messages?.length, "Title:", data.chatTitle)

        if (data.chatId) {
          setChatId(data.chatId)
        }

        if (data.chatTitle && typeof data.chatTitle === "string") {
          setChatTitle(data.chatTitle)
        }

        if (data.messages && Array.isArray(data.messages)) {
          let conceptCardsFound = 0

          // CRITICAL: Populate refs BEFORE setting messages to prevent trigger detection
          data.messages.forEach((msg: any) => {
            if (msg.id) {
              savedMessageIds.current.add(msg.id.toString())
            }

            // Check if message already has concept cards and mark as processed
            const hasConceptCards = msg.parts?.some(
              (p: any) => p.type === "tool-generateConcepts" && p.output?.concepts?.length > 0,
            )
            if (hasConceptCards) {
              conceptCardsFound++
              console.log("[v0] Found concept cards in message:", msg.id)
            }
          })

          console.log(
            "[v0] Chat loaded with",
            data.messages.length,
            "messages, savedIds:",
            savedMessageIds.current.size,
            "conceptCardsFound:",
            conceptCardsFound,
          )

          const firstWithConcepts = data.messages.find((msg: any) =>
            msg.parts?.some((p: any) => p.type === "tool-generateConcepts"),
          )
          if (firstWithConcepts) {
            console.log(
              "[v0] First message with concepts:",
              JSON.stringify(firstWithConcepts, null, 2).substring(0, 500),
            )
          } else {
            console.log("[v0] NO messages with tool-generateConcepts parts found in response!")
          }

          // Now set messages AFTER refs are populated
          setMessages(data.messages)
        } else {
          setMessages([])
        }

        setShowHistory(false)
      } catch (error) {
        // Silently handle errors in loadChat - don't let them propagate
        console.error("[v0] Error loading chat:", error instanceof Error ? error.message : "Unknown error")
        // Don't throw - just log and continue
      } finally {
        setIsLoadingChat(false)
      }
    },
    [setMessages],
  )

  // Check if user has any chat history to determine if welcome screen should show
  useEffect(() => {
    const checkChatHistory = async () => {
      if (!user) {
        setHasUsedMayaBefore(false)
        return
      }

      try {
        // 🔴 FIX: Use correct chatType based on mode
        const chatType = studioProMode ? 'pro' : 'maya'
        const response = await fetch(`/api/maya/chats?chatType=${chatType}`)
        if (response.ok) {
          const data = await response.json()
          const hasChats = data.chats && Array.isArray(data.chats) && data.chats.length > 0
          setHasUsedMayaBefore(hasChats)
          console.log("[v0] Chat history check:", { hasChats, chatCount: data.chats?.length || 0 })
        }
      } catch (error) {
        console.error("[v0] Error checking chat history:", error)
        // On error, default to showing welcome screen (hasUsedMayaBefore = false)
        setHasUsedMayaBefore(false)
      }
    }

    checkChatHistory()
  }, [user])

  useEffect(() => {
    console.log("[v0] 🚀 Maya chat screen mounted, user:", user?.email)

    if (user && !hasLoadedChatRef.current) {
      hasLoadedChatRef.current = true

      // Check localStorage for saved chat
      const savedChatId = localStorage.getItem("mayaCurrentChatId")
      if (savedChatId) {
        console.log("[v0] Found saved chatId in localStorage, loading:", savedChatId)
        loadChat(Number(savedChatId))
      } else {
        // No saved chat - load the most recent chat to show history
        console.log("[v0] No saved chatId, loading most recent chat")
        loadChat() // This calls API without chatId, which loads most recent
      }
    } else if (!user) {
      // If no user, set loading to false and show empty state
      hasLoadedChatRef.current = false
      setIsLoadingChat(false)
      setMessages([])
      setChatId(null)
      setChatTitle("Chat with Maya")
      localStorage.removeItem("mayaCurrentChatId")
    }
  }, [user]) // Removed loadChat from dependencies

  useEffect(() => {
    if (chatId) {
      console.log("[v0] Saving chatId to localStorage:", chatId)
      localStorage.setItem("mayaCurrentChatId", chatId.toString())
    }
  }, [chatId])

  // Persist Studio Pro mode to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mayaStudioProMode', studioProMode.toString())
    }
  }, [studioProMode])

  // Persist uploaded images to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mayaStudioProImages', JSON.stringify(uploadedImages))
    }
  }, [uploadedImages])

  // Load gallery images when Studio Pro mode is enabled
  useEffect(() => {
    if (studioProMode && galleryImages.length === 0) {
      loadGalleryImages()
    }
  }, [studioProMode])

  const loadGalleryImages = async () => {
    try {
      const response = await fetch('/api/gallery/images', {
        credentials: 'include', // Include cookies for authentication
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[STUDIO-PRO] Gallery fetch failed:', response.status, errorData)
        throw new Error(errorData.error || `Failed to load gallery: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.images) {
        setGalleryImages(data.images)
        console.log('[STUDIO-PRO] Loaded', data.images.length, 'gallery images')
      } else {
        setGalleryImages([])
      }
    } catch (error) {
      console.error('[STUDIO-PRO] Failed to load gallery:', error)
      // Set empty array on error so UI doesn't break
      setGalleryImages([])
    }
  }

  // Studio Pro: Generate carousel (defined BEFORE useEffect that processes messages)
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
          const updated = [...prev, reelCoverMessage]
          return updated
        })

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

    const textContent =
      typeof lastAssistantMessage.content === "string"
        ? lastAssistantMessage.content
        : lastAssistantMessage.parts
            ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text)
            .join("") || ""

    // 🔴 CRITICAL: Since status is NOT "streaming", the message is complete
    // Process the trigger immediately - the status check above ensures we only get here when streaming is done

    console.log("[CAROUSEL-DEBUG] Checking message for triggers:", {
      messageId,
      hasContent: !!lastAssistantMessage.content,
      contentType: typeof lastAssistantMessage.content,
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
                parts: [...msgParts, carouselCardPart],
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
        console.log("[v0] 📋 Message structure sample:", JSON.stringify(userMessages[0]?.parts?.slice(0, 2) || userMessages[0]?.content?.substring(0, 100), null, 2))
        
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
              // Try multiple possible property names
              referenceImageUrl = imagePart.image || imagePart.url || imagePart.src || imagePart.data
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
            let textContent = ""
            if (typeof userMessage.content === "string") {
              textContent = userMessage.content
            } else if (userMessage.parts && Array.isArray(userMessage.parts)) {
              const textParts = userMessage.parts.filter((p: any) => p && p.type === "text")
              textContent = textParts.map((p: any) => p.text || "").join("\n")
            }
            
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
            hasContent: !!m.content,
            contentType: typeof m.content
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
                if (typeof m.content === "string") {
                  messageText = m.content
                } else if (m.parts && Array.isArray(m.parts)) {
                  messageText = m.parts
                    .filter((p: any) => p && p.type === "text")
                    .map((p: any) => p.text || "")
                    .join(" ")
                }
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
            let content = ""
            if (typeof m.content === "string") {
              content = m.content
            } else if (m.parts) {
              content = m.parts
                .filter((p: any) => p.type === "text")
                .map((p: any) => p.text)
                .join(" ")
            }
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
          : studioProMode && imageLibrary.selfies.length > 0
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
              }
            : {
                userRequest: pendingConceptRequest,
                count: 6, // Changed from hardcoded 3 to 6, allowing Maya to create more concepts
                conversationContext: conversationContext || undefined,
                referenceImageUrl: allImages.length > 0 ? allImages[0] : referenceImageUrl, // Primary image
                studioProMode: studioProMode, // Pass Studio Pro mode to use Nano Banana prompting
                enhancedAuthenticity: !studioProMode && enhancedAuthenticity, // Only pass if Classic mode and toggle is ON
                guidePrompt: guidePromptActive && extractedGuidePrompt ? extractedGuidePrompt : undefined, // Pass guide prompt if active
                // Include full image library in Pro Mode
                ...(studioProMode && {
                  imageLibrary: imageLibrary,
                }),
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
    const textContent =
      typeof lastAssistantMessage.content === "string"
        ? lastAssistantMessage.content
        : lastAssistantMessage.parts
            ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text)
            .join("") || ""

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
      } else if (typeof userMsg.content === "string") {
        textContent = userMsg.content
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
    if (studioProMode) {
      // Studio Pro mode: no quick actions (sophisticated UX - no generic SaaS buttons)
      setCurrentPrompts([])
    } else {
      // Classic mode: fetch user gender and show style prompts
      const fetchUserGender = async () => {
        try {
          console.log("[v0] Fetching user gender from /api/user/profile")
          const response = await fetch("/api/user/profile")
          console.log("[v0] Profile API response status:", response.status)

          if (response.ok) {
            const data = await response.json()
            console.log("[v0] Profile API data:", data)
            setUserGender(data.gender || null)
            const prompts = getRandomPrompts(data.gender || null)
            console.log("[v0] Setting prompts for gender:", data.gender, "Prompts:", prompts.length)
            setCurrentPrompts(prompts)
          } else {
            console.error("[v0] Profile API error:", response.status, response.statusText)
            setCurrentPrompts(getRandomPrompts(null))
          }
        } catch (error) {
          console.error("[v0] Error fetching user gender:", error)
          setCurrentPrompts(getRandomPrompts(null))
        }
      }
      fetchUserGender()
    }
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
            content: msg.parts?.find((p: any) => p.type === "text")?.text || "",
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
          const chatType = studioProMode ? 'pro' : 'maya'
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
          experimental_providerMetadata: {
            customSettings: {
              styleStrength,
              promptAccuracy,
              aspectRatio,
              realismStrength, // Include realism strength in customSettings
            },
          },
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
          }),
          experimental_providerMetadata: {
            customSettings: {
              styleStrength,
              promptAccuracy,
              aspectRatio,
              realismStrength,
            },
          },
        })
      }
      setInputValue("")
      setUploadedImage(null)
    }
  }

  const handleNewChat = async () => {
    // Reset state for new chat
    // Only clear images when starting a completely new chat
    setSelectedPrompt("")
    setMessagesWithUploadModule(new Set())
    setPendingConceptRequest(null)
    
    try {
      // 🔴 FIX: Create new chat with correct chatType based on mode
      const chatType = studioProMode ? 'pro' : 'maya'
      const response = await fetch("/api/maya/new-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatType }),
      })

      if (!response.ok) throw new Error("Failed to create new chat")

      const data = await response.json()
      setChatId(data.chatId)
      setChatTitle("New Chat") // Reset title for new chat
      setMessages([])
      savedMessageIds.current.clear()
      promptGenerationTriggeredRef.current.clear() // Clear prompt generation tracking

      localStorage.setItem("mayaCurrentChatId", data.chatId.toString())

      console.log("[v0] New chat created:", data.chatId)
    } catch (error) {
      console.error("[v0] Error creating new chat:", error)
    }
  }

  // Handle mode switching - creates a new chat when switching between Classic and Studio Pro
  const handleModeSwitch = async (newMode: boolean) => {
    // Only create new chat if mode is actually changing
    if (studioProMode === newMode) return

    try {
      // 🔴 FIX: Create new chat with correct chatType based on mode
      const chatType = newMode ? 'pro' : 'maya'
      const response = await fetch("/api/maya/new-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatType }),
      })

      if (!response.ok) throw new Error("Failed to create new chat")

      const data = await response.json()
      
      // Switch mode first
      setStudioProMode(newMode)
      
      // Then reset chat state
      setChatId(data.chatId)
      setChatTitle("New Chat")
      setMessages([])
      savedMessageIds.current.clear()
      setUploadedImages([]) // Clear Studio Pro images
      setPromptSuggestions([]) // Clear prompt suggestions
      promptGenerationTriggeredRef.current.clear() // Clear prompt generation tracking

      localStorage.setItem("mayaCurrentChatId", data.chatId.toString())

      console.log("[v0] Mode switched and new chat created:", {
        mode: newMode ? "Studio Pro" : "Classic",
        chatId: data.chatId
      })
    } catch (error) {
      console.error("[v0] Error switching mode and creating new chat:", error)
    }
  }

  const handleSelectChat = (selectedChatId: number, selectedChatTitle?: string) => {
    // Added selectedChatTitle
    loadChat(selectedChatId)
    setShowHistory(false)
    setChatTitle(selectedChatTitle) // Set the title of the selected chat
      promptGenerationTriggeredRef.current.clear() // Clear prompt generation tracking

    localStorage.setItem("mayaCurrentChatId", selectedChatId.toString())
  }

  const handleDeleteChat = (deletedChatId: number) => {
    // If the deleted chat was the current one, switch to new chat
    if (chatId === deletedChatId) {
      handleNewChat()
    }
    // Clear localStorage if it was the current chat
    const storedChatId = localStorage.getItem("mayaCurrentChatId")
    if (storedChatId === deletedChatId.toString()) {
      localStorage.removeItem("mayaCurrentChatId")
    }
  }

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
    // Navigate by updating the hash
    window.location.hash = tab
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
    <div
      className="flex flex-col h-full bg-linear-to-b from-stone-50 to-white relative overflow-hidden"
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

      {/* Header - Pro Mode or Classic Mode */}
      {studioProMode ? (
        <div className="relative">
          <ProModeHeader
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
            onEditIntent={async () => {
              const newIntent = prompt('Enter your creative intent:', imageLibrary.intent || '')
              if (newIntent !== null) {
                await updateIntent(newIntent)
              }
            }}
          />
          {/* Mode Toggle in Pro Mode Header Area */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <span className="text-xs text-stone-600 hidden sm:inline">Mode:</span>
            <button
              onClick={() => handleModeSwitch(false)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors bg-stone-100 text-stone-900 hover:bg-stone-200"
            >
              <span className="text-xs">Switch to Classic</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="shrink-0 flex items-center justify-between px-3 sm:px-4 py-3 bg-white/80 backdrop-blur-xl border-b border-stone-200/50 relative z-50">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-stone-200/60 overflow-hidden shrink-0">
              <img src="https://i.postimg.cc/fTtCnzZv/out-1-22.png" alt="Maya" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base font-serif font-extralight tracking-[0.2em] text-stone-950 uppercase">
                {chatTitle}
              </h3>
            </div>
          </div>

          {/* Studio Pro Mode Toggle - Classic Mode */}
          <div className="flex items-center gap-2 sm:gap-3 mr-2">
            <span className="text-xs text-stone-600 hidden sm:inline">Mode:</span>
            <button
              onClick={() => handleModeSwitch(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors bg-stone-100 text-stone-900 hover:bg-stone-200"
            >
              <span className="text-xs">Switch to Studio Pro</span>
            </button>
          </div>

          <button
            onClick={() => setShowNavMenu(!showNavMenu)}
            className="flex items-center justify-center px-3 h-9 sm:h-10 rounded-lg hover:bg-stone-100/50 transition-colors touch-manipulation active:scale-95"
            aria-label="Navigation menu"
            aria-expanded={showNavMenu}
          >
            <span className="text-xs sm:text-sm font-serif tracking-[0.2em] text-stone-950 uppercase">MENU</span>
          </button>
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
                onClick={() => handleNavigation("studio")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <Home size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Studio</span>
              </button>
              <button
                onClick={() => handleNavigation("training")}
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
                onClick={() => handleNavigation("profile")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <User size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Profile</span>
              </button>
              <button
                onClick={() => handleNavigation("settings")}
                className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-stone-50 transition-colors touch-manipulation"
              >
                <SettingsIcon size={18} className="text-stone-600" strokeWidth={2} />
                <span className="text-sm font-medium text-stone-700">Settings</span>
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

      {showHistory && (
        <div className="shrink-0 mx-4 mt-2 mb-2 bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl p-4 shadow-xl shadow-stone-950/5 animate-in slide-in-from-top-2 duration-300">
          <MayaChatHistory
            currentChatId={chatId}
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChat}
            onDeleteChat={handleDeleteChat}
          />
        </div>
      )}

      {showSettings && (
        <>
          <div
            className="fixed inset-0 bg-stone-950/20 backdrop-blur-sm z-40 animate-in fade-in duration-200"
            onClick={() => setShowSettings(false)}
          />

          <div className="fixed inset-x-4 top-20 bg-white/95 backdrop-blur-3xl border border-stone-200 rounded-2xl p-6 shadow-xl shadow-stone-950/10 animate-in slide-in-from-top-2 duration-300 z-50 max-w-md mx-auto">
            {/* Close button */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-serif font-extralight tracking-[0.2em] uppercase text-stone-950">
                Generation Settings
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-100 transition-colors"
                aria-label="Close settings"
              >
                <X size={18} className="text-stone-600" strokeWidth={2} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs tracking-wider uppercase text-stone-600">Style Strength</label>
                  <span className="text-sm font-medium text-stone-950">{styleStrength.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.9"
                  max="1.2"
                  step="0.05"
                  value={styleStrength}
                  onChange={(e) => setStyleStrength(Number.parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs tracking-wider uppercase text-stone-600">Prompt Accuracy</label>
                  <span className="text-sm font-medium text-stone-950">{promptAccuracy.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="2.5"
                  max="5.0"
                  step="0.5"
                  value={promptAccuracy}
                  onChange={(e) => setPromptAccuracy(Number.parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs tracking-wider uppercase text-stone-600">Realism Boost</label>
                  <span className="text-sm font-medium text-stone-950">{realismStrength.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.8"
                  step="0.1"
                  value={realismStrength}
                  onChange={(e) => setRealismStrength(Number.parseFloat(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-stone-500 mt-1">Higher = more photorealistic, lower = more stylized</p>
              </div>

              <div>
                <label className="text-xs tracking-wider uppercase text-stone-600 mb-2 block">Aspect Ratio</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm"
                >
                  <option value="1:1">Square (1:1)</option>
                  <option value="4:5">Portrait (4:5)</option>
                  <option value="16:9">Landscape (16:9)</option>
                </select>
              </div>

              {/* Enhanced Authenticity Toggle - Only show in Classic mode */}
              {!studioProMode && (
                <div className="pt-2 border-t border-stone-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label className="text-xs tracking-wider uppercase text-stone-600 mb-1 block">
                        Enhanced Authenticity
                      </label>
                      <p className="text-xs text-stone-500 mt-1">
                        More muted colors, iPhone quality, and film grain for a more authentic look
                      </p>
                    </div>
                    <button
                      onClick={() => setEnhancedAuthenticity(!enhancedAuthenticity)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-stone-950 focus:ring-offset-2 ${
                        enhancedAuthenticity ? 'bg-stone-900' : 'bg-stone-300'
                      }`}
                      role="switch"
                      aria-checked={enhancedAuthenticity}
                      aria-label="Enhanced Authenticity"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          enhancedAuthenticity ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="flex-1 min-h-0 px-3 sm:px-4">
        <div
          ref={messagesContainerRef}
          className="h-full overflow-y-auto pr-1 scroll-smooth"
          style={{
            paddingBottom: "11rem",
          }}
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
        >
          {/* Studio Pro Empty State */}
          {isEmpty && studioProMode && !isTyping && (
            <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
              <div className="max-w-2xl w-full space-y-8">
                {/* Show ImageUploadFlow if library is empty, otherwise show welcome */}
                {libraryTotalImages === 0 ? (
                  <ImageUploadFlow
                    initialLibrary={imageLibrary}
                    onComplete={async (library) => {
                      console.log("[v0] [PRO MODE] Image upload flow completed:", library)
                      
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
                          parts: messageParts,
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
                          parts: messageParts,
                        })
                      }
                    }}
                    onManageCategory={(category) => {
                      // 🔴 FIX: Open manage modal for category
                      console.log("[v0] [PRO MODE] Manage category clicked:", category)
                      // Open library modal - it will show all categories, user can manage from there
                      setShowLibraryModal(true)
                    }}
                    onCancel={() => {
                      // Allow canceling - user can start chat without images
                      console.log("[v0] [PRO MODE] Image upload flow cancelled")
                    }}
                  />
                ) : (
                  // Welcome message when library has images
                  <div className="text-center space-y-4">
                    <h2 className="text-3xl sm:text-4xl font-serif font-extralight tracking-[0.3em] uppercase text-stone-900">
                      Studio Pro
                    </h2>
                    <p className="text-sm text-stone-500 font-light tracking-wide">
                      Your creative library is ready. What would you like to create?
                    </p>
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
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 w-full max-w-2xl px-2 sm:px-4 -mx-2">
                {currentPrompts.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (studioProMode) {
                        // Pro Mode: Send message to Maya
                        const guidanceMessage = item.prompt
                        
                        // Send the message - use setTimeout to ensure state is updated
                        setTimeout(() => {
                          handleSendMessage(guidanceMessage)
                        }, 100)
                      } else {
                        // Classic mode, send regular message
                        handleSendMessage(item.prompt)
                      }
                    }}
                    className="shrink-0 px-4 py-2.5 sm:py-3 bg-white/50 backdrop-blur-xl border border-white/70 rounded-xl hover:bg-stone-100 hover:border-stone-300 transition-all duration-300 touch-manipulation active:scale-95 min-h-[44px]"
                  >
                    <span className="text-xs tracking-wide font-medium text-stone-700 whitespace-nowrap">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}


          {filteredMessages &&
            Array.isArray(filteredMessages) &&
            filteredMessages
              .filter((msg) => {
                return true
              })
              .map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] sm:max-w-[85%] ${msg.role === "user" ? "order-2" : "order-1"}`}>
                  {msg.parts &&
                    Array.isArray(msg.parts) &&
                    (() => {
                      // Group parts by type to handle text + image together
                      const textParts = msg.parts.filter((p) => p.type === "text")
                      const imageParts = msg.parts.filter((p) => p.type === "image")
                      const otherParts = msg.parts.filter((p) => p.type !== "text" && p.type !== "image")

                      return (
                        <>
                          {/* Render text + image together if both exist */}
                          {(textParts.length > 0 || imageParts.length > 0) && (
                            <div
                              className={`p-4 rounded-2xl transition-all duration-300 ${
                                msg.role === "user"
                                  ? "bg-stone-950 text-white shadow-lg shadow-stone-950/20"
                                  : "bg-white/50 backdrop-blur-xl border border-white/70 shadow-lg shadow-stone-950/5 text-stone-950"
                              }`}
                              role={msg.role === "assistant" ? "article" : undefined}
                            >
                              {textParts.map((part, idx) => {
                                const text = part.text || ''
                                
                                // Check for prompt suggestions in workbench mode (parsed from text)
                                const parsedPromptSuggestions = parsePromptSuggestions(text)
                                
                                // Remove prompts from display text if they're in workbench (Studio Pro mode)
                                let displayText = text
                                
                                // Remove prompts that are rendered as cards (Classic Mode)
                                if (!studioProMode && parsedPromptSuggestions.length > 0) {
                                  // Classic mode: Remove carousel slide prompts from text (they'll be shown as cards)
                                  parsedPromptSuggestions.forEach(suggestion => {
                                    if (suggestion.label.includes('Slide')) {
                                      const slideNumMatch = suggestion.label.match(/Slide\s+(\d+)/i)
                                      if (slideNumMatch) {
                                        const slideNum = slideNumMatch[1]
                                        const slidePattern = new RegExp(
                                          `Slide\\s+${slideNum}\\s*(?:of\\s+\\d+)?\\s*[-–]\\s*[^:]+:.*?(?=\\nSlide\\s+\\d+\\s*(?:of\\s+\\d+)?\\s*[-–]|\\nCopy slide|$)`,
                                          'gis'
                                        )
                                        displayText = displayText.replace(slidePattern, '')
                                      }
                                    }
                                  })
                                  
                                  // Also remove other prompts (non-slide)
                                  const otherPrompts = parsedPromptSuggestions.filter(s => !s.label.includes('Slide'))
                                  if (otherPrompts.length > 0) {
                                    displayText = removePromptsFromText(displayText, otherPrompts)
                                  }
                                  
                                // Remove GENERATE_PROMPTS trigger from display
                                displayText = displayText
                                  .replace(/\[GENERATE_PROMPTS[:\s]+[^\]]+\]/gi, '')
                                  .replace(/\[GENERATE_PROMPTS\]/gi, '')
                                
                                // Remove SHOW_IMAGE_UPLOAD_MODULE trigger from display (with any following text on same line)
                                displayText = displayText
                                  .replace(/\[SHOW_IMAGE_UPLOAD_MODULE[:\s]+[^\]]+\]/gi, '')
                                  .replace(/\[SHOW_IMAGE_UPLOAD_MODULE\][^\n]*/gi, '')
                                  .replace(/\[SHOW_IMAGE_UPLOAD_MODULE\]/gi, '')
                                
                                // Clean up any remaining prompt fragments
                                displayText = displayText
                                  .replace(/Keep the .*?facial features EXACTLY identical.*?This is critical\./gis, '')
                                  .replace(/Composition:.*?Final Use:.*?Slide \d+ of \d+/gis, '')
                                  .replace(/\n{3,}/g, '\n\n')
                                  .replace(/\s{2,}/g, ' ') // Clean up multiple spaces
                                  .trim()
                                }
                                
                                // Remove API-generated prompts from display text if they appear in cards
                                // Check if we have carousel slides from API
                                const carouselSlides = promptSuggestions.filter(s => s.label.includes('Slide'))
                                const otherPrompts = promptSuggestions.filter(s => !s.label.includes('Slide'))
                                
                                if (carouselSlides.length > 0) {
                                  displayText = removeCarouselSlidesFromText(displayText, carouselSlides)
                                }
                                if (otherPrompts.length > 0) {
                                  displayText = removePromptsFromText(displayText, otherPrompts)
                                }
                                
                                // Get original message text for category extraction
                                const originalMessageText = textParts.map((p: any) => p.text).join(' ')
                                
                                // Check if this message already has concept cards
                                const hasConceptCards = msg.parts?.some((p: any) => 
                                  p.type === 'tool-generateConcepts' && 
                                  p.output?.state === 'ready' && 
                                  p.output?.concepts?.length > 0
                                ) || false
                                
                                return (
                                  <div key={idx}>
                                    {renderMessageContent(displayText, msg.role === "user")}
                                    
                                    {/* Old upload module removed - will be replaced by new Pro Mode system */}
                                    
                                    
                                    {/* Render prompt suggestion cards from API (concept cards pro) */}
                                    {msg.role === 'assistant' &&
                                      promptSuggestions.length > 0 &&
                                      msg.id === messages[messages.length - 1]?.id && (
                                      <div className="mt-4 space-y-3">
                                        <div className="text-xs text-stone-700 mb-1">
                                          Step 2 – Pick a concept you like, then send it to your Workbench below.
                                        </div>
                                        {promptSuggestions.map((suggestion) => (
                                          <NewPromptSuggestionCard
                                            key={`api-suggestion-${suggestion.id}`}
                                            suggestion={suggestion}
                                          />
                                        ))}
                                      </div>
                                    )}
                                    
                                    {/* Render non-carousel suggestions as cards (carousel slides handled in workbench) - HIDDEN in Studio Pro mode */}
                                    {(() => {
                                      
                                      if (parsedPromptSuggestions.length > 0 && msg.role === 'assistant') {
                                        // Don't render cards if we have carousel slides (they'll be in workbench)
                                        const hasCarouselSlides = parsedPromptSuggestions.some(s => s.label.includes('Slide'))
                                        if (hasCarouselSlides) {
                                          return null
                                        }
                                        
                                        // Render non-carousel suggestions as cards
                                        const nonCarouselSuggestions = parsedPromptSuggestions.filter(s => !s.label.includes('Slide'))
                                        if (nonCarouselSuggestions.length > 0) {
                                          return (
                                            <div className="mt-4 space-y-3">
                                              {nonCarouselSuggestions.map((suggestion, sugIdx) => {
                                                const fullSuggestion: PromptSuggestion = {
                                                  id: `parsed-${msg.id}-${sugIdx}`,
                                                  templateId: 'parsed',
                                                  name: suggestion.label || `Prompt ${sugIdx + 1}`,
                                                  description: suggestion.description || suggestion.label || '',
                                                  prompt: suggestion.prompt,
                                                  variation: 'main',
                                                  nanoBananaCapabilities: [],
                                                  useCases: [],
                                                  confidence: 0.8
                                                }
                                                
                                                const promptLower = suggestion.prompt.toLowerCase()
                                                if (promptLower.includes('text') || promptLower.includes('typography')) {
                                                  fullSuggestion.nanoBananaCapabilities.push('text_rendering')
                                                }
                                                if (promptLower.includes('image 1') && promptLower.includes('image 2')) {
                                                  fullSuggestion.nanoBananaCapabilities.push('multi_image_composition')
                                                }
                                                if (promptLower.includes('exact') || promptLower.includes('identical') || promptLower.includes('consistency')) {
                                                  fullSuggestion.nanoBananaCapabilities.push('character_consistency')
                                                }
                                                if (promptLower.includes('85mm') || promptLower.includes('f/') || promptLower.includes('lens')) {
                                                  fullSuggestion.nanoBananaCapabilities.push('professional_controls')
                                                }
                                                
                                                return (
                                                  <NewPromptSuggestionCard
                                                    key={`parsed-suggestion-${msg.id}-${sugIdx}`}
                                                    suggestion={fullSuggestion}
                                                  />
                                                )
                                              })}
                                            </div>
                                          )
                                        }
                                      }
                                      return null
                                    })()}
                                  </div>
                                )
                              })}
                              {imageParts.length > 0 && (
                                <div className={`mt-3 ${imageParts.length > 1 ? 'grid grid-cols-2 sm:grid-cols-3 gap-3' : ''}`}>
                                  {imageParts.map((part, idx) => {
                                    const imageUrl = (part as any).image || (part as any).url || (part as any).src
                                    if (imageUrl) {
                                      const isCarousel = imageParts.length > 1 && imageParts.length <= 10
                                      return (
                                        <div key={idx} className="relative">
                                          <div className={`relative ${isCarousel ? 'aspect-square' : 'w-48 h-48 sm:w-40 sm:h-40'} rounded-xl overflow-hidden border border-white/60 shadow-lg`}>
                                            <img 
                                              src={imageUrl} 
                                              alt={isCarousel ? `Carousel slide ${idx + 1}` : "Image"} 
                                              className="w-full h-full object-cover" 
                                            />
                                          </div>
                                          {isCarousel && (
                                            <p className="text-xs text-stone-500 mt-1.5 tracking-wide text-center">Slide {idx + 1}</p>
                                          )}
                                          {!isCarousel && idx === 0 && imageParts.length === 1 && (
                                            <p className="text-xs text-stone-500 mt-1.5 tracking-wide">Image</p>
                                          )}
                                        </div>
                                      )
                                    }
                                    return null
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                          {/* Render other parts (tools, etc.) */}
                          {otherParts.map((part, partIndex) => {
                            if (part.type === "tool-generateConcepts") {
                              const toolPart = part as any
                              const output = toolPart.output

                              // Show concept cards in both Classic and Studio Pro modes
                              // Concept cards now support image upload/selection in Studio Pro mode
                              // Workbench is kept separate for manual prompt creation

                              if (output && output.state === "ready" && Array.isArray(output.concepts)) {
                                const concepts = output.concepts

                                return (
                                  <div key={partIndex} className="mt-3 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-1 h-1 rounded-full bg-stone-600"></div>
                                      <span className="text-xs tracking-[0.15em] uppercase font-light text-stone-600">
                                        Photo Ideas
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                                      {concepts.map((concept: any, conceptIndex: number) => {
                                        // Use Pro Mode concept cards in Studio Pro, Classic cards in Classic Mode
                                        if (studioProMode) {
                                          // Use linkedImages from concept (already linked by API with up to 5 images)
                                          // The API's linkImagesToConcept function links multiple images intelligently
                                          const conceptLinkedImages = concept.linkedImages && Array.isArray(concept.linkedImages) && concept.linkedImages.length > 0
                                            ? concept.linkedImages
                                            : [] // If no linkedImages from API, use empty array (user needs to add images)

                                          // Use stable key based on concept.id and message.id to preserve component state across re-renders
                                          const conceptId = concept.id || `concept-${msg.id}-${conceptIndex}`
                                          const stableKey = `pro-concept-${msg.id}-${conceptId}`

                                          return (
                                            <ConceptCardPro
                                              key={stableKey}
                                              concept={{
                                                id: conceptId,
                                                title: concept.title || concept.label || 'Untitled Concept',
                                                description: concept.description || concept.prompt || '',
                                                category: concept.category,
                                                aesthetic: concept.aesthetic,
                                                linkedImages: conceptLinkedImages,
                                                fullPrompt: concept.fullPrompt || concept.prompt,
                                              }}
                                              onGenerate={async () => {
                                                console.log('[Pro Mode] 🎬 onGenerate called for concept:', concept.title)
                                                
                                                if (!concept.fullPrompt && !concept.prompt) {
                                                  console.error('[Pro Mode] ❌ Concept missing prompt')
                                                  throw new Error('Concept missing prompt')
                                                }

                                                console.log('[Pro Mode] 📤 Calling /api/maya/pro/generate-image with:', {
                                                  conceptTitle: concept.title,
                                                  promptLength: (concept.fullPrompt || concept.prompt)?.length,
                                                  linkedImagesCount: conceptLinkedImages?.length || 0,
                                                })

                                                try {
                                                  const response = await fetch('/api/maya/pro/generate-image', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    credentials: 'include',
                                                    body: JSON.stringify({
                                                      fullPrompt: concept.fullPrompt || concept.prompt,
                                                      conceptTitle: concept.title || concept.label,
                                                      conceptDescription: concept.description,
                                                      category: concept.category || 'concept',
                                                      linkedImages: conceptLinkedImages,
                                                      resolution: '2K',
                                                      aspectRatio: '1:1',
                                                    }),
                                                  })

                                                  console.log('[Pro Mode] 📥 Response status:', response.status, response.ok)

                                                  const data = await response.json()
                                                  console.log('[Pro Mode] 📥 Response data:', {
                                                    success: data.success,
                                                    status: data.status,
                                                    hasPredictionId: !!data.predictionId,
                                                    hasGenerationId: !!data.generationId,
                                                    hasImageUrl: !!data.imageUrl,
                                                  })

                                                  if (!response.ok) {
                                                    console.error('[Pro Mode] ❌ Generation failed:', data.error)
                                                    throw new Error(data.error || 'Generation failed')
                                                  }

                                                  // Return predictionId and generationId so ConceptCardPro can poll
                                                  if (data.status === 'succeeded' && data.imageUrl) {
                                                    // Already completed - trigger callback
                                                    console.log('[Pro Mode] ✅ Generation completed immediately, imageUrl:', data.imageUrl.substring(0, 100))
                                                    if (onImageGenerated) {
                                                      onImageGenerated()
                                                    }
                                                    return { predictionId: data.predictionId, generationId: data.generationId }
                                                  } else if (data.predictionId) {
                                                    // Return IDs for polling in ConceptCardPro
                                                    console.log('[Pro Mode] ⏳ Generation in progress, returning IDs for polling')
                                                    return { predictionId: data.predictionId, generationId: data.generationId }
                                                  } else {
                                                    console.warn('[Pro Mode] ⚠️ No predictionId in response')
                                                    throw new Error('No predictionId returned from API')
                                                  }
                                                } catch (error) {
                                                  console.error('[Pro Mode] ❌ Generation error:', error)
                                                  throw error
                                                }
                                              }}
                                              onImageGenerated={onImageGenerated}
                                              onViewPrompt={() => {
                                                // View prompt modal is handled by ConceptCardPro component
                                                console.log('[Pro Mode] View prompt:', concept.fullPrompt || concept.prompt)
                                              }}
                                            />
                                          )
                                        }
                                        
                                        // Classic Mode: Use old ConceptCard
                                        const allBaseImages = uploadedImages.filter(img => img.type === 'base').map(img => img.url)
                                        
                                        return (
                                          <ConceptCard 
                                            key={conceptIndex} 
                                            concept={concept} 
                                            chatId={chatId || undefined} 
                                            onCreditsUpdate={setCreditBalance}
                                            studioProMode={false}
                                            baseImages={allBaseImages}
                                            selfies={[]}
                                            products={[]}
                                            styleRefs={[]}
                                            isFirstCard={conceptIndex === 0}
                                            sharedImages={sharedConceptImages}
                                            onSharedImagesChange={conceptIndex === 0 ? setSharedConceptImages : undefined}
                                          />
                                        )
                                      })}
                                    </div>
                                    
                                  </div>
                                )
                              }
                              // This part is now handled by the isGeneratingConcepts check before the message
                              return null
                            }

                            // Render carousel generation card (matches concept card styling)
                            if (part.type === "tool-generateCarousel") {
                              const toolPart = part as any
                              const output = toolPart.output

                              if (output && output.state === "ready") {
                                const { topic, slideCount, credits } = output

                                return (
                                  <div key={partIndex} className="mt-3">
                                    <div className="bg-white border rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg border-stone-300 bg-linear-to-br from-stone-50 to-white">
                                      <div className="flex items-center justify-between px-3 py-2.5 border-b border-stone-200">
                                        <div className="flex items-center gap-2.5">
                                          <div className="relative">
                                            <div className="absolute inset-0 bg-linear-to-tr from-purple-600 via-pink-600 to-orange-500 rounded-full p-[2px]">
                                              <div className="bg-white rounded-full w-full h-full"></div>
                                            </div>
                                            <div className="relative w-8 h-8 rounded-full bg-linear-to-br from-stone-200 to-stone-300 flex items-center justify-center">
                                              <span className="text-xs font-bold text-stone-700">S</span>
                                            </div>
                                          </div>
                                          <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm font-semibold text-stone-950">sselfie</span>
                                              <span className="text-[10px] font-medium text-stone-600 px-1.5 py-0.5 bg-stone-200/50 rounded">
                                                Studio Pro
                                              </span>
                                            </div>
                                            <span className="text-xs text-stone-500">Carousel</span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="px-3 py-3 space-y-3">
                                        <div className="space-y-1">
                                          <p className="text-sm leading-relaxed text-stone-950">
                                            <span className="font-semibold">sselfie</span> {topic}
                                          </p>
                                          <p className="text-sm leading-relaxed text-stone-600 line-clamp-2">
                                            {slideCount}-slide carousel with text overlay
                                          </p>
                                        </div>

                                        {!isGeneratingStudioPro && (
                                          <div className="space-y-2">
                                            <button
                                              onClick={() => {
                                                if (generateCarouselRef.current) {
                                                  generateCarouselRef.current({ topic, slideCount })
                                                }
                                              }}
                                              className="group relative w-full text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] min-h-[40px] flex items-center justify-center bg-linear-to-br from-stone-800 via-stone-900 to-stone-950 hover:from-stone-900 hover:via-stone-950 hover:to-black"
                                            >
                                              <span>Create with Studio Pro</span>
                                            </button>
                                            <div className="space-y-1">
                                              <p className="text-[10px] text-stone-500 text-center leading-relaxed">
                                                {credits} credits • {slideCount} slides
                                              </p>
                                              <p className="text-[10px] text-stone-400 text-center leading-relaxed">
                                                Multi-image composition with character consistency
                                              </p>
                                            </div>
                                          </div>
                                        )}

                                        {isGeneratingStudioPro && (
                                          <div className="flex flex-col items-center justify-center py-6 space-y-3">
                                            <div className="flex gap-1.5">
                                              <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                              <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                              <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                            </div>
                                            <p className="text-xs text-stone-600">Generating carousel...</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )
                              }
                              return null
                            }

                            // Studio Pro result display
                            if (part.type === "studio-pro-result") {
                              const output = (part as any).output

                              if (output && output.state === "ready" && output.imageUrl) {
                                return (
                                  <div key={partIndex} className="mt-3">
                                    <div className="bg-white/50 backdrop-blur-xl border border-white/70 rounded-xl p-4 space-y-3">
                                      <div className="relative aspect-square rounded-lg overflow-hidden">
                                        <img 
                                          src={output.imageUrl} 
                                          alt="Studio Pro generation"
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs text-stone-600">Studio Pro</span>
                                        <button
                                          onClick={() => window.open(output.imageUrl, '_blank')}
                                          className="px-3 py-1.5 bg-stone-900 text-white text-xs rounded-lg hover:bg-stone-700 transition-colors"
                                        >
                                          Download
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )
                              }

                              if (output && output.state === "processing") {
                                return (
                                  <div key={partIndex} className="mt-3">
                                    <div className="flex items-center gap-2 text-stone-600">
                                      <div className="w-1.5 h-1.5 border-2 border-stone-600 border-t-transparent rounded-full animate-spin" />
                                      <span className="text-xs tracking-[0.15em] uppercase font-light">
                                        Generating Studio Pro content...
                                      </span>
                                    </div>
                                  </div>
                                )
                              }

                              return null
                            }

                            if (part.type === "tool-generateVideo") {
                              const toolPart = part as any
                              const output = toolPart.output

                              if (output && output.state === "processing") {
                                return (
                                  <div key={partIndex} className="mt-3">
                                    <VideoCard
                                      videoUrl=""
                                      status="processing"
                                      progress={output.progress}
                                      motionPrompt={toolPart.args?.motionPrompt}
                                    />
                                  </div>
                                )
                              }

                              if (output && output.state === "ready" && output.videoUrl) {
                                return (
                                  <div key={partIndex} className="mt-3">
                                    <VideoCard
                                      videoUrl={output.videoUrl}
                                      motionPrompt={toolPart.args?.motionPrompt}
                                      imageSource={toolPart.args?.imageUrl}
                                    />
                                  </div>
                                )
                              }

                              if (output && output.state === "loading") {
                                return (
                                  <div key={partIndex} className="mt-3">
                                    <div className="flex items-center gap-2 text-stone-600">
                                      <div className="w-1.5 h-1.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      <span className="text-xs tracking-[0.15em] uppercase font-light">
                                        Starting video generation...
                                      </span>
                                    </div>
                                  </div>
                                )
                              }
                              return null
                            }

                            return null
                          })}
                        </>
                      )
                    })()}
                </div>
              </div>
            ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white/50 backdrop-blur-xl border border-white/70 p-3 rounded-2xl max-w-[85%] shadow-lg shadow-stone-900/5">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce bg-stone-700"></div>
                    <div
                      className="w-1.5 h-1.5 rounded-full animate-bounce bg-stone-700"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-1.5 h-1.5 rounded-full animate-bounce bg-stone-700"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                  <span className="text-xs font-light text-stone-600">Maya is thinking...</span>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Concept Generation Loading */}
          {isGeneratingConcepts && (
            <div className="flex justify-center mt-8 mb-4">
              <div className="bg-white rounded-2xl border border-stone-200/60 p-6 max-w-md w-full shadow-lg">
                <div className="space-y-4">
                  
                  {/* Animated Progress */}
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-stone-900 animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-stone-700 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-stone-500 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  
                  {/* Status Text */}
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-stone-900 tracking-wide">
                      Creating Your Concepts
                    </p>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      Maya is designing professional concepts for you
                    </p>
                  </div>
                  
                </div>
              </div>
            </div>
          )}

          {/* Success Message After Concepts Load */}
          {!isGeneratingConcepts && messages.some(msg => 
            msg.role === 'assistant' && msg.parts?.some(part => part.type === 'tool-generateConcepts')
          ) && (
            <div className="flex justify-center mt-4 mb-2">
              <div className="bg-stone-50 rounded-lg border border-stone-200/60 px-4 py-2">
                <p className="text-xs text-stone-600 text-center">
                  Select a concept below, add your images, and generate
                </p>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {showScrollButton && (
          <button
            onClick={() => {
              isAtBottomRef.current = true
              scrollToBottom("smooth")
            }}
            className="fixed bottom-44 right-4 sm:right-6 p-3 bg-stone-950 text-white rounded-full shadow-2xl shadow-stone-900/40 hover:scale-110 active:scale-95 transition-all duration-300 z-10 animate-in fade-in slide-in-from-bottom-2 min-w-[48px] min-h-[48px] flex items-center justify-center touch-manipulation"
            aria-label="Scroll to bottom"
          >
            <ArrowDown size={18} strokeWidth={2.5} />
          </button>
        )}
      </div>


      <div
        className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-3xl border-t border-stone-200/50 px-3 sm:px-4 py-2.5 sm:py-3 z-50 safe-bottom"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)",
        }}
      >
        {/* Classic Mode Quick Actions */}
        {!isEmpty && !uploadedImage && !studioProMode && (
          <div className="mb-2">
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
              {currentPrompts.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    // Classic mode, send regular message
                    handleSendMessage(item.prompt)
                  }}
                  disabled={isTyping}
                  className="shrink-0 px-3 py-2 bg-white/40 backdrop-blur-xl border border-white/60 rounded-lg hover:bg-white/60 transition-all duration-300 disabled:opacity-50 touch-manipulation active:scale-95 min-h-[44px]"
                >
                  <span className="text-xs tracking-wide font-medium text-stone-700 whitespace-nowrap">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

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

        {/* Input Area - Pro Mode or Classic Mode */}
        {studioProMode ? (
          <ProModeInput
            onSend={(message, imageUrl) => {
              // Pro Mode: Send message with optional image
              if (imageUrl) {
                // Set uploaded image state and send message
                setUploadedImage(imageUrl)
                // Use inputValue if message is empty, otherwise use message
                const messageToSend = message || inputValue.trim()
                if (messageToSend || imageUrl) {
                  handleSendMessage(messageToSend)
                }
              } else {
                // Just send text message
                handleSendMessage(message)
              }
            }}
            onImageUpload={() => setShowUploadFlow(true)}
            onManageLibrary={() => setShowLibraryModal(true)}
            isLoading={isTyping || isGeneratingConcepts}
            disabled={isTyping || isGeneratingConcepts}
            placeholder="What would you like to create?"
          />
        ) : (
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                aria-label="Upload image file"
              />

              {/* Chat Menu Button - Classic mode only */}
              <button
                onClick={() => setShowChatMenu(!showChatMenu)}
                disabled={isTyping}
                className="absolute left-2 bottom-2.5 w-9 h-9 flex items-center justify-center text-stone-600 hover:text-stone-950 transition-colors disabled:opacity-50 touch-manipulation active:scale-95 z-10 pointer-events-auto"
                aria-label="Chat menu"
                type="button"
              >
                <Sliders size={20} strokeWidth={2} />
              </button>

              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value)
                  e.target.style.height = "auto"
                  e.target.style.height = Math.min(e.target.scrollHeight, 80) + "px"
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                    setTimeout(() => {
                      const textarea = e.target as HTMLTextAreaElement
                      textarea.style.height = "48px"
                    }, 0)
                  }
                }}
                onClick={(e) => {
                  e.currentTarget.focus()
                }}
                onTouchEnd={(e) => {
                  e.currentTarget.focus()
                }}
                placeholder={uploadedImage ? "Describe the style..." : "Message Maya..."}
                className="w-full pl-12 pr-12 py-3 bg-white/40 backdrop-blur-2xl border border-white/60 rounded-xl text-stone-950 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-950/50 focus:bg-white/60 font-medium text-[16px] min-h-[48px] max-h-[80px] shadow-lg shadow-stone-950/10 transition-all duration-300 resize-none overflow-y-auto leading-relaxed touch-manipulation"
                disabled={isTyping || isUploadingImage}
                aria-label="Message input"
                rows={1}
                inputMode="text"
                autoCapitalize="sentences"
                autoCorrect="on"
                spellCheck="true"
                autoComplete="off"
                enterKeyHint="send"
              />

              <button
                onClick={() => handleSendMessage()}
                className="absolute right-2 bottom-2.5 w-9 h-9 flex items-center justify-center text-stone-600 hover:text-stone-950 transition-colors disabled:opacity-50 touch-manipulation active:scale-95 z-10 pointer-events-auto"
                disabled={isTyping || (!inputValue.trim() && !uploadedImage) || isUploadingImage}
                aria-label="Send message"
                type="button"
              >
                <Send size={20} strokeWidth={2} />
              </button>
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
              // Classic Mode Menu (with icons)
              <>
                <button
                  onClick={() => {
                    handleNewChat()
                    setShowChatMenu(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-stone-700 hover:bg-stone-50 transition-colors border-b border-stone-100 touch-manipulation"
                >
                  <Plus size={18} strokeWidth={2} />
                  <span className="font-medium">New Chat</span>
                </button>
                <button
                  onClick={() => {
                    setShowHistory(!showHistory)
                    setShowChatMenu(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-stone-700 hover:bg-stone-50 transition-colors border-b border-stone-100 touch-manipulation"
                >
                  <Clock size={18} strokeWidth={2} />
                  <span className="font-medium">Chat History</span>
                </button>
                <button
                  onClick={() => {
                    fileInputRef.current?.click()
                    setShowChatMenu(false)
                  }}
                  disabled={isUploadingImage}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-stone-700 hover:bg-stone-50 transition-colors touch-manipulation disabled:opacity-50"
                >
                  <Camera size={18} strokeWidth={2} />
                  <span className="font-medium">{isUploadingImage ? "Uploading..." : "Upload Inspiration"}</span>
                </button>
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

      {/* Pro Mode Library Management Modal */}
      {studioProMode && showLibraryModal && (
        <ImageLibraryModal
          isOpen={showLibraryModal}
          library={imageLibrary}
          onClose={() => setShowLibraryModal(false)}
          onManageCategory={(category) => {
            // Open upload flow for specific category
            console.log('[Pro Mode] Manage category:', category)
            setShowLibraryModal(false)
            setShowUploadFlow(true)
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

      {/* Pro Mode Upload Flow Modal (when triggered from header/input) */}
      {studioProMode && showUploadFlow && !isEmpty && (
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
                showAfterState={true}
                onComplete={async (library) => {
                  await saveLibrary(library)
                  if (library.intent) {
                    await updateIntent(library.intent)
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
                      parts: messageParts,
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
                onCancel={() => setShowUploadFlow(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
