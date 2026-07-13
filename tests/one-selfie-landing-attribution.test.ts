// @vitest-environment node
import { describe, expect, it } from "vitest"

import {
  buildOneSelfieCheckoutHref,
  buildOneSelfieExpiredFallbackHref,
} from "@/components/one-selfie/attribution"

describe("One Selfie landing attribution", () => {
  it("preserves campaign attribution into the bundle checkout", () => {
    const href = buildOneSelfieCheckoutHref({
      source: "manychat_bundle",
      utm_source: "instagram",
      utm_medium: "manychat",
      utm_campaign: "one_selfie_visibility_48h",
      utm_content: "bundle_keyword",
      cta_keyword: "bundle",
      entry_post_slug: "one-selfie-reel",
      checkout: "failed",
    })
    const url = new URL(href, "https://sselfie.ai")

    expect(url.pathname).toBe("/checkout/one-selfie")
    expect(url.searchParams.get("source")).toBe("manychat_bundle")
    expect(url.searchParams.get("utm_source")).toBe("instagram")
    expect(url.searchParams.get("utm_medium")).toBe("manychat")
    expect(url.searchParams.get("utm_campaign")).toBe("one_selfie_visibility_48h")
    expect(url.searchParams.get("utm_content")).toBe("bundle_keyword")
    expect(url.searchParams.get("cta_keyword")).toBe("BUNDLE")
    expect(url.searchParams.get("entry_post_slug")).toBe("one-selfie-reel")
    expect(url.searchParams.get("offer_slug")).toBe("one-selfie-visibility-bundle")
    expect(url.searchParams.get("checkout_source")).toBe("one_selfie_landing")
    expect(url.searchParams.get("entry_path")).toBe("/one-selfie")
    expect(url.searchParams.has("checkout")).toBe(false)
  })

  it("uses honest direct defaults when no attribution exists", () => {
    const url = new URL(buildOneSelfieCheckoutHref({}), "https://sselfie.ai")

    expect(url.searchParams.get("source")).toBe("one_selfie_landing")
    expect(url.searchParams.get("utm_source")).toBe("site")
    expect(url.searchParams.get("utm_medium")).toBe("sales_page")
    expect(url.searchParams.get("utm_campaign")).toBe(
      "one_selfie_visibility_48h",
    )
    expect(url.searchParams.get("cta_keyword")).toBe("BUNDLE")
  })

  it("routes a closed offer to the Starter Kit with explicit fallback attribution", () => {
    const href = buildOneSelfieExpiredFallbackHref({
      utm_source: "instagram",
      utm_medium: "story",
      utm_campaign: "one_selfie_visibility_48h",
      utm_content: "last_call",
      cta_keyword: "BUNDLE",
    })
    const url = new URL(href, "https://sselfie.ai")

    expect(url.pathname).toBe("/checkout/starter-kit")
    expect(url.searchParams.get("source")).toBe("one_selfie_expired_fallback")
    expect(url.searchParams.get("offer_slug")).toBe("starter-kit")
    expect(url.searchParams.get("utm_source")).toBe("instagram")
    expect(url.searchParams.get("utm_medium")).toBe("story")
    expect(url.searchParams.get("utm_content")).toBe("expired_offer_fallback")
    expect(url.searchParams.get("checkout_source")).toBe(
      "one_selfie_expired_fallback",
    )
    expect(url.searchParams.get("buyer_stage")).toBe("micro")
  })
})
