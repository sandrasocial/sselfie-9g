import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { requireAdmin } from "@/lib/admin-feature-flags"
import {
  isValidReviewRating,
  isValidReviewText,
  normalizeReviewText,
} from "@/lib/testimonials/review-contract"

function unauthorized(error?: string) {
  return NextResponse.json(
    { error: error || "Admin access required" },
    { status: error === "Not authenticated" ? 401 : 403 },
  )
}

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return unauthorized(adminCheck.error)
  }

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

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return unauthorized(adminCheck.error)
  }

  try {
    const body = await request.json().catch(() => ({}))
    const customerName = typeof body?.customer_name === "string" ? body.customer_name.trim() : ""
    const customerEmail =
      typeof body?.customer_email === "string" ? body.customer_email.trim().toLowerCase() : ""
    const testimonialText = normalizeReviewText(body?.testimonial_text)
    const rating = body?.rating
    const allowedSources = new Set(["email", "dm", "instagram", "other"])
    const source = allowedSources.has(body?.source) ? body.source : "other"

    if (!customerName || customerName.length > 120) {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 })
    }
    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return NextResponse.json({ error: "Customer email is invalid" }, { status: 400 })
    }
    if (!isValidReviewText(testimonialText)) {
      return NextResponse.json({ error: "Testimonial text is invalid" }, { status: 400 })
    }
    if (!isValidReviewRating(rating)) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 })
    }

    const testimonialType =
      source === "dm"
        ? "dm"
        : source === "email"
          ? "email"
          : source === "instagram"
            ? "social"
            : "review"
    const manualContext = JSON.stringify({ manual_entry: true, source })
    const result = await sql`
      INSERT INTO admin_testimonials (
        customer_name,
        customer_email,
        testimonial_text,
        testimonial_type,
        platform,
        rating,
        screenshot_url,
        image_url_2,
        image_url_3,
        image_url_4,
        key_benefits,
        is_featured,
        is_published,
        collected_at,
        created_at,
        updated_at
      ) VALUES (
        ${customerName},
        ${customerEmail || null},
        ${testimonialText},
        ${testimonialType},
        ${source},
        ${rating},
        ${typeof body?.screenshot_url === "string" ? body.screenshot_url : null},
        ${typeof body?.image_url_2 === "string" ? body.image_url_2 : null},
        ${typeof body?.image_url_3 === "string" ? body.image_url_3 : null},
        ${typeof body?.image_url_4 === "string" ? body.image_url_4 : null},
        ${manualContext}::jsonb,
        false,
        false,
        NOW(),
        NOW(),
        NOW()
      )
      RETURNING *
    `

    return NextResponse.json({ testimonial: result[0] }, { status: 201 })
  } catch (error) {
    console.error("Error creating testimonial:", error)
    return NextResponse.json({ error: "Failed to create testimonial" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return unauthorized(adminCheck.error)
  }

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
