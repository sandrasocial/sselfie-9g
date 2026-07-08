// SUITE month-one habit system cron (copy approved 2026-06-10).
// Runs daily. Three jobs, all deduped via email_logs and gated by SUITE_HABIT_EMAILS_ENABLED:
//   1. Day 0  - new members (joined < 7 days) get the first-shoot welcome once.
//   2. +48h   - members 2-30 days in who have generated NOTHING get one gentle nudge.
//   3. Monday - every active member gets the weekly drop (one look, rotates by ISO week).
// Older zero-usage members are deliberately excluded - they get Sandra's personal rescue email.
// Test accounts (sselfie.ai addresses, smoke users) are always excluded.

import { NextResponse } from "next/server"

import { createCronLogger } from "@/lib/cron-logger"
import { sql } from "@/lib/db/client"
import { envFlag } from "@/lib/env-flags"
import { getUserCredits } from "@/lib/credits"
import { shouldEnforceLiveSubscriptionRows } from "@/lib/subscription"
import { sendEmail } from "@/lib/email/send-email"
import {
  generateSuiteDay0Email,
  generateSuiteNudgeEmail,
  generateSuiteWeeklyDropEmail,
  weeklyDropLookForDate,
  SUITE_DAY0_EMAIL_TYPE,
  SUITE_NUDGE_EMAIL_TYPE,
  SUITE_WEEKLY_DROP_EMAIL_TYPE,
} from "@/lib/email/templates/suite-habit-emails"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const FROM_EMAIL = "Sandra from SSELFIE <hello@sselfie.ai>"
const REPLY_TO_EMAIL = "hello@sselfie.ai"
const SEND_DELAY_MS = 650
const BATCH_LIMIT = 50

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

interface MemberRow {
  user_id: string
  email: string
  first_name: string
}

/** Active, real (non-test) members. firstName falls back to the email prefix. */
async function activeMembers(): Promise<MemberRow[]> {
  return (await sql`
    SELECT
      s.user_id,
      LOWER(u.email) AS email,
      COALESCE(NULLIF(u.first_name, ''), NULLIF(u.display_name, ''), SPLIT_PART(u.email, '@', 1)) AS first_name,
      s.created_at
    FROM subscriptions s
    JOIN users u ON u.id::text = s.user_id
    WHERE s.product_type = 'sselfie_studio_membership'
      AND s.status = 'active'
      AND (s.is_test_mode = FALSE OR s.is_test_mode IS NULL)
      AND u.email IS NOT NULL
      AND u.email NOT ILIKE '%@sselfie.ai'
      AND COALESCE(u.display_name, '') <> 'Smoke User'
    ORDER BY s.created_at DESC
    LIMIT ${BATCH_LIMIT}
  `) as unknown as MemberRow[]
}

