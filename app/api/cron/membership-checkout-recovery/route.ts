// FUNNEL-2026-06-11 - membership checkout abandonment → 7-day trial offer.
//
// Someone who reached the €97 checkout and walked away is the highest-intent lead in the
// funnel; before this cron they got silence. Mirrors prompt-vault-checkout-recovery:
// hydrate emails from Stripe sessions (membership starts land with no email captured),
// then send ONE trial-offer email per address. The claim page enforces one trial per
// person ever, so the offer can't be farmed.
//
// Enabled by default (kill switch: MEMBERSHIP_CHECKOUT_RECOVERY_DISABLED=true).
// Idempotent via checkout_attribution.recovery_email_sent_at + email_logs.

import { NextResponse } from "next/server"
import { randomUUID } from "crypto"

import { logAnalyticsEvent } from "@/lib/analytics/events"
import { createCronLogger } from "@/lib/cron-logger"
import { sql } from "@/lib/db/client"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { sendEmail } from "@/lib/email/send-email"
import { stripe } from "@/lib/stripe"
import {
  generateMembershipCheckoutRecoveryEmail,
  MEMBERSHIP_CHECKOUT_RECOVERY_EMAIL_TYPE,
} from "@/lib/email/templates/membership-checkout-recovery"
import { ensureRevenueEngineSchema } from "@/lib/revenue-engine/checkout-attribution"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const FROM_EMAIL = "Sandra from SSELFIE <hello@sselfie.ai>"
const REPLY_TO_EMAIL = "hello@sselfie.ai"
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type Candidate = { session_id: string; user_email: string; created_at: string }

async function hydrateMembershipEmails() {
  const sessions = (await sql`
    SELECT session_id FROM checkout_attribution
    WHERE product_type = 'sselfie_studio_membership'
      AND status = 'started'
      AND (user_email IS NULL OR BTRIM(user_email) = '')
      AND created_at > NOW() - INTERVAL '7 days'
      AND COALESCE(email_hydration_attempts, 0) < 3
      AND (email_hydration_checked_at IS NULL OR email_hydration_checked_at < NOW() - INTERVAL '12 hours')
    ORDER BY created_at DESC
    LIMIT 50
  `) as Array<{ session_id: string }>

  let hydrated = 0
  for (const row of sessions) {
    try {
      const session = await stripe.checkout.sessions.retrieve(row.session_id)
      const email = session.customer_details?.email?.trim() || session.customer_email?.trim() || null
      if (email) {
        await sql`
          UPDATE checkout_attribution
          SET user_email = ${email}, email_hydration_checked_at = NOW(),
              email_hydration_attempts = COALESCE(email_hydration_attempts, 0) + 1, updated_at = NOW()
          WHERE session_id = ${row.session_id} AND (user_email IS NULL OR BTRIM(user_email) = '')
        `
        hydrated++
      } else {
        await sql`
          UPDATE checkout_attribution
          SET email_hydration_checked_at = NOW(),
              email_hydration_attempts = COALESCE(email_hydration_attempts, 0) + 1, updated_at = NOW()
          WHERE session_id = ${row.session_id}
        `
      }
    } catch {
      await sql`
        UPDATE checkout_attribution
        SET email_hydration_checked_at = NOW(),
            email_hydration_attempts = COALESCE(email_hydration_attempts, 0) + 1, updated_at = NOW()
        WHERE session_id = ${row.session_id}
      `
    }
    await sleep(120)
  }
  return { checked: sessions.length, hydrated }
}

async function getCandidates(): Promise<Candidate[]> {
  return (await sql`
    WITH eligible AS (
      SELECT session_id, user_email, created_at,
        ROW_NUMBER() OVER (PARTITION BY LOWER(BTRIM(user_email)) ORDER BY created_at ASC) AS email_rank
      FROM checkout_attribution
      WHERE product_type = 'sselfie_studio_membership'
        AND status = 'started'
        AND user_email IS NOT NULL AND BTRIM(user_email) <> ''
        AND recovery_email_sent_at IS NULL
        AND created_at <= NOW() - INTERVAL '1 hour'
        AND created_at > NOW() - INTERVAL '7 days'
        -- never offer the trial to members, past trial users, or anyone already invited
        AND NOT EXISTS (
          SELECT 1 FROM users u
          JOIN subscriptions s ON s.user_id = u.id
          WHERE LOWER(u.email) = LOWER(BTRIM(checkout_attribution.user_email))
            AND (
              (s.product_type = 'sselfie_studio_membership' AND s.status = 'active')
              OR s.product_type = 'suite_trial'
            )
        )
        AND NOT EXISTS (
          SELECT 1 FROM email_logs el
          WHERE LOWER(BTRIM(el.user_email)) = LOWER(BTRIM(checkout_attribution.user_email))
            AND el.email_type IN (${MEMBERSHIP_CHECKOUT_RECOVERY_EMAIL_TYPE}, 'suite_trial_unlock')
            AND el.status IN ('sent', 'delivered', 'suppressed')
        )
    )
    SELECT session_id, user_email, created_at FROM eligible
    WHERE email_rank = 1
    ORDER BY created_at ASC
    LIMIT 25
  `) as Candidate[]
}

