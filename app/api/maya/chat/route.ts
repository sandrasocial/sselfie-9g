import {
  streamText,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai"
import { sql } from "@/lib/db/client"
import { getMayaSystemPrompt, MAYA_CLASSIC_CONFIG, MAYA_PRO_CONFIG } from "@/lib/maya/mode-adapters"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
import { createServerClient } from "@/lib/supabase/server"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { checkCredits, deductCredits } from "@/lib/credits"
import { detectStudioProIntent, getStudioProSystemPrompt } from "@/lib/maya/studio-pro-system-prompt"
import { getOrCreateActiveChat } from "@/lib/data/maya"
import {
  autoSelectMayaMode,
  isExplicitTrainedModelIntent,
  isContentPlanningIntent,
  isMayaImageGenerationIntent,
  isUnifiedMayaUiEnabled,
} from "@/lib/maya/auto-select-mode"
import { getProductGenerationPrompt } from "@/lib/products-system-prompt"
import { shouldDeductMayaChatCredit } from "@/lib/maya/chat-credit-policy"
import { extractLatestUserText, hydrateMayaToolDispatchIntent } from "@/lib/maya/intent-dispatcher"
import { stripMayaToolMarkers } from "@/lib/maya/tool-markers"
import { formatMayaToolMarker } from "@/lib/maya/tool-registry"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { isFeedPlannerChatType, isPlanChatType, normalizeMayaChatType } from "@/lib/maya/chat-type"
import {
  persistMayaRememberedPreference,
  getMayaActiveAssetContext,
  persistMayaActiveAssetContext,
  persistMayaOfferBrief,
  detectMayaAssetIntentResult,
} from "@/lib/maya/memory-layer"
import { estimateToolDispatchCredits, orchestrateMayaTurn } from "@/lib/maya/tool-orchestrator"
import { createMayaGeneratedAsset, updateMayaGeneratedAsset } from "@/lib/maya/asset-generation"
import {
  parseOfferBriefSubmissionMarker,
  buildOfferBriefInstruction,
  summarizeOfferBriefForMemory,
  encodeOfferBriefCollectionPayload,
  toOfferBriefFromPartial,
  type MayaOfferBriefField,
} from "@/lib/maya/offer-brief"
import { getMayaUserSnapshot } from "@/lib/maya/user-snapshot"
import { resolveMayaLandingSnapshot } from "@/lib/maya/page-generation/snapshot-resolver"
import { isMayaPageRendererV2Enabled } from "@/lib/maya/page-generation/constants"
import {
  createMayaAnthropicModel,
  createMayaOpenRouterFallbackModel,
  getMayaGatewayModel,
  getMayaMaxTokensForTask,
  getMayaModelForTask,
  resolveMayaChatTask,
} from "@/lib/maya/openrouter"
import type { MayaCriticalLandingField } from "@/lib/maya/page-generation/types"
import { selectMayaSkill } from "@/lib/maya/skills/skill-router"
import {
  encodeMayaTabHandoffPayload,
  isMayaTabScopedChatEnabled,
  resolveMayaTabHandoff,
  type MayaSurfaceTab,
} from "@/lib/maya/tab-scope"
import { getWeekPlanSystemAddendum } from "@/lib/maya/week-plan-prompt"
import { resolveMethodDepth } from "@/lib/maya/method-depth"
import { hasStudioMembership } from "@/lib/subscription"
import {
  isMayaImageContinuationEnabled,
  isMayaInlineChatImagesEnabled,
  isMayaProactiveCreativeAssistanceEnabled,
} from "@/lib/feature-flags"

import { NextResponse } from "next/server"

/**
 * Primary live Maya chat route.
 *
 * The current Maya UI (`useMayaChat`) posts here for Photos/Videos/Train
 * tab-scoped turns, prompt-builder, and tool-dispatch execution.
 *
 * Runtime mode is selected inside this route via headers/body state such as:
 * - `x-studio-pro-mode`
 * - `x-chat-type`
 * - `x-active-tab`
 *
 * `/api/maya/pro/chat` still exists for older or narrower Pro-only callers,
 * but it is not the main route used by the live Maya shell.
 */
export const maxDuration = 60

function isChatFirstMayaEnabled(envValue?: string | null): boolean {
  if (!envValue) return true
  const normalized = envValue.trim().toLowerCase()
  return normalized === "true" || normalized === "1"
}

function isMayaLandingPagesInChatEnabled(envValue?: string | null): boolean {
  return false
}

function isMayaStrictAssetToolRoutingEnabled(envValue?: string | null): boolean {
  if (!envValue) return true
  const normalized = envValue.trim().toLowerCase()
  return normalized === "true" || normalized === "1"
}

function isMayaChatApiDebugEnabled(envValue?: string | null): boolean {
  if (!envValue) return false
  const normalized = envValue.trim().toLowerCase()
  return normalized === "true" || normalized === "1"
}

function createLandingPagesPausedResponse(validUIMessages: UIMessage[], preface?: string) {
  const stream = createUIMessageStream({
    originalMessages: validUIMessages as any,
    execute: ({ writer }) => {
      const textPartId = `page-flow-paused-${Date.now().toString(36)}`
      writer.write({ type: "text-start", id: textPartId })
      writer.write({
        type: "text-delta",
        id: textPartId,
        delta:
          `${preface ? `${preface.trim()} ` : ""}` +
          `Landing page drafts are retired right now while we rebuild this feature. ` +
          `I can still help you with photo ideas, videos, and training guidance in Maya.`,
      })
      writer.write({ type: "text-end", id: textPartId })
    },
  })

  return createUIMessageStreamResponse({ stream })
}

function normalizeMayaStreamErrorMessage(error: unknown): string {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Failed to process chat request"

  if (/gateway|openrouter|anthropic|model/i.test(rawMessage)) {
    return "Maya's AI connection is temporarily unavailable. Please try again in a moment."
  }

  return rawMessage || "Maya could not reply right now. Please try again."
}

function createMayaChatErrorResponse(validUIMessages: UIMessage[], error: unknown) {
  const errorMessage = normalizeMayaStreamErrorMessage(error)
  const stream = createUIMessageStream({
    originalMessages: validUIMessages as any,
    execute: ({ writer }) => {
      const textPartId = `maya-chat-error-${Date.now().toString(36)}`
      writer.write({ type: "text-start", id: textPartId })
      writer.write({
        type: "text-delta",
        id: textPartId,
        delta: errorMessage,
      })
      writer.write({ type: "text-end", id: textPartId })
    },
  })

  return createUIMessageStreamResponse({ stream })
}

function createMayaPlainTextResponse(validUIMessages: UIMessage[], text: string) {
  const stream = createUIMessageStream({
    originalMessages: validUIMessages as any,
    execute: ({ writer }) => {
      const textPartId = `maya-plain-${Date.now().toString(36)}`
      writer.write({ type: "text-start", id: textPartId })
      writer.write({
        type: "text-delta",
        id: textPartId,
        delta: text,
      })
      writer.write({ type: "text-end", id: textPartId })
    },
  })

  return createUIMessageStreamResponse({ stream })
}

type MayaLastInlineImageContext = {
  imageUrl: string
  prompt: string
}

function extractTextFromMayaMessage(message: any): string {
  if (!message) return ""

  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((part: any) => part?.type === "text" && typeof part.text === "string")
      .map((part: any) => part.text)
      .join("\n")
  }

  if (typeof message.content === "string") return message.content

  if (Array.isArray(message.content)) {
    return message.content
      .filter((part: any) => part?.type === "text" && typeof part.text === "string")
      .map((part: any) => part.text)
      .join("\n")
  }

  return ""
}

function extractInlineImageUrl(text: string): string | null {
  const markdownImageMatch = text.match(/!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/i)
  if (markdownImageMatch?.[1]) return markdownImageMatch[1]

  const linkedImageMatch = text.match(/Open it here:\s*(https?:\/\/\S+)/i)
  if (linkedImageMatch?.[1]) return linkedImageMatch[1].replace(/[).,]+$/, "")

  return null
}

function findLastInlineImageContext(messages: UIMessage[]): MayaLastInlineImageContext | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index] as any
    if (message?.role !== "assistant") continue

    const imageUrl = extractInlineImageUrl(extractTextFromMayaMessage(message))
    if (!imageUrl) continue

    const previousUserMessage = [...messages.slice(0, index)]
      .reverse()
      .find((candidate: any) => candidate?.role === "user")
    const prompt = stripMayaToolMarkers(extractTextFromMayaMessage(previousUserMessage)).trim()

    return { imageUrl, prompt }
  }

  return null
}

function isMayaCaptionContinuationIntent(text: string): boolean {
  return /\b(write|make|create|draft|give me|caption|hook|post copy|instagram caption|caption this)\b[\s\S]{0,80}\b(caption|hook|post copy|instagram)\b/i.test(
    text,
  )
}

function isMayaCreativeTextContinuationIntent(text: string): boolean {
  const normalized = text.toLowerCase().trim()
  if (isMayaCaptionContinuationIntent(normalized)) return true

  return /\b(carousel|post ideas?|caption ideas?|content ideas?|hooks?|write|copy|plan|turn this into)\b/i.test(
    normalized,
  )
}

function isMayaImageRefinementIntent(text: string): boolean {
  const normalized = text.toLowerCase().trim()
  if (!normalized) return false
  if (isMayaCreativeTextContinuationIntent(normalized)) return false

  return (
    /\b(make|change|turn|try|redo|regenerate|adjust|edit|switch|keep|preserve)\b[\s\S]{0,120}\b(this|it|image|photo|face|background|lighting|outfit|version|vibe|style)\b/i.test(
      normalized,
    ) ||
    /\b(more|less)\s+(editorial|pinterest|luxury|expensive|soft|softer|bright|brighter|dark|darker|moody|clean|minimal|glowy|natural|polished|feminine)\b/i.test(
      normalized,
    ) ||
    /\b(car selfie|mirror selfie|hotel lobby|scandinavian|dark and moody|soft light|golden hour|luxury outfit|change the background|change the outfit|keep my face|same face)\b/i.test(
      normalized,
    )
  )
}

function isMayaContextualImageFollowUpIntent(text: string): boolean {
  const normalized = text.toLowerCase().trim()
  if (!normalized) return false

  return (
    /\b(this|it|that|same\s+one|same\s+photo|same\s+image|version)\b/i.test(normalized) ||
    /^(softer|more\s+pinterest|more\s+editorial|more\s+luxury|luxury\s+vibe|carousel\s+ideas?)\b/i.test(
      normalized,
    )
  )
}

function buildMayaImageContinuationPrompt(input: {
  followUp: string
  previousPrompt: string
}): string {
  const previousPrompt = input.previousPrompt
    ? `\nPrevious image direction: ${input.previousPrompt}`
    : ""

  return [
    "Refine the provided image based on the user's follow-up.",
    "Preserve the same person, facial features, identity, skin tone, hair, and overall likeness unless the user explicitly asks for a change.",
    `User follow-up: ${input.followUp}`,
    previousPrompt,
  ]
    .filter(Boolean)
    .join("\n")
}

function attachLastInlineImageToLatestUserMessage(input: {
  messages: UIMessage[]
  imageContext: MayaLastInlineImageContext
  latestUserText: string
}): UIMessage[] {
  let attached = false
  let latestUserIndex = -1
  input.messages.forEach((message: any, index) => {
    if (message?.role === "user") latestUserIndex = index
  })

  return input.messages.map((message: any, index) => {
    if (attached || message?.role !== "user") return message

    const isLatestUserMessage = index === latestUserIndex
    if (!isLatestUserMessage) return message

    attached = true
    const parts = Array.isArray(message.parts)
      ? [...message.parts]
      : typeof message.content === "string"
        ? [{ type: "text", text: message.content }]
        : []

    const hasImagePart = parts.some((part: any) => part?.type === "image")
    const contextualText =
      `${input.latestUserText}\n\n` +
      `[Maya Last Image Context]\n` +
      `Use the attached previous Maya image as visual context. Previous image prompt: ${input.imageContext.prompt || "not available"}.`

    const nextParts = parts
      .filter((part: any) => part?.type !== "text")
      .concat([{ type: "text", text: contextualText }])

    if (!hasImagePart) {
      nextParts.push({ type: "image", image: input.imageContext.imageUrl })
    }

    const { content, ...rest } = message
    return { ...rest, parts: nextParts }
  })
}

function buildMayaProactiveImagePrompt(responseKind?: "new" | "refinement"): string {
  if (!isMayaProactiveCreativeAssistanceEnabled()) {
    return "Want me to write a caption or adjust anything else?"
  }

  if (responseKind === "refinement") {
    return "This is a good direction. Want a softer version, a more Pinterest version, or a caption for this one?"
  }

  return "A few easy next moves: I can make it softer, more Pinterest, more editorial, or write the caption."
}

function extractLibraryImageUrl(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) return value.trim()
  if (!value || typeof value !== "object") return undefined

  const record = value as Record<string, unknown>
  const directFields = [
    "url",
    "imageUrl",
    "image_url",
    "src",
    "publicUrl",
    "public_url",
    "blobUrl",
    "blob_url",
  ]

  for (const field of directFields) {
    const candidate = record[field]
    if (typeof candidate === "string" && candidate.trim().length > 0) return candidate.trim()
  }

  return undefined
}

function isMayaReferenceUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.hostname.endsWith(".public.blob.vercel-storage.com")
  } catch {
    return false
  }
}

function pickSavedSelfieReferenceUrl(selfies: unknown): string | undefined {
  if (!Array.isArray(selfies)) return undefined

  for (const item of [...selfies].reverse()) {
    const url = extractLibraryImageUrl(item)
    if (url && isMayaReferenceUrl(url)) return url
  }

  return undefined
}

async function getSavedSelfieReferenceUrl(userId: string): Promise<string | undefined> {
  try {
    const rows = await sql`
      SELECT selfies
      FROM user_image_libraries
      WHERE user_id::text = ${userId}
      LIMIT 1
    `
    return pickSavedSelfieReferenceUrl(rows[0]?.selfies)
  } catch (error) {
    console.warn("[Maya Chat API] Could not load saved selfie reference for OpenAI routing:", error)
    return undefined
  }
}

function buildOpenAIQuickPrompt(prompt: string, hasReferenceImage: boolean): string {
  const cleanCanvasDirection =
    "Fill the image canvas edge to edge with the final photo. Do not place the photo inside a white frame, mat, border, mockup, phone screen, app UI, or preview card."

  if (!hasReferenceImage) {
    return [cleanCanvasDirection, "", prompt].join("\n")
  }

  return [
    "Use the attached selfie/reference image as the identity source.",
    "Preserve the person's face, facial structure, skin tone, hair, age, and recognizable identity.",
    "Create the requested aesthetic image without turning them into a different person.",
    cleanCanvasDirection,
    "",
    prompt,
  ].join("\n")
}

function createMayaQuickImageErrorResponse(validUIMessages: UIMessage[], message: string): Response {
  const stream = createUIMessageStream({
    originalMessages: validUIMessages as any,
    execute: ({ writer }) => {
      const textPartId = `maya-quick-photo-error-${Date.now().toString(36)}`
      writer.write({ type: "text-start", id: textPartId })
      writer.write({
        type: "text-delta",
        id: textPartId,
        delta: message,
      })
      writer.write({ type: "text-end", id: textPartId })
    },
  })

  return createUIMessageStreamResponse({ stream })
}

