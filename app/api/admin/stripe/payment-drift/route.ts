import { NextResponse } from "next/server"

import { requireAdmin } from "@/lib/admin-feature-flags"
import { sql } from "@/lib/db/client"
import { stripe } from "@/lib/stripe"

type WindowSummary = {
  days: number
  stripe: {
    charges: number
    amountCents: number
  }
  database: {
    payments: number
    amountCents: number
    missingUserPayments: number
    missingUserAmountCents: number
  }
  drift: {
    count: number
    amountCents: number
    countPercent: number | null
    amountPercent: number | null
    severity: "ok" | "watch" | "critical"
  }
}

function getStartDate(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

function percent(delta: number, base: number) {
  if (base === 0) return null
  return Math.round((delta / base) * 1000) / 10
}

async function getStripeChargeSummary(days: number) {
  const start = Math.floor(getStartDate(days).getTime() / 1000)
  let startingAfter: string | undefined
  let hasMore = true
  let charges = 0
  let amountCents = 0

  while (hasMore) {
    const page = await stripe.charges.list({
      limit: 100,
      created: { gte: start },
      starting_after: startingAfter,
    })

    for (const charge of page.data) {
      if (!charge.paid || charge.status !== "succeeded" || charge.refunded || !charge.livemode) {
        continue
      }
      charges += 1
      amountCents += Math.max(0, charge.amount - (charge.amount_refunded || 0))
    }

    hasMore = page.has_more
    startingAfter = page.data.at(-1)?.id
  }

  return { charges, amountCents }
}

async function getDatabasePaymentSummary(days: number) {
  const start = getStartDate(days)
  const [row] = await sql`
    SELECT
      COUNT(*)::int AS payments,
      COALESCE(SUM(amount_cents), 0)::int AS amount_cents,
      COUNT(*) FILTER (WHERE user_id IS NULL)::int AS missing_user_payments,
      COALESCE(SUM(amount_cents) FILTER (WHERE user_id IS NULL), 0)::int AS missing_user_amount_cents
    FROM stripe_payments
    WHERE payment_date >= ${start}
      AND status IN ('succeeded', 'paid')
      AND COALESCE(is_test_mode, FALSE) = FALSE
  `

  return {
    payments: Number(row?.payments || 0),
    amountCents: Number(row?.amount_cents || 0),
    missingUserPayments: Number(row?.missing_user_payments || 0),
    missingUserAmountCents: Number(row?.missing_user_amount_cents || 0),
  }
}

function severityFor(countPercent: number | null, amountPercent: number | null) {
  const count = Math.abs(countPercent || 0)
  const amount = Math.abs(amountPercent || 0)
  if (count >= 20 || amount >= 20) return "critical"
  if (count >= 5 || amount >= 5) return "watch"
  return "ok"
}

async function summarizeWindow(days: number): Promise<WindowSummary> {
  const [stripeSummary, databaseSummary] = await Promise.all([
    getStripeChargeSummary(days),
    getDatabasePaymentSummary(days),
  ])

  const countDrift = stripeSummary.charges - databaseSummary.payments
  const amountDrift = stripeSummary.amountCents - databaseSummary.amountCents
  const countPercent = percent(countDrift, stripeSummary.charges)
  const amountPercent = percent(amountDrift, stripeSummary.amountCents)

  return {
    days,
    stripe: stripeSummary,
    database: databaseSummary,
    drift: {
      count: countDrift,
      amountCents: amountDrift,
      countPercent,
      amountPercent,
      severity: severityFor(countPercent, amountPercent),
    },
  }
}

export async function GET() {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json({ error: adminCheck.error || "Admin access required" }, { status: 403 })
  }

  const windows = await Promise.all([summarizeWindow(7), summarizeWindow(30)])
  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    note:
      "Compares live Stripe succeeded live-mode charges against stripe_payments rows. Use as a drift alarm; run the 90-day backfill if drift is critical.",
    windows,
  })
}
