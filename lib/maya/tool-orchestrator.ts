import { CREDIT_COSTS } from "@/lib/credits"
import { getCreditCostForSource } from "@/lib/maya/model-choice-policy"
import {
  detectMayaAssetCreateIntent,
  detectMayaAssetIntentResult,
  detectMayaAssetEditIntent,
  detectMayaRememberIntent,
  type MayaActiveAssetContext,
  type MayaAssetCreateIntent,
  type MayaAssetEditIntent,
  type MayaAssetIntentClass,
  type MayaAssetType,
  type MayaRememberIntent,
} from "@/lib/maya/memory-layer"
import {
  detectMayaToolDispatchIntent,
  type MayaToolDispatchIntent,
} from "@/lib/maya/intent-dispatcher"

export type MayaTurnAction =
  | {
      kind: "remember"
      intent: MayaRememberIntent
    }
  | {
      kind: "page_generation_paused"
      reason: "chat_page_flow_disabled"
    }
  | {
      kind: "asset_edit"
      intent: MayaAssetEditIntent
      executionMode: "tool"
      requiresStructuredRender: true
    }
  | {
      kind: "asset_create"
      intent: MayaAssetCreateIntent
      executionMode: "tool"
      requiresStructuredRender: true
    }
  | {
      kind: "multi_step_asset_create"
      intents: MayaAssetCreateIntent[]
      executionMode: "tool"
      requiresStructuredRender: true
    }
  | {
      kind: "collect_offer_brief"
      assetType: "page"
      executionMode: "tool"
      requiresStructuredRender: false
    }
  | {
      kind: "tool_dispatch"
      intent: MayaToolDispatchIntent
      estimatedCredits: number
      requiresCreditCheck: boolean
    }
  | {
      kind: "structured_asset_blocked"
      intentClass: Exclude<MayaAssetIntentClass, "none">
      executionMode: "blocked"
      requiresStructuredRender: true
      errorReason: "intent_match_failed" | "tool_failed" | "validation_failed"
      missingFields: Array<"action_verb" | "asset_target">
      recoveryHint: string
    }
  | {
      kind: "none"
      reason: "empty_text" | "no_match"
    }

export function estimateToolDispatchCredits(intent: MayaToolDispatchIntent): number {
  if (intent.tool === "generate_image") {
    if (!intent.source || intent.source === "choose_source") return 0
    return getCreditCostForSource(intent.source)
  }

  if (intent.tool === "generate_video") {
    return CREDIT_COSTS.ANIMATION
  }

  return 0
}

const CREATE_ACTION_REGEX = /\b(create|build|generate|make|draft|design|write)\b/i
const MULTI_STEP_CONNECTOR_REGEX = /\b(and then|after that|then|also|plus|and)\b/i
const PAGE_ASSET_REGEX = /\b(landing page|landing pages|sales page|sales pages|homepage|home page|strategy page|strategy pages|web page|web pages)\b/i
const PAGE_ASSET_STRICT_REGEX = /\b(landing page|landing pages|sales page|sales pages|homepage|home page|strategy page|strategy pages|web page|web pages)\b/i
const CALENDAR_ASSET_REGEX = /\b(content calendar|calendar|feed planner|planner|schedule)\b/i
const PAGE_HELP_ACTION_REGEX = /\b(help|improve|optimi[sz]e|review|launch|fix)\b/i
const BRIEF_HAS_OFFER_REGEX = /\b(course|coaching|service|product|membership|program|workshop|template|offer)\b/i
const BRIEF_HAS_OUTCOME_REGEX = /\b(transform|transformation|result|outcome|help.*(?:achieve|get)|promise|benefit)\b/i
const BRIEF_HAS_AUDIENCE_REGEX =
  /\b(ideal client|target audience|for women|for moms|for creators|for founders|for coaches|for freelancers|for entrepreneurs|for consultants)\b/i
const BRIEF_HAS_PRICE_REGEX = /(?:€|\$|kr|usd|eur|\bprice\b|\bpriced\b|\b\d{2,4}\b)/i

function needsLandingPageBrief(userText: string): boolean {
  if (!PAGE_ASSET_REGEX.test(userText)) return false

  let signals = 0
  if (BRIEF_HAS_OFFER_REGEX.test(userText)) signals += 1
  if (BRIEF_HAS_OUTCOME_REGEX.test(userText)) signals += 1
  if (BRIEF_HAS_AUDIENCE_REGEX.test(userText)) signals += 1
  if (BRIEF_HAS_PRICE_REGEX.test(userText)) signals += 1

  return signals < 3
}

function buildMultiStepInstruction(assetType: MayaAssetType, userText: string): string {
  if (assetType === "calendar") {
    return `Create a content calendar draft based on this request: ${userText}`
  }
  return `Create a landing page draft based on this request: ${userText}`
}

