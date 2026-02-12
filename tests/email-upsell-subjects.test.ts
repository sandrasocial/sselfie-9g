import { describe, expect, it } from "vitest"
import { generateUpsellDay10Email } from "@/lib/email/templates/upsell-day-10"
import { generateUpsellFreebieMembershipEmail } from "@/lib/email/templates/upsell-freebie-membership"

describe("upsell email templates", () => {
  it("returns a non-empty subject for upsell-day-10", () => {
    const content = generateUpsellDay10Email({
      firstName: "Sandra",
      recipientEmail: "sandra@example.com",
    })

    expect(content.subject).toBeTypeOf("string")
    expect(content.subject.trim().length).toBeGreaterThan(0)
  })

  it("returns a non-empty subject for upsell-freebie-membership", () => {
    const content = generateUpsellFreebieMembershipEmail({
      firstName: "Sandra",
      recipientEmail: "sandra@example.com",
    })

    expect(content.subject).toBeTypeOf("string")
    expect(content.subject.trim().length).toBeGreaterThan(0)
  })
})
