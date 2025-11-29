import { NextResponse } from "next/server"

/**
 * POST /api/events/clicked-upgrade
 * Tracks when a user clicks an upgrade/purchase button
 * Used by prediction engine for conversion signals
 */
export async function POST() {
  try {
    // This is a public endpoint - no user ID required
    // Just log the event for analytics
    console.log("[Events] Upgrade button clicked")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Events] Error tracking upgrade click:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
