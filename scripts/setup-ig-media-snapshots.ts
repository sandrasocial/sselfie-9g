// IG-GROWTH-01: nightly Instagram media snapshots so the content brief can do
// day-7 verdicts, spot decaying winners and schedule repost-remixes.
// Run once: npx tsx scripts/setup-ig-media-snapshots.ts

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"

config({ path: ".env.local" })

async function main() {
  const sql = neon(process.env.DATABASE_URL!)

  await sql`
    CREATE TABLE IF NOT EXISTS ig_media_snapshots (
      id SERIAL PRIMARY KEY,
      media_id TEXT NOT NULL,
      captured_on DATE NOT NULL DEFAULT CURRENT_DATE,
      instagram_username TEXT NOT NULL,
      permalink TEXT,
      format TEXT NOT NULL DEFAULT 'other',
      posted_at TIMESTAMPTZ,
      hook_line TEXT,
      likes INTEGER NOT NULL DEFAULT 0,
      comments INTEGER NOT NULL DEFAULT 0,
      views INTEGER,
      reach INTEGER,
      saves INTEGER,
      shares INTEGER,
      insights_level TEXT NOT NULL DEFAULT 'basic',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (media_id, captured_on)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_ig_snapshots_media ON ig_media_snapshots (media_id, captured_on DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_ig_snapshots_posted ON ig_media_snapshots (posted_at DESC)`

  console.log("ig_media_snapshots ready")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