/** Mint (or reuse) a claim token so the trial offer links straight into /claim/[token]. */
async function ensureClaimToken(email: string): Promise<{ token: string; name: string | null }> {
  const existing = await sql`
    SELECT access_token, name FROM freebie_subscribers
    WHERE LOWER(email) = LOWER(${email}) LIMIT 1
  `
  const row = existing[0] as { access_token?: string | null; name?: string | null } | undefined
  if (row?.access_token?.trim()) return { token: row.access_token.trim(), name: row.name ?? null }

  const token = randomUUID()
  if (row) {
    await sql`
      UPDATE freebie_subscribers SET access_token = ${token}, updated_at = NOW()
      WHERE LOWER(email) = LOWER(${email})
    `
    return { token, name: row.name ?? null }
  }
  await sql`
    INSERT INTO freebie_subscribers (email, name, source, access_token, created_at, updated_at)
    VALUES (${email}, ${email.split("@")[0]}, 'membership-abandon', ${token}, NOW(), NOW())
  `
  return { token, name: null }
}

export async function GET(request: Request) {
  const cronLogger = createCronLogger("membership-checkout-recovery")
  await cronLogger.start()

  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"
    if (isProduction) {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        await cronLogger.error(new Error("Unauthorized"))
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    if (process.env.MEMBERSHIP_CHECKOUT_RECOVERY_DISABLED === "true") {
      await cronLogger.success({ skipped: "disabled via env" })
      return NextResponse.json({ success: true, skipped: "disabled" })
    }

    await ensureRevenueEngineSchema()
    const hydration = await hydrateMembershipEmails()
    const candidates = await getCandidates()
    const results = { hydration, sent: 0, failed: 0 }

    for (const candidate of candidates) {
      try {
        const { token, name } = await ensureClaimToken(candidate.user_email)
        const firstName = getFirstNameForEmail({ fullName: name, email: candidate.user_email })
        const email = generateMembershipCheckoutRecoveryEmail({
          firstName,
          claimUrl: `${SITE_URL}/claim/${token}`,
        })
        const result = await sendEmail({
          to: candidate.user_email,
          from: FROM_EMAIL,
          replyTo: REPLY_TO_EMAIL,
          subject: email.subject,
          html: email.html,
          text: email.text,
          emailType: MEMBERSHIP_CHECKOUT_RECOVERY_EMAIL_TYPE,
          tags: ["membership", "checkout-recovery", "trial-offer"],
          marketing: true,
        })
        await sql`
          UPDATE checkout_attribution
          SET status = 'abandoned', recovery_email_sent_at = NOW(),
              recovery_email_type = ${MEMBERSHIP_CHECKOUT_RECOVERY_EMAIL_TYPE},
              recovery_email_message_id = ${("messageId" in result && result.messageId) || null},
              updated_at = NOW()
          WHERE session_id = ${candidate.session_id}
        `
        if (result.success) {
          results.sent++
          await logAnalyticsEvent({
            eventName: "membership_checkout_recovery_sent",
            path: "/api/cron/membership-checkout-recovery",
            properties: { session_id: candidate.session_id },
          }).catch(() => {})
        } else {
          results.failed++
        }
        await sleep(650)
      } catch (e) {
        console.error(`[membership-recovery] failed for ${candidate.user_email}:`, e)
        results.failed++
      }
    }

    await cronLogger.success(results)
    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error("[membership-recovery] cron failed:", error)
    await cronLogger.error(error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: "Membership recovery cron failed" }, { status: 500 })
  }
}
