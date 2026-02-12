/**
 * Billing linkage reconciliation (safe by default).
 *
 * - Classifies active membership rows missing stripe_subscription_id.
 * - Analyzes purchase credit rows missing/invalid stripe_payment_id.
 * - Optional apply mode updates only high-confidence matches.
 *
 * Usage:
 *   node scripts/reconcile-billing-linkage.mjs
 *   APPLY=1 node scripts/reconcile-billing-linkage.mjs
 *
 * Writes:
 *   output/automation/billing-linkage-reconcile-YYYY-MM-DD-HH.md
 */
import { neon } from "@neondatabase/serverless"
import Stripe from "stripe"
import dotenv from "dotenv"
import { mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

dotenv.config({ path: resolve(process.cwd(), ".env.local") })

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required")
}

const sql = neon(process.env.DATABASE_URL)
const APPLY = process.env.APPLY === "1"
const JAN_START = process.env.RECON_JAN_START || "2026-01-10T00:00:00Z"
const JAN_END = process.env.RECON_JAN_END || "2026-01-20T00:00:00Z"

const stripe =
  process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.trim()
    ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-11-17.clover" })
    : null

function pad2(n) {
  return String(n).padStart(2, "0")
}

function reportPath(now, mode) {
  const dir = resolve(process.cwd(), "output", "automation")
  mkdirSync(dir, { recursive: true })
  const name = `billing-linkage-reconcile-${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}-${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}-${mode}.md`
  return resolve(dir, name)
}

function fmtDate(v) {
  if (!v) return "n/a"
  const d = v instanceof Date ? v : new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toISOString()
}

function expectedProductTypeFromPurchase(row) {
  const desc = String(row.description || "").toLowerCase()
  if (row.product_type) return row.product_type
  if (desc.includes("credit top-up")) return "credit_topup"
  if (desc.includes("one-time sselfie session")) return "one_time_session"
  if (desc.includes("paid blueprint")) return "paid_blueprint"
  return null
}

function normalizeStripeStatus(raw) {
  if (!raw) return "pending"
  if (["succeeded", "paid"].includes(raw)) return "succeeded"
  if (["failed", "canceled", "cancelled"].includes(raw)) return "failed"
  return "pending"
}

function mdTable(lines, headers, rows) {
  lines.push(headers.join(" | "))
  lines.push(headers.map(() => "---").join(" | "))
  for (const row of rows) {
    lines.push(row.join(" | "))
  }
  lines.push("")
}

async function getStripeProductTypeFromSub(sub, productTypeCache) {
  const direct = sub.metadata?.product_type
  if (direct) return String(direct)

  const price = sub.items?.data?.[0]?.price
  const fromPriceMeta = price?.metadata?.product_type
  if (fromPriceMeta) return String(fromPriceMeta)

  const product = price?.product
  const productId = typeof product === "string" ? product : product?.id || null
  if (!productId) return null

  if (productTypeCache.has(productId)) return productTypeCache.get(productId)
  try {
    const p = await stripe.products.retrieve(productId)
    const t = p?.metadata?.product_type ? String(p.metadata.product_type) : null
    productTypeCache.set(productId, t)
    return t
  } catch {
    productTypeCache.set(productId, null)
    return null
  }
}

