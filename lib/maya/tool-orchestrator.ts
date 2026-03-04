import { CREDIT_COSTS } from "@/lib/credits"
import {
  detectMayaAssetCreateIntent,
  detectMayaAssetEditIntent,
  detectMayaRememberIntent,
  type MayaActiveAssetContext,
  type MayaAssetCreateIntent,
  type MayaAssetEditIntent,
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
      kind: "asset_edit"
      intent: MayaAssetEditIntent
    }
  | {
      kind: "asset_create"
      intent: MayaAssetCreateIntent
    }
  | {
      kind: "multi_step_asset_create"
      intents: MayaAssetCreateIntent[]
    }
  | {
      kind: "tool_dispatch"
      intent: MayaToolDispatchIntent
      estimatedCredits: number
      requiresCreditCheck: boolean
    }
  | {
      kind: "none"
      reason: "empty_text" | "no_match"
    }

export function estimateToolDispatchCredits(intent: MayaToolDispatchIntent): number {
  if (intent.tool !== "generate_image") return 0
  if (!intent.source || intent.source === "choose_source") return 0
  return CREDIT_COSTS.IMAGE
}

const CREATE_ACTION_REGEX = /\b(create|build|generate|make|draft|design|write|need|want)\b/i
const MULTI_STEP_CONNECTOR_REGEX = /\b(and then|after that|then|also|plus|and)\b/i
const PAGE_ASSET_REGEX = /\b(landing page|sales page|homepage|strategy page|web page|page)\b/i
const CALENDAR_ASSET_REGEX = /\b(content calendar|calendar|feed planner|planner|schedule)\b/i
const PDF_ASSET_REGEX = /\b(pdf|workbook|ebook|guide|cheatsheet|download)\b/i

function buildMultiStepInstruction(assetType: MayaAssetType, userText: string): string {
  if (assetType === "calendar") {
    return `Create a content calendar draft based on this request: ${userText}`
  }
  if (assetType === "pdf") {
    return `Create a workbook PDF draft based on this request: ${userText}`
  }
  return `Create a landing page draft based on this request: ${userText}`
}

function detectMultiAssetCreateIntents(userText: string): MayaAssetCreateIntent[] {
  if (!CREATE_ACTION_REGEX.test(userText)) return []
  if (!MULTI_STEP_CONNECTOR_REGEX.test(userText)) return []

  const detectedTypes: MayaAssetType[] = []
  if (PAGE_ASSET_REGEX.test(userText)) detectedTypes.push("page")
  if (CALENDAR_ASSET_REGEX.test(userText)) detectedTypes.push("calendar")
  if (PDF_ASSET_REGEX.test(userText)) detectedTypes.push("pdf")

  const uniqueTypes = Array.from(new Set(detectedTypes))
  if (uniqueTypes.length < 2) return []

  return uniqueTypes.map((assetType) => ({
    assetType,
    instruction: buildMultiStepInstruction(assetType, userText),
  }))
}

export function orchestrateMayaTurn(input: {
  userText: string
  activeAssetContext: MayaActiveAssetContext | null
}): MayaTurnAction {
  const normalizedText = input.userText.trim()
  if (!normalizedText) {
    return { kind: "none", reason: "empty_text" }
  }

  const rememberIntent = detectMayaRememberIntent(normalizedText)
  if (rememberIntent) {
    return {
      kind: "remember",
      intent: rememberIntent,
    }
  }

  const assetEditIntent = detectMayaAssetEditIntent(normalizedText, input.activeAssetContext)
  if (assetEditIntent) {
    return {
      kind: "asset_edit",
      intent: assetEditIntent,
    }
  }

  const multiAssetCreateIntents = detectMultiAssetCreateIntents(normalizedText)
  if (multiAssetCreateIntents.length > 1) {
    return {
      kind: "multi_step_asset_create",
      intents: multiAssetCreateIntents,
    }
  }

  const assetCreateIntent = detectMayaAssetCreateIntent(normalizedText)
  if (assetCreateIntent) {
    return {
      kind: "asset_create",
      intent: assetCreateIntent,
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

  return {
    kind: "none",
    reason: "no_match",
  }
}
