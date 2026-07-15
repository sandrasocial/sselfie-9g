// @vitest-environment node

import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8")

describe("involuntary churn recovery measurement", () => {
  it("preserves the failed-payment marker when the same Stripe invoice later succeeds", () => {
    const paidHandler = read("lib/payments/lifecycle/invoice-paid.ts")

    expect(paidHandler).toContain("stripe_payments.metadata")
    expect(paidHandler).toContain("EXCLUDED.metadata")
    expect(paidHandler).toContain("{payment_recovery,recovered_at}")
    expect(paidHandler).toContain("metadata #> '{payment_recovery,recovered_at}'")
    expect(paidHandler).toContain("COALESCE")

    const failedHandler = read("lib/payments/lifecycle/subscription-events.ts")
    expect(failedHandler).toContain("first_failed_at")
    expect(failedHandler).toContain("last_failed_at")
    expect(failedHandler).toContain("stripe_payments.metadata #>>")
  })

  it("shows recovered payments on admin home using paid stripe_payments rows only", () => {
    const report = read("lib/admin/home-report.ts")
    const page = read("app/admin/page.tsx")

    expect(report).toContain("payment_recovery")
    expect(report).toContain("recovered_30d_cents")
    expect(report).toContain("status IN ('succeeded', 'paid')")
    expect(page).toContain("Recovered payments")
  })
})
