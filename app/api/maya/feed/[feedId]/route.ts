/**
 * GET /api/maya/feed/[feedId]
 * DELETE /api/maya/feed/[feedId]
 * 
 * Wrapper endpoints in Maya namespace that forward to existing /api/feed/[feedId] route
 * This provides a clean Maya namespace while maintaining backward compatibility
 */

import { type NextRequest, NextResponse } from "next/server"

/**
 * GET - Retrieve a specific feed by ID
 * Forwards to /api/feed/[feedId]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ feedId: string }> | { feedId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const { feedId } = resolvedParams

    console.log("[MAYA-FEED] Fetching feed:", feedId)

    // Forward to existing feed endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    
    const response = await fetch(`${baseUrl}/api/feed/${feedId}`, {
      method: "GET",
      headers: {
        // Forward cookies for authentication
        Cookie: req.headers.get("cookie") || "",
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.error || "Failed to fetch feed" },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error("[MAYA-FEED] ❌ Error fetching feed:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch feed",
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Delete a feed and all its posts
 * Forwards to /api/feed/[feedId] DELETE method
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ feedId: string }> | { feedId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const { feedId } = resolvedParams

    console.log("[MAYA-FEED] Deleting feed:", feedId)

    // Forward to existing feed endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    
    const response = await fetch(`${baseUrl}/api/feed/${feedId}`, {
      method: "DELETE",
      headers: {
        // Forward cookies for authentication
        Cookie: req.headers.get("cookie") || "",
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.error || "Failed to delete feed" },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log("[MAYA-FEED] ✅ Feed deleted successfully")
    return NextResponse.json(data)

  } catch (error) {
    console.error("[MAYA-FEED] ❌ Error deleting feed:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete feed",
      },
      { status: 500 }
    )
  }
}