async function classifyMembershipRows() {
  const rows = await sql`
    SELECT
      s.id,
      s.user_id,
      s.product_type,
      s.status,
      s.stripe_subscription_id,
      s.stripe_customer_id,
      s.created_at,
      u.email,
      u.stripe_customer_id AS user_stripe_customer_id
    FROM subscriptions s
    LEFT JOIN users u ON u.id = s.user_id
    WHERE s.product_type = 'sselfie_studio_membership'
      AND s.status = 'active'
      AND (s.stripe_subscription_id IS NULL OR btrim(s.stripe_subscription_id) = '')
    ORDER BY s.created_at DESC
  `

  const productTypeCache = new Map()
  const result = []
  let applied = 0

  for (const row of rows) {
    const classification = {
      subscriptionId: row.id,
      userId: row.user_id,
      email: row.email || null,
      createdAt: row.created_at,
      status: "no_stripe_api",
      customerIds: [],
      candidates: [],
      applied: false,
      error: null,
    }

    if (!stripe) {
      result.push(classification)
      continue
    }

    try {
      const customerIds = new Set()
      if (row.stripe_customer_id) customerIds.add(String(row.stripe_customer_id))
      if (row.user_stripe_customer_id) customerIds.add(String(row.user_stripe_customer_id))

      if (customerIds.size === 0 && row.email) {
        const customers = await stripe.customers.list({ email: String(row.email), limit: 10 })
        for (const c of customers.data) customerIds.add(c.id)
      }

      classification.customerIds = [...customerIds]

      const candidates = []
      for (const customerId of customerIds) {
        const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 25 })
        for (const sub of subs.data) {
          const productType = await getStripeProductTypeFromSub(sub, productTypeCache)
          if (!["sselfie_studio_membership", "brand_studio_membership", "pro"].includes(String(productType || ""))) continue
          if (!["active", "trialing", "past_due", "unpaid"].includes(String(sub.status || ""))) continue
          candidates.push({
            subId: sub.id,
            customerId,
            productType: productType || "unknown",
            status: sub.status || "unknown",
            currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
            currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
            isTestMode: !sub.livemode,
          })
        }
      }

      classification.candidates = candidates

      if (candidates.length === 1) {
        classification.status = "recoverable"
        if (APPLY) {
          const c = candidates[0]
          await sql`
            UPDATE subscriptions
            SET
              stripe_subscription_id = ${c.subId},
              stripe_customer_id = ${c.customerId},
              status = ${c.status},
              current_period_start = ${c.currentPeriodStart ? new Date(c.currentPeriodStart) : null},
              current_period_end = ${c.currentPeriodEnd ? new Date(c.currentPeriodEnd) : null},
              is_test_mode = ${c.isTestMode},
              updated_at = NOW()
            WHERE id = ${row.id}
          `
          classification.applied = true
          applied += 1
        }
      } else if (candidates.length > 1) {
        classification.status = "ambiguous_multiple_matches"
      } else {
        classification.status = "no_stripe_match"
      }
    } catch (err) {
      classification.status = "lookup_error"
      classification.error = err instanceof Error ? err.message : String(err)
    }

    result.push(classification)
  }

  return { rows: result, applied }
}

