// @vitest-environment node
import { readFileSync } from "fs"
import path from "path"

import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function read(relativePath: string) {
  return readFileSync(path.join(ROOT, relativePath), "utf8")
}

describe("Stripe webhook subscription period compatibility", () => {
  it("does not read legacy-only subscription period fields in inline checkout branches", () => {
    const routeSource = read("app/api/webhooks/stripe/route.ts")

    expect(routeSource).not.toMatch(/subscriptionData\.current_period_(start|end)/)
    expect(routeSource).toContain("getSubscriptionPeriod(subscriptionData)")
  })

  it("keeps the Basil/Clover item-level period fallback in shared payment code", () => {
    const sharedSource = read("lib/payments/shared.ts")

    expect(sharedSource).toContain("export function getSubscriptionPeriod")
    expect(sharedSource).toContain("sub?.current_period_start ?? item?.current_period_start ?? null")
    expect(sharedSource).toContain("sub?.current_period_end ?? item?.current_period_end ?? null")
  })
})
