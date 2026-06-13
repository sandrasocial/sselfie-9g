// SHOOT-STUDIO-01 Phase B: DB-backed Prompt Vault collections.
// Run once if you want to pre-create the tables:
//   npx tsx scripts/setup-vault-collections.ts

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"

config({ path: ".env.local" })

async function main() {
  const sql = neon(process.env.DATABASE_URL!)

  await sql`
    CREATE TABLE IF NOT EXISTS vault_collections (
      id SERIAL PRIMARY KEY,
      source_shoot_id INTEGER UNIQUE,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'published',
      giveaway_shot_id TEXT,
      hero_image_url TEXT,
      mood_line TEXT NOT NULL DEFAULT '',
      inspiration_urls JSONB NOT NULL DEFAULT '[]',
      email_drop_status TEXT NOT NULL DEFAULT 'queued',
      email_drop_included_at TIMESTAMPTZ,
      published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS vault_prompts (
      id SERIAL PRIMARY KEY,
      collection_id INTEGER NOT NULL REFERENCES vault_collections(id) ON DELETE CASCADE,
      source_shot_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      number TEXT NOT NULL,
      card_id TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      when_to_use TEXT NOT NULL,
      mood TEXT NOT NULL,
      prompt TEXT NOT NULL,
      example_image TEXT,
      status TEXT NOT NULL DEFAULT 'published',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(collection_id, source_shot_id)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_vault_collections_published ON vault_collections (status, published_at DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_vault_prompts_collection ON vault_prompts (collection_id, sort_order)`

  console.log("vault_collections and vault_prompts ready")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
