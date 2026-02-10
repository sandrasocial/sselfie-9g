/**
 * Debug join keys between users and other tables (read-only).
 *
 * Uses fixed SQL (no dynamic table names) so it works with the Neon tagged client.
 */
import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { resolve } from "node:path"

dotenv.config({ path: resolve(process.cwd(), ".env.local") })

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  const joins = [
    {
      name: "selfie_uploads.user_id = users.id",
      run: async () => (await sql`SELECT COUNT(*)::int AS count FROM selfie_uploads su JOIN users u ON su.user_id::text = u.id::text`)[0]?.count ?? 0,
    },
    {
      name: "selfie_uploads.user_id = users.stack_auth_user_id",
      run: async () =>
        (await sql`SELECT COUNT(*)::int AS count FROM selfie_uploads su JOIN users u ON su.user_id::text = u.stack_auth_user_id::text`)[0]?.count ?? 0,
    },
    {
      name: "training_runs.user_id = users.id",
      run: async () => (await sql`SELECT COUNT(*)::int AS count FROM training_runs tr JOIN users u ON tr.user_id::text = u.id::text`)[0]?.count ?? 0,
    },
    {
      name: "user_models.user_id = users.id",
      run: async () => (await sql`SELECT COUNT(*)::int AS count FROM user_models um JOIN users u ON um.user_id::text = u.id::text`)[0]?.count ?? 0,
    },
  ]

  for (const j of joins) {
    const count = await j.run()
    console.log(`${j.name}: ${count}`)
  }

  const sample = await sql`
    SELECT user_id, filename, created_at
    FROM selfie_uploads
    ORDER BY created_at DESC
    LIMIT 5
  `
  console.log("\nSample selfie_uploads.user_id:")
  for (const r of sample as any[]) {
    console.log(`- ${r.user_id} (${r.filename || "n/a"})`)
  }

  const userIdCols = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name ILIKE '%id%'
    ORDER BY ordinal_position
  `
  console.log("\nusers.* columns matching %id%:")
  console.log((userIdCols as any[]).map((r) => r.column_name).join(", "))
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})

