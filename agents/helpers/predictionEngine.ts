import { generateText } from "ai"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export class PredictionEngine {
  /**
   * Generates a conversion prediction for a blueprint subscriber
   * Uses GPT-4o-mini to analyze behavior, nurture stage, and signals
   * Returns predicted_score (0-100), predicted_window, offer_type, and confidence
   */
  static async generatePrediction(subscriber: any): Promise<{
    predicted_score: number
    predicted_window: "now" | "soon" | "later"
    offer_type: "studio" | "starter" | "trial" | "none"
    confidence: number
  }> {
    try {
      const behavior = subscriber.behavior_score || 0
      const nurture = subscriber.nurture_stage || "unknown"

      // Fetch conversion signals for this subscriber
      const signals = await sql`
        SELECT signal_type, signal_value
        FROM conversion_training_signals
        WHERE subscriber_id = ${subscriber.id}
        ORDER BY created_at DESC
        LIMIT 20
      `

      const input = {
        behavior,
        nurture,
        signals: signals.map((s: any) => ({ type: s.signal_type, value: s.signal_value })),
        created_at: subscriber.created_at,
        email_opened: subscriber.blueprint_opened_at !== null,
        pdf_downloaded: subscriber.pdf_downloaded,
        cta_clicked: subscriber.cta_clicked,
      }

      const { text } = await generateText({
        model: "openai/gpt-4o-mini",
        temperature: 0.2,
        prompt: `You are a conversion prediction model trained for SSELFIE Studio. Analyze the subscriber data and output a JSON object with: predicted_score (0-100), predicted_window ('now','soon','later'), offer_type ('studio','starter','trial','none'), confidence (0-100).

INPUT DATA:
${JSON.stringify(input, null, 2)}

RULES:
- predicted_score: 0-100 likelihood of conversion
- predicted_window: 'now' if ready to buy immediately, 'soon' if needs 1-2 days nurture, 'later' if cold/not ready
- offer_type: 'studio' for high-intent buyers, 'starter' for mid-tier, 'trial' for low-intent testers, 'none' if not ready
- confidence: 0-100 how confident you are in this prediction

Output ONLY valid JSON, no markdown:`,
      })

      // Parse the response
      const prediction = JSON.parse(text.trim())

      // Analyze funnel behavior for scoring adjustment
      const adjustment = this.analyzeFunnelBehavior(subscriber.events)
      prediction.predicted_score += adjustment

      return {
        predicted_score: Math.max(0, Math.min(100, prediction.predicted_score || 0)),
        predicted_window: prediction.predicted_window || "later",
        offer_type: prediction.offer_type || "none",
        confidence: Math.max(0, Math.min(100, prediction.confidence || 0)),
      }
    } catch (error) {
      console.error("[PredictionEngine] Error generating prediction:", error)
      // Return safe defaults
      return {
        predicted_score: 0,
        predicted_window: "later",
        offer_type: "none",
        confidence: 0,
      }
    }
  }

  /**
   * Analyzes funnel behavior for scoring adjustment
   * Looks at scroll depth, page views, time on site
   */
  static analyzeFunnelBehavior(events: any[]): number {
    let adjustment = 0

    // Deep scroll (70%+)
    const deepScrolls = events.filter((e) => e.event_type === "scroll_depth" && e.metadata?.depth >= 70)
    adjustment += deepScrolls.length * 5

    // High engagement (5+ page views)
    const pageViews = events.filter((e) => e.event_type === "page_view")
    if (pageViews.length >= 5) adjustment += 10

    // Returning visitor
    const firstEvent = events[0]?.created_at
    const lastEvent = events[events.length - 1]?.created_at
    if (firstEvent && lastEvent) {
      const daysDiff = Math.abs(new Date(lastEvent).getTime() - new Date(firstEvent).getTime()) / (1000 * 60 * 60 * 24)
      if (daysDiff > 1) adjustment += 15
    }

    return adjustment
  }
}
