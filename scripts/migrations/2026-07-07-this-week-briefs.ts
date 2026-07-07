// THIS WEEK (2026-07-07): weekly Instagram trend digest + per-member weekly briefs.
// Freshness is structural: both tables key on week_start (Monday); reads only ever match the
// current week, so stale suggestions cannot be served. Idempotent - safe to re-run.
//
// Run: npx tsx scripts/migrations/2026-07-07-this-week-briefs.ts

import { sql } from "@/lib/db/client"

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS weekly_content_trends (
      id SERIAL PRIMARY KEY,
      week_start DATE NOT NULL UNIQUE,
      digest JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS member_weekly_briefs (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      week_start DATE NOT NULL,
      brief JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, week_start)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_member_weekly_briefs_user ON member_weekly_briefs (user_id, week_start)`
  const [t1] = await sql`SELECT COUNT(*)::int AS n FROM weekly_content_trends`
  const [t2] = await sql`SELECT COUNT(*)::int AS n FROM member_weekly_briefs`
  console.log(`weekly_content_trends rows: ${t1.n}; member_weekly_briefs rows: ${t2.n}`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
