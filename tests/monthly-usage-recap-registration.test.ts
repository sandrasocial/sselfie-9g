// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

describe("monthly usage recap wiring", () => {
  it("keeps only the active onboarding segments in the live config", () => {
    const config = fs.readFileSync(path.join(ROOT, "lib/email/config.ts"), "utf8")
    const catalog = fs.readFileSync(path.join(ROOT, "lib/email/marketing-template-catalog.ts"), "utf8")
    expect(config).toContain("onboardingDay0")
    expect(config).toContain("onboardingDay2")
    expect(config).toContain("onboardingDay7")
    expect(config).not.toContain("monthlyUsageRecap")
    expect(catalog).toContain("monthly-usage-recap")
  })

  it("archives the monthly usage recap route outside the live app tree", () => {
    const routePath = path.join(ROOT, "archived/email/cron/monthly-usage-recap/route.ts")
    expect(fs.existsSync(routePath)).toBe(true)
  })
})
