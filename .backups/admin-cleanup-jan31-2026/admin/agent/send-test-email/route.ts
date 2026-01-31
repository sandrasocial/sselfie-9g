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
    const { campaignId, testEmail, subject, html } = body

    // Support both: campaignId (existing campaign) OR direct email data (before campaign creation)
    let emailSubject: string
    let emailHtml: string
    let emailText: string

    // Use explicit null/undefined check to handle campaignId === 0 correctly
    if (campaignId !== null && campaignId !== undefined) {
      // Get campaign details from database
      const [campaign] = await sql`
        SELECT * FROM admin_email_campaigns
        WHERE id = ${campaignId}
      `

      if (!campaign) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
      }

      emailSubject = campaign.subject_line
      emailHtml = campaign.body_html
      emailText = campaign.body_text || ''

      // Track test email sent for existing campaign
      const recipientEmail = testEmail || ADMIN_EMAIL
      await sql`
        UPDATE admin_email_campaigns
        SET 
          test_email_sent_to = ${recipientEmail},
          test_email_sent_at = NOW(),
          updated_at = NOW()
        WHERE id = ${campaignId}
      `
    } else if (subject && html) {
      // Use provided email data directly (for testing before campaign creation)
      emailSubject = subject
      emailHtml = html
      emailText = html.replace(/<[^>]*>/g, '').substring(0, 500) // Simple HTML to text conversion
    } else {
      return NextResponse.json({ 
        error: "Either campaignId or (subject + html) required" 
      }, { status: 400 })
    }

    const recipientEmail = testEmail || ADMIN_EMAIL

    // Send test email with [TEST] prefix
    const result = await sendEmail({
      to: recipientEmail,
      subject: `[TEST] ${emailSubject}`,
      html: emailHtml,
      text: emailText,
    })

    return NextResponse.json({ success: true, message: `Test email sent to ${recipientEmail}` })
  } catch (error) {
    console.error("[v0] Error sending test email:", error)
    return NextResponse.json({ error: "Failed to send test email" }, { status: 500 })
  }
}
