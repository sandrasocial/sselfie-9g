// SHOOT-STUDIO-01: inspiration-driven photoshoots (the content unit everything else
// spins from). Run once: npx tsx scripts/setup-content-shoots.ts

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"

config({ path: ".env.local" })

async function main() {
  const sql = neon(process.env.DATABASE_URL!)

  await sql`
    CREATE TABLE IF NOT EXISTS content_shoots (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      inspiration_urls JSONB NOT NULL DEFAULT '[]',
      selfie_url TEXT NOT NULL,
      shots JSONB NOT NULL DEFAULT '[]',
      messages JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_content_shoots_created ON content_shoots (created_at DESC)`

  console.log("content_shoots ready")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
