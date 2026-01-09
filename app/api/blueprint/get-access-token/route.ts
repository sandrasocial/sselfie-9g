import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/blueprint/get-access-token
 * 
 * Get access token for paid blueprint by email
 * Only returns token if paid_blueprint_purchased = TRUE
 * Returns most recent purchase (ORDER BY paid_blueprint_purchased_at DESC)
 * 
 * Query params: email (required)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Get most recent paid blueprint purchase for this email (case-insensitive)
    const result = await sql`
      SELECT 
        access_token,
        paid_blueprint_purchased_at,
        email
      FROM blueprint_subscribers
      WHERE LOWER(email) = LOWER(${email})
        AND paid_blueprint_purchased = TRUE
      ORDER BY paid_blueprint_purchased_at DESC
      LIMIT 1
    `
    
    console.log(`[v0] 🔍 Access token lookup for ${email}:`, {
      found: result.length > 0,
      hasAccessToken: result.length > 0 && !!result[0].access_token,
      purchasedAt: result.length > 0 ? result[0].paid_blueprint_purchased_at : null,
    })

    if (result.length === 0) {
      return NextResponse.json(
        { error: "No paid blueprint purchase found for this email" },
        { status: 404 }
      )
    }

    if (!result[0].access_token) {
      return NextResponse.json(
        { error: "Access token not available for this purchase" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      accessToken: result[0].access_token,
      purchasedAt: result[0].paid_blueprint_purchased_at,
    })
  } catch (error: any) {
    console.error("[v0] Error getting access token:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
