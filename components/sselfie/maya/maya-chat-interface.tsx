"use client"

import React from "react"
import type { UIMessage } from "@ai-sdk/react"
import VideoCard from "../video-card"
import MayaConceptCards from "./maya-concept-cards"
import { PromptSuggestionCard as NewPromptSuggestionCard } from "../prompt-suggestion-card"
import type { PromptSuggestion } from "@/lib/maya/prompt-generator"
import FeedPreviewCard from "@/components/feed-planner/feed-preview-card"
import FeedCaptionCard from "@/components/feed-planner/feed-caption-card"
import MayaCaptionCard from "./maya-caption-card"
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
import { MAYA_CHAT_SCROLL_TOP_OFFSET } from "@/lib/maya/layout-contract"
import type { MayaSurfaceTab } from "@/lib/maya/tab-scope"

type OfferBriefFormValues = Omit<MayaOfferBrief, "assetType">

function isFeatureEnabled(value?: string | null): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === "1" || normalized === "true"
}

type GenerationSource = "selfies" | "custom_model" | "base_model"

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
  uploadedImages: Array<{ url: string; type: "base" | "product"; label?: string; source?: "gallery" | "upload" }>
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
  userHasTrainedModel?: boolean
  linkedSelfieCount?: number
  onToolSelectGenerationSource?: (source: GenerationSource) => void
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
  activeTab?: MayaSurfaceTab
  onSwitchTab?: (tab: "photos" | "videos" | "training") => void
}

// ── Module-level constants ────────────────────────────────────────────────────

const IS_DEV_VIDEO_DEBUG = process.env.NODE_ENV !== "production"

const TOOL_RENDER_TYPES = new Set([
  "tool-generateConcepts",
  "tool-showCapabilities",
  "tool-showStudioHub",
  "tool-showGallery",
  "tool-saveToGallery",
  "tool-generateImage",
  "tool-showUploadZone",
  "tool-switchMayaTab",
  "tool-collectOfferBrief",
  "tool-editAsset",
  "tool-createAssetPreview",
  "tool-structuredAssetBlocked",
  "tool-mayaGapOffer",
  "tool-generateFeed",
  "tool-generateCaptions",
  "tool-generateStrategy",
  "tool-generateVideo",
])

// Context passed through to every tool renderer
// NOSONAR — All properties are forwarded to sub-renderer functions via `renderer(part, partIndex, ctx)`.
// SonarCloud incorrectly flags these as "unused" because the component body doesn't explicitly access
// them; they are consumed inside the renderer helpers that receive the full context object.
interface ToolCtx {
  msg: UIMessage
  proMode: boolean // NOSONAR
  chatId?: number // NOSONAR
  messages: UIMessage[] // NOSONAR
  setMessages: React.Dispatch<React.SetStateAction<UIMessage[]>> // NOSONAR
  uploadedImages: Array<{ url: string; type: "base" | "product"; label?: string; source?: "gallery" | "upload" }> // NOSONAR
  setCreditBalance: (balance: number) => void // NOSONAR
  onImageGenerated?: () => void // NOSONAR
  isAdmin: boolean // NOSONAR
  selectedGuideId: number | null // NOSONAR
  selectedGuideCategory: string | null // NOSONAR
  onSaveToGuide: (concept: any, imageUrl?: string) => void // NOSONAR
  userId?: string // NOSONAR
  user: any | null // NOSONAR
  generationSettings?: { // NOSONAR
    styleStrength: number
    promptAccuracy: number
    aspectRatio: string
    realismStrength: number
  }
  enhancedAuthenticity?: boolean // NOSONAR
  userHasTrainedModel: boolean // NOSONAR
  linkedSelfieCount: number // NOSONAR
  onToolSelectGenerationSource?: (source: GenerationSource) => void // NOSONAR
  onToolOpenUploadZone?: (category: "selfies" | "products" | "people" | "vibes") => void // NOSONAR
  onToolPromptSelect?: (prompt: string) => void // NOSONAR
  onToolSubmitOfferBrief?: (assetType: MayaOfferBriefAssetType, values: OfferBriefFormValues) => void // NOSONAR
  onToolStartVideoGeneration?: (input: { // NOSONAR
    messageId: string
    imageId: string
    imageUrl: string
    prompt?: string
    description?: string
    category?: string
  }) => void
  activeTab: MayaSurfaceTab // NOSONAR
  onSwitchTab?: (tab: "photos" | "videos" | "training") => void // NOSONAR
  onFeedSaved?: (messageId: string, feedId: number) => void // NOSONAR
  isLandingPagesUiEnabled: boolean // NOSONAR
}

type ToolRenderer = (part: any, partIndex: number, ctx: ToolCtx) => React.ReactNode

// ── Pure utility functions ────────────────────────────────────────────────────

function stripControlText(text: string): string {
  if (!text) return ""
  return stripFeedStrategyArtifacts(
    text
      .replaceAll(/\[GENERATE_PROMPTS[:\s]+[^\]]+\]/gi, "")
      .replaceAll(/\[GENERATE_CONCEPTS\]\s*[^\n]*/gi, "")
      .replaceAll(/\[SHOW_CAPABILITIES\]/gi, "")
      .replaceAll(/\[SHOW_STUDIO_HUB\]/gi, "")
      .replaceAll(/\[SHOW_GALLERY\]/gi, "")
      .replaceAll(/\[SAVE_TO_GALLERY(?:\s*:\s*[^\]]+)?\]/gi, "")
      .replaceAll(/\[GENERATE_IMAGE(?:\s*:\s*[^\]]+)?\]/gi, "")
      .replaceAll(/\[GENERATE_VIDEO(?:\s*:\s*[^\]]+)?\]/gi, "")
      .replaceAll(/\[VIDEO_CARD:[^\]]+\]/gi, "")
      .replaceAll(/\[SHOW_UPLOAD_ZONE(?:\s*:\s*[^\]]+)?\]/gi, "")
      .replaceAll(/\[SWITCH_MAYA_TAB(?:\s*:\s*[^\]]+)?\]/gi, "")
      .replaceAll(/\[COLLECT_OFFER_BRIEF(?:\s*:\s*[^\]]+)?\]/gi, "")
      .replaceAll(/\[SUBMIT_OFFER_BRIEF:\s*[^\]]+\]/gi, "")
      .replaceAll(/\[EDIT_ASSET(?:\s*:\s*[^\]]+)?\]/gi, "")
      .replaceAll(/\[CREATE_ASSET(?:\s*:\s*[^\]]+)?\]/gi, "")
      .replaceAll(/\[MAYA_GAP_OFFER(?:\s*:\s*[^\]]+)?\]/gi, "")
      .replaceAll(/\[STRUCTURED_ASSET_BLOCKED(?:\s*:\s*[^\]]+)?\]/gi, "")
      .replaceAll(/\[GENERATE_CAPTIONS\]\s*[^\n]*/gi, "")
      .replaceAll(/\[GENERATE_STRATEGY\]/gi, "")
      .replaceAll(/\[Inspiration Image: https?:\/\/[^\]]+\]/g, "")
      .replaceAll(/\n{3,}/g, "\n\n")
      .replaceAll(/\s{2,}/g, " ")
      .trim(),
  )
}

function scrollToVideosGallery(): void {
  if (typeof document === "undefined") return
  document.getElementById("maya-videos-gallery")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  })
}

