/**
 * Admin: Win-Back Backfill
 *
 * One-time endpoint to send Email 1 (Day 3 / "Something I want to say") to
 * users who cancelled BEFORE the win-back sequence was wired. This covers the
 * ~24 users who already cancelled and never received the email.
 *
 * POST /api/admin/win-back-backfill
 * Auth: Bearer CRON_SECRET header
 * Body (optional): { "dryRun": true }  → lists candidates without sending
 */

import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/send-email"
import { generateWinBackDay3Email } from "@/lib/email/templates/win-back-day3"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let dryRun = false
  try {
    const body = await request.json()
    dryRun = !!body?.dryRun
  } catch {
    // No body — default to live send
  }

  console.log("[win-back-backfill] Starting. dryRun=" + dryRun)

  const candidates = await sql`
    SELECT
      u.email,
      u.display_name,
      s.updated_at AS canceled_at
    FROM subscriptions s
    INNER JOIN users u ON u.id = s.user_id
    WHERE s.status = 'canceled'
      AND s.updated_at <= NOW() - INTERVAL '3 days'
      AND u.email IS NOT NULL
      AND u.email != ''
      AND NOT EXISTS (
        SELECT 1 FROM email_logs el
        WHERE el.user_email = u.email
          AND el.email_type = 'win-back-day3'
          AND el.status IN ('sent', 'delivered')
      )
      AND NOT EXISTS (
        SELECT 1 FROM subscriptions s2
        WHERE s2.user_id = s.user_id
          AND s2.status = 'active'
      )
    ORDER BY s.updated_at ASC
  `

  console.log("[win-back-backfill] Found " + candidates.length + " candidates")

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      candidates: (candidates as any[]).map((c) => ({
        email: c.email,
        name: c.display_name,
        canceledAt: c.canceled_at,
      })),
      count: candidates.length,
    })
  }

  const results = { sent: 0, failed: 0, errors: [] as Array<{ email: string; error: string }> }

  for (const user of candidates as any[]) {
    try {
      const emailContent = generateWinBackDay3Email({
        firstName: user.display_name?.split(" ")[0],
        recipientEmail: user.email,
      })

      const result = await sendEmail({
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        emailType: "win-back-day3",
        replyTo: "hello@sselfie.ai",
        tags: ["win-back", "win-back-day3", "backfill"],
      })

      if (result.success) {
        results.sent++
        console.log("[win-back-backfill] Sent to " + user.email)
      } else {
        results.failed++
        results.errors.push({ email: user.email, error: result.error || "unknown" })
        console.error("[win-back-backfill] Failed for " + user.email + ":", result.error)
      }
    } catch (err: any) {
      results.failed++
      results.errors.push({ email: user.email, error: err.message || "unknown" })
    }

    await new Promise((r) => setTimeout(r, 200))
  }

  console.log("[win-back-backfill] Done. sent=" + results.sent + " failed=" + results.failed)

  return NextResponse.json({
    success: true,
    sent: results.sent,
    failed: results.failed,
    errors: results.errors,
  })
}
