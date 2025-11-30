/**
 * Automation: Send After Studio Purchase
 * Triggered when user purchases Studio subscription via Stripe webhook
 * POST /api/automations/send-after-studio-purchase
 */

import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/send"
import { startStudioOnboardingSequence } from "@/lib/email/automations"

const sql = neon(process.env.DATABASE_URL!)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, userId, firstName } = body

    if (!email || !userId) {
      return NextResponse.json(
        { error: "Email and userId are required" },
        { status: 400 },
      )
    }

    console.log("[Automation] Sending after-studio-purchase email to:", email)

    // Check if we've already sent this email (prevent duplicates)
    const existingLog = await sql`
      SELECT id FROM email_logs
      WHERE user_email = ${email}
        AND email_type = 'studio-purchase'
        AND status = 'sent'
      LIMIT 1
    `

    if (existingLog.length > 0) {
      console.log("[Automation] Studio purchase email already sent to:", email)
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

    // Start studio onboarding sequence
    const result = await startStudioOnboardingSequence({
      email,
      firstName: userFirstName,
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
        'studio-purchase',
        ${result.success ? "sent" : "failed"},
        NOW()
      )
    `

    if (!result.success) {
      console.error("[Automation] Failed to start studio onboarding:", result.errors)
      return NextResponse.json(
        {
          success: false,
          scheduled: result.scheduled,
          errors: result.errors,
        },
        { status: 500 },
      )
    }

    console.log(
      `[Automation] Studio purchase onboarding started: ${result.scheduled} emails scheduled`,
    )

    return NextResponse.json({
      success: true,
      scheduled: result.scheduled,
    })
  } catch (error) {
    console.error("[Automation] Error in send-after-studio-purchase:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