function hasRenderableMessage(msg: UIMessage): boolean {
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

function renderVideoDebugPanel(debug: any): React.ReactNode {
  if (!IS_DEV_VIDEO_DEBUG || !debug || typeof debug !== "object") return null

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

function removeEmojis(text: string): string {
  if (!text) return text
  return text
    .replaceAll(/[\u{1F300}-\u{1F9FF}]/gu, "")
    .replaceAll(/[\u{2600}-\u{26FF}]/gu, "")
    .replaceAll(/[\u{2700}-\u{27BF}]/gu, "")
    .replaceAll(/[\u{1F600}-\u{1F64F}]/gu, "")
    .replaceAll(/[\u{1F900}-\u{1F9FF}]/gu, "")
    .replaceAll(/[\u{1FA00}-\u{1FA6F}]/gu, "")
    .replaceAll(/[\u{1FA70}-\u{1FAFF}]/gu, "")
    .replaceAll("\u200D", "")
    .replaceAll("\uFE0F", "")
    .replaceAll(/\s+/g, " ")
    .trim()
}

function renderMarkdownText(text: string): React.ReactNode {
  let cleanedText = text
  cleanedText = cleanedText.replaceAll("**", "")
  const lines = cleanedText.split("\n")
  const elements: React.ReactNode[] = []
  let currentList: Array<{ itemKey: string; nodes: React.ReactNode[] }> = []

  lines.forEach((line, index) => {
    const trimmedLine = line.trim()

    if (/^[-*]\s+/.exec(trimmedLine)) {
      const listItem = trimmedLine.replace(/^[-*]\s+/, "")
      const cleanedListItem = listItem.replaceAll("**", "")
      const processedItem: React.ReactNode[] = []
      processedItem.push(<span key="text-0">{cleanedListItem}</span>)
      if (processedItem.length === 0) {
        processedItem.push(<span key="text-0">{listItem}</span>)
      }
      currentList.push({ itemKey: `li-${cleanedListItem.slice(0, 20)}`, nodes: processedItem })
    } else {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-2 my-3 ml-6">
            {currentList.map(({ itemKey, nodes }) => (
              <li key={itemKey} className="text-[16px] leading-[1.8] font-light text-[#f0ede8]">
                {nodes}
              </li>
            ))}
          </ul>
        )
        currentList = []
      }

      if (trimmedLine) {
        const cleanedLine = trimmedLine.replaceAll("**", "")
        const processedLine: React.ReactNode[] = []
        processedLine.push(<span key="text-0">{cleanedLine}</span>)
        if (processedLine.length === 0) {
          processedLine.push(<span key="text-0">{trimmedLine}</span>)
        }
        if (trimmedLine.length > 0) {
          elements.push(
            <p key={`para-${elements.length}`} className="text-[16px] leading-[1.8] font-light text-[#f0ede8] mb-4 last:mb-0">
              {processedLine}
            </p>
          )
        }
      } else if (index < lines.length - 1) {
        elements.push(<div key={`spacer-${elements.length}`} className="h-2" />)
      }
    }
  })

  if (currentList.length > 0) {
    elements.push(
      <ul key="list-final" className="list-disc list-inside space-y-2 my-3 ml-6">
        {currentList.map(({ itemKey, nodes }) => (
          <li key={itemKey} className="text-[16px] leading-[1.8] font-light text-[#f0ede8]">
            {nodes}
          </li>
        ))}
      </ul>
    )
  }

  return elements.length > 0 ? <div className="space-y-1">{elements}</div> : null
}

function renderMessageContent(text: string, isUser: boolean): React.ReactNode {
  let cleanedText = stripFeedStrategyArtifacts(text)
  cleanedText = cleanedText.replaceAll(/\[GENERATE_PROMPTS[:\s]+[^\]]+\]/gi, "").trim()
  cleanedText = cleanedText.replaceAll(/\[GENERATE_CONCEPTS\]\s*[^\n]*/gi, "").trim()
  cleanedText = cleanedText.replaceAll(/\[SHOW_CAPABILITIES\]/gi, "").trim()
  cleanedText = cleanedText.replaceAll(/\[SHOW_GALLERY\]/gi, "").trim()
  cleanedText = cleanedText.replaceAll(/\[SAVE_TO_GALLERY(?:\s*:\s*[^\]]+)?\]/gi, "").trim()
  cleanedText = cleanedText.replaceAll(/\[GENERATE_IMAGE(?:\s*:\s*[^\]]+)?\]/gi, "").trim()
  cleanedText = cleanedText.replaceAll(/\[GENERATE_VIDEO(?:\s*:\s*[^\]]+)?\]/gi, "").trim()
  cleanedText = cleanedText.replaceAll(/\[SHOW_UPLOAD_ZONE(?:\s*:\s*[^\]]+)?\]/gi, "").trim()
  cleanedText = cleanedText.replaceAll(/\[SWITCH_MAYA_TAB(?:\s*:\s*[^\]]+)?\]/gi, "").trim()
  cleanedText = cleanedText.replaceAll(/\[COLLECT_OFFER_BRIEF(?:\s*:\s*[^\]]+)?\]/gi, "").trim()
  cleanedText = cleanedText.replaceAll(/\[SUBMIT_OFFER_BRIEF:\s*[^\]]+\]/gi, "").trim()
  cleanedText = cleanedText.replaceAll(/\[EDIT_ASSET(?:\s*:\s*[^\]]+)?\]/gi, "").trim()
  cleanedText = cleanedText
    .replaceAll(/\[CREATE_ASSET(?:\s*:\s*[^\]]+)?\]/gi, "")
    .replaceAll(/\[MAYA_GAP_OFFER(?:\s*:\s*[^\]]+)?\]/gi, "")
    .trim()
  cleanedText = cleanedText.replaceAll(/Aesthetic Choice:[\s\S]*?(?=\n\n|\nOverall|$)/gi, "").trim()
  cleanedText = cleanedText.replaceAll(/Overall Vibe:[\s\S]*?(?=\n\n|\nGrid|$)/gi, "").trim()
  cleanedText = cleanedText.replaceAll(/FEED STRATEGY:\s*"[^"]*"\s*/gi, "").trim()
  cleanedText = cleanedText.replaceAll(/Strategic Rationale:[\s\S]*?(?=\n\n|\nGrid|$)/gi, "").trim()
  cleanedText = cleanedText.replaceAll(/Grid Layout:[\s\S]*?(?=\n\n|\nPosts:|$)/gi, "").trim()
  cleanedText = cleanedText.replaceAll(/Posts:[\s\S]*?(?=\n\n|$)/gi, "").trim()
  cleanedText = cleanedText.replaceAll(/"position":\s*\d+[\s\S]*$/g, "").trim()
  cleanedText = cleanedText.replaceAll(/"postType":\s*"[^"]*"[\s\S]*$/g, "").trim()
  cleanedText = cleanedText.trim()
  cleanedText = cleanedText.replaceAll(/\[GENERATE_CAPTIONS\]\s*[^\n]*/gi, "").trim()
  cleanedText = cleanedText.replaceAll(/\[GENERATE_STRATEGY\]/gi, "").trim()

  const inspirationImageMatch = /\[Inspiration Image: (https?:\/\/[^\]]+)\]/.exec(cleanedText)

  if (inspirationImageMatch) {
    const imageUrl = inspirationImageMatch[1]
    const textWithoutImage = cleanedText.replaceAll(/\[Inspiration Image: https?:\/\/[^\]]+\]/g, "").trim()
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

  if (isUser) {
    return <p className="text-[16px] leading-[1.8] font-light whitespace-pre-wrap text-[#f0ede8]">{removeEmojis(cleanedText)}</p>
  }

  return (
    <div className="text-[16px] leading-[1.8] font-light text-[#f0ede8]">
      {renderMarkdownText(cleanedText)}
    </div>
  )
}

