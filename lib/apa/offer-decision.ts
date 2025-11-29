/**
 * APA Offer Decision Engine
 *
 * DEPRECATED - Logic moved to /lib/automations/apaEngine.ts
 * This file kept for backwards compatibility
 *
 * See apaEngine.decideAPAAction() for full implementation
 */

import { decideAPAAction } from "@/lib/automations/apaEngine"

export function selectOffer({
  probability,
  nurture_stage,
  behavior_score,
  last_activity,
}: {
  probability: number
  nurture_stage: string
  behavior_score: number
  last_activity: string | null
}) {
  console.log("[APAOfferDecision] DEPRECATED - Use apaEngine.decideAPAAction() instead")

  // Delegate to new engine
  return decideAPAAction({
    id: 0,
    email: "",
    predicted_conversion_score: probability,
    predicted_conversion_window: "later",
    prediction_confidence: 50,
    nurture_stage,
    behavior_score,
    last_apa_action_at: last_activity ? new Date(last_activity) : null,
    apa_disabled: false,
    blueprint_completed_at: new Date(),
  })
}
