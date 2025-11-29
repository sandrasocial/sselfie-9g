import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Behavioral Loop Engine
 * Computes behavior loop score and stage based on recent activity
 * Recommends next action for marketing automation
 */

interface BehaviorLoopResult {
  score: number
  stage: "cold" | "warm" | "hot" | "ready"
  signals: Array<{ type: string; value: number }>
  recommendedAction: "nudge_email" | "new_offer" | "content_touchpoint" | "pause"
}

/**
 * Computes behavior loop score and stage for a subscriber
 * @param subscriberId - The subscriber ID
 * @returns Behavior loop result with score, stage, signals, and recommended action
 */
export async function computeBehaviorLoop(subscriberId: number): Promise<BehaviorLoopResult> {
  try {
    const [subscriber] = await sql`
      SELECT 
        id,
        email,
        created_at,
        blueprint_opened_at,
        pdf_downloaded,
        cta_clicked,
        last_apa_action_at
      FROM blueprint_subscribers
      WHERE id = ${subscriberId}
    `

    if (!subscriber) {
      throw new Error(`Subscriber ${subscriberId} not found`)
    }

    // Fetch funnel events from today
    const funnelEvents = await sql`
      SELECT event_type, event_name, metadata, created_at
      FROM funnel_events
      WHERE email = ${subscriber.email}
        AND created_at >= NOW() - INTERVAL '1 day'
      ORDER BY created_at DESC
    `

    // Fetch email events (opens/clicks)
    const emailEvents = await sql`
      SELECT status, created_at
      FROM email_events
      WHERE subscriber_id = ${subscriberId}
        AND created_at >= NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC
    `

    // Fetch last APA action
    const lastApaAction = subscriber.last_apa_action_at
      ? Math.floor((Date.now() - new Date(subscriber.last_apa_action_at).getTime()) / (1000 * 60 * 60))
      : null

    // Initialize score and signals
    let score = 0
    const signals: Array<{ type: string; value: number }> = []

    // SCORING RULES
    // Page views today: +2 each
    const pageViews = funnelEvents.filter((e: any) => e.event_type === "page_view")
    if (pageViews.length > 0) {
      score += pageViews.length * 2
      signals.push({ type: "page_views_today", value: pageViews.length * 2 })
    }

    // Scroll depth 50%: +2
    const scroll50 = funnelEvents.filter(
      (e: any) => e.event_type === "scroll_depth" && e.metadata?.depth && e.metadata.depth >= 50,
    )
    if (scroll50.length > 0) {
      score += 2
      signals.push({ type: "scroll_50", value: 2 })
    }

    // Scroll depth 75%: +4
    const scroll75 = funnelEvents.filter(
      (e: any) => e.event_type === "scroll_depth" && e.metadata?.depth && e.metadata.depth >= 75,
    )
    if (scroll75.length > 0) {
      score += 4
      signals.push({ type: "scroll_75", value: 4 })
    }

    // Delivered page viewed: +5
    const deliveredViews = funnelEvents.filter((e: any) => e.event_name === "delivered_view")
    if (deliveredViews.length > 0) {
      score += 5
      signals.push({ type: "delivered_view", value: 5 })
    }

    // Blueprint downloaded: +8
    if (subscriber.pdf_downloaded) {
      score += 8
      signals.push({ type: "blueprint_downloaded", value: 8 })
    }

    // Email opened (last 7 days): +3
    const emailOpens = emailEvents.filter((e: any) => e.status === "opened")
    if (emailOpens.length > 0) {
      score += emailOpens.length * 3
      signals.push({ type: "email_opened", value: emailOpens.length * 3 })
    }

    // Email clicked (last 7 days): +6
    const emailClicks = emailEvents.filter((e: any) => e.status === "clicked")
    if (emailClicks.length > 0) {
      score += emailClicks.length * 6
      signals.push({ type: "email_clicked", value: emailClicks.length * 6 })
    }

    // Returned after 3+ days: +10
    const daysSinceSignup = Math.floor((Date.now() - new Date(subscriber.created_at).getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceSignup >= 3 && funnelEvents.length > 0) {
      score += 10
      signals.push({ type: "returned_after_3_days", value: 10 })
    }

    // NEGATIVE SIGNALS
    // Ignored 3 emails: -5
    const emailsSent = emailEvents.length
    const emailsOpened = emailOpens.length
    if (emailsSent >= 3 && emailsOpened === 0) {
      score -= 5
      signals.push({ type: "ignored_3_emails", value: -5 })
    }

    // Never opened anything: -10
    if (!subscriber.blueprint_opened_at && emailsOpened === 0) {
      score -= 10
      signals.push({ type: "never_opened", value: -10 })
    }

    // Received APA offer: -15
    if (lastApaAction !== null) {
      score -= 15
      signals.push({ type: "received_apa", value: -15 })
    }

    // Hard block: Recent APA within 48h
    const recentApaBlock = lastApaAction !== null && lastApaAction < 48

    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score))

    // Compute stage
    let stage: "cold" | "warm" | "hot" | "ready"
    if (score >= 36) stage = "ready"
    else if (score >= 21) stage = "hot"
    else if (score >= 11) stage = "warm"
    else stage = "cold"

    // Determine recommended action
    let recommendedAction: "nudge_email" | "new_offer" | "content_touchpoint" | "pause"

    if (recentApaBlock) {
      recommendedAction = "pause"
    } else if (stage === "ready") {
      recommendedAction = "new_offer"
    } else if (stage === "hot") {
      recommendedAction = "nudge_email"
    } else if (stage === "warm") {
      recommendedAction = "content_touchpoint"
    } else {
      recommendedAction = "pause"
    }

    console.log(
      `[BehaviorLoopEngine] Computed loop for subscriber ${subscriberId}: score=${score}, stage=${stage}, action=${recommendedAction}`,
    )

    return {
      score,
      stage,
      signals,
      recommendedAction,
    }
  } catch (error) {
    console.error(`[BehaviorLoopEngine] Error computing behavior loop for subscriber ${subscriberId}:`, error)
    // Return safe defaults
    return {
      score: 0,
      stage: "cold",
      signals: [],
      recommendedAction: "pause",
    }
  }
}
