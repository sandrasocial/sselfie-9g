/**
 * Automation: Send After Blueprint Rewrite
 * Triggered when Maya rewrites a brand blueprint
 * POST /api/automations/send-after-blueprint-rewrite
 */

import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/send"
import { sendRewrittenBlueprintEmail } from "@/lib/email/automations"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, userId, firstName, blueprintData } = body

    if (!email || !userId) {
      return NextResponse.json(
        { error: "Email and userId are required" },
        { status: 400 },
      )
    }

    console.log("[Automation] Sending after-blueprint-rewrite email to:", email)

    // Check if we've already sent this email (prevent duplicates)
    const existingLog = await sql`
      SELECT id FROM email_logs
      WHERE user_email = ${email}
        AND email_type = 'blueprint-rewrite'
        AND status = 'sent'
        AND timestamp > NOW() - INTERVAL '1 hour'
      LIMIT 1
    `

    if (existingLog.length > 0) {
      console.log("[Automation] Blueprint rewrite email already sent recently to:", email)
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

    // Use the existing blueprint rewrite automation
    const result = await sendRewrittenBlueprintEmail({
      email,
      firstName: userFirstName,
      blueprintData,
      userId: userId.toString(),
    })

    // Log to email_logs
    await sql`
      INSERT INTO email_logs (
        user_email,
        user_id,
        email_type,
        status,
        timestamp
      )
      VALUES (
        ${email},
        ${userId},
        'blueprint-rewrite',
        ${result.success ? "sent" : "failed"},
        NOW()
      )
    `

    if (!result.success) {
      console.error("[Automation] Failed to send blueprint rewrite email:", result.error)
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 },
      )
    }

    console.log("[Automation] Blueprint rewrite email sent successfully")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Automation] Error in send-after-blueprint-rewrite:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

