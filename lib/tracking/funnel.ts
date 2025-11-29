import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Creates a funnel event and updates session aggregates
 * Safe to call - never throws errors or blocks
 */
export async function createFunnelEvent(params: {
  event_type: string
  event_name: string
  url?: string
  metadata?: any
  user_id?: string
  email?: string
  session_id: string
}) {
  try {
    const { event_type, event_name, url, metadata, user_id, email, session_id } = params

    // Insert event
    await sql`
      INSERT INTO funnel_events (user_id, email, session_id, event_type, event_name, url, metadata)
      VALUES (${user_id || null}, ${email || null}, ${session_id}, ${event_type}, ${event_name}, ${url || null}, ${JSON.stringify(metadata || {})})
    `

    // Upsert session
    const sessionExists = await sql`
      SELECT id FROM funnel_sessions WHERE session_id = ${session_id}
    `

    if (sessionExists.length === 0) {
      // Create new session
      await sql`
        INSERT INTO funnel_sessions (session_id, user_id, email, page_count, scroll_depth)
        VALUES (${session_id}, ${user_id || null}, ${email || null}, 
          ${event_type === "page_view" ? 1 : 0},
          ${event_type === "scroll_depth" && metadata?.depth ? metadata.depth : 0})
      `
    } else {
      // Update existing session
      await sql`
        UPDATE funnel_sessions
        SET 
          last_seen_at = NOW(),
          user_id = COALESCE(${user_id || null}, user_id),
          email = COALESCE(${email || null}, email),
          page_count = page_count + ${event_type === "page_view" ? 1 : 0},
          scroll_depth = GREATEST(scroll_depth, ${event_type === "scroll_depth" && metadata?.depth ? metadata.depth : 0})
        WHERE session_id = ${session_id}
      `
    }

    console.log(`[Funnel] Tracked: ${event_name} (${event_type}) for session ${session_id}`)
  } catch (error) {
    // Never throw - tracking should not break user flows
    console.error(`[Funnel] Failed to track event:`, error)
  }
}

/**
 * Upgrades anonymous session data with user identity
 * Call this when user logs in or provides email
 */
export async function identifyUser(session_id: string, user_id: string, email: string) {
  try {
    await sql`
      UPDATE funnel_sessions
      SET user_id = ${user_id}, email = ${email}
      WHERE session_id = ${session_id}
    `

    await sql`
      UPDATE funnel_events
      SET user_id = ${user_id}, email = ${email}
      WHERE session_id = ${session_id}
    `

    console.log(`[Funnel] Identified session ${session_id} as user ${user_id}`)
  } catch (error) {
    console.error(`[Funnel] Failed to identify user for session ${session_id}:`, error)
  }
}

/**
 * Marks a session as having completed the blueprint
 */
export async function recordBlueprintCompletion(session_id: string) {
  try {
    await sql`
      UPDATE funnel_sessions
      SET blueprint_completed = TRUE, last_seen_at = NOW()
      WHERE session_id = ${session_id}
    `

    enqueueBehaviorLoopRecompute(session_id).catch((err) => {
      console.error("[Funnel] Failed to enqueue behavior loop recompute:", err)
    })

    console.log(`[Funnel] Blueprint completed for session ${session_id}`)
  } catch (error) {
    console.error(`[Funnel] Failed to record blueprint completion:`, error)
  }
}

/**
 * Marks a session as having purchased
 */
export async function recordPurchaseSignal(session_id: string) {
  try {
    await sql`
      UPDATE funnel_sessions
      SET purchased = TRUE, last_seen_at = NOW()
      WHERE session_id = ${session_id}
    `

    await createFunnelEvent({
      event_type: "conversion",
      event_name: "purchase_success",
      session_id,
      metadata: { converted: true },
    })

    console.log(`[Funnel] Purchase recorded for session ${session_id}`)
  } catch (error) {
    console.error(`[Funnel] Failed to record purchase:`, error)
  }
}

/**
 * Enqueues behavior loop recompute for a session
 * Fire-and-forget - never blocks user flow
 */
async function enqueueBehaviorLoopRecompute(session_id: string) {
  try {
    // Find subscriber by session
    const [session] = await sql`
      SELECT email FROM funnel_sessions WHERE session_id = ${session_id}
    `

    if (!session?.email) return

    const [subscriber] = await sql`
      SELECT id FROM blueprint_subscribers WHERE email = ${session.email}
    `

    if (!subscriber) return

    // Queue background job (simplified - in production use a queue system)
    setTimeout(async () => {
      try {
        const { evaluateBehaviorLoopForSubscriber } = await import("@/agents/admin/adminSupervisorAgent")
        await evaluateBehaviorLoopForSubscriber(subscriber.id)
      } catch (error) {
        console.error("[Funnel] Background behavior loop recompute failed:", error)
      }
    }, 5000) // 5 second delay
  } catch (error) {
    console.error("[Funnel] Failed to enqueue behavior loop recompute:", error)
  }
}
