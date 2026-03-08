// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

describe("monthly usage recap wiring", () => {
  it("keeps monthly usage recap metadata in config for restoration", () => {
    const config = fs.readFileSync(path.join(ROOT, "lib/email/config.ts"), "utf8")
    const catalog = fs.readFileSync(path.join(ROOT, "lib/email/marketing-template-catalog.ts"), "utf8")
    expect(config).toContain("monthlyUsageRecap")
    expect(catalog).toContain("monthly-usage-recap")
  })

  it("archives the monthly usage recap route outside the live app tree", () => {
    const routePath = path.join(ROOT, "archived/email/cron/monthly-usage-recap/route.ts")
    expect(fs.existsSync(routePath)).toBe(true)
  })
})
