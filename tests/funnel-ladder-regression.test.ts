// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8")
}

describe("public funnel ladder regression", () => {
  it("routes cold traffic from the main landing into the Selfie Guide ladder", () => {
    const contents = read("components/sselfie/landing-page-new.tsx")

    expect(contents).toContain('trackSelfieGuideEntryClick("hero")')
    expect(contents).toContain('appendReferralParam("/selfie-guide", referralCode)')
    expect(contents).not.toContain('trackCTAClick("hero", "Try it for free", "/auth/sign-up")')
    expect(contents).not.toContain('href="/checkout/credits"')
    expect(contents).not.toContain("Starter Photoshoot")
    expect(contents).not.toContain("Get 30 Photos")
  })

  it("keeps acquisition mirror pages aligned to the Selfie Guide -> Studio ladder", () => {
    const bioContents = read("app/bio/page.tsx")
    const whyStudioContents = read("app/why-studio/page.tsx")

    expect(bioContents).toContain('redirect("/selfie-guide")')

    expect(whyStudioContents).toContain('href="/selfie-guide"')
    expect(whyStudioContents).toContain("Selfie Guide")
    expect(whyStudioContents).not.toContain("Starter Photoshoot")
  })

  it("keeps Paid Blueprint standalone without claiming the free blueprint is required", () => {
    const blueprintContents = read("components/paid-blueprint/paid-blueprint-landing.tsx")

    expect(blueprintContents).not.toContain("Do I need the free blueprint first?")
    expect(blueprintContents).not.toContain("Yes. The free blueprint helps us")
  })

  it("uses session-aware guide access and product-specific Studio upsells on checkout success", () => {
    const successPageContents = read("app/checkout/success/page.tsx")
    const successContents = read("components/checkout/success-content.tsx")

    expect(successPageContents).toContain("session_id?: string")
    expect(successPageContents).toContain("sessionId={params.session_id}")

    expect(successContents).toContain("sessionId?: string")
    expect(successContents).toContain("/api/selfie-guide/access-token?session_id=")
    expect(successContents).not.toContain("if (user && isSelfieGuidePurchase)")
    expect(successContents).toContain("brand_strategy_pack_studio_click")
    expect(successContents).toContain("one_time_session_studio_click")
  })
})
