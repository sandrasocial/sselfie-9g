import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sendEmail, sendBulkEmails } from "@/lib/email/send-email"
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
    const { type, campaignId, recipients, subject, html, text, scheduledFor } = body

    if (type === "single") {
      // Send single email
      const result = await sendEmail({
        to: recipients,
        subject,
        html,
        text,
      })

      return NextResponse.json(result)
    } else if (type === "campaign") {
      // Send campaign email
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

      // Prevent duplicate sends - check if campaign was already sent
      if (campaign.status === "sent") {
        return NextResponse.json(
          { 
            error: "Campaign has already been sent. Cannot send again.",
            campaignId: campaign.id,
            sentAt: campaign.sent_at
          },
          { status: 400 }
        )
      }

      // Prevent sending if already in progress
      if (campaign.status === "sending") {
        return NextResponse.json(
          { 
            error: "Campaign is currently being sent. Please wait for it to complete.",
            campaignId: campaign.id
          },
          { status: 400 }
        )
      }

      // Get recipients based on target audience
      const targetAudience = campaign.target_audience || {}
      let recipientEmails: string[] = []

      if (targetAudience.all_users) {
        const users = await sql`
          SELECT email FROM users
          WHERE email IS NOT NULL
        `
        recipientEmails = users.map((u: any) => u.email)
      } else if (targetAudience.plan) {
        const users = await sql`
          SELECT email FROM users
          WHERE email IS NOT NULL AND plan = ${targetAudience.plan}
        `
        recipientEmails = users.map((u: any) => u.email)
      } else if (recipients && Array.isArray(recipients)) {
        recipientEmails = recipients
      }

      if (recipientEmails.length === 0) {
        return NextResponse.json({ error: "No recipients found" }, { status: 400 })
      }

      // Update campaign status
      await sql`
        UPDATE admin_email_campaigns
        SET status = 'sending', total_recipients = ${recipientEmails.length}, updated_at = NOW()
        WHERE id = ${campaignId}
      `

      // Send emails
      const results = await sendBulkEmails(
        recipientEmails,
        campaign.subject_line,
        campaign.body_html,
        campaign.body_text,
      )

      // Update campaign with results
      await sql`
        UPDATE admin_email_campaigns
        SET 
          status = 'sent',
          sent_at = NOW(),
          total_recipients = ${recipientEmails.length},
          metrics = ${JSON.stringify({ sent: results.sent, failed: results.failed, errors: results.errors })},
          updated_at = NOW()
        WHERE id = ${campaignId}
      `

      return NextResponse.json({
        success: true,
        sent: results.sent,
        failed: results.failed,
        errors: results.errors,
      })
    } else if (type === "schedule") {
      // Schedule campaign for later
      if (!campaignId || !scheduledFor) {
        return NextResponse.json({ error: "Campaign ID and scheduled time required" }, { status: 400 })
      }

      await sql`
        UPDATE admin_email_campaigns
        SET status = 'scheduled', scheduled_for = ${scheduledFor}, updated_at = NOW()
        WHERE id = ${campaignId}
      `

      return NextResponse.json({ success: true, message: "Campaign scheduled" })
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Error sending email:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
