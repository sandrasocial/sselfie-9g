// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

describe("offer attribution semantics", () => {
  it("does not auto-fire keyword attribution on offer page view", () => {
    const tracker = fs.readFileSync(
      path.join(ROOT, "components/analytics/public-offer-tracker.tsx"),
      "utf8",
    )

    expect(tracker).toContain('event: "offer_landing_view"')
    expect(tracker).toContain("export function trackPostKeywordAttributed")
    expect(tracker).toContain("if (!input.ctaKeyword) return")
  })

  it("tracks offer CTA clicks from offer landing page", () => {
    const offerLanding = fs.readFileSync(
      path.join(ROOT, "components/sselfie/offer-landing-page.tsx"),
      "utf8",
    )

    expect(offerLanding).toContain("trackOfferCtaClick({")
    expect(offerLanding).toContain("trackPostKeywordAttributed({")
  })

  it("tracks quiz result CTA clicks and keyword attribution on click", () => {
    const quizResults = fs.readFileSync(
      path.join(ROOT, "app/quiz/post-to-paid/results/page.tsx"),
      "utf8",
    )

    expect(quizResults).toContain("trackOfferCtaClick({")
    expect(quizResults).toContain("trackPostKeywordAttributed({")
    expect(quizResults).toContain('source: "post_to_paid_quiz"')
  })
})
