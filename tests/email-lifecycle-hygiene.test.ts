// @vitest-environment node

import { describe, expect, it } from "vitest"

import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { STARTER_KIT_EMAIL_TOUCHES } from "@/lib/email/starter-kit-email-sequence"
import { generateFreebieGuideDay1LightTipEmail } from "@/lib/email/templates/freebie-guide-day1-light-tip"
import { generateWinback4Email } from "@/lib/email/templates/subscriber-winback"

describe("2026 lifecycle email hygiene", () => {
  it("uses a real first name when supplied", () => {
    expect(
      getFirstNameForEmail({
        fullName: "Sandra Sigurjonsdottir",
        email: "sandra@example.com",
      })
    ).toBe("Sandra")
  })

  it("does not guess or reuse a name from an email address", () => {
    expect(getFirstNameForEmail({ email: "firstname.lastname@example.com" })).toBe("there")
    expect(
      getFirstNameForEmail({
        fullName: "firstname.lastname",
        email: "firstname.lastname@example.com",
      })
    ).toBe("there")
    expect(getFirstNameForEmail({ email: "hello@example.com", fallback: "Lovely" })).toBe("Lovely")
  })

  it("keeps Selfie Guide day 1 focused on activation instead of a sale", () => {
    const accessUrl = "https://www.sselfie.ai/selfie-guide/access/example"
    const email = generateFreebieGuideDay1LightTipEmail({
      firstName: "Sandra",
      recipientEmail: "sandra@example.com",
      accessUrl,
    })

    expect(email.subject).toBe("one light fix before your next selfie")
    expect(email.text).toContain(accessUrl)
    expect(email.text).toContain("one photo that looks better than the last one")
    expect(email.text).not.toContain("$37")
    expect(email.text).not.toContain("/checkout/")
  })

  it("requires an explicit click to stay in the subscriber winback flow", () => {
    const email = generateWinback4Email({
      firstName: "Sandra",
      recipientEmail: "sandra@example.com",
    })

    expect(email.subject).toBe("should I stop emailing you?")
    expect(email.text).toContain("That click tells me you still want SSELFIE emails")
    expect(email.text).not.toContain("open or click")
    expect(email.text).not.toContain("checkout_email=")
  })

  it("keeps the active Starter Kit lifecycle focused on customer success", () => {
    const activeTypes = STARTER_KIT_EMAIL_TOUCHES.map(touch => touch.emailType)

    expect(activeTypes).toEqual([
      "starter-kit-day0-delivery",
      "starter-kit-day1-quick-win",
      "starter-kit-day3-story",
      "starter-kit-day5-proof",
    ])
    expect(activeTypes).not.toContain("starter-kit-day14-masterclass-offer")
    expect(activeTypes).not.toContain("starter-kit-day7-soft-masterclass")
    expect(activeTypes).not.toContain("starter-kit-day10-masterclass-breakdown")
  })
})
