import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"

config({ path: resolve(process.cwd(), ".env.local") })

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
if (!databaseUrl) throw new Error("DATABASE_URL or POSTGRES_URL is required")

const sql = neon(databaseUrl)
const migrationPath = resolve(
  process.cwd(),
  "db/migrations/72-create-stripe-payment-adjustment-ledger.sql"
)

async function main() {
  const statements = readFileSync(migrationPath, "utf8")
    .split(";")
    .map(statement => statement.trim())
    .filter(Boolean)

  for (const statement of statements) await sql.query(statement)

  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'stripe_payment_adjustments',
        'stripe_payment_adjustment_movements'
      )
    ORDER BY table_name
  `

  const indexes = await sql`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN (
        'stripe_payment_adjustments',
        'stripe_payment_adjustment_movements'
      )
      AND indexdef LIKE 'CREATE UNIQUE INDEX%'
    ORDER BY indexname
  `

  if (tables.length !== 2) {
    throw new Error(`Migration 72 verification failed: expected 2 tables, found ${tables.length}`)
  }
  if (indexes.length < 2) {
    throw new Error(
      `Migration 72 verification failed: expected at least 2 unique indexes, found ${indexes.length}`
    )
  }

  console.log("Migration 72 applied and verified: 2 tables, unique business keys present.")
}

main().catch(error => {
  console.error("Migration 72 failed:", error instanceof Error ? error.message : "unknown error")
  process.exitCode = 1
})
