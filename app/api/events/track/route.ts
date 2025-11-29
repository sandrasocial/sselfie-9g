import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * POST /api/events/track
 * Universal event tracking endpoint for landing page interactions
 * Tracks button clicks, form submissions, and user engagement
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event_name, event_value, metadata } = body

    // Validate required fields
    if (!event_name || typeof event_name !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "event_name is required and must be a string",
        },
        { status: 400 },
      )
    }

    // Log the event for analytics (would integrate with analytics service in production)
    console.log("[Events] Tracked event:", {
      event_name,
      event_value,
      metadata,
      timestamp: new Date().toISOString(),
      user_agent: request.headers.get("user-agent"),
      ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    })

    // Allowed event names for validation
    const allowedEvents = [
      "hero_enter_studio_clicked",
      "hero_see_how_it_works_clicked",
      "pricing_try_once_clicked",
      "pricing_join_studio_clicked",
      "final_cta_enter_studio_clicked",
      "navigation_get_started_clicked",
      "pricing_viewed",
    ]

    if (!allowedEvents.includes(event_name)) {
      console.warn("[Events] Unknown event name:", event_name)
    }

    return NextResponse.json({
      success: true,
      event_name,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Events] Error tracking event:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
