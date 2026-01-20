/**
 * Backfill blueprint_subscribers.user_id using users.email.
 * Idempotent: only fills NULL user_id values.
 *
 * Usage:
 *   DRY_RUN=true npx tsx scripts/backfill/backfill-blueprint-subscriber-user-ids.ts
 *   npx tsx scripts/backfill/backfill-blueprint-subscriber-user-ids.ts
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

async function getSummary() {
  const [summary] = await sql`
    SELECT
      COUNT(*)::int AS total_blueprint_subscribers,
      COUNT(*) FILTER (WHERE user_id IS NULL)::int AS missing_user_id,
      COUNT(*) FILTER (WHERE user_id IS NOT NULL)::int AS has_user_id
    FROM blueprint_subscribers
  `
  return summary
}

async function getMatchCounts() {
  const [counts] = await sql`
    SELECT
      COUNT(*)::int AS matchable,
      COUNT(*) FILTER (WHERE u.id IS NULL)::int AS no_user_match
    FROM blueprint_subscribers bs
    LEFT JOIN users u ON u.email = bs.email
    WHERE bs.user_id IS NULL
  `
  return counts
}

async function updateMissingUserIds() {
  const updated = await sql`
    UPDATE blueprint_subscribers bs
    SET user_id = u.id,
        updated_at = NOW()
    FROM users u
    WHERE bs.user_id IS NULL
      AND bs.email = u.email
    RETURNING bs.id
  `
  return updated.length
}

async function main() {
  console.log(`[BACKFILL] Blueprint subscriber user_id (dry run: ${DRY_RUN})`)

  const before = await getSummary()
  console.log("[BACKFILL] Before summary:", before)

  const matchCounts = await getMatchCounts()
  console.log("[BACKFILL] Matchable rows:", matchCounts.matchable)
  console.log("[BACKFILL] No user match:", matchCounts.no_user_match)

  let updated = 0
  if (!DRY_RUN) {
    updated = await updateMissingUserIds()
  }

  console.log(`[BACKFILL] Updated rows: ${updated}`)

  const after = await getSummary()
  console.log("[BACKFILL] After summary:", after)
}

main().catch((error) => {
  console.error("[BACKFILL] Error:", error)
  process.exit(1)
})
