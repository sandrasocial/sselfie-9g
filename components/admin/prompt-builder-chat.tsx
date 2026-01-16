"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useChat } from "@ai-sdk/react"
import { Send, Sliders, X, Check, XCircle, Image as ImageIcon, Wand2, Loader2, CheckCircle2, FileText, Eye, Copy, MoreVertical } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import MayaChatHistory from "@/components/sselfie/maya-chat-history"
import ConceptCard from "@/components/sselfie/concept-card"
import UnifiedLoading from "@/components/sselfie/unified-loading"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { loadUniversalPromptsForAdmin } from '@/lib/admin/universal-prompts-loader'
import { detectCategoryAndBrand } from '@/lib/maya/prompt-templates/high-end-brands/category-mapper'
import { Typography, Colors, Spacing, BorderRadius, ButtonLabels } from '@/lib/maya/pro/design-system'
import ImageUploadFlow from '@/components/sselfie/pro-mode/ImageUploadFlow'
import type { ImageLibrary } from '@/lib/maya/pro/category-system'
import FullscreenImageModal from '@/components/sselfie/fullscreen-image-modal'

const PROMPT_BUILDER_SYSTEM = `You are Maya, helping Sandra create and refine image generation prompts for her SSELFIE Studio prompt guides.

When Sandra describes what she wants:
1. Understand the concept (e.g., "Chanel luxury editorial", "ALO workout shots")
2. Reference the Universal AI Image Prompts collection she uploaded
3. Suggest 2-3 prompt variations as concept cards
4. Include: concept title, description, and full prompt text
5. Wait for Sandra to pick one and click "Generate Image"

After image generation:
- Show the result
- Ask if she wants to approve it or refine the prompt
- If approved, offer to add to the current guide

Keep responses concise and action-oriented.`

interface PromptBuilderChatProps {
  userId: string
  selectedGuideId?: number | null
  selectedGuideCategory?: string | null
  onGuideChange?: (id: number | null, category: string | null) => void
}

