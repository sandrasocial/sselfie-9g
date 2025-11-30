/**
 * Weekly Newsletter Automation
 * POST /api/email/weekly-newsletter
 * 
 * Triggers: generateAndSendWeeklyNewsletter()
 * Access: Admin only
 */

import { NextResponse } from "next/server"
import { generateAndSendWeeklyNewsletter } from "@/lib/email/automations"
import { requireAdminOrKey } from "@/lib/email/auth-helpers"

export async function POST(request: Request) {
  try {
    console.log("[Email API] Weekly newsletter request received")

    // Authenticate: Admin only
    const auth = await requireAdminOrKey(request)
    if (auth instanceof NextResponse) {
      return auth
    }

    console.log("[Email API] Generating and sending weekly newsletter...")

    // Trigger automation
    const result = await generateAndSendWeeklyNewsletter()

    if (!result.success) {
      console.error("[Email API] Failed to send weekly newsletter:", result.error)
      return NextResponse.json(
        {
          success: false,
          sent: result.sent,
          error: result.error,
        },
        { status: 500 },
      )
    }

    console.log(
      `[Email API] Weekly newsletter sent successfully to ${result.sent} subscribers`,
    )

    return NextResponse.json({
      success: true,
      sent: result.sent,
    })
  } catch (error) {
    console.error("[Email API] Error in weekly newsletter route:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