function parsePromptSuggestions(
  text: string,
  proMode: boolean,
): Array<{ label: string; prompt: string; description?: string }> {
  if (!text || !proMode) return []

  const suggestions: Array<{ label: string; prompt: string; description?: string }> = []

  const slideMatches = text.matchAll(/(?:\*\*)?Slide\s+(\d+)\s*(?:of\s+(\d+))?\s*[-–]\s*([^:\n]+):/gi)
  const slideArray = Array.from(slideMatches)

  if (slideArray.length > 0) {
    slideArray.forEach((slideMatch, idx) => {
      const slideNum = slideMatch[1]
      const totalSlides = slideMatch[2] || ""
      const label = slideMatch[3]?.trim() || `Slide ${slideNum}`
      const matchIndex = slideMatch.index || 0

      const endIndex = slideArray[idx + 1] ? (slideArray[idx + 1].index || text.length) : text.length

      let prompt = text.substring(matchIndex + slideMatch[0].length, endIndex).trim()

      prompt = prompt
        .replace(/\n\n(Copy|Then|This is going|Once you|Here are all|Copy slide|Perfect! For carousels).*$/is, "")
        .replaceAll(/^\s+|\s+$/g, "")
        .trim()

      const hasTemplateStructure =
        (prompt.includes("EXACTLY identical") || prompt.includes("facial features EXACTLY")) &&
        (prompt.includes("Composition:") || prompt.includes("Composition")) &&
        (prompt.includes("Style:") || prompt.includes("Style")) &&
        (prompt.includes("Lighting:") || prompt.includes("Lighting")) &&
        (prompt.includes("Color Palette:") || prompt.includes("Color Palette")) &&
        (prompt.includes("Technical Details:") || prompt.includes("Technical Details")) &&
        (prompt.includes("Final Use:") || prompt.includes("Final Use")) &&
        prompt.length > 500

      if (prompt && hasTemplateStructure) {
        suggestions.push({
          label: `Slide ${slideNum}${totalSlides ? " of " + totalSlides : ""} - ${label}`,
          prompt,
          description: label,
        })
      }
    })
  }

  const optionPattern =
    /(?:\*\*)?Option\s+(\d+)[\s-]+([^:]+):\s*(?:"([^"]+)"|`([^`]+)`|```[\s\S]*?```|([^"`\n]+(?:\n[^"`\n]+)*?)(?=\n\n|\nOption|\n\*\*Option|$))/gi // NOSONAR — intentionally complex; simplifying would break prompt extraction
  let match
  while ((match = optionPattern.exec(text)) !== null) {
    const optionNum = match[1]
    const label = match[2]?.trim() || `Option ${optionNum}`
    const prompt = match[3] || match[4] || match[5] || ""
    if (prompt && prompt.trim().length > 20) {
      suggestions.push({ label, prompt: prompt.trim() })
    }
  }

  return suggestions
}

function removePromptsFromText(text: string, suggestions: Array<{ prompt: string }>): string {
  if (suggestions.length === 0) return text

  let cleanedText = text

  suggestions.forEach((suggestion) => {
    const prompt = suggestion.prompt
    const escapedPrompt = prompt.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)

    cleanedText = cleanedText.replaceAll(new RegExp(`"${escapedPrompt}"`, "g"), "")
    cleanedText = cleanedText.replaceAll(new RegExp(`'${escapedPrompt}'`, "g"), "")
    cleanedText = cleanedText.replaceAll(new RegExp("```[\\s\\S]*?" + escapedPrompt + "[\\s\\S]*?```", "g"), "")
    cleanedText = cleanedText.replaceAll(new RegExp("`" + escapedPrompt + "`", "g"), "")

    const lines = cleanedText.split("\n")
    cleanedText = lines
      .filter((line) => {
        const trimmedLine = line.trim()
        if (/^(Slide|Option|Prompt|\*\*Slide|\*\*Option)/i.exec(trimmedLine)) return true
        if (/^[-*]\s+/.exec(trimmedLine) || trimmedLine.length < 50) return true
        const lineLower = trimmedLine.toLowerCase()
        const promptLower = prompt.toLowerCase()
        if (promptLower.length > 30) {
          return !lineLower.includes(promptLower.substring(0, 30))
        }
        return !lineLower.includes(promptLower)
      })
      .join("\n")
  })

  cleanedText = cleanedText.replaceAll(/\n{3,}/g, "\n\n").trim()
  return cleanedText
}

function computeDisplayText(
  rawText: string,
  proMode: boolean,
  parsedSuggestions: Array<{ label: string; prompt: string }>,
): string {
  let t = stripFeedStrategyArtifacts(rawText)
  t = t.replaceAll(/Aesthetic Choice:[\s\S]*?(?=\n\n|\nOverall|$)/gi, "").trim()
  t = t.replaceAll(/Overall Vibe:[\s\S]*?(?=\n\n|\nGrid|$)/gi, "").trim()
  t = t.replaceAll(/FEED STRATEGY:\s*"[^"]*"\s*/gi, "").trim()
  t = t.replaceAll(/Strategic Rationale:[\s\S]*?(?=\n\n|\nGrid|$)/gi, "").trim()
  t = t.replaceAll(/Grid Layout:[\s\S]*?(?=\n\n|\nPosts:|$)/gi, "").trim()
  t = t.replaceAll(/Posts:\s*```json[\s\S]*?```/gi, "").trim()
  t = t.replaceAll(/Posts:\s*\{[\s\S]*?\}/g, "").trim()
  t = t.replaceAll(/"position":\s*\d+[\s\S]*$/g, "").trim()
  t = t.replaceAll(/"postType":\s*"[^"]*"[\s\S]*$/g, "").trim()
  t = t.replaceAll(/\[GENERATE_CAPTIONS\]\s*[^\n]*/gi, "").trim()
  t = t.replaceAll(/\[GENERATE_STRATEGY\]/gi, "").trim()
  t = t.replaceAll(/\n{3,}/g, "\n\n").trim()

  if (!proMode && parsedSuggestions.length > 0) {
    parsedSuggestions.forEach((suggestion) => {
      if (suggestion.label.includes("Slide")) {
        const slideNumMatch = /Slide\s+(\d+)/i.exec(suggestion.label)
        if (slideNumMatch) {
          const slideNum = slideNumMatch[1]
          const slidePattern = new RegExp(
            String.raw`Slide\s+${slideNum}\s*(?:of\s+\d+)?\s*[-–]\s*[^:]+:.*?(?=\nSlide\s+\d+\s*(?:of\s+\d+)?\s*[-–]|\nCopy slide|$)`,
            "gis",
          )
          t = t.replaceAll(slidePattern, "")
        }
      }
    })

    const otherPrompts = parsedSuggestions.filter((s) => !s.label.includes("Slide"))
    if (otherPrompts.length > 0) {
      t = removePromptsFromText(t, otherPrompts)
    }

    t = t
      .replaceAll(/\[GENERATE_PROMPTS[:\s]+[^\]]+\]/gi, "")
      .replaceAll(/\[GENERATE_PROMPTS\]/gi, "")
      .replaceAll(/\[SHOW_IMAGE_UPLOAD_MODULE[:\s]+[^\]]+\]/gi, "")
      .replaceAll(/\[SHOW_IMAGE_UPLOAD_MODULE\][^\n]*/gi, "")
      .replaceAll(/\[SHOW_IMAGE_UPLOAD_MODULE\]/gi, "")
      .replaceAll(/Keep the .*?facial features EXACTLY identical.*?This is critical\./gis, "")
      .replaceAll(/Composition:.*?Final Use:.*?Slide \d+ of \d+/gis, "")
      .replaceAll(/\n{3,}/g, "\n\n")
      .replaceAll(/\s{2,}/g, " ")
      .trim()
  }

  return t
}

// ── Tool renderer functions ───────────────────────────────────────────────────