async function createOpenAIQuickImageDispatchResponse(input: {
  req: Request
  validUIMessages: UIMessage[]
  prompt: string
  chatId?: unknown
  userId: string
  referenceImageUrl?: string
  responseKind?: "new" | "refinement"
}): Promise<Response | null> {
  const prompt = input.prompt.trim()
  if (!prompt) return null
  const hasReferenceImage = typeof input.referenceImageUrl === "string" && input.referenceImageUrl.trim().length > 0

  const headers = new Headers()
  headers.set("Content-Type", "application/json")
  const cookie = input.req.headers.get("cookie")
  if (cookie) headers.set("cookie", cookie)
  const authorization = input.req.headers.get("authorization")
  if (authorization) headers.set("authorization", authorization)

  const origin = new URL(input.req.url).origin
  let openAIResponse: Response
  try {
    openAIResponse = await fetch(`${origin}/api/maya/generate-image-openai`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt: buildOpenAIQuickPrompt(prompt, hasReferenceImage),
        conceptTitle: "Maya quick photo",
        chatId:
          typeof input.chatId === "string" || typeof input.chatId === "number"
            ? String(input.chatId)
            : undefined,
        referenceImageUrl: input.referenceImageUrl,
      }),
    })
  } catch (error) {
    console.error("[Maya Chat API] OpenAI quick image dispatch failed:", error)
    return createMayaQuickImageErrorResponse(
      input.validUIMessages as UIMessage[],
      "Maya couldn’t keep editing that photo right now. Try again in a moment, or upload the photo again and I’ll continue from there.",
    )
  }

  if (openAIResponse.status === 403) {
    return null
  }

  const payload = await openAIResponse.json().catch(() => null)

  if (!openAIResponse.ok || !payload?.success || !payload?.imageUrl) {
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : "Maya could not create that photo right now. Please try again in a moment."

    return createMayaQuickImageErrorResponse(input.validUIMessages as UIMessage[], message)
  }

  void logAnalyticsEvent({
    eventName: "maya_quick_image_generated",
    userId: input.userId,
    path: "/api/maya/chat",
    properties: {
      source: "openai_quick",
      aiImageId: payload.aiImageId || null,
      responseKind: input.responseKind || "new",
    },
  })

  const stream = createUIMessageStream({
    originalMessages: input.validUIMessages as any,
    execute: ({ writer }) => {
      const textPartId = `maya-quick-photo-${Date.now().toString(36)}`
      const savedLine = payload.aiImageId
        ? input.responseKind === "refinement"
          ? "Done. I made the change and saved the new version to your gallery."
          : "Done. I created it and saved it to your gallery."
        : input.responseKind === "refinement"
          ? "Done. I made the change. The new version is ready here."
          : "Done. I created it. The image is ready here."
      const inlineImageText = isMayaInlineChatImagesEnabled()
        ? `${savedLine}\n\n![Maya generated photo](${payload.imageUrl})\n\n${buildMayaProactiveImagePrompt(input.responseKind)}`
        : `${savedLine}\n\nOpen it here: ${payload.imageUrl}\n\nWant me to write a caption for this one?`
      writer.write({ type: "text-start", id: textPartId })
      writer.write({
        type: "text-delta",
        id: textPartId,
        delta: inlineImageText,
      })
      writer.write({ type: "text-end", id: textPartId })
    },
  })

  return createUIMessageStreamResponse({ stream })
}

function createTabHandoffResponse(
  validUIMessages: UIMessage[],
  input: {
    targetTab: "photos" | "plan" | "videos" | "training"
    title: string
    subtitle: string
    ctaLabel: string
  },
) {
  const switchMarker = formatMayaToolMarker("switch_maya_tab", encodeMayaTabHandoffPayload(input))

  const stream = createUIMessageStream({
    originalMessages: validUIMessages as any,
    execute: ({ writer }) => {
      const textPartId = `switch-maya-tab-${Date.now().toString(36)}`
      writer.write({ type: "text-start", id: textPartId })
      writer.write({
        type: "text-delta",
        id: textPartId,
        delta: `I want to keep this simple for you. ${input.subtitle}\n${switchMarker}`,
      })
      writer.write({ type: "text-end", id: textPartId })
    },
  })

  return createUIMessageStreamResponse({ stream })
}

function createStructuredAssetBlockedResponse(input: {
  validUIMessages: UIMessage[]
  assetType: "page" | "calendar" | "pdf"
  reason: "intent_match_failed" | "tool_failed" | "validation_failed"
  recoveryHint: string
  missingFields?: Array<"action_verb" | "asset_target">
}) {
  const missingPayload = (input.missingFields || []).join(",")
  const markerPayload = [
    input.assetType,
    input.reason,
    missingPayload,
    encodeURIComponent(input.recoveryHint),
  ].join("|")
  const blockedMarker = formatMayaToolMarker("structured_asset_blocked", markerPayload)

  const stream = createUIMessageStream({
    originalMessages: input.validUIMessages as any,
    execute: ({ writer }) => {
      const textPartId = `structured-asset-blocked-${Date.now().toString(36)}`
      writer.write({ type: "text-start", id: textPartId })
      writer.write({
        type: "text-delta",
        id: textPartId,
        delta:
          `I’m ready to build this in your template flow. I only need one clearer instruction so I can run it correctly.\n` +
          `${blockedMarker}`,
      })
      writer.write({ type: "text-end", id: textPartId })
    },
  })

  return createUIMessageStreamResponse({ stream })
}

const OFFER_BRIEF_FIELD_LABELS: Record<MayaOfferBriefField, string> = {
  offerType: "your offer",
  transformation: "the main result",
  pricePoint: "your price point",
  formatAndDuration: "the format",
  idealClient: "your ideal client",
  biggestStruggle: "their biggest struggle",
  uniqueMethod: "your unique method",
  proofPoints: "your proof points",
  callToAction: "your CTA",
}

