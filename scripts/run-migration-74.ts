import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { neon, type NeonQueryFunction } from "@neondatabase/serverless"
import { config } from "dotenv"

type MigrationSql = NeonQueryFunction<false, false>

export function parseMigration74Statements(source: string): string[] {
  const statements: string[] = []
  let current = ""
  let dollarTag: string | null = null
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === "$" && (!dollarTag || source.startsWith(dollarTag, index))) {
      const match = source.slice(index).match(/^\$[A-Za-z0-9_]*\$/)
      if (match) {
        const tag = match[0]
        if (!dollarTag) dollarTag = tag
        else if (dollarTag === tag) dollarTag = null
        current += tag
        index += tag.length - 1
        continue
      }
    }
    if (source[index] === ";" && !dollarTag) {
      const statement = current.trim()
      if (statement && !/^(?:BEGIN|COMMIT)$/i.test(statement)) statements.push(statement)
      current = ""
    } else current += source[index]
  }
  const trailing = current.trim()
  if (trailing && !/^(?:BEGIN|COMMIT)$/i.test(trailing)) statements.push(trailing)
  return statements
}

export async function applyMigration74(sql: MigrationSql, source: string): Promise<void> {
  const statements = parseMigration74Statements(source)
  if (!statements.length) throw new Error("Migration 74 contains no executable statements")
  await sql.transaction(tx => statements.map(statement => tx.query(statement)))
}

export async function verifyMigration74(sql: MigrationSql): Promise<void> {
  const rows = await sql.query(
    `SELECT
       to_regclass('public.suite_pilot_preflight_snapshots') IS NOT NULL AS snapshots,
       to_regclass('public.suite_pilot_authorization_events') IS NOT NULL AS events,
       EXISTS (
         SELECT 1 FROM pg_constraint
         WHERE conname = 'integration_outbox_protected_provider_kill_switch'
           AND convalidated
       ) AS kill_switch,
       EXISTS (
         SELECT 1 FROM pg_trigger
         WHERE tgname = 'suite_pilot_snapshots_immutable' AND NOT tgisinternal
       ) AS snapshot_immutable,
       EXISTS (
         SELECT 1 FROM pg_trigger
         WHERE tgname = 'suite_pilot_events_immutable' AND NOT tgisinternal
       ) AS event_immutable,
       EXISTS (
         SELECT 1 FROM pg_trigger
         WHERE tgname = 'suite_pilot_snapshots_no_truncate' AND NOT tgisinternal
       ) AS snapshot_no_truncate,
       EXISTS (
         SELECT 1 FROM pg_trigger
         WHERE tgname = 'suite_pilot_events_no_truncate' AND NOT tgisinternal
       ) AS event_no_truncate`
  )
  const row = rows[0] as Record<string, unknown> | undefined
  if (
    !row?.snapshots ||
    !row.events ||
    !row.kill_switch ||
    !row.snapshot_immutable ||
    !row.event_immutable ||
    !row.snapshot_no_truncate ||
    !row.event_no_truncate
  ) {
    throw new Error("Migration 74 verification failed")
  }
}

export async function runMigration74(sql: MigrationSql, source: string): Promise<void> {
  await applyMigration74(sql, source)
  await verifyMigration74(sql)
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  if (argv.includes("--help")) {
    process.stdout.write(
      "Usage: pnpm migrate:74\nApplies migration 74 in one transaction, then verifies its immutable ledgers and protected-provider kill switch.\n"
    )
    return
  }
  if (argv.length > 0) throw new Error("Migration 74 does not accept arguments")
  config({ path: resolve(process.cwd(), ".env.local") })
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!databaseUrl) throw new Error("DATABASE_URL or POSTGRES_URL is required")
  const sql = neon(databaseUrl)
  const source = readFileSync(
    resolve(process.cwd(), "db/migrations/74-create-suite-pilot-authorization-ledger.sql"),
    "utf8"
  )
  await runMigration74(sql, source)
  process.stdout.write(
    "Migration 74 applied and verified: 2 immutable ledgers; protected outbox disabled.\n"
  )
}

function shouldRunCli(): boolean {
  const entry = process.argv[1] || ""
  return (
    entry.endsWith("/scripts/run-migration-74.ts") ||
    entry.endsWith("\\scripts\\run-migration-74.ts")
  )
}

if (shouldRunCli()) {
  void main().catch(error => {
    process.stderr.write(
      `Migration 74 failed: ${error instanceof Error ? error.message : "unknown error"}\n`
    )
    process.exitCode = 1
  })
}
