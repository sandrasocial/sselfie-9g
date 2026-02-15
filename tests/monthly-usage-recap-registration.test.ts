// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

describe("monthly usage recap wiring", () => {
  it("registers monthly usage recap in template catalog and config", () => {
    const config = fs.readFileSync(path.join(ROOT, "lib/email/config.ts"), "utf8")
    const catalog = fs.readFileSync(path.join(ROOT, "lib/email/marketing-template-catalog.ts"), "utf8")
    expect(config).toContain("monthlyUsageRecap")
    expect(catalog).toContain("monthly-usage-recap")
  })

  it("adds monthly usage recap route to vercel crons", () => {
    const vercel = fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8")
    expect(vercel).toContain("/api/cron/monthly-usage-recap")
  })
})
