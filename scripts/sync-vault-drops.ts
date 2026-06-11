// FUNNEL-2026-06-11 — sync Prompt Vault collections into academy_monthly_drops so the
// member Library's "Drops" section reflects reality (it was empty since launch while
// /join/studio promises "every new drop, every week").
//
//   npx tsx scripts/sync-vault-drops.ts
//
// Idempotent: upserts by title. Run it after adding a collection to
// lib/vault/drop-log.ts (now part of the collection SOP).

import { config } from "dotenv"
config({ path: ".env.local" })

async function main() {
  const { sql } = await import("../lib/db/client")
  const { VAULT_COLLECTIONS } = await import("../lib/vault/drop-log")

  let created = 0
  let updated = 0
  for (let i = 0; i < VAULT_COLLECTIONS.length; i++) {
    const c = VAULT_COLLECTIONS[i]
    const month = (c.droppedAt || new Date().toISOString().slice(0, 10)).slice(0, 7)
    const existing = await sql`SELECT id FROM academy_monthly_drops WHERE title = ${c.name} LIMIT 1`
    if (existing.length > 0) {
      await sql`
        UPDATE academy_monthly_drops
        SET description = ${c.moodLine}, thumbnail_url = ${c.heroImage},
            month = ${month}, order_index = ${i}, status = 'published', updated_at = NOW()
        WHERE id = ${existing[0].id}
      `
      updated++
    } else {
      await sql`
        INSERT INTO academy_monthly_drops (
          title, description, thumbnail_url, resource_type, resource_url,
          month, category, order_index, status, download_count, created_at, updated_at
        )
        VALUES (
          ${c.name}, ${c.moodLine}, ${c.heroImage}, 'prompt-collection',
          '/academy/access/prompt-vault', ${month}, 'Prompt Vault', ${i}, 'published', 0, NOW(), NOW()
        )
      `
      created++
    }
  }
  console.log(`Drops synced: ${created} created, ${updated} updated (${VAULT_COLLECTIONS.length} collections).`)
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e)
  process.exit(1)
})
