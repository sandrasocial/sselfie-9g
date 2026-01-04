import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const published = searchParams.get("published")

    let testimonials
    
    if (published === "true") {
      testimonials = await sql`
        SELECT * FROM admin_testimonials 
        WHERE is_published = true 
        ORDER BY created_at DESC
      `
    } else if (published === "false") {
      testimonials = await sql`
        SELECT * FROM admin_testimonials 
        WHERE is_published = false 
        ORDER BY created_at DESC
      `
    } else {
      testimonials = await sql`
        SELECT * FROM admin_testimonials 
        ORDER BY created_at DESC
      `
    }

    return NextResponse.json({ testimonials })
  } catch (error) {
    console.error("Error fetching testimonials:", error)
    return NextResponse.json({ error: "Failed to fetch testimonials" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[v0] PATCH request body:', JSON.stringify(body, null, 2))
    
    const { 
      id, 
      is_published, 
      is_featured, 
      customer_name,
      testimonial_text,
      rating,
      screenshot_url,
      image_url_2,
      image_url_3,
      image_url_4
    } = body

    const result = await sql`
      UPDATE admin_testimonials
      SET 
        is_published = COALESCE(${is_published}, is_published),
        is_featured = COALESCE(${is_featured}, is_featured),
        customer_name = COALESCE(${customer_name}, customer_name),
        testimonial_text = COALESCE(${testimonial_text}, testimonial_text),
        rating = COALESCE(${rating}, rating),
        screenshot_url = ${screenshot_url !== undefined ? screenshot_url : sql`screenshot_url`},
        image_url_2 = ${image_url_2 !== undefined ? image_url_2 : sql`image_url_2`},
        image_url_3 = ${image_url_3 !== undefined ? image_url_3 : sql`image_url_3`},
        image_url_4 = ${image_url_4 !== undefined ? image_url_4 : sql`image_url_4`},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    console.log('[v0] Update result:', result[0])

    return NextResponse.json({ testimonial: result[0] })
  } catch (error) {
    console.error("Error updating testimonial:", error)
    return NextResponse.json({ error: "Failed to update testimonial" }, { status: 500 })
  }
}
