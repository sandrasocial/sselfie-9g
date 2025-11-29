import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * A/B Testing Engine for SSELFIE Funnel Optimization
 * Handles variant assignment, event recording, and adaptive traffic allocation
 */

/**
 * Assigns a variant to a session based on current traffic split
 * Uses deterministic hash for consistency
 * @param experimentSlug - The experiment slug (e.g., "blueprint_experience")
 * @param sessionId - The funnel session ID
 * @returns Variant ("A" or "B")
 */
export async function assignVariant(experimentSlug: string, sessionId: string): Promise<string> {
  try {
    // Fetch experiment
    const [experiment] = await sql`
      SELECT traffic_split, status
      FROM funnel_experiments
      WHERE slug = ${experimentSlug}
    `

    if (!experiment || experiment.status !== "active") {
      console.log(`[A/B] Experiment ${experimentSlug} not found or inactive, defaulting to A`)
      return "A"
    }

    const split = experiment.traffic_split as { A: number; B: number }

    // Deterministic hash based on session ID
    let hash = 0
    for (let i = 0; i < sessionId.length; i++) {
      hash = (hash << 5) - hash + sessionId.charCodeAt(i)
      hash = hash & hash // Convert to 32bit integer
    }
    const normalized = Math.abs(hash % 100) / 100 // 0.0 to 1.0

    // Assign variant based on split
    const variant = normalized < split.A ? "A" : "B"

    console.log(`[A/B] Assigned variant ${variant} to session ${sessionId} (${experimentSlug})`)
    return variant
  } catch (error) {
    console.error("[A/B] Error assigning variant:", error)
    return "A" // Safe fallback
  }
}

/**
 * Records an A/B test event
 * Non-blocking, never throws errors
 * @param params - Event parameters
 */
export async function recordEvent(params: {
  experimentSlug: string
  variant: string
  event: string
  sessionId: string
  userId?: string
  metadata?: any
}): Promise<void> {
  try {
    const { experimentSlug, variant, event, sessionId, userId, metadata } = params

    // Get experiment ID
    const [experiment] = await sql`
      SELECT id FROM funnel_experiments WHERE slug = ${experimentSlug}
    `

    if (!experiment) {
      console.log(`[A/B] Experiment ${experimentSlug} not found, skipping event recording`)
      return
    }

    // Insert event
    await sql`
      INSERT INTO funnel_ab_events (experiment_id, variant, event, session_id, user_id, metadata)
      VALUES (${experiment.id}, ${variant}, ${event}, ${sessionId}, ${userId || null}, ${JSON.stringify(metadata || {})})
    `

    console.log(`[A/B] Recorded event: ${event} for variant ${variant} (${experimentSlug})`)
  } catch (error) {
    console.error("[A/B] Failed to record event:", error)
    // Never throw - tracking failures should not break user flows
  }
}

/**
 * Evaluates experiment performance and updates traffic split
 * Uses adaptive allocation based on weighted performance
 * @param experimentSlug - The experiment slug
 * @returns Evaluation result
 */
export async function evaluateExperiment(experimentSlug: string): Promise<{
  success: boolean
  results?: {
    variantA: any
    variantB: any
    winner: string | null
    newSplit: { A: number; B: number }
  }
  error?: string
}> {
  try {
    console.log(`[A/B] Evaluating experiment: ${experimentSlug}`)

    // Get experiment
    const [experiment] = await sql`
      SELECT id FROM funnel_experiments WHERE slug = ${experimentSlug}
    `

    if (!experiment) {
      return {
        success: false,
        error: "Experiment not found",
      }
    }

    // Get events for variant A
    const eventsA = await sql`
      SELECT event FROM funnel_ab_events
      WHERE experiment_id = ${experiment.id} AND variant = 'A'
    `

    // Get events for variant B
    const eventsB = await sql`
      SELECT event FROM funnel_ab_events
      WHERE experiment_id = ${experiment.id} AND variant = 'B'
    `

    // Calculate metrics for A
    const viewsA = eventsA.filter((e: any) => e.event === "view").length
    const submitsA = eventsA.filter((e: any) => e.event === "submit").length
    const conversionsA = eventsA.filter((e: any) => e.event === "conversion").length

    // Calculate metrics for B
    const viewsB = eventsB.filter((e: any) => e.event === "view").length
    const submitsB = eventsB.filter((e: any) => e.event === "submit").length
    const conversionsB = eventsB.filter((e: any) => e.event === "conversion").length

    // Get average intent scores from blueprint_subscribers
    const intentA = await sql`
      SELECT AVG(intent_score) as avg_intent
      FROM blueprint_subscribers bs
      INNER JOIN funnel_ab_events fae ON fae.session_id = bs.access_token
      WHERE fae.experiment_id = ${experiment.id} AND fae.variant = 'A'
    `

    const intentB = await sql`
      SELECT AVG(intent_score) as avg_intent
      FROM blueprint_subscribers bs
      INNER JOIN funnel_ab_events fae ON fae.session_id = bs.access_token
      WHERE fae.experiment_id = ${experiment.id} AND fae.variant = 'B'
    `

    const avgIntentA = Number(intentA[0]?.avg_intent || 0)
    const avgIntentB = Number(intentB[0]?.avg_intent || 0)

    // Calculate weighted performance
    // Submit rate + conversion rate + intent score
    const perfA =
      (viewsA > 0 ? submitsA / viewsA : 0) * 0.4 + (viewsA > 0 ? conversionsA / viewsA : 0) * 0.4 + avgIntentA * 0.002
    const perfB =
      (viewsB > 0 ? submitsB / viewsB : 0) * 0.4 + (viewsB > 0 ? conversionsB / viewsB : 0) * 0.4 + avgIntentB * 0.002

    // Determine winner and new split
    let winner: string | null = null
    let newSplit = { A: 0.5, B: 0.5 }

    const perfDiff = Math.abs(perfA - perfB)
    const significanceThreshold = 0.2 // 20% better

    if (perfDiff > significanceThreshold) {
      if (perfB > perfA) {
        winner = "B"
        newSplit = { A: 0.3, B: 0.7 }
      } else {
        winner = "A"
        newSplit = { A: 0.7, B: 0.3 }
      }
    }

    // Update experiment
    await sql`
      UPDATE funnel_experiments
      SET 
        traffic_split = ${JSON.stringify(newSplit)},
        winning_variant = ${winner},
        last_evaluated_at = NOW(),
        updated_at = NOW()
      WHERE id = ${experiment.id}
    `

    console.log(
      `[A/B] Evaluation complete: Winner = ${winner || "None (equal)"}, New split = ${JSON.stringify(newSplit)}`,
    )

    return {
      success: true,
      results: {
        variantA: {
          views: viewsA,
          submits: submitsA,
          conversions: conversionsA,
          avgIntent: avgIntentA,
          performance: perfA,
        },
        variantB: {
          views: viewsB,
          submits: submitsB,
          conversions: conversionsB,
          avgIntent: avgIntentB,
          performance: perfB,
        },
        winner,
        newSplit,
      },
    }
  } catch (error) {
    console.error("[A/B] Error evaluating experiment:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
