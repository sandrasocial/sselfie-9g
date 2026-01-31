import type { NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"
import { generateLaunchFollowupEmail } from "@/lib/email/templates/archived/launch-followup-email-beta"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL!)
const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    // Admin auth check
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== process.env.ADMIN_EMAIL) {
      return Response.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    console.log("[v0] Starting follow-up email campaign...")

    // Fetch subscribers who were emailed but haven't purchased
    const subscribers = await sql`
      SELECT fs.id, fs.email, fs.name
      FROM freebie_subscribers fs
      WHERE fs.tags @> '["launch_email_sent"]'::jsonb
      AND NOT fs.tags @> '["purchased"]'::jsonb
      AND NOT fs.tags @> '["followup_sent"]'::jsonb
      ORDER BY fs.created_at DESC
    `

    console.log(`[v0] Found ${subscribers.length} subscribers for follow-up`)

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const subscriber of subscribers) {
      try {
        const trackingId = subscriber.id
        const emailContent = generateLaunchFollowupEmail({
          recipientEmail: subscriber.email,
          recipientName: subscriber.name || undefined,
          trackingId: trackingId,
        })

        await resend.emails.send({
          from: "Sandra @ SSELFIE <hello@sselfie.ai>",
          to: subscriber.email,
          subject: "The beta window is closing... ⏰",
          html: emailContent.html,
          text: emailContent.text,
          tracking_opens: false,
          tracking_clicks: false,
        })

        // Tag as followup sent
        await sql`
          UPDATE freebie_subscribers
          SET tags = COALESCE(tags, '[]'::jsonb) || jsonb_build_array('followup_sent'),
              updated_at = NOW()
          WHERE id = ${subscriber.id}
        `

        successCount++
        await new Promise((resolve) => setTimeout(resolve, 200))
      } catch (emailError) {
        errorCount++
        errors.push(`${subscriber.email}: ${emailError}`)
        console.error(`[v0] Error sending to ${subscriber.email}:`, emailError)
      }
    }

    return Response.json({
      success: true,
      totalSubscribers: subscribers.length,
      successCount,
      errorCount,
      errors: errors.slice(0, 10),
    })
  } catch (error) {
    console.error("[v0] Follow-up campaign error:", error)
    return Response.json({ error: "Campaign failed", details: String(error) }, { status: 500 })
  }
}
