// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()
// WEBHOOK-01: fulfillment lives in the webhook route + the extracted lib/payments modules.
// The guarantees below must hold across ALL of them.
const WEBHOOK_SOURCE_PATHS = [
  "app/api/webhooks/stripe/route.ts",
  ...fs.readdirSync(path.join(ROOT, "lib/payments/handlers")).map((f) => `lib/payments/handlers/${f}`),
  ...fs.readdirSync(path.join(ROOT, "lib/payments/lifecycle")).map((f) => `lib/payments/lifecycle/${f}`),
  "lib/payments/shared.ts",
]

function allContents(): string {
  return WEBHOOK_SOURCE_PATHS.map((p) => fs.readFileSync(path.join(ROOT, p), "utf8")).join("\n")
}

describe("stripe webhook purchase analytics path", () => {
  it("does not call browser-only analytics helper from server webhook code", () => {
    const contents = allContents()

    expect(contents).not.toContain('import("@/lib/analytics")')
    expect(contents).not.toContain("trackPurchase(")
  })

  it("uses server-safe analytics event logging", () => {
    const contents = allContents()

    expect(contents).toContain('from "@/lib/analytics/events"')
    expect(contents).toContain('eventName: "purchase"')
  })
})
