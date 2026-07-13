import { describe, expect, it } from "vitest"
import {
  generateOneSelfieVisibilityInsideEmail,
  generateOneSelfieVisibilityLastCallEmail,
  generateOneSelfieVisibilityOpenEmail,
} from "@/lib/email/templates/one-selfie-visibility-launch"

describe("One Selfie Visibility launch emails", () => {
  const templates = [
    generateOneSelfieVisibilityOpenEmail,
    generateOneSelfieVisibilityInsideEmail,
    generateOneSelfieVisibilityLastCallEmail,
  ]

  it.each(templates)("keeps the commercial promise exact and fully attributed", (generate) => {
    const email = generate({ firstName: "Sandra", recipientEmail: "sandra@example.com" })

    expect(email.subject).toBeTruthy()
    expect(email.html).toContain("$97")
    expect(email.text).toContain("$97")
    expect(email.text).toContain("30")
    expect(email.text).toContain("automatically")
    expect(email.text).toContain("Nothing renews")
    expect(email.text).toContain("do not need this bundle")
    expect(email.html).toContain("utm_campaign=one_selfie_visibility_48h")
    expect(email.html).toContain("utm_medium=launch")
    expect(email.html).toContain("checkout_email=sandra%40example.com")
    expect(email.html).toContain("RESEND_UNSUBSCRIBE_URL")
    expect(email.text).toContain("SSELFIE Studio, Fauskevegen 121")
    expect(email.html).not.toContain("€697")
    expect(email.text.toLowerCase()).not.toContain("founding")
  })

  it("states the honest separately purchased value only in the opening email", () => {
    const email = generateOneSelfieVisibilityOpenEmail({ firstName: "Sandra" })

    expect(email.text).toContain("$260 separately")
    expect(email.text).toContain("Wednesday, July 15 at 6:00 PM Oslo time")
  })

  it("does not use a rolling or vague deadline in the last call", () => {
    const email = generateOneSelfieVisibilityLastCallEmail({ firstName: "Sandra" })

    expect(email.text).toContain("today at 6:00 PM Oslo time")
    expect(email.text).toContain("won't quietly reset the clock")
    expect(email.text).not.toContain("limited spots")
  })

  it("tells existing bundle buyers not to purchase again in both follow-ups", () => {
    for (const generate of [
      generateOneSelfieVisibilityInsideEmail,
      generateOneSelfieVisibilityLastCallEmail,
    ]) {
      const email = generate({ firstName: "Sandra" })
      expect(email.text).toContain("Already joined? You're done")
      expect(email.text).toContain("Please don't buy it again")
    }
  })

  it("makes the middle email proof-first and keeps the wider message honest", () => {
    const email = generateOneSelfieVisibilityInsideEmail({ firstName: "Sandra" })

    expect(email.subject).toBe("the best photo of herself in years")
    expect(email.text).toContain("I just took the best photo of myself in years.")
    expect(email.text).toContain("Best one so far. I love that it looks real, and me.")
    expect(email.text).toContain(
      "This was never just about selfies. It was about becoming visible enough to build something of your own."
    )
  })

  it("uses a factual last call instead of narrating sales psychology", () => {
    const email = generateOneSelfieVisibilityLastCallEmail({ firstName: "Sandra" })

    expect(email.text).toContain("Just one last note.")
    expect(email.text).toContain("No new checkout can start after 6:00 PM")
    expect(email.text).toContain("you get a short payment window to finish")
    expect(email.text).not.toContain("manufacture drama")
  })
})
