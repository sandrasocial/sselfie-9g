import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const result = await sql`
      SELECT COUNT(*) as count 
      FROM admin_testimonials 
      WHERE is_published = false
    `

    return NextResponse.json({ pendingCount: Number(result[0].count) })
  } catch (error) {
    console.error("[v0] Error fetching testimonials count:", error)
    return NextResponse.json({ pendingCount: 0 }, { status: 500 })
  }
}
