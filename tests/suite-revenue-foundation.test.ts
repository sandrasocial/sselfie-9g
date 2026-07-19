import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("SUITE revenue foundation", () => {
  it("measures the membership page and all three checkout decisions", () => {
    const marketing = readFileSync("components/sselfie/public-marketing.tsx", "utf8")

    expect(marketing).toContain('event: "studio_membership_page_view"')
    expect(marketing).toContain('event: "studio_membership_page_cta_click"')
    expect(marketing).toContain("environment: analyticsEnvironment")
    expect(marketing).toContain('trackMembershipCheckoutClick("hero"')
    expect(marketing).toContain('trackMembershipCheckoutClick("pricing"')
    expect(marketing).toContain('trackMembershipCheckoutClick("closing"')
  })

  it("keeps the homepage focused on one free entry and one recurring offer", () => {
    const marketing = readFileSync("components/sselfie/public-marketing.tsx", "utf8")
    const homepage = marketing.slice(
      marketing.indexOf("export function HomePageContent"),
      marketing.indexOf("export function StarterKitPageContent")
    )

    expect(homepage).toContain("Start free")
    expect(homepage).toContain("Ready for help every week?")
    expect(homepage).toContain("Meet Maya inside SSELFIE SUITE")
    expect(homepage).not.toContain("xl:grid-cols-4")
  })

  it("uses the approved personal-brand grid and the live Maya avatar", () => {
    const walkthrough = readFileSync("components/sselfie/suite-product-walkthrough.tsx", "utf8")

    expect(walkthrough.match(/\/images\/suite-personal-brand-grid\//g)).toHaveLength(9)
    expect(walkthrough).toContain("post-01-founder-black.jpg")
    expect(walkthrough).toContain("post-09-chair-gown.jpg")
    expect(walkthrough).toContain("/images/ai-prompts/clean-girl-morning-shot-1.jpg")
    expect(walkthrough).not.toContain("mysterious-vogue-shot")
    expect(walkthrough).not.toContain("noir-femme-shot")

    for (const filename of [
      "post-01-founder-black.jpg",
      "post-02-black-jumpsuit.jpg",
      "post-03-white-flowing.jpg",
      "post-04-creative-director.jpg",
      "post-05-black-halter.jpg",
      "post-06-phone-flatlay.jpg",
      "post-07-white-wrap.jpg",
      "post-08-laptop-grid.jpg",
      "post-09-chair-gown.jpg",
    ]) {
      expect(existsSync(`public/images/suite-personal-brand-grid/${filename}`)).toBe(true)
    }
  })

  it("shows one honest Maya campaign across carousel, Stories, and motion", () => {
    const walkthrough = readFileSync("components/sselfie/suite-multiformat-walkthrough.tsx", "utf8")

    expect(walkthrough).toContain("data-mockup-scene={scene}")
    expect(walkthrough).toContain('scene="carousel"')
    expect(walkthrough).toContain('scene="stories"')
    expect(walkthrough).toContain('scene="motion"')
    expect(walkthrough).toContain("This was never just about selfies.")
    expect(walkthrough).toContain("I started with my phone in a tiny bathroom.")
    expect(walkthrough).toContain("Can you make this image move without making it feel fake?")
    expect(walkthrough).toContain("Your B-roll")
    expect(walkthrough).toContain("View all slides")
    expect(walkthrough).toContain("Download video")
    expect(walkthrough).not.toContain("Download all")
    expect(walkthrough).not.toContain("publish automatically")
    expect(walkthrough).not.toContain("full video editor")
    expect(walkthrough.match(/\/images\/ai-prompts\/clean-girl-morning-shot-1\.jpg/g)).toHaveLength(
      1
    )
    expect(existsSync("public/videos/suite-visibility-broll.mp4")).toBe(true)
  })

  it("uses finished baked Maya designs and mobile swipe rails", () => {
    const walkthrough = readFileSync("components/sselfie/suite-multiformat-walkthrough.tsx", "utf8")
    const bakedAssets = [
      "carousel-01-editorial-cover.png",
      "carousel-02-top-minimal.png",
      "carousel-03-cutout-editorial.png",
      "carousel-04-statement.png",
      "carousel-05-lower-third.png",
      "carousel-06-statement.png",
      "carousel-07-series-cover.png",
      "story-01-lower-third.png",
      "story-02-cutout-editorial.png",
      "story-03-top-minimal.png",
      "story-04-statement.png",
      "story-05-editorial-cover.png",
    ]

    expect(walkthrough).toContain('const BAKED_CAMPAIGN_BASE = "/images/suite-baked-campaign"')
    expect(walkthrough).toContain("function BakedArtwork")
    expect(walkthrough.match(/overflow-x-auto/g)).toHaveLength(2)
    expect(walkthrough.match(/snap-x snap-mandatory/g)).toHaveLength(2)
    expect(walkthrough).not.toContain("function CarouselArtwork")
    expect(walkthrough).not.toContain("function StoryArtwork")
    expect(walkthrough).not.toContain("bg-gradient-to-t")

    for (const filename of bakedAssets) {
      expect(walkthrough).toContain(filename)
      expect(existsSync(`public/images/suite-baked-campaign/${filename}`)).toBe(true)
    }
  })

  it("gives the membership page its own search and sharing contract", () => {
    const page = readFileSync("app/join/studio/page.tsx", "utf8")

    expect(page).toContain('canonical: "https://www.sselfie.ai/join/studio"')
    expect(page).toContain("openGraph")
    expect(page).toContain("twitter")
    expect(page).toContain('"@type": "SoftwareApplication"')
    expect(page).toContain("offers: {")
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
    expect(admin).toContain("The fixed 48-hour event")
    expect(admin).toContain("One Selfie · July 13–15")
  })
})
