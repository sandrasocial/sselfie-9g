import { CREDIT_COSTS } from "@/lib/credits"
import {
  detectMayaAssetCreateIntent,
  detectMayaAssetEditIntent,
  detectMayaRememberIntent,
  type MayaActiveAssetContext,
  type MayaAssetCreateIntent,
  type MayaAssetEditIntent,
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
