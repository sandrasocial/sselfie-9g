import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import { sendEmail } from "@/lib/email/send-email"
import { generateFeedbackReplyEmail } from "@/lib/email/templates/feedback-reply-email"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Check if admin
    if (!user || user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const status = searchParams.get("status")

    let feedback

    if (type && status) {
      feedback = await sql`
        SELECT id, user_id, user_email, user_name, type, subject, message, 
               images, status, admin_notes, admin_reply, replied_at, created_at, updated_at
        FROM feedback
        WHERE type = ${type} AND status = ${status}
        ORDER BY created_at DESC 
        LIMIT 100
      `
    } else if (type) {
      feedback = await sql`
        SELECT id, user_id, user_email, user_name, type, subject, message, 
               images, status, admin_notes, admin_reply, replied_at, created_at, updated_at
        FROM feedback
        WHERE type = ${type}
        ORDER BY created_at DESC 
        LIMIT 100
      `
    } else if (status) {
      feedback = await sql`
        SELECT id, user_id, user_email, user_name, type, subject, message, 
               images, status, admin_notes, admin_reply, replied_at, created_at, updated_at
        FROM feedback
        WHERE status = ${status}
        ORDER BY created_at DESC 
        LIMIT 100
      `
    } else {
      feedback = await sql`
        SELECT id, user_id, user_email, user_name, type, subject, message, 
               images, status, admin_notes, admin_reply, replied_at, created_at, updated_at
        FROM feedback
        ORDER BY created_at DESC 
        LIMIT 100
      `
    }

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error("[v0] Error fetching admin feedback:", error)
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Check if admin
    if (!user || user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const { feedbackId, status, adminNotes, adminReply } = body

    if (!feedbackId) {
      return NextResponse.json({ error: "Feedback ID required" }, { status: 400 })
    }

    if (adminReply) {
      console.log("[v0] Fetching feedback details for reply:", feedbackId)

      const feedbackDetails = await sql`
        SELECT user_email, user_name, subject, message
        FROM feedback
        WHERE id = ${feedbackId}
      `

      if (feedbackDetails.length === 0) {
        return NextResponse.json({ error: "Feedback not found" }, { status: 404 })
      }

      const feedback = feedbackDetails[0]
      console.log("[v0] Feedback details:", {
        userEmail: feedback.user_email,
        userName: feedback.user_name,
        subject: feedback.subject,
      })

      const result = await sql`
        UPDATE feedback
        SET 
          admin_reply = ${adminReply},
          replied_at = NOW(),
          status = 'resolved',
          updated_at = NOW()
        WHERE id = ${feedbackId}
        RETURNING id
      `

      if (result.length === 0) {
        return NextResponse.json({ error: "Failed to update feedback" }, { status: 500 })
      }

      if (feedback.user_email) {
        console.log("[v0] Sending feedback reply email to:", feedback.user_email)

        const emailTemplate = generateFeedbackReplyEmail({
          userName: feedback.user_name || "there",
          originalSubject: feedback.subject,
          originalMessage: feedback.message,
          adminReply: adminReply,
        })

        const emailResult = await sendEmail({
          to: feedback.user_email,
          subject: `Re: ${feedback.subject}`,
          html: emailTemplate.html,
          text: emailTemplate.text,
          replyTo: "hello@sselfie.ai",
        })

        if (emailResult.success) {
          console.log("[v0] Feedback reply email sent successfully:", emailResult.messageId)
        } else {
          console.error("[v0] Failed to send feedback reply email:", emailResult.error)
          // Don't fail the request if email fails - reply is already saved
        }
      } else {
        console.log("[v0] No user email found, skipping email notification")
      }

      return NextResponse.json({ success: true })
    }

    // Otherwise just update status/notes
    const result = await sql`
      UPDATE feedback
      SET 
        status = COALESCE(${status}, status),
        admin_notes = COALESCE(${adminNotes}, admin_notes),
        updated_at = NOW()
      WHERE id = ${feedbackId}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating feedback:", error)
    return NextResponse.json({ error: "Failed to update feedback" }, { status: 500 })
  }
}
