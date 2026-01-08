import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/blueprint/get-blueprint
 * 
 * Retrieve saved blueprint for a returning user
 * Query params: email (required)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Get subscriber data
    const subscriber = await sql`
      SELECT 
        id,
        email,
        name,
        form_data,
        strategy_generated,
        strategy_generated_at,
        strategy_data,
        grid_generated,
        grid_generated_at,
        grid_url,
        grid_frame_urls,
        selfie_image_urls
      FROM blueprint_subscribers
      WHERE email = ${email}
      LIMIT 1
    `

    if (subscriber.length === 0) {
      return NextResponse.json(
        { error: "Email not found. Please complete email capture first." },
        { status: 404 },
      )
    }

    const data = subscriber[0]

    return NextResponse.json({
      success: true,
      blueprint: {
        formData: data.form_data || {},
        strategy: {
          generated: data.strategy_generated || false,
          generatedAt: data.strategy_generated_at || null,
          data: data.strategy_data || null,
        },
        grid: {
          generated: data.grid_generated || false,
          generatedAt: data.grid_generated_at || null,
          gridUrl: data.grid_url || null,
          frameUrls: data.grid_frame_urls || null,
        },
        selfieImages: data.selfie_image_urls || [],
      },
    })
  } catch (error) {
    console.error("[Blueprint] Error getting blueprint:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get blueprint" },
      { status: 500 },
    )
  }
}
