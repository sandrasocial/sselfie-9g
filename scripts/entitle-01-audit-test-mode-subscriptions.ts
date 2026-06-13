import { neon } from "@neondatabase/serverless"
import dotenv from "dotenv"
import Stripe from "stripe"

dotenv.config({ path: ".env.local" })
dotenv.config({ path: ".env" })

type TestModeSubscriptionRow = {
  id: string
  user_id: string | null
  product_type: string | null
  status: string | null
  is_test_mode: boolean | null
  stripe_subscription_id: string | null
  current_period_end: Date | string | null
  created_at: Date | string | null
}

type StripeClassification =
  | "no_stripe_subscription_id"
  | "not_found_in_live_stripe"
  | "found_live_stripe_subscription"
  | "stripe_check_error"

type AuditedRow = TestModeSubscriptionRow & {
  stripeClassification: StripeClassification
  stripeStatus: string | null
  safeToNeutralize: boolean
  reason: string
}

const apply = process.argv.includes("--apply")
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL
const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!databaseUrl) {
  throw new Error("DATABASE_URL, POSTGRES_URL, or POSTGRES_PRISMA_URL is required")
}

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is required for the live Stripe cross-check")
}

const usingLiveStripeKey = stripeSecretKey.startsWith("sk_live_")
const sql = neon(databaseUrl)
const stripe = new Stripe(stripeSecretKey, { apiVersion: "2026-01-28.clover" })

async function loadRows(): Promise<TestModeSubscriptionRow[]> {
  return (await sql`
    SELECT id, user_id, product_type, status, is_test_mode, stripe_subscription_id,
           current_period_end, created_at
    FROM subscriptions
    WHERE COALESCE(is_test_mode, false) = true
      AND status IN ('active', 'trialing')
    ORDER BY created_at DESC
  `) as TestModeSubscriptionRow[]
}

async function classifyRow(row: TestModeSubscriptionRow): Promise<AuditedRow> {
  const subscriptionId = row.stripe_subscription_id?.trim()

  if (!subscriptionId) {
    return {
      ...row,
      stripeClassification: "no_stripe_subscription_id",
      stripeStatus: null,
      safeToNeutralize: true,
      reason: "DB row is marked test-mode and has no Stripe subscription id.",
    }
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    return {
      ...row,
      stripeClassification: "found_live_stripe_subscription",
      stripeStatus: subscription.status,
      safeToNeutralize: false,
      reason: "A subscription with this id exists under the configured Stripe key; leave it for manual review.",
    }
  } catch (error) {
    const stripeError = error as { code?: string; type?: string; message?: string }
    if (stripeError.code === "resource_missing") {
      return {
        ...row,
        stripeClassification: "not_found_in_live_stripe",
        stripeStatus: null,
        safeToNeutralize: true,
        reason: "Live Stripe could not find this subscription id, so the DB row is test-only/orphaned.",
      }
    }

    return {
      ...row,
      stripeClassification: "stripe_check_error",
      stripeStatus: null,
      safeToNeutralize: false,
      reason: stripeError.message || "Stripe lookup failed for an unknown reason.",
    }
  }
}

async function neutralizeRows(rows: AuditedRow[]) {
  const neutralizable = rows.filter((row) => row.safeToNeutralize)

  for (const row of neutralizable) {
    await sql`
      UPDATE subscriptions
      SET status = 'canceled',
          current_period_end = CASE
            WHEN current_period_end IS NULL OR current_period_end > NOW() THEN NOW()
            ELSE current_period_end
          END,
          updated_at = NOW()
      WHERE id = ${row.id}
        AND COALESCE(is_test_mode, false) = true
        AND status IN ('active', 'trialing')
    `
  }

  return neutralizable.length
}

function printReport(rows: AuditedRow[]) {
  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.stripeClassification] = (acc[row.stripeClassification] || 0) + 1
    return acc
  }, {})

  const affectedUsers = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean))).sort()
  const neutralizableUsers = Array.from(
    new Set(rows.filter((row) => row.safeToNeutralize).map((row) => row.user_id).filter(Boolean)),
  ).sort()

  console.log("ENTITLE-01 test-mode subscription audit")
  console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}`)
  console.log(`Stripe key: ${usingLiveStripeKey ? "live" : "not live"} (${usingLiveStripeKey ? "cross-check valid" : "apply blocked"})`)
  console.log(`Rows found: ${rows.length}`)
  console.log("Classification counts:", counts)
  console.log(`Affected user_ids: ${affectedUsers.length ? affectedUsers.join(", ") : "none"}`)
  console.log(`Neutralizable user_ids: ${neutralizableUsers.length ? neutralizableUsers.join(", ") : "none"}`)
  console.log("")

  for (const row of rows) {
    console.log(
      [
        `id=${row.id}`,
        `user=${row.user_id || "null"}`,
        `product=${row.product_type || "null"}`,
        `status=${row.status || "null"}`,
        `stripe_sub=${row.stripe_subscription_id || "null"}`,
        `classification=${row.stripeClassification}`,
        `safe=${row.safeToNeutralize}`,
        `reason=${row.reason}`,
      ].join(" | "),
    )
  }
}

async function main() {
  if (apply && !usingLiveStripeKey) {
    throw new Error("--apply requires a live Stripe key (STRIPE_SECRET_KEY must start with sk_live_)")
  }

  const rows = await loadRows()
  const audited = []

  for (const row of rows) {
    audited.push(await classifyRow(row))
  }

  printReport(audited)

  if (!apply) {
    console.log("\nDry run only. Re-run with --apply to neutralize safe rows after reviewing the report.")
    return
  }

  const changed = await neutralizeRows(audited)
  console.log(`\nNeutralized ${changed} test-mode subscription row(s).`)
}

main().catch((error) => {
  console.error("[ENTITLE-01] audit failed:", error)
  process.exit(1)
})
