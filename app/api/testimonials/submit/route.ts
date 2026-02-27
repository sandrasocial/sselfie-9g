import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"

const sql = neon(process.env.DATABASE_URL!)
const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, testimonial, rating, photos } = body

    if (!name || !email || !testimonial || !rating) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Store testimonial in database (unpublished by default)
    await sql`
      INSERT INTO admin_testimonials (
        customer_name,
        customer_email,
        testimonial_text,
        rating,
        screenshot_url,
        platform,
        testimonial_type,
        emotional_tone,
        is_published,
        is_featured,
        collected_at,
        created_at,
        updated_at
      ) VALUES (
        ${name},
        ${email},
        ${testimonial},
        ${rating},
        ${photos.length > 0 ? photos[0] : null},
        'website',
        'review',
        'positive',
        false,
        false,
        NOW(),
        NOW(),
        NOW()
      )
    `

    // Send admin notification email
    await resend.emails.send({
      from: "SSELFIE <hello@sselfie.ai>",
      to: process.env.ADMIN_EMAIL || "hello@sselfie.ai",
      subject: `New Testimonial from ${name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1c1917; margin-bottom: 20px;">New Testimonial Submission</h2>
          
          <div style="background: #fafaf9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 12px;"><strong>Name:</strong> ${name}</p>
            <p style="margin: 0 0 12px;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 0 0 12px;"><strong>Rating:</strong> ${"⭐".repeat(rating)} (${rating}/5)</p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <strong>Testimonial:</strong>
            <p style="color: #57534e; line-height: 1.6; margin-top: 8px;">${testimonial}</p>
          </div>
          
          ${
            photos.length > 0
              ? `
          <div style="margin-bottom: 20px;">
            <strong>Photos (${photos.length}):</strong>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px;">
              ${photos.map((photo: string) => `<img src="${photo}" alt="SSELFIE photo" style="width: 100%; border-radius: 8px;" />`).join("")}
            </div>
          </div>
          `
              : ""
          }
          
          <p style="color: #78716c; font-size: 14px; margin-top: 30px;">
            Review this testimonial in your admin dashboard to publish it on the website.
          </p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error submitting testimonial:", error)
    return NextResponse.json({ error: "Failed to submit testimonial" }, { status: 500 })
  }
}
