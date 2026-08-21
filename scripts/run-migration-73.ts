import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { neon } from "@neondatabase/serverless"
import type { NeonQueryFunction } from "@neondatabase/serverless"
import { config } from "dotenv"

type MigrationSql = NeonQueryFunction<false, false>

const expectedTables = [
  "business_events",
  "external_accounts",
  "external_provisioning_states",
  "integration_outbox",
]
const expectedViews = ["integration_dead_letters_v", "integration_operator_queue_v"]
const expectedIndexes = [
  "business_events_idempotency_key_key",
  "external_accounts_provider_scope_external_key",
  "external_accounts_user_provider_scope_key",
  "external_provisioning_states_resource_key",
  "integration_outbox_event_destination_operation_key",
  "integration_outbox_event_destination_family_key",
  "integration_outbox_one_claim_per_resource_idx",
  "integration_outbox_provider_idempotency_key",
]
const expectedBoundedIdentifierConstraints = 9

export function parseMigration73Statements(source: string): string[] {
  return source
    .split(";")
    .map(statement => statement.trim())
    .filter(statement => Boolean(statement) && !/^(?:BEGIN|COMMIT)$/i.test(statement))
}

export async function applyMigration73(sql: MigrationSql, source: string): Promise<void> {
  const statements = parseMigration73Statements(source)
  if (statements.length === 0) throw new Error("Migration 73 contains no executable statements")
  await sql.transaction(tx => statements.map(statement => tx.query(statement)))
}

export async function verifyMigration73(sql: MigrationSql): Promise<void> {
  const tables = await sql.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_type = 'BASE TABLE'
       AND table_name = ANY($1)
     ORDER BY table_name`,
    [expectedTables]
  )
  const views = await sql.query(
    `SELECT table_name
     FROM information_schema.views
     WHERE table_schema = 'public'
       AND table_name = ANY($1)
     ORDER BY table_name`,
    [expectedViews]
  )
  const indexes = await sql.query(
    `SELECT indexname
     FROM pg_indexes
     WHERE schemaname = 'public'
       AND indexname = ANY($1)
     ORDER BY indexname`,
    [expectedIndexes]
  )
  const constraints = await sql.query(
    `SELECT COUNT(*)::int AS constraint_count
     FROM pg_constraint c
     JOIN pg_class t ON t.oid = c.conrelid
     JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE n.nspname = 'public'
       AND t.relname = ANY($1)
       AND pg_get_constraintdef(c.oid) LIKE '%char_length(%'
       AND pg_get_constraintdef(c.oid) LIKE '%256%'
       AND pg_get_constraintdef(c.oid) LIKE '%A-Za-z0-9_.:-%'
       AND pg_get_constraintdef(c.oid) NOT LIKE '%{1,256}%'`,
    [expectedTables]
  )

  const foundTables = new Set(tables.map(row => String(row.table_name)))
  const foundViews = new Set(views.map(row => String(row.table_name)))
  const foundIndexes = new Set(indexes.map(row => String(row.indexname)))
  const missingTables = expectedTables.filter(name => !foundTables.has(name))
  const missingViews = expectedViews.filter(name => !foundViews.has(name))
  const missingIndexes = expectedIndexes.filter(name => !foundIndexes.has(name))
  const boundedIdentifierConstraintCount = Number(constraints[0]?.constraint_count ?? 0)
  if (
    missingTables.length ||
    missingViews.length ||
    missingIndexes.length ||
    boundedIdentifierConstraintCount !== expectedBoundedIdentifierConstraints
  ) {
    throw new Error(
      `Migration 73 verification failed: missing tables=${missingTables.length}, views=${missingViews.length}, indexes=${missingIndexes.length}, bounded_identifier_constraints=${boundedIdentifierConstraintCount}/${expectedBoundedIdentifierConstraints}`
    )
  }
}

export async function runMigration73(sql: MigrationSql, source: string): Promise<void> {
  await applyMigration73(sql, source)
  await verifyMigration73(sql)
}

async function main() {
  config({ path: resolve(process.cwd(), ".env.local") })
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!databaseUrl) throw new Error("DATABASE_URL or POSTGRES_URL is required")
  const sql = neon(databaseUrl)
  const source = readFileSync(
    resolve(process.cwd(), "db/migrations/73-create-integration-control-plane.sql"),
    "utf8"
  )
  await runMigration73(sql, source)

  // eslint-disable-next-line no-console
  console.log(
    `Migration 73 applied and verified: tables=${expectedTables.length}, views=${expectedViews.length}, required_indexes=${expectedIndexes.length}, bounded_identifier_constraints=${expectedBoundedIdentifierConstraints}.`
  )
}

if (require.main === module) {
  main().catch(error => {
    // eslint-disable-next-line no-console
    console.error("Migration 73 failed:", error instanceof Error ? error.message : "unknown error")
    process.exitCode = 1
  })
}
