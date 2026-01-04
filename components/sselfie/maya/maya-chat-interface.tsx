"use client"

import type React from "react"
import type { UIMessage } from "@ai-sdk/react"
import VideoCard from "../video-card"
import MayaConceptCards from "./maya-concept-cards"
import { PromptSuggestionCard as NewPromptSuggestionCard } from "../prompt-suggestion-card"
import type { PromptSuggestion } from "@/lib/maya/prompt-generator"
import { ArrowDown } from "lucide-react"
import FeedPreviewCard from "@/components/feed-planner/feed-preview-card"
import FeedCaptionCard from "@/components/feed-planner/feed-caption-card"
import FeedStrategyCard from "@/components/feed-planner/feed-strategy-card"

interface MayaChatInterfaceProps {
  // Messages
  messages: UIMessage[]
  filteredMessages: UIMessage[]
  setMessages: React.Dispatch<React.SetStateAction<UIMessage[]>>
  
  // Mode
  studioProMode: boolean
  
  // States
  isTyping: boolean
  isGeneratingConcepts: boolean
  isGeneratingStudioPro: boolean
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
  
  // Carousel Generation
  generateCarouselRef: React.MutableRefObject<((params: { topic: string; slideCount: number }) => Promise<void>) | null>
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
  studioProMode,
  isTyping,
  isGeneratingConcepts,
  isGeneratingStudioPro,
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
  generateCarouselRef,
}: MayaChatInterfaceProps) {
  
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
    const lines = cleanedText.split('\n')
    const elements: React.ReactNode[] = []
    let currentList: React.ReactNode[][] = []
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim()
      
      // Handle list items
      if (trimmedLine.match(/^[-*]\s+/)) {
        const listItem = trimmedLine.replace(/^[-*]\s+/, '')
        const processedItem: React.ReactNode[] = []
        const parts = listItem.split(/(\*\*[^*]+\*\*)/g)
        
        parts.forEach((part, partIdx) => {
          if (part.match(/^\*\*[^*]+\*\*$/)) {
            const boldText = part.replace(/\*\*/g, '')
            processedItem.push(
              <strong key={`bold-${partIdx}`} className="font-semibold text-stone-950">
                {boldText}
              </strong>
            )
          } else if (part) {
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
        
        // Handle regular paragraphs with bold text
        if (trimmedLine) {
          const parts = trimmedLine.split(/(\*\*[^*]+\*\*)/g)
          const processedLine: React.ReactNode[] = []
          
          parts.forEach((part, partIdx) => {
            if (part.match(/^\*\*[^*]+\*\*$/)) {
              const boldText = part.replace(/\*\*/g, '')
              processedLine.push(
                <strong key={`bold-${partIdx}`} className="font-semibold text-stone-950">
                  {boldText}
                </strong>
              )
            } else if (part) {
              processedLine.push(<span key={`text-${partIdx}`}>{part}</span>)
            }
          })
          
          if (processedLine.length === 0) {
            processedLine.push(<span key="text-0">{trimmedLine}</span>)
          }
          
          if (trimmedLine.length > 0) {
            elements.push(
              <p key={`para-${index}`} className="text-sm leading-relaxed text-stone-700 mb-2 last:mb-0">
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
    let cleanedText = text.replace(/\[GENERATE_PROMPTS[:\s]+[^\]]+\]/gi, "").trim()
    cleanedText = cleanedText.replace(/\[GENERATE_CONCEPTS\]\s*[^\n]*/gi, "").trim()
    // Remove feed creation trigger (with JSON content)
    // Use bracket counting to properly match nested JSON structures
    // This handles complex JSON with nested arrays/objects by finding the matching closing bracket
    let feedStrategyIndex = cleanedText.search(/\[CREATE_FEED_STRATEGY:/i)
    while (feedStrategyIndex >= 0) {
      // Find the matching closing bracket by counting brackets
      let bracketCount = 0
      let endIndex = -1
      for (let i = feedStrategyIndex; i < cleanedText.length; i++) {
        if (cleanedText[i] === '[') bracketCount++
        if (cleanedText[i] === ']') {
          bracketCount--
          if (bracketCount === 0) {
            endIndex = i
            break
          }
        }
      }
      if (endIndex >= 0) {
        cleanedText = cleanedText.substring(0, feedStrategyIndex) + cleanedText.substring(endIndex + 1)
      } else {
        // If no matching bracket found, just remove from [CREATE_FEED_STRATEGY: to end
        cleanedText = cleanedText.substring(0, feedStrategyIndex)
        break
      }
      feedStrategyIndex = cleanedText.search(/\[CREATE_FEED_STRATEGY:/i)
    }
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
      return <p className="text-sm leading-relaxed font-medium whitespace-pre-wrap">{removeEmojis(cleanedText)}</p>
    }

    // For Maya's messages (assistant), render with markdown support
    return (
      <div className="text-sm leading-relaxed text-stone-700">
        {renderMarkdownText(cleanedText)}
      </div>
    )
  }

  // Parse prompt suggestions from text (for Studio Pro mode)
  const parsePromptSuggestions = (text: string): Array<{ label: string; prompt: string; description?: string }> => {
    if (!text || !studioProMode) return []
    
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
    <div className="flex-1 min-h-0 px-3 sm:px-4">
      <div
        ref={messagesContainerRef}
        className="h-full overflow-y-auto pr-1 scroll-smooth"
        style={{
          // Header (~56-64px) + Tabs (~50px) + safe area = ~106-114px total
          paddingTop: 'calc(106px + max(0.625rem, env(safe-area-inset-top, 0px)))',
          // Input area (~140px) + Bottom nav (~70px) = ~210px total
          paddingBottom: "210px",
        }}
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {filteredMessages &&
          Array.isArray(filteredMessages) &&
          filteredMessages
            .filter((msg) => {
              return true
            })
            .map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] sm:max-w-[85%] ${msg.role === "user" ? "order-2" : "order-1"}`}>
                  {/* Handle messages with parts array (preferred format) */}
                  {msg.parts &&
                    Array.isArray(msg.parts) &&
                    (() => {
                      // Group parts by type
                      const textParts = msg.parts.filter((p) => p && p.type === "text")
                      const imageParts = msg.parts.filter((p) => p && (p as any).type === "image")
                      const otherParts = msg.parts.filter((p) => p && p.type !== "text" && (p as any).type !== "image")
                      
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
                                const text = (part as any)?.text || ''
                                
                                // Check for prompt suggestions in workbench mode
                                const parsedPromptSuggestions = parsePromptSuggestions(text)
                                
                                // Remove prompts from display text if they're in workbench (Studio Pro mode)
                                let displayText = text
                                
                                // Remove feed-related triggers from display text (always, regardless of mode)
                                // Use bracket counting to properly match nested JSON structures
                                let feedStrategyIndex = displayText.search(/\[CREATE_FEED_STRATEGY:/i)
                                while (feedStrategyIndex >= 0) {
                                  let bracketCount = 0
                                  let endIndex = -1
                                  for (let i = feedStrategyIndex; i < displayText.length; i++) {
                                    if (displayText[i] === '[') bracketCount++
                                    if (displayText[i] === ']') {
                                      bracketCount--
                                      if (bracketCount === 0) {
                                        endIndex = i
                                        break
                                      }
                                    }
                                  }
                                  if (endIndex >= 0) {
                                    displayText = displayText.substring(0, feedStrategyIndex) + displayText.substring(endIndex + 1)
                                  } else {
                                    displayText = displayText.substring(0, feedStrategyIndex)
                                    break
                                  }
                                  feedStrategyIndex = displayText.search(/\[CREATE_FEED_STRATEGY:/i)
                                }
                                displayText = displayText
                                  .replace(/\[GENERATE_CAPTIONS\]/gi, '')
                                  .replace(/\[GENERATE_STRATEGY\]/gi, '')
                                  .trim()
                                
                                // Remove prompts that are rendered as cards (Classic Mode)
                                if (!studioProMode && parsedPromptSuggestions.length > 0) {
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
                                    {renderMessageContent(displayText, msg.role === "user")}
                                    
                                    {/* Render prompt suggestion cards from API */}
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
                                    studioProMode={studioProMode}
                                    chatId={chatId}
                                    uploadedImages={uploadedImages}
                                    onCreditsUpdate={setCreditBalance}
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
                                setMessages((prevMessages: any[]) => {
                                  return prevMessages.map((message) => {
                                    // Find the message by ID
                                    if (message.id === currentMessageId && message.parts && Array.isArray(message.parts)) {
                                      // Find and update the tool-generateFeed part
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
                                        return p
                                      })
                                      
                                      console.log("[MayaChatInterface] 🔄 Message updated with feedId:", feedId, "triggering re-save")
                                      
                                      return {
                                        ...message,
                                        parts: updatedParts,
                                      }
                                    }
                                    return message
                                  })
                                })
                                
                                // CRITICAL: Trigger re-save by calling onFeedSaved callback
                                // This allows the parent component to update the database with [FEED_CARD:feedId] marker
                                if (onFeedSaved) {
                                  onFeedSaved(currentMessageId, feedId)
                                }
                              }
                              
                              return (
                                <FeedPreviewCard
                                  key={partIndex}
                                  feedId={output.feedId}
                                  feedTitle={output.title || 'Instagram Feed'}
                                  feedDescription={output.description || ''}
                                  posts={output.posts || []}
                                  needsRestore={output._needsRestore === true}
                                  strategy={output.strategy}
                                  isSaved={isSaved}
                                  onSave={handleSave}
                                  studioProMode={output.studioProMode ?? studioProMode}
                                  styleStrength={output.styleStrength ?? 0.8}
                                  promptAccuracy={output.promptAccuracy ?? 0.8}
                                  aspectRatio={output.aspectRatio ?? "1:1"}
                                  realismStrength={output.realismStrength ?? 0.8}
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

                            // Render carousel generation card
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
                            if ((part as any).type === "studio-pro-result") {
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
                  {/* Fallback: Handle messages with content field but no parts array */}
                  {(!msg.parts || !Array.isArray(msg.parts)) && typeof (msg as any).content === "string" && (msg as any).content.trim() && (
                    <div
                      className={`p-4 rounded-2xl transition-all duration-300 ${
                        msg.role === "user"
                          ? "bg-stone-950 text-white shadow-lg shadow-stone-950/20"
                          : "bg-white/50 backdrop-blur-xl border border-white/70 shadow-lg shadow-stone-950/5 text-stone-950"
                      }`}
                      role={msg.role === "assistant" ? "article" : undefined}
                    >
                      {renderMessageContent((msg as any).content, msg.role === "user")}
                    </div>
                  )}
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

          {/* Feed Creation Loading - Show first if active */}
          {isCreatingFeed && (
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
                      Creating Your Feed Layout
                    </p>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      Maya is designing your Instagram feed strategy
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Concept Generation Loading - Only show if NOT creating feed */}
          {isGeneratingConcepts && !isCreatingFeed && (
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
                      Generating Your Images
                    </p>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      Maya is creating your visuals using AI
                    </p>
                  </div>
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
            className="fixed bottom-32 right-4 sm:right-6 md:right-8 z-30 w-10 h-10 rounded-full bg-stone-950 text-white shadow-lg hover:bg-stone-800 transition-all duration-300 flex items-center justify-center touch-manipulation active:scale-95"
            aria-label="Scroll to bottom"
          >
            <ArrowDown size={18} strokeWidth={2} />
          </button>
        )}
      </div>
  )
}