function summarizeMissingOfferBriefFields(fields: MayaOfferBriefField[]): string {
  const labels = fields
    .map((field) => OFFER_BRIEF_FIELD_LABELS[field])
    .filter((label): label is string => Boolean(label))

  if (labels.length === 0) return "a couple details"
  if (labels.length === 1) return labels[0]
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`
}

function mapCriticalFieldsToOfferBriefFields(fields: MayaCriticalLandingField[]): MayaOfferBriefField[] {
  const mapped: MayaOfferBriefField[] = []
  for (const field of fields) {
    if (field === "offer") mapped.push("offerType")
    if (field === "audience") mapped.push("idealClient")
    if (field === "transformation") mapped.push("transformation")
  }
  return Array.from(new Set(mapped))
}

const PROMPT_BUILDER_SYSTEM = `You are Maya in Prompt Builder Mode, helping Sandra create professional, reusable prompts for SSELFIE Studio prompt guides.

## Your Role:

You're helping Sandra build a library of high-quality prompts that her users will copy and use. These prompts need to be:
- Professional and detailed (50-80 words for Maya's image generator)
- Structured with specific sections (outfit, pose, lighting, camera specs, etc.)
- Using real brand names (Chanel, ALO, Nike, not generic descriptions)
- Varied and diverse (no repetition across concepts)
- Ready to use without editing

## Your Process:

When Sandra describes a concept (e.g., "Chanel luxury editorial", "ALO workout shots"):

1. **Understand the aesthetic** - What's the vibe? Luxury? Athletic? Casual?
2. **Reference brand knowledge** - Use real Chanel pieces, ALO garments, Nike shoes
3. **Create variations** - Generate 3 different concepts with diverse:
   - Poses (standing, sitting, walking, leaning)
   - Locations (indoor, outdoor, studio, specific settings)
   - Lighting (natural window light, golden hour, studio lighting)
   - Outfits (different combinations of brand-specific items)

4. **Wait for feedback** - Let Sandra pick concepts and generate images
5. **Iterate if needed** - Refine based on her input

## Response Style:

- **Brief acknowledgments** - "Perfect! Creating Chanel luxury concepts ✨"
- **No lengthy explanations** - Sandra knows what she wants
- **Action-oriented** - Focus on generating concepts, not discussing them
- **Professional tone** - This is for her business, keep it sophisticated

## Critical Rules:

- ALWAYS use real brand names when applicable (not "athletic wear" - "ALO Airbrush leggings")
- ALWAYS include specific garment details (not "jacket" - "Chanel black tweed jacket with gold chain trim")
- NEVER assume hair color, ethnicity, or body type (reference attachment instead)
- ALWAYS include camera specs (e.g., "85mm lens, f/2.0 depth of field")
- ALWAYS include lighting description (e.g., "soft diffused natural window light")
- For Studio Pro Mode: Natural language prompts (50-80 words), NO trigger words

## Example Interaction:

Sandra: "Create some Chanel luxury prompts"

You: "Perfect! Creating Chanel luxury concepts with iconic pieces ✨

I'll generate 3 variations with:
- Classic Chanel tweed and quilted bags
- Parisian apartment and cafe settings  
- Soft editorial lighting
- Elegant poses and styling

One moment..."

[System generates concepts using /api/maya/generate-concepts]

Sandra: "Love the first one! Can you make it more casual?"

You: "Absolutely! Keeping the Chanel aesthetic but making it more relaxed..."

[Generates new variation]

## Remember:

These prompts will be used by hundreds of users. Quality and professionalism matter. Sandra trusts you to create prompts that represent her brand well.`

export async function POST(req: Request) {
  const mayaChatApiDebug = isMayaChatApiDebugEnabled(process.env.FEATURE_MAYA_CHAT_API_DEBUG)
  const debugLog = (...args: unknown[]) => {
    if (mayaChatApiDebug) {
      console.log(...args)
    }
  }

  debugLog("[Maya Chat API] Request received")

  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      console.error("[v0] Authentication failed:", authError?.message || "No user")
      return NextResponse.json({ error: authError?.message || "Unauthorized" }, { status: 401 })
    }

    const userId = authUser.id
    const user = await getEffectiveNeonUser(userId)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const dbUserId = user.id
    let mayaSnapshot: Awaited<ReturnType<typeof getMayaUserSnapshot>> | null = null

    debugLog("[Maya Chat API] User authenticated", { userId, dbUserId, userEmail: user.email })

    const body = await req.json()
    const {
      messages: uiMessages,
      chatId,
      chatType: chatTypeFromBody,
      product: productFromBody,
      firstTimeProductUser: firstTimeProductUserFromBody,
    } = body
    
    // Get chatType from body, or fallback to header, or default to "maya"
    const chatTypeHeader = req.headers.get("x-chat-type")
    const activeTabHeader = req.headers.get("x-active-tab") // Feed tab flag
    const requestedChatType = normalizeMayaChatType(chatTypeFromBody || chatTypeHeader || "maya")
    const unifiedMayaUiEnabled = isUnifiedMayaUiEnabled(process.env.FEATURE_UNIFIED_MAYA_UI)
    const tabScopedChatEnabled = isMayaTabScopedChatEnabled(process.env.FEATURE_MAYA_TAB_SCOPED_CHAT)
    const activeMayaTab =
      activeTabHeader === "photos" ||
      activeTabHeader === "plan" ||
      activeTabHeader === "videos" ||
      activeTabHeader === "training" ||
      activeTabHeader === "feed" ||
      activeTabHeader === "prompts"
        ? (activeTabHeader as MayaSurfaceTab)
        : undefined
    let chatType = requestedChatType
    let isFeedTab = activeTabHeader === "feed" || isFeedPlannerChatType(requestedChatType)
    let useFeedPlannerContext = isFeedTab
    let useOpenAIQuickImageDispatch = false
    let hasTrainedLoraModelForRouting = false
    let latestReferenceImageUrlForRouting: string | undefined
    
    debugLog("[Maya Chat API] Headers normalized", {
      fromBody: chatTypeFromBody,
      fromHeader: chatTypeHeader,
      activeTabHeader,
      isFeedTab,
      final: chatType,
      unifiedMayaUiEnabled,
    })
    
    debugLog("[Maya Chat API] Feed context", { isFeedTab, activeTabHeader })

    // Check if this is prompt_builder mode (admin tool) or admin user - bypass credit check
    const isPromptBuilder = chatType === "prompt_builder"
    const ADMIN_EMAIL = "ssa@ssasocial.com"
    const isAdmin = user.email === ADMIN_EMAIL

    if (unifiedMayaUiEnabled && !isPromptBuilder && chatType !== "pro-photoshoot" && Array.isArray(uiMessages)) {
      const latestUserMessage = [...uiMessages].reverse().find((m: any) => m?.role === "user")
      const parts = Array.isArray(latestUserMessage?.parts) ? latestUserMessage.parts : []
      const hasReferenceImage = parts.some((part: any) => part?.type === "image" && !!part?.image)
      latestReferenceImageUrlForRouting = parts.find((part: any) => part?.type === "image" && typeof part?.image === "string")?.image
      const latestUserText =
        parts
          .filter((part: any) => part?.type === "text" && typeof part?.text === "string")
          .map((part: any) => part.text)
          .join(" ") ||
        (typeof latestUserMessage?.content === "string" ? latestUserMessage.content : "")

      let canUseSelfies = false
      try {
        const [modelRows, libraryRows] = await Promise.all([
          sql`
            SELECT 1
            FROM user_models
            WHERE user_id = ${dbUserId}
              AND training_status = 'completed'
            LIMIT 1
          `,
          sql`
            SELECT 1
            FROM user_image_libraries
            WHERE user_id::text = ${dbUserId}
              AND (
                (jsonb_typeof(selfies) = 'array' AND jsonb_array_length(selfies) > 0)
                OR (jsonb_typeof(products) = 'array' AND jsonb_array_length(products) > 0)
                OR (jsonb_typeof(people) = 'array' AND jsonb_array_length(people) > 0)
                OR (jsonb_typeof(vibes) = 'array' AND jsonb_array_length(vibes) > 0)
              )
            LIMIT 1
          `,
        ])
        hasTrainedLoraModelForRouting = modelRows.length > 0
        canUseSelfies = libraryRows.length > 0
      } catch (modelError) {
        console.error("[Maya Chat API] Failed checking trained model for unified routing:", modelError)
      }

      const isImageGeneration = isMayaImageGenerationIntent(latestUserText)
      const prefersTrainedModel = isExplicitTrainedModelIntent(latestUserText)
      const autoMode = autoSelectMayaMode({
        hasReferenceImage,
        hasTrainedLoraModel: hasTrainedLoraModelForRouting,
        isContentPlanning: isContentPlanningIntent(latestUserText),
        isImageGeneration,
        prefersTrainedModel,
        canUseSelfies,
      })
      useOpenAIQuickImageDispatch = autoMode === "openai_quick"
      const normalizedAutoMode =
        autoMode === "openai_quick" ? requestedChatType : normalizeMayaChatType(autoMode)

      if (tabScopedChatEnabled && activeMayaTab === "plan") {
        chatType = requestedChatType
        isFeedTab = false
        useFeedPlannerContext = isFeedPlannerChatType(normalizedAutoMode)
      } else if (tabScopedChatEnabled && activeMayaTab === "videos") {
        chatType = requestedChatType
        isFeedTab = false
        useFeedPlannerContext = false
      } else if (isFeedTab) {
        chatType = requestedChatType
        useFeedPlannerContext = true
      } else if (isFeedPlannerChatType(normalizedAutoMode)) {
        // Inline feed turns should stay inside the current Maya/Pro thread while still
        // getting Feed Planner prompting and model routing.
        chatType = requestedChatType
        useFeedPlannerContext = true
      } else {
        chatType = normalizedAutoMode
        isFeedTab = isFeedPlannerChatType(chatType)
        useFeedPlannerContext = isFeedTab
      }

      if (useOpenAIQuickImageDispatch && !latestReferenceImageUrlForRouting) {
        latestReferenceImageUrlForRouting = await getSavedSelfieReferenceUrl(dbUserId)
      }

      debugLog("[Maya Chat API] Unified routing applied", {
        requestedChatType,
        selectedChatType: normalizedAutoMode,
        persistedChatType: chatType,
        useFeedPlannerContext,
        hasReferenceImage,
        hasSavedSelfieReference: !hasReferenceImage && !!latestReferenceImageUrlForRouting,
        hasTrainedLoraModel: hasTrainedLoraModelForRouting,
        prefersTrainedModel,
        isImageGeneration,
        useOpenAIQuickImageDispatch,
      })
    }

    // Only check credits for non-admin, non-prompt-builder chats
    if (!isPromptBuilder && !isAdmin) {
      const hasCredits = await checkCredits(dbUserId, 1)
      if (!hasCredits) {
        debugLog("[Maya Chat API] User has insufficient credits")
        return NextResponse.json({ error: "Insufficient credits" }, { status: 402 })
      }
    } else {
      debugLog("[Maya Chat API] Bypassing credit check", {
        reason: isPromptBuilder ? "prompt_builder mode" : "admin user",
      })
    }

    if (!uiMessages) {
      console.error("[v0] Messages is null or undefined")
      return NextResponse.json({ error: "Messages is required" }, { status: 400 })
    }

    if (!Array.isArray(uiMessages)) {
      console.error("[v0] Messages is not an array:", typeof uiMessages)
      return NextResponse.json({ error: "Messages must be an array" }, { status: 400 })
    }

    if (uiMessages.length === 0) {
      console.error("[v0] Messages array is empty")
      return NextResponse.json({ error: "Messages cannot be empty" }, { status: 400 })
    }

    // CRITICAL: Filter and validate messages before processing
    // Remove any messages with invalid structure (tool calls, malformed content, etc.)
    const validUIMessages = uiMessages.filter((m: any) => {
      if (!m || !m.role) {
        debugLog("[Maya Chat API] Dropping message with missing role")
        return false
      }
      
      // Only allow user and assistant messages (no system messages from UI)
      if (m.role !== "user" && m.role !== "assistant") {
        debugLog("[Maya Chat API] Dropping message with invalid role", m.role)
        return false
      }
      
      // Check for invalid content structures
      if (m.content && Array.isArray(m.content)) {
        // Check for tool-result or tool-call types (not supported in chat)
        const hasInvalidTypes = m.content.some((c: any) => {
          if (!c || !c.type) return false
          // Filter out tool types that aren't properly formatted
          if (c.type === "tool-result" || c.type === "tool-call") {
            // Check if required fields are missing
            if (c.type === "tool-result" && (!c.toolCallId || !c.toolName || !c.output)) {
              return true // Invalid tool-result
            }
            if (c.type === "tool-call" && (!c.toolCallId || !c.toolName)) {
              return true // Invalid tool-call
            }
          }
          return false
        })
        if (hasInvalidTypes) {
          debugLog("[Maya Chat API] Dropping invalid tool payload in message content", m.id || "unknown")
          return false
        }
      }
      
      // Check for invalid parts structure
      if (m.parts && Array.isArray(m.parts)) {
        const hasInvalidTypes = m.parts.some((p: any) => {
          if (!p || !p.type) return false
          // Filter out tool types that aren't properly formatted
          if (p.type === "tool-result" || p.type === "tool-call") {
            // Check if required fields are missing
            if (p.type === "tool-result" && (!p.toolCallId || !p.toolName || !p.output)) {
              return true // Invalid tool-result
            }
            if (p.type === "tool-call" && (!p.toolCallId || !p.toolName)) {
              return true // Invalid tool-call
            }
          }
          // Filter out custom tool types that aren't supported by AI SDK
          if (p.type && p.type.startsWith("tool-") && p.type !== "tool-result" && p.type !== "tool-call") {
            // Custom tool types like "tool-generateConcepts" should be filtered out before sending to AI SDK
            return true
          }
          return false
        })
        if (hasInvalidTypes) {
          debugLog("[Maya Chat API] Dropping message with invalid parts", m.id || "unknown")
          return false
        }
      }
      
      return true
    })
    
    debugLog("[Maya Chat API] UI messages filtered", {
      incoming: uiMessages.length,
      valid: validUIMessages.length,
    })
    const latestUserTextForSkills = extractLatestUserText(validUIMessages as any)
    const imageContinuationEnabled = isMayaImageContinuationEnabled()
    const lastInlineImageContext = imageContinuationEnabled
      ? findLastInlineImageContext(validUIMessages as UIMessage[])
      : null
    const hasImageRefinementIntent = isMayaImageRefinementIntent(latestUserTextForSkills)
    const isImageRefinementContinuation =
      !!lastInlineImageContext && hasImageRefinementIntent
    const isCreativeTextContinuation =
      !!lastInlineImageContext && isMayaCreativeTextContinuationIntent(latestUserTextForSkills)

    if (
      imageContinuationEnabled &&
      unifiedMayaUiEnabled &&
      lastInlineImageContext &&
      isImageRefinementContinuation &&
      !isPromptBuilder &&
      !useFeedPlannerContext &&
      chatType !== "pro-photoshoot"
    ) {
      const openAIContinuationResponse = await createOpenAIQuickImageDispatchResponse({
        req,
        validUIMessages: validUIMessages as UIMessage[],
        prompt: buildMayaImageContinuationPrompt({
          followUp: latestUserTextForSkills,
          previousPrompt: lastInlineImageContext.prompt,
        }),
        chatId,
        userId: dbUserId,
        referenceImageUrl: lastInlineImageContext.imageUrl,
        responseKind: "refinement",
      })

      if (openAIContinuationResponse) {
        return openAIContinuationResponse
      }

      return createMayaPlainTextResponse(
        validUIMessages as UIMessage[],
        "I can’t adjust that photo right now. Try again in a moment, or upload the photo again and I’ll keep going from there.",
      )
    }

    if (
      imageContinuationEnabled &&
      unifiedMayaUiEnabled &&
      hasImageRefinementIntent &&
      isMayaContextualImageFollowUpIntent(latestUserTextForSkills) &&
      !lastInlineImageContext &&
      !isPromptBuilder &&
      !useFeedPlannerContext &&
      chatType !== "pro-photoshoot"
    ) {
      return createMayaPlainTextResponse(
        validUIMessages as UIMessage[],
        "Send me the photo you want me to adjust, then tell me the change. I’ll keep it simple.",
      )
    }

    if (
      useOpenAIQuickImageDispatch &&
      isMayaImageGenerationIntent(latestUserTextForSkills) &&
      !isPromptBuilder &&
      !useFeedPlannerContext &&
      chatType !== "pro-photoshoot"
    ) {
      const openAIQuickImageResponse = await createOpenAIQuickImageDispatchResponse({
        req,
        validUIMessages: validUIMessages as UIMessage[],
        prompt: latestUserTextForSkills,
        chatId,
        userId: dbUserId,
        referenceImageUrl: latestReferenceImageUrlForRouting,
      })

      if (openAIQuickImageResponse) {
        return openAIQuickImageResponse
      }
    }

    const tabHandoff =
      tabScopedChatEnabled && activeMayaTab
        ? resolveMayaTabHandoff({
            activeTab: activeMayaTab,
            userText: latestUserTextForSkills,
          })
        : null

    if (tabHandoff) {
      return createTabHandoffResponse(validUIMessages as UIMessage[], tabHandoff)
    }

    const chatFirstMayaEnabled = isChatFirstMayaEnabled(process.env.FEATURE_CHAT_FIRST_MAYA)
    if (chatFirstMayaEnabled && !isPromptBuilder && !useFeedPlannerContext && chatType !== "pro-photoshoot") {
      const allowPageAssetsInChat = isMayaLandingPagesInChatEnabled(
        process.env.FEATURE_MAYA_LANDING_PAGES_IN_CHAT,
      )
      const strictStructuredRouting = isMayaStrictAssetToolRoutingEnabled(
        process.env.FEATURE_MAYA_STRICT_ASSET_TOOL_ROUTING,
      )
      const latestStructuredUserText = latestUserTextForSkills
      const submittedOfferBrief = parseOfferBriefSubmissionMarker(latestStructuredUserText)

      if (submittedOfferBrief) {
        try {
          const offerBriefInstruction = buildOfferBriefInstruction(submittedOfferBrief)
          const briefAssetType = submittedOfferBrief.assetType === "calendar" ? "calendar" : "page"
          await persistMayaOfferBrief(dbUserId, submittedOfferBrief)

          const memorySummary = summarizeOfferBriefForMemory(submittedOfferBrief)
          await persistMayaRememberedPreference(
            dbUserId,
            `Latest offer brief saved. ${memorySummary}`,
          ).catch((memoryError) => {
            console.error("[Maya Chat] Failed to append offer brief summary note:", memoryError)
          })

          if (briefAssetType === "page" && !allowPageAssetsInChat) {
            return createLandingPagesPausedResponse(
              validUIMessages as UIMessage[],
              "Perfect. I saved this brief in your brand memory.",
            )
          }

          const generatedAsset = await createMayaGeneratedAsset({
            userId: dbUserId,
            assetType: briefAssetType,
            instruction: offerBriefInstruction,
          })

          await persistMayaActiveAssetContext(dbUserId, {
            assetType: generatedAsset.assetType,
            assetLabel: generatedAsset.title,
            assetId: generatedAsset.id,
            instruction: offerBriefInstruction,
          })

          const createAssetMarker = formatMayaToolMarker(
            "create_asset",
            [
              generatedAsset.assetType,
              encodeURIComponent(generatedAsset.title),
              generatedAsset.id,
              encodeURIComponent(generatedAsset.previewText),
              encodeURIComponent(generatedAsset.url || ""),
            ].join("|"),
          )
          const editAssetMarker = formatMayaToolMarker(
            "edit_asset",
            `${generatedAsset.assetType}|${encodeURIComponent(generatedAsset.title)}`,
          )

          const stream = createUIMessageStream({
            originalMessages: validUIMessages as any,
            execute: ({ writer }) => {
              const textPartId = `offer-brief-submit-${Date.now().toString(36)}`
              writer.write({ type: "text-start", id: textPartId })
              writer.write({
                type: "text-delta",
                id: textPartId,
                delta:
                  `Perfect. I saved this to your brand memory and built your ${briefAssetType === "calendar" ? "content calendar" : "landing page"} draft so we can refine it together.\n` +
                  `${createAssetMarker}\n` +
                  `${editAssetMarker}`,
              })
              writer.write({ type: "text-end", id: textPartId })
            },
          })

          return createUIMessageStreamResponse({ stream })
        } catch (offerBriefError) {
          console.error("[Maya Chat] Failed handling offer brief submission:", offerBriefError)
        }
      }

      mayaSnapshot = await getMayaUserSnapshot(dbUserId)

      let activeAssetContext = mayaSnapshot?.activeAssetContext ?? null
      try {
        if (!activeAssetContext) {
          activeAssetContext = await getMayaActiveAssetContext(dbUserId)
        }
      } catch (activeAssetError) {
        console.error("[Maya Chat] Failed to load active asset context:", activeAssetError)
      }

      const orchestration = orchestrateMayaTurn({
        userText: latestStructuredUserText,
        activeAssetContext,
        options: {
          allowPageAssetsInChat,
        },
      })

      if (
        orchestration.kind === "asset_create" ||
        orchestration.kind === "multi_step_asset_create" ||
        orchestration.kind === "asset_edit" ||
        orchestration.kind === "collect_offer_brief" ||
        orchestration.kind === "structured_asset_blocked"
      ) {
        const structuredAssetType =
          orchestration.kind === "asset_create" || orchestration.kind === "asset_edit"
            ? orchestration.intent.assetType
            : orchestration.kind === "multi_step_asset_create"
              ? orchestration.intents[0]?.assetType || "calendar"
              : orchestration.kind === "collect_offer_brief"
                ? orchestration.assetType
                : orchestration.intentClass

        void logAnalyticsEvent({
          eventName: "maya_structured_intent_detected",
          userId: dbUserId,
          path: "/api/maya/chat",
          properties: {
            assetType: structuredAssetType,
            orchestrationKind: orchestration.kind,
          },
        })
      }

      if (orchestration.kind === "remember") {
        try {
          const persistedMemory = await persistMayaRememberedPreference(dbUserId, orchestration.intent.note)
          console.log("[Maya Chat] Phase 3 memory intent captured:", {
            source: orchestration.intent.source,
            note: persistedMemory.note,
            noteCount: persistedMemory.notes.length,
          })

          const stream = createUIMessageStream({
            originalMessages: validUIMessages as any,
            execute: ({ writer }) => {
              const textPartId = `memory-save-${Date.now().toString(36)}`
              writer.write({ type: "text-start", id: textPartId })
              writer.write({
                type: "text-delta",
                id: textPartId,
                delta: `Perfect. I saved this in your memory so I keep it in every future suggestion: "${persistedMemory.note}"`,
              })
              writer.write({ type: "text-end", id: textPartId })
            },
          })

          return createUIMessageStreamResponse({ stream })
        } catch (memoryError) {
          console.error("[Maya Chat] Failed saving memory intent:", memoryError)

          const stream = createUIMessageStream({
            originalMessages: validUIMessages as any,
            execute: ({ writer }) => {
              const textPartId = `memory-save-fallback-${Date.now().toString(36)}`
              writer.write({ type: "text-start", id: textPartId })
              writer.write({
                type: "text-delta",
                id: textPartId,
                delta: `I heard you. I couldn't save that memory right now, but I will follow it in this chat.`,
              })
              writer.write({ type: "text-end", id: textPartId })
            },
          })

          return createUIMessageStreamResponse({ stream })
        }
      }

      if (orchestration.kind === "page_generation_paused") {
        return createLandingPagesPausedResponse(validUIMessages as UIMessage[])
      }

      if (orchestration.kind === "structured_asset_blocked") {
        void logAnalyticsEvent({
          eventName: "maya_structured_tool_blocked",
          userId: dbUserId,
          path: "/api/maya/chat",
          properties: {
            assetType: orchestration.intentClass,
            reason: orchestration.errorReason,
            source: "orchestrator",
          },
        })

        return createStructuredAssetBlockedResponse({
          validUIMessages: validUIMessages as UIMessage[],
          assetType: orchestration.intentClass,
          reason: orchestration.errorReason,
          missingFields: orchestration.missingFields,
          recoveryHint: orchestration.recoveryHint,
        })
      }

      if (orchestration.kind === "collect_offer_brief") {
        if (!allowPageAssetsInChat) {
          return createLandingPagesPausedResponse(validUIMessages as UIMessage[])
        }

        try {
          const seededBrief = mayaSnapshot.offerBrief

          if (seededBrief.hasCoreFields) {
            const offerBrief = toOfferBriefFromPartial(seededBrief.prefill)
            if (offerBrief) {
              const offerBriefInstruction = buildOfferBriefInstruction(offerBrief)
              await persistMayaOfferBrief(dbUserId, offerBrief)

              const generatedAsset = await createMayaGeneratedAsset({
                userId: dbUserId,
                assetType: "page",
                instruction: offerBriefInstruction,
              })

              await persistMayaActiveAssetContext(dbUserId, {
                assetType: generatedAsset.assetType,
                assetLabel: generatedAsset.title,
                assetId: generatedAsset.id,
                instruction: offerBriefInstruction,
              })

              const createAssetMarker = formatMayaToolMarker(
                "create_asset",
                [
                  generatedAsset.assetType,
                  encodeURIComponent(generatedAsset.title),
                  generatedAsset.id,
                  encodeURIComponent(generatedAsset.previewText),
                  encodeURIComponent(generatedAsset.url || ""),
                ].join("|"),
              )
              const editAssetMarker = formatMayaToolMarker(
                "edit_asset",
                `${generatedAsset.assetType}|${encodeURIComponent(generatedAsset.title)}`,
              )

              const stream = createUIMessageStream({
                originalMessages: validUIMessages as any,
                execute: ({ writer }) => {
                  const textPartId = `offer-brief-autodraft-${Date.now().toString(36)}`
                  writer.write({ type: "text-start", id: textPartId })
                  writer.write({
                    type: "text-delta",
                    id: textPartId,
                    delta:
                      `Love. I pulled your brand profile and memory, then drafted your page so we can refine it together.\n` +
                      `${createAssetMarker}\n` +
                      `${editAssetMarker}`,
                  })
                  writer.write({ type: "text-end", id: textPartId })
                },
              })

              return createUIMessageStreamResponse({ stream })
            }
          }

          const collectPayload = encodeOfferBriefCollectionPayload({
            assetType: "page",
            prefill: seededBrief.prefill,
            missingFields: seededBrief.missingFields,
          })
          const collectBriefMarker = formatMayaToolMarker("collect_offer_brief", collectPayload)
          const missingCount = seededBrief.missingFields.length
          const missingSummary = summarizeMissingOfferBriefFields(seededBrief.missingFields)
          const stream = createUIMessageStream({
            originalMessages: validUIMessages as any,
            execute: ({ writer }) => {
              const textPartId = `offer-brief-request-${Date.now().toString(36)}`
              writer.write({ type: "text-start", id: textPartId })
              writer.write({
                type: "text-delta",
                id: textPartId,
                delta:
                  (missingCount > 0
                    ? `I already know most of your brand. I only need ${missingSummary}. Fill those and I’ll build the page in your voice.\n`
                    : `I already pulled your profile and memory. Tweak anything below and I’ll build the page now.\n`) +
                  `${collectBriefMarker}`,
              })
              writer.write({ type: "text-end", id: textPartId })
            },
          })

          return createUIMessageStreamResponse({ stream })
        } catch (offerBriefSeedError) {
          console.error("[Maya Chat] Failed handling offer brief collection:", offerBriefSeedError)
        }
      }

      if (orchestration.kind === "asset_create") {
        if (orchestration.intent.assetType === "page" && !allowPageAssetsInChat) {
          return createLandingPagesPausedResponse(validUIMessages as UIMessage[])
        }

        try {
          if (
            orchestration.intent.assetType === "page" &&
            isMayaPageRendererV2Enabled(process.env.FEATURE_MAYA_PAGE_RENDERER_V2)
          ) {
            const landingSnapshot = await resolveMayaLandingSnapshot(dbUserId)
            if (landingSnapshot.missingCriticalFields.length > 0) {
              const mappedMissingFields = mapCriticalFieldsToOfferBriefFields(landingSnapshot.missingCriticalFields)
              const missingFieldsForForm =
                mappedMissingFields.length > 0 ? mappedMissingFields : mayaSnapshot.offerBrief.missingFields
              const prefillValues = {
                ...mayaSnapshot.offerBrief.prefill,
                offerType: mayaSnapshot.offerBrief.prefill.offerType || landingSnapshot.resolvedOffer,
                idealClient: mayaSnapshot.offerBrief.prefill.idealClient || landingSnapshot.resolvedAudience,
                transformation:
                  mayaSnapshot.offerBrief.prefill.transformation || landingSnapshot.resolvedTransformation,
                designStyle: mayaSnapshot.offerBrief.prefill.designStyle || landingSnapshot.resolvedStyle,
                proofPoints: mayaSnapshot.offerBrief.prefill.proofPoints || landingSnapshot.resolvedProofPoints,
                callToAction: mayaSnapshot.offerBrief.prefill.callToAction || landingSnapshot.resolvedCta,
              }
              const collectPayload = encodeOfferBriefCollectionPayload({
                assetType: "page",
                prefill: prefillValues,
                missingFields: missingFieldsForForm,
              })
              const collectBriefMarker = formatMayaToolMarker("collect_offer_brief", collectPayload)
              const missingSummary = summarizeMissingOfferBriefFields(missingFieldsForForm)
              const stream = createUIMessageStream({
                originalMessages: validUIMessages as any,
                execute: ({ writer }) => {
                  const textPartId = `offer-brief-v2-gate-${Date.now().toString(36)}`
                  writer.write({ type: "text-start", id: textPartId })
                  writer.write({
                    type: "text-delta",
                    id: textPartId,
                    delta: `I already pulled your profile and memory. I only need ${missingSummary} before I generate a high-converting page.\n${collectBriefMarker}`,
                  })
                  writer.write({ type: "text-end", id: textPartId })
                },
              })

              return createUIMessageStreamResponse({ stream })
            }
          }

          if (
            orchestration.intent.assetType === "calendar" &&
            !mayaSnapshot.offerBrief.hasCoreFields
          ) {
            const collectPayload = encodeOfferBriefCollectionPayload({
              assetType: "calendar",
              prefill: mayaSnapshot.offerBrief.prefill,
              missingFields: mayaSnapshot.offerBrief.missingFields,
            })
            const collectBriefMarker = formatMayaToolMarker("collect_offer_brief", collectPayload)
            const missingSummary = summarizeMissingOfferBriefFields(mayaSnapshot.offerBrief.missingFields)
            const stream = createUIMessageStream({
              originalMessages: validUIMessages as any,
              execute: ({ writer }) => {
                const textPartId = `calendar-brief-gate-${Date.now().toString(36)}`
                writer.write({ type: "text-start", id: textPartId })
                writer.write({
                  type: "text-delta",
                  id: textPartId,
                  delta:
                    `I can build this in your style. I only need ${missingSummary} before I generate your Instagram calendar.\n${collectBriefMarker}`,
                })
                writer.write({ type: "text-end", id: textPartId })
              },
            })

            return createUIMessageStreamResponse({ stream })
          }

          const generatedAsset = await createMayaGeneratedAsset({
            userId: dbUserId,
            assetType: orchestration.intent.assetType,
            instruction: orchestration.intent.instruction,
          })

          await persistMayaActiveAssetContext(dbUserId, {
            assetType: generatedAsset.assetType,
            assetLabel: generatedAsset.title,
            assetId: generatedAsset.id,
            instruction: orchestration.intent.instruction,
          })

          const createAssetMarker = formatMayaToolMarker(
            "create_asset",
            [
              generatedAsset.assetType,
              encodeURIComponent(generatedAsset.title),
              generatedAsset.id,
              encodeURIComponent(generatedAsset.previewText),
              encodeURIComponent(generatedAsset.url || ""),
            ].join("|"),
          )
          const editAssetMarker = formatMayaToolMarker(
            "edit_asset",
            `${generatedAsset.assetType}|${encodeURIComponent(generatedAsset.title)}`,
          )

          const gapParts: string[] = []
          if (generatedAsset.assetType === "calendar" && generatedAsset.previewData?.kind === "calendar") {
            const calendarPreview = generatedAsset.previewData
            const gapPosts = calendarPreview.posts.filter((p) => !p.imageUrl || p.imageUrl.trim() === "")
            if (gapPosts.length > 0) {
              const gapDayLabels = gapPosts.map((p) => p.dayLabel).filter(Boolean)
              if (gapDayLabels.length > 0) {
                const gapPayload = gapDayLabels.join("|")
                gapParts.push(
                  `\n\nYour calendar's ready. ${gapDayLabels.length} ${gapDayLabels.length === 1 ? "day doesn't" : "days don't"} have a photo yet — want me to create them?\n${formatMayaToolMarker("maya_gap_offer", gapPayload)}`,
                )
              }
            }
          }

          const stream = createUIMessageStream({
            originalMessages: validUIMessages as any,
            execute: ({ writer }) => {
              const textPartId = `asset-create-${Date.now().toString(36)}`
              writer.write({ type: "text-start", id: textPartId })
              writer.write({
                type: "text-delta",
                id: textPartId,
                delta:
                  `I've got your draft ready. You can tweak it right here.\n` +
                  `${createAssetMarker}\n` +
                  `${editAssetMarker}` +
                  gapParts.join(""),
              })
              writer.write({ type: "text-end", id: textPartId })
            },
          })

          void logAnalyticsEvent({
            eventName: "maya_asset_draft_created",
            userId: dbUserId,
            path: "/api/maya/chat",
            properties: {
              assetType: generatedAsset.assetType,
              source: "chat_first",
            },
          })
          void logAnalyticsEvent({
            eventName: "maya_structured_tool_executed",
            userId: dbUserId,
            path: "/api/maya/chat",
            properties: {
              assetType: generatedAsset.assetType,
              source: "asset_create",
            },
          })

          return createUIMessageStreamResponse({ stream })
        } catch (assetCreateError) {
          console.error("[Maya Chat] Failed to create asset draft:", assetCreateError)
          if (strictStructuredRouting) {
            void logAnalyticsEvent({
              eventName: "maya_structured_tool_blocked",
              userId: dbUserId,
              path: "/api/maya/chat",
              properties: {
                assetType: orchestration.intent.assetType,
                reason: "tool_failed",
                source: "asset_create",
              },
            })
            return createStructuredAssetBlockedResponse({
              validUIMessages: validUIMessages as UIMessage[],
              assetType: orchestration.intent.assetType,
              reason: "tool_failed",
              missingFields: [],
              recoveryHint: "Tap retry and I’ll generate this again in the template view.",
            })
          }
        }
      }

      if (orchestration.kind === "multi_step_asset_create") {
        if (orchestration.intents.some((intent) => intent.assetType === "page") && !allowPageAssetsInChat) {
          return createLandingPagesPausedResponse(validUIMessages as UIMessage[])
        }

        try {
          if (
            orchestration.intents.some((intent) => intent.assetType === "page") &&
            isMayaPageRendererV2Enabled(process.env.FEATURE_MAYA_PAGE_RENDERER_V2)
          ) {
            const landingSnapshot = await resolveMayaLandingSnapshot(dbUserId)
            if (landingSnapshot.missingCriticalFields.length > 0) {
              const mappedMissingFields = mapCriticalFieldsToOfferBriefFields(landingSnapshot.missingCriticalFields)
              const missingFieldsForForm =
                mappedMissingFields.length > 0 ? mappedMissingFields : mayaSnapshot.offerBrief.missingFields
              const collectPayload = encodeOfferBriefCollectionPayload({
                assetType: "page",
                prefill: {
                  ...mayaSnapshot.offerBrief.prefill,
                  offerType: mayaSnapshot.offerBrief.prefill.offerType || landingSnapshot.resolvedOffer,
                  idealClient: mayaSnapshot.offerBrief.prefill.idealClient || landingSnapshot.resolvedAudience,
                  transformation:
                    mayaSnapshot.offerBrief.prefill.transformation || landingSnapshot.resolvedTransformation,
                  designStyle: mayaSnapshot.offerBrief.prefill.designStyle || landingSnapshot.resolvedStyle,
                  proofPoints: mayaSnapshot.offerBrief.prefill.proofPoints || landingSnapshot.resolvedProofPoints,
                  callToAction: mayaSnapshot.offerBrief.prefill.callToAction || landingSnapshot.resolvedCta,
                },
                missingFields: missingFieldsForForm,
              })
              const collectBriefMarker = formatMayaToolMarker("collect_offer_brief", collectPayload)
              const missingSummary = summarizeMissingOfferBriefFields(missingFieldsForForm)
              const stream = createUIMessageStream({
                originalMessages: validUIMessages as any,
                execute: ({ writer }) => {
                  const textPartId = `offer-brief-v2-multistep-gate-${Date.now().toString(36)}`
                  writer.write({ type: "text-start", id: textPartId })
                  writer.write({
                    type: "text-delta",
                    id: textPartId,
                    delta: `Before I run the full multi-step build, I only need ${missingSummary} for the landing page step.\n${collectBriefMarker}`,
                  })
                  writer.write({ type: "text-end", id: textPartId })
                },
              })

              return createUIMessageStreamResponse({ stream })
            }
          }

          if (
            orchestration.intents.some((intent) => intent.assetType === "calendar") &&
            !mayaSnapshot.offerBrief.hasCoreFields
          ) {
            const collectPayload = encodeOfferBriefCollectionPayload({
              assetType: "calendar",
              prefill: mayaSnapshot.offerBrief.prefill,
              missingFields: mayaSnapshot.offerBrief.missingFields,
            })
            const collectBriefMarker = formatMayaToolMarker("collect_offer_brief", collectPayload)
            const missingSummary = summarizeMissingOfferBriefFields(mayaSnapshot.offerBrief.missingFields)
            const stream = createUIMessageStream({
              originalMessages: validUIMessages as any,
              execute: ({ writer }) => {
                const textPartId = `calendar-brief-multistep-gate-${Date.now().toString(36)}`
                writer.write({ type: "text-start", id: textPartId })
                writer.write({
                  type: "text-delta",
                  id: textPartId,
                  delta:
                    `Before I run the full multi-step build, I only need ${missingSummary} for the calendar step.\n${collectBriefMarker}`,
                })
                writer.write({ type: "text-end", id: textPartId })
              },
            })

            return createUIMessageStreamResponse({ stream })
          }

          const createdAssets: Array<Awaited<ReturnType<typeof createMayaGeneratedAsset>>> = []

          for (const intent of orchestration.intents) {
            const generatedAsset = await createMayaGeneratedAsset({
              userId: dbUserId,
              assetType: intent.assetType,
              instruction: intent.instruction,
            })
            createdAssets.push(generatedAsset)
          }

          const activeAsset = createdAssets[createdAssets.length - 1]
          if (activeAsset) {
            const activeIntent =
              orchestration.intents.find((intent) => intent.assetType === activeAsset.assetType) ||
              orchestration.intents[0]
            await persistMayaActiveAssetContext(dbUserId, {
              assetType: activeAsset.assetType,
              assetLabel: activeAsset.title,
              assetId: activeAsset.id,
              instruction: activeIntent?.instruction || activeAsset.instruction || latestStructuredUserText,
            })
          }

          const markers = createdAssets.flatMap((asset) => {
            const createAssetMarker = formatMayaToolMarker(
              "create_asset",
              [
                asset.assetType,
                encodeURIComponent(asset.title),
                asset.id,
                encodeURIComponent(asset.previewText),
                encodeURIComponent(asset.url || ""),
              ].join("|"),
            )
            const editAssetMarker = formatMayaToolMarker(
              "edit_asset",
              `${asset.assetType}|${encodeURIComponent(asset.title)}`,
            )
            return [createAssetMarker, editAssetMarker]
          })

          const gapParts: string[] = []
          const calendarAsset = createdAssets.find((a) => a.assetType === "calendar")
          if (calendarAsset?.previewData?.kind === "calendar") {
            const gapPosts = calendarAsset.previewData.posts.filter((p) => !p.imageUrl || p.imageUrl.trim() === "")
            if (gapPosts.length > 0) {
              const gapDayLabels = gapPosts.map((p) => p.dayLabel).filter(Boolean)
              if (gapDayLabels.length > 0) {
                gapParts.push(
                  `\n\nYour calendar's ready. ${gapDayLabels.length} ${gapDayLabels.length === 1 ? "day doesn't" : "days don't"} have a photo yet — want me to create them?\n${formatMayaToolMarker("maya_gap_offer", gapDayLabels.join("|"))}`,
                )
              }
            }
          }

          const stream = createUIMessageStream({
            originalMessages: validUIMessages as any,
            execute: ({ writer }) => {
              const textPartId = `asset-multistep-${Date.now().toString(36)}`
              writer.write({ type: "text-start", id: textPartId })
              writer.write({
                type: "text-delta",
                id: textPartId,
                delta:
                  `I built ${createdAssets.length} drafts for you. You can tweak any of them right here.\n` +
                  markers.join("\n") +
                  gapParts.join(""),
              })
              writer.write({ type: "text-end", id: textPartId })
            },
          })

          createdAssets.forEach((asset) => {
            void logAnalyticsEvent({
              eventName: "maya_asset_draft_created",
              userId: dbUserId,
              path: "/api/maya/chat",
              properties: {
                assetType: asset.assetType,
                source: "chat_first_multistep",
              },
            })
            void logAnalyticsEvent({
              eventName: "maya_structured_tool_executed",
              userId: dbUserId,
              path: "/api/maya/chat",
              properties: {
                assetType: asset.assetType,
                source: "multi_step_asset_create",
              },
            })
          })

          void logAnalyticsEvent({
            eventName: "maya_multi_step_executor_run",
            userId: dbUserId,
            path: "/api/maya/chat",
            properties: {
              stepCount: createdAssets.length,
              stepAssetTypes: createdAssets.map((asset) => asset.assetType),
            },
          })

          return createUIMessageStreamResponse({ stream })
        } catch (multiStepCreateError) {
          console.error("[Maya Chat] Failed multi-step asset creation:", multiStepCreateError)
          if (strictStructuredRouting) {
            const primaryAssetType = orchestration.intents[0]?.assetType || "calendar"
            void logAnalyticsEvent({
              eventName: "maya_structured_tool_blocked",
              userId: dbUserId,
              path: "/api/maya/chat",
              properties: {
                assetType: primaryAssetType,
                reason: "tool_failed",
                source: "multi_step_asset_create",
              },
            })
            return createStructuredAssetBlockedResponse({
              validUIMessages: validUIMessages as UIMessage[],
              assetType: primaryAssetType,
              reason: "tool_failed",
              missingFields: [],
              recoveryHint: "I can rerun the build now. Try again and I’ll keep it in template mode.",
            })
          }
        }
      }

      if (orchestration.kind === "asset_edit") {
        if (orchestration.intent.assetType === "page" && !allowPageAssetsInChat) {
          return createLandingPagesPausedResponse(validUIMessages as UIMessage[])
        }

        try {
          const updatedAsset = await updateMayaGeneratedAsset({
            userId: dbUserId,
            assetType: orchestration.intent.assetType,
            assetLabel: orchestration.intent.assetLabel,
            assetId: activeAssetContext?.assetId,
            instruction: orchestration.intent.instruction,
          })

          const persistedAsset = await persistMayaActiveAssetContext(dbUserId, {
            assetType: updatedAsset.assetType,
            assetLabel: updatedAsset.title,
            assetId: updatedAsset.id,
            instruction: orchestration.intent.instruction,
          })

          const encodedLabel = encodeURIComponent(persistedAsset.activeAsset.assetLabel)
          const editAssetMarker = formatMayaToolMarker(
            "edit_asset",
            `${persistedAsset.activeAsset.assetType}|${encodedLabel}`,
          )
          const createAssetMarker = formatMayaToolMarker(
            "create_asset",
            [
              updatedAsset.assetType,
              encodeURIComponent(updatedAsset.title),
              updatedAsset.id,
              encodeURIComponent(updatedAsset.previewText),
              encodeURIComponent(updatedAsset.url || ""),
            ].join("|"),
          )

          const actionVerb = orchestration.intent.mode === "continue" ? "Continuing" : "Starting"
          const stream = createUIMessageStream({
            originalMessages: validUIMessages as any,
            execute: ({ writer }) => {
              const textPartId = `asset-edit-${Date.now().toString(36)}`
              writer.write({ type: "text-start", id: textPartId })
              writer.write({
                type: "text-delta",
                id: textPartId,
                delta:
                  `${actionVerb} your ${persistedAsset.activeAsset.assetLabel} edits now. ` +
                  `I’ve updated the draft inline and kept this as your active workspace for the next tweak.\n` +
                  `${createAssetMarker}\n` +
                  editAssetMarker,
              })
              writer.write({ type: "text-end", id: textPartId })
            },
          })

          void logAnalyticsEvent({
            eventName: "maya_asset_draft_updated",
            userId: dbUserId,
            path: "/api/maya/chat",
            properties: {
              assetType: updatedAsset.assetType,
              source: "chat_first",
            },
          })
          void logAnalyticsEvent({
            eventName: "maya_structured_tool_executed",
            userId: dbUserId,
            path: "/api/maya/chat",
            properties: {
              assetType: updatedAsset.assetType,
              source: "asset_edit",
            },
          })

          return createUIMessageStreamResponse({ stream })
        } catch (assetPersistError) {
          console.error("[Maya Chat] Failed saving asset edit context:", assetPersistError)
          if (strictStructuredRouting) {
            void logAnalyticsEvent({
              eventName: "maya_structured_tool_blocked",
              userId: dbUserId,
              path: "/api/maya/chat",
              properties: {
                assetType: orchestration.intent.assetType,
                reason: "tool_failed",
                source: "asset_edit",
              },
            })
            return createStructuredAssetBlockedResponse({
              validUIMessages: validUIMessages as UIMessage[],
              assetType: orchestration.intent.assetType,
              reason: "tool_failed",
              missingFields: [],
              recoveryHint: "Share the exact change again and I’ll apply it to the active draft.",
            })
          }
        }
      }

      if (orchestration.kind === "tool_dispatch") {
        const hydratedIntent = hydrateMayaToolDispatchIntent(orchestration.intent, mayaSnapshot)
        const hydratedEstimatedCredits = estimateToolDispatchCredits(hydratedIntent)
        const requiresHydratedCreditCheck = hydratedEstimatedCredits > 0

        console.log("[Maya Chat] Phase 2 tool dispatcher matched intent:", {
          tool: hydratedIntent.tool,
          chatType,
          estimatedCredits: hydratedEstimatedCredits,
          recommendedSource: mayaSnapshot.generation.recommendedSource,
        })

        if (!isAdmin && requiresHydratedCreditCheck) {
          const hasCreditsForTool = await checkCredits(dbUserId, hydratedEstimatedCredits)
          if (!hasCreditsForTool) {
            void logAnalyticsEvent({
              eventName: "maya_tool_blocked_low_credits",
              userId: dbUserId,
              path: "/api/maya/chat",
              properties: {
                tool: hydratedIntent.tool,
                chatType,
                requiredCredits: hydratedEstimatedCredits,
              },
            })

            const stream = createUIMessageStream({
              originalMessages: validUIMessages as any,
              execute: ({ writer }) => {
                const textPartId = `tool-dispatch-low-credits-${Date.now().toString(36)}`
                writer.write({ type: "text-start", id: textPartId })
                writer.write({
                  type: "text-delta",
                  id: textPartId,
                  delta:
                    `Before I run this, you need at least ${hydratedEstimatedCredits} credit. ` +
                    `Add credits or upgrade, then I’ll launch it instantly.`,
                })
                writer.write({ type: "text-end", id: textPartId })
              },
            })

            return createUIMessageStreamResponse({ stream })
          }
        }

        void logAnalyticsEvent({
          eventName:
            hydratedIntent.tool === "show_capabilities"
              ? "maya_capabilities_opened"
              : "maya_tool_invoked",
          userId: dbUserId,
          path: "/api/maya/chat",
          properties: {
            tool: hydratedIntent.tool,
            chatType,
            estimatedCredits: hydratedEstimatedCredits,
          },
        })

        const stream = createUIMessageStream({
          originalMessages: validUIMessages as any,
          execute: ({ writer }) => {
            const textPartId = `tool-dispatch-${Date.now().toString(36)}`
            writer.write({ type: "text-start", id: textPartId })
            writer.write({ type: "text-delta", id: textPartId, delta: hydratedIntent.responseText })
            writer.write({ type: "text-end", id: textPartId })
          },
        })

        return createUIMessageStreamResponse({ stream })
      }

      if (strictStructuredRouting && orchestration.kind === "none") {
        const structuredIntent = detectMayaAssetIntentResult(latestStructuredUserText)
        if (structuredIntent && structuredIntent.intentClass !== "none" && structuredIntent.confidence >= 0.55) {
          void logAnalyticsEvent({
            eventName: "maya_structured_fallback_prevented",
            userId: dbUserId,
            path: "/api/maya/chat",
            properties: {
              assetType: structuredIntent.intentClass,
              confidence: structuredIntent.confidence,
              missingFields: structuredIntent.missingFields,
            },
          })

          return createStructuredAssetBlockedResponse({
            validUIMessages: validUIMessages as UIMessage[],
            assetType: structuredIntent.intentClass,
            reason: "intent_match_failed",
            missingFields: structuredIntent.missingFields,
            recoveryHint: "Try: Create a content calendar for my offer this week.",
          })
        }
      }
    }

    const uiMessagesForModel =
      imageContinuationEnabled && lastInlineImageContext && isCreativeTextContinuation
        ? attachLastInlineImageToLatestUserMessage({
            messages: validUIMessages as UIMessage[],
            imageContext: lastInlineImageContext,
            latestUserText: latestUserTextForSkills,
          })
        : (validUIMessages as UIMessage[])

    // Process UI messages to extract inspiration images from text markers (backward compatibility)
    // AND ensure image parts are properly formatted for AI SDK
    const messages: UIMessage[] = uiMessagesForModel.map((m: any) => {
      // Check if message has text content with inspiration image marker
      let textContent = ""
      if (m.parts && Array.isArray(m.parts)) {
        const textParts = m.parts.filter((p: any) => p && p.type === "text")
        textContent = textParts.map((p: any) => p.text || "").join("\n")
      } else if (typeof m.content === "string") {
        textContent = m.content
      }

      // Extract inspiration image URL from text if present
      const inspirationImageMatch = textContent.match(/\[Inspiration Image: (https?:\/\/[^\]]+)\]/)
      if (inspirationImageMatch && m.role === "user") {
        const imageUrl = inspirationImageMatch[1]
        const cleanedText = textContent.replace(/\[Inspiration Image: https?:\/\/[^\]]+\]/g, "").trim()
        
        // Check if image is already in parts
        const hasImageInParts = m.parts && Array.isArray(m.parts) && 
          m.parts.some((p: any) => p && (p.type === "image" || (p.type === "file" && p.mediaType?.startsWith("image/"))))
        
        if (!hasImageInParts) {
          // Add image to parts array
          const newParts = []
          if (cleanedText) {
            newParts.push({ type: "text", text: cleanedText })
          }
          newParts.push({ type: "image", image: imageUrl })
          
          debugLog("[Maya Chat API] Extracted inspiration image marker")
          return { ...m, parts: newParts }
        }
      }
      
      // CRITICAL FIX: Ensure image parts have the correct format for AI SDK
      // Sometimes image parts might have different property names
      if (m.parts && Array.isArray(m.parts) && m.role === "user") {
        const normalizedParts = m.parts
          .filter((p: any) => {
            // Filter out invalid part types
            if (!p || !p.type) return false
            // Filter out tool types (not supported in chat messages sent to AI SDK)
            if (p.type === "tool-result" || p.type === "tool-call" || (p.type && p.type.startsWith("tool-"))) {
              debugLog("[Maya Chat API] Dropping tool part from user message", p.type)
              return false
            }
            // Only allow text and image parts
            if (p.type !== "text" && p.type !== "image" && p.type !== "file") {
              debugLog("[Maya Chat API] Dropping unsupported part type", p.type)
              return false
            }
            return true
          })
          .map((p: any) => {
            if (p && p.type === "image") {
              // Ensure image URL is in the 'image' property
              const imageUrl = p.image || p.url || p.src || p.data
              if (imageUrl) {
                debugLog("[Maya Chat API] Normalizing image part")
                return { type: "image", image: imageUrl }
              }
            }
            // Ensure text parts have required properties
            if (p && p.type === "text") {
              return { type: "text", text: p.text || "" }
            }
            return p
          })
        
        // Only return modified message if parts were actually changed
        const partsChanged = normalizedParts.some((np: any, idx: number) => {
          const original = m.parts[idx]
          return np !== original && np.type === "image"
        })
        
        if (partsChanged) {
          return { ...m, parts: normalizedParts }
        }
      }
      
      return m
    })

    // 🔴 CRITICAL: Detect and extract guide prompt from user messages
    // Use validated/normalized messages array, not raw uiMessages
    let extractedGuidePrompt: string | null = null
    let guidePromptActive = false
    
    // Check all user messages for [USE_GUIDE_PROMPT] pattern
    // Use the validated and normalized messages array (not uiMessages which may contain invalid messages)
    for (const m of messages) {
      if (m.role === "user") {
        let messageText = ""
        
        // Extract text content from parts or content field
        if (m.parts && Array.isArray(m.parts)) {
          const textParts = m.parts.filter((p: any) => p && p.type === "text")
          messageText = textParts.map((p: any) => p.text || "").join(" ")
        } else if (typeof (m as any).content === "string") {
          messageText = (m as any).content
        } else if (Array.isArray((m as any).content)) {
          const textParts = (m as any).content.filter((p: any) => p && p.type === "text")
          messageText = textParts.map((p: any) => p.text || "").join(" ")
        }
        
        // Detect [USE_GUIDE_PROMPT] pattern (case-insensitive, multiline)
        const guidePromptMatch = messageText.match(/\[USE_GUIDE_PROMPT\]\s*([\s\S]*?)(?=\[|$)/i)
        if (guidePromptMatch && guidePromptMatch[1]) {
          extractedGuidePrompt = guidePromptMatch[1].trim()
          guidePromptActive = true
          debugLog("[Maya Chat API] Guide prompt detected", { length: extractedGuidePrompt.length })
          break // Use the most recent guide prompt
        }
        
        // Also check if user is clearing the guide prompt (asking for something different)
        const clearGuidePromptKeywords = /different|change|instead|new.*prompt|clear.*guide|stop.*using.*guide/i.test(messageText)
        if (clearGuidePromptKeywords && extractedGuidePrompt) {
          guidePromptActive = false
          debugLog("[Maya Chat API] Guide prompt clear intent detected")
        }
      }
    }
    
    const conversationSummary = uiMessages
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant"))
      .slice(-10) // Last 10 messages for context
      .map((m: any) => {
        const role = m.role === "user" ? "User" : "Maya"
        let content = ""

        // Extract text content from parts or content field
        if (m.parts && Array.isArray(m.parts)) {
          const textParts = m.parts.filter((p: any) => p.type === "text")
          content = textParts
            .map((p: any) => p.text)
            .join(" ")
            .substring(0, 200)
        } else if (typeof m.content === "string") {
          content = m.content.substring(0, 200)
        } else if (Array.isArray(m.content)) {
          // Handle array format (text + image)
          const textParts = m.content.filter((p: any) => p.type === "text")
          content = textParts
            .map((p: any) => p.text || "")
            .join(" ")
            .substring(0, 200)
        }

        // Strip trigger text and inspiration image markers from content
        content = content.replace(/\[GENERATE_CONCEPTS\][^\n]*/g, "").trim()
        content = content.replace(/\[Inspiration Image: https?:\/\/[^\]]+\]/g, "").trim()
        // Also strip guide prompt markers from conversation summary
        content = content.replace(/\[USE_GUIDE_PROMPT\]/gi, "").trim()
        content = stripMayaToolMarkers(content)

        return content ? `${role}: ${content}${content.length >= 200 ? "..." : ""}` : null
      })
      .filter(Boolean)
      .join("\n")
    
    // Add guide prompt info to conversation context if active
    // Include the actual guide prompt text so Maya knows what to use
    let enhancedConversationContext = conversationSummary
    if (extractedGuidePrompt && guidePromptActive) {
      enhancedConversationContext = `${conversationSummary}\n\n[GUIDE_PROMPT_ACTIVE: true]\n[GUIDE_PROMPT_TEXT: ${extractedGuidePrompt}]\n\n**CRITICAL:** The user has provided a detailed guide prompt above. When responding, reference the SPECIFIC elements they mentioned (outfit, location, lighting, camera specs, etc.). DO NOT use generic phrases - use their EXACT words and details.`
      debugLog("[Maya Chat API] Guide prompt added to context", { length: extractedGuidePrompt.length })
    }

    debugLog("[Maya Chat API] Conversation summary built", { length: conversationSummary.length })

    // 🔴 CRITICAL FIX: Filter out messages with empty content BEFORE normalization
    // AI SDK doesn't allow empty messages except for the optional final assistant message
    const messagesWithContent = messages.filter((m: any) => {
      if (!m || !m.role) return false
      
      // Check if message has any content
      let hasContent = false
      
      // Check parts array
      if (m.parts && Array.isArray(m.parts) && m.parts.length > 0) {
        // Check if any part has actual content
        hasContent = m.parts.some((p: any) => {
          if (p && p.type === "text" && p.text && p.text.trim().length > 0) return true
          if (p && (p.type === "image" || p.type === "file")) return true
          return false
        })
      }
      
      // Check content field
      if (!hasContent && typeof m.content === "string" && m.content.trim().length > 0) {
        hasContent = true
      }
      
      if (!hasContent) {
        debugLog("[Maya Chat API] Dropping empty-content message", { id: m.id || "unknown", role: m.role })
      }
      
      return hasContent
    })
    
    debugLog("[Maya Chat API] Messages with content", {
      input: messages.length,
      filtered: messagesWithContent.length,
    })
    
    // CRITICAL: Normalize messages to ensure they have 'parts' array format
    // convertToModelMessages expects messages with 'parts' array, not just 'content' field
    // CRITICAL: Remove 'content' field when creating 'parts' to avoid dual-field structure
    const normalizedMessages = messagesWithContent.map((m: any) => {
      // Skip normalization if message already has valid non-empty 'parts' array
      // Also remove 'content' field if present to avoid dual-field issues
      if (m.parts && Array.isArray(m.parts) && m.parts.length > 0) {
        const { content, ...rest } = m
        const sanitizedParts = m.parts
          .map((part: any) => {
            if (part?.type === "text" && typeof part?.text === "string") {
              const text = stripMayaToolMarkers(part.text)
              return text ? { ...part, text } : null
            }
            return part
          })
          .filter((part: any) => part !== null)
        if (sanitizedParts.length === 0) return null
        return { ...rest, parts: sanitizedParts } // Remove 'content' field if it exists
      }
      
      // If message has empty 'parts' array, skip it (should have been filtered above)
      // This should not happen after filtering, but add safety check
      if (m.parts && Array.isArray(m.parts) && m.parts.length === 0) {
        console.warn("[v0] ⚠️ Message with empty parts array passed filter (should not happen)")
        return null // Will be filtered out
      }
      
      // If message has 'content' field (string) but no 'parts', convert it to 'parts' format
      // Remove 'content' field to avoid dual-field structure that could confuse convertToModelMessages
      // Content should not be empty after filtering, but validate anyway
      if (typeof m.content === "string") {
        if (m.content.trim().length === 0) {
          console.warn("[v0] ⚠️ Message with empty string content passed filter (should not happen)")
          return null // Will be filtered out
        }
        const { content, ...rest } = m
        const sanitizedContent = stripMayaToolMarkers(content)
        if (!sanitizedContent) return null
        return {
          ...rest, // Preserve id, role, timestamp, and all other metadata (excluding content)
          parts: [{ type: "text", text: sanitizedContent }], // Convert content to parts format
        }
      }
      
      // If message has 'content' as array (already in parts-like format), convert to parts
      // Remove 'content' field to avoid dual-field structure
      // Empty arrays should have been filtered above
      if (Array.isArray(m.content)) {
        if (m.content.length === 0) {
          console.warn("[v0] ⚠️ Message with empty content array passed filter (should not happen)")
          return null // Will be filtered out
        }
        const { content, ...rest } = m
        const sanitizedParts = content
          .map((part: any) => {
            if (part?.type === "text" && typeof part?.text === "string") {
              const text = stripMayaToolMarkers(part.text)
              return text ? { ...part, text } : null
            }
            return part
          })
          .filter((part: any) => part !== null)
        if (sanitizedParts.length === 0) return null
        return {
          ...rest, // Preserve id, role, timestamp, and all other metadata (excluding content)
          parts: sanitizedParts, // Convert content array to parts
        }
      }
      
      // If message has neither 'parts' nor 'content', skip it (should have been filtered above)
      if (!m.parts && !m.content) {
        console.warn("[v0] ⚠️ Message with no parts or content passed filter (should not happen)")
        return null // Will be filtered out
      }
      
      // Keep message as-is if it doesn't match above patterns (should rarely happen)
      // But still remove 'content' if it exists alongside 'parts'
      if (m.content) {
        const { content, ...rest } = m
        return rest
      }
      
      return m
    }).filter((m: any) => m !== null) // Remove any null messages from normalization

    debugLog("[Maya Chat API] Normalized messages", { normalized: normalizedMessages.length })

    // Convert UI messages to model messages using AI SDK's convertToModelMessages
    // This properly handles images, text, and other content types
    let modelMessages: any[]
    try {
      modelMessages = await convertToModelMessages(normalizedMessages)
      
      // CRITICAL: Ensure modelMessages is always an array
      if (!Array.isArray(modelMessages)) {
        console.error("[v0] ⚠️ convertToModelMessages did not return an array:", typeof modelMessages, modelMessages)
        modelMessages = []
      }
    } catch (conversionError: any) {
      console.error("[v0] ⚠️ Error converting messages to model format:", conversionError)
      console.error("[v0] Messages that failed conversion:", JSON.stringify(normalizedMessages, null, 2))
      modelMessages = []
    }
    
    debugLog("[Maya Chat API] Converted model messages", {
      normalized: normalizedMessages.length,
      model: modelMessages.length,
    })
    
    // CRITICAL: Validate and filter model messages to ensure they're in correct format
    modelMessages = modelMessages.filter((m: any) => {
      if (!m || !m.role) {
        debugLog("[Maya Chat API] Dropping model message with missing role")
        return false
      }
      
      // Validate content structure
      if (m.content) {
        if (Array.isArray(m.content)) {
          // Check for invalid content types
          const hasInvalidTypes = m.content.some((c: any) => {
            if (!c || !c.type) return true
            // Only allow text, image, file types
            if (c.type !== "text" && c.type !== "image" && c.type !== "file") {
              debugLog("[Maya Chat API] Dropping model message with invalid content type", c.type)
              return true
            }
            // Validate text parts have text property
            if (c.type === "text" && typeof c.text !== "string") {
              debugLog("[Maya Chat API] Dropping model message with invalid text part")
              return true
            }
            return false
          })
          if (hasInvalidTypes) return false
        } else if (typeof m.content !== "string") {
          debugLog("[Maya Chat API] Dropping model message with invalid content shape", typeof m.content)
          return false
        }
      }
      
      return true
    })
    
    console.log("[v0] Validated", modelMessages.length, "valid model messages")
    
    // Log if any messages contain images (BEFORE conversion)
    messages.forEach((m, idx) => {
      if (m.parts && Array.isArray(m.parts)) {
        const imageParts = m.parts.filter((p: any) => p && (p.type === "image" || (p.type === "file" && p.mediaType?.startsWith("image/"))))
        if (imageParts.length > 0) {
          console.log("[v0] ✅ UI Message", idx, "contains", imageParts.length, "image(s)")
          imageParts.forEach((imgPart: any, imgIdx: number) => {
            const imgUrl = imgPart.image || imgPart.url || imgPart.src
            console.log("[v0]   - Image", imgIdx, "URL:", imgUrl?.substring(0, 100) + "...")
          })
        }
      }
    })
    
    // CRITICAL FIX: Manually ensure images are included in model messages
    // Sometimes convertToModelMessages might not properly handle image parts
    modelMessages = modelMessages.map((modelMsg: any, msgIdx: number) => {
      const originalUIMessage = messages[msgIdx]
      
      // Check if original UI message has image parts
      if (originalUIMessage && originalUIMessage.parts && Array.isArray(originalUIMessage.parts)) {
        const imageParts = originalUIMessage.parts.filter((p: any) => p && p.type === "image")
        
        if (imageParts.length > 0) {
          // Check if model message already has these images
          const hasImagesInModel = modelMsg.content && Array.isArray(modelMsg.content) && 
            modelMsg.content.some((c: any) => c && c.type === "image")
          
          if (!hasImagesInModel) {
            console.log("[v0] ⚠️ Model message missing images - manually adding them")
            
            // Build content array with text + images
            const contentParts: any[] = []
            
            // Add text content if it exists
            if (modelMsg.content) {
              if (typeof modelMsg.content === "string") {
                contentParts.push({ type: "text", text: modelMsg.content })
              } else if (Array.isArray(modelMsg.content)) {
                // Add existing content parts (text, etc.) - filter out invalid types
                modelMsg.content.forEach((c: any) => {
                  if (c && c.type && c.type !== "image" && c.type !== "tool-result" && c.type !== "tool-call") {
                    // Ensure text parts have required properties
                    if (c.type === "text" && c.text) {
                      contentParts.push({ type: "text", text: c.text })
                    } else if (c.type !== "text") {
                      contentParts.push(c)
                    }
                  }
                })
              }
            }
            
            // Add image parts
            imageParts.forEach((imgPart: any) => {
              const imageUrl = imgPart.image || imgPart.url || imgPart.src
              if (imageUrl) {
                contentParts.push({ type: "image", image: imageUrl })
                console.log("[v0] ✅ Manually added image to model message:", imageUrl.substring(0, 100) + "...")
              }
            })
            
            return {
              ...modelMsg,
              content: contentParts.length > 0 ? contentParts : modelMsg.content,
            }
          }
        }
      }
      
      return modelMsg
    })
    
    // Log if any MODEL messages contain images (AFTER manual fix)
    modelMessages.forEach((m: any, idx: number) => {
      if (m.content && Array.isArray(m.content)) {
        const imageContent = m.content.filter((c: any) => c && c.type === "image")
        if (imageContent.length > 0) {
          console.log("[v0] ✅ Model Message", idx, "contains", imageContent.length, "image(s) - WILL BE SENT TO CLAUDE")
          imageContent.forEach((imgContent: any, imgIdx: number) => {
            const imgUrl = imgContent.image || imgContent.url || imgContent.src
            console.log("[v0]   - Image", imgIdx, "URL:", imgUrl?.substring(0, 100) + "...")
          })
        } else {
          // Check if it's a string content (no images)
          if (typeof m.content === "string") {
            console.log("[v0] ⚠️ Model Message", idx, "has string content (no images)")
          }
        }
      } else if (typeof m.content === "string") {
        console.log("[v0] ⚠️ Model Message", idx, "has string content only (no images)")
      }
    })

    if (modelMessages.length === 0) {
      console.error("[v0] No valid messages after filtering")
      return NextResponse.json({ error: "No valid messages to process" }, { status: 400 })
    }

    const supabase = await createServerClient()

    console.log(
      "[v0] Maya chat API called with",
      modelMessages.length,
      "model messages (from",
      messages.length,
      "UI messages), chatId:",
      chatId,
    )
    console.log("[v0] User:", user.email, "ID:", user.id)

    // Get user context for personalization (uses effective user ID for impersonation support)
    const userContext = await getUserContextForMaya(userId)

    let userGender = "person"
    try {
      const genderResult = await sql`SELECT gender FROM users WHERE id = ${dbUserId} LIMIT 1`
      if (genderResult.length > 0 && genderResult[0].gender) {
        const dbGender = genderResult[0].gender.toLowerCase().trim()
        if (dbGender === "woman" || dbGender === "female") {
          userGender = "woman"
        } else if (dbGender === "man" || dbGender === "male") {
          userGender = "man"
        }
      }
    } catch (e) {
      console.error("[v0] Error fetching gender:", e)
    }

    // DETECT Studio Pro intent from last user message
    const lastUserMessage = uiMessages
      .filter((m: any) => m.role === "user")
      .slice(-1)[0]
    const lastMessageText = lastUserMessage?.content || 
      (lastUserMessage?.parts?.find((p: any) => p.type === "text")?.text || "")
    
    const studioProIntent = detectStudioProIntent(lastMessageText)
    const studioProHeader = req.headers.get("x-studio-pro-mode")
    // MODE SAFETY: When the UI sends an explicit toggle state, it must win over
    // intent detection. Otherwise "use my trained model" can be misread as Pro/Selfie.
    const hasExplicitStudioProHeader = studioProHeader === "true" || studioProHeader === "false"
    const headerStudioProMode = studioProHeader === "true"
    const resolvedStudioProIntent = hasExplicitStudioProHeader ? headerStudioProMode : studioProIntent.isStudioPro
    
    // CLASSIC MODE SAFETY: Log mode detection for debugging
    console.log("[STUDIO-PRO] Intent detection:", {
      isStudioPro: resolvedStudioProIntent,
      mode: studioProIntent.mode,
      confidence: studioProIntent.confidence,
      headerValue: studioProHeader,
      headerExplicit: hasExplicitStudioProHeader,
      headerStudioProMode,
    })

    // Check for prompt builder chat type first (highest priority)
    // Define isStudioProMode outside conditional so it's available for later use
    const isStudioProMode = chatType !== "prompt_builder" && resolvedStudioProIntent
    const academyPurchaseProduct = (req.headers.get("x-academy-product") || productFromBody || "").trim() || null
    const headerFirstTimeProductUser = req.headers.get("x-first-time-product-user") === "true"
    const firstTimeProductUser =
      typeof firstTimeProductUserFromBody === "boolean" ? firstTimeProductUserFromBody : headerFirstTimeProductUser
    const userMessageCount = Array.isArray(uiMessages)
      ? uiMessages.filter((message: any) => message?.role === "user").length
      : 0
    const isFirstUserMessage = userMessageCount <= 1
    const productGenerationPrompt =
      isStudioProMode && academyPurchaseProduct && firstTimeProductUser && isFirstUserMessage
        ? getProductGenerationPrompt(academyPurchaseProduct, {})
        : ""

    let systemPrompt: string
    if (chatType === "prompt_builder") {
      systemPrompt = PROMPT_BUILDER_SYSTEM
      console.log("[Maya Chat] Using Prompt Builder system prompt")
    } else if (useFeedPlannerContext && (isFeedTab || unifiedMayaUiEnabled)) {
      // 🔴 CRITICAL FIX: Only load feed planner context if BOTH conditions are true
      // This prevents the massive feed planner context (880+ lines) from leaking into regular Maya chat
      // Feed Planner Context: Add visual design guidance for feed creation
      // This context is essential for Maya to understand how to create Instagram feed strategies
      // It provides instructions on post types, visual composition, and feed planning
      // Note: Feed-specific handlers and trigger detection are in FeedTab component
      const { getFeedPlannerContextAddon } = await import("@/lib/maya/feed-planner-context")
      
      // Determine user's explicit mode selection (override auto-detection if toggle is set)
      // For Feed Planner, we check the header:
      // - Header "true" → User selected Pro Mode → ALL posts Pro Mode
      // - Header "false" → User selected Classic Mode → ALL posts Classic Mode
      // - Header not set/null → Auto-detect per post (default behavior)
      let userSelectedMode: "pro" | "classic" | null = null
      if (studioProHeader === "true") {
        userSelectedMode = "pro"
      } else if (studioProHeader === "false") {
        userSelectedMode = "classic"
      } else {
        // Header not set or undefined → Auto-detect (null)
        userSelectedMode = null
      }
      
      // Use new unified Maya system instead of old MAYA_SYSTEM_PROMPT
      // Default to Classic Mode if mode is null (auto-detect)
      const config = userSelectedMode === "pro" ? MAYA_PRO_CONFIG : MAYA_CLASSIC_CONFIG
      const unifiedSystemPrompt = getMayaSystemPrompt(config)
      
      // 🔴 CRITICAL FIX: APPEND feed planner context instead of PREPENDING
      // This ensures Maya's core personality comes FIRST and isn't overridden
      // Feed planner context should ADD to Maya's expertise, not replace it
      systemPrompt = unifiedSystemPrompt + "\n\n" + getFeedPlannerContextAddon(userSelectedMode)
      console.log("[Maya Chat] ✅✅✅ FEED PLANNER AESTHETIC EXPERTISE LOADED ✅✅✅", {
        chatType,
        isFeedTab,
        useFeedPlannerContext,
        userSelectedMode,
        studioProHeader,
        hasExplicitStudioProHeader,
        headerStudioProMode,
        systemPromptLength: systemPrompt.length,
        feedContextLength: getFeedPlannerContextAddon(userSelectedMode).length,
        unifiedSystemLength: unifiedSystemPrompt.length,
        contextOrder: "unified-system-first-then-feed-context",
        feedEntryMode: isFeedTab ? "feed_tab" : "inline_maya_chat",
        message: userSelectedMode === "pro" ? "User selected Pro Mode - all posts will be Pro" :
                 userSelectedMode === "classic" ? "User selected Classic Mode - all posts will be Classic" :
                 "Auto-detect mode per post (default - using Classic Mode config)"
      })
    } else if (chatType === "pro-photoshoot" || req.headers.get("x-pro-photoshoot") === "true") {
      // Pro Photoshoot Context: Add instructions for creating Pro Photoshoot prompts
      // This context helps Maya create custom prompts for Grid 1 (base prompt)
      // Grids 2-8 use universal prompts (not created by Maya)
      const { getProPhotoshootContextAddon } = await import("@/lib/maya/pro-photoshoot-context")
      
      // Use Pro Mode config (Pro Photoshoot is Pro Mode only)
      const config = MAYA_PRO_CONFIG
      const unifiedSystemPrompt = getMayaSystemPrompt(config)
      
      // Combine Pro Photoshoot context with unified system
      systemPrompt = getProPhotoshootContextAddon() + unifiedSystemPrompt
      console.log("[Maya Chat] ✅✅✅ PRO PHOTOSHOOT CONTEXT LOADED ✅✅✅", {
        chatType,
        hasHeader: req.headers.get("x-pro-photoshoot") === "true",
        systemPromptLength: systemPrompt.length,
        contextLength: getProPhotoshootContextAddon().length,
        unifiedSystemLength: unifiedSystemPrompt.length,
      })
    } else {
      // Use unified Maya system with mode-specific adapters
      // Note: getMayaSystemPrompt() includes MAYA_VOICE, MAYA_CORE_INTELLIGENCE,
      // and MAYA_PROMPT_PHILOSOPHY - no direct import needed
      const config = isStudioProMode ? MAYA_PRO_CONFIG : MAYA_CLASSIC_CONFIG
      systemPrompt = getMayaSystemPrompt(config)
      
      // 🔴 CRITICAL: Log when feed planner context is NOT loaded (regular Maya chat)
      // This helps track if feed planner context is leaking into regular chat
      console.log("[Maya Chat] ✅ Regular Maya Chat Mode (NO Feed Planner Context)", {
        chatType,
        isFeedTab,
        isStudioProMode,
        mode: isStudioProMode ? "PRO" : "CLASSIC",
        systemPromptLength: systemPrompt.length,
        contextType: "regular-maya-only",
        warning:
          isFeedTab && !isFeedPlannerChatType(chatType)
            ? "⚠️ isFeedTab=true but persisted chatType is not feed planner"
            : null,
      })
    }

    // Add user context to system prompt
    // Studio Pro mode: Add to Pro personality (which doesn't include it by default)
    // Classic mode: Add to standard personality (which also doesn't include it by default)
    // 🔴 CRITICAL FIX: Validate context size before adding to prevent "Payload Too Large" errors
    if (userContext) {
      const MAX_CONTEXT_LENGTH = 50000 // 50KB max
      let finalUserContext = userContext
      if (userContext.length > MAX_CONTEXT_LENGTH) {
        console.error(
          `[v0] ❌ ERROR: User context too large (${userContext.length} chars), truncating to prevent API error`
        )
        // This should have been caught in getUserContextForMaya, but add safety check here too
        finalUserContext = userContext.substring(0, MAX_CONTEXT_LENGTH) + "\n\n[Context truncated due to size]"
      }
      
      systemPrompt += `\n\n## USER CONTEXT (BRAND PROFILE / WIZARD)
${finalUserContext}

**CRITICAL - USE THEIR BRAND PROFILE:**
- This is their brand profile (wizard) data - their style preferences, brand story, aesthetic, and vision
- When creating concepts, reference their brand profile to make them feel personalized and aligned with their brand
- If they say "something that matches my brand" or ask for brand-aligned content, use this data actively
- Connect their current request to their brand story and aesthetic when relevant
- Show you understand their brand and vision - make them feel seen and understood
- Use this to enhance concepts, but always prioritize what they're asking for RIGHT NOW if it conflicts`
    }

    // Inject current mode context so Maya knows what generation mode is active
    // and can guide users to the MY MODEL ↔ SELFIE toggle when they ask for the other mode.
    if (!isPromptBuilder && !useFeedPlannerContext) {
      const modelAvailability = mayaSnapshot?.generation || {
        hasTrainedModel: false,
        canUseCustomModel: false,
        canUseSelfies: false,
      }

      if (isStudioProMode) {
        systemPrompt += `\n\n## CURRENT GENERATION MODE: SELFIE
The user is in **Selfie mode** — photos are generated using their linked reference selfies.
- When they ask for a photo, respond normally and use [GENERATE_CONCEPTS] with selfie-optimised prompts.
- Trained model available: ${modelAvailability.hasTrainedModel ? "yes" : "no"}.
- Selfie/reference uploads available: ${modelAvailability.canUseSelfies ? "yes" : "no"}.
- If they ask to "use my trained model", "use my custom model", or want their trained look AND they have a trained model, don't try to do it in this mode. Say warmly: "You're in Selfie mode right now. Tap **MY MODEL** in the mode toggle to switch, then I'll generate with your trained model."
- If they ask for a trained/custom model but no trained model is available, do not tell them to tap MY MODEL. Keep momentum: either create with Selfie mode if references are available, or guide them to Train once.
- Keep the redirect short — one sentence is enough. Never apologise, never over-explain.`
      } else {
        systemPrompt += `\n\n## CURRENT GENERATION MODE: MY MODEL
The user is in **My Model mode** — photos are generated using their trained custom look.
- When they ask for a photo, respond normally and use [GENERATE_CONCEPTS] with model-based prompts.
- If they ask to "use my selfies", "use my uploaded photos", or want selfie/reference-based generation, don't try to do it in this mode. Say warmly: "You're in My Model mode right now. Tap **SELFIE** in the mode toggle to switch, then I'll use your reference photos."
- If they don't have a trained model yet and ask for model-based generation, guide them: "You haven't trained a model yet. Head to the Train tab to set one up, or tap SELFIE to use your uploaded photos instead."
- Keep the redirect short — one sentence is enough. Never apologise, never over-explain.`
      }
    }

    if (!isPromptBuilder && activeMayaTab) {
      if (activeMayaTab === "photos") {
        systemPrompt += `\n\n## CURRENT MAYA SURFACE: PHOTOS
The user is inside the Photos tab.
- Your job here is image creation: photo concepts, visual direction, prompts, source choice, gallery reuse, and saving generated images.
- Do not build feed strategies, weekly plans, offer plans, or caption strategy inside Photos.
- If the user asks for planning, captions, offers, weekly content, or feed strategy, keep the reply short and use the tab handoff to Plan instead of answering the strategy here.
- Never tell the user to go to Photos while they are already in Photos.`
      } else if (activeMayaTab === "plan" || isPlanChatType(chatType)) {
        systemPrompt += `\n\n## CURRENT MAYA SURFACE: PLAN
The user is inside the Plan tab.
- Your job here is planning: next best move, weekly content, captions, offers, post order, photo direction, and what to do next.
- You may give photo directions, but do not generate new images in Plan.
- If the user asks to actually create/generate/make a photo, use the tab handoff to Photos.
- Never tell the user to go to Plan while they are already in Plan.`
      } else if (activeMayaTab === "videos") {
        systemPrompt += `\n\n## CURRENT MAYA SURFACE: VIDEOS
The user is inside the Videos tab.
- Keep the conversation focused on choosing an existing photo and turning it into motion.
- If the request is not video work, use the correct tab handoff instead of answering across surfaces.`
      }
    }

    if (productGenerationPrompt) {
      systemPrompt += `\n\n## Product Delivery Mode\n${productGenerationPrompt}`
      console.log("[Maya Chat] Activated first-time academy product generation prompt", {
        academyPurchaseProduct,
        firstTimeProductUser,
        isFirstUserMessage,
      })
    }

    if (enhancedConversationContext && enhancedConversationContext.length > 0) {
      systemPrompt += `\n\n## RECENT CONVERSATION HISTORY
You have been having an ongoing conversation with this user. Here's a summary of the recent exchange:

${enhancedConversationContext}

**CRITICAL - USE ACTUAL USER DETAILS:**
- DO NOT use generic template phrases like "cozy vibes", "warm firelight", "festive touches" unless the user actually said those words
- DO NOT paraphrase or summarize - use the EXACT details the user provided
- If the user gave a detailed prompt with specific elements (outfit, location, lighting, etc.), reference those EXACT elements in your response
- If the user mentioned "candy cane striped pajamas", say "candy cane striped pajamas" - don't say "cozy holiday outfit"
- If the user mentioned "50mm lens", reference "50mm lens" - don't say "professional photography"
- Reference the ACTUAL words and details from the conversation context above
- Be specific and accurate - match what the user actually said

**IMPORTANT:** 
- Reference previous topics naturally in your responses
- Remember what concepts you've already created together
- Build upon ideas you've discussed
- If the user mentions "that" or "it", refer to the context above to understand what they mean
- Maintain continuity in your creative direction
- Use the EXACT details from the conversation - don't generalize or use templates`
    }

    const genderSpecificExamples =
      userGender === "woman"
        ? `
**MAYA'S SIGNATURE VOICE - STYLING FOR WOMEN:**

User: "I want something confident and elegant"
Maya: "YES! 😍 I love this energy! I'm seeing you in powerful, elegant looks - think sophisticated pieces, that effortless confidence, and that refined aesthetic that's totally you...

[GENERATE_CONCEPTS] elegant confident editorial power feminine"

User: "Street style vibes"
Maya: "YES! 😍 Street style vibes are everything right now! I'm seeing you serving looks in the city - that effortless cool girl energy with edgy pieces that photograph beautifully against urban backdrops...

[GENERATE_CONCEPTS] street style urban edgy cool feminine"

User: "Something cozy for fall content"
Maya: "Love the cozy fall vibe! 🥰 Creating some concepts with warm textures, that perfect autumn light, and those effortless moments that feel so authentic...

[GENERATE_CONCEPTS] cozy autumn luxe warmth feminine"

**CRITICAL: When user provides detailed prompts, use their EXACT details:**
User: "Candy cane striped pajamas, chic bun with red velvet bow, 50mm lens, realistic skin texture"
Maya: "Perfect! 🎄 I'm loving this festive direction! Using your exact details - candy cane striped pajamas, chic bun with red velvet bow, 50mm lens, realistic skin texture. Creating your concepts now...

[GENERATE_CONCEPTS] christmas cozy holiday"
`
        : userGender === "man"
          ? `
**MAYA'S SIGNATURE VOICE - STYLING FOR MEN:**

User: "I want something confident and powerful"
Maya: "YES! 🔥 Love this energy! I'm seeing you in strong, confident looks - that powerful masculine vibe with pieces that command attention and feel totally authentic to you...

[GENERATE_CONCEPTS] powerful confident masculine editorial"

User: "Something relaxed but still stylish"
Maya: "Perfect! 🙌 I'm thinking elevated casual - looks good but feels effortless. That perfect balance of style and comfort. Let me create some ideas...

[GENERATE_CONCEPTS] relaxed masculine elevated casual"
`
          : `
**MAYA'S SIGNATURE VOICE:**

User: "I want something confident and elegant"
Maya: "YES! 😍 Love this energy! I'm seeing you in powerful, elegant looks that feel totally you - that refined aesthetic with effortless confidence...

[GENERATE_CONCEPTS] elegant confident editorial power"
`

    // Add concept generation instructions for both Classic and Studio Pro modes
    // In Studio Pro mode, concept cards are the primary way to create content
    systemPrompt += `\n\n## 🔴🔴🔴 CRITICAL - CHAT RESPONSE RULES (NOT PROMPT GENERATION) 🔴🔴🔴

**IMPORTANT: These rules ONLY apply to your CHAT RESPONSES to users. You have FULL CREATIVITY in the image generation PROMPTS you write.**

**IN YOUR CHAT RESPONSES:**
- Use simple, everyday language - talk like you're texting a friend
- Use the user's EXACT words when responding to them
- Don't add generic aesthetic phrases they didn't say
- Be warm, friendly, and use emojis

**IN YOUR IMAGE GENERATION PROMPTS:**
- Use your FULL creativity!
- Use phrases like "Scandinavian minimalism", "Nordic aesthetic", "clean lines", "neutral tones", "soft textures" - whatever creates the best image
- Be creative and descriptive - these prompts are for image generation, not chat
- NO restrictions on creative language in prompts - use whatever creates amazing images

**THE RULE FOR CHAT:**
1. Read their message. What did they ACTUALLY say?
2. Use THOSE exact words in your chat response. Don't add generic aesthetic terms they didn't say.
3. If they said "elegant", say "elegant" in your chat - don't say "quiet luxury elegance direction"
4. If they sent a quick prompt, use that prompt's words in your chat response
5. BUT in the prompts you generate (after [GENERATE_CONCEPTS]), use FULL creativity - "Scandinavian minimalism", "Nordic aesthetic", etc. are all allowed!

**BAD EXAMPLES (CHAT RESPONSE - DO NOT DO THIS):**
User: "elegant"
You: ❌ "Perfect! I'm loving this luxury quiet elegance direction! Creating sophisticated concepts with those elevated pieces..." (FORBIDDEN - user didn't say "luxury quiet elegance", they said "elegant")

User: "minimalism"
You: ❌ "YES! I'm loving this Scandinavian minimalism direction! Creating concepts..." (FORBIDDEN - user said "minimalism", not "Scandinavian minimalism direction")

**GOOD EXAMPLES (CHAT RESPONSE - DO THIS):**
User: "elegant"
You: ✅ "YES! 😍 I love this elegant vibe! Creating some concepts for you...

[GENERATE_CONCEPTS] elegant confident editorial power feminine"

User: "minimalism"
You: ✅ "YES! 😍 I love this minimalism vibe! Creating some concepts for you...

[GENERATE_CONCEPTS] minimalism scandinavian clean neutral feminine"

**KEY POINT:** Notice how in the chat response, we use their exact word "minimalism". But in the prompt (after [GENERATE_CONCEPTS]), we can use FULL creativity like "scandinavian clean neutral" - that's totally fine! The restrictions only apply to chat responses, not prompts.

## 🔴 CRITICAL: SMART INTENT DETECTION & DYNAMIC RESPONSES

**FIRST: Detect what the user wants using Claude's intelligence:**

**CONCEPT CARDS (Visual content generation):**
- User asks for: photos, images, concepts, looks, outfits, styles, visual content, carousels, reel covers, product photos
- User says: "make me", "create", "generate", "show me", "I want", "give me" + visual terms
- User sends quick prompts: "street style", "cozy fall", "elegant", "confident", "glamorous"
- User shares inspiration images
- **Response:** Short (2-3 sentences), warm, enthusiastic, acknowledge what they ACTUALLY said, then [GENERATE_CONCEPTS]

**CAPTIONS (Writing help):**
- User asks for: captions, copy, text, writing, hooks, "write me a caption", "write a caption"
- **Response:** ONE warm sentence (e.g. "Here's a caption for that —"), then on its own line: [GENERATE_CAPTIONS] context="<1-sentence topic summary>"
- Do NOT write the caption in chat — the card appears below automatically
- For editing/tone requests ("make it shorter", "more casual"): respond conversationally, no marker needed

**BRAINSTORMING (Creative thinking):**
- User asks: "what should I post?", "ideas", "brainstorm", "help me think", "what do you think?"
- User wants: strategy, planning, content ideas (not visual generation)
- **Response:** Be their creative partner - ask questions, explore ideas, be thorough

**JUST CHATTING (Conversation):**
- User asks: questions, advice, life talk, general conversation
- User wants: to talk, not create content
- **Response:** Be warm, friendly, helpful - match their energy

**🔴 CRITICAL RULES FOR ALL RESPONSES:**

1. **USE THE USER'S EXACT WORDS - NEVER PARAPHRASE:**
   - If user says "street style" → say "street style" (NOT "urban aesthetic" or "city vibes")
   - If user says "cozy fall" → say "cozy fall" (NOT "autumn warmth" or "seasonal comfort")
   - If user says "elegant" → say "elegant" (NOT "sophisticated" or "refined" unless they said that)
   - If user says "quiet luxury" → say "quiet luxury" (NOT "understated elegance" unless they said that)
   - **DO NOT use generic aesthetic terms** like "quiet luxury", "elevated pieces", "understated elegance" UNLESS the user actually said those exact words

2. **ACKNOWLEDGE WHAT THEY ACTUALLY SAID:**
   - Read their message carefully
   - Reference their specific words and details
   - Show you're listening by using their language
   - Don't replace their words with "better" synonyms

3. **DYNAMIC RESPONSES - NO TEMPLATES:**
   - Every response should be unique to what they said
   - Don't use the same phrases over and over
   - Adapt your language to match their request
   - If they're brief, be brief. If they're detailed, acknowledge the details.

## CONCEPT GENERATION TRIGGER
When the user wants to create visual concepts, photoshoot ideas, or asks you to generate content:

1. **FIRST: Read their message carefully** - what did they ACTUALLY say?
2. **ACKNOWLEDGE their exact words** - use their language, not generic replacements
3. Respond AS MAYA with your signature warmth, fashion vocabulary, and creative vision
4. **CRITICAL: Use the ACTUAL details from the user's request** - if they provided specific elements (outfit, location, lighting, camera specs), reference those EXACTLY in your response
5. **DO NOT use generic template phrases** - if the user said "candy cane striped pajamas", say "candy cane striped pajamas", not "cozy holiday outfit"
6. **DO NOT paraphrase** - use the user's exact words when they provided detailed prompts
7. **DO NOT use aesthetic terms they didn't say** - if they said "elegant", don't say "quiet luxury aesthetic" or "refined direction" unless they said that
8. Paint a vivid picture using the SPECIFIC details the user provided, not generic examples
9. Include fashion-specific details (fabrics, silhouettes, styling choices) APPROPRIATE FOR THE USER'S GENDER
10. Then include the trigger on its own line: [GENERATE_CONCEPTS] followed by 2-6 essence words

${genderSpecificExamples}

**VOICE RULES FOR CONCEPT GENERATION ONLY:**
- When generating concept cards: Keep responses SHORT (2-3 sentences), warm, enthusiastic, and get to the trigger quickly
- **FIRST: Read what they ACTUALLY said** - use their exact words, not generic replacements
- Use simple everyday language when describing the concept direction
- ALWAYS use 2-3 emojis from your approved set (😍🥰🥹🥳❤️😘👏🏻🙌🏻👀🙏🏼🌸🩷🖤💚💙🧡🤎💜💛💕💓💞💋💄)
- Show genuine excitement and enthusiasm!
- **Acknowledge what they ACTUALLY said** - reference their specific words, not generic aesthetic terms
- **Example:** User says "street style" → You: "YES! 😍 Street style vibes! I'm seeing you serving looks in the city..." (NOT "quiet luxury aesthetic" or "refined direction")

**🔴 CRITICAL - USE ACTUAL USER DETAILS (NOT TEMPLATES OR GENERIC PHRASES):**

**CHAT RESPONSE RULES (ONLY FOR YOUR MESSAGES TO USERS):**
- ❌ Don't add words the user didn't say in your chat response
- ❌ If user said "minimalism", don't say "Scandinavian minimalism direction" in your chat
- ❌ If user said "elegant", don't say "quiet luxury elegance direction" in your chat
- ✅ Use their exact words in your chat response
- ✅ Use simple, everyday language in your chat response

**PROMPT GENERATION RULES (FOR IMAGE GENERATION PROMPTS):**
- ✅ Use FULL creativity! "Scandinavian minimalism", "Nordic aesthetic", "clean lines", "neutral tones", "soft textures" - all allowed!
- ✅ Be creative and descriptive - use whatever creates amazing images
- ✅ NO restrictions on creative language in prompts

**ALWAYS DO THIS:**
- ✅ **Use the user's EXACT words** - if they said "candy cane striped pajamas", say "candy cane striped pajamas" (not "cozy holiday outfit")
- ✅ **Reference specific elements** - if they mentioned "50mm lens", reference "50mm lens" (not "professional photography")
- ✅ **DO NOT paraphrase or generalize** - use their exact details from the conversation context above
- ✅ **If user said "elegant"** → say "elegant" (NOT "refined" or "sophisticated" unless they said that)
- ✅ **If user said "minimalism" or "minimal"** → say "minimalism" or "minimal" in your CHAT RESPONSE (use their exact word)
- ✅ **BUT in your PROMPTS** (after [GENERATE_CONCEPTS]), you can use FULL creativity: "scandinavian minimalism", "nordic aesthetic", "clean lines", "neutral tones" - all allowed!
- ✅ **The key:** Simple language in chat, full creativity in prompts
- ✅ **If user said "street style"** → say "street style" (NOT "urban aesthetic" or "city vibes")
- ✅ **If user said "cozy fall"** → say "cozy fall" (NOT "autumn warmth")
- ✅ If the user provided a detailed guide prompt, acknowledge the SPECIFIC elements they mentioned using their EXACT words
- ✅ The examples above are just style guides - when the user provides actual details, use THOSE details, not the examples
- ✅ **Read their message first** - what did they ACTUALLY say? Use that language.

**FOR ALL OTHER CONVERSATIONS (Captions, Strategies, Advice, Life Talks):**
- Give FULL, DETAILED, and HELPFUL responses
- Use your built-in web search to research current Instagram best practices, caption formulas, storytelling techniques
- Share specific frameworks, examples, and actionable strategies
- Be thorough and insightful - this is where you shine!
- For captions: Research viral hooks, proven formulas, emotional storytelling patterns
- For strategy: Look up current trends, algorithm insights, growth tactics
- Paint the full picture with your expertise

**CRITICAL:**
- SHORT responses = Only when creating concept cards
- DETAILED responses = Everything else (captions, strategy, life advice, questions)
- ALWAYS use web search for Instagram strategy, captions, and best practices
- Sound like their excited friend AND their smart strategist

${isStudioProMode ? `\n\n## 🎨 STUDIO PRO MODE - CONCEPT CARDS (MANDATORY)
**CRITICAL:** In Studio Pro mode, you MUST ALWAYS use [GENERATE_CONCEPTS] to create concept cards, NOT [GENERATE_PROMPTS].

