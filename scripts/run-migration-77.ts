import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { neon, type NeonQueryFunction } from "@neondatabase/serverless"
import { config } from "dotenv"

type MigrationSql = NeonQueryFunction<false, false>

export function parseMigration77Statements(source: string): string[] {
  const statements: string[] = []
  let current = ""
  let dollarTag: string | null = null
  let inSingleQuote = false
  let inDoubleQuote = false
  let inLineComment = false
  let inBlockComment = false

  const pushCurrent = () => {
    const statement = current.trim()
    if (statement && !/^(?:BEGIN|COMMIT)$/i.test(statement)) statements.push(statement)
    current = ""
  }

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    const next = source[index + 1]

    if (inLineComment) {
      current += char
      if (char === "\n") inLineComment = false
      continue
    }

    if (inBlockComment) {
      current += char
      if (char === "*" && next === "/") {
        current += next
        index += 1
        inBlockComment = false
      }
      continue
    }

    if (dollarTag) {
      if (source.startsWith(dollarTag, index)) {
        current += dollarTag
        index += dollarTag.length - 1
        dollarTag = null
      } else {
        current += char
      }
      continue
    }

    if (inSingleQuote) {
      current += char
      if (char === "'" && next === "'") {
        current += next
        index += 1
      } else if (char === "'") {
        inSingleQuote = false
      }
      continue
    }

    if (inDoubleQuote) {
      current += char
      if (char === '"' && next === '"') {
        current += next
        index += 1
      } else if (char === '"') {
        inDoubleQuote = false
      }
      continue
    }

    if (char === "-" && next === "-") {
      current += "--"
      index += 1
      inLineComment = true
      continue
    }

    if (char === "/" && next === "*") {
      current += "/*"
      index += 1
      inBlockComment = true
      continue
    }

    if (char === "'") {
      current += char
      inSingleQuote = true
      continue
    }

    if (char === '"') {
      current += char
      inDoubleQuote = true
      continue
    }

    if (char === "$") {
      const match = source.slice(index).match(/^\$[A-Za-z0-9_]*\$/)
      if (match) {
        dollarTag = match[0]
        current += dollarTag
        index += dollarTag.length - 1
        continue
      }
    }

    if (char === ";") {
      pushCurrent()
      continue
    }

    current += char
  }

  if (inSingleQuote || inDoubleQuote || inBlockComment || dollarTag) {
    throw new Error("Migration 77 contains unterminated SQL syntax")
  }

  pushCurrent()
  return statements
}

export async function applyMigration77(sql: MigrationSql, source: string): Promise<void> {
  const statements = parseMigration77Statements(source)
  if (!statements.length) throw new Error("Migration 77 contains no executable statements")
  await sql.transaction(tx => statements.map(statement => tx.query(statement)))
}

export async function verifyMigration77(sql: MigrationSql): Promise<void> {
  const rows = await sql.query(`
    SELECT
      to_regclass('public.skool_membership_entitlements') IS NOT NULL AS entitlements,
      to_regclass('public.skool_membership_events') IS NOT NULL AS events,
      to_regclass('public.credit_transactions_skool_membership_grant_key') IS NOT NULL AS credit_index,
      COALESCE((
        SELECT relrowsecurity
        FROM pg_class
        WHERE oid = to_regclass('public.skool_membership_entitlements')
      ), false) AS entitlements_rls,
      COALESCE((
        SELECT relrowsecurity
        FROM pg_class
        WHERE oid = to_regclass('public.skool_membership_events')
      ), false) AS events_rls
  `)

  const row = rows[0] as Record<string, unknown> | undefined
  if (
    !row?.entitlements ||
    !row.events ||
    !row.credit_index ||
    !row.entitlements_rls ||
    !row.events_rls
  ) {
    throw new Error("Migration 77 verification failed")
  }
}

export async function runMigration77(sql: MigrationSql, source: string): Promise<void> {
  await applyMigration77(sql, source)
  await verifyMigration77(sql)
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  if (argv.includes("--help")) {
    process.stdout.write(
      "Usage: pnpm tsx scripts/run-migration-77.ts [--verify-only]\n" +
        "Applies the additive Skool entitlement/idempotency migration, then verifies it.\n",
    )
    return
  }

  const unsupported = argv.filter(arg => arg !== "--verify-only")
  if (unsupported.length) throw new Error(`Unsupported argument: ${unsupported[0]}`)

  config({ path: resolve(process.cwd(), ".env.local") })
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!databaseUrl) throw new Error("DATABASE_URL or POSTGRES_URL is required")

  const sql = neon(databaseUrl)
  if (argv.includes("--verify-only")) {
    await verifyMigration77(sql)
    process.stdout.write("Migration 77 verification passed.\n")
    return
  }

  const source = readFileSync(
    resolve(process.cwd(), "db/migrations/77-create-skool-membership-entitlements.sql"),
    "utf8",
  )
  await runMigration77(sql, source)
  process.stdout.write(
    "Migration 77 applied and verified: Skool entitlement/event tables and credit idempotency index are ready.\n",
  )
}

function shouldRunCli(): boolean {
  const entry = process.argv[1] || ""
  return (
    entry.endsWith("/scripts/run-migration-77.ts") ||
    entry.endsWith("\\scripts\\run-migration-77.ts")
  )
}

if (shouldRunCli()) {
  void main().catch(error => {
    process.stderr.write(
      `Migration 77 failed: ${error instanceof Error ? error.message : "unknown error"}\n`,
    )
    process.exitCode = 1
  })
}
