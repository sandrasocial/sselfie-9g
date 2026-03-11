/**
 * Canonical model-choice policy for Maya image generation.
 *
 * Resolves effective source (custom_model | selfies | base_model) from user
 * readiness and explicit selection. Used by chat orchestration, intent hydration,
 * and generation routes so UI and backend share one contract.
 *
 * Source semantics:
 * - custom_model: User's trained FLUX LoRA (Classic route). Requires hasTrainedModel.
 * - selfies: NanoBanana Pro with reference images (Pro route). Requires uploads.
 * - base_model: Base model only (Classic route without LoRA). Always available.
 * - choose_source: No explicit choice; use recommendedSource.
 */

import { CREDIT_COSTS } from "@/lib/credits"
import { getStudioProCreditCost } from "@/lib/nano-banana-client"

export type ModelChoiceSource = "selfies" | "custom_model" | "base_model" | "choose_source"

export interface ModelChoiceReadiness {
  hasTrainedModel: boolean
  canUseSelfies: boolean
}

export interface ResolveModelChoiceParams {
  readiness: ModelChoiceReadiness
  /** Explicit user/session selection; omit for server recommendation only */
  selectedSource?: ModelChoiceSource | null
}

export interface ModelChoiceResult {
  /** Source to use for this generation (never choose_source) */
  effectiveSource: "selfies" | "custom_model" | "base_model"
  /** True if effectiveSource matches what user asked for (or recommended) */
  available: boolean
  /** When available is false: reason for fallback, for user-facing message */
  fallbackReason?: "training_required" | "no_selfies" | "recommended"
  /** Server-side default when user has not chosen (for choose_source) */
  recommendedSource: "selfies" | "custom_model" | "base_model"
}

/**
 * Recommended source when user has not made an explicit choice.
 * Prefer custom model if trained, else selfies if uploads exist, else base model.
 */
export function getRecommendedSource(readiness: ModelChoiceReadiness): "selfies" | "custom_model" | "base_model" {
  if (readiness.hasTrainedModel) return "custom_model"
  if (readiness.canUseSelfies) return "selfies"
  return "base_model"
}

/**
 * Resolve effective generation source from readiness and optional explicit selection.
 * Returns effectiveSource (never choose_source), availability, and optional fallback reason.
 */
export function resolveModelChoice(params: ResolveModelChoiceParams): ModelChoiceResult {
  const { readiness, selectedSource } = params
  const recommendedSource = getRecommendedSource(readiness)

  const effective = selectedSource && selectedSource !== "choose_source" ? selectedSource : recommendedSource

  // custom_model requires trained model
  if (effective === "custom_model") {
    if (!readiness.hasTrainedModel) {
      return {
        effectiveSource: readiness.canUseSelfies ? "selfies" : "base_model",
        available: false,
        fallbackReason: "training_required",
        recommendedSource,
      }
    }
    return { effectiveSource: "custom_model", available: true, recommendedSource }
  }

  // selfies requires uploads (availability = can run now)
  if (effective === "selfies") {
    const available = readiness.canUseSelfies
    return {
      effectiveSource: available ? "selfies" : recommendedSource,
      available,
      fallbackReason: available ? undefined : "no_selfies",
      recommendedSource,
    }
  }

  // base_model always available
  return {
    effectiveSource: "base_model",
    available: true,
    recommendedSource,
  }
}

/** Credit cost for image generation by effective source. Classic = 1, Pro (selfies) = 2 (default 2K). */
export function getCreditCostForSource(
  source: "selfies" | "custom_model" | "base_model",
  resolution?: "1K" | "2K" | "4K",
): number {
  if (source === "selfies") {
    return getStudioProCreditCost(resolution ?? "2K")
  }
  return CREDIT_COSTS.IMAGE
}
