"use client"

import React from "react"
import type { UIMessage } from "@ai-sdk/react"
import VideoCard from "../video-card"
import MayaConceptCards from "./maya-concept-cards"
import { PromptSuggestionCard as NewPromptSuggestionCard } from "../prompt-suggestion-card"
import type { PromptSuggestion } from "@/lib/maya/prompt-generator"
import FeedPreviewCard from "@/components/feed-planner/feed-preview-card"
import FeedCaptionCard from "@/components/feed-planner/feed-caption-card"
import FeedStrategyCard from "@/components/feed-planner/feed-strategy-card"
import UnifiedLoading from "../unified-loading"
import MayaOfferBriefForm from "./maya-offer-brief-form"
import type { MayaOfferBrief, MayaOfferBriefAssetType } from "@/lib/maya/offer-brief"
import MayaGeneratedAssetCard from "./maya-generated-asset-card"
import { MayaInlineAction, MayaInlineCard, MayaInlinePill } from "./maya-inline-card"
import {
  hasFeedStrategyArtifacts,
  stripFeedStrategyArtifacts,
} from "@/lib/maya/feed-strategy"

type OfferBriefFormValues = Omit<MayaOfferBrief, "assetType">

function isFeatureEnabled(value?: string | null): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === "1" || normalized === "true"
}

interface MayaChatInterfaceProps {
  // Messages
  messages: UIMessage[]
  filteredMessages: UIMessage[]
  setMessages: React.Dispatch<React.SetStateAction<UIMessage[]>>
  
  // Mode
  proMode: boolean
  
  // States
  isTyping: boolean
  isGeneratingConcepts: boolean
  isGeneratingPro: boolean
  isCreatingFeed?: boolean
  contentFilter: "all" | "photos" | "videos"
  
  // Refs
  messagesContainerRef: React.RefObject<HTMLDivElement>
  messagesEndRef: React.RefObject<HTMLDivElement>
  showScrollButton: boolean
  isAtBottomRef: React.MutableRefObject<boolean>
  
  // Callbacks
  scrollToBottom: (behavior?: ScrollBehavior) => void
  onFeedSaved?: (messageId: string, feedId: number) => void
  
  // Concept Cards Props
  chatId?: number
  uploadedImages: Array<{ url: string; type: 'base' | 'product'; label?: string; source?: 'gallery' | 'upload' }>
  setCreditBalance: (balance: number) => void
  onImageGenerated?: () => void
  isAdmin: boolean
  selectedGuideId: number | null
  selectedGuideCategory: string | null
  onSaveToGuide: (concept: any, imageUrl?: string) => void
  userId?: string
  user: any | null
  
  // Prompt Suggestions
  promptSuggestions: PromptSuggestion[]
  
  // Generation Settings (Classic mode)
  generationSettings?: {
    styleStrength: number
    promptAccuracy: number
    aspectRatio: string
    realismStrength: number
  }
  enhancedAuthenticity?: boolean
  onToolSelectGenerationSource?: (source: "selfies" | "custom_model" | "base_model") => void
  onToolOpenUploadZone?: (category: "selfies" | "products" | "people" | "vibes") => void
  onToolPromptSelect?: (prompt: string) => void
  onToolSubmitOfferBrief?: (assetType: MayaOfferBriefAssetType, values: OfferBriefFormValues) => void
  onToolStartVideoGeneration?: (input: {
    messageId: string
    imageId: string
    imageUrl: string
    prompt?: string
    description?: string
    category?: string
  }) => void
  
}

/**
 * Maya Chat Interface Component
 * 
 * Handles rendering of all chat messages, including:
 * - Text messages with markdown support
 * - Image parts
 * - Concept cards
 * - Video cards
 * - Carousel generation cards
 * - Studio Pro results
 * - Typing indicator
 * - Concept generation loading
 * - Scroll button
 */