async function analyzePurchaseLinkage() {
  const orphanRows = await sql`
    SELECT
      ct.id,
      ct.user_id,
      ct.created_at,
      ct.description,
      ct.product_type,
      ct.amount,
      ct.stripe_payment_id
    FROM credit_transactions ct
    WHERE ct.transaction_type = 'purchase'
      AND ct.stripe_payment_id IS NOT NULL
      AND btrim(ct.stripe_payment_id) <> ''
      AND NOT EXISTS (
        SELECT 1 FROM stripe_payments sp
        WHERE sp.stripe_payment_id = ct.stripe_payment_id
      )
    ORDER BY ct.created_at DESC
  `

  const janMissingRows = await sql`
    SELECT
      id,
      user_id,
      created_at,
      description,
      product_type,
      amount,
      stripe_payment_id
    FROM credit_transactions
    WHERE transaction_type = 'purchase'
      AND created_at >= ${JAN_START}::timestamptz
      AND created_at < ${JAN_END}::timestamptz
      AND (stripe_payment_id IS NULL OR btrim(stripe_payment_id) = '')
    ORDER BY created_at ASC
  `

  const orphanResults = []
  let orphanApplied = 0

  for (const row of orphanRows) {
    const expectedProductType = expectedProductTypeFromPurchase(row)
    const orphan = {
      id: row.id,
      userId: row.user_id,
      createdAt: row.created_at,
      stripePaymentId: row.stripe_payment_id,
      expectedProductType,
      status: "no_stripe_api",
      recovered: false,
      applyInserted: false,
      error: null,
    }

    if (!stripe || !row.stripe_payment_id) {
      orphanResults.push(orphan)
      continue
    }

    try {
      let paymentDate = null
      let stripeCustomerId = null
      let amountCents = null
      let currency = "usd"
      let rawStatus = null
      let isTestMode = false
      let metadata = {}
      const paymentType = expectedProductType || "one_time_session"

      if (String(row.stripe_payment_id).startsWith("pi_")) {
        const pi = await stripe.paymentIntents.retrieve(String(row.stripe_payment_id))
        paymentDate = new Date(pi.created * 1000).toISOString()
        stripeCustomerId = typeof pi.customer === "string" ? pi.customer : null
        amountCents = pi.amount ?? null
        currency = pi.currency || "usd"
        rawStatus = pi.status
        isTestMode = !pi.livemode
        metadata = pi.metadata || {}
      } else {
        orphan.status = "unsupported_payment_id_prefix"
        orphanResults.push(orphan)
        continue
      }

      const normalizedStatus = normalizeStripeStatus(rawStatus)
      orphan.status = "recoverable"

      const customerIdForInsert = stripeCustomerId || `unknown:${row.user_id || "orphan"}`
      const paymentDateForInsert = paymentDate ? new Date(paymentDate) : new Date(row.created_at)

      if (APPLY) {
        try {
          await sql`
            INSERT INTO stripe_payments (
              stripe_payment_id,
              stripe_customer_id,
              user_id,
              amount_cents,
              currency,
              status,
              payment_type,
              product_type,
              description,
              metadata,
              payment_date,
              is_test_mode,
              created_at,
              updated_at
            )
            VALUES (
              ${row.stripe_payment_id},
              ${customerIdForInsert},
              ${row.user_id || null},
              ${amountCents},
              ${currency},
              ${normalizedStatus},
              ${paymentType},
              ${expectedProductType || "unknown"},
              ${row.description || "Recovered from orphan credit transaction"},
              ${metadata},
              ${paymentDateForInsert},
              ${isTestMode},
              NOW(),
              NOW()
            )
            ON CONFLICT (stripe_payment_id) DO NOTHING
          `
          orphan.applyInserted = true
          orphanApplied += 1
        } catch (insertErr) {
          orphan.status = "recoverable_insert_failed"
          orphan.error = insertErr instanceof Error ? insertErr.message : String(insertErr)
        }
      }

      orphan.recovered = true
    } catch (err) {
      orphan.status = "not_found_in_stripe"
      orphan.error = err instanceof Error ? err.message : String(err)
    }

    orphanResults.push(orphan)
  }

  const janResults = []
  let janApplied = 0

  for (const row of janMissingRows) {
    const expectedProductType = expectedProductTypeFromPurchase(row)

    const candidates = await sql`
      SELECT
        sp.stripe_payment_id,
        sp.product_type,
        sp.payment_type,
        sp.status,
        sp.created_at,
        ABS(EXTRACT(EPOCH FROM (sp.created_at - ${row.created_at}::timestamptz)))::int AS delta_seconds
      FROM stripe_payments sp
      WHERE sp.user_id = ${row.user_id}
        AND sp.status = 'succeeded'
        AND (
          ${expectedProductType}::text IS NULL
          OR sp.product_type = ${expectedProductType}
        )
        AND NOT EXISTS (
          SELECT 1
          FROM credit_transactions ct2
          WHERE ct2.transaction_type = 'purchase'
            AND ct2.stripe_payment_id = sp.stripe_payment_id
        )
      ORDER BY delta_seconds ASC
      LIMIT 3
    `

    let classification = "no_candidate"
    let selected = null
    if (candidates.length > 0) {
      selected = candidates[0]
      if (candidates.length === 1 && Number(selected.delta_seconds) <= 7200) {
        classification = "strict_match"
      } else if (candidates.length === 1) {
        classification = "weak_match"
      } else {
        classification = "ambiguous_multiple_candidates"
      }
    }

    let applied = false
    if (APPLY && classification === "strict_match" && selected?.stripe_payment_id) {
      await sql`
        UPDATE credit_transactions
        SET stripe_payment_id = ${selected.stripe_payment_id}
        WHERE id = ${row.id}
      `
      applied = true
      janApplied += 1
    }

    janResults.push({
      id: row.id,
      userId: row.user_id,
      createdAt: row.created_at,
      description: row.description,
      productType: row.product_type,
      expectedProductType,
      classification,
      selectedStripePaymentId: selected?.stripe_payment_id || null,
      selectedDeltaSeconds: selected?.delta_seconds ?? null,
      candidateCount: candidates.length,
      applied,
    })
  }

  return { orphanRows, orphanResults, orphanApplied, janResults, janApplied }
}

