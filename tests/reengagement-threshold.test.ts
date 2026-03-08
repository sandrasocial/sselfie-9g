// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()
const ROUTE_PATH = "archived/email/cron/reengagement-campaigns/route.ts"

describe("archived reengagement inactivity threshold and overlap guard", () => {
  it("uses 14-day inactivity trigger instead of 30-day trigger", () => {
    const contents = fs.readFileSync(path.join(ROOT, ROUTE_PATH), "utf8")
    expect(contents).toContain("NOW() - INTERVAL '14 days'")
    expect(contents).not.toContain("NOW() - INTERVAL '30 days'")
  })

  it("guards against overlap with recent welcome lifecycle emails", () => {
    const contents = fs.readFileSync(path.join(ROOT, ROUTE_PATH), "utf8")
    expect(contents).toContain("welcome-day-14")
    expect(contents).toContain("welcome-day-21")
    expect(contents).toContain("welcome-day-28")
  })
})
