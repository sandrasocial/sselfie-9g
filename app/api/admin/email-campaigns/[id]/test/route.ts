import { NextRequest, NextResponse } from "next/server"
import { sendTestEmail } from "@/lib/email/send-newsletter-broadcast"

/**
 * Send test email for a campaign
 *
 * Sends the campaign email to a specified test address
 * (not as a broadcast, just a regular email)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = parseInt(params.id)

    if (isNaN(campaignId)) {
      return NextResponse.json(
        { error: "Invalid campaign ID" },
        { status: 400 }
      )
    }

    const { testEmail } = await req.json()

    if (!testEmail || !testEmail.includes('@')) {
      return NextResponse.json(
        { error: "Valid test email address required" },
        { status: 400 }
      )
    }

    console.log(`[Test Email] Sending test of campaign ${campaignId} to ${testEmail}`)

    await sendTestEmail(campaignId, testEmail)

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${testEmail}`,
      campaign_id: campaignId,
      test_email: testEmail
    })

  } catch (error) {
    console.error("[Test Email] Error:", error)

    return NextResponse.json({
      error: "Failed to send test email",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
