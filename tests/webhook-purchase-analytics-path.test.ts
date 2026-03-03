// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()
const WEBHOOK_ROUTE_PATH = "app/api/webhooks/stripe/route.ts"

describe("stripe webhook purchase analytics path", () => {
  it("does not call browser-only analytics helper from server webhook code", () => {
    const contents = fs.readFileSync(path.join(ROOT, WEBHOOK_ROUTE_PATH), "utf8")

    expect(contents).not.toContain('import("@/lib/analytics")')
    expect(contents).not.toContain("trackPurchase(")
  })

  it("uses server-safe analytics event logging", () => {
    const contents = fs.readFileSync(path.join(ROOT, WEBHOOK_ROUTE_PATH), "utf8")

    expect(contents).toContain('from "@/lib/analytics/events"')
    expect(contents).toContain('eventName: "purchase"')
  })
})
