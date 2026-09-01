// @vitest-environment node
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { parseMigration77Statements } from "@/scripts/run-migration-77"

describe("migration 77 SQL parser", () => {
  it("parses the real migration without splitting on semicolons inside comments", () => {
    const source = readFileSync(
      "db/migrations/77-create-skool-membership-entitlements.sql",
      "utf8",
    )
    const statements = parseMigration77Statements(source)

    expect(statements.length).toBeGreaterThan(5)
    expect(statements.some(statement => statement.includes("CREATE TABLE IF NOT EXISTS skool_membership_entitlements"))).toBe(true)
    expect(statements.some(statement => statement.includes("CREATE TABLE IF NOT EXISTS skool_membership_events"))).toBe(true)
    expect(statements.some(statement => statement.includes("credit_transactions_skool_membership_grant_key"))).toBe(true)
    expect(statements.some(statement => /^the application derives/i.test(statement.trim()))).toBe(false)
    expect(statements).not.toContain("BEGIN")
    expect(statements).not.toContain("COMMIT")
  })

  it("does not split semicolons inside line comments, block comments, or quoted values", () => {
    const source = [
      "BEGIN;",
      "-- keep; this together",
      "CREATE TABLE sample (value TEXT DEFAULT 'a;b');",
      "/* another; comment */",
      'CREATE INDEX "semi;colon" ON sample (value);',
      "DO $body$ BEGIN PERFORM 'x;y'; END $body$;",
      "COMMIT;",
    ].join("\n")

    const statements = parseMigration77Statements(source)
    expect(statements).toHaveLength(3)
    expect(statements[0]).toContain("keep; this together")
    expect(statements[0]).toContain("'a;b'")
    expect(statements[1]).toContain('"semi;colon"')
    expect(statements[2]).toContain("PERFORM 'x;y'")
  })

  it("fails closed on unterminated quoted SQL", () => {
    expect(() => parseMigration77Statements("CREATE TABLE x (v TEXT DEFAULT 'oops);"))
      .toThrow("unterminated SQL syntax")
  })
})
