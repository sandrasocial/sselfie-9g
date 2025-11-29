import { NextResponse } from "next/server"

/**
 * POST /api/events/viewed-pricing
 * Tracks when a user views the pricing section
 * Used by prediction engine for conversion signals
 */
export async function POST() {
  try {
    // This is a public endpoint - no user ID required
    // Just log the event for analytics
    console.log("[Events] Pricing section viewed")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Events] Error tracking pricing view:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
