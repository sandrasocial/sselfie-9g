/**
 * Automation: Send After Blueprint Submission
 * Triggered when user completes brand blueprint
 * POST /api/automations/send-after-blueprint
 */

import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/send"
import { brandBlueprintEmail, stripHtmlToText } from "@/lib/email/templates/maya-html"

const sql = neon(process.env.DATABASE_URL!)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, userId, subscriberId, blueprintUrl, firstName } = body

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    console.log("[Automation] Sending after-blueprint email to:", email)

    // Check if we've already sent this email (prevent duplicates)
    const existingLog = await sql`
      SELECT id FROM email_logs
      WHERE user_email = ${email}
        AND email_type = 'after-blueprint'
        AND status = 'sent'
      LIMIT 1
    `

    if (existingLog.length > 0) {
      console.log("[Automation] After-blueprint email already sent to:", email)
      return NextResponse.json({ success: true, message: "Email already sent" })
    }

    // Get user data if userId provided
    let userFirstName = firstName
    let neonUserId = userId

    if (!userFirstName && neonUserId) {
      const userResult = await sql`
        SELECT first_name, id FROM users WHERE id = ${neonUserId} LIMIT 1
      `
      if (userResult.length > 0) {
        userFirstName = userResult[0].first_name
      }
    }

    // If subscriberId provided, get subscriber data
    if (!userFirstName && subscriberId) {
      const subResult = await sql`
        SELECT name FROM blueprint_subscribers WHERE id = ${subscriberId} LIMIT 1
      `
      if (subResult.length > 0) {
        userFirstName = subResult[0].name?.split(" ")[0]
      }
    }

    // Generate email content
    const html = brandBlueprintEmail({
      firstName: userFirstName,
      blueprintUrl: blueprintUrl || `${SITE_URL}/blueprint/view`,
      studioUrl: `${SITE_URL}/studio`,
    })

    // Send email
    const result = await sendEmail({
      to: email,
      subject: "Your Brand Blueprint is Ready ✨",
      html,
      text: stripHtmlToText(html),
      emailType: "after-blueprint",
      userId: neonUserId?.toString(),
      tags: ["blueprint", "automated", "post-blueprint"],
    })

    // Log to email_logs
    await sql`
      INSERT INTO email_logs (
        user_email,
        user_id,
        email_type,
        status,
        resend_message_id,
        timestamp
      )
      VALUES (
        ${email},
        ${neonUserId || null},
        'after-blueprint',
        ${result.success ? "sent" : "failed"},
        ${result.messageId || null},
        NOW()
      )
    `

    if (!result.success) {
      console.error("[Automation] Failed to send after-blueprint email:", result.error)
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 },
      )
    }

    console.log("[Automation] After-blueprint email sent successfully:", result.messageId)

    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (error) {
    console.error("[Automation] Error in send-after-blueprint:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

