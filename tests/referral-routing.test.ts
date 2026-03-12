import { describe, expect, it } from "vitest"

import {
  appendReferralParam,
  buildReferralCallbackUrl,
  buildReferralLoginHref,
  buildReferralSignUpHref,
  normalizeReferralCode,
  readReferralCodeFromCookie,
} from "@/lib/referrals/routing"

describe("referral routing helpers", () => {
  it("preserves a referral code when building login and signup links", () => {
    expect(buildReferralLoginHref({ returnTo: "/studio", referralCode: "abc123" })).toBe(
      "/auth/login?returnTo=%2Fstudio&ref=ABC123",
    )

    expect(buildReferralSignUpHref({ returnTo: "/studio", referralCode: "abc123" })).toBe(
      "/auth/sign-up?returnTo=%2Fstudio&ref=ABC123",
    )
  })

  it("appends a referral code to existing query strings without overwriting other params", () => {
    expect(appendReferralParam("/auth/login?returnTo=%2Fbrand-strategy-pack", "ref999")).toBe(
      "/auth/login?returnTo=%2Fbrand-strategy-pack&ref=REF999",
    )
  })

  it("builds callback URLs that preserve referral and campaign context", () => {
    expect(
      buildReferralCallbackUrl("https://sselfie.ai", {
        referralCode: " friend25 ",
        utmSource: "coldreactivation",
      }),
    ).toBe("https://sselfie.ai/auth/callback?ref=FRIEND25&utm_source=coldreactivation")
  })

  it("rejects invalid referral codes instead of propagating unsafe values", () => {
    expect(normalizeReferralCode("bad-code!!")).toBeNull()
    expect(appendReferralParam("/auth/login", "bad-code!!")).toBe("/auth/login")
  })

  it("reads a normalized referral code from cookies for server-side flows", () => {
    expect(readReferralCodeFromCookie("theme=dark; sselfie_referral= friend25 ; Path=/")).toBe("FRIEND25")
    expect(readReferralCodeFromCookie("theme=dark; sselfie_referral=bad-code!!; Path=/")).toBeNull()
  })
})
