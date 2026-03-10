// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

describe("public offer checkout paths", () => {
  it("keeps brand strategy pack guest-safe while preserving direct checkout", () => {
    const checkoutContents = fs.readFileSync(path.join(ROOT, "app/checkout/brand-strategy-pack/page.tsx"), "utf8")

    expect(checkoutContents).toContain('createLandingCheckoutSession("brand_strategy_pack"')
    expect(checkoutContents).toContain('startProductCheckoutSession("brand_strategy_pack"')
    expect(checkoutContents).not.toContain("/auth/login?returnTo=")
  })

  it("points the brand strategy upsell straight to membership checkout", () => {
    const upsellContents = fs.readFileSync(
      path.join(ROOT, "components/strategy/brand-strategy-pack-upsell.tsx"),
      "utf8",
    )

    expect(upsellContents).toContain('href="/checkout/membership"')
    expect(upsellContents).not.toContain("auth/sign-up?checkout=studio_membership")
  })

  it("points the strategy results upsell straight to membership checkout", () => {
    const strategyPageContents = fs.readFileSync(path.join(ROOT, "app/strategy/[token]/page.tsx"), "utf8")

    expect(strategyPageContents).toContain('href="https://sselfie.ai/checkout/membership"')
    expect(strategyPageContents).not.toContain("auth/sign-up?checkout=studio_membership")
  })

  it("keeps membership on the direct landing checkout path", () => {
    const membershipContents = fs.readFileSync(path.join(ROOT, "app/checkout/membership/page.tsx"), "utf8")

    expect(membershipContents).toContain('createLandingCheckoutSession("sselfie_studio_membership"')
    expect(membershipContents).toContain('if (error?.digest?.startsWith("NEXT_REDIRECT"))')
  })

  it("rethrows Next redirect errors for direct checkout pages", () => {
    const membershipContents = fs.readFileSync(path.join(ROOT, "app/checkout/membership/page.tsx"), "utf8")
    const oneTimeContents = fs.readFileSync(path.join(ROOT, "app/checkout/one-time/page.tsx"), "utf8")

    expect(membershipContents).toContain('if (error?.digest?.startsWith("NEXT_REDIRECT"))')
    expect(oneTimeContents).toContain('if (error?.digest?.startsWith("NEXT_REDIRECT"))')
  })
})