export default function PromptBuilderChat({ 
  userId, 
  selectedGuideId: propSelectedGuideId,
  selectedGuideCategory: propSelectedGuideCategory,
  onGuideChange,
  studioProMode: propStudioProMode,
  onModeSwitch: propOnModeSwitch
}: PromptBuilderChatProps) {
  // All state declarations first
  const [chatId, setChatId] = useState<number | null>(null)
  const [isLoadingChat, setIsLoadingChat] = useState(false) // Start as false - don't block input
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Fallback input state in case useChat doesn't provide handleInputChange
  const [localInput, setLocalInput] = useState("")
  // Mode switching: Classic (Flux) vs Pro Mode (Nano Banana Pro)
  // Use prop if provided, otherwise manage locally (for backward compatibility)
  const [localStudioProMode, setLocalStudioProMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('adminPromptBuilderStudioProMode')
      return saved === 'true'
    }
    return false // Default to Classic Mode
  })
  const studioProMode = propStudioProMode !== undefined ? propStudioProMode : localStudioProMode
  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showLibraryWizard, setShowLibraryWizard] = useState(false)
  // Initialize image library from localStorage
  const [imageLibrary, setImageLibrary] = useState<ImageLibrary>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('adminPromptBuilderImageLibrary')
        if (saved) {
          const parsed = JSON.parse(saved)
          return {
            selfies: parsed.selfies || [],
            products: parsed.products || [],
            people: parsed.people || [],
            vibes: parsed.vibes || [],
            intent: parsed.intent || '',
          }
        }
      } catch (error) {
        console.error('[PromptBuilder] Error loading image library from localStorage:', error)
      }
    }
    return {
      selfies: [],
      products: [],
      people: [],
      vibes: [],
      intent: '',
    }
  })
  
  // Persist image library to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('adminPromptBuilderImageLibrary', JSON.stringify(imageLibrary))
      } catch (error) {
        console.error('[PromptBuilder] Error saving image library to localStorage:', error)
      }
    }
  }, [imageLibrary])

  // Generation settings
  const [styleStrength, setStyleStrength] = useState(1.0)
  const [promptAccuracy, setPromptAccuracy] = useState(3.5)
  const [aspectRatio, setAspectRatio] = useState("4:5")
  const [realismStrength, setRealismStrength] = useState(0.2)

  // Track approved/rejected images
  const [approvedImages, setApprovedImages] = useState<Set<string>>(new Set())
  const [rejectedImages, setRejectedImages] = useState<Set<string>>(new Set())

  // Track generating images
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set())
  const [generatedImages, setGeneratedImages] = useState<Map<string, {
    imageUrl: string
    predictionId: string
    generationId: number
    concept: any
  }>>(new Map())

  // Track current guide category (will be set when guide is selected)
  const [currentGuideCategory, setCurrentGuideCategory] = useState<string>(
    propSelectedGuideCategory || "portrait"
  )
  const [currentGuideId, setCurrentGuideId] = useState<number | null>(
    propSelectedGuideId || null
  )

  // Template sidebar state - declared early to avoid initialization errors
  const [showTemplateSidebar, setShowTemplateSidebar] = useState(false)
  const [loadedTemplates, setLoadedTemplates] = useState<any[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  // Concept generation state
  const [displayedConcepts, setDisplayedConcepts] = useState<any[]>([])
  const [isGeneratingConcepts, setIsGeneratingConcepts] = useState(false)
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(new Set())
  
  // Brand detection state
  const [categoryAutoSelected, setCategoryAutoSelected] = useState(false)
  const [lastAutoSelectedCategory, setLastAutoSelectedCategory] = useState<string | null>(null)
  
  // Prompt structure viewer state
  const [viewingPromptStructure, setViewingPromptStructure] = useState<any | null>(null)
  
  // Fullscreen image modal state
  const [fullscreenImage, setFullscreenImage] = useState<{
    imageUrl: string
    title: string
  } | null>(null)
  
  // Hooks
  const { toast } = useToast()

  // Sync with parent component when props change
  useEffect(() => {
    if (propSelectedGuideId !== undefined) {
      console.log("[PromptBuilder] Guide ID updated from props:", propSelectedGuideId)
      setCurrentGuideId(propSelectedGuideId)
    }
    if (propSelectedGuideCategory !== undefined) {
      console.log("[PromptBuilder] Guide category updated from props:", propSelectedGuideCategory)
      setCurrentGuideCategory(propSelectedGuideCategory)
    }
  }, [propSelectedGuideId, propSelectedGuideCategory])

  const loadTemplatesWithDetails = useCallback(async (category: string) => {
    setLoadingTemplates(true)
    try {
      // Import template system
      const { getAllTemplatesForCategory } = await import('@/lib/maya/prompt-templates/high-end-brands')
      const { BRAND_CATEGORIES } = await import('@/lib/maya/prompt-templates/high-end-brands/brand-registry')
      
      const categoryMap: Record<string, string> = {
        'Chanel Luxury': 'luxury',
        'ALO Workout': 'wellness',
        'Travel': 'travel_lifestyle',
        'Wellness': 'wellness',
        'Lifestyle': 'lifestyle',
        'Fashion': 'fashion',
        'Beauty': 'beauty',
        'Tech': 'tech',
        'Seasonal Christmas': 'luxury',
      }
      
      const templateCategoryKey = categoryMap[category] || 'lifestyle'
      const brandCategory = BRAND_CATEGORIES[templateCategoryKey as keyof typeof BRAND_CATEGORIES]
      
      if (!brandCategory) {
        setLoadedTemplates([])
        return
      }
      
      const templates = getAllTemplatesForCategory(brandCategory)
      
      // Get first 12 templates
      const selectedTemplates = templates.slice(0, 12).map(t => {
        try {
          const exampleContext = {
            userImages: [],
            contentType: 'concept' as const,
            userIntent: category,
          }
          const promptPreview = t.promptStructure(exampleContext)
          
          return {
            id: t.id,
            title: t.name || t.id,
            category: t.category || category,
            description: t.description || '',
            thumbnail: null, // Templates don't have images
            promptPreview: promptPreview.substring(0, 150) + (promptPreview.length > 150 ? '...' : '')
          }
        } catch (error) {
          console.error('[PromptBuilder] Error processing template:', t.id, error)
          return null
        }
      }).filter((t): t is NonNullable<typeof t> => t !== null)
      
      setLoadedTemplates(selectedTemplates)
    } catch (error) {
      console.error('[PromptBuilder] Error loading templates:', error)
      toast({
        title: "Template Loading Failed",
        description: "Couldn't load templates, but you can still create concepts",
        variant: "destructive"
      })
      setLoadedTemplates([])
    } finally {
      setLoadingTemplates(false)
    }
  }, [toast])

  const handleUseTemplate = async (template: any) => {
    // Generate concept using this template
    await handleGenerateConceptsFromMessage(`Create a concept using the ${template.title} style`)
    
    toast({
      title: "Template Applied",
      description: `Creating concept based on ${template.title}`,
    })
  }

  const parsePromptStructure = (fullPrompt: string): Record<string, string> => {
    if (!fullPrompt) return { full_prompt: fullPrompt }
    
    // Parse Nano Banana Pro prompt structure
    const sections: Record<string, string> = {}
    
    // Split by common section markers
    const lines = fullPrompt.split('\n')
    let currentSection = 'main'
    let currentContent: string[] = []
    
    for (const line of lines) {
      // Check if line is a section header
      if (line.match(/^(Character|Outfit|Pose|Location|Lighting|Camera|Styling|Mood|Technical|Composition|Background|Expression|Action|Props):/i)) {
        // Save previous section
        if (currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim()
        }
        
        // Start new section
        const match = line.match(/^([^:]+):(.*)/)
        if (match) {
          currentSection = match[1].trim().toLowerCase().replace(/\s+/g, '_')
          const sectionContent = match[2].trim()
          if (sectionContent) {
            currentContent = [sectionContent]
          } else {
            currentContent = []
          }
        }
      } else if (line.trim()) {
        currentContent.push(line)
      }
    }
    
    // Save last section
    if (currentContent.length > 0) {
      sections[currentSection] = currentContent.join('\n').trim()
    }
    
    // If no sections found, try to extract key elements from natural language prompt
    if (Object.keys(sections).length <= 1) {
      sections['full_prompt'] = fullPrompt
      
      // Extract outfit if mentioned
      const outfitMatch = fullPrompt.match(/wearing\s+([^,.]+(?:,\s*[^,.]+)*)/i)
      if (outfitMatch) {
        sections['outfit'] = outfitMatch[1].trim()
      }
      
      // Extract location
      const locationMatch = fullPrompt.match(/(?:in|at|near|on)\s+([^,.]+(?:setting|location|background|environment|room|space|place|venue|studio|cafe|apartment|hotel|beach|street)[^,.]*)/i)
      if (locationMatch) {
        sections['location'] = locationMatch[1].trim()
      }
      
      // Extract lighting
      const lightingMatch = fullPrompt.match(/(natural|soft|warm|golden|diffused|window|studio|ambient|dramatic)[^,.]*(?:light|lighting|illumination)[^,.]*/i)
      if (lightingMatch) {
        sections['lighting'] = lightingMatch[0].trim()
      }
      
      // Extract camera
      const cameraMatch = fullPrompt.match(/(\d+mm[^,.]*|professional\s+photography[^,.]*|shot\s+with[^,.]*|captured\s+with[^,.]*)/i)
      if (cameraMatch) {
        sections['camera'] = cameraMatch[1].trim()
      }
      
      // Extract pose/action
      const poseMatch = fullPrompt.match(/(standing|sitting|walking|leaning|posing|looking|smiling|laughing)[^,.]*/i)
      if (poseMatch) {
        sections['pose'] = poseMatch[0].trim()
      }
    }
    
    return sections
  }

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages,
    append,
  } = useChat({
    api: "/api/maya/chat",
    body: {
      chatId: chatId || undefined,
      chatType: "prompt_builder",
      // Note: System prompt is handled by API route based on chatType="prompt_builder"
    },
    onFinish: async (message) => {
      // Messages are automatically saved by the chat API
      // No need to manually save here
    },
  })

  // Initialize chat on mount - try to restore last chat or create new one
  useEffect(() => {
    const initializeChat = async () => {
      // If chatId already exists, nothing to do
      if (chatId) {
        return
      }

      // First, try to restore the last chatId from localStorage
      if (typeof window !== 'undefined') {
        try {
          const savedChatId = localStorage.getItem('adminPromptBuilderLastChatId')
          if (savedChatId) {
            const chatIdNum = Number.parseInt(savedChatId)
            if (!isNaN(chatIdNum)) {
              console.log("[PromptBuilder] Restoring last chat from localStorage:", chatIdNum)
              setChatId(chatIdNum)
              // loadChat will be called by the useEffect that watches chatId
              return
            }
          }
        } catch (error) {
          console.error("[PromptBuilder] Error reading chatId from localStorage:", error)
        }
      }

      // If no saved chatId, try to load the active chat (which will get or create one)
      try {
        console.log("[PromptBuilder] Loading active chat...")
        const response = await fetch("/api/maya/load-chat?chatType=prompt_builder")
        
        if (response.ok) {
          const data = await response.json()
          if (data.chatId) {
            console.log("[PromptBuilder] Active chat loaded:", data.chatId, "with", data.messages?.length || 0, "messages")
            setChatId(data.chatId)
            // Save to localStorage for next time
            if (typeof window !== 'undefined') {
              localStorage.setItem('adminPromptBuilderLastChatId', data.chatId.toString())
            }
            // Restore messages if they exist
            if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
              setMessages(data.messages)
            }
            return
          }
        }
      } catch (error) {
        console.error("[PromptBuilder] Error loading active chat:", error)
      }

      // Fallback: Create a new chat if loading failed
      try {
        console.log("[PromptBuilder] Creating new chat...")
        const response = await fetch("/api/maya/new-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatType: "prompt_builder",
          }),
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.chatId) {
            setChatId(data.chatId)
            // Save to localStorage for next time
            if (typeof window !== 'undefined') {
              localStorage.setItem('adminPromptBuilderLastChatId', data.chatId.toString())
            }
            console.log("[PromptBuilder] New chat created:", data.chatId)
          }
        }
      } catch (error: any) {
        console.error("[PromptBuilder] Error creating chat:", error)
        // Silently fail - chat will be created when first message is sent
      }
    }
    
    initializeChat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  // Load chat when chatId changes
  useEffect(() => {
    if (chatId) {
      loadChat(chatId)
      // Persist chatId to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('adminPromptBuilderLastChatId', chatId.toString())
      }
    }
  }, [chatId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Load templates when category changes and sidebar is open
  useEffect(() => {
    if (currentGuideCategory && showTemplateSidebar === true) {
      loadTemplatesWithDetails(currentGuideCategory)
    }
  }, [currentGuideCategory, showTemplateSidebar, loadTemplatesWithDetails])

  const loadChat = async (id: number) => {
    // Don't disable input while loading - just load messages in background
    // setIsLoadingChat(true) // Removed to prevent disabling input
    try {
      const response = await fetch(`/api/maya/load-chat?chatId=${id}&chatType=prompt_builder`)
      if (response.ok) {
        const data = await response.json()
        if (data.messages) {
          setMessages(data.messages)
        }
      }
    } catch (error) {
      console.error("[PromptBuilder] Error loading chat:", error)
    }
    // Don't need to set isLoadingChat(false) since we never set it to true
  }

  const handleNewChat = async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/maya/new-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatType: "prompt_builder",
        }),
      })
      if (response.ok) {
        const data = await response.json()
        if (data.chatId) {
          setChatId(data.chatId)
          setMessages([])
          // Save to localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('adminPromptBuilderLastChatId', data.chatId.toString())
          }
          return true
        } else {
          console.error("[PromptBuilder] Chat created but no chatId:", data)
          return false
        }
      } else {
        const text = await response.text()
        let errorMessage = `Server error: ${response.status}`
        try {
          const error = JSON.parse(text)
          errorMessage = error.details || error.error || errorMessage
        } catch {
          errorMessage = text || errorMessage
        }
        console.error("[PromptBuilder] Error creating chat:", errorMessage)
        toast({
          title: "Chat Creation Failed",
          description: errorMessage,
          variant: "destructive"
        })
        return false
      }
    } catch (error: any) {
      console.error("[PromptBuilder] Error creating chat:", error)
      toast({
        title: "Chat Creation Failed",
        description: error.message || "Could not create chat",
        variant: "destructive"
      })
      return false
    }
  }

  const handleSelectChat = (id: number) => {
    setChatId(id)
  }

  const handleDeleteChat = async (id: number) => {
    if (id === chatId) {
      setChatId(null)
      setMessages([])
    }
  }

  const handleGenerateImage = async (concept: any, conceptIndex?: number) => {
    const conceptKey = `concept-${conceptIndex ?? Date.now()}-${concept.title || concept.label || "unknown"}`
    setGeneratingImages((prev) => new Set(prev).add(conceptKey))

    try {
      // Use different API endpoints based on mode
      const apiEndpoint = studioProMode 
        ? "/api/maya/generate-studio-pro"  // Pro Mode: Nano Banana Pro
        : "/api/maya/generate-image"       // Classic Mode: Custom Flux

      // Prepare input images from library wizard (Pro Mode only)
      const libraryImages = studioProMode ? {
        // Map library wizard images to Pro Mode format
        baseImages: (imageLibrary.selfies || []).map(url => ({ url })), // Selfies for character consistency
        productImages: (imageLibrary.products || []).map(url => ({ url })), // Products for brand integration
        styleRefs: [
          ...(imageLibrary.vibes || []).map(url => ({ url })), // Vibes for aesthetic reference
          ...(imageLibrary.people || []).map(url => ({ url })) // People for lifestyle reference
        ]
      } : {}

      // Log library usage for debugging
      if (studioProMode) {
        const totalImages = (imageLibrary.selfies?.length || 0) + 
                           (imageLibrary.products?.length || 0) + 
                           (imageLibrary.people?.length || 0) + 
                           (imageLibrary.vibes?.length || 0)
        console.log('[PromptBuilder] Using library images for Pro Mode:', {
          selfies: imageLibrary.selfies?.length || 0,
          products: imageLibrary.products?.length || 0,
          people: imageLibrary.people?.length || 0,
          vibes: imageLibrary.vibes?.length || 0,
          total: totalImages
        })
      }

      const requestBody = studioProMode
        ? {
            // Pro Mode request body (Nano Banana Pro)
            mode: "brand-scene", // Use brand-scene mode for prompt builder
            userRequest: concept.prompt || concept.promptText || concept.description,
            inputImages: libraryImages,
            resolution: "2K",
            aspectRatio: aspectRatio || "1:1"
          }
        : {
            // Classic Mode request body
            conceptPrompt: concept.prompt || concept.promptText || concept.description,
            conceptTitle: concept.title || concept.label,
            conceptDescription: concept.description,
            category: concept.category || currentGuideCategory || "portrait",
            customSettings: {
              styleStrength: styleStrength,
              promptAccuracy: promptAccuracy,
              aspectRatio: aspectRatio,
              realismStrength: realismStrength,
            },
          }

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate image")
      }

      const data = await response.json()

      if (studioProMode) {
        // Pro Mode: Uses /api/maya/generate-studio-pro
        // Response format: { success: true, predictionId: string }
        if (data.success && data.predictionId) {
          // Pro Mode polling uses different endpoint
          pollPredictionProMode(data.predictionId, conceptKey, concept)
        } else {
          throw new Error(data.error || "Invalid response from Pro Mode generation API")
        }
      } else {
        // Classic Mode: Uses /api/maya/generate-image
        // Response format: { success: true, predictionId: string, generationId: number }
        if (data.success && data.predictionId && data.generationId) {
          // Start polling for completion
          pollPrediction(data.predictionId, data.generationId, conceptKey, concept)
        } else {
          throw new Error("Invalid response from generation API")
        }
      }
    } catch (error: any) {
      console.error("[PromptBuilder] Error generating image:", error)
      setGeneratingImages((prev) => {
        const next = new Set(prev)
        next.delete(conceptKey)
        return next
      })
      toast({
        title: "Image Generation Failed",
        description: error.message || "Failed to generate image. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Pro Mode polling (Nano Banana Pro)
  const pollPredictionProMode = async (
    predictionId: string,
    conceptKey: string,
    concept: any
  ) => {
    console.log('[PromptBuilder] 🚀 Starting Pro Mode polling for:', { predictionId, conceptKey })
    
    let pollIntervalRef: NodeJS.Timeout | null = null
    
    const poll = async () => {
      try {
        console.log('[PromptBuilder] 🔍 Polling check-studio-pro API for:', predictionId)
        const response = await fetch(
          `/api/maya/check-studio-pro?predictionId=${predictionId}`
        )
        
        if (!response.ok) {
          throw new Error(`Polling request failed: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('[PromptBuilder] 📊 Poll response:', { 
          status: data.status, 
          hasOutput: !!data.output,
          predictionId 
        })

        if (data.status === "succeeded" && data.output) {
          // Image is ready
          console.log('[PromptBuilder] ✅ Image generation succeeded!', { imageUrl: data.output.substring(0, 50) + '...' })
          
          setGeneratingImages((prev) => {
            const next = new Set(prev)
            next.delete(conceptKey)
            return next
          })
          setGeneratedImages((prev) => {
            const next = new Map(prev)
            next.set(conceptKey, {
              imageUrl: data.output,
              predictionId,
              generationId: null, // Pro Mode doesn't use generationId
              concept,
            })
            return next
          })
          
          if (pollIntervalRef) {
            clearInterval(pollIntervalRef)
            pollIntervalRef = null
          }

          // Add image as a message in the chat
          if (append && typeof append === 'function') {
            append({
              role: "assistant",
              content: `Image generated for "${concept.title || concept.label}":`,
              parts: [
                {
                  type: "text",
                  text: `Image generated for "${concept.title || concept.label}":`,
                },
                {
                  type: "image",
                  image: data.output,
                },
              ],
            })
          } else {
            // Fallback: use setMessages
            setMessages((prev) => [
              ...prev,
              {
                id: `assistant-image-${Date.now()}`,
                role: "assistant",
                content: `Image generated for "${concept.title || concept.label}":`,
                parts: [
                  {
                    type: "text",
                    text: `Image generated for "${concept.title || concept.label}":`,
                  },
                  {
                    type: "image",
                    image: data.output,
                  },
                ],
              }
            ])
          }
        } else if (data.status === "failed") {
          console.error('[PromptBuilder] ❌ Image generation failed:', data.error)
          setGeneratingImages((prev) => {
            const next = new Set(prev)
            next.delete(conceptKey)
            return next
          })
          
          if (pollIntervalRef) {
            clearInterval(pollIntervalRef)
            pollIntervalRef = null
          }
          
          toast({
            title: "Image Generation Failed",
            description: data.error || "The image generation request failed. Please try again.",
            variant: "destructive"
          })
        } else {
          // Still processing
          console.log('[PromptBuilder] ⏳ Still processing, status:', data.status)
        }
      } catch (error) {
        console.error("[PromptBuilder] ❌ Error polling Pro Mode prediction:", error)
        setGeneratingImages((prev) => {
          const next = new Set(prev)
          next.delete(conceptKey)
          return next
        })
        
        if (pollIntervalRef) {
          clearInterval(pollIntervalRef)
          pollIntervalRef = null
        }
        
        toast({
          title: "Polling Error",
          description: "Failed to check generation status. Please refresh the page.",
          variant: "destructive"
        })
      }
    }
    
    // Start polling immediately (don't wait for first interval)
    poll()
    
    // Then set up interval for subsequent polls
    pollIntervalRef = setInterval(poll, 5000) // Poll every 5 seconds for Pro Mode
    console.log('[PromptBuilder] ✅ Polling interval started (immediate first poll + interval)')

    // Cleanup after 5 minutes (timeout)
    const timeoutId = setTimeout(() => {
      console.log('[PromptBuilder] ⏱️ Polling timeout after 5 minutes')
      if (pollIntervalRef) {
        clearInterval(pollIntervalRef)
        pollIntervalRef = null
      }
      setGeneratingImages((prev) => {
        const next = new Set(prev)
        next.delete(conceptKey)
        return next
      })
      toast({
        title: "Generation Timeout",
        description: "Image generation is taking longer than expected. Please try again.",
        variant: "destructive"
      })
    }, 5 * 60 * 1000)
    
    // Return cleanup function
    return () => {
      if (pollIntervalRef) {
        clearInterval(pollIntervalRef)
        pollIntervalRef = null
      }
      clearTimeout(timeoutId)
    }
  }

  // Classic Mode polling (Custom Flux)
  const pollPrediction = async (
    predictionId: string,
    generationId: number,
    conceptKey: string,
    concept: any
  ) => {
    console.log('[PromptBuilder] 🚀 Starting Classic Mode polling for:', { predictionId, generationId, conceptKey })
    
    let pollIntervalRef: NodeJS.Timeout | null = null
    
    const poll = async () => {
      try {
        console.log('[PromptBuilder] 🔍 Polling check-generation API for:', { predictionId, generationId })
        const response = await fetch(
          `/api/maya/check-generation?predictionId=${predictionId}&generationId=${generationId}`
        )
        
        if (!response.ok) {
          throw new Error(`Polling request failed: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('[PromptBuilder] 📊 Poll response:', { 
          status: data.status, 
          hasImageUrl: !!data.imageUrl,
          predictionId,
          generationId
        })

        if (data.status === "succeeded" && data.imageUrl) {
          // Image is ready
          console.log('[PromptBuilder] ✅ Image generation succeeded!', { imageUrl: data.imageUrl.substring(0, 50) + '...' })
          
          setGeneratingImages((prev) => {
            const next = new Set(prev)
            next.delete(conceptKey)
            return next
          })
          setGeneratedImages((prev) => {
            const next = new Map(prev)
            next.set(conceptKey, {
              imageUrl: data.imageUrl,
              predictionId,
              generationId,
              concept,
            })
            return next
          })
          
          if (pollIntervalRef) {
            clearInterval(pollIntervalRef)
            pollIntervalRef = null
          }

          // Add image as a message in the chat
          if (append && typeof append === 'function') {
            append({
              role: "assistant",
              content: `Image generated for "${concept.title || concept.label}":`,
              parts: [
                {
                  type: "text",
                  text: `Image generated for "${concept.title || concept.label}":`,
                },
                {
                  type: "image",
                  image: data.imageUrl,
                },
              ],
            })
          } else {
            // Fallback: use setMessages
            setMessages((prev) => [
              ...prev,
              {
                id: `assistant-image-${Date.now()}`,
                role: "assistant",
                content: `Image generated for "${concept.title || concept.label}":`,
                parts: [
                  {
                    type: "text",
                    text: `Image generated for "${concept.title || concept.label}":`,
                  },
                  {
                    type: "image",
                    image: data.imageUrl,
                  },
                ],
              }
            ])
          }
        } else if (data.status === "failed") {
          console.error('[PromptBuilder] ❌ Image generation failed:', data.error)
          setGeneratingImages((prev) => {
            const next = new Set(prev)
            next.delete(conceptKey)
            return next
          })
          
          if (pollIntervalRef) {
            clearInterval(pollIntervalRef)
            pollIntervalRef = null
          }
          
          toast({
            title: "Image Generation Failed",
            description: data.error || "The image generation request failed. Please try again.",
            variant: "destructive"
          })
        } else {
          // Still processing
          console.log('[PromptBuilder] ⏳ Still processing, status:', data.status)
        }
      } catch (error) {
        console.error("[PromptBuilder] ❌ Error polling prediction:", error)
        setGeneratingImages((prev) => {
          const next = new Set(prev)
          next.delete(conceptKey)
          return next
        })
        
        if (pollIntervalRef) {
          clearInterval(pollIntervalRef)
          pollIntervalRef = null
        }
        
        toast({
          title: "Polling Error",
          description: "Failed to check generation status. Please refresh the page.",
          variant: "destructive"
        })
      }
    }
    
    // Start polling immediately (don't wait for first interval)
    poll()
    
    // Then set up interval for subsequent polls
    pollIntervalRef = setInterval(poll, 3000) // Poll every 3 seconds for Classic Mode
    console.log('[PromptBuilder] ✅ Polling interval started (immediate first poll + interval)')

    // Cleanup after 5 minutes (timeout)
    const timeoutId = setTimeout(() => {
      console.log('[PromptBuilder] ⏱️ Polling timeout after 5 minutes')
      if (pollIntervalRef) {
        clearInterval(pollIntervalRef)
        pollIntervalRef = null
      }
      setGeneratingImages((prev) => {
        const next = new Set(prev)
        next.delete(conceptKey)
        return next
      })
      toast({
        title: "Generation Timeout",
        description: "Image generation is taking longer than expected. Please try again.",
        variant: "destructive"
      })
    }, 5 * 60 * 1000)
    
    // Return cleanup function
    return () => {
      if (pollIntervalRef) {
        clearInterval(pollIntervalRef)
        pollIntervalRef = null
      }
      clearTimeout(timeoutId)
    }
  }

  const handleApproveImage = async (imageUrl: string, conceptKey: string) => {
    const imageData = generatedImages.get(conceptKey)
    if (!imageData) return

    // ✅ ADD VALIDATION: Check if guide is selected
    if (!currentGuideId) {
      toast({
        title: "No Guide Selected",
        description: "Please select a guide from the dropdown at the top of the page before approving prompts",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch("/api/admin/prompt-guide/approve-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideId: currentGuideId, // ✅ FIXED: Use actual guide ID
          promptText: imageData.concept.fullPrompt || imageData.concept.prompt || imageData.concept.promptText || imageData.concept.description,
          conceptTitle: imageData.concept.title || imageData.concept.label,
          conceptDescription: imageData.concept.description,
          category: imageData.concept.category || currentGuideCategory,
          imageUrl: imageUrl,
          replicatePredictionId: imageData.predictionId,
          generationSettings: {
            styleStrength,
            promptAccuracy,
            aspectRatio,
            realismStrength,
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        setApprovedImages((prev) => new Set(prev).add(imageUrl))
        setRejectedImages((prev) => {
          const next = new Set(prev)
          next.delete(imageUrl)
          return next
        })
        
        // ✅ IMPROVED: Show success with guide stats
        toast({
          title: "Prompt Approved! ✨",
          description: data.totalApproved 
            ? `Added to guide. Total: ${data.totalApproved}/${data.totalPrompts} approved`
            : "Successfully added to guide",
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to approve item")
      }
    } catch (error: any) {
      console.error("[PromptBuilder] Error approving image:", error)
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve prompt",
        variant: "destructive"
      })
    }
  }

  const handleRejectImage = (imageUrl: string) => {
    setRejectedImages((prev) => new Set(prev).add(imageUrl))
    setApprovedImages((prev) => {
      const next = new Set(prev)
      next.delete(imageUrl)
      return next
    })
  }

  // Safe input change handler with brand detection
  const safeHandleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newInput = e.target.value
    
    // Update local state as fallback
    setLocalInput(newInput)
    
    // Call original handler if available - this updates the useChat input state
    if (handleInputChange && typeof handleInputChange === 'function') {
      try {
        handleInputChange(e)
      } catch (error) {
        console.error("[PromptBuilder] Error in handleInputChange:", error)
        // Fallback to local state only
      }
    } else {
      console.warn("[PromptBuilder] handleInputChange not available, using local state fallback")
    }
    
    // Detect brands in input (only if input is substantial enough)
    if (newInput.length > 3) {
      try {
        const brandIntent = detectCategoryAndBrand(newInput)
        
        if (brandIntent.confidence >= 0.5 && brandIntent.category) {
          // Map detected category to admin categories
          const categoryMap: Record<string, string> = {
            'wellness': 'ALO Workout',
            'fitness': 'ALO Workout',
            'luxury': 'Chanel Luxury',
            'fashion': 'Chanel Luxury',
            'travel_lifestyle': 'Travel',
            'lifestyle': 'Lifestyle',
            'beauty': 'Beauty',
            'tech': 'Tech',
          }
          
          const categoryKey = brandIntent.category.key
          const adminCategory = categoryMap[categoryKey] || brandIntent.category.label
          
          // Only auto-select if:
          // 1. Category is different from current
          // 2. Either no category was auto-selected before, OR user changed input significantly
          // 3. Confidence is high enough
          if (adminCategory && adminCategory !== currentGuideCategory) {
            // Check if this is a new detection (not just continuing previous auto-selection)
            const isNewDetection = lastAutoSelectedCategory !== adminCategory || !categoryAutoSelected
            
            if (isNewDetection && brandIntent.confidence >= 0.6) {
              // Auto-select category
              setCurrentGuideCategory(adminCategory)
              setCategoryAutoSelected(true)
              setLastAutoSelectedCategory(adminCategory)
              
              // Notify parent component if callback provided
              if (onGuideChange) {
                onGuideChange(null, adminCategory)
              }
              
              // Show notification
              toast({
                title: "Category Detected",
                description: `Auto-selected "${adminCategory}" based on your request`,
              })
            }
          }
        } else if (newInput.length < 5) {
          // Reset auto-selection if user clears input
          setCategoryAutoSelected(false)
          setLastAutoSelectedCategory(null)
        }
      } catch (error) {
        // Silently fail - brand detection is optional
        console.log('[PromptBuilder] Brand detection error:', error)
      }
    } else if (newInput.length === 0) {
      // Reset when input is cleared
      setCategoryAutoSelected(false)
      setLastAutoSelectedCategory(null)
    }
  }

  // Generate concepts using Pro Mode API
  const handleGenerateConceptsFromMessage = async (userMessage: string) => {
    setIsGeneratingConcepts(true)
    
    try {
      // ✅ NEW: Load Universal Prompts templates
      console.log('[PromptBuilder] Loading templates for category:', currentGuideCategory)
      const templateExamples = await loadUniversalPromptsForAdmin(currentGuideCategory || 'Lifestyle')
      console.log('[PromptBuilder] Loaded', templateExamples.length, 'template examples')
      
      // Prepare request body
      const requestBody: any = {
        userRequest: userMessage,
        studioProMode: studioProMode, // ✅ Use current mode (Classic or Pro)
        count: 3, // Generate 3 concept variations
        category: currentGuideCategory || "portrait",
        conversationContext: messages.slice(-5).map(m =>
          typeof m.content === "string" ? m.content : JSON.stringify(m.content)
        ).join("\n"),
        templateExamples: templateExamples, // ✅ ADDED: Pass templates to API
      }

      // ✅ ADDED: Include image library when in Pro Mode
      if (studioProMode && (imageLibrary.selfies.length > 0 || imageLibrary.products.length > 0 || imageLibrary.people.length > 0 || imageLibrary.vibes.length > 0)) {
        requestBody.referenceImages = {
          selfies: imageLibrary.selfies,
          products: imageLibrary.products,
          people: imageLibrary.people,
          vibes: imageLibrary.vibes,
          intent: imageLibrary.intent,
        }
        console.log('[PromptBuilder] Including image library in Pro Mode request:', {
          selfies: imageLibrary.selfies.length,
          products: imageLibrary.products.length,
          people: imageLibrary.people.length,
          vibes: imageLibrary.vibes.length,
          intent: imageLibrary.intent,
        })
      }

      const response = await fetch("/api/maya/generate-concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to generate concepts" }))
        throw new Error(errorData.error || "Failed to generate concepts")
      }

      const data = await response.json()
      
      if (data.concepts && Array.isArray(data.concepts)) {
        setDisplayedConcepts(data.concepts)
        
        // Add user message to chat
        if (append && typeof append === 'function') {
          append({
            role: "user",
            content: userMessage,
          })
        } else {
          // Fallback: use setMessages
          setMessages((prev) => [
            ...prev,
            {
              id: `user-${Date.now()}`,
              role: "user",
              content: userMessage,
            }
          ])
        }
        
        const conceptSummary = data.concepts.map((c: any, i: number) => 
          `${i + 1}. ${c.title || c.label || `Concept ${i + 1}`}`
        ).join('\n')
        
        // Add concepts as a message in chat
        if (append && typeof append === 'function') {
          append({
            role: "assistant",
            content: `✨ Created ${data.concepts.length} professional concepts${templateExamples.length > 0 ? ` using ${templateExamples.length} template examples` : ''}:\n\n${conceptSummary}\n\nClick "Generate Image" on any concept to bring it to life!`,
            // Store concepts in message metadata
            parts: [{
              type: "tool-generateConcepts",
              output: { concepts: data.concepts }
            }]
          })
        } else {
          // Fallback: use setMessages
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: `✨ Created ${data.concepts.length} professional concepts${templateExamples.length > 0 ? ` using ${templateExamples.length} template examples` : ''}:\n\n${conceptSummary}\n\nClick "Generate Image" on any concept to bring it to life!`,
              parts: [{
                type: "tool-generateConcepts",
                output: { concepts: data.concepts }
              }]
            }
          ])
        }
        
        // Clear input after successful concept generation
        // Clear both useChat input and localInput state to prevent stale text
        setLocalInput("") // Clear localInput state first
        if (textareaRef.current) {
          textareaRef.current.value = ""
          // Trigger input change to sync with useChat state
          const syntheticEvent = {
            target: { value: "" }
          } as React.ChangeEvent<HTMLTextAreaElement>
          if (handleInputChange) {
            handleInputChange(syntheticEvent)
          }
        }
        
        // ✅ IMPROVED: Show success toast
        toast({
          title: "Concepts Generated!",
          description: `Created ${data.concepts.length} variations using Pro Mode architecture${templateExamples.length > 0 ? ` with ${templateExamples.length} template examples` : ''}`,
        })
      } else {
        throw new Error("Invalid response format from concept generation API")
      }
    } catch (error: any) {
      console.error("[PromptBuilder] Error generating concepts:", error)
      toast({
        title: "Concept Generation Failed",
        description: error.message || "Failed to generate concepts. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsGeneratingConcepts(false)
    }
  }

  const handleSubmitWithConceptGeneration = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Use input from useChat, fallback to localInput if not available
    const currentInput = input || localInput
    if (!currentInput?.trim()) return
    
    const userMessage = currentInput.trim()
    
    // Reset auto-selection flag after submitting (allows new detection on next message)
    setCategoryAutoSelected(false)
    setLastAutoSelectedCategory(null)
    
    // Check if message is a concept generation request
    const isConceptRequest = /create|generate|make|show|give me|concepts|prompts|ideas/i.test(userMessage)
    
    if (isConceptRequest) {
      // Use Pro Mode concept generation
      await handleGenerateConceptsFromMessage(userMessage)
      // Clear input after sending - clear both useChat input and localInput state
      setLocalInput("") // Clear localInput state to prevent stale text
      if (handleInputChange) {
        const syntheticEvent = {
          target: { value: "" }
        } as React.ChangeEvent<HTMLTextAreaElement>
        handleInputChange(syntheticEvent)
      }
    } else {
      // Regular chat - create chat if doesn't exist
      if (!chatId) {
        const chatCreated = await handleNewChat()
        if (chatCreated) {
          // Wait a bit for chat to be created, then send message
          setTimeout(() => {
            handleSubmit(e)
          }, 300)
        } else {
          // Chat creation failed, but try to send anyway - useChat might handle it
          toast({
            title: "Sending message...",
            description: "Chat will be created automatically",
          })
          handleSubmit(e)
        }
      } else {
        handleSubmit(e)
      }
    }
  }

  const onSubmit = handleSubmitWithConceptGeneration

  // Persist Studio Pro mode to localStorage (only if managing locally)
  useEffect(() => {
    if (typeof window !== 'undefined' && propStudioProMode === undefined) {
      localStorage.setItem('adminPromptBuilderStudioProMode', localStudioProMode.toString())
    }
  }, [localStudioProMode, propStudioProMode])

  // Handle mode switching - use prop callback if provided, otherwise manage locally
  const handleModeSwitch = (newMode: boolean) => {
    if (studioProMode === newMode) return
    if (propOnModeSwitch) {
      // Use parent's handler
      propOnModeSwitch(newMode)
    } else {
      // Manage locally (backward compatibility)
      setLocalStudioProMode(newMode)
      toast({
        title: `Switched to ${newMode ? "Pro Mode" : "Classic Mode"}`,
        description: newMode 
          ? "Using Nano Banana Pro for generation" 
          : "Using Custom Flux for generation",
      })
    }
  }

  // Removed loading check - input is always enabled, chat initializes in background

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Chat History - Editorial Sidebar */}
        {showHistory && (
          <div 
            className={`${isMobile ? 'absolute inset-0 z-20' : 'w-72 shrink-0'} overflow-hidden`}
            style={{
              backgroundColor: Colors.surface,
              border: `1px solid ${Colors.border}`,
              borderRadius: BorderRadius.card
            }}
          >
            {isMobile && (
              <div 
                className="p-4"
                style={{ borderBottom: `1px solid ${Colors.borderLight}` }}
              >
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-xs tracking-[0.1em] uppercase"
                  style={{
                    fontFamily: Typography.ui.fontFamily,
                    color: Colors.textSecondary
                  }}
                >
                  Close
                </button>
              </div>
            )}
            <MayaChatHistory
              currentChatId={chatId}
              onSelectChat={handleSelectChat}
              onNewChat={handleNewChat}
              onDeleteChat={handleDeleteChat}
              chatType="prompt_builder"
            />
          </div>
        )}

        {/* Main Chat Area - Editorial Quality */}
        <div 
          className="flex-1 flex flex-col overflow-hidden"
          style={{
            backgroundColor: Colors.surface,
            border: `1px solid ${Colors.border}`,
            borderRadius: BorderRadius.card
          }}
        >
          {/* Messages Area */}
          <div 
            className="flex-1 overflow-y-auto"
            style={{ padding: Spacing.section }}
          >
            {isGeneratingConcepts && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 
                    className="w-8 h-8 animate-spin mx-auto mb-4" 
                    style={{ color: Colors.textMuted }}
                  />
                  <p 
                    className="mb-1"
                    style={{
                      fontFamily: Typography.subheaders.fontFamily,
                      fontSize: Typography.subheaders.sizes.md,
                      fontWeight: Typography.subheaders.weights.regular,
                      color: Colors.textPrimary
                    }}
                  >
                    Generating Professional Concepts
                  </p>
                  <p 
                    style={{
                      fontFamily: Typography.body.fontFamily,
                      fontSize: Typography.body.sizes.sm,
                      fontWeight: Typography.body.weights.light,
                      color: Colors.textSecondary
                    }}
                  >
                    Loading templates and applying Pro Mode architecture...
                  </p>
                </div>
              </div>
            )}
            {messages.length === 0 && !isGeneratingConcepts ? (
              /* Empty State - Editorial */
              <div className="flex flex-col items-center justify-center h-full text-center">
                {/* Guide Selection Warning */}
                {!currentGuideId && (
                  <div 
                    className="mb-6 px-4 py-3 rounded-lg max-w-md w-full"
                    style={{
                      backgroundColor: Colors.backgroundAlt,
                      border: `1px solid ${Colors.border}`,
                      borderRadius: BorderRadius.card
                    }}
                  >
                    <p 
                      className="text-sm mb-1"
                      style={{
                        fontFamily: Typography.ui.fontFamily,
                        fontSize: Typography.ui.sizes.sm,
                        fontWeight: Typography.ui.weights.medium,
                        color: Colors.textPrimary
                      }}
                    >
                      ⚠️ No Guide Selected
                    </p>
                    <p 
                      className="text-xs"
                      style={{
                        fontFamily: Typography.body.fontFamily,
                        fontSize: Typography.body.sizes.sm,
                        fontWeight: Typography.body.weights.light,
                        color: Colors.textSecondary,
                        lineHeight: Typography.body.lineHeight
                      }}
                    >
                      Select a guide from the dropdown above to start creating prompts. You can still generate concepts, but you&apos;ll need to select a guide to approve and save them.
                    </p>
                  </div>
                )}

                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                  style={{ backgroundColor: Colors.backgroundAlt }}
                >
                  <div 
                    className="w-10 h-10 rounded-full"
                    style={{ backgroundColor: Colors.border }}
                  />
                </div>
                
                <h3 
                  className="mb-3"
                  style={{
                    fontFamily: Typography.subheaders.fontFamily,
                    fontSize: Typography.subheaders.sizes.lg,
                    fontWeight: Typography.subheaders.weights.regular,
                    color: Colors.textPrimary
                  }}
                >
                  Create Prompt Concepts
                </h3>
                
                <p 
                  className="mb-8 max-w-sm leading-relaxed"
                  style={{
                    fontFamily: Typography.body.fontFamily,
                    fontSize: Typography.body.sizes.md,
                    fontWeight: Typography.body.weights.light,
                    color: Colors.textSecondary,
                    lineHeight: Typography.body.lineHeight
                  }}
                >
                  Ask Maya to generate professional prompt concepts for your guides
                </p>

                {/* Quick Start Examples - Dynamic based on guide category */}
                <div className="space-y-2 w-full max-w-md">
                  {(() => {
                    // Generate dynamic prompts based on guide category
                    const getCategoryPrompts = (category: string | null): Array<{ text: string; icon: string }> => {
                      const categoryLower = (category || '').toLowerCase()
                      
                      // Map categories to relevant prompt suggestions
                      if (categoryLower.includes('christmas') || categoryLower.includes('holiday') || categoryLower.includes('seasonal')) {
                        return [
                          { text: 'Create cozy Christmas morning prompts', icon: '◇' },
                          { text: 'Generate holiday party concepts', icon: '◇' },
                          { text: 'Make winter wonderland prompts', icon: '◇' }
                        ]
                      }
                      if (categoryLower.includes('luxury') || categoryLower.includes('chanel') || categoryLower.includes('fashion')) {
                        return [
                          { text: 'Create luxury editorial prompts', icon: '◇' },
                          { text: 'Generate high-end fashion concepts', icon: '◇' },
                          { text: 'Make elegant lifestyle prompts', icon: '◇' }
                        ]
                      }
                      if (categoryLower.includes('workout') || categoryLower.includes('fitness') || categoryLower.includes('alo') || categoryLower.includes('wellness')) {
                        return [
                          { text: 'Create ALO workout prompts', icon: '◇' },
                          { text: 'Generate fitness lifestyle concepts', icon: '◇' },
                          { text: 'Make wellness content prompts', icon: '◇' }
                        ]
                      }
                      if (categoryLower.includes('travel') || categoryLower.includes('lifestyle')) {
                        return [
                          { text: 'Create travel destination prompts', icon: '◇' },
                          { text: 'Generate lifestyle content concepts', icon: '◇' },
                          { text: 'Make adventure prompts', icon: '◇' }
                        ]
                      }
                      if (categoryLower.includes('beauty') || categoryLower.includes('makeup')) {
                        return [
                          { text: 'Create beauty editorial prompts', icon: '◇' },
                          { text: 'Generate makeup look concepts', icon: '◇' },
                          { text: 'Make skincare lifestyle prompts', icon: '◇' }
                        ]
                      }
                      if (categoryLower.includes('tech') || categoryLower.includes('work')) {
                        return [
                          { text: 'Create professional work prompts', icon: '◇' },
                          { text: 'Generate tech lifestyle concepts', icon: '◇' },
                          { text: 'Make modern workspace prompts', icon: '◇' }
                        ]
                      }
                      if (categoryLower.includes('cozy') || categoryLower.includes('home')) {
                        return [
                          { text: 'Create cozy home prompts', icon: '◇' },
                          { text: 'Generate comfort lifestyle concepts', icon: '◇' },
                          { text: 'Make warm interior prompts', icon: '◇' }
                        ]
                      }
                      
                      // Default prompts for unknown categories
                      return [
                        { text: `Create ${category || 'professional'} prompts`, icon: '◇' },
                        { text: `Generate ${category || 'lifestyle'} concepts`, icon: '◇' },
                        { text: `Make ${category || 'content'} prompts`, icon: '◇' }
                      ]
                    }
                    
                    const prompts = getCategoryPrompts(currentGuideCategory)
                    
                    return prompts.map((example, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        const syntheticEvent = {
                          target: { value: example.text.toLowerCase() }
                        } as React.ChangeEvent<HTMLTextAreaElement>
                        safeHandleInputChange(syntheticEvent)
                      }}
                      className="w-full text-left px-5 py-3 transition-all hover:bg-stone-50"
                      style={{
                        border: `1px solid ${Colors.border}`,
                        borderRadius: BorderRadius.input,
                        fontFamily: Typography.ui.fontFamily,
                        fontSize: Typography.ui.sizes.sm,
                        color: Colors.textSecondary
                      }}
                    >
                      <span style={{ color: Colors.textMuted, marginRight: '8px' }}>
                        {example.icon}
                      </span>
                      {example.text}
                    </button>
                  ))
                  })()}
                </div>
              </div>
            ) : (
            <div className="space-y-6">
              {messages.map((message) => {
                const isUser = message.role === "user"
                const content = typeof message.content === "string" ? message.content : JSON.stringify(message.content)

                // Check if message has concept cards
                const hasConcepts = message.parts?.some((p: any) => p.type === "tool-generateConcepts")

                return (
                  <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div
                      className="max-w-[80%] px-5 py-4"
                      style={{
                        backgroundColor: isUser ? Colors.primary : Colors.backgroundAlt,
                        borderRadius: BorderRadius.card,
                        border: isUser ? 'none' : `1px solid ${Colors.border}`
                      }}
                    >
                      <p 
                        style={{
                          fontFamily: Typography.body.fontFamily,
                          fontSize: Typography.body.sizes.md,
                          fontWeight: Typography.body.weights.light,
                          color: isUser ? '#FFFFFF' : Colors.textPrimary,
                          lineHeight: Typography.body.lineHeight
                        }}
                      >
                        {content}
                      </p>

                    {/* Concept Cards - Editorial Quality */}
                    {hasConcepts &&
                      message.parts
                        ?.filter((p: any) => p.type === "tool-generateConcepts")
                        .map((part: any, idx: number) => {
                          const concepts = part.output?.concepts || []
                          return (
                            <div key={idx} className="space-y-4">
                              {concepts.map((concept: any, conceptIdx: number) => {
                                const conceptKey = `concept-${conceptIdx}-${concept.title || concept.label || "unknown"}`
                                const isGenerating = generatingImages.has(conceptKey)
                                const generatedImage = generatedImages.get(conceptKey)
                                const isApproved = generatedImage ? approvedImages.has(generatedImage.imageUrl) : false
                                const isRejected = generatedImage ? rejectedImages.has(generatedImage.imageUrl) : false

                                return (
                                  <div
                                    key={conceptIdx}
                                    className="bg-white rounded-xl p-4 sm:p-5 md:p-6 space-y-3 sm:space-y-4 border"
                                    style={{
                                      borderRadius: BorderRadius.card,
                                      borderColor: Colors.border,
                                      backgroundColor: Colors.surface,
                                    }}
                                  >
                                    {/* Title - Match Pro Mode exactly */}
                                    <h3
                                      style={{
                                        fontFamily: Typography.subheaders.fontFamily,
                                        fontSize: 'clamp(18px, 4vw, 22px)',
                                        fontWeight: Typography.subheaders.weights.regular,
                                        color: Colors.textPrimary,
                                        lineHeight: Typography.subheaders.lineHeight,
                                        letterSpacing: Typography.subheaders.letterSpacing,
                                      }}
                                    >
                                      {concept.title || concept.label}
                                    </h3>

                                    {/* Description - Match Pro Mode exactly */}
                                    {concept.description && (
                                      <p
                                        style={{
                                          fontFamily: Typography.body.fontFamily,
                                          fontSize: 'clamp(14px, 3vw, 16px)',
                                          fontWeight: Typography.body.weights.light,
                                          color: Colors.textSecondary,
                                          lineHeight: Typography.body.lineHeight,
                                          letterSpacing: Typography.body.letterSpacing,
                                        }}
                                      >
                                        {concept.description}
                                      </p>
                                    )}

                                    {/* Dividing line - Match Pro Mode */}
                                    <div
                                      style={{
                                        height: '1px',
                                        backgroundColor: Colors.border,
                                        width: '100%',
                                      }}
                                    />

                                    {/* Category - Match Pro Mode */}
                                    {concept.category && (
                                      <div className="space-y-1">
                                        <p
                                          style={{
                                            fontFamily: Typography.ui.fontFamily,
                                            fontSize: Typography.ui.sizes.xs,
                                            fontWeight: Typography.ui.weights.medium,
                                            color: Colors.textSecondary,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                          }}
                                        >
                                          {concept.category}
                                        </p>
                                      </div>
                                    )}

                                    {/* Status Indicator - Compact */}
                                    {generatedImage && (
                                      <div className="flex gap-2 items-center">
                                        {isApproved && (
                                          <div 
                                            className="w-6 h-6 rounded-full flex items-center justify-center"
                                            style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
                                          >
                                            <Check className="w-3.5 h-3.5" style={{ color: '#22C55E' }} />
                                          </div>
                                        )}
                                        {isRejected && (
                                          <div 
                                            className="w-6 h-6 rounded-full flex items-center justify-center"
                                            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                                          >
                                            <X className="w-3.5 h-3.5" style={{ color: '#EF4444' }} />
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Prompt Preview - Always Visible (like Pro Mode) */}
                                    {(concept.prompt || concept.promptText) && (
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span
                                            className="text-xs tracking-[0.1em] uppercase"
                                            style={{
                                              fontFamily: Typography.ui.fontFamily,
                                              fontSize: Typography.ui.sizes.xs,
                                              fontWeight: Typography.ui.weights.medium,
                                              color: Colors.textSecondary
                                            }}
                                          >
                                            Prompt
                                          </span>
                                          <button
                                            onClick={() => {
                                              const newExpanded = new Set(expandedPrompts)
                                              if (newExpanded.has(conceptKey)) {
                                                newExpanded.delete(conceptKey)
                                              } else {
                                                newExpanded.add(conceptKey)
                                              }
                                              setExpandedPrompts(newExpanded)
                                            }}
                                            className="text-xs tracking-[0.1em] uppercase transition-colors hover:opacity-70"
                                            style={{
                                              fontFamily: Typography.ui.fontFamily,
                                              fontSize: Typography.ui.sizes.xs,
                                              color: Colors.primary
                                            }}
                                          >
                                            {expandedPrompts.has(conceptKey) ? 'Show Less' : 'Show Full'}
                                          </button>
                                        </div>
                                        
                                        <div 
                                          className="p-4 text-xs font-mono leading-relaxed overflow-y-auto"
                                          style={{
                                            backgroundColor: Colors.backgroundAlt,
                                            border: `1px solid ${Colors.borderLight}`,
                                            borderRadius: BorderRadius.buttonSm,
                                            maxHeight: expandedPrompts.has(conceptKey) ? 'none' : '120px'
                                          }}
                                        >
                                          {expandedPrompts.has(conceptKey) 
                                            ? (concept.prompt || concept.promptText)
                                            : (
                                                <>
                                                  {(concept.prompt || concept.promptText).substring(0, 300)}
                                                  {(concept.prompt || concept.promptText).length > 300 && (
                                                    <span style={{ color: Colors.textMuted }}>...</span>
                                                  )}
                                                </>
                                              )
                                          }
                                        </div>
                                      </div>
                                    )}

                                    {/* Generated Image */}
                                    {generatedImage && (
                                      <div 
                                        className="relative overflow-hidden cursor-pointer"
                                        style={{ borderRadius: BorderRadius.image }}
                                        onClick={() => {
                                          setFullscreenImage({
                                            imageUrl: generatedImage.imageUrl,
                                            title: concept.title || concept.label || 'Generated Image'
                                          })
                                        }}
                                      >
                                        <img
                                          src={generatedImage.imageUrl}
                                          alt={concept.title || concept.label}
                                          className="w-full h-auto"
                                        />
                                        {isGenerating && (
                                          <div 
                                            className="absolute inset-0 flex items-center justify-center"
                                            style={{ backgroundColor: 'rgba(28, 25, 23, 0.6)' }}
                                          >
                                            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#FFFFFF' }} />
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Action Buttons - Match Pro Mode */}
                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                                      {/* View Prompt button - Match Pro Mode */}
                                      {(concept.prompt || concept.promptText) && (
                                        <button
                                          onClick={() => {
                                            setViewingPromptStructure(concept)
                                          }}
                                          className="touch-manipulation active:scale-95 flex-1"
                                          style={{
                                            fontFamily: Typography.ui.fontFamily,
                                            fontSize: 'clamp(13px, 3vw, 14px)',
                                            fontWeight: Typography.ui.weights.medium,
                                            letterSpacing: '0.01em',
                                            color: Colors.primary,
                                            backgroundColor: 'transparent',
                                            padding: 'clamp(10px, 2.5vw, 12px) clamp(16px, 4vw, 20px)',
                                            minHeight: '44px',
                                            borderRadius: BorderRadius.button,
                                            border: `1px solid ${Colors.border}`,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = Colors.hover
                                            e.currentTarget.style.borderColor = Colors.primary
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent'
                                            e.currentTarget.style.borderColor = Colors.border
                                          }}
                                        >
                                          View Prompt
                                        </button>
                                      )}

                                      {/* Generate button - Match Pro Mode */}
                                      {!generatedImage && !isGenerating && (
                                        <button
                                          onClick={() => handleGenerateImage(concept, conceptIdx)}
                                          disabled={isGenerating}
                                          className="touch-manipulation active:scale-95 disabled:active:scale-100 flex-1"
                                          style={{
                                            fontFamily: Typography.ui.fontFamily,
                                            fontSize: 'clamp(13px, 3vw, 14px)',
                                            fontWeight: Typography.ui.weights.medium,
                                            letterSpacing: '0.01em',
                                            color: Colors.surface,
                                            backgroundColor: isGenerating ? Colors.border : Colors.primary,
                                            padding: 'clamp(10px, 2.5vw, 12px) clamp(16px, 4vw, 20px)',
                                            minHeight: '44px',
                                            borderRadius: BorderRadius.button,
                                            border: 'none',
                                            cursor: isGenerating ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.2s ease',
                                            opacity: isGenerating ? 0.7 : 1,
                                          }}
                                          onMouseEnter={(e) => {
                                            if (!isGenerating) {
                                              e.currentTarget.style.backgroundColor = Colors.accent
                                            }
                                          }}
                                          onMouseLeave={(e) => {
                                            if (!isGenerating) {
                                              e.currentTarget.style.backgroundColor = Colors.primary
                                            }
                                          }}
                                        >
                                          {isGenerating ? 'Generating...' : 'Generate'}
                                        </button>
                                      )}

                                      {/* Approve/Reject buttons */}
                                      {generatedImage && !isApproved && !isRejected && (
                                        <>
                                          <button
                                            onClick={() => handleApproveImage(generatedImage.imageUrl, conceptKey)}
                                            className="flex-1 px-5 py-3 text-xs tracking-[0.15em] uppercase transition-all min-h-[44px] touch-manipulation"
                                            style={{
                                              fontFamily: Typography.ui.fontFamily,
                                              fontSize: Typography.ui.sizes.xs,
                                              fontWeight: Typography.ui.weights.medium,
                                              backgroundColor: '#22C55E',
                                              color: '#FFFFFF',
                                              borderRadius: BorderRadius.button
                                            }}
                                          >
                                            Approve
                                          </button>
                                          <button
                                            onClick={() => handleRejectImage(generatedImage.imageUrl)}
                                            className="flex-1 px-5 py-3 text-xs tracking-[0.15em] uppercase transition-all min-h-[44px] touch-manipulation"
                                            style={{
                                              fontFamily: Typography.ui.fontFamily,
                                              fontSize: Typography.ui.sizes.xs,
                                              fontWeight: Typography.ui.weights.medium,
                                              backgroundColor: Colors.surface,
                                              color: '#EF4444',
                                              border: `1px solid rgba(239, 68, 68, 0.3)`,
                                              borderRadius: BorderRadius.button
                                            }}
                                          >
                                            Reject
                                          </button>
                                        </>
                                      )}

                                      {(isApproved || isRejected) && (
                                        <button
                                          onClick={() => handleGenerateImage(concept, conceptIdx)}
                                          className="flex-1 px-5 py-3 text-xs tracking-[0.15em] uppercase transition-all min-h-[44px] touch-manipulation"
                                          style={{
                                            fontFamily: Typography.ui.fontFamily,
                                            fontSize: Typography.ui.sizes.xs,
                                            fontWeight: Typography.ui.weights.medium,
                                            backgroundColor: Colors.surface,
                                            color: Colors.textSecondary,
                                            border: `1px solid ${Colors.border}`,
                                            borderRadius: BorderRadius.button
                                          }}
                                        >
                                          Generate Again
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })}

                    {/* Render generated images with approve/reject buttons */}
                    {message.parts
                      ?.filter((p: any) => p.type === "image" || p.type === "file")
                      .map((part: any, idx: number) => {
                        const imageUrl = part.image || part.url || part.src
                        if (!imageUrl) return null

                        // Find the concept key for this image
                        const imageEntry = Array.from(generatedImages.entries()).find(
                          ([_, data]) => data.imageUrl === imageUrl
                        )
                        const conceptKey = imageEntry ? imageEntry[0] : null

                        const isApproved = approvedImages.has(imageUrl)
                        const isRejected = rejectedImages.has(imageUrl)

                        return (
                          <div key={idx} className="mt-4 relative group">
                            <img
                              src={imageUrl}
                              alt="Generated"
                              className="cursor-pointer"
                              onClick={() => {
                                const conceptTitle = imageEntry?.[1]?.concept?.title || 
                                                   imageEntry?.[1]?.concept?.label || 
                                                   'Generated Image'
                                setFullscreenImage({
                                  imageUrl,
                                  title: conceptTitle
                                })
                              }}
                              style={{
                                borderRadius: BorderRadius.image,
                                width: '100%',
                                maxWidth: '400px'
                              }}
                            />
                            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!isApproved && !isRejected && conceptKey && (
                                <>
                                  <button
                                    onClick={() => handleApproveImage(imageUrl, conceptKey)}
                                    className="h-8 w-8 flex items-center justify-center"
                                    style={{
                                      backgroundColor: '#16a34a',
                                      borderRadius: BorderRadius.buttonSm,
                                      color: '#FFFFFF'
                                    }}
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleRejectImage(imageUrl)}
                                    className="h-8 w-8 flex items-center justify-center"
                                    style={{
                                      backgroundColor: '#dc2626',
                                      borderRadius: BorderRadius.buttonSm,
                                      color: '#FFFFFF'
                                    }}
                                  >
                                    <XCircle size={14} />
                                  </button>
                                </>
                              )}
                              {isApproved && (
                                <div 
                                  className="px-2 py-1 text-xs flex items-center gap-1"
                                  style={{
                                    backgroundColor: '#16a34a',
                                    borderRadius: BorderRadius.buttonSm,
                                    color: '#FFFFFF',
                                    fontFamily: Typography.ui.fontFamily
                                  }}
                                >
                                  <Check size={12} />
                                  Approved
                                </div>
                              )}
                              {isRejected && (
                                <div 
                                  className="px-2 py-1 text-xs flex items-center gap-1"
                                  style={{
                                    backgroundColor: '#dc2626',
                                    borderRadius: BorderRadius.buttonSm,
                                    color: '#FFFFFF',
                                    fontFamily: Typography.ui.fontFamily
                                  }}
                                >
                                  <XCircle size={12} />
                                  Rejected
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - Editorial */}
          <div 
            className="p-4"
            style={{ 
              borderTop: `1px solid ${Colors.border}`,
              backgroundColor: Colors.backgroundAlt
            }}
          >
            {/* Generation Settings */}
            {showSettings && (
              <Card 
                className="p-5 mb-4"
                style={{
                  backgroundColor: Colors.backgroundAlt,
                  border: `1px solid ${Colors.border}`,
                  borderRadius: BorderRadius.card
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 
                    className="tracking-[0.1em] uppercase"
                    style={{
                      fontFamily: Typography.ui.fontFamily,
                      fontSize: Typography.ui.sizes.xs,
                      fontWeight: Typography.ui.weights.medium,
                      color: Colors.textSecondary
                    }}
                  >
                    Generation Settings
                  </h3>
                  <button
                    onClick={() => setShowSettings(false)}
                    style={{ color: Colors.textMuted }}
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label 
                        className="tracking-[0.1em] uppercase"
                        style={{
                          fontFamily: Typography.ui.fontFamily,
                          fontSize: Typography.ui.sizes.xs,
                          fontWeight: Typography.ui.weights.medium,
                          color: Colors.textSecondary
                        }}
                      >
                        Style Strength
                      </label>
                      <span 
                        style={{
                          fontFamily: Typography.data.fontFamily,
                          fontSize: Typography.data.sizes.sm,
                          fontWeight: Typography.data.weights.medium,
                          color: Colors.textPrimary
                        }}
                      >
                        {styleStrength.toFixed(2)}
                      </span>
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
                        <label 
                          className="tracking-[0.1em] uppercase"
                          style={{
                            fontFamily: Typography.ui.fontFamily,
                            fontSize: Typography.ui.sizes.xs,
                            fontWeight: Typography.ui.weights.medium,
                            color: Colors.textSecondary
                          }}
                        >
                          Prompt Accuracy
                        </label>
                        <span 
                          style={{
                            fontFamily: Typography.data.fontFamily,
                            fontSize: Typography.data.sizes.sm,
                            fontWeight: Typography.data.weights.medium,
                            color: Colors.textPrimary
                          }}
                        >
                          {promptAccuracy.toFixed(1)}
                        </span>
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
                        <label 
                          className="tracking-[0.1em] uppercase"
                          style={{
                            fontFamily: Typography.ui.fontFamily,
                            fontSize: Typography.ui.sizes.xs,
                            fontWeight: Typography.ui.weights.medium,
                            color: Colors.textSecondary
                          }}
                        >
                          Realism Strength
                        </label>
                        <span 
                          style={{
                            fontFamily: Typography.data.fontFamily,
                            fontSize: Typography.data.sizes.sm,
                            fontWeight: Typography.data.weights.medium,
                            color: Colors.textPrimary
                          }}
                        >
                          {realismStrength.toFixed(2)}
                        </span>
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
                    </div>

                    <div>
                      <label 
                        className="tracking-[0.1em] uppercase mb-2 block"
                        style={{
                          fontFamily: Typography.ui.fontFamily,
                          fontSize: Typography.ui.sizes.xs,
                          fontWeight: Typography.ui.weights.medium,
                          color: Colors.textSecondary
                        }}
                      >
                        Aspect Ratio
                      </label>
                      <select
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value)}
                        className="w-full px-3 py-2 text-sm"
                        style={{
                          fontFamily: Typography.ui.fontFamily,
                          fontSize: Typography.ui.sizes.sm,
                          backgroundColor: Colors.surface,
                          border: `1px solid ${Colors.border}`,
                          borderRadius: BorderRadius.input,
                          color: Colors.textPrimary
                        }}
                      >
                        <option value="1:1">Square (1:1)</option>
                        <option value="4:5">Portrait (4:5)</option>
                        <option value="16:9">Landscape (16:9)</option>
                      </select>
                    </div>
                  </div>
                </Card>
              )}

            {/* Brand Detection Indicator */}
            {categoryAutoSelected && (
              <div 
                className="flex items-center gap-2 text-xs rounded-lg px-3 py-2 mb-4"
                style={{
                  backgroundColor: Colors.backgroundAlt,
                  border: `1px solid ${Colors.border}`,
                  borderRadius: BorderRadius.input
                }}
              >
                <CheckCircle2 
                  className="w-4 h-4 shrink-0" 
                  style={{ color: Colors.textSecondary }}
                />
                <span 
                  style={{
                    fontFamily: Typography.ui.fontFamily,
                    fontSize: Typography.ui.sizes.xs,
                    color: Colors.textSecondary
                  }}
                >
                  Category auto-detected: <strong style={{ color: Colors.textPrimary }}>{currentGuideCategory}</strong>
                </span>
                <button
                  onClick={() => {
                    setCategoryAutoSelected(false)
                    setLastAutoSelectedCategory(null)
                  }}
                  style={{ 
                    color: Colors.textMuted,
                    marginLeft: 'auto'
                  }}
                  aria-label="Dismiss"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Chat Input - Simplified with Menu (like Pro Mode) */}
            <form onSubmit={onSubmit} className="flex gap-2 sm:gap-3">
              {/* Menu Dropdown - Replaces settings button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="h-12 w-12 sm:h-12 sm:w-12 flex items-center justify-center shrink-0 transition-all touch-manipulation"
                    style={{
                      backgroundColor: Colors.backgroundAlt,
                      borderRadius: BorderRadius.input,
                      border: `1px solid ${Colors.border}`,
                      color: Colors.textSecondary,
                      minHeight: '44px',
                      minWidth: '44px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = Colors.hover
                      e.currentTarget.style.borderColor = Colors.primary
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = Colors.backgroundAlt
                      e.currentTarget.style.borderColor = Colors.border
                    }}
                  >
                    <MoreVertical size={18} strokeWidth={2} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  style={{
                    backgroundColor: Colors.surface,
                    borderColor: Colors.border,
                    borderRadius: BorderRadius.cardSm,
                    minWidth: '200px',
                    padding: '4px',
                  }}
                >
                  <DropdownMenuItem
                    onClick={() => {
                      setShowSettings(!showSettings)
                    }}
                    style={{
                      fontFamily: Typography.ui.fontFamily,
                      fontSize: Typography.ui.sizes.sm,
                      color: Colors.textPrimary,
                      padding: '8px 12px',
                      cursor: 'pointer',
                    }}
                    className="hover:bg-stone-100"
                  >
                    <Sliders className="w-4 h-4 mr-2" />
                    {showSettings ? 'Hide' : 'Show'} Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setShowTemplateSidebar(!showTemplateSidebar)
                    }}
                    style={{
                      fontFamily: Typography.ui.fontFamily,
                      fontSize: Typography.ui.sizes.sm,
                      color: Colors.textPrimary,
                      padding: '8px 12px',
                      cursor: 'pointer',
                    }}
                    className="hover:bg-stone-100"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {showTemplateSidebar ? 'Hide' : 'Show'} Templates
                  </DropdownMenuItem>
                  <DropdownMenuSeparator
                    style={{
                      backgroundColor: Colors.border,
                      margin: '4px 0',
                    }}
                  />
                  <DropdownMenuItem
                    onClick={handleNewChat}
                    style={{
                      fontFamily: Typography.ui.fontFamily,
                      fontSize: Typography.ui.sizes.sm,
                      color: Colors.textPrimary,
                      padding: '8px 12px',
                      cursor: 'pointer',
                    }}
                    className="hover:bg-stone-100"
                  >
                    New Chat
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowHistory(!showHistory)}
                    style={{
                      fontFamily: Typography.ui.fontFamily,
                      fontSize: Typography.ui.sizes.sm,
                      color: Colors.textPrimary,
                      padding: '8px 12px',
                      cursor: 'pointer',
                    }}
                    className="hover:bg-stone-100"
                  >
                    {showHistory ? 'Hide' : 'Show'} History
                  </DropdownMenuItem>
                  {studioProMode && (
                    <>
                      <DropdownMenuSeparator
                        style={{
                          backgroundColor: Colors.border,
                          margin: '4px 0',
                        }}
                      />
                      <DropdownMenuItem
                        onClick={() => setShowLibraryWizard(true)}
                        style={{
                          fontFamily: Typography.ui.fontFamily,
                          fontSize: Typography.ui.sizes.sm,
                          color: Colors.textPrimary,
                          padding: '8px 12px',
                          cursor: 'pointer',
                        }}
                        className="hover:bg-stone-100"
                      >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        <span className="flex-1">Manage Library</span>
                        {(imageLibrary.selfies.length > 0 || imageLibrary.products.length > 0 || imageLibrary.people.length > 0 || imageLibrary.vibes.length > 0) && (
                          <span
                            style={{
                              fontFamily: Typography.ui.fontFamily,
                              fontSize: Typography.ui.sizes.xs,
                              color: Colors.primary,
                              fontWeight: Typography.ui.weights.medium,
                            }}
                          >
                            {imageLibrary.selfies.length + imageLibrary.products.length + imageLibrary.people.length + imageLibrary.vibes.length}
                          </span>
                        )}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Text Input - Full width now */}
              <textarea
                ref={textareaRef}
                value={input || localInput || ""}
                onChange={safeHandleInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    onSubmit(e)
                  }
                }}
                placeholder="Describe the prompt concept you want to create..."
                className="flex-1 min-h-[44px] sm:min-h-[48px] max-h-32 px-4 py-3 resize-none focus:outline-none focus:ring-1 transition-all touch-manipulation"
                style={{
                  fontFamily: Typography.body.fontFamily,
                  fontSize: Typography.body.sizes.md,
                  fontWeight: Typography.body.weights.light,
                  color: Colors.textPrimary,
                  backgroundColor: Colors.surface,
                  border: `1px solid ${Colors.border}`,
                  borderRadius: BorderRadius.input,
                  lineHeight: Typography.body.lineHeight
                }}
                rows={1}
                disabled={isLoading || isGeneratingConcepts}
              />
              
              {/* Send Button */}
              <button
                type="submit"
                disabled={!(input || localInput)?.trim() || isLoading || isGeneratingConcepts}
                className="h-12 w-12 sm:h-12 sm:w-12 flex items-center justify-center shrink-0 transition-all disabled:opacity-40 touch-manipulation"
                style={{
                  backgroundColor: Colors.primary,
                  borderRadius: BorderRadius.input,
                  minHeight: '44px',
                  minWidth: '44px'
                }}
                onMouseEnter={(e) => {
                  if (!(isLoading || isGeneratingConcepts || !(input || localInput)?.trim())) {
                    e.currentTarget.style.backgroundColor = Colors.accent
                  }
                }}
                onMouseLeave={(e) => {
                  if (!(isLoading || isGeneratingConcepts || !(input || localInput)?.trim())) {
                    e.currentTarget.style.backgroundColor = Colors.primary
                  }
                }}
              >
                {isGeneratingConcepts || isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#FFFFFF' }} />
                ) : (
                  <Send className="w-4 h-4" style={{ color: '#FFFFFF' }} />
                )}
              </button>
            </form>
            
            <p 
              className="mt-2 text-xs"
              style={{
                fontFamily: Typography.ui.fontFamily,
                fontSize: Typography.ui.sizes.xs,
                color: Colors.textMuted
              }}
            >
              Press Enter to send • Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>

      {/* Right: Template Sidebar - Editorial */}
      {showTemplateSidebar && (
        <div 
          className="w-72 shrink-0 overflow-y-auto"
          style={{
            backgroundColor: Colors.surface,
            border: `1px solid ${Colors.border}`,
            borderRadius: BorderRadius.card,
            padding: Spacing.card
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h4 
              style={{
                fontFamily: Typography.subheaders.fontFamily,
                fontSize: Typography.subheaders.sizes.md,
                fontWeight: Typography.subheaders.weights.regular,
                color: Colors.textPrimary
              }}
            >
              Templates
            </h4>
            <button
              onClick={() => setShowTemplateSidebar(false)}
              style={{ color: Colors.textMuted }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {loadingTemplates ? (
            <div className="text-center py-8">
              <Loader2 
                className="w-6 h-6 animate-spin mx-auto mb-2" 
                style={{ color: Colors.textMuted }}
              />
              <p 
                style={{
                  fontFamily: Typography.body.fontFamily,
                  fontSize: Typography.body.sizes.xs,
                  color: Colors.textSecondary
                }}
              >
                Loading templates...
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {loadedTemplates.map(template => (
                <Card
                  key={template.id}
                  className="p-4 cursor-pointer transition-colors"
                  style={{
                    backgroundColor: Colors.backgroundAlt,
                    border: `1px solid ${Colors.border}`,
                    borderRadius: BorderRadius.card
                  }}
                  onClick={() => handleUseTemplate(template)}
                >
                  <div 
                    className="aspect-square rounded mb-3 flex items-center justify-center"
                    style={{ backgroundColor: Colors.border }}
                  >
                    <ImageIcon 
                      className="w-8 h-8" 
                      style={{ color: Colors.textMuted }}
                    />
                  </div>
                  <p 
                    className="mb-2"
                    style={{
                      fontFamily: Typography.subheaders.fontFamily,
                      fontSize: Typography.subheaders.sizes.sm,
                      fontWeight: Typography.subheaders.weights.regular,
                      color: Colors.textPrimary
                    }}
                  >
                    {template.title}
                  </p>
                  <p 
                    className="line-clamp-2 mb-3"
                    style={{
                      fontFamily: Typography.body.fontFamily,
                      fontSize: Typography.body.sizes.xs,
                      fontWeight: Typography.body.weights.light,
                      color: Colors.textSecondary,
                      lineHeight: Typography.body.lineHeight
                    }}
                  >
                    {template.promptPreview}
                  </p>
                  <button
                    className="w-full px-3 py-2 text-xs tracking-[0.1em] uppercase transition-all"
                    style={{
                      fontFamily: Typography.ui.fontFamily,
                      fontSize: Typography.ui.sizes.xs,
                      fontWeight: Typography.ui.weights.medium,
                      color: Colors.textSecondary,
                      border: `1px solid ${Colors.border}`,
                      borderRadius: BorderRadius.buttonSm,
                      backgroundColor: Colors.surface
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleUseTemplate(template)
                    }}
                  >
                    Use Template
                  </button>
                </Card>
              ))}
            </div>
          )}
          
          {!loadingTemplates && loadedTemplates.length === 0 && (
            <div className="text-center py-8">
              <p 
                style={{
                  fontFamily: Typography.body.fontFamily,
                  fontSize: Typography.body.sizes.xs,
                  color: Colors.textSecondary
                }}
              >
                No templates available for this category
              </p>
            </div>
          )}
        </div>
      )}

      {/* Prompt Structure Viewer */}
      <Dialog 
        open={!!viewingPromptStructure} 
        onOpenChange={() => setViewingPromptStructure(null)}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewingPromptStructure?.title || viewingPromptStructure?.label || 'Prompt Structure'}
            </DialogTitle>
            <DialogDescription>
              Full breakdown of the image generation prompt
            </DialogDescription>
          </DialogHeader>
          
          {viewingPromptStructure && (
            <div className="space-y-4">
              {/* Full Prompt Preview */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge>Full Prompt</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const fullPrompt = viewingPromptStructure.fullPrompt || 
                                       viewingPromptStructure.prompt || 
                                       viewingPromptStructure.promptText || 
                                       ''
                      navigator.clipboard.writeText(fullPrompt)
                      toast({ 
                        title: "Copied!",
                        description: "Full prompt copied to clipboard"
                      })
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <div className="bg-stone-50 rounded-lg p-4 text-xs font-mono whitespace-pre-wrap wrap-break-word">
                  {viewingPromptStructure.fullPrompt || 
                   viewingPromptStructure.prompt || 
                   viewingPromptStructure.promptText || 
                   'No prompt available'}
                </div>
              </div>
              
              {/* Parsed Sections */}
              {(() => {
                const fullPrompt = viewingPromptStructure.fullPrompt || 
                                 viewingPromptStructure.prompt || 
                                 viewingPromptStructure.promptText || 
                                 ''
                const sections = parsePromptStructure(fullPrompt)
                
                // Don't show sections if we only have full_prompt
                if (Object.keys(sections).length <= 1 && sections.full_prompt) {
                  return null
                }
                
                return (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-stone-900">Prompt Sections</h4>
                    {Object.entries(sections)
                      .filter(([key]) => key !== 'full_prompt')
                      .map(([key, value]) => (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="capitalize">
                              {key.replace(/_/g, ' ')}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                navigator.clipboard.writeText(value as string)
                                toast({ 
                                  title: "Copied!",
                                  description: `${key.replace(/_/g, ' ')} section copied to clipboard`
                                })
                              }}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy
                            </Button>
                          </div>
                          <div className="bg-stone-50 rounded-lg p-3 text-sm whitespace-pre-wrap wrap-break-word">
                            {value as string}
                          </div>
                        </div>
                      ))}
                  </div>
                )
              })()}
              
              {/* Metadata */}
              {(viewingPromptStructure.category || viewingPromptStructure.brandReferences) && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">Metadata</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {viewingPromptStructure.category && (
                      <div>
                        <span className="text-stone-500">Category:</span>{' '}
                        <span className="font-medium">{viewingPromptStructure.category}</span>
                      </div>
                    )}
                    {viewingPromptStructure.brandReferences && Array.isArray(viewingPromptStructure.brandReferences) && (
                      <div>
                        <span className="text-stone-500">Brands:</span>{' '}
                        <span className="font-medium">
                          {viewingPromptStructure.brandReferences.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Library Wizard Modal - Only show in Pro Mode */}
      {studioProMode && showLibraryWizard && (
        <Dialog open={showLibraryWizard} onOpenChange={setShowLibraryWizard}>
          <DialogContent
            className="max-w-4xl max-h-[90vh] overflow-y-auto"
            style={{
              backgroundColor: Colors.surface,
              borderColor: Colors.border,
            }}
          >
            <DialogHeader>
              <DialogTitle>Manage Image Library</DialogTitle>
              <DialogDescription>
                Upload and organize reference images for Pro Mode generation. Add selfies, products, people, and vibe references.
              </DialogDescription>
            </DialogHeader>
            <ImageUploadFlow
              onComplete={(library) => {
                setImageLibrary(library)
                setShowLibraryWizard(false)
                toast({
                  title: "Library Updated",
                  description: `Added ${library.selfies.length + library.products.length + library.people.length + library.vibes.length} images to your library`,
                })
              }}
              onCancel={() => setShowLibraryWizard(false)}
              initialLibrary={imageLibrary}
              showAfterState={imageLibrary.selfies.length > 0 || imageLibrary.products.length > 0 || imageLibrary.people.length > 0 || imageLibrary.vibes.length > 0}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <FullscreenImageModal
          imageUrl={fullscreenImage.imageUrl}
          imageId={fullscreenImage.imageUrl.split('/').pop() || 'image'}
          title={fullscreenImage.title}
          isOpen={!!fullscreenImage}
          onClose={() => setFullscreenImage(null)}
        />
      )}
    </div>
  )
}
