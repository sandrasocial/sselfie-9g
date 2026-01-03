/**
 * Maya Feed - Create Strategy Route
 * 
 * Wrapper route for feed strategy creation from Maya chat.
 * Forwards to /api/feed-planner/create-from-strategy for actual implementation.
 * 
 * This route provides a clean Maya namespace while maintaining backward compatibility.
 * 
 * Note: In production, this could be optimized to call the handler directly,
 * but for now we forward to maintain separation and avoid code duplication.
 */

import { type NextRequest, NextResponse } from "next/server"

export const maxDuration = 300

/**
 * Create feed from Maya's strategy
 * 
 * This endpoint is called when Maya generates a feed strategy via [CREATE_FEED_STRATEGY] trigger.
 * It forwards to the existing feed-planner route to maintain backward compatibility.
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[MAYA-FEED] Creating feed from strategy (forwarding to feed-planner)...")

    // Get request body
    const body = await request.json()

    // Forward to existing feed-planner route
    // Use internal fetch to maintain authentication context
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    
    // For internal calls, we can use the full URL
    // The feed-planner route will handle authentication
    const response = await fetch(`${baseUrl}/api/feed-planner/create-from-strategy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forward cookies for authentication
        Cookie: request.headers.get("cookie") || "",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[MAYA-FEED] ❌ Feed creation failed:", errorData.error)
      return NextResponse.json(
        { error: errorData.error || "Failed to create feed" },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log("[MAYA-FEED] ✅ Feed created:", data.feedLayoutId)

    return NextResponse.json(data)
  } catch (error) {
    console.error("[MAYA-FEED] ❌ Error creating feed:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create feed",
      },
      { status: 500 }
    )
  }
}

