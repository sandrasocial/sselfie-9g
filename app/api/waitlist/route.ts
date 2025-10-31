import { neon } from "@neondatabase/serverless"
import { NextResponse } from "next/server"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    // Validate email
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
    }

    // Check if email already exists
    const existing = await sql`
      SELECT id FROM waitlist WHERE email = ${email}
    `

    if (existing.length > 0) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }

    // Insert into waitlist
    await sql`
      INSERT INTO waitlist (email, source, status)
      VALUES (${email}, 'landing_page', 'pending')
    `

    return NextResponse.json({ success: true, message: "Successfully joined waitlist!" })
  } catch (error) {
    console.error("[v0] Waitlist API error:", error)
    return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 })
  }
}
