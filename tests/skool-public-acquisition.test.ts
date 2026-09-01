// @vitest-environment node
import { readFileSync } from "node:fs"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  SKOOL_PUBLIC_MEMBERSHIP_URL,
  resolvePublicMembershipAcquisitionHref,
} from "@/lib/skool/public-acquisition"

describe("public Skool acquisition cutover", () => {
  const legacyHref = "/checkout/membership?interval=month&source=studio_page"
  const originalFlag = process.env.NEXT_PUBLIC_SKOOL_PUBLIC_ACQUISITION_ENABLED

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SKOOL_PUBLIC_ACQUISITION_ENABLED
  })

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.NEXT_PUBLIC_SKOOL_PUBLIC_ACQUISITION_ENABLED
    } else {
      process.env.NEXT_PUBLIC_SKOOL_PUBLIC_ACQUISITION_ENABLED = originalFlag
    }
  })

  it("preserves the current public checkout while the flag is off or absent", () => {
    expect(resolvePublicMembershipAcquisitionHref({ legacyHref })).toBe(legacyHref)
    expect(resolvePublicMembershipAcquisitionHref({ legacyHref, enabled: "false" })).toBe(
      legacyHref,
    )
  })

  it("routes enabled public acquisition to the exact approved Skool URL", () => {
    process.env.NEXT_PUBLIC_SKOOL_PUBLIC_ACQUISITION_ENABLED = "true"
    expect(resolvePublicMembershipAcquisitionHref({ legacyHref })).toBe(
      SKOOL_PUBLIC_MEMBERSHIP_URL,
    )
    expect(SKOOL_PUBLIC_MEMBERSHIP_URL).toBe(
      "https://www.skool.com/sselfie-photo-club-2569/about",
    )
  })

  it("keeps the protected legacy Stripe checkout implementation reachable", () => {
    const checkout = readFileSync("app/checkout/membership/page.tsx", "utf8")
    const publicPage = readFileSync("components/sselfie/public-marketing.tsx", "utf8")

    expect(checkout).toContain("createLandingCheckoutSession")
    expect(checkout).not.toContain("resolvePublicMembershipAcquisitionHref")
    expect(checkout).not.toContain(SKOOL_PUBLIC_MEMBERSHIP_URL)
    expect(publicPage).toContain("resolvePublicMembershipAcquisitionHref")
  })

  it("redirects the legacy public Suite landing to Skool only when launch acquisition is enabled", () => {
    const joinPage = readFileSync("app/join/studio/page.tsx", "utf8")

    expect(joinPage).toContain("isSkoolPublicAcquisitionEnabled()")
    expect(joinPage).toContain("redirect(SKOOL_PUBLIC_MEMBERSHIP_URL)")
    expect(joinPage).toContain("<StudioPageContent")
  })
})
