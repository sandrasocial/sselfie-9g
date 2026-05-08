/**
 * Normalize one-time session product_type values in stripe_payments.
 *
 * Targets records where payment_type = 'one_time_session' but product_type
 * is missing or incorrectly set to subscription products.
 *
 * Usage:
 *   DRY_RUN=true LIVE_ONLY=true pnpm exec tsx scripts/backfill/normalize-stripe-one-time-product-types.ts
 *   DRY_RUN=false LIVE_ONLY=true pnpm exec tsx scripts/backfill/normalize-stripe-one-time-product-types.ts
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
const LIVE_ONLY = process.env.LIVE_ONLY !== "false"

async function getCandidateStats() {
  return await sql`
    WITH candidates AS (
      SELECT
        stripe_payment_id,
        CASE
          WHEN LOWER(COALESCE(metadata->>'product_type', '')) LIKE '%blueprint%'
            OR LOWER(COALESCE(metadata->>'product_id', '')) LIKE '%blueprint%'
            OR LOWER(COALESCE(metadata->>'package_id', '')) LIKE '%blueprint%'
            OR LOWER(COALESCE(description, '')) LIKE '%blueprint%'
          THEN 'paid_blueprint'
          ELSE 'one_time_session'
        END AS new_product_type
      FROM stripe_payments
      WHERE payment_type = 'one_time_session'
        AND (product_type IS NULL OR product_type IN ('sselfie_studio_membership', 'brand_studio_membership'))
        AND (${LIVE_ONLY} = FALSE OR is_test_mode IS NULL OR is_test_mode = FALSE)
    )
    SELECT new_product_type, COUNT(*)::int AS count
    FROM candidates
    GROUP BY new_product_type
    ORDER BY count DESC
  `
}

async function getCandidateSamples() {
  return await sql`
    WITH candidates AS (
      SELECT
        stripe_payment_id,
        amount_cents,
        description,
        metadata,
        CASE
          WHEN LOWER(COALESCE(metadata->>'product_type', '')) LIKE '%blueprint%'
            OR LOWER(COALESCE(metadata->>'product_id', '')) LIKE '%blueprint%'
            OR LOWER(COALESCE(metadata->>'package_id', '')) LIKE '%blueprint%'
            OR LOWER(COALESCE(description, '')) LIKE '%blueprint%'
          THEN 'paid_blueprint'
          ELSE 'one_time_session'
        END AS new_product_type
      FROM stripe_payments
      WHERE payment_type = 'one_time_session'
        AND (product_type IS NULL OR product_type IN ('sselfie_studio_membership', 'brand_studio_membership'))
        AND (${LIVE_ONLY} = FALSE OR is_test_mode IS NULL OR is_test_mode = FALSE)
    )
    SELECT
      stripe_payment_id,
      amount_cents,
      description,
      metadata->>'product_type' AS meta_product_type,
      metadata->>'product_id' AS meta_product_id,
      metadata->>'package_id' AS meta_package_id,
      new_product_type
    FROM candidates
    ORDER BY stripe_payment_id DESC
    LIMIT 10
  `
}

async function applyNormalization() {
  return await sql`
    WITH candidates AS (
      SELECT
        stripe_payment_id,
        CASE
          WHEN LOWER(COALESCE(metadata->>'product_type', '')) LIKE '%blueprint%'
            OR LOWER(COALESCE(metadata->>'product_id', '')) LIKE '%blueprint%'
            OR LOWER(COALESCE(metadata->>'package_id', '')) LIKE '%blueprint%'
            OR LOWER(COALESCE(description, '')) LIKE '%blueprint%'
          THEN 'paid_blueprint'
          ELSE 'one_time_session'
        END AS new_product_type
      FROM stripe_payments
      WHERE payment_type = 'one_time_session'
        AND (product_type IS NULL OR product_type IN ('sselfie_studio_membership', 'brand_studio_membership'))
        AND (${LIVE_ONLY} = FALSE OR is_test_mode IS NULL OR is_test_mode = FALSE)
    )
    UPDATE stripe_payments sp
    SET product_type = c.new_product_type,
        updated_at = NOW()
    FROM candidates c
    WHERE sp.stripe_payment_id = c.stripe_payment_id
    RETURNING sp.stripe_payment_id, c.new_product_type
  `
}

async function main() {
  console.log(`[NORMALIZE] One-time product types (dry run=${DRY_RUN}, live only=${LIVE_ONLY})`)
  const stats = await getCandidateStats()
  const samples = await getCandidateSamples()
  console.log("[NORMALIZE] Candidate counts:", stats)
  console.log("[NORMALIZE] Samples:", samples)

  if (DRY_RUN) {
    console.log("[NORMALIZE] DRY_RUN=true, no updates applied.")
    return
  }

  const updated = await applyNormalization()
  console.log("[NORMALIZE] Updated rows:", updated.length)
}

main().catch((error) => {
  console.error("[NORMALIZE] Error:", error)
  process.exit(1)
})
