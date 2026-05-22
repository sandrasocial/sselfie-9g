import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { grantPaidBlueprintCredits } from "@/lib/credits"
import { createCronLogger } from "@/lib/cron-logger"
import { sendEmail } from "@/lib/email/send-email"

const WEBHOOK_REVIEW_ALERT_COOLDOWN_HOURS = Number(
  process.env.WEBHOOK_REVIEW_ALERT_COOLDOWN_HOURS || 12,
)
const WEBHOOK_REVIEW_ALERT_ID = "webhook-review-unresolved"

function getAlertRecipients(): string[] {
  const list =
    process.env.ADMIN_ALERT_EMAILS ||
    process.env.ADMIN_ALERT_EMAIL ||
    process.env.ADMIN_EMAIL ||
    ""

  return list
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean)
}

function getAdminWebhookReviewLink(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://www.sselfie.ai"

  return `${base.replace(/\/$/, "")}/admin/webhook-review`
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function maskEmail(email: unknown): string {
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return "unknown"
  }

  const [local, domain] = email.split("@")
  if (!local || !domain) return "unknown"
  return `${local.slice(0, 2)}***@${domain}`
}

function formatAge(createdAt: unknown): string {
  if (!createdAt) return "unknown"
  const created = new Date(String(createdAt)).getTime()
  if (!Number.isFinite(created)) return "unknown"

  const ageMinutes = Math.max(0, Math.round((Date.now() - created) / (1000 * 60)))
  if (ageMinutes < 60) return `${ageMinutes} minute${ageMinutes === 1 ? "" : "s"}`

  const ageHours = Math.round(ageMinutes / 60)
  return `${ageHours} hour${ageHours === 1 ? "" : "s"}`
}

async function wasWebhookReviewAlertSentRecently(): Promise<boolean> {
  try {
    const [result] = await sql`
      SELECT sent_at
      FROM admin_alert_sent
      WHERE alert_id = ${WEBHOOK_REVIEW_ALERT_ID}
        AND sent_at > NOW() - ${WEBHOOK_REVIEW_ALERT_COOLDOWN_HOURS} * INTERVAL '1 hour'
      ORDER BY sent_at DESC
      LIMIT 1
    `

    return Boolean(result?.sent_at)
  } catch (error) {
    console.warn("[v0] [CRON] Webhook review alert history unavailable:", error)
    return false
  }
}

async function recordWebhookReviewAlertSent(alertData: Record<string, unknown>) {
  try {
    await sql`
      INSERT INTO admin_alert_sent (alert_id, alert_type, sent_at, alert_data)
      VALUES (${WEBHOOK_REVIEW_ALERT_ID}, 'webhook-review', NOW(), ${JSON.stringify(alertData)})
    `
  } catch (error) {
    console.warn("[v0] [CRON] Failed to record webhook review alert:", error)
  }
}