async function main() {
  const now = new Date()
  const lines = []

  lines.push("# Billing linkage reconciliation")
  lines.push("")
  lines.push(`- Generated at: ${now.toISOString()}`)
  lines.push(`- Mode: ${APPLY ? "APPLY (writes enabled)" : "DRY-RUN (no writes)"}`)
  lines.push(`- Stripe API available: ${stripe ? "yes" : "no"}`)
  lines.push(`- Jan cluster window: ${JAN_START} -> ${JAN_END}`)
  lines.push("")

  const membership = await classifyMembershipRows()
  const purchase = await analyzePurchaseLinkage()

  const membershipCounts = membership.rows.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {})

  lines.push("## Membership rows missing Stripe subscription id")
  lines.push(`- Total rows analyzed: ${membership.rows.length}`)
  lines.push(`- Applied updates: ${membership.applied}`)
  lines.push("- Classification:")
  for (const key of Object.keys(membershipCounts).sort()) {
    lines.push(`  - ${key}: ${membershipCounts[key]}`)
  }
  lines.push("")

  const recoverableSample = membership.rows
    .filter((r) => r.status === "recoverable")
    .slice(0, 15)
    .map((r) => [
      String(r.subscriptionId),
      String(r.userId),
      String(r.email || "n/a"),
      fmtDate(r.createdAt),
      String(r.candidates[0]?.subId || "n/a"),
      String(r.candidates[0]?.customerId || "n/a"),
      String(r.applied ? "yes" : "no"),
    ])

  if (recoverableSample.length > 0) {
    lines.push("### Recoverable sample")
    mdTable(lines, ["subscription_id", "user_id", "email", "created_at", "stripe_sub_id", "stripe_customer_id", "applied"], recoverableSample)
  }

  const unresolvedSample = membership.rows
    .filter((r) => r.status !== "recoverable")
    .slice(0, 20)
    .map((r) => [
      String(r.subscriptionId),
      String(r.userId),
      String(r.email || "n/a"),
      fmtDate(r.createdAt),
      String(r.status),
      String(r.customerIds.length),
    ])

  if (unresolvedSample.length > 0) {
    lines.push("### Unresolved sample")
    mdTable(lines, ["subscription_id", "user_id", "email", "created_at", "status", "customer_ids_found"], unresolvedSample)
  }

  lines.push("## Purchase linkage anomalies")
  lines.push(`- Orphan stripe_payment_id rows: ${purchase.orphanRows.length}`)
  lines.push(`- Orphan stripe_payment_id recovered into stripe_payments: ${purchase.orphanApplied}`)
  lines.push(`- Jan missing-link rows analyzed: ${purchase.janResults.length}`)
  lines.push(`- Jan rows auto-linked (strict, if APPLY=1): ${purchase.janApplied}`)
  lines.push("")

  if (purchase.orphanResults.length > 0) {
    lines.push("### Orphan stripe_payment_id sample")
    mdTable(
      lines,
      ["credit_tx_id", "user_id", "created_at", "stripe_payment_id", "status", "expected_product_type", "apply_inserted"],
      purchase.orphanResults.slice(0, 20).map((r) => [
        String(r.id),
        String(r.userId),
        fmtDate(r.createdAt),
        String(r.stripePaymentId),
        String(r.status),
        String(r.expectedProductType || "n/a"),
        String(r.applyInserted ? "yes" : "no"),
      ]),
    )
  }

  if (purchase.janResults.length > 0) {
    lines.push("### Jan missing-link classification")
    mdTable(
      lines,
      ["credit_tx_id", "user_id", "created_at", "classification", "expected_product_type", "selected_stripe_payment_id", "delta_seconds", "candidates", "applied"],
      purchase.janResults.map((r) => [
        String(r.id),
        String(r.userId),
        fmtDate(r.createdAt),
        String(r.classification),
        String(r.expectedProductType || "n/a"),
        String(r.selectedStripePaymentId || "n/a"),
        String(r.selectedDeltaSeconds ?? "n/a"),
        String(r.candidateCount),
        String(r.applied ? "yes" : "no"),
      ]),
    )
  }

  lines.push("## Next actions")
  lines.push("- Backfill or disable stale active membership rows with no Stripe match.")
  lines.push("- Resolve orphan payment id by re-importing missing Stripe payment or correcting the credit transaction reference.")
  lines.push("- Keep purchase-credit guardrails enabled to prevent new unlinked rows.")
  lines.push("")

  const path = reportPath(now, APPLY ? "apply" : "dry")
  writeFileSync(path, lines.join("\n"), "utf8")
  console.log(`[reconcile-billing-linkage] wrote ${path}`)
}

main().catch((err) => {
  console.error("[reconcile-billing-linkage] failed:", err)
  process.exitCode = 1
})