export default function MayaChatInterface({
  messages,
  filteredMessages,
  setMessages,
  proMode,
  isTyping,
  isGeneratingConcepts,
  isGeneratingPro,
  isCreatingFeed = false,
  contentFilter,
  messagesContainerRef,
  messagesEndRef,
  showScrollButton,
  isAtBottomRef,
  scrollToBottom,
  onFeedSaved,
  chatId,
  uploadedImages,
  setCreditBalance,
  onImageGenerated,
  isAdmin,
  selectedGuideId,
  selectedGuideCategory,
  onSaveToGuide,
  userId,
  user,
  promptSuggestions,
  generationSettings,
  enhancedAuthenticity,
  onToolSelectGenerationSource,
  onToolOpenUploadZone,
  onToolPromptSelect,
  onToolSubmitOfferBrief,
  onToolStartVideoGeneration,
}: MayaChatInterfaceProps) {
  const isDevVideoDebug = process.env.NODE_ENV !== "production"
  const isLandingPagesUiEnabled = isFeatureEnabled(process.env.NEXT_PUBLIC_FEATURE_MAYA_LANDING_PAGES_UI)
  const TOOL_RENDER_TYPES = new Set([
    "tool-generateConcepts",
    "tool-showCapabilities",
    "tool-showStudioHub",
    "tool-showGallery",
    "tool-saveToGallery",
    "tool-generateImage",
    "tool-showUploadZone",
    "tool-collectOfferBrief",
    "tool-editAsset",
    "tool-createAssetPreview",
    "tool-structuredAssetBlocked",
    "tool-generateFeed",
    "tool-generateCaptions",
    "tool-generateStrategy",
    "tool-generateVideo",
  ])

  const stripControlText = (text: string): string => {
    if (!text) return ""

    return stripFeedStrategyArtifacts(
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
      .replace(/\[COLLECT_OFFER_BRIEF(?:\s*:\s*[^\]]+)?\]/gi, "")
      .replace(/\[SUBMIT_OFFER_BRIEF:\s*[^\]]+\]/gi, "")
      .replace(/\[EDIT_ASSET(?:\s*:\s*[^\]]+)?\]/gi, "")
      .replace(/\[CREATE_ASSET(?:\s*:\s*[^\]]+)?\]/gi, "")
      .replace(/\[STRUCTURED_ASSET_BLOCKED(?:\s*:\s*[^\]]+)?\]/gi, "")
      .replace(/\[GENERATE_CAPTIONS\]/gi, "")
      .replace(/\[GENERATE_STRATEGY\]/gi, "")
      .replace(/\[Inspiration Image: https?:\/\/[^\]]+\]/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\s{2,}/g, " ")
      .trim(),
    )
  }

  const hasRenderableMessage = (msg: UIMessage): boolean => {
    if (!msg) return false

    if (Array.isArray(msg.parts) && msg.parts.length > 0) {
      const hasImagePart = msg.parts.some((part: any) => part?.type === "image")
      if (hasImagePart) return true

      const hasToolPart = msg.parts.some((part: any) => part?.type && TOOL_RENDER_TYPES.has(part.type))
      if (hasToolPart) return true

      const textContent = msg.parts
        .filter((part: any) => part?.type === "text" && typeof part?.text === "string")
        .map((part: any) => part.text)
        .join(" ")

      return stripControlText(textContent).length > 0
    }

    if (typeof (msg as any).content === "string") {
      return stripControlText((msg as any).content).length > 0
    }

    return false
  }

  const renderVideoDebugPanel = (debug: any): React.ReactNode => {
    if (!isDevVideoDebug || !debug || typeof debug !== "object") return null

    const authorityPrompt =
      typeof debug.authorityMotionPrompt === "string" ? debug.authorityMotionPrompt.trim() : ""
    const sourcePrompt = typeof debug.sourceMotionPrompt === "string" ? debug.sourceMotionPrompt.trim() : ""
    const builder = typeof debug.authorityBuilder === "string" ? debug.authorityBuilder.trim() : ""
    const category = typeof debug.category === "string" ? debug.category.trim() : ""

    if (!authorityPrompt && !sourcePrompt && !builder && !category) return null

    return (
      <div className="mt-3 rounded-lg border border-[rgba(245,167,66,0.45)] bg-[rgba(245,167,66,0.08)] p-3 text-[11px] text-[#f5e8d0]">
        <div className="text-[10px] uppercase tracking-[0.16em] text-[#f5c98a]">Video Debug (Dev Only)</div>
        {builder ? <div className="mt-1">Builder: {builder}</div> : null}
        {category ? <div className="mt-1">Category: {category}</div> : null}
        {sourcePrompt ? <div className="mt-1">Source Prompt: {sourcePrompt}</div> : null}
        {authorityPrompt ? <div className="mt-1">Authority Prompt: {authorityPrompt}</div> : null}
      </div>
    )
  }

  // Helper function to remove emojis from text
  const removeEmojis = (text: string): string => {
    if (!text) return text
    return text
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      .replace(/[\u{2700}-\u{27BF}]/gu, '')
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
      .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')
      .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
      .replace(/[\u{200D}]/gu, '')
      .replace(/[\u{FE0F}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  // Helper function to parse and render markdown-style text
  const renderMarkdownText = (text: string): React.ReactNode => {
    let cleanedText = text
    // Remove all ** markdown formatting (user requested)
    cleanedText = cleanedText.replace(/\*\*/g, '')
    const lines = cleanedText.split('\n')
    const elements: React.ReactNode[] = []
    let currentList: React.ReactNode[][] = []
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim()
      
      // Handle list items
      if (trimmedLine.match(/^[-*]\s+/)) {
        const listItem = trimmedLine.replace(/^[-*]\s+/, '')
        // Remove ** markdown (user requested)
        const cleanedListItem = listItem.replace(/\*\*/g, '')
        const processedItem: React.ReactNode[] = []
        processedItem.push(<span key="text-0">{cleanedListItem}</span>)
        
        if (processedItem.length === 0) {
          processedItem.push(<span key="text-0">{listItem}</span>)
        }
        currentList.push(processedItem)
      } else {
        // Flush current list if exists
        if (currentList.length > 0) {
          elements.push(
            <ul key={`list-${index}`} className="list-disc list-inside space-y-2 my-3 ml-6">
              {currentList.map((item, itemIdx) => (
                <li key={itemIdx} className="text-[16px] leading-[1.8] font-light text-[#f0ede8]">
                  {item}
                </li>
              ))}
            </ul>
          )
          currentList = []
        }
        
        // Handle regular paragraphs (removed bold markdown per user request)
        if (trimmedLine) {
          // Remove ** markdown (user requested)
          const cleanedLine = trimmedLine.replace(/\*\*/g, '')
          const processedLine: React.ReactNode[] = []
          processedLine.push(<span key="text-0">{cleanedLine}</span>)
          
          if (processedLine.length === 0) {
            processedLine.push(<span key="text-0">{trimmedLine}</span>)
          }
          
          if (trimmedLine.length > 0) {
            elements.push(
              <p key={`para-${index}`} className="text-[16px] leading-[1.8] font-light text-[#f0ede8] mb-4 last:mb-0">
                {processedLine}
              </p>
            )
          }
        } else if (index < lines.length - 1) {
          elements.push(<div key={`spacer-${index}`} className="h-2" />)
        }
      }
    })
    
    // Flush any remaining list
    if (currentList.length > 0) {
      elements.push(
        <ul key="list-final" className="list-disc list-inside space-y-2 my-3 ml-6">
          {currentList.map((item, itemIdx) => (
            <li key={itemIdx} className="text-[16px] leading-[1.8] font-light text-[#f0ede8]">
              {item}
            </li>
          ))}
        </ul>
      )
    }
    
    return elements.length > 0 ? <div className="space-y-1">{elements}</div> : null
  }

  const renderMessageContent = (text: string, isUser: boolean) => {
    let cleanedText = stripFeedStrategyArtifacts(text)
    cleanedText = cleanedText.replace(/\[GENERATE_PROMPTS[:\s]+[^\]]+\]/gi, "").trim()
    cleanedText = cleanedText.replace(/\[GENERATE_CONCEPTS\]\s*[^\n]*/gi, "").trim()
    cleanedText = cleanedText.replace(/\[SHOW_CAPABILITIES\]/gi, "").trim()
    cleanedText = cleanedText.replace(/\[SHOW_GALLERY\]/gi, "").trim()
    cleanedText = cleanedText.replace(/\[SAVE_TO_GALLERY(?:\s*:\s*[^\]]+)?\]/gi, "").trim()
    cleanedText = cleanedText.replace(/\[GENERATE_IMAGE(?:\s*:\s*[^\]]+)?\]/gi, "").trim()
    cleanedText = cleanedText.replace(/\[SHOW_UPLOAD_ZONE(?:\s*:\s*[^\]]+)?\]/gi, "").trim()
    cleanedText = cleanedText.replace(/\[COLLECT_OFFER_BRIEF(?:\s*:\s*[^\]]+)?\]/gi, "").trim()
    cleanedText = cleanedText.replace(/\[SUBMIT_OFFER_BRIEF:\s*[^\]]+\]/gi, "").trim()
    cleanedText = cleanedText.replace(/\[EDIT_ASSET(?:\s*:\s*[^\]]+)?\]/gi, "").trim()
    cleanedText = cleanedText.replace(/\[CREATE_ASSET(?:\s*:\s*[^\]]+)?\]/gi, "").trim()
    // Remove "Aesthetic Choice:" section headers and content
    cleanedText = cleanedText.replace(/Aesthetic Choice:[\s\S]*?(?=\n\n|\nOverall|$)/gi, '').trim()
    
    // Remove "Overall Vibe:" section headers and content
    cleanedText = cleanedText.replace(/Overall Vibe:[\s\S]*?(?=\n\n|\nGrid|$)/gi, '').trim()
    
    // Remove any remaining "FEED STRATEGY:" headers and following content until next section
    cleanedText = cleanedText.replace(/FEED STRATEGY:\s*"[^"]*"\s*/gi, '').trim()
    cleanedText = cleanedText.replace(/Strategic Rationale:[\s\S]*?(?=\n\n|\nGrid|$)/gi, '').trim()
    cleanedText = cleanedText.replace(/Grid Layout:[\s\S]*?(?=\n\n|\nPosts:|$)/gi, '').trim()
    cleanedText = cleanedText.replace(/Posts:[\s\S]*?(?=\n\n|$)/gi, '').trim()
    
    // Remove any standalone JSON-like structures (incomplete or complete)
    cleanedText = cleanedText.replace(/"position":\s*\d+[\s\S]*$/g, '').trim()
    cleanedText = cleanedText.replace(/"postType":\s*"[^"]*"[\s\S]*$/g, '').trim()
    
    cleanedText = cleanedText.trim()
    // Also remove other feed-related triggers
    cleanedText = cleanedText.replace(/\[GENERATE_CAPTIONS\]/gi, "").trim()
    cleanedText = cleanedText.replace(/\[GENERATE_STRATEGY\]/gi, "").trim()

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
      return <p className="text-[16px] leading-[1.8] font-light whitespace-pre-wrap text-[#f0ede8]">{removeEmojis(cleanedText)}</p>
    }

    // For Maya's messages (assistant), render with markdown support
    return (
      <div className="text-[16px] leading-[1.8] font-light text-[#f0ede8]">
        {renderMarkdownText(cleanedText)}
      </div>
    )
  }

  // Parse prompt suggestions from text (for Studio Pro mode)
  const parsePromptSuggestions = (text: string): Array<{ label: string; prompt: string; description?: string }> => {
    if (!text || !proMode) return []
    
    const suggestions: Array<{ label: string; prompt: string; description?: string }> = []
    
    // Pattern 1: Carousel slides
    const slideMatches = text.matchAll(/(?:\*\*)?Slide\s+(\d+)\s*(?:of\s+(\d+))?\s*[-–]\s*([^:\n]+):/gi)
    const slideArray = Array.from(slideMatches)
    
    if (slideArray.length > 0) {
      slideArray.forEach((slideMatch, idx) => {
        const slideNum = slideMatch[1]
        const totalSlides = slideMatch[2] || ''
        const label = slideMatch[3]?.trim() || `Slide ${slideNum}`
        const matchIndex = slideMatch.index || 0
        
        const afterColon = text.substring(matchIndex + slideMatch[0].length)
        const nextSlideMatch = slideArray[idx + 1]
        const endIndex = nextSlideMatch ? (nextSlideMatch.index || text.length) : text.length
        
        let prompt = text.substring(matchIndex + slideMatch[0].length, endIndex).trim()
        
        prompt = prompt
          .replace(/\n\n(Copy|Then|This is going|Once you|Here are all|Copy slide|Perfect! For carousels).*$/is, '')
          .replace(/^[\s\n]+|[\s\n]+$/g, '')
          .trim()
        
        const hasTemplateStructure = 
          (prompt.includes('EXACTLY identical') || prompt.includes('facial features EXACTLY')) &&
          (prompt.includes('Composition:') || prompt.includes('Composition')) &&
          (prompt.includes('Style:') || prompt.includes('Style')) &&
          (prompt.includes('Lighting:') || prompt.includes('Lighting')) &&
          (prompt.includes('Color Palette:') || prompt.includes('Color Palette')) &&
          (prompt.includes('Technical Details:') || prompt.includes('Technical Details')) &&
          (prompt.includes('Final Use:') || prompt.includes('Final Use')) &&
          prompt.length > 500
        
        if (prompt && hasTemplateStructure) {
          suggestions.push({ 
            label: `Slide ${slideNum}${totalSlides ? ` of ${totalSlides}` : ''} - ${label}`,
            prompt: prompt,
            description: label
          })
        }
      })
    }
    
    // Pattern 2: Options
    const optionPattern = /(?:\*\*)?Option\s+(\d+)[\s-]+([^:]+):[\s\n]*(?:"([^"]+)"|`([^`]+)`|```[\s\S]*?```|([^"`\n]+(?:\n[^"`\n]+)*?)(?=\n\n|\nOption|\n\*\*Option|$))/gi
    let match
    while ((match = optionPattern.exec(text)) !== null) {
      const optionNum = match[1]
      const label = match[2]?.trim() || `Option ${optionNum}`
      const prompt = match[3] || match[4] || match[5] || ''
      if (prompt && prompt.trim().length > 20) {
        suggestions.push({ label, prompt: prompt.trim() })
      }
    }
    
    return suggestions
  }

  // Remove prompts from text when they appear in cards
  const removePromptsFromText = (text: string, suggestions: Array<{ prompt: string }>): string => {
    if (suggestions.length === 0) return text
    
    let cleanedText = text
    
    suggestions.forEach((suggestion) => {
      const prompt = suggestion.prompt
      const escapedPrompt = prompt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      
      cleanedText = cleanedText.replace(new RegExp(`"${escapedPrompt}"`, 'g'), '')
      cleanedText = cleanedText.replace(new RegExp(`'${escapedPrompt}'`, 'g'), '')
      cleanedText = cleanedText.replace(new RegExp('```[\\s\\S]*?' + escapedPrompt + '[\\s\\S]*?```', 'g'), '')
      cleanedText = cleanedText.replace(new RegExp('`' + escapedPrompt + '`', 'g'), '')
      
      const lines = cleanedText.split('\n')
      cleanedText = lines.filter(line => {
        const trimmedLine = line.trim()
        if (trimmedLine.match(/^(Slide|Option|Prompt|\*\*Slide|\*\*Option)/i)) {
          return true
        }
        if (trimmedLine.match(/^[-*]\s+/) || trimmedLine.length < 50) {
          return true
        }
        const lineLower = trimmedLine.toLowerCase()
        const promptLower = prompt.toLowerCase()
        if (promptLower.length > 30) {
          return !lineLower.includes(promptLower.substring(0, 30))
        }
        return !lineLower.includes(promptLower)
      }).join('\n')
    })
    
    cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n').trim()
    
    return cleanedText
  }

  return (
    <div className="flex-1 min-h-0 px-6 md:px-12 bg-transparent">
      <div
        ref={messagesContainerRef}
        className="h-full overflow-y-auto pr-1 scroll-smooth"
        style={{
          // Layout contract: measured fixed header height + breathing room.
          paddingTop: "calc(var(--maya-header-height, 124px) + 16px)",
          // Keep last message clear of dynamic input dock only (nav is already below the dock).
          paddingBottom: "calc(var(--input-bar-height, 168px) + max(16px, env(safe-area-inset-bottom, 0px)))",
        }}
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {filteredMessages &&
          Array.isArray(filteredMessages) &&
          filteredMessages
            .filter((msg) => {
              return hasRenderableMessage(msg as UIMessage)
            })
            .map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end mb-8 sm:mb-10" : "justify-start mb-12 sm:mb-14"}`}>
                <div className={`${msg.role === "user" ? "max-w-[80%] sm:max-w-[80%] order-2" : "max-w-[92%] sm:max-w-[88%] order-1"}`}>
                  {/* Handle messages with parts array (preferred format) */}
                  {msg.parts &&
                    Array.isArray(msg.parts) &&
                    (() => {
                      // Group parts by type
                      const textParts = msg.parts.filter((p) => p && p.type === "text")
                      const imageParts = msg.parts.filter((p) => p && (p as any).type === "image")
                      const otherParts = msg.parts.filter((p) => p && p.type !== "text" && (p as any).type !== "image")
                      const fullMessageText = textParts
                        .map((part: any) => part?.text || "")
                        .join("")
                      const messageHasFeedArtifacts = hasFeedStrategyArtifacts(fullMessageText)
                      const hasFeedCard = msg.parts?.some((p: any) => p.type === "tool-generateFeed")
                      
                      return (
                        <>
                          {/* Render text + image together if both exist */}
                          {(textParts.length > 0 || imageParts.length > 0) && (
                            <div
                              className={`transition-all duration-300 ${
                                msg.role === "user"
                                  ? "bg-[rgba(175,170,162,0.20)] backdrop-blur-sm border border-[rgba(195,190,182,0.25)] rounded-2xl rounded-tr-sm text-[#f0ede8] px-4 py-3"
                                  : "bg-[rgba(175,170,162,0.12)] backdrop-blur-sm border border-[rgba(195,190,182,0.15)] rounded-2xl rounded-tl-sm text-[#f0ede8] px-4 py-3"
                              }`}
                              role={msg.role === "assistant" ? "article" : undefined}
                            >
                              {textParts.map((part, idx) => {
                                const text = (part as any)?.text || ''
                                const shouldShowPendingFeedLoader =
                                  messageHasFeedArtifacts && !hasFeedCard && (isCreatingFeed || isTyping)
                                const shouldShowLoader =
                                  shouldShowPendingFeedLoader && idx === 0
                                const shouldHideText =
                                  (shouldShowPendingFeedLoader && idx > 0) ||
                                  (hasFeedCard && messageHasFeedArtifacts)
                                
                                // Check for prompt suggestions in workbench mode
                                const parsedPromptSuggestions = parsePromptSuggestions(text)
                                
                                // Remove prompts from display text if they're in workbench (Studio Pro mode)
                                let displayText = stripFeedStrategyArtifacts(text)
                                
                                // Remove "Aesthetic Choice:" section headers and content
                                displayText = displayText.replace(/Aesthetic Choice:[\s\S]*?(?=\n\n|\nOverall|$)/gi, '').trim()
                                
                                // Remove "Overall Vibe:" section headers and content
                                displayText = displayText.replace(/Overall Vibe:[\s\S]*?(?=\n\n|\nGrid|$)/gi, '').trim()
                                
                                // Remove "FEED STRATEGY:" section headers and content
                                displayText = displayText.replace(/FEED STRATEGY:\s*"[^"]*"\s*/gi, '').trim()
                                
                                // Remove "Strategic Rationale:" section and content until next section
                                displayText = displayText.replace(/Strategic Rationale:[\s\S]*?(?=\n\n|\nGrid|$)/gi, '').trim()
                                
                                // Remove "Grid Layout:" section and content
                                displayText = displayText.replace(/Grid Layout:[\s\S]*?(?=\n\n|\nPosts:|$)/gi, '').trim()
                                
                                // Remove "Posts:" section and JSON content
                                displayText = displayText.replace(/Posts:\s*```json[\s\S]*?```/gi, '').trim()
                                displayText = displayText.replace(/Posts:\s*\{[\s\S]*?\}/g, '').trim()
                                
                                // Remove any standalone JSON-like structures (incomplete or complete)
                                // Match patterns like: "position": 2, "postType": "lifestyle"
                                displayText = displayText.replace(/"position":\s*\d+[\s\S]*$/g, '').trim()
                                displayText = displayText.replace(/"postType":\s*"[^"]*"[\s\S]*$/g, '').trim()
                                
                                // Clean up any remaining feed-related triggers
                                displayText = displayText
                                  .replace(/\[GENERATE_CAPTIONS\]/gi, '')
                                  .replace(/\[GENERATE_STRATEGY\]/gi, '')
                                  .trim()
                                
                                // Remove excessive blank lines
                                displayText = displayText.replace(/\n{3,}/g, '\n\n').trim()
                                
                                // Remove prompts that are rendered as cards (Classic Mode)
                                if (!proMode && parsedPromptSuggestions.length > 0) {
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
                                  
                                  const otherPrompts = parsedPromptSuggestions.filter(s => !s.label.includes('Slide'))
                                  if (otherPrompts.length > 0) {
                                    displayText = removePromptsFromText(displayText, otherPrompts)
                                  }
                                  
                                  displayText = displayText
                                    .replace(/\[GENERATE_PROMPTS[:\s]+[^\]]+\]/gi, '')
                                    .replace(/\[GENERATE_PROMPTS\]/gi, '')
                                    .replace(/\[SHOW_IMAGE_UPLOAD_MODULE[:\s]+[^\]]+\]/gi, '')
                                    .replace(/\[SHOW_IMAGE_UPLOAD_MODULE\][^\n]*/gi, '')
                                    .replace(/\[SHOW_IMAGE_UPLOAD_MODULE\]/gi, '')
                                    .replace(/Keep the .*?facial features EXACTLY identical.*?This is critical\./gis, '')
                                    .replace(/Composition:.*?Final Use:.*?Slide \d+ of \d+/gis, '')
                                    .replace(/\n{3,}/g, '\n\n')
                                    .replace(/\s{2,}/g, ' ')
                                    .trim()
                                }
                                
                                return (
                                  <div key={idx}>
                                    {/* CRITICAL: Show loader if feed is being created, otherwise show processed text */}
                                    {/* This allows text processing to continue for trigger detection while hiding the raw JSON from users */}
                                    {shouldShowLoader ? (
                                      <div className="flex items-center justify-center w-full py-8 sm:py-12">
                                        <div className="w-full max-w-md px-4 sm:px-6">
                                          <UnifiedLoading 
                                            variant="section" 
                                            message="Creating Your Feed Layout" 
                                            className="w-full"
                                          />
                                        </div>
                                      </div>
                                    ) : shouldHideText || displayText.length === 0 ? (
                                      // CRITICAL: Hide text content when feed card exists to prevent JSON from showing
                                      null
                                    ) : (
                                      <>
                                        {renderMessageContent(displayText, msg.role === "user")}
                                        
                                        {/* Render prompt suggestion cards from API */}
                                        {msg.role === 'assistant' &&
                                          promptSuggestions.length > 0 &&
                                          msg.id === messages[messages.length - 1]?.id && (
                                      <div className="mt-4 space-y-3">
                                        <div className="text-xs text-[#8a8780] mb-1">
                                          Step 2 – Pick a concept you like, then send it to your Workbench below.
                                        </div>
                                        {promptSuggestions.map((suggestion) => (
                                          <NewPromptSuggestionCard
                                            key={`api-suggestion-${suggestion.id}`}
                                            suggestion={suggestion}
                                            onCopyToWorkbench={() => {}}
                                            onUseInWorkbench={() => {}}
                                          />
                                        ))}
                                      </div>
                                    )}
                                    
                                    {/* Render non-carousel suggestions as cards */}
                                    {(() => {
                                      if (parsedPromptSuggestions.length > 0 && msg.role === 'assistant') {
                                        const hasCarouselSlides = parsedPromptSuggestions.some(s => s.label.includes('Slide'))
                                        if (hasCarouselSlides) {
                                          return null
                                        }
                                        
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
                                                    onCopyToWorkbench={() => {}}
                                                    onUseInWorkbench={() => {}}
                                                  />
                                                )
                                              })}
                                            </div>
                                          )
                                        }
                                      }
                                      return null
                                    })()}
                                      </>
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

                              if (output && output.state === "ready" && Array.isArray(output.concepts)) {
                                const concepts = output.concepts

                                return (
                                  <MayaConceptCards
                                    key={partIndex}
                                    messageId={msg.id}
                                    concepts={concepts}
                                    studioProMode={proMode}
                                    chatId={chatId}
                                    uploadedImages={uploadedImages}
                                    onCreditsUpdate={setCreditBalance}
                                    onTrainingRequired={() => onToolSelectGenerationSource?.("custom_model")}
                                    generationSettings={generationSettings}
                                    enhancedAuthenticity={enhancedAuthenticity}
                                    messages={messages}
                                    onPromptUpdate={(messageId, updatedConceptId, newFullPrompt) => {
                                      setMessages((prevMessages) => {
                                        return prevMessages.map((message) => {
                                          if (message.id === messageId && message.parts) {
                                            return {
                                              ...message,
                                              parts: message.parts.map((part: any) => {
                                                if (part.type === 'tool-generateConcepts' && part.output?.concepts) {
                                                  return {
                                                    ...part,
                                                    output: {
                                                      ...part.output,
                                                      concepts: part.output.concepts.map((c: any) => {
                                                        const cId = c.id || `concept-${messageId}-${concepts.findIndex((con: any) => con === c)}`
                                                        if (cId === updatedConceptId) {
                                                          return {
                                                            ...c,
                                                            fullPrompt: newFullPrompt,
                                                          }
                                                        }
                                                        return c
                                                      }),
                                                    },
                                                  }
                                                }
                                                return part
                                              }),
                                            }
                                          }
                                          return message
                                        })
                                      })
                                    }}
                                    onImageGenerated={onImageGenerated}
                                    isAdmin={isAdmin}
                                    selectedGuideId={selectedGuideId}
                                    selectedGuideCategory={selectedGuideCategory}
                                    onSaveToGuide={onSaveToGuide}
                                    userId={userId}
                                    user={user}
                                  />
                                )
                              }
                              return null
                            }

                            if (part.type === "tool-showCapabilities") {
                              const capabilities = [
                                {
                                  title: "Create Photos",
                                  prompt: "I want to create a photo for my new offer",
                                  description: "Run Classic, Pro, or trained-model generation in this chat.",
                                },
                                {
                                  title: "Create Concept Cards",
                                  prompt: "Generate concept cards for my next content shoot",
                                  description: "Draft post, reel, and carousel concepts in the same thread.",
                                },
                                {
                                  title: "Animate to Video",
                                  prompt: "Animate my latest image into a short reel",
                                  description: "Pick an image and launch video generation inline.",
                                },
                                {
                                  title: "Create Content Calendar",
                                  prompt: "Create a content calendar for this month",
                                  description: "Draft your monthly calendar and keep editing in-thread.",
                                },
                                {
                                  title: "Upload Product Assets",
                                  prompt: "Open upload zone for products",
                                  description: "Add selfies, products, people, and vibe references.",
                                },
                                {
                                  title: "Open My Studio Hub",
                                  prompt: "Show my studio hub and everything you've created",
                                  description: "View your latest feeds, photos, and videos inline.",
                                },
                              ]

                              return (
                                <div key={partIndex} className="mt-3 rounded-xl border border-[rgba(195,190,182,0.20)] bg-[rgba(175,170,162,0.10)] p-4">
                                  <div className="text-xs uppercase tracking-[0.2em] text-[#8a8780]">Maya Capabilities</div>
                                  <p className="mt-2 text-sm text-[#d5d5d5]">
                                    Pick a workflow and I’ll run it here in chat.
                                  </p>
                                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {capabilities.map((item) => (
                                      <button
                                        key={item.title}
                                        type="button"
                                        onClick={() => onToolPromptSelect?.(item.prompt)}
                                        className="rounded-lg border border-[rgba(195,190,182,0.20)] bg-[rgba(175,170,162,0.06)] px-3 py-3 text-left transition-colors hover:bg-[rgba(175,170,162,0.15)]"
                                      >
                                        <div className="text-[11px] uppercase tracking-[0.16em] text-[#f0ede8]">{item.title}</div>
                                        <div className="mt-1 text-xs text-[#bdbdbd]">{item.description}</div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )
                            }

                            if (part.type === "tool-showStudioHub") {
                              const output = (part as any).output || {}
                              const state = output.state || "ready"
                              const stats = output.stats || { feedCount: 0, pageCount: 0, photoCount: 0, videoCount: 0 }
                              const feeds = Array.isArray(output.feeds) ? output.feeds : []
                              const pages = Array.isArray(output.pages) ? output.pages : []
                              const recentPhotos = Array.isArray(output.recentPhotos) ? output.recentPhotos : []
                              const recentVideos = Array.isArray(output.recentVideos) ? output.recentVideos : []

                              if (state === "loading") {
                                return (
                                  <MayaInlineCard
                                    key={partIndex}
                                    eyebrow="Studio Hub"
                                    title="My Studio"
                                    subtitle="Loading your created assets, drafts, and recent outputs."
                                  />
                                )
                              }

                              if (state === "error") {
                                return (
                                  <MayaInlineCard
                                    key={partIndex}
                                    eyebrow="Studio Hub"
                                    title="My Studio"
                                    subtitle={output.message || "Could not load Studio Hub."}
                                  />
                                )
                              }

                              return (
                                <MayaInlineCard
                                  key={partIndex}
                                  eyebrow="Studio Hub"
                                  title="My Studio"
                                  subtitle="Feeds, photos, and videos surfaced from your current Maya workspace."
                                  actions={
                                    <MayaInlineAction href="/studio?tab=studio#studio">
                                      Open Full Hub
                                    </MayaInlineAction>
                                  }
                                >
                                  <div className="grid gap-px overflow-hidden rounded-[22px] border border-[rgba(195,190,182,0.14)] bg-[rgba(175,170,162,0.10)] sm:grid-cols-3">
                                    {[
                                      { label: "Feeds", value: Number(stats.feedCount || 0) },
                                      { label: "Photos", value: Number(stats.photoCount || 0) },
                                      { label: "Videos", value: Number(stats.videoCount || 0) },
                                    ].map((item) => (
                                      <div key={item.label} className="stone-inset-panel px-3 py-3">
                                        <div className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-smoke)]">
                                          {item.label}
                                        </div>
                                        <div className="mt-1 text-[22px] text-[color:var(--color-porcelain)]">{item.value}</div>
                                      </div>
                                    ))}
                                  </div>

                                  {(feeds.length > 0 || recentPhotos.length > 0 || recentVideos.length > 0) ? (
                                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                                      {feeds.slice(0, 2).map((feed: any) => (
                                        <div
                                          key={`hub-feed-${feed.id}`}
                                          className="stone-inset-panel rounded-[22px] px-4 py-3"
                                        >
                                          <div className="flex items-center justify-between gap-3">
                                            <div>
                                              <div className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-smoke)]">Feed</div>
                                              <div className="mt-1 text-sm text-[color:var(--color-porcelain)]">{feed.title || `Feed ${feed.id}`}</div>
                                            </div>
                                            <MayaInlineAction href={feed.openUrl || "/studio?tab=feed-planner#feed-planner"}>
                                              Open
                                            </MayaInlineAction>
                                          </div>
                                        </div>
                                      ))}
                                      {recentPhotos.slice(0, 1).map((photo: any) => (
                                        <div
                                          key={`hub-photo-${photo.id}`}
                                          className="stone-inset-panel rounded-[22px] px-4 py-3"
                                        >
                                          <div className="flex items-center justify-between gap-3">
                                            <div>
                                              <div className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-smoke)]">Recent Photo</div>
                                              <div className="mt-1 text-sm text-[color:var(--color-porcelain)]">
                                                {photo.prompt || "Recent photo"}
                                              </div>
                                            </div>
                                            <MayaInlineAction href={photo.openUrl || "/studio?tab=gallery#gallery"}>
                                              Open
                                            </MayaInlineAction>
                                          </div>
                                        </div>
                                      ))}
                                      {recentVideos.slice(0, 1).map((video: any) => (
                                        <div
                                          key={`hub-video-${video.id}`}
                                          className="stone-inset-panel rounded-[22px] px-4 py-3"
                                        >
                                          <div className="flex items-center justify-between gap-3">
                                            <div>
                                              <div className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-smoke)]">Latest Video</div>
                                              <div className="mt-1 text-sm text-[color:var(--color-porcelain)]">Motion draft ready</div>
                                            </div>
                                            <MayaInlineAction href={video.openUrl || "/studio?tab=maya#maya/videos"}>
                                              Open
                                            </MayaInlineAction>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}
                                </MayaInlineCard>
                              )
                            }

                            if (part.type === "tool-showGallery") {
                              const output = (part as any).output || {}
                              const state = output.state || "ready"
                              const images = Array.isArray(output.images) ? output.images : []

                              if (state === "loading") {
                                return (
                                  <MayaInlineCard
                                    key={partIndex}
                                    eyebrow="Gallery"
                                    title="Recent Photos"
                                    subtitle="Loading your latest images from Maya and Studio."
                                  />
                                )
                              }

                              if (state === "error") {
                                return (
                                  <MayaInlineCard
                                    key={partIndex}
                                    eyebrow="Gallery"
                                    title="Recent Photos"
                                    subtitle={output.message || "Could not load gallery."}
                                  />
                                )
                              }

                              return (
                                <MayaInlineCard
                                  key={partIndex}
                                  eyebrow="Gallery"
                                  title="Recent Photos"
                                  subtitle="Your latest outputs stay here so Maya can reuse them in new drafts."
                                  aside={<MayaInlinePill>{Number(output.total || images.length)} images</MayaInlinePill>}
                                  actions={<MayaInlineAction href="/studio?tab=gallery#gallery">Open Gallery</MayaInlineAction>}
                                >
                                  {images.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-2.5">
                                      {images.slice(0, 6).map((image: any, index: number) => (
                                        <div
                                          key={image.id || index}
                                          className="stone-inset-panel overflow-hidden rounded-[20px]"
                                        >
                                          <div className="aspect-square overflow-hidden">
                                            <img
                                              src={image.imageUrl || image.image_url}
                                              alt="Gallery image"
                                              className="h-full w-full object-cover"
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="stone-inset-panel rounded-[22px] px-4 py-4 text-sm text-[color:var(--text-accent)]">
                                      No images yet. Generate your first photo and Maya will keep it here.
                                    </div>
                                  )}
                                </MayaInlineCard>
                              )
                            }

                            if (part.type === "tool-saveToGallery") {
                              const output = (part as any).output || {}
                              const state = output.state || "ready"

                              if (state === "loading") {
                                return (
                                  <MayaInlineCard
                                    key={partIndex}
                                    eyebrow="Gallery"
                                    title="Saving Photo"
                                    subtitle="Adding this image to your gallery."
                                  />
                                )
                              }

                              if (state === "error") {
                                return (
                                  <MayaInlineCard
                                    key={partIndex}
                                    eyebrow="Gallery"
                                    title="Save Failed"
                                    subtitle={output.message || "Could not save to gallery."}
                                  />
                                )
                              }

                              return (
                                <MayaInlineCard
                                  key={partIndex}
                                  eyebrow="Gallery"
                                  title="Saved"
                                  subtitle={output.message || "Saved to your gallery."}
                                  actions={<MayaInlineAction href="/studio?tab=gallery#gallery">Open Gallery</MayaInlineAction>}
                                />
                              )
                            }

                            if (part.type === "tool-generateImage") {
                              const output = (part as any).output || {}
                              const selectedSource = output.source || "choose_source"
                              const options: Array<{
                                id: "selfies" | "custom_model" | "base_model"
                                label: string
                                description: string
                              }> = [
                                { id: "selfies", label: "Use Selfies", description: "Upload or use linked references." },
                                { id: "custom_model", label: "Train Model", description: "Go to training with your selfies." },
                                { id: "base_model", label: "Base Model", description: "Create with the default model." },
                              ]

                              return (
                                <MayaInlineCard
                                  key={partIndex}
                                  eyebrow="Create Photo"
                                  title="Choose Your Source"
                                  subtitle="Keep generation inside Maya. Pick the image source and I’ll handle the rest."
                                >
                                  <div className="grid gap-2 sm:grid-cols-3">
                                    {options.map((option) => {
                                      const isSelected = selectedSource === option.id
                                      return (
                                        <button
                                          key={option.id}
                                          type="button"
                                          onClick={() => onToolSelectGenerationSource?.(option.id)}
                                          className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                                            isSelected
                                              ? "border-[rgba(240,237,232,0.18)] bg-[rgba(240,237,232,0.14)]"
                                              : "stone-inset-panel hover:bg-[rgba(175,170,162,0.16)]"
                                          }`}
                                        >
                                          <div className="text-[11px] uppercase tracking-[0.16em] text-[#f0ede8]">{option.label}</div>
                                          <div className="mt-1 text-xs text-[#bdbdbd]">{option.description}</div>
                                        </button>
                                      )
                                    })}
                                  </div>
                                </MayaInlineCard>
                              )
                            }

                            if (part.type === "tool-showUploadZone") {
                              const output = (part as any).output || {}
                              const category =
                                output.category === "products" ||
                                output.category === "people" ||
                                output.category === "vibes"
                                  ? output.category
                                  : "selfies"
                              const categoryLabelMap: Record<string, string> = {
                                selfies: "Selfies",
                                products: "Products",
                                people: "People",
                                vibes: "Vibes",
                              }
                              const categoryLabel = categoryLabelMap[category] || "Selfies"

                              return (
                                <MayaInlineCard
                                  key={partIndex}
                                  eyebrow="Upload Zone"
                                  title={`Add ${categoryLabel}`}
                                  subtitle={`Ready for ${categoryLabel.toLowerCase()}. Open the inline uploader and drop your images.`}
                                  actions={
                                    <MayaInlineAction onClick={() => onToolOpenUploadZone?.(category)} variant="primary">
                                      Open Upload
                                    </MayaInlineAction>
                                  }
                                />
                              )
                            }

                            if (part.type === "tool-collectOfferBrief") {
                              const output = (part as any).output || {}
                              const assetType = output.assetType || "page"
                              if (assetType === "page") {
                                return null
                              }
                              return (
                                <div key={partIndex}>
                                  <MayaOfferBriefForm
                                    assetType={assetType === "calendar" ? "calendar" : "page"}
                                    initialValues={output.prefill || {}}
                                    missingFields={Array.isArray(output.missingFields) ? output.missingFields : []}
                                    onSubmit={(assetType, values) => {
                                      onToolSubmitOfferBrief?.(assetType, values)
                                    }}
                                  />
                                </div>
                              )
                            }

                            if (part.type === "tool-editAsset") {
                              const output = (part as any).output || {}
                              const assetType = output.assetType || "page"
                              if (assetType === "page") {
                                return null
                              }
                              const assetLabel =
                                typeof output.assetLabel === "string" && output.assetLabel.trim().length > 0
                                  ? output.assetLabel
                                  : assetType === "calendar"
                                    ? "Content Calendar"
                                    : assetType === "pdf"
                                      ? "Workbook"
                                      : "Landing Page"
                              const helperText =
                                typeof output.message === "string" && output.message.trim().length > 0
                                  ? output.message
                                  : `Maya will apply your next edit instructions to this ${assetLabel}.`

                              return (
                                <MayaInlineCard
                                  key={partIndex}
                                  eyebrow="Editing Workspace"
                                  title={assetLabel}
                                  subtitle={helperText}
                                  aside={<MayaInlinePill tone="strong">{assetType}</MayaInlinePill>}
                                >
                                  <div className="stone-inset-panel rounded-[22px] px-4 py-4 text-[11px] leading-relaxed text-[color:var(--text-accent)]">
                                    Next step: describe the exact change you want, whether it is the headline, CTA, section copy, layout, or tile content. Maya keeps editing this same asset in place.
                                  </div>
                                </MayaInlineCard>
                              )
                            }

                            if (part.type === "tool-createAssetPreview") {
                              const output = (part as any).output || {}
                              const assetType = output.assetType || "page"
                              if (!isLandingPagesUiEnabled && assetType === "page") {
                                return null
                              }
                              const assetLabel =
                                typeof output.assetLabel === "string" && output.assetLabel.trim().length > 0
                                  ? output.assetLabel
                                  : assetType === "calendar"
                                    ? "Content Calendar"
                                    : assetType === "pdf"
                                      ? "Workbook"
                                      : "Landing Page"
                              const previewText =
                                typeof output.previewText === "string" && output.previewText.trim().length > 0
                                  ? output.previewText
                                  : "Draft created. Keep iterating with Maya in this chat."
                              const url =
                                typeof output.url === "string" && output.url.trim().length > 0 ? output.url : null

                              return (
                                <MayaGeneratedAssetCard
                                  key={partIndex}
                                  assetType={assetType}
                                  assetLabel={assetLabel}
                                  assetId={output.assetId}
                                  previewText={previewText}
                                  url={url}
                                />
                              )
                            }

                            if (part.type === "tool-structuredAssetBlocked") {
                              const output = (part as any).output || {}
                              const assetType = output.assetType || "calendar"
                              if (assetType === "pdf" || assetType === "page") {
                                return null
                              }
                              const recoveryHint =
                                typeof output.recoveryHint === "string" && output.recoveryHint.trim().length > 0
                                  ? output.recoveryHint
                                  : "Tell me exactly what to build and I’ll run it in your template flow."
                              const missingFields = Array.isArray(output.missingFields)
                                ? output.missingFields
                                : []
                              const missingLabel = missingFields.includes("action_verb")
                                ? "what to create"
                                : "one missing detail"
                              const quickRetryPrompt =
                                assetType === "calendar"
                                  ? "Create a content calendar for my current offer this week."
                                  : "Create a content calendar for my current offer this week."

                              return (
                                <MayaInlineCard
                                  key={partIndex}
                                  eyebrow="Need One Detail"
                                  title={`Ready to build your ${assetType}`}
                                  subtitle={`I only need ${missingLabel} before execution.`}
                                  actions={
                                    <>
                                      <MayaInlineAction onClick={() => onToolPromptSelect?.(quickRetryPrompt)} variant="primary">
                                        Retry Build
                                      </MayaInlineAction>
                                      <MayaInlineAction onClick={() => onToolPromptSelect?.("I need one quick form to fill the missing details.")}>
                                        Missing Detail Form
                                      </MayaInlineAction>
                                    </>
                                  }
                                >
                                  <div className="stone-inset-panel rounded-[22px] px-4 py-4 text-[11px] leading-relaxed text-[color:var(--text-accent)]">
                                    {recoveryHint}
                                  </div>
                                </MayaInlineCard>
                              )
                            }

                            // Render feed preview card
                            if (part.type === "tool-generateFeed") {
                              console.log("[FEED-CARD] 🎨 RENDERING FEED CARD IN CHAT")
                              const toolPart = part as any
                              const output = toolPart.output
                              
                              // CRITICAL: Log for debugging feed card rendering
                              if (!output) {
                                console.warn("[FEED-CARD] ⚠️ Feed card part has no output:", part)
                                return null
                              }
                              
                              console.log("[FEED-CARD] ✅ Feed card data:", {
                                feedId: output.feedId,
                                title: output.title,
                                hasPosts: Array.isArray(output.posts),
                                postsCount: output.posts?.length || 0,
                                needsRestore: output._needsRestore,
                                hasStrategy: !!output.strategy,
                                isSaved: output.isSaved,
                              })
                              
                              const isSaved = output.isSaved !== false && !!output.feedId
                              
                              // Handle save callback to update message part with feedId
                              // Use message ID and part type for structural comparison (not identity)
                              // Identity comparison fails after React re-renders with new message objects
                              const currentMessageId = msg.id
                              const handleSave = (feedId: number) => {
                                console.log("[MayaChatInterface] Feed saved, updating message:", feedId)
                                
                                // CRITICAL: Update message parts with feedId
                                // Use functional update to ensure we're working with latest messages
                                // The AI SDK might update messages, so we need to merge, not replace
                                setMessages((prevMessages: any[]) => {
                                  // CRITICAL: Create a deep copy to avoid mutating the original array
                                  return prevMessages.map((message) => {
                                    // Find the message by ID
                                    if (message.id === currentMessageId && message.parts && Array.isArray(message.parts)) {
                                      // CRITICAL: Preserve all existing parts and only update the feed card
                                      // This ensures we don't lose parts added by the AI SDK
                                      const updatedParts = message.parts.map((p: any) => {
                                        if (p.type === "tool-generateFeed") {
                                          // Create new output object without strategy property
                                          const { strategy, ...outputWithoutStrategy } = p.output || {}
                                          return {
                                            ...p,
                                            output: {
                                              ...outputWithoutStrategy,
                                              feedId,
                                              isSaved: true,
                                            },
                                          }
                                        }
                                        // CRITICAL: Return a copy of the part to avoid mutation
                                        return { ...p }
                                      })
                                      
                                      console.log("[MayaChatInterface] 🔄 Message updated with feedId:", feedId, "triggering re-save")
                                      
                                      return {
                                        ...message,
                                        parts: updatedParts,
                                      }
                                    }
                                    // CRITICAL: Return a copy of the message to avoid mutation
                                    return { ...message }
                                  })
                                })
                                
                                // CRITICAL: Trigger re-save by calling onFeedSaved callback
                                // This allows the parent component to update the database with [FEED_CARD:feedId] marker
                                if (onFeedSaved) {
                                  onFeedSaved(currentMessageId, feedId)
                                }
                              }
                              
                              // CRITICAL FIX: Always set needsRestore=true for saved feeds (with feedId) to ensure fresh data fetch
                              // This ensures images are always fetched from database, not stale cached data
                              const shouldRestore = output.feedId ? true : (output._needsRestore === true)
                              
                              return (
                                <FeedPreviewCard
                                  key={partIndex}
                                  feedId={output.feedId}
                                  feedTitle={output.title || 'Instagram Feed'}
                                  feedDescription={output.description || ''}
                                  posts={output.posts || []}
                                  needsRestore={shouldRestore}
                                  strategy={output.strategy}
                                  isSaved={isSaved}
                                  onSave={handleSave}
                                  proMode={output.proMode ?? proMode}
                                  styleStrength={output.styleStrength ?? 0.8}
                                  promptAccuracy={output.promptAccuracy ?? 0.8}
                                  aspectRatio={output.aspectRatio ?? "1:1"}
                                  realismStrength={output.realismStrength ?? 0.8}
                                  messageId={msg.id}
                                  onPromptUpdate={(messageId, postId, newPrompt) => {
                                    // Update message state with edited prompt (similar to concept cards)
                                    setMessages((prevMessages) => {
                                      return prevMessages.map((message) => {
                                        if (message.id === messageId && message.parts) {
                                          return {
                                            ...message,
                                            parts: message.parts.map((part: any) => {
                                              if (part.type === 'tool-generateFeed' && part.output) {
                                                // Find the post to get its position
                                                const postToUpdate = (part.output.posts || []).find((p: any) => p.id === postId)
                                                const postPosition = postToUpdate?.position
                                                
                                                // Update posts array with edited prompt
                                                const updatedPosts = (part.output.posts || []).map((p: any) => {
                                                  if (p.id === postId) {
                                                    return {
                                                      ...p,
                                                      prompt: newPrompt,
                                                      visualDirection: newPrompt, // Also update visualDirection if it exists
                                                    }
                                                  }
                                                  return p
                                                })
                                                
                                                // Also update strategy posts if they exist
                                                let updatedStrategy = part.output.strategy
                                                if (updatedStrategy && updatedStrategy.posts && postPosition) {
                                                  updatedStrategy = {
                                                    ...updatedStrategy,
                                                    posts: updatedStrategy.posts.map((p: any) => {
                                                      if (p.position === postPosition) {
                                                        return {
                                                          ...p,
                                                          prompt: newPrompt,
                                                          visualDirection: newPrompt,
                                                        }
                                                      }
                                                      return p
                                                    })
                                                  }
                                                }
                                                
                                                const updatedOutput = {
                                                  ...part.output,
                                                  posts: updatedPosts,
                                                  strategy: updatedStrategy,
                                                }
                                                
                                                // Save to database via update-message API
                                                // CRITICAL FIX: messageId is already a string from msg.id.toString() in load-chat route
                                                // The API handles string-to-number conversion, so pass it as-is
                                                // parseInt() would corrupt UUIDs (if they existed) or fail silently for invalid formats
                                                if (chatId && messageId) {
                                                  fetch('/api/maya/update-message', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    credentials: 'include',
                                                    body: JSON.stringify({
                                                      messageId: messageId, // Pass as string - API handles conversion
                                                      content: message.content || '',
                                                      feedCards: [updatedOutput],
                                                      append: false,
                                                    }),
                                                  }).catch(error => {
                                                    console.error('[MayaChatInterface] ❌ Error saving edited prompt:', error)
                                                  })
                                                }
                                                
                                                return {
                                                  ...part,
                                                  output: updatedOutput,
                                                }
                                              }
                                              return part
                                            }),
                                          }
                                        }
                                        return message
                                      })
                                    })
                                  }}
                                  onViewFullFeed={() => {
                                    // Navigate will be handled by FeedPreviewCard component
                                  }}
                                />
                              )
                            }

                            // Render caption cards
                            if (part.type === "tool-generateCaptions") {
                              const toolPart = part as any
                              const output = toolPart.output
                              
                              if (output && output.feedId && output.captions && Array.isArray(output.captions)) {
                                return (
                                  <div key={partIndex} className="space-y-3">
                                    {output.captions.map((caption: any) => (
                                      <FeedCaptionCard
                                        key={caption.postId}
                                        caption={caption.text || caption.caption || ""}
                                        postPosition={caption.position}
                                        postPrompt={caption.prompt}
                                        hashtags={caption.hashtags || []}
                                        feedId={output.feedId}
                                        postId={caption.postId}
                                        onAddToFeed={async () => {
                                          // Will be handled by FeedCaptionCard component
                                        }}
                                        onRegenerate={async () => {
                                          // Regenerate caption for this post
                                          // This could trigger a new caption generation
                                        }}
                                      />
                                    ))}
                                  </div>
                                )
                              }
                              return null
                            }

                            // Render strategy card
                            if (part.type === "tool-generateStrategy") {
                              const toolPart = part as any
                              const output = toolPart.output
                              
                              if (output && output.feedId && output.strategy) {
                                return (
                                  <FeedStrategyCard
                                    key={partIndex}
                                    strategy={output.strategy}
                                    feedId={output.feedId}
                                    onAddToFeed={async () => {
                                      // Will be handled by FeedStrategyCard component
                                    }}
                                  />
                                )
                              }
                              return null
                            }


                            if (part.type === "tool-generateVideo") {
                              const toolPart = part as any
                              const output = toolPart.output

                              if (output && output.state === "loading_images") {
                                return (
                                  <div key={partIndex} className="mt-3 rounded-xl border border-[rgba(195,190,182,0.20)] bg-[rgba(175,170,162,0.10)] p-4">
                                    <div className="flex items-center gap-2 text-[#8a8780]">
                                      <div className="w-1.5 h-1.5 border-2 border-[#a8a49c] border-t-transparent rounded-full animate-spin" />
                                      <span className="text-xs tracking-[0.15em] uppercase font-light">
                                        Loading images for video...
                                      </span>
                                    </div>
                                  </div>
                                )
                              }

                              if (output && output.state === "choose_image") {
                                const images = Array.isArray(output.images) ? output.images : []
                                return (
                                  <div key={partIndex} className="mt-3 rounded-xl border border-[rgba(195,190,182,0.20)] bg-[rgba(175,170,162,0.10)] p-4">
                                    <div className="text-xs uppercase tracking-[0.2em] text-[#8a8780]">Create Video</div>
                                    <p className="mt-2 text-sm text-[#d5d5d5]">
                                      Pick from your gallery or upload a new reference and Maya will animate it inline.
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        onClick={() => onToolOpenUploadZone?.("selfies")}
                                        className="rounded-lg border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.12)] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[#f0ede8] hover:bg-[rgba(175,170,162,0.22)]"
                                      >
                                        Upload Reference
                                      </button>
                                    </div>
                                    {images.length > 0 ? (
                                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                        {images.slice(0, 6).map((image: any, imageIndex: number) => {
                                          const imageId = String(image.id || image.imageId || imageIndex)
                                          const imageUrl = image.image_url || image.imageUrl || ""
                                          const source = String(image.source || "").toLowerCase()
                                          const sourceLabel =
                                            source === "brand_assets"
                                              ? "Uploaded"
                                              : source === "generated_images"
                                                ? "Generated"
                                                : "Gallery"
                                          if (!imageUrl) return null
                                          return (
                                            <button
                                              key={`${imageId}-${imageIndex}`}
                                              type="button"
                                              onClick={() =>
                                                onToolStartVideoGeneration?.({
                                                  messageId: msg.id,
                                                  imageId,
                                                  imageUrl,
                                                  prompt: image.prompt || "",
                                                  description: image.description || "",
                                                  category: image.category || "",
                                                })
                                              }
                                              className="overflow-hidden rounded-lg border border-[rgba(195,190,182,0.20)] bg-[rgba(28,27,25,0.30)] hover:border-[rgba(195,190,182,0.40)]"
                                            >
                                              <img src={imageUrl} alt="Video source" className="h-24 w-full object-cover" />
                                              <div className="px-2 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[#f0ede8]">
                                                Animate
                                              </div>
                                              <div className="pb-2 text-[9px] uppercase tracking-[0.12em] text-[#b8b8b8]">
                                                {sourceLabel}
                                              </div>
                                            </button>
                                          )
                                        })}
                                      </div>
                                    ) : (
                                      <div className="mt-3 rounded-lg border border-[rgba(195,190,182,0.20)] bg-[rgba(28,27,25,0.30)] p-3">
                                        <p className="text-xs text-[#d7d7d7]">
                                          No images found yet. Generate a photo first, then I can animate it.
                                        </p>
                                        <button
                                          type="button"
                                          onClick={() => onToolPromptSelect?.("Create a photo for my brand")}
                                          className="mt-2 rounded-lg border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.12)] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[#f0ede8] hover:bg-[rgba(175,170,162,0.22)]"
                                        >
                                          Create Photo First
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => onToolOpenUploadZone?.("selfies")}
                                          className="mt-2 ml-2 rounded-lg border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.12)] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[#f0ede8] hover:bg-[rgba(175,170,162,0.22)]"
                                        >
                                          Upload Reference
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )
                              }

                              if (output && output.state === "processing") {
                                return (
                                  <div key={partIndex} className="mt-3">
                                    <VideoCard
                                      videoUrl=""
                                      status="processing"
                                      progress={output.progress}
                                      motionPrompt={output.motionPrompt || toolPart.args?.motionPrompt}
                                    />
                                    {renderVideoDebugPanel(output.debug)}
                                  </div>
                                )
                              }

                              if (output && output.state === "ready" && output.videoUrl) {
                                return (
                                  <div key={partIndex} className="mt-3">
                                    <VideoCard
                                      videoUrl={output.videoUrl}
                                      motionPrompt={output.motionPrompt || toolPart.args?.motionPrompt}
                                      imageSource={output.imageUrl || toolPart.args?.imageUrl}
                                    />
                                    {renderVideoDebugPanel(output.debug)}
                                  </div>
                                )
                              }

                              if (output && output.state === "error") {
                                return (
                                  <div key={partIndex} className="mt-3 rounded-xl border border-[rgba(195,190,182,0.20)] bg-[rgba(175,170,162,0.10)] p-4">
                                    <p className="text-sm text-[#f5c2c2]">{output.message || "Video generation failed."}</p>
                                    {renderVideoDebugPanel(output.debug)}
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
                  {/* Fallback: Handle messages with content field but no parts array */}
                  {(!msg.parts || !Array.isArray(msg.parts)) && typeof (msg as any).content === "string" && (msg as any).content.trim() && (
                    <div
                      className={`rounded-xl transition-all duration-300 ${
                        msg.role === "user"
                          ? "bg-[rgba(175,170,162,0.20)] backdrop-blur-sm border border-[rgba(195,190,182,0.25)] rounded-2xl rounded-tr-sm text-[#f0ede8] px-4 py-3"
                          : "bg-[rgba(175,170,162,0.12)] backdrop-blur-sm border border-[rgba(195,190,182,0.15)] rounded-2xl rounded-tl-sm text-[#f0ede8] px-4 py-3"
                      }`}
                      role={msg.role === "assistant" ? "article" : undefined}
                    >
                      {renderMessageContent((msg as any).content, msg.role === "user")}
                    </div>
                  )}
                </div>
              </div>
            ))}

          {/* Global typing indicator - Show "Creating Your Feed Layout" when creating feed, otherwise "Maya is thinking..." */}
          {/* CRITICAL FIX: Only show typing indicator when NOT creating feed, or when creating feed but feed card already exists */}
          {/* This prevents duplication with the feed creation loader below */}
          {isTyping && !isCreatingFeed && (
            <div className="flex justify-start">
              <div className="bg-[rgba(175,170,162,0.12)] backdrop-blur-sm border border-[rgba(195,190,182,0.15)] p-3 rounded-2xl rounded-tl-sm max-w-[85%]">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full animate-bounce bg-[#a8a49c]"></div>
                    <div
                      className="w-1.5 h-1.5 rounded-full animate-bounce bg-[#a8a49c]"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-1.5 h-1.5 rounded-full animate-bounce bg-[#a8a49c]"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                  <span className="text-xs font-light text-[#8a8780]">Maya is thinking...</span>
                </div>
              </div>
            </div>
          )}

          {/* Feed Creation Loading - Show only if feed is being created but no message has feed card yet */}
          {/* CRITICAL FIX: Only show if no message has feed trigger (inline loader handles those) */}
          {/* This prevents duplication with inline loaders that replace message content */}
          {/* CRITICAL FIX: Center loader in entire chat viewport, mobile optimized */}
          {isCreatingFeed && !filteredMessages.some((m: any) => 
            m.parts?.some((p: any) => p.type === "tool-generateFeed")
          ) && !filteredMessages.some((m: any) => {
            // Check if any message has feed trigger content (which would show inline loader)
            const textContent = m.parts?.find((p: any) => p.type === "text")?.text || ""
            const hasFeedTrigger = textContent.includes("[CREATE_FEED_STRATEGY") || 
                                  textContent.includes("```json") ||
                                  textContent.includes('"feedStrategy"') ||
                                  textContent.includes('"position"') ||
                                  textContent.includes("Aesthetic Choice:") ||
                                  textContent.includes("Overall Vibe:")
            return hasFeedTrigger && !m.parts?.some((p: any) => p.type === "tool-generateFeed")
          }) && (
            <div className="flex items-center justify-center min-h-[calc(100vh-320px)] sm:min-h-[calc(100vh-280px)] w-full py-8 sm:py-12">
              <div className="w-full max-w-md px-4 sm:px-6">
                <UnifiedLoading 
                  variant="section" 
                  message="Creating Your Feed Layout" 
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Enhanced Concept Generation Loading - Only show if NOT creating feed */}
          {isGeneratingConcepts && !isCreatingFeed && (
            <div className="flex justify-center mt-8 mb-4">
              <UnifiedLoading 
                variant="section" 
                message="Creating your concepts..." 
                className="max-w-md w-full"
              />
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
            className="fixed bottom-32 right-4 sm:right-6 md:right-8 z-30 h-10 px-4 rounded-full border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.18)] backdrop-blur-[20px] text-[#f0ede8] hover:bg-[rgba(175,170,162,0.28)] transition-all duration-300 flex items-center justify-center touch-manipulation active:scale-95"
            aria-label="Scroll to bottom"
          >
            <span className="text-[10px] uppercase tracking-[0.2em] font-medium">Latest</span>
          </button>
        )}
      </div>
  )
}
