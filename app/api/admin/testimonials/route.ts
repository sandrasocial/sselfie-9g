import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const published = searchParams.get("published")

    let query = "SELECT * FROM admin_testimonials"
    const conditions = []

    if (published === "true") {
      conditions.push("is_published = true")
    } else if (published === "false") {
      conditions.push("is_published = false")
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ")
    }

    query += " ORDER BY created_at DESC"

    const testimonials = await sql(query)

    return NextResponse.json({ testimonials })
  } catch (error) {
    console.error("Error fetching testimonials:", error)
    return NextResponse.json({ error: "Failed to fetch testimonials" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, is_published, is_featured } = body

    const updates = []
    const values = []
    let paramIndex = 1

    if (typeof is_published === "boolean") {
      updates.push(`is_published = $${paramIndex++}`)
      values.push(is_published)
    }

    if (typeof is_featured === "boolean") {
      updates.push(`is_featured = $${paramIndex++}`)
      values.push(is_featured)
    }

    updates.push(`updated_at = NOW()`)
    values.push(id)

    const query = `
      UPDATE admin_testimonials
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await sql(query, values)

    return NextResponse.json({ testimonial: result[0] })
  } catch (error) {
    console.error("Error updating testimonial:", error)
    return NextResponse.json({ error: "Failed to update testimonial" }, { status: 500 })
  }
}