**Concept cards in Studio Pro mode:**
- Users can add their own reference images directly to each concept card
- Users can view and edit the prompts Maya generates
- Each concept card uses Maya's high-quality image path
- Concept cards are the primary way to create content in Studio Pro mode

**When user asks for content (photos, concepts, ideas, carousels, reel covers, etc.):**
1. Respond warmly and creatively (2-3 sentences MAX - keep it short)
2. **MUST include [GENERATE_CONCEPTS] trigger with 2-6 essence words**
3. **NEVER stop before including the trigger - it's required**
4. Concept cards will appear with image selection and prompt editing features

**Examples (notice how we use their EXACT words - NO GENERIC PHRASES):**

User: "I want something confident and elegant"
You: "YES! 😍 I love this energy! I'm seeing you in confident, elegant looks that feel totally you - that powerful vibe with effortless confidence...

[GENERATE_CONCEPTS] elegant confident editorial power feminine"

**NOT:** ❌ "Perfect! I'm loving this luxury quiet elegance direction! Creating sophisticated concepts with those elevated pieces..." (FORBIDDEN - user didn't say those words)

User: "street style"
You: "YES! 😍 Street style vibes are everything! I'm seeing you serving looks in the city - that effortless cool girl energy with edgy pieces that photograph beautifully against urban backdrops...

[GENERATE_CONCEPTS] street style urban edgy cool feminine"

**NOT:** ❌ "Perfect! I'm loving this urban aesthetic direction! Creating sophisticated concepts..." (FORBIDDEN - user said "street style", not "urban aesthetic")

User: "cozy fall"
You: "Love the cozy fall vibe! 🥰 Creating some concepts with warm textures, that perfect autumn light, and those effortless moments that feel so authentic...

[GENERATE_CONCEPTS] cozy autumn luxe warmth feminine"

**NOT:** ❌ "Perfect! I'm loving this refined cozy direction! Creating sophisticated concepts with elevated pieces..." (FORBIDDEN - user said "cozy fall", not "refined" or "elevated")

**🔴 CRITICAL:** We use their EXACT words. We NEVER add generic aesthetic terms like "quiet luxury", "refined direction", "elevated pieces", "understated elegance" unless they actually said those exact words.

**CRITICAL RULES:**
- ✅ ALWAYS end your response with [GENERATE_CONCEPTS] followed by essence words
- ✅ Keep your response SHORT (2-3 sentences) before the trigger
- ✅ ALWAYS use 2-3 emojis from your approved set (😍🥰🥹🥳❤️😘👏🏻🙌🏻👀🙏🏼🌸🩷🖤💚💙🧡🤎💜💛💕💓💞💋💄)
- ✅ Show genuine excitement and warmth
- ✅ Acknowledge what they said
- ❌ DO NOT use [GENERATE_PROMPTS] in Studio Pro mode
- ❌ DO NOT write full prompts in your response
- ❌ DO NOT stop before including the [GENERATE_CONCEPTS] trigger
- ❌ DO NOT use generic, cold responses - always be warm and enthusiastic` : ''}`

    if (productGenerationPrompt) {
      systemPrompt += `\n\n## 🔴 PRODUCT DELIVERY OVERRIDE (HIGHEST PRIORITY)
- Purchased product: ${academyPurchaseProduct}
- First-time product user: ${firstTimeProductUser ? "yes" : "no"}
- This is the first user message after purchase: ${isFirstUserMessage ? "yes" : "no"}
- You ALREADY KNOW what they purchased from context above.
- DO NOT ask what they bought.
- DO NOT redirect to another flow.
- Deliver the purchased artifact immediately in your first answer.`
    }

    const mayaSkillSelection = selectMayaSkill({
      latestUserText: latestUserTextForSkills,
      chatType,
      isStudioProMode,
    })
    systemPrompt += `\n\n## MAYA SKILL PACK (${mayaSkillSelection.skillId}:${mayaSkillSelection.version})
${mayaSkillSelection.promptAddendum}

You must apply this skill pack for prompt composition while preserving Maya's conversational voice.`

    // Inject Sandra's method knowledge + weekly ritual guidance
    const [hasMembershipForMethod, hasMasterclassPurchase] = await Promise.all([
      hasStudioMembership(dbUserId).catch(() => false),
      sql`SELECT 1 FROM payments WHERE user_id = ${dbUserId} AND product_type = 'masterclass' AND status = 'succeeded' LIMIT 1`
        .then((rows: unknown[]) => rows.length > 0)
        .catch(() => false),
    ])
    const methodDepth = resolveMethodDepth({
      hasMembership: hasMembershipForMethod,
      hasMasterclass: hasMasterclassPurchase,
    })
    const shouldLoadWeekPlanGuidance =
      activeMayaTab === "plan" ||
      isPlanChatType(chatType) ||
      isContentPlanningIntent(latestUserTextForSkills)
    if (shouldLoadWeekPlanGuidance) {
      systemPrompt += getWeekPlanSystemAddendum({ methodDepth })
    }

    const routingChatType = useFeedPlannerContext ? "feed_planner" : chatType
    const mayaTask = resolveMayaChatTask({
      chatType: routingChatType,
      isPromptBuilder,
      isStudioProMode,
      preferFeedPlannerContext: useFeedPlannerContext,
    })
    const selectedModel = getMayaModelForTask(mayaTask)
    const openRouterPrimaryModel = createMayaOpenRouterFallbackModel(mayaTask)
    const anthropicFallbackModel = createMayaAnthropicModel(mayaTask)
    // primaryModel: OpenRouter (Chat Completions) → direct Anthropic → raw string (last resort)
    const primaryModel = openRouterPrimaryModel ?? anthropicFallbackModel ?? getMayaGatewayModel(mayaTask)
    // gatewayFallbackModel: only relevant if primary throws at stream time
    const gatewayFallbackModel = openRouterPrimaryModel ? (anthropicFallbackModel ?? null) : null
    const maxTokens = getMayaMaxTokensForTask(mayaTask)
    console.log("[Maya Chat] Model routing:", {
      chatType,
      routingChatType,
      isPromptBuilder,
      isStudioProMode,
      skillId: mayaSkillSelection.skillId,
      skillSource: mayaSkillSelection.source,
      task: mayaTask,
      selectedModel,
      primaryProvider: openRouterPrimaryModel ? "openrouter" : "anthropic-gateway",
      hasGatewayFallback: !!gatewayFallbackModel,
    })

    let result
    try {
      result = streamText({
        model: primaryModel,
        system: systemPrompt,
        messages: modelMessages,
        maxTokens,
        temperature: 0.7, // Balanced creativity and consistency
      } as any)
    } catch (streamError) {
      console.error("[v0] Primary model call failed:", streamError)
      if (gatewayFallbackModel) {
        try {
          result = streamText({
            model: gatewayFallbackModel,
            system: systemPrompt,
            messages: modelMessages,
            maxTokens,
            temperature: 0.7,
          } as any)
          console.log("[Maya Chat] Gateway fallback activated for chat")
        } catch (fallbackError) {
          console.error("[v0] Gateway fallback failed:", fallbackError)
        }
      }

      if (result) {
        // Fallback succeeded
      } else {
        // If streamText fails (e.g., provider outage), return a streaming error response
        console.error("[v0] ❌ Returning Maya chat stream error response:", streamError)
        return createMayaChatErrorResponse(validUIMessages as UIMessage[], streamError)
      }
      
      // continue when fallback succeeds
    }

    // Save chat to database - ensure chat exists with correct chat_type
    try {
      let finalChatId = chatId

      // If no chatId, create/get active chat with correct chatType
      if (!finalChatId) {
        const activeChat = await getOrCreateActiveChat(dbUserId, chatType)
        finalChatId = activeChat.id
        console.log("[v0] Created/get active chat:", { chatId: finalChatId, chatType })
      }

      if (finalChatId && supabase) {
        const lastUserMessage = uiMessages.filter((m: { role: string }) => m.role === "user").pop()
        if (lastUserMessage) {
          // Extract text content for title
          let titleText = ""
          if (lastUserMessage.parts && Array.isArray(lastUserMessage.parts)) {
            const textParts = lastUserMessage.parts.filter((p: any) => p && p.type === "text")
            titleText = textParts.map((p: any) => p.text || "").join(" ")
          } else if (typeof lastUserMessage.content === "string") {
            titleText = lastUserMessage.content
          }
          // Remove inspiration image marker from title
          titleText = titleText.replace(/\[Inspiration Image: https?:\/\/[^\]]+\]/g, "").trim()
          
          // CRITICAL: Include chat_type in upsert so Feed Planner chats are saved correctly
          await supabase.from("maya_chats").upsert(
            {
              id: finalChatId,
              user_id: dbUserId,
              title: titleText.slice(0, 50) + (titleText.length > 50 ? "..." : ""),
              chat_type: chatType, // Include chat_type so chats are filtered correctly
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" },
          )
          console.log("[v0] ✅ Chat saved with chat_type:", { chatId: finalChatId, chatType })
        }
      }
    } catch (dbError) {
      console.error("[v0] Error saving chat:", dbError)
    }

    // Wrapped in try/catch to avoid breaking the stream if deduction fails
    try {
      const shouldDeductCredit = shouldDeductMayaChatCredit({
        isPromptBuilder,
        isAdmin,
        isStudioProMode,
      })

      if (shouldDeductCredit) {
        await deductCredits(
          dbUserId,
          1,
          "image", // Using "image" type as "maya_chat" is not in the enum
          "Maya conversation",
        )
        console.log("[v0] Successfully deducted 1 credit for Maya chat")
      } else {
        console.log("[v0] Skipping chat credit deduction", {
          reason: isPromptBuilder
            ? "prompt_builder"
            : isAdmin
              ? "admin_user"
              : isStudioProMode
                ? "studio_pro_mode"
                : "policy",
        })
      }
    } catch (deductError) {
      console.error("[v0] Failed to deduct credits for Maya chat (non-fatal):", deductError)
    }

    try {
      return result.toUIMessageStreamResponse({
        onError: normalizeMayaStreamErrorMessage,
      })
    } catch (streamResponseError) {
      // If converting to stream response fails (e.g., Gateway error during streaming)
      console.error("[v0] Error converting to stream response:", streamResponseError)
      return createMayaChatErrorResponse(validUIMessages as UIMessage[], streamResponseError)
    }
  } catch (error) {
    // Log detailed error information
    let errorMessage = "Failed to process chat"
    let errorDetails: any = {}
    
    if (error instanceof Error) {
      errorMessage = error.message
      errorDetails = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      }
      
      // Check for Gateway/AI Gateway errors
      if (errorMessage.includes("Gateway") || errorMessage.includes("gateway") || errorMessage.includes("AI Gateway")) {
        errorMessage = "AI service temporarily unavailable. Please try again in a moment."
        console.error("[v0] ❌ AI Gateway error detected:", {
          originalError: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
          suggestion: "Check AI_GATEWAY_API_KEY environment variable",
        })
      }
    } else if (error && typeof error === "object") {
      errorDetails = error
      errorMessage = (error as any).message || (error as any).error || errorMessage
    } else {
      errorMessage = String(error)
      errorDetails = { raw: error }
    }
    
    console.error("[v0] Maya chat error:", {
      error: errorMessage,
      details: errorDetails,
      timestamp: new Date().toISOString(),
    })
    
    // Return error response that useChat can handle
    // The AI SDK's useChat expects either a streaming response or a proper error response
    // When streamText fails, we return a JSON error that the client's onError handler will catch
    // The "Invalid error response format" occurs when the SDK tries to parse a non-streaming error as a stream
    // By returning a proper error response with status 500, the SDK should route it to onError
    return new Response(
      JSON.stringify({
        error: errorMessage,
        message: errorMessage,
        ...(process.env.NODE_ENV === "development" ? { details: errorDetails } : {}),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
  }
}
