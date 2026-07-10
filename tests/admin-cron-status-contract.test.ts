// @vitest-environment node
import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"

describe("admin cron status schema contract", () => {
  it("allows the running status written by CronLogger.start", async () => {
    const migration = await readFile(
      new URL("../db/migrations/68-stabilize-founder-admin.sql", import.meta.url),
      "utf8",
    )

    expect(migration).toContain("'running'")
    expect(migration).toContain("admin_cron_runs_status_check")
  })
})
