import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/prediction/score
 * Returns the predicted conversion score for a subscriber
 * Backwards compatibility endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email")
    const subscriber_id = request.nextUrl.searchParams.get("id")

    // Input validation
    if (!email && !subscriber_id) {
      return NextResponse.json({ success: false, error: "Missing email or id parameter" }, { status: 400 })
    }

    let subscriber
    if (subscriber_id) {
      const [result] = await sql`
        SELECT 
          id,
          email,
          predicted_conversion_score,
          predicted_conversion_window,
          predicted_offer_type,
          prediction_confidence,
          last_prediction_at
        FROM blueprint_subscribers
        WHERE id = ${Number.parseInt(subscriber_id)}
      `
      subscriber = result
    } else {
      const [result] = await sql`
        SELECT 
          id,
          email,
          predicted_conversion_score,
          predicted_conversion_window,
          predicted_offer_type,
          prediction_confidence,
          last_prediction_at
        FROM blueprint_subscribers
        WHERE email = ${email}
      `
      subscriber = result
    }

    if (!subscriber) {
      return NextResponse.json({ success: false, error: "Subscriber not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        subscriber_id: subscriber.id,
        email: subscriber.email,
        score: subscriber.predicted_conversion_score || 0,
        window: subscriber.predicted_conversion_window || "unknown",
        offer_type: subscriber.predicted_offer_type || "none",
        confidence: subscriber.prediction_confidence || 0,
        last_predicted: subscriber.last_prediction_at,
      },
    })
  } catch (error) {
    console.error("[API] Prediction score error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch prediction score" }, { status: 500 })
  }
}
