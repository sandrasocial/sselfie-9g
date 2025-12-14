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
} from "lucide-react"
import { useState, useEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import ConceptCard from "./concept-card"
import MayaChatHistory from "./maya-chat-history"
import UnifiedLoading from "./unified-loading"
import { useRouter } from "next/navigation"
import type { SessionUser } from "next-auth" // Assuming SessionUser type is available
import ProModeWrapper from "../studio-pro/pro-mode-wrapper"
import WorkbenchStrip from "../studio-pro/workbench-strip"
import { PromptSuggestionCard as NewPromptSuggestionCard } from "./prompt-suggestion-card"
import type { PromptSuggestion } from "@/lib/maya/prompt-generator"
import { isWorkbenchModeEnabled } from "@/lib/feature-flags"

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
  const processedConceptMessagesRef = useRef<Set<string>>(new Set())
  
  // Studio Pro state
  const [studioProMode, setStudioProMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mayaStudioProMode')
      return saved === 'true'
    }
    return false
  })
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
  const [showGallerySelector, setShowGallerySelector] = useState(false)
  const [galleryImages, setGalleryImages] = useState<any[]>([])
  const [isGeneratingStudioPro, setIsGeneratingStudioPro] = useState(false)
  const processedStudioProMessagesRef = useRef<Set<string>>(new Set())
  const promptGenerationTriggeredRef = useRef<Set<string>>(new Set()) // Track messages that have already triggered prompt generation
  const carouselCardsAddedRef = useRef<Set<string>>(new Set()) // Track messages that already have carousel cards added
  const generateCarouselRef = useRef<((params: { topic: string; slideCount: number }) => Promise<void>) | null>(null)
  const generateReelCoverRef = useRef<((params: { title: string; textOverlay?: string }) => Promise<void>) | null>(null)
  const [isWorkflowChat, setIsWorkflowChat] = useState(false) // Track if we're in a workflow chat (show chat UI within Pro mode)
  
  // Workbench state - only visible in Studio Pro mode when enabled, collapsible
  const [isWorkbenchExpanded, setIsWorkbenchExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('workbenchExpanded')
      return saved === 'true'
    }
    return false // Default to collapsed
  })
  
  // Track workbench image count for badge
  const [workbenchImageCount, setWorkbenchImageCount] = useState(0)
  
  // Track workbench prompt for external updates
  const [workbenchPrompt, setWorkbenchPrompt] = useState("")
  
  // Studio Pro onboarding state
  const [showStudioProOnboarding, setShowStudioProOnboarding] = useState(false)
  
  // Prompt suggestions state
  const [promptSuggestions, setPromptSuggestions] = useState<PromptSuggestion[]>([])
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false)
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false) // Loading state for prompt generation in Studio Pro
  const [pendingPromptRequest, setPendingPromptRequest] = useState<string | null>(null) // Store the request for prompt generation
  
  // Carousel slides state (extracted from messages)
  const [carouselSlides, setCarouselSlides] = useState<Array<{ slideNumber: number; label: string; prompt: string }>>([])
  
  // Workbench prompts state - unified storage for all prompts Maya creates in Studio Pro mode
  const [workbenchPrompts, setWorkbenchPrompts] = useState<Array<{ id: string; title: string; description: string; prompt: string; category?: string }>>([])
  
  // Workbench guide from Maya
  const [workbenchGuide, setWorkbenchGuide] = useState<string>("")
  
  // Persist workbench expanded state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('workbenchExpanded', String(isWorkbenchExpanded))
    }
  }, [isWorkbenchExpanded])

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
    },
    onError: (error) => {
      // Handle different error types safely
      let errorMessage = "Unknown error"
      let errorStack: string | undefined
      
      if (error instanceof Error) {
        errorMessage = error.message
        errorStack = error.stack
      } else if (error && typeof error === "object") {
        // Try to extract message from error object
        errorMessage = (error as any).message || (error as any).error || JSON.stringify(error)
        errorStack = (error as any).stack
      } else if (typeof error === "string") {
        errorMessage = error
      } else {
        errorMessage = String(error)
      }
      
      console.error("[v0] Maya chat error:", {
        error: errorMessage,
        stack: errorStack,
        rawError: error,
        timestamp: new Date().toISOString(),
      })
      
      // TODO: Add toast import if you want user-facing error notifications
      // import { toast } from "sonner"
      // toast.error(errorMessage || "An error occurred while chatting with Maya. Please try again.")
    },
  })

  // DISABLED: Fallback logic that intercepted Maya's responses and sent them to workbench
  // Concept cards now always show - workbench is for manual prompt creation only
  // This useEffect has been completely removed to prevent any workbench auto-extraction
  
  // DISABLED: Auto-extraction of carousel slides from Maya's messages
  // Concept cards now always show - workbench is for manual prompt creation only
  // This useEffect has been completely removed to prevent any workbench auto-extraction

  const loadChat = useCallback(
    async (specificChatId?: number) => {
      try {
        setIsLoadingChat(true)

        // Build URL - either load specific chat or default maya chat
        const url = specificChatId
          ? `/api/maya/load-chat?chatId=${specificChatId}`
          : `/api/maya/load-chat?chatType=maya`

        console.log("[v0] Loading chat from URL:", url)

        const response = await fetch(url)
        console.log("[v0] Load chat response status:", response.status)

        if (!response.ok) {
          throw new Error(`Failed to load chat: ${response.status}`)
        }

        const data = await response.json()
        console.log("[v0] Loaded chat ID:", data.chatId, "Messages:", data.messages?.length, "Title:", data.chatTitle)

        if (data.chatId) {
          setChatId(data.chatId)
        }

        if (data.chatTitle) {
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
              processedConceptMessagesRef.current.add(msg.id.toString())
              console.log("[v0] Marked message as processed for concepts:", msg.id)
            }
          })

          console.log(
            "[v0] Chat loaded with",
            data.messages.length,
            "messages, savedIds:",
            savedMessageIds.current.size,
            "processedConcepts:",
            processedConceptMessagesRef.current.size,
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
        console.error("[v0] Error loading chat:", error)
      } finally {
        setIsLoadingChat(false)
      }
    },
    [setMessages],
  )

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
          alert(`Insufficient credits. ${errorMessage}`)
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
          alert(`Insufficient credits. ${errorMessage}`)
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
    // Don't process while actively streaming, but allow after streaming completes
    if (status === "streaming" || status === "submitted") return

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
    
    if (processedConceptMessagesRef.current.has(messageId)) {
      console.log("[v0] Skipping already processed message:", messageId)
      return
    }

    const alreadyHasConceptCards = lastAssistantMessage.parts?.some(
      (p: any) => p.type === "tool-generateConcepts" && p.output?.concepts?.length > 0,
    )
    if (alreadyHasConceptCards) {
      // Mark as processed so we don't check again
      processedConceptMessagesRef.current.add(messageId)
      console.log("[v0] Message already has concepts, marking as processed:", messageId)
      return
    }

    const textContent =
      typeof lastAssistantMessage.content === "string"
        ? lastAssistantMessage.content
        : lastAssistantMessage.parts
            ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
            .map((p) => p.text)
            .join("") || ""

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
    })

    // DISABLED: [GENERATE_PROMPTS] trigger detection for workbench
    // Concept cards now always show - workbench is for manual prompt creation only
    // Users can manually write prompts in workbench or use concept cards
    // if (studioProMode && isWorkbenchModeEnabled()) {
    //   ... disabled code ...
    // }
    
    // Check for [GENERATE_CONCEPTS] trigger
    // CRITICAL: Use more flexible regex to catch trigger even if Maya stops mid-response
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
      
      // Mark this message as processed BEFORE triggering generation
      processedConceptMessagesRef.current.add(messageId)
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

    // Check for workflow generation triggers FIRST (before other Studio Pro checks)
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

    // Check for workflow generation triggers: [GENERATE_REEL_COVER: ...]
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
  }, [messages, status, isGeneratingConcepts, pendingConceptRequest, isGeneratingStudioPro, studioProMode, isWorkbenchModeEnabled, pendingPromptRequest, isGeneratingPrompts])
  
  // DISABLED: Auto-generation of workbench prompts from [GENERATE_PROMPTS] trigger
  // Concept cards now always show - workbench is for manual prompt creation only
  // This useEffect has been completely removed to prevent automatic workbench prompt generation

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
            if (!cleanContent) return null
            return `${m.role === "user" ? "User" : "Maya"}: ${cleanContent.substring(0, 500)}`
          })
          .filter(Boolean)
          .join("\n")

        console.log("[v0] 📤 Sending generate-concepts request with:", {
          userRequest: pendingConceptRequest,
          hasReferenceImage: !!referenceImageUrl,
          referenceImageUrl: referenceImageUrl ? referenceImageUrl.substring(0, 100) + "..." : undefined,
        })

        const response = await fetch("/api/maya/generate-concepts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userRequest: pendingConceptRequest,
            count: 6, // Changed from hardcoded 3 to 6, allowing Maya to create more concepts
            conversationContext: conversationContext || undefined,
            referenceImageUrl: referenceImageUrl, // Pass reference image if found
            studioProMode: studioProMode, // Pass Studio Pro mode to use Nano Banana prompting
            enhancedAuthenticity: !studioProMode && enhancedAuthenticity, // Only pass if Classic mode and toggle is ON
          }),
        })

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }

        const result = await response.json()
        console.log("[v0] Concept generation result:", result.state, result.concepts?.length)

        if (result.state === "ready" && result.concepts) {
          // Find the current last assistant message ID before updating
          const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant")
          const messageId = lastAssistantMessage?.id?.toString()

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
          if (chatId && result.concepts.length > 0) {
            // Extract text content from the message
            let textContent = ""
            if (lastAssistantMessage?.parts && Array.isArray(lastAssistantMessage.parts)) {
              const textParts = lastAssistantMessage.parts.filter((p: any) => p.type === "text")
              textContent = textParts
                .map((p: any) => p.text)
                .join("\n")
                .trim()
            }

            console.log("[v0] Saving concept cards to database:", result.concepts.length)

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
                conceptCards: result.concepts,
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
            pendingRequest: pendingConceptRequest
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
  }, [pendingConceptRequest, isGeneratingConcepts, setMessages, messages, chatId]) // Added 'messages' to dependency array

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
    const conceptCards: any[] = []
    if (lastAssistantMessage.parts && Array.isArray(lastAssistantMessage.parts)) {
      for (const part of lastAssistantMessage.parts) {
        if (part.type === "tool-generateConcepts") {
          const toolPart = part as any
          const output = toolPart.output
          if (output && output.state === "ready" && Array.isArray(output.concepts)) {
            conceptCards.push(...output.concepts)
          }
        }
      }
    }

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

  // Studio Pro workflow prompts (shown when in Pro mode)
  const getStudioProPrompts = (): Array<{ label: string; prompt: string }> => {
    return [
      {
        label: "Create carousel",
        prompt: "Create a multi-slide Instagram carousel post",
      },
      {
        label: "Create reel cover",
        prompt: "Create a vertical reel cover thumbnail",
      },
      {
        label: "UGC product photo",
        prompt: "Create a user-generated content style product photo",
      },
      {
        label: "Quote graphic",
        prompt: "Create a text-based quote graphic with branding",
      },
    ]
  }

  // Update prompts based on mode
  useEffect(() => {
    if (studioProMode) {
      // Studio Pro mode: show workflow options
      setCurrentPrompts(getStudioProPrompts())
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

  // Generate prompt suggestions based on workbench context
  const generatePromptSuggestions = async (userMessage: string) => {
    if (!isWorkbenchModeEnabled() || !studioProMode) return
    
    setIsGeneratingSuggestions(true)
    
    try {
      // Get selected images from workbench
      // We need to get this from WorkbenchStrip - for now, we'll use uploadedImages
      const workbenchImages = uploadedImages.map((img, idx) => ({
        id: img.url,
        type: img.type === 'base' ? 'user_lora' as const : 'product' as const,
        url: img.url,
        position: idx
      }))
      
      const response = await fetch('/api/maya/generate-prompt-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workbenchImages: workbenchImages,
          userIntent: userMessage,
          previousMessages: messages.slice(-5).map(msg => ({
            role: msg.role,
            content: msg.parts?.find((p: any) => p.type === 'text')?.text || ''
          })),
          contentType: 'custom'
        })
      })
      
      const data = await response.json()
      
      if (data.success && data.suggestions) {
        setPromptSuggestions(data.suggestions)
      }
    } catch (error) {
      console.error('Failed to generate prompt suggestions:', error)
    } finally {
      setIsGeneratingSuggestions(false)
    }
  }
  
  // Handle copying prompt to workbench
  const handleCopyToWorkbench = (prompt: string) => {
    setWorkbenchPrompt(prompt)
    // Dispatch event to update workbench prompt box
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('workbench-prompt-update', { detail: { prompt } }))
    }, 100)
  }
  
  // Handle using prompt in workbench (auto-expand)
  const handleUseInWorkbench = (prompt: string) => {
    setWorkbenchPrompt(prompt)
    // Auto-expand workbench if collapsed
    setIsWorkbenchExpanded(true)
    // Dispatch event to update workbench prompt box
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('workbench-prompt-update', { detail: { prompt } }))
    }, 100)
    // Scroll to workbench after a short delay
    setTimeout(() => {
      const workbenchElement = document.querySelector('[data-workbench-strip]')
      if (workbenchElement) {
        workbenchElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }, 200)
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
          const response = await fetch("/api/maya/new-chat", {
            method: "POST",
          })
          if (response.ok) {
            const data = await response.json()
            if (data.chatId) {
              currentChatId = data.chatId
              setChatId(data.chatId)
              setChatTitle("New Chat")
              console.log("[v0] Created new chat with ID:", data.chatId)
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
    try {
      const response = await fetch("/api/maya/new-chat", {
        method: "POST",
      })

      if (!response.ok) throw new Error("Failed to create new chat")

      const data = await response.json()
      setChatId(data.chatId)
      setChatTitle("New Chat") // Reset title for new chat
      setMessages([])
      savedMessageIds.current.clear()
      processedConceptMessagesRef.current.clear()
      promptGenerationTriggeredRef.current.clear() // Clear prompt generation tracking
      setPendingPromptRequest(null) // Clear any pending requests
      setWorkbenchPrompts([]) // Clear workbench prompts
      setWorkbenchGuide("") // Clear workbench guide

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
      // Create new chat for the new mode
      const response = await fetch("/api/maya/new-chat", {
        method: "POST",
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
      processedConceptMessagesRef.current.clear()
      setIsWorkflowChat(false) // Reset workflow chat state
      setIsWorkbenchExpanded(false) // Reset workbench state
      setWorkbenchImageCount(0) // Reset workbench image count
      setUploadedImages([]) // Clear Studio Pro images
      setPromptSuggestions([]) // Clear prompt suggestions
      setCarouselSlides([]) // Clear carousel slides
      setWorkbenchPrompts([]) // Clear workbench prompts
      setWorkbenchGuide("") // Clear workbench guide
      promptGenerationTriggeredRef.current.clear() // Clear prompt generation tracking
      setPendingPromptRequest(null) // Clear any pending requests

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
      processedConceptMessagesRef.current.clear() // Clear processed concepts for the new chat
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
          // Show user-friendly message
          alert(`Insufficient credits. ${errorMessage}`)
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
    if (!text || !isWorkbenchModeEnabled() || !studioProMode) return []
    
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
  
  // Helper function to remove workflow options from text when they appear as cards
  const removeWorkflowOptionsFromText = (text: string, options: Array<{ label: string; description?: string }>): string => {
    if (options.length === 0) return text
    
    let cleanedText = text
    const lines = cleanedText.split('\n')
    
    // Remove lines that match any of the option labels or descriptions
    cleanedText = lines.filter(line => {
      const trimmedLine = line.trim()
      
      // Skip empty lines
      if (!trimmedLine) return true
      
      // Keep question lines (What topic, How many, etc.)
      if (trimmedLine.match(/^(What|How|Pick|Once|From|Why|The|Teaching)/i) && 
          (trimmedLine.includes('?') || trimmedLine.includes('topic') || trimmedLine.includes('slides') || trimmedLine.includes('overlay'))) {
        return true
      }
      
      // Remove lines that match option labels or descriptions
      const shouldKeep = !options.some(option => {
        const labelLower = option.label.toLowerCase()
        const lineLower = trimmedLine.toLowerCase()
        
        // Check if line contains the option label (at least 10 chars for accuracy)
        if (labelLower.length >= 10 && lineLower.includes(labelLower.substring(0, 10))) {
          return true
        }
        
        // Check if line contains the full label
        if (lineLower.includes(labelLower)) {
          return true
        }
        
        // Check if line contains description
        if (option.description) {
          const descLower = option.description.toLowerCase()
          if (descLower.length >= 10 && lineLower.includes(descLower.substring(0, 10))) {
            return true
          }
        }
        
        return false
      })
      
      return shouldKeep
    }).join('\n')
    
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
    // Remove emojis first
    let cleanedText = removeEmojis(text)
    
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

  // Show Pro mode interface when Studio Pro is enabled
  // BUT: If workbench mode is enabled, show workbench in normal chat UI instead
  if (studioProMode && !isWorkflowChat && !isWorkbenchModeEnabled()) {
    return (
      <div className="flex flex-col h-full bg-white">
        {/* Pro Mode Header with Exit Button */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-xl border-b border-stone-200/50">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full border border-stone-200/60 overflow-hidden">
              <img src="https://i.postimg.cc/fTtCnzZv/out-1-22.png" alt="Maya" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="text-sm font-serif font-extralight tracking-[0.2em] text-stone-950 uppercase">
                Studio Pro
              </h3>
            </div>
          </div>
          
          {/* Exit to Standard Mode Button */}
          <button
            onClick={() => handleModeSwitch(false)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-100 text-stone-900 hover:bg-stone-200 transition-colors"
            aria-label="Switch to Classic mode"
          >
            <span className="text-xs">Switch to Classic</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <ProModeWrapper
            onWorkflowStart={(workflowType) => {
              // Handle form-based workflows (edit/reuse)
              console.log('[STUDIO-PRO] Starting form workflow:', workflowType)
            }}
            onStartWorkflowInChat={(workflowType) => {
              // Switch to chat interface within Pro mode
              setIsWorkflowChat(true)
              const workflowMessage = `[WORKFLOW_START: ${workflowType}]`
              setTimeout(() => {
                // Send message internally without showing it as user input
                if (sendMessage) {
                  sendMessage({
                    role: 'user',
                    parts: [{ type: 'text', text: workflowMessage }],
                  })
                }
              }, 100) // Small delay to ensure chat is ready
            }}
          />
        </div>
      </div>
    )
  }

  // Note: Workflow chat mode now uses the normal chat UI below, but with isWorkflowChat=true
  // The header will show "Studio Pro Chat" and hide Studio Pro controls


  return (
    <div
      className="flex flex-col h-full bg-gradient-to-b from-stone-50 to-white relative overflow-hidden"
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

      <div className="flex-shrink-0 flex items-center justify-between px-3 sm:px-4 py-3 bg-white/80 backdrop-blur-xl border-b border-stone-200/50 relative z-50">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          {/* Back button for workflow chat */}
          {isWorkflowChat && (
            <button
              onClick={() => setIsWorkflowChat(false)}
              className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors flex-shrink-0"
              aria-label="Back to dashboard"
            >
              <svg className="w-5 h-5 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-stone-200/60 overflow-hidden flex-shrink-0">
            <img src="https://i.postimg.cc/fTtCnzZv/out-1-22.png" alt="Maya" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-serif font-extralight tracking-[0.2em] text-stone-950 uppercase">
              {isWorkflowChat ? 'Studio Pro Chat' : chatTitle}
            </h3>
          </div>
        </div>

        {/* Studio Pro Mode Toggle - hide when in workflow chat */}
        {!isWorkflowChat && (
          <div className="flex items-center gap-2 sm:gap-3 mr-2">
            <span className="text-xs text-stone-600 hidden sm:inline">Mode:</span>
            <button
              onClick={() => handleModeSwitch(!studioProMode)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                studioProMode 
                  ? 'bg-stone-900 text-white' 
                  : 'bg-stone-100 text-stone-900'
              }`}
            >
              {studioProMode ? (
                <span className="text-xs font-medium">Studio Pro</span>
              ) : (
                <span className="text-xs">Classic</span>
              )}
            </button>
            
            {/* Studio Pro Onboarding Link */}
            {studioProMode && (
              <button
                onClick={() => setShowStudioProOnboarding(true)}
                className="text-xs text-stone-500 hover:text-stone-700 underline underline-offset-2 transition-colors"
                title="Learn how Studio Pro works"
              >
                How it works
              </button>
            )}
            
            {/* Workbench Toggle - always show when Studio Pro mode is active */}
            {studioProMode && (
              <button
                onClick={() => {
                  setIsWorkbenchExpanded(!isWorkbenchExpanded)
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors relative ${
                  isWorkbenchExpanded && studioProMode
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-900 hover:bg-stone-200'
                }`}
                title={isWorkbenchExpanded ? 'Collapse workbench' : 'Expand workbench'}
              >
                <span className="text-xs font-medium">Workbench</span>
                {workbenchImageCount > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isWorkbenchExpanded && studioProMode
                      ? 'bg-white/20 text-white' 
                      : 'bg-stone-900 text-white'
                  }`}>
                    {workbenchImageCount}
                  </span>
                )}
                <svg 
                  className={`w-3 h-3 transition-transform duration-200 ${
                    isWorkbenchExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor" 
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        )}
        
        {/* Exit to Classic button when in workflow chat */}
        {isWorkflowChat && (
          <button
            onClick={() => handleModeSwitch(false)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-100 text-stone-900 hover:bg-stone-200 transition-colors"
            aria-label="Switch to Classic mode"
          >
            <span className="text-xs">Switch to Classic</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <button
          onClick={() => setShowNavMenu(!showNavMenu)}
          className="flex items-center justify-center px-3 h-9 sm:h-10 rounded-lg hover:bg-stone-100/50 transition-colors touch-manipulation active:scale-95"
          aria-label="Navigation menu"
          aria-expanded={showNavMenu}
        >
          <span className="text-xs sm:text-sm font-serif tracking-[0.2em] text-stone-950 uppercase">MENU</span>
        </button>
      </div>

        {/* Studio Pro Controls - hide when in workflow chat or workbench mode */}
        {studioProMode && !isWorkflowChat && !isWorkbenchModeEnabled() && (
          <div className="px-3 sm:px-4 py-3 bg-gradient-to-r from-stone-50 to-stone-100/50 border-b border-stone-200/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-stone-900">Studio Pro</span>
              <span className="text-xs text-stone-600">
                {uploadedImages.length} / 14 images
              </span>
            </div>
            
            {/* Studio Pro Capabilities Hint */}
            <div className="mb-2 text-[10px] text-stone-600 leading-relaxed">
              Text rendering • Real-time data • Multi-image composition • Creative controls
            </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowGallerySelector(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors text-xs"
            >
              <Image className="w-4 h-4" />
              <span>Pick from Gallery</span>
            </button>
            
            <button
              onClick={() => {
                if (uploadedImages.length >= 14) {
                  alert('Maximum 14 images allowed (base images + products)')
                  return
                }
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = 'image/*'
                input.multiple = true // Allow multiple file selection
                input.onchange = (e) => handleProductUpload(e)
                input.click()
              }}
              disabled={isUploadingImage || uploadedImages.length >= 14}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors text-xs disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isUploadingImage ? 'Uploading...' : 'Upload Product'}</span>
            </button>

            {uploadedImages.length > 0 && (
              <button
                onClick={clearStudioProImages}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors text-xs"
              >
                <X className="w-4 h-4" />
                <span>Clear</span>
              </button>
            )}
          </div>
          
          {/* Show selected images */}
          {uploadedImages.length > 0 && (
            <div className="mt-3">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {uploadedImages.map((img, idx) => (
                  <div key={idx} className="relative flex-shrink-0">
                    <img 
                      src={img.url} 
                      alt={img.label || img.type}
                      className="w-16 h-16 object-cover rounded-lg border border-stone-200"
                    />
                    <button
                      onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-stone-900 text-white rounded-full flex items-center justify-center text-xs hover:bg-stone-700"
                    >
                      ×
                    </button>
                    <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[8px] px-1 rounded-b-lg text-center">
                      {img.type === 'base' ? 'Base' : img.label || 'Product'}
                    </span>
                  </div>
                ))}
              </div>
              {uploadedImages.length >= 14 && (
                <p className="text-xs text-stone-500 mt-2 text-center">
                  Maximum 14 images reached
                </p>
              )}
            </div>
          )}
        </div>
      )}

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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-2">
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
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-stone-200/50">
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
            <div className="flex-shrink-0 px-6 py-6 border-b border-stone-200/50">
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
            <div className="flex-shrink-0 px-6 py-4 border-t border-stone-200/50 bg-white/95">
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
        <div className="flex-shrink-0 mx-4 mt-2 mb-2 bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl p-4 shadow-xl shadow-stone-950/5 animate-in slide-in-from-top-2 duration-300">
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
          {isEmpty && !isTyping && (
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
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 w-full max-w-2xl px-2 sm:px-4 -mx-2 sm:-mx-0">
                {currentPrompts.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (studioProMode) {
                        // Check if workbench mode is enabled
                        if (isWorkbenchModeEnabled()) {
                          // Workbench mode: Send message to Maya - she will ask clarifying questions before generating prompts
                          const guidanceMessage = item.prompt
                          console.log('[WORKBENCH] Quick prompt clicked, sending guidance message:', guidanceMessage)
                          
                          // Don't auto-expand workbench - let users see Maya's response first, then expand manually
                          // Users can click the Workbench button when ready
                          
                          // Send the message - use setTimeout to ensure state is updated
                          setTimeout(() => {
                            handleSendMessage(guidanceMessage)
                          }, 100)
                        } else {
                          // Old Studio Pro mode: trigger workflow start
                          const workflowType = item.label.toLowerCase()
                            .replace('create ', '')
                            .replace(' ', '-')
                          // Set workflow chat mode and send workflow start message
                          setIsWorkflowChat(true)
                          const workflowMessage = `[WORKFLOW_START: ${workflowType}]`
                          setTimeout(() => {
                            if (sendMessage) {
                              sendMessage({
                                role: 'user',
                                parts: [{ type: 'text', text: workflowMessage }],
                              })
                            }
                          }, 100)
                        }
                      } else {
                        // Classic mode, send regular message
                        handleSendMessage(item.prompt)
                      }
                    }}
                    className="flex-shrink-0 px-4 py-2.5 sm:py-3 bg-white/50 backdrop-blur-xl border border-white/70 rounded-xl hover:bg-stone-100 hover:border-stone-300 transition-all duration-300 touch-manipulation active:scale-95 min-h-[44px]"
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
                // Hide workflow start messages from display
                if (msg.role === 'user' && msg.parts) {
                  const textParts = msg.parts.filter((p: any) => p.type === 'text')
                  const text = textParts.map((p: any) => p.text).join(' ')
                  if (text.match(/\[WORKFLOW_START:/i)) {
                    return false // Hide this message
                  }
                }
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
                                
                                // In Studio Pro mode, remove all prompts from display text (they're in workbench)
                                if (studioProMode && isWorkbenchModeEnabled()) {
                                  // Store original text before cleaning
                                  const originalText = displayText
                                  
                                  // Remove GENERATE_PROMPTS trigger first (but preserve guide text before it)
                                  displayText = displayText.replace(/\[GENERATE_PROMPTS[:\s]+[^\]]+\]/gi, '')
                                  displayText = displayText.replace(/\[GENERATE_PROMPTS\]/gi, '')
                                  
                                  // Aggressively remove all prompt patterns
                                  // Remove "Here are X prompts" or "Here are X options" sections
                                  displayText = displayText.replace(/Here are \d+.*?prompts.*?(?=\n\n|$)/gis, '')
                                  displayText = displayText.replace(/Here are \d+.*?options.*?(?=\n\n|$)/gis, '')
                                  
                                  // Remove all "Option X - Label:" sections with full prompts
                                  displayText = displayText.replace(/Option\s+\d+\s*[-–]\s*[^:]+:[\s\S]*?(?=Option\s+\d+\s*[-–]|Copy|Select|then hit|$)/gi, '')
                                  
                                  // Remove all "Slide X - Label:" sections
                                  displayText = displayText.replace(/Slide\s+\d+\s*(?:of\s+\d+)?\s*[-–]\s*[^:]+:[\s\S]*?(?=Slide\s+\d+\s*[-–]|Copy|Select|then hit|$)/gi, '')
                                  
                                  // Remove code blocks with prompts
                                  displayText = displayText.replace(/```[\s\S]*?```/g, '')
                                  
                                  // Remove common ending phrases
                                  displayText = displayText
                                    .replace(/Copy the one that feels right.*$/is, '')
                                    .replace(/Copy any of these.*$/is, '')
                                    .replace(/Select your images.*$/is, '')
                                    .replace(/then hit Generate.*$/is, '')
                                    .replace(/Here are \d+ different vibes.*$/is, '')
                                    .replace(/Which style feels.*$/is, '')
                                    .replace(/Keep the .*?facial features EXACTLY identical.*?This is critical\./gis, '')
                                    .replace(/Composition:.*?Final Use:.*?/gis, '')
                                    .replace(/Character Lock.*?/gis, '')
                                    .replace(/\*\*Character Lock\*\*/gi, '')
                                    .replace(/\n{3,}/g, '\n\n')
                                    .trim()
                                  
                                  // Only show fallback message if text is actually empty AND we're not waiting for prompt generation
                                  // AND the message is complete (not streaming)
                                  const isMessageComplete = status !== "streaming" && msg.id !== messages[messages.length - 1]?.id
                                  const isLastMessage = msg.id === messages[messages.length - 1]?.id
                                  const isCurrentlyStreaming = isLastMessage && status === "streaming"
                                  
                                  // If text is very short, check if we should show fallback or preserve guide text
                                  if (displayText.length < 20) {
                                    // Try to extract guide text from original (before [GENERATE_PROMPTS])
                                    const guideMatch = originalText.match(/(.+?)\[GENERATE_PROMPTS\]/is)
                                    if (guideMatch && guideMatch[1].trim().length > 20) {
                                      // Use the guide text instead of fallback
                                      displayText = guideMatch[1].trim()
                                    } else if (!isCurrentlyStreaming && !isGeneratingPrompts && !pendingPromptRequest && isMessageComplete) {
                                      // Only show fallback if message is complete and we're not generating
                                      displayText = "I'll create those prompts for you in the workbench!"
                                    } else if (isCurrentlyStreaming || isGeneratingPrompts || pendingPromptRequest) {
                                      // If we're waiting, show nothing or minimal text
                                      displayText = originalText.replace(/\[GENERATE_PROMPTS[:\s]+[^\]]+\]/gi, '').trim() || ""
                                    }
                                  }
                                } else if (parsedPromptSuggestions.length > 0) {
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
                                
                                // Clean up any remaining prompt fragments
                                displayText = displayText
                                  .replace(/Keep the .*?facial features EXACTLY identical.*?This is critical\./gis, '')
                                  .replace(/Composition:.*?Final Use:.*?Slide \d+ of \d+/gis, '')
                                  .replace(/\n{3,}/g, '\n\n')
                                  .trim()
                                }
                                
                                // Extract options from text if it's a workflow options message
                                // First check if message contains option keywords
                                const hasOptionKeywords = studioProMode && 
                                  msg.role === 'assistant' &&
                                  (text.includes('What topic') || 
                                   text.includes('How many slides') ||
                                   text.includes('Do you want text overlay') ||
                                   text.includes('Pick one') ||
                                   text.includes('choose'))
                                
                                let workflowOptions: Array<{ label: string; value: string; description?: string }> = []
                                
                                // Only parse options if keywords are present
                                if (hasOptionKeywords) {
                                  // Parse topic options - handle multiple formats
                                  if (text.includes('What topic')) {
                                    const lines = text.split('\n')
                                    
                                    // Pattern 1: Bold text with description: **Title** - Description
                                    lines.forEach(line => {
                                      const boldMatch = line.match(/\*\*([^*]+)\*\*/)
                                      if (boldMatch) {
                                        const label = boldMatch[1].trim()
                                        const description = line.replace(/\*\*[^*]+\*\*\s*-?\s*/, '').trim()
                                        if (label && !workflowOptions.some(opt => opt.label === label)) {
                                          workflowOptions.push({
                                            label,
                                            value: label.toLowerCase().replace(/\s+/g, '-'),
                                            description: description || undefined
                                          })
                                        }
                                      }
                                    })
                                    
                                    // Pattern 2: Plain text with dash: "Title - Description"
                                    if (workflowOptions.length === 0) {
                                      lines.forEach(line => {
                                        const trimmedLine = line.trim()
                                        // Match lines that look like "Title - Description" (not starting with special chars)
                                        if (trimmedLine && 
                                            trimmedLine.length > 10 && 
                                            trimmedLine.includes(' - ') &&
                                            !trimmedLine.startsWith('*') &&
                                            !trimmedLine.startsWith('-') &&
                                            !trimmedLine.startsWith('•') &&
                                            !trimmedLine.match(/^(What|How|Pick|Once|From)/i)) {
                                          const parts = trimmedLine.split(' - ')
                                          if (parts.length >= 2) {
                                            const label = parts[0].trim()
                                            const description = parts.slice(1).join(' - ').trim()
                                            if (label && !workflowOptions.some(opt => opt.label === label)) {
                                              workflowOptions.push({
                                                label,
                                                value: label.toLowerCase().replace(/\s+/g, '-'),
                                                description: description || undefined
                                              })
                                            }
                                          }
                                        }
                                      })
                                    }
                                    
                                    // Pattern 3: Fallback - extract all bold text
                                    if (workflowOptions.length === 0) {
                                      const topicMatches = text.match(/\*\*([^*]+)\*\*/g)
                                      if (topicMatches) {
                                        topicMatches.forEach(match => {
                                          const label = match.replace(/\*\*/g, '').trim()
                                          if (label && !workflowOptions.some(opt => opt.label === label)) {
                                            workflowOptions.push({
                                              label,
                                              value: label.toLowerCase().replace(/\s+/g, '-')
                                            })
                                          }
                                        })
                                      }
                                    }
                                  }
                                  // Parse slide count options
                                  if (text.includes('How many slides')) {
                                    workflowOptions = [
                                      { label: '3 slides', value: '3', description: 'Perfect for quick tips' },
                                      { label: '4 slides', value: '4', description: 'Balanced storytelling' },
                                      { label: '5 slides', value: '5', description: 'Comprehensive guide' },
                                    ]
                                  }
                                  // Parse text overlay options
                                  if (text.includes('text overlay') || text.includes('Do you want text')) {
                                    workflowOptions = [
                                      { label: 'Yes, add text', value: 'yes', description: 'Include text overlay' },
                                      { label: 'No text overlay', value: 'no', description: 'Image only' },
                                    ]
                                  }
                                }
                                
                                // Only show workflow options if we actually found valid options
                                const isWorkflowOptions = hasOptionKeywords && workflowOptions.length > 0
                                
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
                                if (workflowOptions.length > 0) {
                                  displayText = removeWorkflowOptionsFromText(displayText, workflowOptions)
                                }
                                
                                return (
                                  <div key={idx}>
                                    {renderMessageContent(displayText, msg.role === "user")}
                                    
                                    {/* Render prompt suggestion cards from API in workbench mode - HIDDEN in Studio Pro mode (prompts go to workbench instead) */}
                                    {msg.role === 'assistant' && promptSuggestions.length > 0 && msg.id === messages[messages.length - 1]?.id && !(studioProMode && isWorkbenchModeEnabled()) && (
                                      <div className="mt-4 space-y-3">
                                        {promptSuggestions.map((suggestion) => (
                                          <NewPromptSuggestionCard
                                            key={`api-suggestion-${suggestion.id}`}
                                            suggestion={suggestion}
                                            onCopyToWorkbench={handleCopyToWorkbench}
                                            onUseInWorkbench={handleUseInWorkbench}
                                          />
                                        ))}
                                      </div>
                                    )}
                                    
                                    {/* Render non-carousel suggestions as cards (carousel slides handled in workbench) - HIDDEN in Studio Pro mode */}
                                    {(() => {
                                      // In Studio Pro mode with workbench, don't show prompt cards - they're in workbench
                                      if (studioProMode && isWorkbenchModeEnabled()) {
                                        return null
                                      }
                                      
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
                                                    onCopyToWorkbench={handleCopyToWorkbench}
                                                    onUseInWorkbench={handleUseInWorkbench}
                                                  />
                                                )
                                              })}
                                            </div>
                                          )
                                        }
                                      }
                                      return null
                                    })()}
                                    
                                    {isWorkflowOptions && workflowOptions.length > 0 && (
                                      <div className="mt-4 space-y-3">
                                        {workflowOptions.map((option, optIdx) => (
                                          <button
                                            key={optIdx}
                                            onClick={() => {
                                              // Send the selected option as a user message
                                              if (sendMessage) {
                                                sendMessage({
                                                  role: 'user',
                                                  parts: [{ type: 'text', text: option.label }],
                                                })
                                              }
                                            }}
                                            className="w-full bg-white/80 backdrop-blur-md border border-stone-200/80 rounded-2xl p-4 sm:p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:border-stone-300/80 transition-all duration-200 text-left group"
                                          >
                                            <div className="flex items-start justify-between gap-3">
                                              <div className="flex-1">
                                                <h4 className="text-sm font-serif font-extralight tracking-[0.1em] text-stone-950 mb-2 group-hover:text-stone-900">
                                                  {option.label}
                                                </h4>
                                                {option.description && (
                                                  <p className="text-xs text-stone-600 leading-relaxed">
                                                    {option.description}
                                                  </p>
                                                )}
                                              </div>
                                              <svg 
                                                className="w-5 h-5 text-stone-400 group-hover:text-stone-600 transition-colors flex-shrink-0 mt-0.5" 
                                                fill="none" 
                                                viewBox="0 0 24 24" 
                                                stroke="currentColor" 
                                                strokeWidth={2}
                                              >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                              </svg>
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    )}
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
                                      {concepts.map((concept: any, conceptIndex: number) => (
                                        <ConceptCard 
                                          key={conceptIndex} 
                                          concept={concept} 
                                          chatId={chatId || undefined} 
                                          onCreditsUpdate={setCreditBalance}
                                          studioProMode={studioProMode}
                                          baseImages={uploadedImages.filter(img => img.type === 'base').map(img => img.url)}
                                        />
                                      ))}
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
                                    <div className="bg-white border rounded-lg overflow-hidden transition-all duration-300 hover:shadow-lg border-stone-300 bg-gradient-to-br from-stone-50 to-white">
                                      <div className="flex items-center justify-between px-3 py-2.5 border-b border-stone-200">
                                        <div className="flex items-center gap-2.5">
                                          <div className="relative">
                                            <div className="absolute inset-0 bg-gradient-to-tr from-purple-600 via-pink-600 to-orange-500 rounded-full p-[2px]">
                                              <div className="bg-white rounded-full w-full h-full"></div>
                                            </div>
                                            <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-stone-200 to-stone-300 flex items-center justify-center">
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
                                              className="group relative w-full text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] min-h-[40px] flex items-center justify-center bg-gradient-to-br from-stone-800 via-stone-900 to-stone-950 hover:from-stone-900 hover:via-stone-950 hover:to-black"
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

          {/* Concept generation loading indicator */}
          {isGeneratingConcepts && (
            <div className="flex justify-start mt-4">
              <div className="bg-white/50 backdrop-blur-xl border border-white/70 p-3 rounded-2xl max-w-[85%] shadow-lg shadow-stone-900/5">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
                  <span className="text-xs tracking-[0.15em] uppercase font-light text-stone-600">
                    Creating photo concepts...
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Prompt generation loading indicator for Studio Pro mode */}
          {isGeneratingPrompts && studioProMode && isWorkbenchModeEnabled() && (
            <div className="flex justify-start mt-4">
              <div className="bg-white/50 backdrop-blur-xl border border-white/70 p-3 rounded-2xl max-w-[85%] shadow-lg shadow-stone-900/5">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
                  <span className="text-xs tracking-[0.15em] uppercase font-light text-stone-600">
                    Creating your prompts...
                  </span>
                </div>
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
            className="fixed bottom-[11rem] right-4 sm:right-6 p-3 bg-stone-950 text-white rounded-full shadow-2xl shadow-stone-900/40 hover:scale-110 active:scale-95 transition-all duration-300 z-10 animate-in fade-in slide-in-from-bottom-2 min-w-[48px] min-h-[48px] flex items-center justify-center touch-manipulation"
            aria-label="Scroll to bottom"
          >
            <ArrowDown size={18} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Workbench Strip - Show ABOVE input area when enabled and expanded */}
      {(() => {
        const workbenchEnabled = isWorkbenchModeEnabled()
        const shouldShow = workbenchEnabled && studioProMode && isWorkbenchExpanded
        return shouldShow ? (
          <div 
            className="fixed left-0 right-0 z-40 transition-all duration-300 ease-in-out"
            style={{ 
              bottom: '140px', // Position above input area (input + suggestions ~140px)
              maxHeight: 'calc(100vh - 140px)',
              overflowY: 'auto',
            }}
          >
            <div className="animate-in slide-in-from-bottom-4 duration-300">
              <WorkbenchStrip
                carouselSlides={carouselSlides.length > 0 ? carouselSlides : undefined}
                prompts={workbenchPrompts.length > 0 ? workbenchPrompts : undefined}
                guide={workbenchGuide || undefined}
                onImageCountChange={(count) => setWorkbenchImageCount(count)}
                onEnhancePrompt={async (prompt) => {
                try {
                  // Call Maya API directly to get enhanced prompt
                  const response = await fetch('/api/maya/chat', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'x-studio-pro-mode': 'true',
                    },
                    body: JSON.stringify({
                      messages: [{
                        role: 'user',
                        parts: [{ 
                          type: 'text', 
                          text: `Enhance this prompt for Studio Pro image generation with Nano Banana Pro. Return ONLY the enhanced prompt text, no explanations or commentary. Original: "${prompt}"` 
                        }],
                      }],
                    }),
                  })

                  if (!response.ok) {
                    throw new Error('Failed to enhance prompt')
                  }

                  // Read the stream response
                  const reader = response.body?.getReader()
                  const decoder = new TextDecoder()
                  let fullResponse = ''
                  
                  if (reader) {
                    while (true) {
                      const { done, value } = await reader.read()
                      if (done) break
                      
                      const chunk = decoder.decode(value, { stream: true })
                      // Parse SSE format - look for data: lines
                      const lines = chunk.split('\n')
                      for (const line of lines) {
                        if (line.startsWith('data: ')) {
                          try {
                            const data = JSON.parse(line.slice(6))
                            // Handle different response formats
                            if (data.content) {
                              fullResponse += data.content
                            } else if (data.text) {
                              fullResponse += data.text
                            } else if (typeof data === 'string') {
                              fullResponse += data
                            }
                          } catch (e) {
                            // If not JSON, might be plain text after "data: "
                            const textPart = line.slice(6).trim()
                            if (textPart) {
                              fullResponse += textPart
                            }
                          }
                        } else if (line.trim() && !line.startsWith('event:') && !line.startsWith('id:')) {
                          // Some SSE formats don't use "data:" prefix
                          fullResponse += line.trim() + ' '
                        }
                      }
                    }
                  }

                  // Clean up the response - extract just the prompt
                  // Remove common prefixes Maya might add
                  let cleanedPrompt = fullResponse
                    .replace(/^(Here's|Here is|Enhanced prompt|Improved prompt|Better prompt)[:\s]*/i, '')
                    .replace(/^["']|["']$/g, '') // Remove surrounding quotes
                    .trim()

                  // If response contains quotes, extract text between them
                  const quotedMatch = cleanedPrompt.match(/"([^"]+)"/)
                  if (quotedMatch) {
                    cleanedPrompt = quotedMatch[1]
                  }

                  // If still empty or too similar to original, return original
                  if (!cleanedPrompt || cleanedPrompt.length < prompt.length * 0.5) {
                    return prompt // Return original if enhancement failed
                  }

                  return cleanedPrompt
                } catch (error) {
                  console.error('[WORKBENCH] Error enhancing prompt:', error)
                  return null
                }
              }} />
            </div>
          </div>
        ) : null
      })()}

      <div
        className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-3xl border-t border-stone-200/50 px-3 sm:px-4 py-2.5 sm:py-3 z-50 safe-bottom"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)",
        }}
      >
        {!isEmpty && !uploadedImage && (
          <div className="mb-2">
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
              {currentPrompts.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (studioProMode) {
                      // In Studio Pro mode, trigger workflow start
                      const workflowType = item.label.toLowerCase()
                        .replace('create ', '')
                        .replace(' ', '-')
                      // Set workflow chat mode and send workflow start message
                      setIsWorkflowChat(true)
                      const workflowMessage = `[WORKFLOW_START: ${workflowType}]`
                      setTimeout(() => {
                        if (sendMessage) {
                          sendMessage({
                            role: 'user',
                            parts: [{ type: 'text', text: workflowMessage }],
                          })
                        }
                      }, 100)
                    } else {
                      // Classic mode, send regular message
                      handleSendMessage(item.prompt)
                    }
                  }}
                  disabled={isTyping}
                  className="flex-shrink-0 px-3 py-2 bg-white/40 backdrop-blur-xl border border-white/60 rounded-lg hover:bg-white/60 transition-all duration-300 disabled:opacity-50 touch-manipulation active:scale-95 min-h-[44px]"
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
              className="w-full pl-[5.5rem] pr-12 py-3 bg-white/40 backdrop-blur-2xl border border-white/60 rounded-xl text-stone-950 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-950/50 focus:bg-white/60 font-medium text-[16px] min-h-[48px] max-h-[80px] shadow-lg shadow-stone-950/10 transition-all duration-300 resize-none overflow-y-auto leading-relaxed touch-manipulation"
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
              
              <h2 className="text-xl font-serif font-light tracking-wide text-stone-900 mb-4 pr-8 flex-shrink-0">How Studio Pro Works</h2>
              <div className="space-y-3 text-sm text-stone-600 leading-relaxed overflow-y-auto flex-1 min-h-0 pb-4">
                <p>
                  Studio Pro mode gives you advanced creative control with powerful features for professional content creation.
                </p>
                <p>
                  <strong>What you can create:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Instagram carousels with text overlays</li>
                  <li>Multi-image compositions (up to 14 images)</li>
                  <li>Reel covers with custom text</li>
                  <li>Brand scenes with product integration</li>
                  <li>Educational infographics with real-time data</li>
                  <li>Text rendering in any language</li>
                </ul>
                <p className="pt-2">
                  <strong>Concept Cards - Quick & Easy:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Maya generates concept cards with creative ideas for your content</li>
                  <li>Each concept card lets you add reference images directly (upload from device or choose from gallery)</li>
                  <li>Click the 3-dot menu (⋮) on any concept card to view and edit Maya's generated prompt</li>
                  <li>Customize the prompt to your exact needs, then generate</li>
                  <li>Perfect for quick content creation without writing prompts yourself</li>
                </ul>
                <p className="pt-2">
                  <strong>Workbench - Advanced Control:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Use the Workbench for more complex tasks and full creative control</li>
                  <li>Write your own prompts or paste prompts from anywhere</li>
                  <li>Select multiple reference images (up to 14 images)</li>
                  <li>Perfect for multi-image compositions, complex edits, and precise control</li>
                  <li>Access the Workbench from the Studio Pro dashboard</li>
                </ul>
                <p className="pt-2">
                  <strong>How to use Maya:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Ask Maya for content ideas - she'll create concept cards automatically</li>
                  <li>Add your own images to concept cards for personalized results</li>
                  <li>Edit prompts via the 3-dot menu if you want to adjust Maya's suggestions</li>
                  <li>Use the Workbench when you need more control or have specific requirements</li>
                  <li>Maya detects what you want (carousel, reel cover, etc.) and uses the right templates</li>
                </ul>
                <p className="pt-2">
                  <strong>Pro tips:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Start with concept cards for quick inspiration - they're perfect for most content</li>
                  <li>Use the 3-dot menu to fine-tune prompts before generating</li>
                  <li>Switch to Workbench for complex multi-image projects or custom workflows</li>
                  <li>Upload style references (like Pinterest outfits) to match aesthetics</li>
                  <li>Maya automatically uses the right templates for carousels, reel covers, and more</li>
                </ul>
                <p className="pt-2">
                  <strong>Cost:</strong> 5 credits per generation
                </p>
                <p className="pt-2 text-xs text-stone-500">
                  Images are generated using advanced AI models optimized for professional content creation.
                </p>
              </div>
              <button
                onClick={() => setShowStudioProOnboarding(false)}
                className="w-full bg-stone-900 text-white px-6 py-3 rounded-lg text-sm font-light tracking-wide hover:bg-stone-800 transition-colors mt-4 flex-shrink-0"
              >
                Got it
              </button>
            </div>
          </div>,
          document.body
        )}

        {showChatMenu && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-white/95 backdrop-blur-3xl border border-stone-200 rounded-2xl overflow-hidden shadow-xl shadow-stone-950/10 animate-in slide-in-from-bottom-2 duration-300">
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
          </div>
        )}
      </div>
    </div>
  )
}
