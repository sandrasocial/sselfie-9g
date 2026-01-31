import { type NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/email/send-email"
import { generateLaunchEmail } from "@/lib/email/templates/archived/launch-email-beta"
import { createApiLogger } from "@/lib/api-logger"

export async function POST(request: NextRequest) {
  const apiLogger = createApiLogger(request)
  apiLogger.start()

  try {
    const { testEmail } = await request.json()

    if (!testEmail) {
      return NextResponse.json({ error: "Test email required" }, { status: 400 })
    }

    const adminEmail = process.env.ADMIN_EMAIL || testEmail

    console.log("[v0] Sending test launch email to:", adminEmail)

    const { html, text } = generateLaunchEmail({
      recipientName: "Sandra (Test)",
      trackingId: `test_${Date.now()}`,
    })

    const result = await sendEmail({
      to: adminEmail,
      subject: "🚨 TEST: THE DOORS ARE OPEN - SSELFIE Studio Beta is LIVE",
      html,
      text,
      tags: ["launch", "test", "beta"],
    })

    if (!result.success) {
      apiLogger.error(new Error(result.error || "Email send failed"), 500)
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    const response = NextResponse.json({
      success: true,
      messageId: result.messageId,
      message: `Test email sent to ${adminEmail}`,
    })
    apiLogger.success(200, { messageId: result.messageId })
    return response
  } catch (error) {
    console.error("[v0] Error sending test launch email:", error)
    apiLogger.error(error, 500)
    return NextResponse.json({ error: "Failed to send test email" }, { status: 500 })
  }
}
