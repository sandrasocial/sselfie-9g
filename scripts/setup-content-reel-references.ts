// CONTENT-CAROUSEL-01 Phase 1 — admin-global store for reel scene-references.
// Tutorial reel covers + per-scene step stills extracted offline land here so the
// admin tutorial-carousel tool can list + pick them and feed the Blob URLs into
// generateCarousels({ imageUrls/overlayUrls }). Mirrors the content_* admin family
// (no user_id; admin-only, gated by ADMIN_EMAIL like content_shoots/content_carousels).
//
//   npx tsx scripts/setup-content-reel-references.ts
//
// Idempotent.

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"

config({ path: ".env.local" })

async function main() {
  const sql = neon(process.env.DATABASE_URL!)

  await sql`
    CREATE TABLE IF NOT EXISTS content_reel_references (
      id SERIAL PRIMARY KEY,
      media_id TEXT NOT NULL,
      permalink TEXT,
      hook_line TEXT,
      views INTEGER,
      kind TEXT NOT NULL DEFAULT 'scene',
      scene_index INTEGER,
      image_url TEXT NOT NULL,
      label TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_content_reel_refs_media ON content_reel_references (media_id, scene_index)`
  await sql`CREATE INDEX IF NOT EXISTS idx_content_reel_refs_views ON content_reel_references (views DESC)`

  console.log("content_reel_references ready")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
