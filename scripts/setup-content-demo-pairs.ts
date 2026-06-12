// CONTENT-VISUALS-01 Phase 2: before/after demo images for content (Sandra's
// reference selfie + an editing prompt -> gpt-image-2 edit + side-by-side composite).
// Run once: npx tsx scripts/setup-content-demo-pairs.ts

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"

config({ path: ".env.local" })

async function main() {
  const sql = neon(process.env.DATABASE_URL!)

  await sql`
    CREATE TABLE IF NOT EXISTS content_demo_pairs (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      edit_prompt TEXT NOT NULL,
      before_url TEXT NOT NULL,
      after_url TEXT NOT NULL,
      composite_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_content_demo_pairs_created ON content_demo_pairs (created_at DESC)`

  console.log("content_demo_pairs ready")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
