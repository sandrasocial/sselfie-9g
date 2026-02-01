import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

/**
 * POST /api/waitlist/join
 * Add someone to the AI Brand OS™ waitlist
 */
export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json()

    if (!email || !name) {
      return NextResponse.json({
        success: false,
        error: "Email and name are required."
      }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        error: "Please enter a valid email address."
      }, { status: 400 })
    }

    const sql = getDb()

    // Check if email already exists
    const existing = await sql`
      SELECT id FROM waitlist_signups
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `

    if ((existing as any[]).length > 0) {
      return NextResponse.json({
        success: false,
        error: "You're already on the waitlist."
      }, { status: 400 })
    }

    // Insert into waitlist
    await sql`
      INSERT INTO waitlist_signups (email, name, created_at)
      VALUES (${email.toLowerCase()}, ${name}, NOW())
    `

    // Get total count
    const count = await sql`
      SELECT COUNT(*) as total FROM waitlist_signups
    `

    const totalSignups = (count as any)[0].total

    return NextResponse.json({
      success: true,
      message: "You're on the waitlist!",
      position: totalSignups
    })

  } catch (error) {
    console.error("[Waitlist Join] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Something went wrong. Please try again."
    }, { status: 500 })
  }
}
