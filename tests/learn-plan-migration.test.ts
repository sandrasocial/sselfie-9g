import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("suite learning plan migration", () => {
  it("stores the same text user ids used by the users table and repairs the released bigint column", () => {
    const migration = readFileSync(
      "migrations/20260718_suite_learning_plans.sql",
      "utf8"
    )

    expect(migration).toMatch(/user_id\s+TEXT\s+PRIMARY KEY/i)
    expect(migration).toMatch(/ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT/i)
  })
})
