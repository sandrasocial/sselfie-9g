import { neon } from "@neondatabase/serverless"
import { getEventScore, calculateNurtureStage } from "@/agents/helpers/scoringEngine"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Tracks a user event in the user_events table
 * Safe to call - will not throw errors or break user flows
 * @param userId - The user ID (integer)
 * @param eventType - The event type (e.g., "blueprint_generated")
 * @param metadata - Optional metadata (JSON object)
 */
export async function trackEvent(userId: number, eventType: string, metadata: any = {}) {
  try {
    await sql`
      INSERT INTO user_events (user_id, event_type, metadata)
      VALUES (${userId}, ${eventType}, ${JSON.stringify(metadata)})
    `
    console.log(`[Events] Tracked: ${eventType} for user ${userId}`)
  } catch (error) {
    // Never throw - tracking failures should not break user flows
    console.error(`[Events] Failed to track ${eventType}:`, error)
  }
}

/**
 * Tracks a blueprint generated event
 * @param userId - The user ID (integer)
 * @param blueprintId - The blueprint ID (string)
 */
export async function trackBlueprintGenerated(userId: number, blueprintId: string) {
  try {
    await sql`
      INSERT INTO user_events (user_id, event_type, metadata)
      VALUES (${userId}, 'blueprint_generated', ${JSON.stringify({ blueprintId })})
    `
    console.log(`[Events] Tracked: blueprint_generated for user ${userId}`)
  } catch (error) {
    console.error(`[Events] Failed to track blueprint_generated for user ${userId}:`, error)
  }
}

/**
 * Tracks a blueprint updated event
 * @param userId - The user ID (integer)
 * @param blueprintId - The blueprint ID (string)
 */
export async function trackBlueprintUpdated(userId: number, blueprintId: string) {
  try {
    await sql`
      INSERT INTO user_events (user_id, event_type, metadata)
      VALUES (${userId}, 'blueprint_updated', ${JSON.stringify({ blueprintId })})
    `
    console.log(`[Events] Tracked: blueprint_updated for user ${userId}`)
  } catch (error) {
    console.error(`[Events] Failed to track blueprint_updated for user ${userId}:`, error)
  }
}

/**
 * Tracks a blueprint deleted event
 * @param userId - The user ID (integer)
 * @param blueprintId - The blueprint ID (string)
 */
export async function trackBlueprintDeleted(userId: number, blueprintId: string) {
  try {
    await sql`
      INSERT INTO user_events (user_id, event_type, metadata)
      VALUES (${userId}, 'blueprint_deleted', ${JSON.stringify({ blueprintId })})
    `
    console.log(`[Events] Tracked: blueprint_deleted for user ${userId}`)
  } catch (error) {
    console.error(`[Events] Failed to track blueprint_deleted for user ${userId}:`, error)
  }
}

/**
 * Tracks a blueprint subscriber event and updates behavior score
 * Safe to call - will not throw errors or break user flows
 * @param email - The subscriber email
 * @param eventType - The event type (e.g., "blueprint_completed")
 * @param metadata - Optional metadata (JSON object)
 */
export async function trackBlueprintEvent(email: string, eventType: string, metadata: any = {}) {
  try {
    const scoreValue = getEventScore(eventType)

    const result = await sql`
      UPDATE blueprint_subscribers
      SET 
        behavior_score = COALESCE(behavior_score, 0) + ${scoreValue},
        last_event_at = NOW()
      WHERE email = ${email}
      RETURNING behavior_score, nurture_stage
    `

    if (result.length > 0) {
      const currentScore = result[0].behavior_score
      const oldStage = result[0].nurture_stage

      const newStage = calculateNurtureStage(currentScore)

      if (newStage !== oldStage) {
        await sql`
          UPDATE blueprint_subscribers
          SET nurture_stage = ${newStage}
          WHERE email = ${email}
        `
        console.log(`[Events] Stage changed for ${email}: ${oldStage} → ${newStage} (score: ${currentScore})`)
      }

      console.log(`[Events] Tracked: ${eventType} for ${email} (+${scoreValue} pts, total: ${currentScore})`)
    }
  } catch (error) {
    // Never throw - tracking failures should not break user flows
    console.error(`[Events] Failed to track blueprint event ${eventType}:`, error)
  }
}

/**
 * Conversion Signals for predictive engine
 * Each signal has a type and value for training the prediction model
 */
export const ConversionSignals = {
  VIEWED_PRICING: { type: "VIEWED_PRICING", value: 5 },
  VISITED_PRICING_TWICE: { type: "VISITED_PRICING_TWICE", value: 15 },
  CLICKED_UPGRADE: { type: "CLICKED_UPGRADE", value: 25 },
  GENERATED_BLUEPRINT: { type: "GENERATED_BLUEPRINT", value: 30 },
  RETURNED_AFTER_48H: { type: "RETURNED_AFTER_48H", value: 20 },
  OPENED_BLUEPRINT_EMAIL: { type: "OPENED_BLUEPRINT_EMAIL", value: 10 },
  DOWNLOADED_PDF: { type: "DOWNLOADED_PDF", value: 15 },
  CLICKED_CTA: { type: "CLICKED_CTA", value: 20 },
}

/**
 * Records a conversion signal for a subscriber
 * Used by the prediction engine to train conversion probability
 * @param subscriberId - The blueprint subscriber ID (integer)
 * @param signal - The signal object from ConversionSignals
 */
export async function recordConversionSignal(subscriberId: number, signal: { type: string; value: number }) {
  try {
    await sql`
      INSERT INTO conversion_training_signals (subscriber_id, signal_type, signal_value)
      VALUES (${subscriberId}, ${signal.type}, ${signal.value})
    `
    console.log(`[Events] Recorded conversion signal: ${signal.type} (+${signal.value}) for subscriber ${subscriberId}`)
  } catch (error) {
    // Never throw - tracking failures should not break user flows
    console.error(`[Events] Failed to record conversion signal ${signal.type}:`, error)
  }
}
