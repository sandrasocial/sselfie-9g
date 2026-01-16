/**
 * Backfill missing free welcome credits (2 credits) for free users.
 * Idempotent: skips users with existing welcome bonus transaction.
 *
 * Usage:
 *   DRY_RUN=true npx tsx scripts/backfill/backfill-free-welcome-credits.ts
 *   npx tsx scripts/backfill/backfill-free-welcome-credits.ts
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

const WELCOME_BONUS_DESC = "Free blueprint credits (welcome bonus)"
const WELCOME_BONUS_AMOUNT = 2

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
    WITH active_subs AS (
      SELECT DISTINCT user_id
      FROM subscriptions
      WHERE status = 'active'
    ),
    paid_blueprint AS (
      SELECT DISTINCT user_id
      FROM blueprint_subscribers
      WHERE paid_blueprint_purchased = TRUE AND user_id IS NOT NULL
    ),
    free_users AS (
      SELECT u.id
      FROM users u
      LEFT JOIN active_subs s ON s.user_id = u.id
      LEFT JOIN paid_blueprint p ON p.user_id = u.id
      WHERE s.user_id IS NULL AND p.user_id IS NULL
    ),
    free_grants AS (
      SELECT user_id, COUNT(*) AS grant_count, SUM(amount) AS total_amount
      FROM credit_transactions
      WHERE transaction_type = 'bonus'
        AND description = ${WELCOME_BONUS_DESC}
      GROUP BY user_id
    )
    SELECT
      (SELECT COUNT(*) FROM free_users)::int AS free_users,
      COUNT(*) FILTER (WHERE fg.grant_count = 1 AND fg.total_amount = ${WELCOME_BONUS_AMOUNT})::int AS free_users_with_exact_grant,
      COUNT(*) FILTER (WHERE fg.grant_count IS NULL)::int AS free_users_missing_grant,
      COUNT(*) FILTER (WHERE fg.grant_count > 1 OR fg.total_amount <> ${WELCOME_BONUS_AMOUNT})::int AS free_users_bad_grant
    FROM free_users fu
    LEFT JOIN free_grants fg ON fg.user_id = fu.id
  `
  return summary
}

async function getMissingUsers() {
  return await sql`
    WITH active_subs AS (
      SELECT DISTINCT user_id
      FROM subscriptions
      WHERE status = 'active'
    ),
    paid_blueprint AS (
      SELECT DISTINCT user_id
      FROM blueprint_subscribers
      WHERE paid_blueprint_purchased = TRUE AND user_id IS NOT NULL
    ),
    free_users AS (
      SELECT u.id
      FROM users u
      LEFT JOIN active_subs s ON s.user_id = u.id
      LEFT JOIN paid_blueprint p ON p.user_id = u.id
      WHERE s.user_id IS NULL AND p.user_id IS NULL
    ),
    free_grants AS (
      SELECT user_id
      FROM credit_transactions
      WHERE transaction_type = 'bonus'
        AND description = ${WELCOME_BONUS_DESC}
      GROUP BY user_id
      HAVING COUNT(*) >= 1
    )
    SELECT fu.id AS user_id
    FROM free_users fu
    LEFT JOIN free_grants fg ON fg.user_id = fu.id
    WHERE fg.user_id IS NULL
  `
}

async function grantWelcomeCredits(userId: string, hasTestMode: boolean) {
  const existing = await sql`
    SELECT 1
    FROM credit_transactions
    WHERE user_id = ${userId}
      AND transaction_type = 'bonus'
      AND description = ${WELCOME_BONUS_DESC}
    LIMIT 1
  `
  if (existing.length > 0) {
    return { skipped: true }
  }

  const [credits] = await sql`
    SELECT balance, total_purchased
    FROM user_credits
    WHERE user_id = ${userId}
  `

  const currentBalance = Number(credits?.balance || 0)
  const newBalance = currentBalance + WELCOME_BONUS_AMOUNT

  if (DRY_RUN) {
    return { skipped: false, newBalance }
  }

  await sql`
    INSERT INTO user_credits (user_id, balance, total_purchased, total_used, created_at, updated_at)
    VALUES (${userId}, ${newBalance}, ${WELCOME_BONUS_AMOUNT}, 0, NOW(), NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
      balance = ${newBalance},
      total_purchased = user_credits.total_purchased + ${WELCOME_BONUS_AMOUNT},
      updated_at = NOW()
  `

  if (hasTestMode) {
    await sql`
      INSERT INTO credit_transactions (
        user_id, amount, transaction_type, description,
        balance_after, is_test_mode, created_at
      )
      VALUES (
        ${userId}, ${WELCOME_BONUS_AMOUNT}, 'bonus', ${WELCOME_BONUS_DESC},
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
        ${userId}, ${WELCOME_BONUS_AMOUNT}, 'bonus', ${WELCOME_BONUS_DESC},
        ${newBalance}, NOW()
      )
    `
  }

  return { skipped: false, newBalance }
}

async function main() {
  console.log(`[BACKFILL] Free welcome credits (dry run: ${DRY_RUN})`)

  const before = await getBeforeSummary()
  console.log("[BACKFILL] Before summary:", before)

  const hasTestMode = await hasIsTestModeColumn()
  const missingUsers = await getMissingUsers()
  console.log(`[BACKFILL] Missing users found: ${missingUsers.length}`)

  let updated = 0
  for (const row of missingUsers) {
    const result = await grantWelcomeCredits(row.user_id, hasTestMode)
    if (!result.skipped) {
      updated += 1
    }
  }

  console.log(`[BACKFILL] Updated users: ${updated}`)

  const after = await getBeforeSummary()
  console.log("[BACKFILL] After summary:", after)
}

main().catch((error) => {
  console.error("[BACKFILL] Error:", error)
  process.exit(1)
})
