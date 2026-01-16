/**
 * Backfill missing/stale monthly membership credits.
 * Idempotent: only grants if last subscription_grant is missing or older than 40 days.
 *
 * Usage:
 *   DRY_RUN=true npx tsx scripts/backfill/backfill-membership-credits.ts
 *   npx tsx scripts/backfill/backfill-membership-credits.ts
 */

import { config } from "dotenv"
import { neon } from "@neondatabase/serverless"
import { join } from "path"

config({ path: join(process.cwd(), ".env.local") })
config({ path: join(process.cwd(), ".env") })

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL not set")
}

const sql = neon(DATABASE_URL)
const DRY_RUN = process.env.DRY_RUN === "true"

const MONTHLY_GRANT_DESC = "Monthly Creator Studio grant"
const MONTHLY_CREDITS = 200

async function hasIsTestModeColumn() {
  const result = await sql`
    SELECT COUNT(*)::int AS count
    FROM information_schema.columns
    WHERE table_name = 'credit_transactions'
      AND column_name = 'is_test_mode'
  `
  return result[0]?.count === 1
}

async function getBeforeSummary() {
  const [summary] = await sql`
    WITH active_members AS (
      SELECT DISTINCT user_id
      FROM subscriptions
      WHERE status = 'active'
        AND product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro')
    ),
    monthly_grants AS (
      SELECT user_id, MAX(created_at) AS last_grant
      FROM credit_transactions
      WHERE transaction_type = 'subscription_grant'
        AND description ILIKE 'Monthly % grant'
      GROUP BY user_id
    )
    SELECT
      COUNT(*)::int AS active_members,
      COUNT(*) FILTER (WHERE mg.user_id IS NOT NULL)::int AS members_with_grant,
      COUNT(*) FILTER (WHERE mg.user_id IS NULL)::int AS members_missing_grant,
      COUNT(*) FILTER (WHERE mg.last_grant < NOW() - INTERVAL '40 days')::int AS members_stale_grant
    FROM active_members am
    LEFT JOIN monthly_grants mg ON mg.user_id = am.user_id
  `
  return summary
}

async function getEligibleMembers() {
  return await sql`
    WITH active_members AS (
      SELECT DISTINCT user_id, product_type
      FROM subscriptions
      WHERE status = 'active'
        AND product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro')
    ),
    monthly_grants AS (
      SELECT user_id, MAX(created_at) AS last_grant
      FROM credit_transactions
      WHERE transaction_type = 'subscription_grant'
        AND description ILIKE 'Monthly % grant'
      GROUP BY user_id
    )
    SELECT am.user_id, am.product_type, mg.last_grant
    FROM active_members am
    LEFT JOIN monthly_grants mg ON mg.user_id = am.user_id
    WHERE mg.last_grant IS NULL OR mg.last_grant < NOW() - INTERVAL '40 days'
  `
}

async function grantMonthlyCredits(userId: string, hasTestMode: boolean) {
  const recent = await sql`
    SELECT 1
    FROM credit_transactions
    WHERE user_id = ${userId}
      AND transaction_type = 'subscription_grant'
      AND description = ${MONTHLY_GRANT_DESC}
      AND created_at > NOW() - INTERVAL '40 days'
    LIMIT 1
  `
  if (recent.length > 0) {
    return { skipped: true }
  }

  const [credits] = await sql`
    SELECT balance, total_purchased
    FROM user_credits
    WHERE user_id = ${userId}
  `

  const currentBalance = Number(credits?.balance || 0)
  const newBalance = currentBalance + MONTHLY_CREDITS

  if (DRY_RUN) {
    return { skipped: false, newBalance }
  }

  await sql`
    INSERT INTO user_credits (user_id, balance, total_purchased, total_used, created_at, updated_at)
    VALUES (${userId}, ${newBalance}, ${MONTHLY_CREDITS}, 0, NOW(), NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
      balance = ${newBalance},
      total_purchased = user_credits.total_purchased + ${MONTHLY_CREDITS},
      updated_at = NOW()
  `

  if (hasTestMode) {
    await sql`
      INSERT INTO credit_transactions (
        user_id, amount, transaction_type, description,
        balance_after, is_test_mode, created_at
      )
      VALUES (
        ${userId}, ${MONTHLY_CREDITS}, 'subscription_grant', ${MONTHLY_GRANT_DESC},
        ${newBalance}, FALSE, NOW()
      )
    `
  } else {
    await sql`
      INSERT INTO credit_transactions (
        user_id, amount, transaction_type, description,
        balance_after, created_at
      )
      VALUES (
        ${userId}, ${MONTHLY_CREDITS}, 'subscription_grant', ${MONTHLY_GRANT_DESC},
        ${newBalance}, NOW()
      )
    `
  }

  return { skipped: false, newBalance }
}

async function main() {
  console.log(`[BACKFILL] Membership monthly credits (dry run: ${DRY_RUN})`)

  const before = await getBeforeSummary()
  console.log("[BACKFILL] Before summary:", before)

  const hasTestMode = await hasIsTestModeColumn()
  const eligibleMembers = await getEligibleMembers()
  console.log(`[BACKFILL] Eligible members found: ${eligibleMembers.length}`)

  let updated = 0
  for (const row of eligibleMembers) {
    const result = await grantMonthlyCredits(row.user_id, hasTestMode)
    if (!result.skipped) {
      updated += 1
    }
  }

  console.log(`[BACKFILL] Updated members: ${updated}`)

  const after = await getBeforeSummary()
  console.log("[BACKFILL] After summary:", after)
}

main().catch((error) => {
  console.error("[BACKFILL] Error:", error)
  process.exit(1)
})
