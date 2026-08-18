import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8")

describe("Work With Me client home", () => {
  it("sends a paid buyer to the private six-week intake", () => {
    const handler = read("lib/payments/handlers/work-with-me.ts")
    const publicAccount = read("lib/payments/public-checkout-account.ts")
    const lifecycle = read("lib/payments/lifecycle/checkout-session-completed.ts")
    const success = read("components/checkout/success-content.tsx")

    for (const source of [handler, publicAccount, lifecycle, success]) {
      expect(source).toContain("/work-with-me/welcome")
    }
    expect(handler).toContain('productId: "work_with_me"')
    expect(handler).toContain("upsertPaidWorkWithMeProject")
  })

  it("keeps access private and captures the Business Brain intake", () => {
    const page = read("app/work-with-me/welcome/page.tsx")
    const route = read("app/api/work-with-me/client/route.ts")
    const home = read("components/work-with-me/client-home.tsx")

    expect(page).toContain("hasWorkWithMeAccess")
    expect(route).toContain("Work With Me access required")
    expect(route).toContain("work_with_me_intake_completed")
    expect(home).toContain("Your Business Brain")
    expect(home).toContain("What work in your business keeps coming back to you?")
    expect(home).toContain("what would you hand over first?")
    expect(home).toContain("What have you tried with AI")
    expect(home).toContain("Book your kickoff call")
  })

  it("locks the six-week delivery promise and the two-client quality gate", () => {
    const delivery = read("docs/business/WORK_WITH_ME_PERSONAL_AI_TEAM_DELIVERY_2026-08-18.md")
    const kernel = read("docs/business/SSELFIE_COMPANY_KERNEL_2026-07-16.md")

    expect(delivery).toContain("Capacity gate: accept two cleared buyers")
    expect(delivery).toContain("three personal AI roles")
    expect(delivery).toContain("three repeatable workflows")
    expect(delivery).toContain("### Week 6: Handover")
    expect(delivery).toContain("No agent may expand the promise")
    expect(kernel).toContain("PRIVATE FOUNDING VALIDATION")
    expect(kernel).toContain("Validate two paid clients")
  })
})
