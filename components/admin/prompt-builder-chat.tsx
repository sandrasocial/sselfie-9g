"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useChat } from "@ai-sdk/react"
import { Send, Sliders, X, Check, XCircle, Image as ImageIcon, Wand2, Loader2, CheckCircle2, FileText, Eye, Copy } from "lucide-react"
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
  onGuideChange
}: PromptBuilderChatProps) {
  // All state declarations first
  const [chatId, setChatId] = useState<number | null>(null)
  const [isLoadingChat, setIsLoadingChat] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

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
  
  // Hooks
  const { toast } = useToast()

  // Sync with parent component when props change
  useEffect(() => {
    if (propSelectedGuideId !== undefined) {
      setCurrentGuideId(propSelectedGuideId)
    }
    if (propSelectedGuideCategory !== undefined) {
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
      // TODO: Add systemPrompt support to API route
      // systemPrompt: PROMPT_BUILDER_SYSTEM,
    },
    onFinish: async (message) => {
      // Messages are automatically saved by the chat API
      // No need to manually save here
    },
  })

  // Initialize chat on mount
  useEffect(() => {
    const initializeChat = async () => {
      // Auto-create a new chat on mount if none exists
      if (!chatId) {
        try {
          console.log("[PromptBuilder] Attempting to create new chat...")
          const response = await fetch("/api/maya/new-chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chatType: "prompt_builder",
            }),
          })
          
          console.log("[PromptBuilder] Response status:", response.status, response.statusText)
          
          if (response.ok) {
            const data = await response.json()
            if (data.chatId) {
              setChatId(data.chatId)
              setIsLoadingChat(false) // ✅ FIX: Enable input when chat is created
            } else {
              console.error("[PromptBuilder] Chat created but no chatId returned:", data)
              // Allow chat to work without ID - useChat will create one when needed
              setIsLoadingChat(false)
            }
          } else {
            // Try to get error message
            let errorMessage = `Server error: ${response.status} ${response.statusText}`
            
            try {
              const text = await response.text()
              console.error("[PromptBuilder] Error response text:", text)
              
              if (text && text.trim()) {
                try {
                  const errorDetails = JSON.parse(text)
                  console.error("[PromptBuilder] Error creating chat (parsed):", errorDetails)
                  errorMessage = errorDetails.details || errorDetails.error || errorDetails.message || errorMessage
                } catch {
                  // Not JSON, use text as error message
                  errorMessage = text || errorMessage
                }
              }
            } catch (parseError: any) {
              console.error("[PromptBuilder] Error parsing response:", parseError)
            }
            
            console.error("[PromptBuilder] Chat creation failed:", errorMessage)
            // Don't block the UI - allow chat to work without pre-created chat ID
            // The useChat hook will create a chat when the first message is sent
            setIsLoadingChat(false)
            toast({
              title: "Chat Initialization Warning",
              description: "Chat will be created when you send your first message.",
              variant: "default"
            })
          }
        } catch (error: any) {
          console.error("[PromptBuilder] Error initializing chat:", error)
          // Don't block the UI - allow chat to work
          setIsLoadingChat(false)
          toast({
            title: "Chat Initialization Warning",
            description: "Chat will be created when you send your first message.",
            variant: "default"
          })
        }
      }
    }
    
    initializeChat()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  // Load chat when chatId changes
  useEffect(() => {
    if (chatId) {
      loadChat(chatId)
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
      const response = await fetch("/api/maya/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate image")
      }

      const data = await response.json()

      if (data.success && data.predictionId && data.generationId) {
        // Start polling for completion
        pollPrediction(data.predictionId, data.generationId, conceptKey, concept)
      } else {
        throw new Error("Invalid response from generation API")
      }
    } catch (error: any) {
      console.error("[PromptBuilder] Error generating image:", error)
      setGeneratingImages((prev) => {
        const next = new Set(prev)
        next.delete(conceptKey)
        return next
      })
      // TODO: Show error message to user
    }
  }

  const pollPrediction = async (
    predictionId: string,
    generationId: number,
    conceptKey: string,
    concept: any
  ) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/maya/check-generation?predictionId=${predictionId}&generationId=${generationId}`
        )
        const data = await response.json()

        if (data.status === "succeeded") {
          // Image is ready
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
          clearInterval(pollInterval)

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
          setGeneratingImages((prev) => {
            const next = new Set(prev)
            next.delete(conceptKey)
            return next
          })
          clearInterval(pollInterval)
          // TODO: Show error message
        }
      } catch (error) {
        console.error("[PromptBuilder] Error polling prediction:", error)
        setGeneratingImages((prev) => {
          const next = new Set(prev)
          next.delete(conceptKey)
          return next
        })
        clearInterval(pollInterval)
      }
    }, 3000) // Poll every 3 seconds

    // Cleanup after 5 minutes (timeout)
    setTimeout(() => {
      clearInterval(pollInterval)
      setGeneratingImages((prev) => {
        const next = new Set(prev)
        next.delete(conceptKey)
        return next
      })
    }, 5 * 60 * 1000)
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
    
    // Call original handler first - this updates the useChat input state
    // handleInputChange should always be available from useChat hook
    if (handleInputChange) {
      handleInputChange(e)
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
      
      const response = await fetch("/api/maya/generate-concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userRequest: userMessage,
          studioProMode: true, // ✅ Enable Studio Pro Mode
          count: 3, // Generate 3 concept variations
          category: currentGuideCategory || "portrait",
          conversationContext: messages.slice(-5).map(m => 
            typeof m.content === "string" ? m.content : JSON.stringify(m.content)
          ).join("\n"),
          templateExamples: templateExamples, // ✅ ADDED: Pass templates to API
        }),
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
    
    if (!input?.trim()) return
    
    const userMessage = input.trim()
    
    // Reset auto-selection flag after submitting (allows new detection on next message)
    setCategoryAutoSelected(false)
    setLastAutoSelectedCategory(null)
    
    // Check if message is a concept generation request
    const isConceptRequest = /create|generate|make|show|give me|concepts|prompts|ideas/i.test(userMessage)
    
    if (isConceptRequest) {
      // Use Pro Mode concept generation
      await handleGenerateConceptsFromMessage(userMessage)
      // Clear input after sending
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

  if (isLoadingChat) {
    return <UnifiedLoading message="Loading chat..." />
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>
      {/* Top Actions - Editorial Style */}
      <div 
        className="flex items-center justify-between mb-6 pb-4"
        style={{ borderBottom: `1px solid ${Colors.borderLight}` }}
      >
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 text-xs tracking-[0.1em] uppercase transition-all"
            style={{
              fontFamily: Typography.ui.fontFamily,
              fontSize: Typography.ui.sizes.xs,
              fontWeight: Typography.ui.weights.medium,
              color: Colors.textSecondary,
              border: `1px solid ${Colors.border}`,
              borderRadius: BorderRadius.buttonSm,
              backgroundColor: showHistory ? Colors.backgroundAlt : Colors.surface
            }}
          >
            {showHistory ? 'Hide' : 'Show'} History
          </button>
          
          <button
            onClick={handleNewChat}
            className="px-4 py-2 text-xs tracking-[0.1em] uppercase transition-all"
            style={{
              fontFamily: Typography.ui.fontFamily,
              fontSize: Typography.ui.sizes.xs,
              fontWeight: Typography.ui.weights.medium,
              color: Colors.textSecondary,
              border: `1px solid ${Colors.border}`,
              borderRadius: BorderRadius.buttonSm,
              backgroundColor: Colors.surface
            }}
          >
            New Chat
          </button>

          <button
            onClick={() => setShowTemplateSidebar(!showTemplateSidebar)}
            className="px-4 py-2 text-xs tracking-[0.1em] uppercase transition-all"
            style={{
              fontFamily: Typography.ui.fontFamily,
              fontSize: Typography.ui.sizes.xs,
              fontWeight: Typography.ui.weights.medium,
              color: Colors.textSecondary,
              border: `1px solid ${Colors.border}`,
              borderRadius: BorderRadius.buttonSm,
              backgroundColor: showTemplateSidebar ? Colors.backgroundAlt : Colors.surface
            }}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            {showTemplateSidebar ? 'Hide' : 'Show'} Templates
          </button>
        </div>
      </div>

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

                {/* Quick Start Examples - Editorial */}
                <div className="space-y-2 w-full max-w-md">
                  {[
                    { text: 'Create Chanel luxury prompts', icon: '◇' },
                    { text: 'Generate ALO workout concepts', icon: '◇' },
                    { text: 'Make travel lifestyle prompts', icon: '◇' }
                  ].map((example, i) => (
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
                  ))}
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
                                    className="overflow-hidden transition-all hover:shadow-lg"
                                    style={{
                                      backgroundColor: Colors.surface,
                                      border: `1px solid ${Colors.border}`,
                                      borderRadius: BorderRadius.card
                                    }}
                                  >
                                    {/* Card Header - Editorial */}
                                    <div 
                                      className="px-5 py-4"
                                      style={{ 
                                        backgroundColor: Colors.backgroundAlt,
                                        borderBottom: `1px solid ${Colors.borderLight}`
                                      }}
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                          <h4 
                                            className="mb-1"
                                            style={{
                                              fontFamily: Typography.subheaders.fontFamily,
                                              fontSize: Typography.subheaders.sizes.md,
                                              fontWeight: Typography.subheaders.weights.regular,
                                              color: Colors.textPrimary,
                                              lineHeight: Typography.subheaders.lineHeight
                                            }}
                                          >
                                            {concept.title || concept.label}
                                          </h4>
                                          {concept.category && (
                                            <span 
                                              className="inline-block px-2 py-1 text-xs tracking-[0.1em] uppercase"
                                              style={{
                                                fontFamily: Typography.ui.fontFamily,
                                                fontSize: Typography.ui.sizes.xs,
                                                color: Colors.textTertiary,
                                                backgroundColor: Colors.background,
                                                borderRadius: BorderRadius.buttonSm
                                              }}
                                            >
                                              {concept.category}
                                            </span>
                                          )}
                                        </div>
                                        
                                        {/* Status Indicator */}
                                        {generatedImage && (
                                          <div className="flex gap-2">
                                            {isApproved && (
                                              <div 
                                                className="w-8 h-8 rounded-full flex items-center justify-center"
                                                style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
                                              >
                                                <Check className="w-4 h-4" style={{ color: '#22C55E' }} />
                                              </div>
                                            )}
                                            {isRejected && (
                                              <div 
                                                className="w-8 h-8 rounded-full flex items-center justify-center"
                                                style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                                              >
                                                <X className="w-4 h-4" style={{ color: '#EF4444' }} />
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Card Body - Editorial Spacing */}
                                    <div style={{ padding: Spacing.card }}>
                                      <div className="space-y-4">
                                        {/* Description */}
                                        {concept.description && (
                                          <p 
                                            className="leading-relaxed"
                                            style={{
                                              fontFamily: Typography.body.fontFamily,
                                              fontSize: Typography.body.sizes.md,
                                              fontWeight: Typography.body.weights.light,
                                              color: Colors.textSecondary,
                                              lineHeight: Typography.body.lineHeight
                                            }}
                                          >
                                            {concept.description}
                                          </p>
                                        )}

                                        {/* Prompt Preview - Collapsible */}
                                        {(concept.prompt || concept.promptText) && (
                                          <div>
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
                                              className="text-xs tracking-[0.1em] uppercase transition-colors"
                                              style={{
                                                fontFamily: Typography.ui.fontFamily,
                                                fontSize: Typography.ui.sizes.xs,
                                                color: Colors.textSecondary
                                              }}
                                            >
                                              {expandedPrompts.has(conceptKey) ? 'Hide Prompt' : 'View Prompt'}
                                            </button>
                                            
                                            {expandedPrompts.has(conceptKey) && (
                                              <div 
                                                className="mt-3 p-4 text-xs font-mono leading-relaxed max-h-48 overflow-y-auto"
                                                style={{
                                                  backgroundColor: Colors.backgroundAlt,
                                                  border: `1px solid ${Colors.borderLight}`,
                                                  borderRadius: BorderRadius.buttonSm
                                                }}
                                              >
                                                {(concept.prompt || concept.promptText).substring(0, 500)}
                                                {(concept.prompt || concept.promptText).length > 500 && "..."}
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {/* Generated Image */}
                                        {generatedImage && (
                                          <div 
                                            className="relative overflow-hidden"
                                            style={{ borderRadius: BorderRadius.image }}
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

                                        {/* Action Buttons - Editorial Style */}
                                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                          {!generatedImage && !isGenerating && (
                                            <button
                                              onClick={() => handleGenerateImage(concept, conceptIdx)}
                                              className="flex-1 px-5 py-3 text-xs tracking-[0.15em] uppercase transition-all min-h-[48px]"
                                              style={{
                                                fontFamily: Typography.ui.fontFamily,
                                                fontSize: Typography.ui.sizes.xs,
                                                fontWeight: Typography.ui.weights.medium,
                                                backgroundColor: Colors.primary,
                                                color: '#FFFFFF',
                                                borderRadius: BorderRadius.input
                                              }}
                                            >
                                              Generate Image
                                            </button>
                                          )}

                                          {generatedImage && !isApproved && !isRejected && (
                                            <>
                                              <button
                                                onClick={() => handleApproveImage(generatedImage.imageUrl, conceptKey)}
                                                className="flex-1 px-5 py-3 text-xs tracking-[0.15em] uppercase transition-all min-h-[48px]"
                                                style={{
                                                  fontFamily: Typography.ui.fontFamily,
                                                  fontSize: Typography.ui.sizes.xs,
                                                  fontWeight: Typography.ui.weights.medium,
                                                  backgroundColor: '#22C55E',
                                                  color: '#FFFFFF',
                                                  borderRadius: BorderRadius.input
                                                }}
                                              >
                                                Approve
                                              </button>
                                              <button
                                                onClick={() => handleRejectImage(generatedImage.imageUrl)}
                                                className="flex-1 px-5 py-3 text-xs tracking-[0.15em] uppercase transition-all min-h-[48px]"
                                                style={{
                                                  fontFamily: Typography.ui.fontFamily,
                                                  fontSize: Typography.ui.sizes.xs,
                                                  fontWeight: Typography.ui.weights.medium,
                                                  backgroundColor: Colors.surface,
                                                  color: '#EF4444',
                                                  border: `1px solid rgba(239, 68, 68, 0.3)`,
                                                  borderRadius: BorderRadius.input
                                                }}
                                              >
                                                Reject
                                              </button>
                                            </>
                                          )}

                                          {(isApproved || isRejected) && (
                                            <button
                                              onClick={() => handleGenerateImage(concept, conceptIdx)}
                                              className="flex-1 px-5 py-3 text-xs tracking-[0.15em] uppercase transition-all min-h-[48px]"
                                              style={{
                                                fontFamily: Typography.ui.fontFamily,
                                                fontSize: Typography.ui.sizes.xs,
                                                fontWeight: Typography.ui.weights.medium,
                                                backgroundColor: Colors.surface,
                                                color: Colors.textSecondary,
                                                border: `1px solid ${Colors.border}`,
                                                borderRadius: BorderRadius.input
                                              }}
                                            >
                                              Generate Again
                                            </button>
                                          )}
                                        </div>
                                      </div>
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

            {/* Chat Input */}
            <form onSubmit={onSubmit} className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="h-12 w-12 flex items-center justify-center shrink-0 transition-all"
                style={{
                  backgroundColor: showSettings ? Colors.primary : Colors.backgroundAlt,
                  borderRadius: BorderRadius.input,
                  color: showSettings ? '#FFFFFF' : Colors.textSecondary
                }}
              >
                <Sliders size={18} />
              </button>
              <textarea
                ref={textareaRef}
                value={input || ""}
                onChange={safeHandleInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    onSubmit(e)
                  }
                }}
                placeholder="Describe the prompt concept you want to create..."
                className="flex-1 min-h-[48px] max-h-32 px-4 py-3 resize-none focus:outline-none focus:ring-1 transition-all"
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
                disabled={isLoading || isGeneratingConcepts || isLoadingChat}
              />
              <button
                type="submit"
                disabled={!input?.trim() || isLoading || isGeneratingConcepts || isLoadingChat}
                className="h-12 w-12 flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
                style={{
                  backgroundColor: Colors.primary,
                  borderRadius: BorderRadius.input
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
    </div>
  )
}
