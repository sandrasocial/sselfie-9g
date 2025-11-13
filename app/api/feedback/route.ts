import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/send-email"
import { generateFeedbackAdminNotification } from "@/lib/email/templates/feedback-admin-notification"

const sql = neon(process.env.DATABASE_URL!)

const ADMIN_EMAILS = ["ssa@ssasocial.com", "hello@sselfie.ai"]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, userEmail, userName, type, subject, message, images } = body

    if (!userId || !type || !subject || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO feedback (user_id, user_email, user_name, type, subject, message, images)
      VALUES (${userId}, ${userEmail}, ${userName}, ${type}, ${subject}, ${message}, ${images || []})
      RETURNING id, created_at
    `

    const feedbackId = result[0].id

    try {
      const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://sselfie.ai"}/admin/feedback`

      const emailContent = generateFeedbackAdminNotification({
        userName: userName || "Anonymous",
        userEmail: userEmail || "No email provided",
        feedbackType: type,
        subject,
        message,
        feedbackId,
        dashboardUrl,
      })

      // Send to all admin emails
      const emailPromises = ADMIN_EMAILS.map((adminEmail) =>
        sendEmail({
          to: adminEmail,
          subject: emailContent.subject,
          html: emailContent.html,
        }),
      )

      await Promise.all(emailPromises)

      console.log(`[v0] Admin notifications sent for feedback #${feedbackId}`)
    } catch (emailError) {
      console.error("[v0] Failed to send admin notification emails:", emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      feedbackId: result[0].id,
      message: "Thank you for your feedback!",
    })
  } catch (error) {
    console.error("[v0] Error submitting feedback:", error)
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Get user's feedback history
    const feedback = await sql`
      SELECT id, type, subject, message, status, created_at
      FROM feedback
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 20
    `

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error("[v0] Error fetching feedback:", error)
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 })
  }
}
