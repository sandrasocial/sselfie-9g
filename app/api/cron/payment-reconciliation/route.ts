import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createCronLogger } from "@/lib/cron-logger"
import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"

export const dynamic = "force-dynamic"
export const maxDuration = 300

/**
 * Daily Stripe <-> DB payment reconciliation tripwire.
 *
 * Compares every live-mode payment Stripe collected in the last 48 hours
 * (paid invoices = subscriptions, paid one-time checkout sessions = products)
 * against `stripe_payments` and alerts ssa@ssasocial.com ONLY when money
 * exists in Stripe that the DB never recorded.
 *
 * Why: on 2026-06-12 a Stripe API version bump silently changed webhook
 * payload shapes (invoice.subscription moved to
 * invoice.parent.subscription_details.subscription) and every renewal was
 * dropped for two days with nothing watching (fixed in 42bd4a51). This cron
 * makes that class of failure visible within a day.
 *
 * Admin Data Contract: money truth = stripe_payments + live Stripe API only.
 * Alert-only - sends nothing when the books match.
 */

const WINDOW_HOURS = 48
// Ignore payments younger than this so a webhook that is merely seconds
// behind Stripe never raises a false alarm.
const GRACE_MINUTES = 30

type MissingPayment = {
  kind: "subscription_invoice" | "one_time_checkout"
  stripeId: string
  email: string | null
  amountCents: number
  currency: string
  paidAt: Date
  dashboardUrl: string
}

async function findMissingInvoices(cutoffSec: number, graceSec: number): Promise<MissingPayment[]> {
  const missing: MissingPayment[] = []
  let starting_after: string | undefined
  for (let page = 0; page < 10; page++) {
    const batch = await stripe.invoices.list({
      status: "paid",
      created: { gte: cutoffSec },
      limit: 100,
      starting_after,
    })
    for (const inv of batch.data) {
      if (!inv.livemode || !inv.amount_paid || inv.amount_paid <= 0) continue
      if ((inv.created || 0) > graceSec) continue
      // Renewal rows always carry stripe_invoice_id; the post-42bd4a51 webhook
      // may also key stripe_payment_id by the invoice id itself.
      const rows = await sql`
        SELECT id FROM stripe_payments
        WHERE stripe_invoice_id = ${inv.id} OR stripe_payment_id = ${inv.id}
        LIMIT 1
      `
      if (rows.length === 0) {
        missing.push({
          kind: "subscription_invoice",
          stripeId: inv.id ?? "unknown",
          email: inv.customer_email ?? null,
          amountCents: inv.amount_paid,
          currency: inv.currency || "usd",
          paidAt: new Date((inv.status_transitions?.paid_at || inv.created || 0) * 1000),
          dashboardUrl: `https://dashboard.stripe.com/invoices/${inv.id}`,
        })
      }
    }
    if (!batch.has_more) break
    starting_after = batch.data[batch.data.length - 1]?.id
  }
  return missing
}

async function findMissingCheckouts(cutoffSec: number, graceSec: number): Promise<MissingPayment[]> {
  const missing: MissingPayment[] = []
  let starting_after: string | undefined
  for (let page = 0; page < 10; page++) {
    const batch = await stripe.checkout.sessions.list({
      created: { gte: cutoffSec },
      limit: 100,
      starting_after,
    })
    for (const session of batch.data) {
      // mode === "subscription" sessions produce an invoice and are covered by
      // findMissingInvoices - only one-time product payments are checked here.
      if (!session.livemode || session.mode !== "payment") continue
      if (session.payment_status !== "paid") continue
      if (!session.amount_total || session.amount_total <= 0) continue
      if ((session.created || 0) > graceSec) continue

      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || null

      // Fulfillment handlers store stripe_payment_id = payment_intent || session.id
      // and (where present) checkout_session_id = session.id.
      const rows = await sql`
        SELECT id FROM stripe_payments
        WHERE stripe_payment_id = ${session.id}
           OR checkout_session_id = ${session.id}
           OR (${paymentIntentId}::text IS NOT NULL AND stripe_payment_id = ${paymentIntentId})
        LIMIT 1
      `
      if (rows.length === 0) {
        missing.push({
          kind: "one_time_checkout",
          stripeId: session.id,
          email: session.customer_details?.email ?? session.customer_email ?? null,
          amountCents: session.amount_total,
          currency: session.currency || "usd",
          paidAt: new Date((session.created || 0) * 1000),
          dashboardUrl: paymentIntentId
            ? `https://dashboard.stripe.com/payments/${paymentIntentId}`
            : `https://dashboard.stripe.com/checkouts/sessions/${session.id}`,
        })
      }
    }
    if (!batch.has_more) break
    starting_after = batch.data[batch.data.length - 1]?.id
  }
  return missing
}

function formatAmount(amountCents: number, currency: string): string {
  return `${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`
}

