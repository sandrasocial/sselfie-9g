// One-off backfill: refund credits burned on failed App v3 video generations
// BEFORE refund-on-failure landed (0ca8786c, 2026-06-20).
//
// Investigation (2026-07-02): generated_videos rows 548-553 failed with the upstream
// wan-2.5-i2v-fast error "E002" and deducted 3 animation credits each with no refund.
// Row 554+ were refunded by the live code path. This script refunds exactly those
// pre-fix failures, idempotently (skips any row that already has a matching refund).
//
// Usage:
//   npx tsx scripts/refund-failed-video-credits-2026-06.ts            # dry run (default)
//   npx tsx scripts/refund-failed-video-credits-2026-06.ts --execute  # apply refunds
//   add --include-admin to also refund the admin account (skipped by default)

import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

const EXECUTE = process.argv.includes("--execute")
const INCLUDE_ADMIN = process.argv.includes("--include-admin")

// Failed video rows verified during the 2026-07-02 investigation (pre-refund-fix window).
const FAILED_VIDEO_IDS = [548, 549, 550, 551, 552, 553]
const ADMIN_USER_ID = "42585527"
const FALLBACK_REFUND_AMOUNT = 3 // verified: every burned deduction in the window was -3

async function main() {
  const { neon } = await import("@neondatabase/serverless")
  const { addCredits } = await import("@/lib/credits")
  const sql = neon(process.env.DATABASE_URL!)

  const videos = await sql`
    SELECT id, user_id, status, error_message, created_at
    FROM generated_videos
    WHERE id = ANY(${FAILED_VIDEO_IDS})
    ORDER BY id
  `

  for (const video of videos) {
    const label = `video ${video.id} (user ${String(video.user_id).slice(0, 6)}…)`

    if (video.status !== "failed") {
      console.log(`SKIP ${label}: status is '${video.status}', not 'failed'`)
      continue
    }
    if (!INCLUDE_ADMIN && String(video.user_id) === ADMIN_USER_ID) {
      console.log(`SKIP ${label}: admin account (pass --include-admin to refund)`)
      continue
    }

    const description = `Refund for failed app-v3 video prediction: ${video.id} (backfill 2026-07)`
    const existing = await sql`
      SELECT id FROM credit_transactions
      WHERE user_id = ${video.user_id}
        AND transaction_type = 'refund'
        AND (description = ${description}
             OR description = ${`Refund for failed app-v3 video prediction: ${video.id}`})
      LIMIT 1
    `
    if (existing.length > 0) {
      console.log(`SKIP ${label}: refund already exists (tx ${existing[0].id})`)
      continue
    }

    // Mirror the actual burned amount: nearest animation deduction within 5 minutes.
    const deduction = await sql`
      SELECT id, amount FROM credit_transactions
      WHERE user_id = ${video.user_id}
        AND transaction_type = 'animation'
        AND created_at BETWEEN ${video.created_at}::timestamptz - INTERVAL '5 minutes'
                           AND ${video.created_at}::timestamptz + INTERVAL '5 minutes'
      ORDER BY ABS(EXTRACT(EPOCH FROM (created_at - ${video.created_at}::timestamptz)))
      LIMIT 1
    `
    const amount = deduction.length > 0 ? Math.abs(Number(deduction[0].amount)) : FALLBACK_REFUND_AMOUNT

    if (!EXECUTE) {
      console.log(`DRY RUN ${label}: would refund ${amount} credits ("${description}")`)
      continue
    }

    const result = await addCredits(String(video.user_id), amount, "refund", description)
    if (!result.success) {
      console.error(`FAILED ${label}: ${result.error}`)
      continue
    }
    console.log(`REFUNDED ${label}: +${amount} credits (new balance ${result.newBalance})`)
  }

  console.log(EXECUTE ? "Done (executed)." : "Done (dry run — pass --execute to apply).")
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.error("ERR:", e.message)
    process.exit(1)
  })