function applyConceptPromptUpdate(
  prevMessages: any[],
  messageId: string,
  updatedConceptId: string,
  newFullPrompt: string,
  concepts: any[],
): any[] {
  return prevMessages.map((message) => {
    if (message.id === messageId && message.parts) {
      return {
        ...message,
        parts: message.parts.map((p: any) => {
          if (p.type === "tool-generateConcepts" && p.output?.concepts) {
            return {
              ...p,
              output: {
                ...p.output,
                concepts: p.output.concepts.map((c: any) => {
                  const cId =
                    c.id || `concept-${messageId}-${concepts.indexOf(c)}`
                  return cId === updatedConceptId ? { ...c, fullPrompt: newFullPrompt } : c
                }),
              },
            }
          }
          return p
        }),
      }
    }
    return message
  })
}

function renderGenerateConceptsTool(part: any, partIndex: number, ctx: ToolCtx): React.ReactNode {
  const output = part.output
  if (output?.state !== "ready" || !Array.isArray(output?.concepts)) return null
  const { concepts } = output
  return (
    <MayaConceptCards
      key={partIndex}
      messageId={ctx.msg.id}
      concepts={concepts}
      studioProMode={ctx.proMode}
      chatId={ctx.chatId}
      uploadedImages={ctx.uploadedImages}
      onCreditsUpdate={ctx.setCreditBalance}
      onTrainingRequired={() => ctx.onToolSelectGenerationSource?.("custom_model")}
      generationSettings={ctx.generationSettings}
      enhancedAuthenticity={ctx.enhancedAuthenticity}
      messages={ctx.messages}
      onPromptUpdate={(messageId, updatedConceptId, newFullPrompt) => {
        ctx.setMessages((prevMessages) =>
          applyConceptPromptUpdate(prevMessages, messageId, updatedConceptId, newFullPrompt, concepts),
        )
      }}
      onImageGenerated={ctx.onImageGenerated}
      isAdmin={ctx.isAdmin}
      selectedGuideId={ctx.selectedGuideId}
      selectedGuideCategory={ctx.selectedGuideCategory}
      onSaveToGuide={ctx.onSaveToGuide}
      userId={ctx.userId}
      user={ctx.user}
      userHasTrainedModel={ctx.userHasTrainedModel}
    />
  )
}

