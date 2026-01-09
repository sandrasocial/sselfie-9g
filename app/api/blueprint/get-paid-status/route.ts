import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/blueprint/get-paid-status
 * 
 * Check paid blueprint purchase and generation status
 * Query params: access (required) - access_token from blueprint_subscribers
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const accessToken = searchParams.get("access")

    if (!accessToken || typeof accessToken !== "string") {
      return NextResponse.json(
        { error: "Access token is required" }, 
        { status: 400 }
      )
    }

    console.log("[v0][paid-blueprint] Checking status for token:", accessToken.substring(0, 8) + "...")

    // Get subscriber data by access_token
    const subscriber = await sql`
      SELECT 
        id,
        email,
        paid_blueprint_purchased,
        paid_blueprint_purchased_at,
        paid_blueprint_generated,
        paid_blueprint_generated_at,
        paid_blueprint_photo_urls
      FROM blueprint_subscribers
      WHERE access_token = ${accessToken}
      LIMIT 1
    `

    if (subscriber.length === 0) {
      console.log("[v0][paid-blueprint] Invalid access token")
      return NextResponse.json(
        { error: "Invalid access token" },
        { status: 404 },
      )
    }

    const data = subscriber[0]
    const photoUrls = data.paid_blueprint_photo_urls || []
    const totalPhotos = Array.isArray(photoUrls) ? photoUrls.length : 0

    console.log("[v0][paid-blueprint] Status:", {
      email: data.email.substring(0, 3) + "***",
      purchased: data.paid_blueprint_purchased,
      generated: data.paid_blueprint_generated,
      totalPhotos,
    })

    return NextResponse.json({
      purchased: data.paid_blueprint_purchased || false,
      generated: data.paid_blueprint_generated || false,
      generatedAt: data.paid_blueprint_generated_at || null,
      totalPhotos,
      photoUrls: photoUrls,
      canGenerate: (data.paid_blueprint_purchased && !data.paid_blueprint_generated) || false,
      error: null,
    })
  } catch (error) {
    console.error("[v0][paid-blueprint] Error getting status:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get status" },
      { status: 500 },
    )
  }
}
