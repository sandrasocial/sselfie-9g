// CONTENT-VISUALS-01 Phase 1: rendered carousel decks generated from the weekly
// content brief. Sandra reviews on /admin/content-brief and posts manually.
// Run once: npx tsx scripts/setup-content-carousels.ts

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"

config({ path: ".env.local" })

async function main() {
  const sql = neon(process.env.DATABASE_URL!)

  await sql`
    CREATE TABLE IF NOT EXISTS content_carousels (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      caption TEXT NOT NULL DEFAULT '',
      slides JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      source_period_start DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_content_carousels_created ON content_carousels (created_at DESC)`

  console.log("content_carousels ready")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