function renderShowCapabilitiesTool(part: any, partIndex: number, ctx: ToolCtx): React.ReactNode {
  const capabilities = [
    {
      title: "Create Photos",
      prompt: "I want to create a photo for my new offer",
      description: "Run Classic, Pro, or trained-model generation in this chat.",
    },
    {
      title: "Create Concept Cards",
      prompt: "Generate concept cards for my next content shoot",
      description: "Draft post, reel, and carousel concepts right here in the chat.",
    },
    {
      title: "Animate to Video",
      prompt: "Animate my latest image into a short reel",
      description: "Pick an image and I'll create a video from it right here.",
    },
    {
      title: "Create Content Calendar",
      prompt: "Create a content calendar for this month",
      description: "Draft your monthly calendar and keep editing right here.",
    },
    {
      title: "Upload Product Assets",
      prompt: "Open upload zone for products",
      description: "Add selfies, products, people, and vibe references.",
    },
    {
      title: "Open My Studio Hub",
      prompt: "Show my studio hub and everything you've created",
      description: "See your latest feeds, photos, and videos here.",
    },
  ]

  return (
    <div key={partIndex} className="mt-3 rounded-xl border border-[rgba(195,190,182,0.20)] bg-[rgba(175,170,162,0.10)] p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-[#8a8780]">Maya Capabilities</div>
      <p className="mt-2 text-sm text-[#d5d5d5]">
        Pick a workflow and I&apos;ll run it here in chat.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {capabilities.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={() => ctx.onToolPromptSelect?.(item.prompt)}
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

function renderShowStudioHubTool(part: any, partIndex: number, ctx: ToolCtx): React.ReactNode {
  const output = part.output || {}
  const state = output.state || "ready"
  const stats = output.stats || { feedCount: 0, pageCount: 0, photoCount: 0, videoCount: 0 }
  const feeds = Array.isArray(output.feeds) ? output.feeds : []
  const recentPhotos = Array.isArray(output.recentPhotos) ? output.recentPhotos : []
  const recentVideos = Array.isArray(output.recentVideos) ? output.recentVideos : []

  if (state === "loading") {
    return (
      <MayaInlineCard
        key={partIndex}
        eyebrow="Studio Hub"
        title="My Studio"
        subtitle="Loading your drafts and recent work."
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
            <div className="text-[10px] uppercase tracking-[0.16em] text-(--color-smoke)">{item.label}</div>
            <div className="mt-1 text-[22px] text-(--color-porcelain)">{item.value}</div>
          </div>
        ))}
      </div>

      {(feeds.length > 0 || recentPhotos.length > 0 || recentVideos.length > 0) ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {feeds.slice(0, 2).map((feed: any) => (
            <div key={`hub-feed-${feed.id}`} className="stone-inset-panel rounded-[22px] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-(--color-smoke)">Feed</div>
                  <div className="mt-1 text-sm text-(--color-porcelain)">{feed.title || `Feed ${feed.id}`}</div>
                </div>
                <MayaInlineAction href={feed.openUrl || "/studio?tab=feed-planner#feed-planner"}>
                  Open
                </MayaInlineAction>
              </div>
            </div>
          ))}
          {recentPhotos.slice(0, 1).map((photo: any) => (
            <div key={`hub-photo-${photo.id}`} className="stone-inset-panel rounded-[22px] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-(--color-smoke)">Recent Photo</div>
                  <div className="mt-1 text-sm text-(--color-porcelain)">{photo.prompt || "Recent photo"}</div>
                </div>
                <MayaInlineAction href={photo.openUrl || "/studio?tab=gallery#gallery"}>
                  Open
                </MayaInlineAction>
              </div>
            </div>
          ))}
          {recentVideos.slice(0, 1).map((video: any) => (
            <div key={`hub-video-${video.id}`} className="stone-inset-panel rounded-[22px] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-(--color-smoke)">Latest Video</div>
                  <div className="mt-1 text-sm text-(--color-porcelain)">Motion draft ready</div>
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

function renderShowGalleryTool(part: any, partIndex: number, ctx: ToolCtx): React.ReactNode {
  const output = part.output || {}
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
      subtitle="Your latest photos stay here so I can use them in new drafts."
      aside={<MayaInlinePill>{Number(output.total || images.length)} images</MayaInlinePill>}
      actions={<MayaInlineAction href="/studio?tab=gallery#gallery">Open Gallery</MayaInlineAction>}
    >
      {images.length > 0 ? (
        <div className="grid grid-cols-3 gap-2.5">
          {images.slice(0, 6).map((image: any, index: number) => (
            <div key={image.id || index} className="stone-inset-panel overflow-hidden rounded-[20px]">
              <div className="aspect-square overflow-hidden">
                <img
                  src={image.imageUrl || image.image_url}
                  alt="Gallery"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="stone-inset-panel rounded-[22px] px-4 py-4 text-sm text-(--text-accent)">
          No images yet. Generate your first photo and I&apos;ll keep it here.
        </div>
      )}
    </MayaInlineCard>
  )
}

function renderSaveToGalleryTool(part: any, partIndex: number, ctx: ToolCtx): React.ReactNode {
  const output = part.output || {}
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

function renderGenerateImageTool(part: any, partIndex: number, ctx: ToolCtx): React.ReactNode {
  const output = part.output || {}
  const selectedSource = output.source || "choose_source"
  const hasLinkedSelfies = ctx.linkedSelfieCount > 0
  const selfiePlural = ctx.linkedSelfieCount === 1 ? "" : "s"
  const selfieDescription = hasLinkedSelfies
    ? `Use your ${ctx.linkedSelfieCount} linked selfie${selfiePlural} right now.`
    : "No linked selfies yet. I'll open upload so we can add them first."
  const modelDescription = ctx.userHasTrainedModel
    ? "Your trained model is ready. I'll keep you in Photos and generate from it."
    : "No trained model yet. I'll take you to Train first."
  const sourceSubtitle =
    hasLinkedSelfies || ctx.userHasTrainedModel
      ? "Pick your lane and I'll handle the rest."
      : "Pick a source and I'll guide you to the right setup first."
  const options: Array<{
    id: "selfies" | "custom_model" | "base_model"
    label: string
    description: string
  }> = [
    { id: "selfies", label: "Selfie", description: selfieDescription },
    {
      id: "custom_model",
      label: ctx.userHasTrainedModel ? "My Model" : "Train My Model",
      description: modelDescription,
    },
    { id: "base_model", label: "Base Model", description: "Create with Maya's default photo model." },
  ]

  const selectedOption = options.find((option) => option.id === selectedSource)

  return (
    <MayaInlineCard
      key={partIndex}
      eyebrow="Create Photo"
      title="Choose Your Source"
      subtitle={sourceSubtitle}
    >
      {selectedSource !== "choose_source" && selectedOption ? (
        <div className="stone-inset-panel rounded-[20px] border border-[rgba(240,237,232,0.16)] bg-[rgba(240,237,232,0.12)] px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-[#f0ede8]">
            {selectedOption.label} selected
          </div>
          <div className="mt-1 text-xs text-[#d5d5d5]">{selectedOption.description}</div>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-3">
          {options.map((option) => {
            const isSelected = selectedSource === option.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => ctx.onToolSelectGenerationSource?.(option.id)}
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
      )}
    </MayaInlineCard>
  )
}

function renderShowUploadZoneTool(part: any, partIndex: number, ctx: ToolCtx): React.ReactNode {
  const output = part.output || {}
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
      subtitle={`Ready for ${categoryLabel.toLowerCase()}. Add your images here.`}
      actions={
        <MayaInlineAction onClick={() => ctx.onToolOpenUploadZone?.(category)} variant="primary">
          Open Upload
        </MayaInlineAction>
      }
    />
  )
}

function renderSwitchMayaTabTool(part: any, partIndex: number, ctx: ToolCtx): React.ReactNode {
  const output = part.output || {}
  const targetTab =
    output.targetTab === "videos" || output.targetTab === "training"
      ? output.targetTab
      : "photos"
  let ctaLabelFallback = "Go to Photos"
  if (targetTab === "videos") ctaLabelFallback = "Go to Videos"
  else if (targetTab === "training") ctaLabelFallback = "Go to Train"
  const ctaLabel =
    typeof output.ctaLabel === "string" && output.ctaLabel.trim().length > 0
      ? output.ctaLabel
      : ctaLabelFallback

  return (
    <MayaInlineCard
      key={partIndex}
      eyebrow="Next Step"
      title={output.title || "Let's move this to the right chat"}
      subtitle={
        output.subtitle ||
        "I'll keep this clean for you. Open the right Maya tab and I'll continue there."
      }
      actions={
        <MayaInlineAction onClick={() => ctx.onSwitchTab?.(targetTab)} variant="primary">
          {ctaLabel}
        </MayaInlineAction>
      }
    />
  )
}

function renderCollectOfferBriefTool(part: any, partIndex: number, ctx: ToolCtx): React.ReactNode {
  const output = part.output || {}
  const assetType = output.assetType || "page"
  if (assetType === "page" || assetType === "calendar" || assetType === "pdf") return null

  return (
    <div key={partIndex}>
      <MayaOfferBriefForm
        assetType={assetType === "calendar" ? "calendar" : "page"}
        initialValues={output.prefill || {}}
        missingFields={Array.isArray(output.missingFields) ? output.missingFields : []}
        onSubmit={(type, values) => {
          ctx.onToolSubmitOfferBrief?.(type, values)
        }}
      />
    </div>
  )
}

function renderEditAssetTool(part: any, partIndex: number, ctx: ToolCtx): React.ReactNode {
  const output = part.output || {}
  const assetType = output.assetType || "page"
  if (assetType === "page" || assetType === "calendar" || assetType === "pdf") return null

  let assetLabelFallback = "Landing Page"
  if (assetType === "calendar") assetLabelFallback = "Content Calendar"
  else if (assetType === "pdf") assetLabelFallback = "Workbook"
  const assetLabel =
    typeof output.assetLabel === "string" && output.assetLabel.trim().length > 0
      ? output.assetLabel
      : assetLabelFallback
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
      <div className="stone-inset-panel rounded-[22px] px-4 py-4 text-[11px] leading-relaxed text-(--text-accent)">
        Next step: describe the exact change you want, whether it is the headline, CTA, section copy, layout, or tile
        content. Maya keeps editing this same asset in place.
      </div>
    </MayaInlineCard>
  )
}

function renderCreateAssetPreviewTool(part: any, partIndex: number, ctx: ToolCtx): React.ReactNode {
  const output = part.output || {}
  const assetType = output.assetType || "page"
  if (!ctx.isLandingPagesUiEnabled || assetType === "page" || assetType === "calendar" || assetType === "pdf") {
    return null
  }

  let assetLabelFallback2 = "Landing Page"
  if (assetType === "calendar") assetLabelFallback2 = "Content Calendar"
  else if (assetType === "pdf") assetLabelFallback2 = "Workbook"
  const assetLabel =
    typeof output.assetLabel === "string" && output.assetLabel.trim().length > 0
      ? output.assetLabel
      : assetLabelFallback2
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

function renderMayaGapOfferTool(part: any, partIndex: number, ctx: ToolCtx): React.ReactNode {
  const output = part.output || {}
  const dayLabels = Array.isArray(output.dayLabels) ? output.dayLabels : []
  const count = dayLabels.length
  if (count === 0) return null

  const prompt =
    count === 1
      ? `Create a photo for ${dayLabels[0]} to fill my calendar.`
      : `Create photos for ${dayLabels.join(" and ")} to fill my calendar.`

  return (
    <MayaInlineCard
      key={partIndex}
      eyebrow="Calendar"
      title={count === 1 ? "1 day without a photo" : `${count} days without a photo`}
      subtitle="I can create them for you."
      actions={
        <MayaInlineAction onClick={() => ctx.onToolPromptSelect?.(prompt)} variant="primary">
          Create them
        </MayaInlineAction>
      }
    />
  )
}

function renderStructuredAssetBlockedTool(part: any, partIndex: number, ctx: ToolCtx): React.ReactNode {
  const output = part.output || {}
  const assetType = output.assetType || "calendar"
  if (assetType === "pdf" || assetType === "page" || assetType === "calendar") return null

  const recoveryHint =
    typeof output.recoveryHint === "string" && output.recoveryHint.trim().length > 0
      ? output.recoveryHint
      : "Tell me exactly what to build and I'll run it in your flow."
  const missingFields = Array.isArray(output.missingFields) ? output.missingFields : []
  const missingLabel = missingFields.includes("action_verb") ? "what to create" : "one detail"
  const quickRetryPrompt = "Create a content calendar for my current offer this week."

  return (
    <MayaInlineCard
      key={partIndex}
      eyebrow="Almost there"
      title={`Ready to build your ${assetType}`}
      subtitle={`I only need ${missingLabel} and I can run it.`}
      actions={
        <>
          <MayaInlineAction onClick={() => ctx.onToolPromptSelect?.(quickRetryPrompt)} variant="primary">
            Retry
          </MayaInlineAction>
          <MayaInlineAction
            onClick={() => ctx.onToolPromptSelect?.("I need one quick form to fill the missing details.")}
          >
            Fill in the details
          </MayaInlineAction>
        </>
      }
    >
      <div className="stone-inset-panel rounded-[22px] px-4 py-4 text-[11px] leading-relaxed text-(--text-accent)">
        {recoveryHint}
      </div>
    </MayaInlineCard>
  )
}

function applyFeedSaveToMessages(prevMessages: any[], currentMessageId: string, feedId: number): any[] {
  return prevMessages.map((message) => {
    if (message.id === currentMessageId && message.parts && Array.isArray(message.parts)) {
      const updatedParts = message.parts.map((p: any) => {
        if (p.type === "tool-generateFeed") {
          const { strategy: _s, ...outputWithoutStrategy } = p.output || {}
          return { ...p, output: { ...outputWithoutStrategy, feedId, isSaved: true } }
        }
        return { ...p }
      })
      console.log("[MayaChatInterface] 🔄 Message updated with feedId:", feedId, "triggering re-save")
      return { ...message, parts: updatedParts }
    }
    return { ...message }
  })
}

function applyFeedPromptUpdate(
  prevMessages: any[],
  messageId: string,
  postId: string,
  newPrompt: string,
  chatId: number | undefined,
): any[] {
  return prevMessages.map((message) => {
    if (message.id === messageId && message.parts) {
      const updatedParts = message.parts.map((p: any) => {
        if (p.type === "tool-generateFeed" && p.output) {
          const postToUpdate = (p.output.posts || []).find((post: any) => post.id === postId)
          const postPosition = postToUpdate?.position
          const updatedPosts = (p.output.posts || []).map((post: any) =>
            post.id === postId ? { ...post, prompt: newPrompt, visualDirection: newPrompt } : post,
          )
          let updatedStrategy = p.output.strategy
          if (updatedStrategy?.posts && postPosition) {
            updatedStrategy = {
              ...updatedStrategy,
              posts: updatedStrategy.posts.map((post: any) =>
                post.position === postPosition
                  ? { ...post, prompt: newPrompt, visualDirection: newPrompt }
                  : post,
              ),
            }
          }
          const updatedOutput = { ...p.output, posts: updatedPosts, strategy: updatedStrategy }
          if (chatId && messageId) {
            fetch("/api/maya/update-message", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                messageId,
                content: message.content || "",
                feedCards: [updatedOutput],
                append: false,
              }),
            }).catch((error) => {
              console.error("[MayaChatInterface] ❌ Error saving edited prompt:", error)
            })
          }
          return { ...p, output: updatedOutput }
        }
        return p
      })
      return { ...message, parts: updatedParts }
    }
    return message
  })
}

function renderGenerateFeedTool(part: any, partIndex: number, ctx: ToolCtx): React.ReactNode {
  console.log("[FEED-CARD] 🎨 RENDERING FEED CARD IN CHAT")
  const toolPart = part
  const output = toolPart.output

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
  const currentMessageId = ctx.msg.id

  const handleSave = (feedId: number) => {
    console.log("[MayaChatInterface] Feed saved, updating message:", feedId)
    ctx.setMessages((prevMessages: any[]) => applyFeedSaveToMessages(prevMessages, currentMessageId, feedId))
    if (ctx.onFeedSaved) {
      ctx.onFeedSaved(currentMessageId, feedId)
    }
  }

  const shouldRestore = output.feedId ? true : output._needsRestore === true

  return (
    <FeedPreviewCard
      key={partIndex}
      feedId={output.feedId}
      feedTitle={output.title || "Instagram Feed"}
      feedDescription={output.description || ""}
      posts={output.posts || []}
      needsRestore={shouldRestore}
      strategy={output.strategy}
      isSaved={isSaved}
      onSave={handleSave}
      proMode={output.proMode ?? ctx.proMode}
      styleStrength={output.styleStrength ?? 0.8}
      promptAccuracy={output.promptAccuracy ?? 0.8}
      aspectRatio={output.aspectRatio ?? "1:1"}
      realismStrength={output.realismStrength ?? 0.8}
      messageId={ctx.msg.id}
      onPromptUpdate={(messageId, postId, newPrompt) => {
        ctx.setMessages((prevMessages) =>
          applyFeedPromptUpdate(prevMessages, messageId, postId, newPrompt, ctx.chatId),
        )
      }}
      onViewFullFeed={() => {
        // Navigate will be handled by FeedPreviewCard component
      }}
    />
  )
}

function renderGenerateCaptionsTool(part: any, partIndex: number, ctx: ToolCtx): React.ReactNode {
  const output = part.output

  // ── Standalone Maya caption card (generated inline in chat) ──────────────
  if (output?.state === "loading") {
    return <MayaCaptionCard key={partIndex} loading />
  }
  if (output?.state === "ready" && output?.caption) {
    return (
      <MayaCaptionCard
        key={partIndex}
        caption={output.caption}
        hashtags={output.hashtags ?? []}
      />
    )
  }

  // ── Feed Planner captions (batch, requires feedId) ───────────────────────
  if (!output?.feedId || !Array.isArray(output?.captions)) return null

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
          onAddToFeed={async () => {}}
          onRegenerate={async () => {}}
        />
      ))}
    </div>
  )
}

function renderGenerateStrategyTool(part: any, partIndex: number, ctx: ToolCtx): React.ReactNode {
  const output = part.output
  if (!output?.feedId || !output?.strategy) return null

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

function renderVideoImageButton(image: any, imageIndex: number, ctx: ToolCtx): React.ReactNode {
  const imageId = String(image.id || image.imageId || imageIndex)
  const imageUrl = image.image_url || image.imageUrl || ""
  const source = String(image.source || "").toLowerCase()
  let sourceLabel = "Gallery"
  if (source === "brand_assets") sourceLabel = "Uploaded"
  else if (source === "generated_images") sourceLabel = "Generated"
  if (!imageUrl) return null
  return (
    <button
      key={`${imageId}-${imageIndex}`}
      type="button"
      onClick={() =>
        ctx.onToolStartVideoGeneration?.({
          messageId: ctx.msg.id,
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
      <div className="px-2 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[#f0ede8]">Animate</div>
      <div className="pb-2 text-[9px] uppercase tracking-[0.12em] text-[#b8b8b8]">{sourceLabel}</div>
    </button>
  )
}

function renderVideoNoImages(ctx: ToolCtx): React.ReactNode {
  return (
    <div className="mt-3 rounded-lg border border-[rgba(195,190,182,0.20)] bg-[rgba(28,27,25,0.30)] p-3">
      <p className="text-xs text-[#d7d7d7]">
        You don&apos;t have a photo here yet. Make one first, then I can animate it.
      </p>
      <button
        type="button"
        onClick={() => {
          if (ctx.activeTab === "videos" && ctx.onSwitchTab) {
            ctx.onSwitchTab("photos")
            return
          }
          ctx.onToolPromptSelect?.("Create a photo for my brand")
        }}
        className="mt-2 rounded-lg border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.12)] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[#f0ede8] hover:bg-[rgba(175,170,162,0.22)]"
      >
        {ctx.activeTab === "videos" ? "Go to Photos" : "Create Photo First"}
      </button>
      <button
        type="button"
        onClick={() => ctx.onToolOpenUploadZone?.("selfies")}
        className="mt-2 ml-2 rounded-lg border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.12)] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[#f0ede8] hover:bg-[rgba(175,170,162,0.22)]"
      >
        Upload Reference
      </button>
    </div>
  )
}

function renderVideoStateChooseImage(output: any, partIndex: number, ctx: ToolCtx): React.ReactNode {
  const images = Array.isArray(output.images) ? output.images : []
  const photoPlural = images.length === 1 ? "" : "s"
  if (ctx.activeTab === "videos") {
    return (
      <MayaInlineCard
        key={partIndex}
        eyebrow="Videos"
        title="Choose a photo to animate"
        subtitle={
          images.length > 0
            ? `${images.length} photo${photoPlural} ready. Scroll down to pick one.`
            : "Your gallery is right below — pick one to start."
        }
        actions={
          <>
            <MayaInlineAction onClick={scrollToVideosGallery} variant="primary">
              View My Photos
            </MayaInlineAction>
            <MayaInlineAction onClick={() => ctx.onToolOpenUploadZone?.("selfies")}>
              Upload a Photo
            </MayaInlineAction>
          </>
        }
      >
        <div className="stone-inset-panel rounded-[22px] px-4 py-4 text-sm leading-relaxed text-(--text-accent)">
          No stress. Pick one photo below and I&apos;ll take it from there.
        </div>
      </MayaInlineCard>
    )
  }
  return (
    <div key={partIndex} className="mt-3 rounded-xl border border-[rgba(195,190,182,0.20)] bg-[rgba(175,170,162,0.10)] p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-[#8a8780]">Videos</div>
      <p className="mt-2 text-sm text-[#d5d5d5]">
        Pick a photo or upload a new one and I&apos;ll turn it into motion here.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => ctx.onToolOpenUploadZone?.("selfies")}
          className="rounded-lg border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.12)] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[#f0ede8] hover:bg-[rgba(175,170,162,0.22)]"
        >
          Upload Reference
        </button>
      </div>
      {images.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.slice(0, 6).map((image: any, imageIndex: number) =>
            renderVideoImageButton(image, imageIndex, ctx),
          )}
        </div>
      ) : (
        renderVideoNoImages(ctx)
      )}
    </div>
  )
}

function renderGenerateVideoTool(part: any, partIndex: number, ctx: ToolCtx): React.ReactNode {
  const toolPart = part
  const output = toolPart.output

  if (!output) return null
  if (output.state === "loading_images") {
    return (
      <div key={partIndex} className="mt-3 rounded-xl border border-[rgba(195,190,182,0.20)] bg-[rgba(175,170,162,0.10)] p-4">
        <div className="flex items-center gap-2 text-[#8a8780]">
          <div className="w-1.5 h-1.5 border-2 border-[#a8a49c] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs tracking-[0.15em] uppercase font-light">Pulling your photo options...</span>
        </div>
      </div>
    )
  }
  if (output.state === "choose_image") return renderVideoStateChooseImage(output, partIndex, ctx)
  if (output.state === "processing") {
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
  if (output.state === "ready" && output.videoUrl) {
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
  if (output.state === "error") {
    return (
      <div key={partIndex} className="mt-3 rounded-xl border border-[rgba(195,190,182,0.20)] bg-[rgba(175,170,162,0.10)] p-4">
        <p className="text-sm text-[#f5c2c2]">{output.message || "Video generation failed."}</p>
        {renderVideoDebugPanel(output.debug)}
      </div>
    )
  }
  if (output.state === "loading") {
    return (
      <div key={partIndex} className="mt-3">
        <div className="flex items-center gap-2 text-stone-600">
          <div className="w-1.5 h-1.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-xs tracking-[0.15em] uppercase font-light">Starting video generation...</span>
        </div>
      </div>
    )
  }
  return null
}

// ── Tool registry ─────────────────────────────────────────────────────────────

const TOOL_RENDERERS: Record<string, ToolRenderer> = {
  "tool-generateConcepts": renderGenerateConceptsTool,
  "tool-showCapabilities": renderShowCapabilitiesTool,
  "tool-showStudioHub": renderShowStudioHubTool,
  "tool-showGallery": renderShowGalleryTool,
  "tool-saveToGallery": renderSaveToGalleryTool,
  "tool-generateImage": renderGenerateImageTool,
  "tool-showUploadZone": renderShowUploadZoneTool,
  "tool-switchMayaTab": renderSwitchMayaTabTool,
  "tool-collectOfferBrief": renderCollectOfferBriefTool,
  "tool-editAsset": renderEditAssetTool,
  "tool-createAssetPreview": renderCreateAssetPreviewTool,
  "tool-mayaGapOffer": renderMayaGapOfferTool,
  "tool-structuredAssetBlocked": renderStructuredAssetBlockedTool,
  "tool-generateFeed": renderGenerateFeedTool,
  "tool-generateCaptions": renderGenerateCaptionsTool,
  "tool-generateStrategy": renderGenerateStrategyTool,
  "tool-generateVideo": renderGenerateVideoTool,
}

// ── MayaMessageParts ──────────────────────────────────────────────────────────

interface MayaMessagePartsProps extends ToolCtx {
  messages: UIMessage[]
  promptSuggestions: PromptSuggestion[]
  isCreatingFeed: boolean
  isTyping: boolean
}

function MayaMessageParts(props: Readonly<MayaMessagePartsProps>): React.ReactNode {
  const { msg } = props

  // Fallback: messages with content field but no parts array
  if (!msg.parts || !Array.isArray(msg.parts)) {
    const content = (msg as any).content
    if (!content?.trim()) return null
    return (
      <div
        className={`rounded-xl transition-all duration-300 ${
          msg.role === "user"
            ? "bg-[rgba(175,170,162,0.20)] backdrop-blur-sm border border-[rgba(195,190,182,0.25)] rounded-2xl rounded-tr-sm text-[#f0ede8] px-4 py-3"
            : "bg-[rgba(175,170,162,0.12)] backdrop-blur-sm border border-[rgba(195,190,182,0.15)] rounded-2xl rounded-tl-sm text-[#f0ede8] px-4 py-3"
        }`}
        role={msg.role === "assistant" ? "article" : undefined}
      >
        {renderMessageContent(content, msg.role === "user")}
      </div>
    )
  }

  const textParts = msg.parts.filter((p) => p?.type === "text")
  const imageParts = msg.parts.filter((p) => p?.type === "image")
  const otherParts = msg.parts.filter((p) => p?.type !== "text" && p?.type !== "image")
  const fullMessageText = textParts.map((part: any) => part?.text || "").join("")
  const messageHasFeedArtifacts = hasFeedStrategyArtifacts(fullMessageText)
  const hasFeedCard = msg.parts.some((p: any) => p.type === "tool-generateFeed")

  return (
    <>
      {(textParts.length > 0 || imageParts.length > 0) && (
        <div
          className={`transition-all duration-300 ${
            msg.role === "user"
              ? "bg-[rgba(175,170,162,0.20)] backdrop-blur-sm border border-[rgba(195,190,182,0.25)] rounded-2xl rounded-tr-sm text-[#f0ede8] px-4 py-3"
              : "bg-[rgba(175,170,162,0.12)] backdrop-blur-sm border border-[rgba(195,190,182,0.15)] rounded-2xl rounded-tl-sm text-[#f0ede8] px-4 py-3"
          }`}
          role={msg.role === "assistant" ? "article" : undefined}
        >
          {textParts.map((part, idx) => (
            <MayaTextPart
              key={(part as any).text?.slice(0, 30) || idx} // NOSONAR — text parts don't have stable IDs
              part={part}
              idx={idx}
              msg={msg}
              messageHasFeedArtifacts={messageHasFeedArtifacts}
              hasFeedCard={hasFeedCard}
              isCreatingFeed={props.isCreatingFeed}
              isTyping={props.isTyping}
              proMode={props.proMode}
              messages={props.messages}
              promptSuggestions={props.promptSuggestions}
            />
          ))}
          {imageParts.length > 0 && (
            <div className={`mt-3 ${imageParts.length > 1 ? "grid grid-cols-2 sm:grid-cols-3 gap-3" : ""}`}>
              {imageParts.map((part, idx) => {
                const imageUrl = part.image || part.url || part.src
                if (!imageUrl) return null
                const isCarousel = imageParts.length > 1 && imageParts.length <= 10
                return (
                  <div key={imageUrl || idx} className="relative">
                    <div
                      className={`relative ${isCarousel ? "aspect-square" : "w-48 h-48 sm:w-40 sm:h-40"} rounded-xl overflow-hidden border border-white/60 shadow-lg`}
                    >
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
              })}
            </div>
          )}
        </div>
      )}
      {otherParts.map((part, partIndex) => {
        const renderer = TOOL_RENDERERS[part.type as string]
        return renderer ? renderer(part, partIndex, props) : null
      })}
    </>
  )
}

// ── MayaTextPart ──────────────────────────────────────────────────────────────

interface MayaTextPartProps {
  part: any
  idx: number
  msg: UIMessage
  messageHasFeedArtifacts: boolean
  hasFeedCard: boolean
  isCreatingFeed: boolean
  isTyping: boolean
  proMode: boolean
  messages: UIMessage[]
  promptSuggestions: PromptSuggestion[]
}

function MayaTextPart(props: Readonly<MayaTextPartProps>): React.ReactNode {
  const { part, idx, msg, messageHasFeedArtifacts, hasFeedCard, isCreatingFeed, isTyping, proMode, messages, promptSuggestions } = props
  const text = part?.text || ""
  const shouldShowPendingFeedLoader =
    messageHasFeedArtifacts && !hasFeedCard && (isCreatingFeed || isTyping)
  const shouldShowLoader = shouldShowPendingFeedLoader && idx === 0
  const shouldHideText =
    (shouldShowPendingFeedLoader && idx > 0) || (hasFeedCard && messageHasFeedArtifacts)

  const parsedPromptSuggestions = parsePromptSuggestions(text, proMode)
  const displayText = computeDisplayText(text, proMode, parsedPromptSuggestions)

  if (shouldShowLoader) {
    return (
      <div key={idx} className="flex items-center justify-center w-full py-8 sm:py-12">
        <div className="w-full max-w-md px-4 sm:px-6">
          <UnifiedLoading variant="section" message="Creating Your Feed Layout" className="w-full" />
        </div>
      </div>
    )
  }

  if (shouldHideText || displayText.length === 0) return null

  const isLastMessage = msg.id === messages.at(-1)?.id
  const showApiSuggestions = msg.role === "assistant" && promptSuggestions.length > 0 && isLastMessage
  const hasCarouselSlides = parsedPromptSuggestions.some((s) => s.label.includes("Slide"))
  const nonCarouselSuggestions = hasCarouselSlides
    ? []
    : parsedPromptSuggestions.filter((s) => !s.label.includes("Slide"))
  const showNonCarousel = msg.role === "assistant" && nonCarouselSuggestions.length > 0

  return (
    <div key={idx}>
      {renderMessageContent(displayText, msg.role === "user")}

      {showApiSuggestions && (
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

      {showNonCarousel && (
        <div className="mt-4 space-y-3">
          {nonCarouselSuggestions.map((suggestion, sugIdx) => {
            const fullSuggestion: PromptSuggestion = {
              id: `parsed-${msg.id}-${sugIdx}`,
              templateId: "parsed",
              name: suggestion.label || `Prompt ${sugIdx + 1}`,
              description: suggestion.description || suggestion.label || "",
              prompt: suggestion.prompt,
              variation: "main",
              nanoBananaCapabilities: [],
              useCases: [],
              confidence: 0.8,
            }

            const promptLower = suggestion.prompt.toLowerCase()
            if (promptLower.includes("text") || promptLower.includes("typography")) {
              fullSuggestion.nanoBananaCapabilities.push("text_rendering")
            }
            if (promptLower.includes("image 1") && promptLower.includes("image 2")) {
              fullSuggestion.nanoBananaCapabilities.push("multi_image_composition")
            }
            if (
              promptLower.includes("exact") ||
              promptLower.includes("identical") ||
              promptLower.includes("consistency")
            ) {
              fullSuggestion.nanoBananaCapabilities.push("character_consistency")
            }
            if (promptLower.includes("85mm") || promptLower.includes("f/") || promptLower.includes("lens")) {
              fullSuggestion.nanoBananaCapabilities.push("professional_controls")
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
      )}
    </div>
  )
}

// ── MayaChatInterface ─────────────────────────────────────────────────────────

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
  userHasTrainedModel = false,
  linkedSelfieCount = 0,
  onToolSelectGenerationSource,
  onToolOpenUploadZone,
  onToolPromptSelect,
  onToolSubmitOfferBrief,
  onToolStartVideoGeneration,
  activeTab = "photos",
  onSwitchTab,
}: MayaChatInterfaceProps) {
  const isLandingPagesUiEnabled = isFeatureEnabled(process.env.NEXT_PUBLIC_FEATURE_MAYA_LANDING_PAGES_UI)

  const ctx: ToolCtx = {
    msg: null as any, // overridden per message in the map below
    proMode,
    chatId,
    messages,
    setMessages,
    uploadedImages,
    setCreditBalance,
    onImageGenerated,
    isAdmin,
    selectedGuideId,
    selectedGuideCategory,
    onSaveToGuide,
    userId,
    user,
    generationSettings,
    enhancedAuthenticity,
    userHasTrainedModel,
    linkedSelfieCount,
    onToolSelectGenerationSource,
    onToolOpenUploadZone,
    onToolPromptSelect,
    onToolSubmitOfferBrief,
    onToolStartVideoGeneration,
    activeTab,
    onSwitchTab,
    onFeedSaved,
    isLandingPagesUiEnabled,
  }

  return (
    <div className="flex-1 min-h-0 px-6 md:px-12 bg-transparent">
      <div
        ref={messagesContainerRef}
        className="h-full overflow-y-auto pr-1 scroll-smooth"
        style={{
          paddingTop: MAYA_CHAT_SCROLL_TOP_OFFSET,
          paddingBottom:
            "calc(var(--input-bar-height, 168px) + max(16px, env(safe-area-inset-bottom, 0px)))",
        }}
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {filteredMessages &&
          Array.isArray(filteredMessages) &&
          filteredMessages
            .filter((msg) => hasRenderableMessage(msg))
            .map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end mb-8 sm:mb-10" : "justify-start mb-12 sm:mb-14"}`}
              >
                <div
                  className={`${msg.role === "user" ? "max-w-[80%] sm:max-w-[80%] order-2" : "max-w-[92%] sm:max-w-[88%] order-1"}`}
                >
                  <MayaMessageParts
                    {...ctx}
                    msg={msg}
                    messages={messages}
                    promptSuggestions={promptSuggestions}
                    isCreatingFeed={isCreatingFeed}
                    isTyping={isTyping}
                  />
                </div>
              </div>
            ))}

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

        {isCreatingFeed &&
          !filteredMessages.some((m: any) => m.parts?.some((p: any) => p.type === "tool-generateFeed")) &&
          !filteredMessages.some((m: any) => {
            const textContent = m.parts?.find((p: any) => p.type === "text")?.text || ""
            const hasFeedTrigger =
              textContent.includes("[CREATE_FEED_STRATEGY") ||
              textContent.includes("```json") ||
              textContent.includes('"feedStrategy"') ||
              textContent.includes('"position"') ||
              textContent.includes("Aesthetic Choice:") ||
              textContent.includes("Overall Vibe:")
            return hasFeedTrigger && !m.parts?.some((p: any) => p.type === "tool-generateFeed")
          }) && (
            <div className="flex items-center justify-center min-h-[calc(100vh-320px)] sm:min-h-[calc(100vh-280px)] w-full py-8 sm:py-12">
              <div className="w-full max-w-md px-4 sm:px-6">
                <UnifiedLoading variant="section" message="Creating Your Feed Layout" className="w-full" />
              </div>
            </div>
          )}

        {isGeneratingConcepts && !isCreatingFeed && (
          <div className="flex justify-center mt-8 mb-4">
            <UnifiedLoading variant="section" message="Creating your concepts..." className="max-w-md w-full" />
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
