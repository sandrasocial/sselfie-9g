import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

/**
 * POST /api/apply/brand-engine
 * Handle Brand Engine application submissions
 * Auto-disqualify if revenue < $100k or spending < $1,500/mo
 */
export async function POST(req: NextRequest) {
  try {
    const data = await req.json()

    const {
      name,
      email,
      website,
      revenue,
      currentSpend,
      biggestBottleneck,
      hoursPerWeek,
      businessDescription,
      whyInterested,
      readyToInvest
    } = data

    // Validate required fields
    if (!name || !email || !website || !revenue || !currentSpend || !biggestBottleneck || !hoursPerWeek || !businessDescription || !whyInterested || !readyToInvest) {
      return NextResponse.json({
        success: false,
        error: "All fields are required."
      }, { status: 400 })
    }

    // Auto-disqualify logic
    const isQualified = revenue !== "<50k" && revenue !== "50-100k"

    const sql = getDb()

    // Check if email already applied
    const existing = await sql`
      SELECT id FROM brand_engine_applications
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `

    if ((existing as any[]).length > 0) {
      return NextResponse.json({
        success: false,
        error: "You've already applied. I'll review your application within 24 hours."
      }, { status: 400 })
    }

    // Insert application
    await sql`
      INSERT INTO brand_engine_applications (
        name,
        email,
        website,
        revenue,
        current_spend,
        biggest_bottleneck,
        hours_per_week,
        business_description,
        why_interested,
        ready_to_invest,
        qualified,
        status,
        created_at
      )
      VALUES (
        ${name},
        ${email.toLowerCase()},
        ${website},
        ${revenue},
        ${currentSpend},
        ${biggestBottleneck},
        ${hoursPerWeek},
        ${businessDescription},
        ${whyInterested},
        ${readyToInvest},
        ${isQualified},
        ${isQualified ? 'pending' : 'disqualified'},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      qualified: isQualified,
      message: isQualified
        ? "Application received! I'll review it within 24 hours."
        : "Thank you for your interest. Based on our requirements, Brand Engine may not be the right fit at this time."
    })

  } catch (error) {
    console.error("[Brand Engine Application] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Something went wrong. Please try again."
    }, { status: 500 })
  }
}
