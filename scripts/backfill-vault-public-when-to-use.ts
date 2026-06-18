import "dotenv/config"
import { config as loadDotenv } from "dotenv"
import { resolve } from "node:path"
import { neon } from "@neondatabase/serverless"

import { derivePublicVaultWhenToUse } from "@/lib/vault/public-copy"

loadDotenv({ path: resolve(process.cwd(), ".env.local") })

function getDatabaseUrl(): string {
  const value =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.SUPABASE_POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.SUPABASE_POSTGRES_URL

  if (!value) {
    throw new Error("No database URL found. Set DATABASE_URL or a Postgres URL before running.")
  }
  return value
}

async function main() {
  const dryRun = process.argv.includes("--dry-run")
  const sql = neon(getDatabaseUrl())

  const tableCheck = (await sql`
    SELECT
      to_regclass('public.vault_collections') AS collections_table,
      to_regclass('public.vault_prompts') AS prompts_table
  `) as Array<{ collections_table: string | null; prompts_table: string | null }>

  if (!tableCheck[0]?.collections_table || !tableCheck[0]?.prompts_table) {
    console.log(
      JSON.stringify(
        {
          dryRun,
          skipped: true,
          reason: "Vault tables are not present in this database.",
        },
        null,
        2,
      ),
    )
    return
  }

  const rows = (await sql`
    SELECT
      p.id,
      p.title,
      p.mood,
      p.when_to_use
    FROM vault_prompts p
    JOIN vault_collections c ON c.id = p.collection_id
    WHERE c.source_shoot_id IS NOT NULL
      AND p.status = 'published'
    ORDER BY c.published_at DESC, p.sort_order ASC
  `) as Array<{ id: number; title: string; mood: string; when_to_use: string }>

  let changed = 0
  for (const row of rows) {
    const next = derivePublicVaultWhenToUse({
      title: row.title,
      mood: row.mood,
      whenToUse: row.when_to_use,
    })
    if (next === row.when_to_use) continue
    changed += 1
    if (!dryRun) {
      await sql`
        UPDATE vault_prompts
        SET when_to_use = ${next}, updated_at = NOW()
        WHERE id = ${row.id}
      `
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        scanned: rows.length,
        updated: dryRun ? 0 : changed,
        wouldUpdate: dryRun ? changed : undefined,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  console.error("[backfill-vault-public-when-to-use] failed:", error)
  process.exit(1)
})
