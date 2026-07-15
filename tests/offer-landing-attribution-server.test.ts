import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { classifyOfferRequest } from "@/lib/analytics/offer-request"

const ROOT = process.cwd()

describe("offer landing request attribution", () => {
  it("records server requests separately from confirmed browser views", () => {
    const page = readFileSync(join(ROOT, "app/one-selfie/page.tsx"), "utf8")
    const landing = readFileSync(
      join(ROOT, "components/one-selfie/one-selfie-landing.tsx"),
      "utf8",
    )
    const contract = readFileSync(join(ROOT, "lib/analytics/event-contract.ts"), "utf8")

    expect(contract).toContain('"offer_landing_request"')
    expect(page).toContain("trackOfferLandingRequest")
    expect(landing).toContain("<PublicOfferTracker")
  })

  it("marks prefetch and known crawler requests as suspected automation", () => {
    expect(
      classifyOfferRequest({
        userAgent: "Mozilla/5.0",
        purpose: "prefetch",
        nextRouterPrefetch: null,
      }),
    ).toEqual({ suspectedAutomation: true, automationReason: "prefetch_header" })

    expect(
      classifyOfferRequest({
        userAgent: "Googlebot/2.1",
        purpose: null,
        nextRouterPrefetch: null,
      }),
    ).toEqual({ suspectedAutomation: true, automationReason: "known_crawler" })
  })

  it("keeps normal browser requests as unclassified human-capable traffic", () => {
    expect(
      classifyOfferRequest({
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
        purpose: null,
        nextRouterPrefetch: null,
      }),
    ).toEqual({ suspectedAutomation: false, automationReason: null })
  })
})
