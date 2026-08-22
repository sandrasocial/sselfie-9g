import { createHash } from "node:crypto"
import { NextResponse } from "next/server"

import { createCronLogger } from "@/lib/cron-logger"
import { sql } from "@/lib/db/client"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { sendEmail } from "@/lib/email/send-email"
import {
  generatePromptVaultMembershipBridgeEmail,
  generateStarterKitMembershipBridgeEmail,
} from "@/lib/email/templates/paid-product-membership-bridge"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const FROM_EMAIL = "Sandra from SSELFIE <hello@sselfie.ai>"
const REPLY_TO_EMAIL = "hello@sselfie.ai"
const EMAIL_TYPE = "paid-product-membership-bridge"
const ROLLOUT_START = "2026-07-23"
const BATCH_LIMIT = 50
const SEND_DELAY_MS = 200

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

type Candidate = {
  email: string
  name: string | null
  product: "starter_kit" | "prompt_vault"
  purchased_at: string
}

function idempotencyKey(email: string): string {
  const hash = createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 24)
  return `paid-product-membership-bridge:${hash}`
}

async function getCandidates(): Promise<Candidate[]> {
  return (await sql`
    WITH buyer_events AS (
      -- Starter Kit ownership currently has the most reliable canonical row in subscriptions.
      SELECT
        LOWER(BTRIM(u.email)) AS email,
        COALESCE(NULLIF(BTRIM(fs.name), ''), NULLIF(BTRIM(u.display_name), '')) AS name,
        'starter_kit'::text AS product,
        s.created_at AS purchased_at
      FROM subscriptions s
      INNER JOIN users u ON u.id::varchar = s.user_id
      LEFT JOIN freebie_subscribers fs ON LOWER(BTRIM(fs.email)) = LOWER(BTRIM(u.email))
      WHERE s.product_type = 'starter_kit'
        AND s.status = 'active'
        AND COALESCE(s.is_test_mode, FALSE) = FALSE
        AND s.created_at >= ${ROLLOUT_START}::date

      UNION ALL

      -- Prompt Vault uses payment truth so old lead/buyer tags can never qualify a non-buyer.
      SELECT
        LOWER(BTRIM(sp.customer_email)) AS email,
        COALESCE(NULLIF(BTRIM(fs.name), ''), NULLIF(BTRIM(u.display_name), '')) AS name,
        'prompt_vault'::text AS product,
        sp.payment_date AS purchased_at
      FROM stripe_payments sp
      LEFT JOIN freebie_subscribers fs
        ON LOWER(BTRIM(fs.email)) = LOWER(BTRIM(sp.customer_email))
      LEFT JOIN users u
        ON LOWER(BTRIM(u.email)) = LOWER(BTRIM(sp.customer_email))
      WHERE sp.product_type = 'prompt_vault'
        AND sp.status IN ('succeeded', 'paid')
        AND COALESCE(sp.is_test_mode, FALSE) = FALSE
        AND sp.customer_email IS NOT NULL
        AND BTRIM(sp.customer_email) <> ''
        AND sp.payment_date >= ${ROLLOUT_START}::date
    ),
    latest_buyer_event AS (
      SELECT DISTINCT ON (email)
        email,
        name,
        product,
        purchased_at
      FROM buyer_events
      WHERE email IS NOT NULL AND email <> ''
      ORDER BY email, purchased_at DESC
    )
    SELECT
      b.email,
      b.name,
      b.product,
      b.purchased_at
    FROM latest_buyer_event b
    WHERE (
        (b.product = 'starter_kit' AND b.purchased_at <= NOW() - INTERVAL '10 days')
        OR
        (b.product = 'prompt_vault' AND b.purchased_at <= NOW() - INTERVAL '14 days')
      )
      AND NOT EXISTS (
        SELECT 1
        FROM users member_user
        INNER JOIN subscriptions member_subscription
          ON member_subscription.user_id = member_user.id::varchar
        WHERE LOWER(BTRIM(member_user.email)) = b.email
          AND member_subscription.product_type IN (
            'sselfie_studio_membership',
            'sselfie_studio_membership_annual'
          )
          AND member_subscription.status IN ('active', 'trialing')
      )
      AND NOT EXISTS (
        SELECT 1
        FROM email_logs el
        WHERE LOWER(BTRIM(el.user_email)) = b.email
          AND el.email_type = ${EMAIL_TYPE}
          AND el.status IN ('sent', 'delivered', 'suppressed')
      )
    ORDER BY b.purchased_at ASC
    LIMIT ${BATCH_LIMIT}
  `) as Candidate[]
}

export async function GET(request: Request) {
  const logger = createCronLogger("paid-product-membership-bridge")
  await logger.start()

  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    const isProduction =
      process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction) {
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        await logger.error(new Error("Unauthorized"), { reason: "Invalid cron authorization" })
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const dryRun = new URL(request.url).searchParams.get("dry_run") === "1"
    const candidates = await getCandidates()
    const summary = {
      dryRun,
      found: candidates.length,
      starterKit: candidates.filter(candidate => candidate.product === "starter_kit").length,
      promptVault: candidates.filter(candidate => candidate.product === "prompt_vault").length,
      sent: 0,
      failed: 0,
    }

    if (dryRun) {
      await logger.success(summary)
      return NextResponse.json({ success: true, ...summary })
    }

    for (const candidate of candidates) {
      const firstName = getFirstNameForEmail({ fullName: candidate.name, email: candidate.email })
      const email =
        candidate.product === "starter_kit"
          ? generateStarterKitMembershipBridgeEmail({ firstName })
          : generatePromptVaultMembershipBridgeEmail({ firstName })

      const result = await sendEmail({
        to: candidate.email,
        from: FROM_EMAIL,
        replyTo: REPLY_TO_EMAIL,
        subject: email.subject,
        html: email.html,
        text: email.text,
        emailType: EMAIL_TYPE,
        tags: ["lifecycle", "paid-buyer", "membership-bridge", candidate.product],
        marketing: true,
        idempotencyKey: idempotencyKey(candidate.email),
      })

      if (result.success) summary.sent += 1
      else summary.failed += 1

      await sleep(SEND_DELAY_MS)
    }

    await logger.success(summary)
    return NextResponse.json({ success: true, ...summary })
  } catch (error: unknown) {
    await logger.error(error, { step: "paid-product-membership-bridge" })
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Buyer membership bridge failed",
      },
      { status: 500 },
    )
  }
}
