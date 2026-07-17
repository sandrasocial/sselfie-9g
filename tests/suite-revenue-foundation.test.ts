import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("SUITE revenue foundation", () => {
  it("measures the membership page and all three checkout decisions", () => {
    const marketing = readFileSync("components/sselfie/public-marketing.tsx", "utf8")

    expect(marketing).toContain('event: "studio_membership_page_view"')
    expect(marketing).toContain('event: "studio_membership_page_cta_click"')
    expect(marketing).toContain('environment: analyticsEnvironment')
    expect(marketing).toContain('trackMembershipCheckoutClick("hero"')
    expect(marketing).toContain('trackMembershipCheckoutClick("pricing"')
    expect(marketing).toContain('trackMembershipCheckoutClick("closing"')
  })

  it("keeps the homepage focused on one free entry and one recurring offer", () => {
    const marketing = readFileSync("components/sselfie/public-marketing.tsx", "utf8")
    const homepage = marketing.slice(
      marketing.indexOf("export function HomePageContent"),
      marketing.indexOf("export function StarterKitPageContent"),
    )

    expect(homepage).toContain("Start free")
    expect(homepage).toContain("Ready for help every week?")
    expect(homepage).toContain("Meet Maya inside SSELFIE SUITE")
    expect(homepage).not.toContain("xl:grid-cols-4")
  })

  it("uses the newest Vault direction with face-safe grid crops", () => {
    const walkthrough = readFileSync(
      "components/sselfie/suite-product-walkthrough.tsx",
      "utf8",
    )

    expect(walkthrough).toContain("mysterious-vogue-shot-3.png")
    expect(walkthrough).toContain("noir-femme-shot-9.png")
    expect(walkthrough).toContain("objectPosition")
    expect(walkthrough).not.toContain("clean-girl-morning-shot")
    expect(walkthrough).not.toContain("quiet-luxury-london-shot")
  })

  it("gives the membership page its own search and sharing contract", () => {
    const page = readFileSync("app/join/studio/page.tsx", "utf8")

    expect(page).toContain('canonical: "https://www.sselfie.ai/join/studio"')
    expect(page).toContain("openGraph")
    expect(page).toContain("twitter")
    expect(page).toContain('"@type": "SoftwareApplication"')
    expect(page).toContain('offers: {')
    expect(page).toContain('price: "97"')
    expect(page).toContain('priceCurrency: "EUR"')
  })

  it("shows plain membership terms before payment", () => {
    const checkout = readFileSync("app/checkout/page.tsx", "utf8")
    const membershipCheckout = readFileSync("app/checkout/membership/page.tsx", "utf8")

    expect(checkout).toContain("€97 billed monthly")
    expect(checkout).toContain("200 credits refill each month")
    expect(checkout).toContain("Access right after payment")
    expect(checkout).toContain("Cancel from your account")
    expect(checkout).toContain('environment: ["sselfie.ai", "www.sselfie.ai"]')
    expect(membershipCheckout).toContain("Maya, Create, Calendar, Learn, and 200 monthly credits")
    expect(membershipCheckout).toContain("€97 billed monthly. Cancel from your account.")
    expect(membershipCheckout).not.toContain("Choose your SUITE path")
  })

  it("reports the live 30-day SUITE journey from source-specific truth", () => {
    const scorecard = readFileSync("lib/admin/revenue-truth-scorecard.ts", "utf8")
    const admin = readFileSync("app/admin/page.tsx", "utf8")

    expect(scorecard).toContain("membershipFunnel30d")
    expect(scorecard).toContain("studio_membership_page_view")
    expect(scorecard).toContain("studio_membership_page_cta_click")
    expect(scorecard).toContain("properties->>'environment' = 'production'")
    expect(scorecard).toContain("checkout_attribution")
    expect(scorecard).toContain("newSubscribers30d")
    expect(admin).toContain("SUITE journey · last 30 days")
    expect(admin).toContain("Page visits")
    expect(admin).toContain("Checkout sessions")
    expect(admin).toContain("Payment forms")
    expect(admin).toContain("New paid members")
    expect(admin).not.toContain("The fixed 48-hour event")
  })
})
