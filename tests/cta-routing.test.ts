import { describe, expect, it } from "vitest"

import { getCTALink, getDefaultNoAccountProductType } from "@/lib/email/cta-routing"
import { generateUpsellFreebieMembershipEmail } from "@/lib/email/templates/upsell-freebie-membership"

describe("CTA routing intent split", () => {
  it("defaults no-account users to starter (one-time) unless intent is hot", () => {
    expect(getDefaultNoAccountProductType("cold")).toBe("one-time")
    expect(getDefaultNoAccountProductType("warm")).toBe("one-time")
    expect(getDefaultNoAccountProductType("hot")).toBe("membership")
  })

  it("builds landing CTA with product hint for no-account users", () => {
    const coldLink = getCTALink({
      userType: "no_account",
      campaignName: "upsell-freebie-membership",
      intentLevel: "cold",
    })
    expect(coldLink).toContain("product=one_time_session")

    const hotLink = getCTALink({
      userType: "no_account",
      campaignName: "upsell-freebie-membership",
      intentLevel: "hot",
    })
    expect(hotLink).toContain("product=studio_membership")
  })

  it("renders upsell template with starter CTA by default and membership for hot intent", () => {
    const defaultEmail = generateUpsellFreebieMembershipEmail({
      recipientEmail: "test@example.com",
      campaignName: "upsell-freebie-membership",
      campaignId: 123,
    })
    expect(defaultEmail.subject).toContain("$49 Starter")
    expect(defaultEmail.html).toContain("product=one_time_session")

    const hotEmail = generateUpsellFreebieMembershipEmail({
      recipientEmail: "test@example.com",
      campaignName: "upsell-freebie-membership",
      campaignId: 123,
      intentLevel: "hot",
    })
    expect(hotEmail.subject).toContain("Creator Studio")
    expect(hotEmail.html).toContain("product=studio_membership")
  })
})

