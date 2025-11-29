/**
 * APA Decision Engine
 * Part 2 - Full Business Logic Implementation
 *
 * Determines which offer to send based on subscriber signals
 */

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface APADecision {
  action: "send_offer" | "skip"
  offer_type: "studio" | "starter" | "trial" | "none"
  reason: string
  should_queue: boolean
}

export interface SubscriberInput {
  id: number
  email: string
  predicted_conversion_score: number | null
  predicted_conversion_window: string | null
  prediction_confidence: number | null
  nurture_stage: string | null
  behavior_score: number | null
  last_apa_action_at: Date | null
  apa_disabled: boolean
  blueprint_completed_at: Date | null
}

/**
 * Main APA Decision Logic
 *
 * Rule 1: Skip if disabled
 * Rule 2: Skip if offer sent recently (< 4 days)
 * Rule 3: Decision logic based on prediction
 * Rule 4: Return structured action
 */
export async function decideAPAAction(subscriber: SubscriberInput): Promise<APADecision> {
  // Rule 1: Skip if disabled
  if (subscriber.apa_disabled) {
    return {
      action: "skip",
      offer_type: "none",
      reason: "APA disabled for this subscriber",
      should_queue: false,
    }
  }

  // Rule 2: Skip if offer sent recently
  if (subscriber.last_apa_action_at) {
    const daysSinceLastAction = Math.floor(
      (Date.now() - new Date(subscriber.last_apa_action_at).getTime()) / (1000 * 60 * 60 * 24),
    )
    if (daysSinceLastAction < 4) {
      return {
        action: "skip",
        offer_type: "none",
        reason: `Last APA action was ${daysSinceLastAction} days ago (minimum 4 days)`,
        should_queue: false,
      }
    }
  }

  // Rule 3: Decision logic based on prediction
  const score = subscriber.predicted_conversion_score || 0
  const window = subscriber.predicted_conversion_window || "later"
  const stage = subscriber.nurture_stage || "cold"

  // High probability + immediate window → Studio Offer
  if (score >= 70 && window === "immediate") {
    return {
      action: "send_offer",
      offer_type: "studio",
      reason: "High conversion probability (≥70%) with immediate buying intent",
      should_queue: true,
    }
  }

  // Medium probability + soon window → Starter Offer
  if (score >= 50 && window === "soon") {
    return {
      action: "send_offer",
      offer_type: "starter",
      reason: "Medium conversion probability (50-69%) with near-term interest",
      should_queue: true,
    }
  }

  // Lower probability or later window → Trial Invite
  if (score >= 30 && (window === "later" || stage === "warm")) {
    return {
      action: "send_offer",
      offer_type: "trial",
      reason: "Moderate interest (30-49%) - trial invite to reduce friction",
      should_queue: true,
    }
  }

  // No action
  return {
    action: "skip",
    offer_type: "none",
    reason: "Score too low or stage not ready for APA",
    should_queue: false,
  }
}

/**
 * Get subscribers ready for APA evaluation
 */
export async function getSubscribersForAPA(): Promise<SubscriberInput[]> {
  const subscribers = await sql`
    SELECT 
      id,
      email,
      predicted_conversion_score,
      predicted_conversion_window,
      prediction_confidence,
      nurture_stage,
      behavior_score,
      last_apa_action_at,
      apa_disabled,
      blueprint_completed_at
    FROM blueprint_subscribers
    WHERE predicted_conversion_score IS NOT NULL
      AND blueprint_completed_at IS NOT NULL
      AND (last_apa_action_at IS NULL OR last_apa_action_at < NOW() - INTERVAL '4 days')
      AND apa_disabled = false
    ORDER BY predicted_conversion_score DESC
    LIMIT 50
  `

  return subscribers as SubscriberInput[]
}

/**
 * Log APA activity to audit table
 */
export async function logAPAActivity({
  subscriber_id,
  offer_type,
  action,
  prediction_score,
  prediction_window,
  prediction_confidence,
}: {
  subscriber_id: number
  offer_type: string
  action: string
  prediction_score: number | null
  prediction_window: string | null
  prediction_confidence: number | null
}): Promise<void> {
  await sql`
    INSERT INTO apa_activity_log (
      subscriber_id,
      offer_type,
      action,
      prediction_score,
      prediction_window,
      prediction_confidence
    ) VALUES (
      ${subscriber_id},
      ${offer_type},
      ${action},
      ${prediction_score},
      ${prediction_window},
      ${prediction_confidence}
    )
  `
}
