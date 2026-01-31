import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { testimonialId } = await request.json()

    if (!testimonialId) {
      return NextResponse.json({ error: "Testimonial ID required" }, { status: 400 })
    }

    // Fetch testimonial details
    const testimonial = await sql`
      SELECT 
        customer_name,
        testimonial_text,
        rating,
        screenshot_url
      FROM admin_testimonials
      WHERE id = ${testimonialId}
      LIMIT 1
    `

    if (testimonial.length === 0) {
      return NextResponse.json({ error: "Testimonial not found" }, { status: 404 })
    }

    return NextResponse.json({ testimonial: testimonial[0] })
  } catch (error) {
    console.error("[v0] Error exporting testimonial:", error)
    return NextResponse.json({ error: "Failed to export testimonial" }, { status: 500 })
  }
}
