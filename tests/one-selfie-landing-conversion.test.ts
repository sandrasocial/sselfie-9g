// @vitest-environment node

import { readFileSync } from "node:fs"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { OneSelfieLanding } from "@/components/one-selfie/one-selfie-landing"

const landing = readFileSync("components/one-selfie/one-selfie-landing.tsx", "utf8")

describe("One Selfie campaign decision page", () => {
  it("leads with the usable outcome and one exact price CTA", () => {
    expect(landing).toContain("Photos and content you can finally use.")
    expect(landing).toContain(
      "Take it better. Edit it. Turn it into realistic AI photos. Then know what to post next."
    )
    expect(landing).toContain('"Get the bundle · $97 once"')
    expect(landing).toContain("Nothing renews.")
  })

  it("uses traceable SSELFIE member proof without calling them bundle buyers", () => {
    expect(landing).toContain("What SSELFIE members have said")
    expect(landing).toContain("I just took the best photo of myself in years.")
    expect(landing).toContain("Best one so far. I love that it looks real, and me.")
    expect(landing).not.toContain("One Selfie Bundle buyers")
  })

  it("connects the immediate photo result to Sandra's wider reason", () => {
    expect(landing).toContain(
      "This was never just about selfies. It was about becoming visible enough to build something of your own."
    )
  })

  it("explains the 200-credit allowance before checkout", () => {
    expect(landing).toContain("What are the 200 credits?")
    expect(landing).toContain("A standard image uses one credit")
  })

  it("uses the bundle-specific product mockup instead of the Starter Kit visual", () => {
    expect(landing).toContain('/images/one-selfie/bundle-products-mockup-v2.webp')
    expect(landing).not.toContain('/images/starter-kit/mockup-2.png')
  })

  it("uses the same focused cinematic design language as the SSELFIE homepage and SUITE", () => {
    expect(landing).toContain('data-testid="one-selfie-campaign-header"')
    expect(landing).toContain('data-testid="one-selfie-campaign-hero"')
    expect(landing).toContain('data-testid="one-selfie-closing-cta"')
    expect(landing).toContain('/academy/visibility-suite/sandra-hero.png')
    expect(landing).toContain('text-[clamp(36px,7vw,70px)]')
    expect(landing).toContain('max-w-6xl')
    expect(landing).toContain('rounded-none')
    expect(landing).not.toContain('max-w-[1440px]')
    expect(landing).not.toContain('rounded-[4px]')
  })

  it("shows a dedicated honest page after close instead of mixing two offers", () => {
    const html = renderToStaticMarkup(
      createElement(OneSelfieLanding, {
        checkoutHref: "/checkout/one-selfie",
        checkoutFailed: false,
        closesAt: "2026-07-15T16:00:00.000Z",
        hasInboundKeyword: true,
        keyword: "BUNDLE",
        opensAt: "2026-07-13T16:00:00.000Z",
        serverNow: "2026-07-15T16:01:00.000Z",
        source: "manychat_bundle",
        starterKitHref: "/checkout/starter-kit?source=one_selfie_expired_fallback",
      }),
    )

    expect(html).toContain("This bundle is now closed")
    expect(html).toContain("See the Starter Kit · $37")
    expect(html).toContain("does not include the bundle&#x27;s extra courses")
    expect(html).not.toContain("Lifetime tools plus 30 days of SUITE")
    expect(html).not.toContain("Get the bundle · $97 once")
  })
})