async function alreadySent(email: string, emailType: string, withinDays: number): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM email_logs
    WHERE LOWER(user_email) = ${email}
      AND email_type = ${emailType}
      AND status IN ('sent', 'delivered', 'suppressed')
      AND sent_at > NOW() - (${`${withinDays} days`}::interval)
    LIMIT 1
  `
  return rows.length > 0
}

async function memberJoinedWithin(userId: string, minDays: number, maxDays: number): Promise<boolean> {
  const enforceLiveMode = shouldEnforceLiveSubscriptionRows()
  const rows = await sql`
    SELECT 1 FROM subscriptions
    WHERE user_id = ${userId}
      AND product_type = 'sselfie_studio_membership'
      AND status = 'active'
      AND (${enforceLiveMode} = false OR COALESCE(is_test_mode, false) = false)
      AND created_at <= NOW() - (${`${minDays} days`}::interval)
      AND created_at > NOW() - (${`${maxDays} days`}::interval)
    LIMIT 1
  `
  return rows.length > 0
}

async function hasGeneratedAnything(userId: string): Promise<boolean> {
  const rows = await sql`SELECT 1 FROM ai_images WHERE user_id::text = ${userId} LIMIT 1`
  return rows.length > 0
}

export async function GET(request: Request) {
  const cronLogger = createCronLogger("suite-habit-emails")
  await cronLogger.start()

  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    const isProduction =
      process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction) {
      if (!cronSecret) {
        await cronLogger.error(new Error("Unauthorized"), { reason: "CRON_SECRET not set in production" })
        return NextResponse.json({ error: "Unauthorized: CRON_SECRET required" }, { status: 401 })
      }
      if (authHeader !== `Bearer ${cronSecret}`) {
        await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    if (!envFlag("SUITE_HABIT_EMAILS_ENABLED")) {
      const summary = { enabled: false, day0: 0, nudges: 0, weekly: 0 }
      await cronLogger.success(summary)
      return NextResponse.json({ success: true, ...summary })
    }

    const members = await activeMembers()
    const now = new Date()
    const isMonday = now.getUTCDay() === 1
    const results = { enabled: true, members: members.length, day0: 0, nudges: 0, weekly: 0, failed: 0 }

    for (const m of members) {
      try {
        // ── 1. Day 0: joined within the last 7 days, welcome not yet sent (ever). ──
        if (await memberJoinedWithin(m.user_id, 0, 7)) {
          if (!(await alreadySent(m.email, SUITE_DAY0_EMAIL_TYPE, 3650))) {
            const email = generateSuiteDay0Email({ firstName: m.first_name })
            const sent = await sendEmail({
              to: m.email,
              from: FROM_EMAIL,
              replyTo: REPLY_TO_EMAIL,
              subject: email.subject,
              html: email.html,
              text: email.text,
              emailType: SUITE_DAY0_EMAIL_TYPE,
              tags: ["suite", "habit-day0"],
              marketing: true,
            })
            if (sent.success) results.day0 += 1
            else results.failed += 1
            await sleep(SEND_DELAY_MS)
          }
        }

        // ── 2. +48h nudge: 2-30 days in, zero generations, nudge not yet sent. ──
        if (await memberJoinedWithin(m.user_id, 2, 30)) {
          if (
            !(await hasGeneratedAnything(m.user_id)) &&
            !(await alreadySent(m.email, SUITE_NUDGE_EMAIL_TYPE, 3650))
          ) {
            const email = generateSuiteNudgeEmail({ firstName: m.first_name })
            const sent = await sendEmail({
              to: m.email,
              from: FROM_EMAIL,
              replyTo: REPLY_TO_EMAIL,
              subject: email.subject,
              html: email.html,
              text: email.text,
              emailType: SUITE_NUDGE_EMAIL_TYPE,
              tags: ["suite", "habit-nudge"],
              marketing: true,
            })
            if (sent.success) results.nudges += 1
            else results.failed += 1
            await sleep(SEND_DELAY_MS)
          }
        }

        // ── 3. Weekly drop: Mondays, once per week, every active member. ──
        if (isMonday && !(await alreadySent(m.email, SUITE_WEEKLY_DROP_EMAIL_TYPE, 6))) {
          const credits = await getUserCredits(m.user_id).catch(() => null)
          const email = generateSuiteWeeklyDropEmail({
            firstName: m.first_name,
            look: weeklyDropLookForDate(now),
            credits,
          })
          const sent = await sendEmail({
            to: m.email,
            from: FROM_EMAIL,
            replyTo: REPLY_TO_EMAIL,
            subject: email.subject,
            html: email.html,
            text: email.text,
            emailType: SUITE_WEEKLY_DROP_EMAIL_TYPE,
            tags: ["suite", "weekly-drop"],
            marketing: true,
          })
          if (sent.success) results.weekly += 1
          else results.failed += 1
          await sleep(SEND_DELAY_MS)
        }
      } catch (memberError) {
        results.failed += 1
        console.error("[suite-habit-emails] member processing failed:", {
          email: m.email.replace(/(.{2}).*(@.*)/, "$1***$2"),
          error: memberError,
        })
      }
    }

    await cronLogger.success(results)
    return NextResponse.json({ success: true, ...results })
  } catch (error: unknown) {
    await cronLogger.error(error, { step: "suite-habit-emails" })
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "suite-habit-emails cron failed" },
      { status: 500 },
    )
  }
}
