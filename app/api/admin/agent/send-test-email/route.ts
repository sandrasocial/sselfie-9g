import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sendEmail } from "@/lib/email/send-email"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { campaignId, testEmail } = body

    if (!campaignId) {
      return NextResponse.json({ error: "Campaign ID required" }, { status: 400 })
    }

    // Get campaign details
    const [campaign] = await sql`
      SELECT * FROM admin_email_campaigns
      WHERE id = ${campaignId}
    `

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    const recipientEmail = testEmail || ADMIN_EMAIL

    // Send test email with [TEST] prefix
    const result = await sendEmail({
      to: recipientEmail,
      subject: `[TEST] ${campaign.subject_line}`,
      html: campaign.body_html,
      text: campaign.body_text,
    })

    // Track test email sent
    await sql`
      UPDATE admin_email_campaigns
      SET 
        test_email_sent_to = ${recipientEmail},
        test_email_sent_at = NOW(),
        updated_at = NOW()
      WHERE id = ${campaignId}
    `

    return NextResponse.json({ success: true, message: `Test email sent to ${recipientEmail}` })
  } catch (error) {
    console.error("[v0] Error sending test email:", error)
    return NextResponse.json({ error: "Failed to send test email" }, { status: 500 })
  }
}
