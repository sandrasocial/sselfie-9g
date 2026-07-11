// One-time backfill for VAULT-DROP-AUTOSYNC-01 (2026-07-11). `4f13e7fd` added automatic
// academy_monthly_drops sync on every NEW Shoot Studio publish, but collections published
// before that commit were never backfilled — Codex's own post-deploy audit found 17 gaps.
// Mirrors the exact upsert shape in lib/content-kit/shoot-publisher.ts::syncPublishedShootToMemberLibrary
// (that function itself is server-only and can't be imported into a plain script, so this
// duplicates its SQL rather than its import, same workaround already used elsewhere in scripts/).
//
//   npx tsx scripts/backfill-vault-library-drops.ts        # dry run, lists gaps only
//   npx tsx scripts/backfill-vault-library-drops.ts --write  # actually upserts
import { config } from "dotenv"
import { resolve } from "path"
config({ path: resolve(__dirname, "..", ".env.local") })
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const write = process.argv.includes("--write")

async function main() {
  const gaps = (await sql`
    SELECT vc.id, vc.title, vc.mood_line, vc.hero_image_url, vc.published_at
    FROM vault_collections vc
    WHERE vc.status = 'published'
      AND NOT EXISTS (SELECT 1 FROM academy_monthly_drops amd WHERE amd.title = vc.title)
    ORDER BY vc.published_at ASC
  `) as any[]

  console.log(`${gaps.length} published Vault collection(s) missing from academy_monthly_drops.`)
  for (const g of gaps) console.log(`  - ${g.title} (published ${String(g.published_at).slice(0, 10)})`)

  if (!write) {
    console.log(`\nDry run only — pass --write to actually upsert these ${gaps.length} row(s).`)
    return
  }

  let created = 0
  for (const g of gaps) {
    const month = new Date(g.published_at).toISOString().slice(0, 7)
    await sql`
      INSERT INTO academy_monthly_drops (
        title, description, thumbnail_url, resource_type, resource_url,
        month, category, order_index, status, download_count, created_at, updated_at
      )
      VALUES (
        ${g.title}, ${g.mood_line}, ${g.hero_image_url}, 'prompt-collection',
        '/academy/access/prompt-vault', ${month}, 'Prompt Vault', 0, 'published', 0, NOW(), NOW()
      )
      ON CONFLICT DO NOTHING
    `
    created++
  }
  console.log(`\nBackfilled ${created} row(s).`)
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e.message)
  process.exit(1)
})