async function sendWebhookReviewAlertIfNeeded(): Promise<{
  unresolvedWebhookReviews: number
  webhookReviewAlertSent: boolean
  webhookReviewAlertSkipped?: string
}> {
  const [summary] = await sql`
    SELECT COUNT(*)::int AS count, MIN(created_at) AS oldest_created_at
    FROM webhook_events_needs_review
    WHERE resolved = FALSE
  `
  const unresolvedCount = Number(summary?.count || 0)
  const oldestCreatedAt = summary?.oldest_created_at || null

  if (unresolvedCount === 0) {
    return {
      unresolvedWebhookReviews: 0,
      webhookReviewAlertSent: false,
      webhookReviewAlertSkipped: "no_unresolved_reviews",
    }
  }

  const rows = await sql`
    SELECT
      id,
      stripe_event_id,
      customer_email,
      product_type,
      amount_cents,
      flag_reason,
      raw_metadata,
      created_at
    FROM webhook_events_needs_review
    WHERE resolved = FALSE
    ORDER BY created_at ASC
    LIMIT 10
  `

  const recipients = getAlertRecipients()
  if (recipients.length === 0) {
    console.warn("[v0] [CRON] Webhook review rows exist but no admin alert recipient is configured")
    return {
      unresolvedWebhookReviews: unresolvedCount,
      webhookReviewAlertSent: false,
      webhookReviewAlertSkipped: "missing_recipient",
    }
  }

  if (await wasWebhookReviewAlertSentRecently()) {
    return {
      unresolvedWebhookReviews: unresolvedCount,
      webhookReviewAlertSent: false,
      webhookReviewAlertSkipped: "cooldown",
    }
  }

  const adminLink = getAdminWebhookReviewLink()
  const detailLines = rows.map((row: any) => {
    const metadata = row.raw_metadata || {}
    const ids = [
      `review_id=${row.id}`,
      `stripe_event=${row.stripe_event_id || "unknown"}`,
      `event_type=${metadata.event_type || "unknown"}`,
      `session=${metadata.session_id || "unknown"}`,
      metadata.payment_intent_id ? `payment_intent=${metadata.payment_intent_id}` : null,
    ].filter(Boolean)

    return [
      `- ${row.flag_reason || "needs_review"} (${row.product_type || "unknown product"})`,
      `  customer: ${maskEmail(row.customer_email)}`,
      `  status: unresolved | amount_cents: ${row.amount_cents ?? "unknown"}`,
      `  created: ${row.created_at}`,
      `  ${ids.join(" | ")}`,
    ].join("\n")
  })

  const subject = "SSELFIE alert: payment/webhook issue needs review"
  const text = [
    "SSELFIE payment/webhook review alert",
    "",
    `There are ${unresolvedCount} unresolved webhook review row(s).`,
    `Oldest unresolved item: ${oldestCreatedAt || "unknown"} (${formatAge(oldestCreatedAt)} old).`,
    "",
    "This may affect customer access if the related checkout was not fulfilled.",
    "",
    "Rows to check:",
    detailLines.join("\n"),
    "",
    "Next step:",
    "Review webhook_events_needs_review and repair or reprocess the affected checkout if needed.",
    `Admin review: ${adminLink}`,
  ].join("\n")

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#1c1917;max-width:680px;margin:0 auto;padding:24px;">
      <p style="margin:0 0 12px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#78716c;">SSELFIE operations alert</p>
      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;">Payment/webhook issue needs review</h1>
      <p>There are <strong>${unresolvedCount}</strong> unresolved webhook review row(s).</p>
      <p>Oldest unresolved item: <strong>${escapeHtml(oldestCreatedAt || "unknown")}</strong> (${escapeHtml(formatAge(oldestCreatedAt))} old).</p>
      <p>This may affect customer access if the related checkout was not fulfilled.</p>
      <div style="background:#f5f5f4;border:1px solid #e7e5e4;padding:16px;margin:20px 0;">
        <pre style="white-space:pre-wrap;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;line-height:1.5;margin:0;">${escapeHtml(detailLines.join("\n"))}</pre>
      </div>
      <p><strong>Next step:</strong> Review <code>webhook_events_needs_review</code> and repair or reprocess the affected checkout if needed.</p>
      <p><a href="${escapeHtml(adminLink)}" style="color:#1c1917;text-decoration:underline;">Open webhook review</a></p>
    </div>
  `

  try {
    const result = await sendEmail({
      to: recipients,
      subject,
      html,
      text,
      from: "SSELFIE Revenue Alerts <hello@sselfie.ai>",
      replyTo: "hello@sselfie.ai",
      emailType: "webhook-review-alert",
      tags: ["admin-alert", "webhook-review"],
    })

    if (!result.success) {
      console.error("[v0] [CRON] Failed to send webhook review alert:", result.error)
      return {
        unresolvedWebhookReviews: unresolvedCount,
        webhookReviewAlertSent: false,
        webhookReviewAlertSkipped: "send_failed",
      }
    }

    await recordWebhookReviewAlertSent({
      unresolvedCount,
      oldestCreatedAt,
      reviewIds: rows.map((row: any) => row.id),
      cooldownHours: WEBHOOK_REVIEW_ALERT_COOLDOWN_HOURS,
    })

    return {
      unresolvedWebhookReviews: unresolvedCount,
      webhookReviewAlertSent: true,
    }
  } catch (error) {
    console.error("[v0] [CRON] Webhook review alert failed:", error)
    return {
      unresolvedWebhookReviews: unresolvedCount,
      webhookReviewAlertSent: false,
      webhookReviewAlertSkipped: "send_error",
    }
  }
}

/**
 * GET /api/cron/resolve-pending-payments
 * 
 * Resolves pending paid blueprint payments where userId could not be resolved at webhook time.
 * Runs every 5 minutes.
 * 
 * Protected with CRON_SECRET verification
 */
export async function GET(request: NextRequest) {
  const cronLogger = createCronLogger("resolve-pending-payments")
  await cronLogger.start()

  try {
    const meta = {
      path: request.nextUrl.pathname,
      method: request.method,
      ts: new Date().toISOString(),
      isVercelCron: request.headers.get("x-vercel-cron"),
      userAgent: request.headers.get("user-agent"),
      hasAuthHeader: request.headers.has("authorization"),
      vercelIdHint: request.headers.get("x-vercel-id"),
    }
    console.log(`[CRON_META] ${JSON.stringify(meta)}`)
    // Verify cron secret (REQUIRED)
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error("[v0] [CRON] CRON_SECRET not configured")
      await cronLogger.error(new Error("Cron secret not configured"), { reason: "Missing CRON_SECRET" })
      return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error("[v0] [CRON] Unauthorized resolve-pending-payments cron request")
      await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] [CRON] Starting pending payment resolution...")

    const stuckCheckoutEvents = await sql`
      SELECT event_id, object_id, event_type, metadata, first_seen_at
      FROM webhook_events
      WHERE provider = 'stripe'
        AND event_type = 'checkout.session.completed'
        AND status = 'claimed'
        AND first_seen_at < NOW() - INTERVAL '10 minutes'
      ORDER BY first_seen_at ASC
      LIMIT 25
    `

    let flaggedStuckCheckouts = 0
    for (const stuckEvent of stuckCheckoutEvents) {
      const inserted = await sql`
        INSERT INTO webhook_events_needs_review (
          stripe_event_id,
          customer_email,
          product_type,
          amount_cents,
          flag_reason,
          raw_metadata,
          created_at
        )
        SELECT
          ${stuckEvent.event_id},
          NULL,
          NULL,
          NULL,
          'processing_error',
          ${JSON.stringify({
            event_type: stuckEvent.event_type,
            session_id: stuckEvent.object_id,
            notes: "Stripe checkout webhook remained claimed for more than 10 minutes. Fulfillment may not have completed.",
            source: "resolve-pending-payments",
            first_seen_at: stuckEvent.first_seen_at,
            webhook_metadata: stuckEvent.metadata || {},
          })}::jsonb,
          NOW()
        WHERE NOT EXISTS (
          SELECT 1
          FROM webhook_events_needs_review
          WHERE stripe_event_id = ${stuckEvent.event_id}
        )
        RETURNING id
      `

      if (inserted.length > 0) {
        flaggedStuckCheckouts++
      }
    }

    // Query pending payments (limit 50 per run to avoid timeout)
    const pendingPayments = await sql`
      SELECT 
        id,
        stripe_payment_id,
        metadata,
        created_at
      FROM stripe_payments
      WHERE status = 'pending_resolution'
        AND product_type = 'paid_blueprint'
      ORDER BY created_at ASC
      LIMIT 50
    `

    if (pendingPayments.length === 0) {
      console.log("[v0] [CRON] No pending payments to resolve")
      const webhookReviewAlert = await sendWebhookReviewAlertIfNeeded()
      const summary = {
        path: request.nextUrl.pathname,
        processed: 0,
        resolved: 0,
        failed: 0,
        skipped: 0,
        flaggedStuckCheckouts,
        ...webhookReviewAlert,
        status: "ok",
      }
      console.log(`[CRON_SUMMARY] ${JSON.stringify(summary)}`)
      await cronLogger.success(summary)
      return NextResponse.json({ success: true, processed: 0, flaggedStuckCheckouts, ...webhookReviewAlert })
    }

    console.log(`[v0] [CRON] Found ${pendingPayments.length} pending payments to process`)

    let resolved = 0
    let failed = 0
    let skipped = 0

    for (const payment of pendingPayments) {
      try {
        // Payment-first idempotency check: if payment already processed, skip
        const existingProcessed = await sql`
          SELECT id FROM stripe_payments
          WHERE stripe_payment_id = ${payment.stripe_payment_id}
            AND status = 'succeeded'
            AND user_id IS NOT NULL
          LIMIT 1
        `
        
        if (existingProcessed.length > 0) {
          console.log(`[v0] [CRON] ⏭️ Payment ${payment.stripe_payment_id} already processed, skipping`)
          skipped++
          continue
        }

        // Extract customer email from metadata
        const customerEmail = payment.metadata?.customer_email
        if (!customerEmail) {
          console.error(`[v0] [CRON] ⚠️ Payment ${payment.stripe_payment_id} missing customer_email in metadata`)
          failed++
          continue
        }

        // Lookup user by email
        const [user] = await sql`
          SELECT id FROM users WHERE email = ${customerEmail} LIMIT 1
        `

        if (!user) {
          // User not found - increment retry count
          const retryCount = (payment.metadata?.retry_count || 0) + 1
          const lastRetryAt = new Date().toISOString()

          if (retryCount >= 24) {
            // Max retries reached - mark as failed
            await sql`
              UPDATE stripe_payments
              SET 
                status = 'failed_resolution',
                metadata = jsonb_set(
                  jsonb_set(
                    COALESCE(metadata, '{}'::jsonb),
                    '{retry_count}',
                    to_jsonb(${retryCount})
                  ),
                  '{last_retry_at}',
                  to_jsonb(${lastRetryAt})
                ),
                updated_at = NOW()
              WHERE id = ${payment.id}
            `
            console.error(`[v0] [CRON] ❌ Payment ${payment.stripe_payment_id} failed after ${retryCount} attempts`)
            failed++
          } else {
            // Increment retry count and update last_retry_at
            await sql`
              UPDATE stripe_payments
              SET 
                metadata = jsonb_set(
                  jsonb_set(
                    COALESCE(metadata, '{}'::jsonb),
                    '{retry_count}',
                    to_jsonb(${retryCount})
                  ),
                  '{last_retry_at}',
                  to_jsonb(${lastRetryAt})
                ),
                updated_at = NOW()
              WHERE id = ${payment.id}
            `
            console.log(`[v0] [CRON] ⏳ Payment ${payment.stripe_payment_id} retry ${retryCount}/24 (user not found)`)
          }
          continue
        }

        const userId = user.id

        // Secondary idempotency: Check if credits already granted for this payment
        const existingCredit = await sql`
          SELECT id FROM credit_transactions
          WHERE user_id = ${userId}
            AND stripe_payment_id = ${payment.stripe_payment_id}
            AND transaction_type = 'purchase'
          LIMIT 1
        `

        if (existingCredit.length > 0) {
          // Credits already granted - just update payment status
          await sql`
            UPDATE stripe_payments
            SET 
              user_id = ${userId},
              status = 'succeeded',
              updated_at = NOW()
            WHERE id = ${payment.id}
          `
          console.log(`[v0] [CRON] ⏭️ Payment ${payment.stripe_payment_id} credits already granted, updated status`)
          resolved++
          continue
        }

        // Grant credits (has idempotency check internally)
        const creditResult = await grantPaidBlueprintCredits(userId, payment.stripe_payment_id, false)
        
        if (!creditResult.success) {
          console.error(`[v0] [CRON] ⚠️ Failed to grant credits for payment ${payment.stripe_payment_id}: ${creditResult.error}`)
          failed++
          continue
        }

        // Create subscription entry (with idempotency check)
        const existingSubscription = await sql`
          SELECT id FROM subscriptions
          WHERE user_id = ${userId}
            AND product_type = 'paid_blueprint'
            AND status = 'active'
          LIMIT 1
        `

        if (existingSubscription.length === 0) {
          try {
            await sql`
              INSERT INTO subscriptions (
                user_id,
                product_type,
                plan,
                status,
                created_at,
                updated_at
              )
              VALUES (
                ${userId},
                'paid_blueprint',
                'paid_blueprint',
                'active',
                NOW(),
                NOW()
              )
            `
          } catch (insertError: any) {
            if (insertError.code !== '23505') {
              throw insertError
            }
            // Subscription already exists (race condition) - OK
          }
        }

        // Update blueprint_subscribers (if exists)
        await sql`
          UPDATE blueprint_subscribers
          SET 
            paid_blueprint_purchased = TRUE,
            user_id = ${userId},
            updated_at = NOW()
          WHERE email = ${customerEmail}
        `

        // Update payment status
        await sql`
          UPDATE stripe_payments
          SET 
            user_id = ${userId},
            status = 'succeeded',
            metadata = jsonb_set(
              COALESCE(metadata, '{}'::jsonb),
              '{resolved_at}',
              to_jsonb(NOW()::text)
            ),
            updated_at = NOW()
          WHERE id = ${payment.id}
        `

        console.log(`[v0] [CRON] ✅ Resolved payment ${payment.stripe_payment_id} for user ${userId}`)
        resolved++

      } catch (error: any) {
        console.error(`[v0] [CRON] ❌ Error processing payment ${payment.stripe_payment_id}:`, error.message)
        failed++
      }
    }

    console.log(`[v0] [CRON] Completed: ${resolved} resolved, ${failed} failed, ${skipped} skipped`)

    const webhookReviewAlert = await sendWebhookReviewAlertIfNeeded()
    const summary = {
      path: request.nextUrl.pathname,
      processed: pendingPayments.length,
      resolved,
      failed,
      skipped,
      flaggedStuckCheckouts,
      ...webhookReviewAlert,
      status: "ok",
    }
    console.log(`[CRON_SUMMARY] ${JSON.stringify(summary)}`)

    await cronLogger.success(summary)

    return NextResponse.json({
      success: true,
      processed: pendingPayments.length,
      resolved,
      failed,
      skipped,
      flaggedStuckCheckouts,
      ...webhookReviewAlert,
    })
  } catch (error: any) {
    console.error("[v0] [CRON] Error in resolve-pending-payments cron:", error)
    await cronLogger.error(error, { reason: "Resolve pending payments failed" })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to resolve pending payments" },
      { status: 500 }
    )
  }
}
