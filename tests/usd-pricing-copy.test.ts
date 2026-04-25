// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

describe("usd pricing copy", () => {
  it("keeps active strategy upsells aligned to current offers", () => {
    const upsellContents = fs.readFileSync(
      path.join(ROOT, "components/strategy/brand-strategy-pack-upsell.tsx"),
      "utf8",
    )
    const strategyPageContents = fs.readFileSync(path.join(ROOT, "app/strategy/[token]/page.tsx"), "utf8")

    expect(upsellContents).toContain("Get your Brand Strategy Pack instantly — $19")
    expect(upsellContents).not.toContain("Join Studio — $97/month")
    expect(strategyPageContents).toContain("Book the Private Offer")
    expect(strategyPageContents).toContain("Try Feed Planner first")
    expect(strategyPageContents).not.toContain("Join Studio — €97/month")
  })

  it("keeps nurture and freebie strategy membership copy on dollars", () => {
    const freebieStrategyEmail = fs.readFileSync(
      path.join(ROOT, "lib/email/templates/freebie-strategy-email.ts"),
      "utf8",
    )
    const nurtureN3 = fs.readFileSync(path.join(ROOT, "lib/email/templates/nurture-strategy-n3.ts"), "utf8")
    const nurtureN4 = fs.readFileSync(path.join(ROOT, "lib/email/templates/nurture-strategy-n4.ts"), "utf8")

    expect(freebieStrategyEmail).toContain("Join Studio — $97/month")
    expect(freebieStrategyEmail).not.toContain("Join Studio — €97/month")
    expect(nurtureN3).toContain("/checkout/membership")
    expect(nurtureN3).not.toContain("EUR 97/month")
    expect(nurtureN4).toContain("/checkout/membership")
    expect(nurtureN4).not.toContain("EUR 97/month")
    expect(nurtureN3).not.toContain("€97")
    expect(nurtureN4).not.toContain("€97")
  })
})