function buildAlertEmail(missing: MissingPayment[]): { subject: string; html: string; text: string } {
  const total = missing.reduce((sum, m) => sum + m.amountCents, 0)
  const subject = `🚨 ${missing.length} Stripe payment${missing.length === 1 ? "" : "s"} missing from the database`

  const rowsHtml = missing
    .map(
      (m) => `
        <tr>
          <td style="padding:6px 12px;border-bottom:1px solid #E5E5E5;">${m.kind === "subscription_invoice" ? "Subscription renewal" : "One-time purchase"}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #E5E5E5;">${m.email || "unknown"}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #E5E5E5;">${formatAmount(m.amountCents, m.currency)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #E5E5E5;">${m.paidAt.toISOString().slice(0, 16).replace("T", " ")} UTC</td>
          <td style="padding:6px 12px;border-bottom:1px solid #E5E5E5;"><a href="${m.dashboardUrl}">open in Stripe</a></td>
        </tr>`,
    )
    .join("")

  const html = `
    <div style="font-family:Arial,sans-serif;color:#0A0A0A;max-width:640px;">
      <h2 style="font-weight:600;">Stripe has money the database doesn't know about</h2>
      <p>
        Daily reconciliation (source: live Stripe API vs <code>stripe_payments</code>) found
        <strong>${missing.length} paid payment${missing.length === 1 ? "" : "s"}</strong> in the last ${WINDOW_HOURS} hours
        with no matching database row. Total: <strong>${formatAmount(total, missing[0]?.currency || "usd")}</strong>.
      </p>
      <table style="border-collapse:collapse;font-size:14px;">
        <tr>
          <th style="text-align:left;padding:6px 12px;border-bottom:2px solid #0A0A0A;">Type</th>
          <th style="text-align:left;padding:6px 12px;border-bottom:2px solid #0A0A0A;">Customer</th>
          <th style="text-align:left;padding:6px 12px;border-bottom:2px solid #0A0A0A;">Amount</th>
          <th style="text-align:left;padding:6px 12px;border-bottom:2px solid #0A0A0A;">Paid at</th>
          <th style="text-align:left;padding:6px 12px;border-bottom:2px solid #0A0A0A;">Link</th>
        </tr>
        ${rowsHtml}
      </table>
      <p style="color:#666666;font-size:13px;">
        This usually means the Stripe webhook is dropping events (like the 2026-06-12 API-shape incident).
        Check Vercel logs for /api/webhooks/stripe, then backfill the rows above.
        This alert only sends when something is missing.
      </p>
    </div>`

  const text = [
    `Stripe has money the database doesn't know about.`,
    ``,
    `${missing.length} paid payment(s) in the last ${WINDOW_HOURS}h with no stripe_payments row (source: live Stripe API vs stripe_payments):`,
    ``,
    ...missing.map(
      (m) =>
        `- ${m.kind === "subscription_invoice" ? "Subscription renewal" : "One-time purchase"} | ${m.email || "unknown"} | ${formatAmount(m.amountCents, m.currency)} | ${m.paidAt.toISOString()} | ${m.dashboardUrl}`,
    ),
    ``,
    `Likely cause: the Stripe webhook is dropping events. Check Vercel logs for /api/webhooks/stripe, then backfill.`,
  ].join("\n")

  return { subject, html, text }
}

export async function GET(request: NextRequest) {
  const cronLogger = createCronLogger("payment-reconciliation")
  await cronLogger.start()

  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = (process.env.CRON_SECRET || "").trim()
    if (!cronSecret) {
      await cronLogger.error(new Error("CRON_SECRET not configured"), { reason: "Missing CRON_SECRET" })
      return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 })
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (process.env.PAYMENT_RECONCILIATION_DISABLED === "true") {
      await cronLogger.success({ skipped: true, reason: "PAYMENT_RECONCILIATION_DISABLED" })
      return NextResponse.json({ ok: true, skipped: true })
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      await cronLogger.error(new Error("STRIPE_SECRET_KEY missing"), { reason: "Missing STRIPE_SECRET_KEY" })
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 })
    }

    const nowSec = Math.floor(Date.now() / 1000)
    const cutoffSec = nowSec - WINDOW_HOURS * 3600
    const graceSec = nowSec - GRACE_MINUTES * 60

    const [missingInvoices, missingCheckouts] = await Promise.all([
      findMissingInvoices(cutoffSec, graceSec),
      findMissingCheckouts(cutoffSec, graceSec),
    ])
    const missing = [...missingInvoices, ...missingCheckouts]

    if (missing.length === 0) {
      await cronLogger.success({ checkedWindowHours: WINDOW_HOURS, missing: 0 })
      return NextResponse.json({ ok: true, missing: 0 })
    }

    // ?dryRun=1 - report findings without alerting (manual testing).
    if (request.nextUrl.searchParams.get("dryRun") === "1") {
      await cronLogger.success({ dryRun: true, missing: missing.length })
      return NextResponse.json({ ok: false, dryRun: true, missing })
    }

    const alertTo = process.env.ADMIN_EMAIL || "ssa@ssasocial.com"
    const { subject, html, text } = buildAlertEmail(missing)
    const emailResult = await sendEmail({
      to: alertTo,
      subject,
      html,
      text,
      tags: ["payment-reconciliation", "alert"],
      emailType: "payment-reconciliation-alert",
    })

    const summary = {
      checkedWindowHours: WINDOW_HOURS,
      missing: missing.length,
      missingTotalCents: missing.reduce((sum, m) => sum + m.amountCents, 0),
      missingIds: missing.map((m) => m.stripeId),
      alertEmailSent: emailResult.success,
    }

    // Missing money is an error state even though the cron itself ran fine -
    // log it loudly so it shows up in cron health checks too.
    await cronLogger.error(new Error(`${missing.length} Stripe payment(s) missing from stripe_payments`), summary)

    return NextResponse.json({ ok: false, ...summary })
  } catch (error: any) {
    await cronLogger.error(error)
    return NextResponse.json({ error: error?.message || "Unknown error" }, { status: 500 })
  }
}
