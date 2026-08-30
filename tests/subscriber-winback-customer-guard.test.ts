// @vitest-environment node

import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const route = fs.readFileSync(
  path.join(process.cwd(), "app/api/cron/subscriber-winback/route.ts"),
  "utf8"
)

describe("subscriber win-back sunset customer guard", () => {
  it("rechecks money and current membership access immediately before suppression", () => {
    const guard = route.indexOf("hasCurrentCustomerOrMembershipAccess(candidate.email)")
    const providerUpdate = route.indexOf("updateContactTags(candidate.email")
    const finalGuard = route.indexOf(
      "hasCurrentCustomerOrMembershipAccess(candidate.email)",
      providerUpdate
    )
    const unsubscribe = route.indexOf("recordSunsetUnsubscribe(candidate.email)")

    expect(guard).toBeGreaterThanOrEqual(0)
    expect(providerUpdate).toBeGreaterThan(guard)
    expect(finalGuard).toBeGreaterThan(providerUpdate)
    expect(unsubscribe).toBeGreaterThan(finalGuard)
    expect(unsubscribe).toBeGreaterThan(guard)
    expect(route).toContain("sp.payment_date > NOW() - INTERVAL '90 days'")
    expect(route).toContain("'brand_studio_membership'")
    expect(route).toContain("'pro'")
    expect(route).toContain("s.current_period_end > NOW()")
  })

  it("reports customers skipped during the sunset grace window", () => {
    expect(route).toContain("skippedCustomers")
    expect(route).toContain("results.skippedCustomers += 1")
  })

  it("commits the unsubscribe event and sunset marker atomically", () => {
    const transaction = route.indexOf("await sql.transaction(tx => [")
    const event = route.indexOf("'email.unsubscribed'", transaction)
    const marker = route.indexOf("'subscriber-winback-sunset-applied'", transaction)

    expect(transaction).toBeGreaterThanOrEqual(0)
    expect(event).toBeGreaterThan(transaction)
    expect(marker).toBeGreaterThan(event)
  })
})
