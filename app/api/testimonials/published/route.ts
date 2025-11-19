import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const testimonials = await sql`
      SELECT 
        id,
        customer_name,
        testimonial_text,
        rating,
        screenshot_url,
        image_url_2,
        image_url_3,
        image_url_4,
        collected_at
      FROM admin_testimonials
      WHERE is_published = true
      ORDER BY 
        is_featured DESC,
        collected_at DESC
      LIMIT 12
    `

    return NextResponse.json({ testimonials })
  } catch (error) {
    console.error("[v0] Error fetching published testimonials:", error)
    return NextResponse.json({ error: "Failed to fetch testimonials" }, { status: 500 })
  }
}
