// CONTENT-CAROUSEL-03 — style-reference library. Sandra's approved ChatGPT
// carousel slides become the style anchors fed into gpt-image-2 (the designer).
// Admin-global, same content_* family.
//   npx tsx scripts/setup-content-style-references.ts
// Idempotent.

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"

config({ path: ".env.local" })

async function main() {
  const sql = neon(process.env.DATABASE_URL!)
  await sql`
    CREATE TABLE IF NOT EXISTS content_style_references (
      id SERIAL PRIMARY KEY,
      image_url TEXT NOT NULL,
      label TEXT,
      source_filename TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  console.log("content_style_references ready")
}

main().catch((e) => { console.error(e); process.exit(1) })
