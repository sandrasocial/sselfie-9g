// CONTENT-VISUALS-01: story sequences (Sandra's Story Prompt Engineer doctrine,
// docs/funnel/STORY_SLIDE_DOCTRINE_2026-06-12.md) rendered deterministically at
// 1080x1920 — her photo untouched as background, text + doodles on top.
// Run once: npx tsx scripts/setup-content-stories.ts

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"

config({ path: ".env.local" })

async function main() {
  const sql = neon(process.env.DATABASE_URL!)

  await sql`
    CREATE TABLE IF NOT EXISTS content_story_sequences (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      topic TEXT NOT NULL,
      slides JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_content_stories_created ON content_story_sequences (created_at DESC)`

  console.log("content_story_sequences ready")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
