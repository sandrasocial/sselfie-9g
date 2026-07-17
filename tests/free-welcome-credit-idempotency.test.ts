import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("free welcome credit idempotency", () => {
  it("claims the welcome grant and updates its ledger in one locked statement", () => {
    const credits = readFileSync("lib/credits.ts", "utf8")
    const grantStart = credits.indexOf("export async function grantFreeUserCredits")
    const grantEnd = credits.indexOf("export async function grantPaidBlueprintCredits", grantStart)
    const grant = credits.slice(grantStart, grantEnd)

    expect(grant).toContain("pg_advisory_xact_lock")
    expect(grant).toContain("existing_grant AS MATERIALIZED")
    expect(grant).toContain("balance_upsert AS")
    expect(grant).toContain("ledger_insert AS")
    expect(grant).not.toContain("return await addCredits")
  })
})