function detectMultiAssetCreateIntents(userText: string): MayaAssetCreateIntent[] {
  if (!CREATE_ACTION_REGEX.test(userText)) return []
  if (!MULTI_STEP_CONNECTOR_REGEX.test(userText)) return []

  const detectedTypes: MayaAssetType[] = []
  if (PAGE_ASSET_REGEX.test(userText)) detectedTypes.push("page")
  if (CALENDAR_ASSET_REGEX.test(userText)) detectedTypes.push("calendar")

  const uniqueTypes = Array.from(new Set(detectedTypes))
  if (uniqueTypes.length < 2) return []

  return uniqueTypes.map((assetType) => ({
    assetType,
    instruction: buildMultiStepInstruction(assetType, userText),
  }))
}

function detectImplicitPageIntent(userText: string): MayaAssetCreateIntent | null {
  if (!PAGE_ASSET_STRICT_REGEX.test(userText)) return null
  if (!PAGE_HELP_ACTION_REGEX.test(userText) && !CREATE_ACTION_REGEX.test(userText)) return null

  return {
    assetType: "page",
    instruction: buildMultiStepInstruction("page", userText),
  }
}

export function orchestrateMayaTurn(input: {
  userText: string
  activeAssetContext: MayaActiveAssetContext | null
  options?: {
    allowPageAssetsInChat?: boolean
  }
}): MayaTurnAction {
  const normalizedText = input.userText.trim()
  if (!normalizedText) {
    return { kind: "none", reason: "empty_text" }
  }
  const allowPageAssetsInChat = input.options?.allowPageAssetsInChat ?? false

  const rememberIntent = detectMayaRememberIntent(normalizedText)
  if (rememberIntent) {
    return {
      kind: "remember",
      intent: rememberIntent,
    }
  }

  const toolIntent = detectMayaToolDispatchIntent(normalizedText)
  if (toolIntent) {
    const estimatedCredits = estimateToolDispatchCredits(toolIntent)
    return {
      kind: "tool_dispatch",
      intent: toolIntent,
      estimatedCredits,
      requiresCreditCheck: estimatedCredits > 0,
    }
  }

  const assetEditIntent = detectMayaAssetEditIntent(normalizedText, input.activeAssetContext)
  if (assetEditIntent) {
    if (assetEditIntent.assetType === "page") {
      return {
        kind: "page_generation_paused",
        reason: "chat_page_flow_disabled",
      }
    }
    return {
      kind: "asset_edit",
      intent: assetEditIntent,
      executionMode: "tool",
      requiresStructuredRender: true,
    }
  }

  const multiAssetCreateIntents = detectMultiAssetCreateIntents(normalizedText)
  if (multiAssetCreateIntents.length > 1) {
    if (!allowPageAssetsInChat || multiAssetCreateIntents.some((intent) => intent.assetType === "page")) {
      const nonPageIntents = multiAssetCreateIntents.filter((intent) => intent.assetType !== "page")
      if (nonPageIntents.length > 1) {
        return {
          kind: "multi_step_asset_create",
          intents: nonPageIntents,
          executionMode: "tool",
          requiresStructuredRender: true,
        }
      }
      if (nonPageIntents.length === 1) {
        return {
          kind: "asset_create",
          intent: nonPageIntents[0],
          executionMode: "tool",
          requiresStructuredRender: true,
        }
      }
      return {
        kind: "page_generation_paused",
        reason: "chat_page_flow_disabled",
      }
    }
    return {
      kind: "multi_step_asset_create",
      intents: multiAssetCreateIntents,
      executionMode: "tool",
      requiresStructuredRender: true,
    }
  }

  const assetCreateIntent = detectMayaAssetCreateIntent(normalizedText)
  if (assetCreateIntent) {
    if (assetCreateIntent.assetType === "pdf") {
      return {
        kind: "none",
        reason: "no_match",
      }
    }

    if (assetCreateIntent.assetType === "page") {
      return {
        kind: "page_generation_paused",
        reason: "chat_page_flow_disabled",
      }
    }

    return {
      kind: "asset_create",
      intent: assetCreateIntent,
      executionMode: "tool",
      requiresStructuredRender: true,
    }
  }

  const implicitPageIntent = detectImplicitPageIntent(normalizedText)
  if (implicitPageIntent) {
    return {
      kind: "page_generation_paused",
      reason: "chat_page_flow_disabled",
    }
  }

  const structuredIntent = detectMayaAssetIntentResult(normalizedText)
  if (structuredIntent.intentClass !== "none" && structuredIntent.confidence >= 0.55) {
    return {
      kind: "structured_asset_blocked",
      intentClass: structuredIntent.intentClass,
      executionMode: "blocked",
      requiresStructuredRender: true,
      errorReason: "intent_match_failed",
      missingFields:
        structuredIntent.missingFields.length > 0 ? structuredIntent.missingFields : ["action_verb"],
      recoveryHint: "Tell me exactly what to build, for example: Create a content calendar for my offer.",
    }
  }

  return {
    kind: "none",
    reason: "no_match",
  }
}
