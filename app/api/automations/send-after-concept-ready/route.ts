/**
 * Automation: Send After Concept Ready
 * Triggered when Maya generates concept cards successfully
 * POST /api/automations/send-after-concept-ready
 */

import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/send"
import { mayaEmailBase } from "@/lib/email/templates/maya-html"

const sql = neon(process.env.DATABASE_URL!)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

function stripHtmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, userId, conceptCount, firstName } = body

    if (!email || !userId) {
      return NextResponse.json(
        { error: "Email and userId are required" },
        { status: 400 },
      )
    }

    console.log("[Automation] Sending after-concept-ready email to:", email)

    // Check if we've already sent this email (prevent duplicates)
    const existingLog = await sql`
      SELECT id FROM email_logs
      WHERE user_email = ${email}
        AND email_type = 'concept-ready'
        AND status = 'sent'
        AND timestamp > NOW() - INTERVAL '1 hour'
      LIMIT 1
    `

    if (existingLog.length > 0) {
      console.log("[Automation] Concept ready email already sent recently to:", email)
      return NextResponse.json({ success: true, message: "Email already sent" })
    }

    // Get user data if firstName not provided
    let userFirstName = firstName
    if (!userFirstName) {
      const userResult = await sql`
        SELECT first_name FROM users WHERE id = ${userId} LIMIT 1
      `
      if (userResult.length > 0) {
        userFirstName = userResult[0].first_name
      }
    }

    // Generate email content
    const content = `
      <h1>Your Concepts Are Ready ✨</h1>
      
      <p>Hey ${userFirstName || "there"},</p>
      
      <p>I just finished creating ${conceptCount || "your"} concept${conceptCount !== 1 ? "s" : ""} for you! They're waiting in your Studio.</p>
      
      <p>Each one is designed to tell your story and build your brand. Ready to see what we created together?</p>
      
      <p style="text-align: center; margin: 32px 0;">
        <a href="${SITE_URL}/studio" style="display: inline-block; padding: 16px 32px; background-color: #1c1917; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 4px;">
          View Your Concepts
        </a>
      </p>
      
      <p>Can't wait to see which ones you love most!</p>
      
      <p>XoXo,<br>Maya</p>
    `

    const html = mayaEmailBase(content, {
      firstName: userFirstName,
      previewText: `Your ${conceptCount || ""} concept${conceptCount !== 1 ? "s" : ""} ${conceptCount !== 1 ? "are" : "is"} ready!`,
    })

    // Send email
    const result = await sendEmail({
      to: email,
      subject: `Your ${conceptCount || ""} Concept${conceptCount !== 1 ? "s" : ""} ${conceptCount !== 1 ? "Are" : "Is"} Ready ✨`,
      html,
      text: stripHtmlToText(html),
      emailType: "concept-ready",
      userId: userId.toString(),
      tags: ["concept", "maya", "automated"],
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
        ${userId},
        'concept-ready',
        ${result.success ? "sent" : "failed"},
        ${result.messageId || null},
        NOW()
      )
    `

    if (!result.success) {
      console.error("[Automation] Failed to send concept-ready email:", result.error)
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 },
      )
    }

    console.log("[Automation] Concept-ready email sent successfully:", result.messageId)

    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (error) {
    console.error("[Automation] Error in send-after-concept-ready:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

