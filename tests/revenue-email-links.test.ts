import { describe, expect, it } from "vitest"
import { buildRevenueEmailLink } from "@/lib/email/templates/revenue-links"
import { generateSelfieGuideDay14MayaBridgeEmail } from "@/lib/email/templates/selfie-guide-day14-maya-bridge"
import { generateNurtureStrategyN3Email } from "@/lib/email/templates/archived/nurture-strategy-n3"
import { generateMasterclassDay0DeliveryEmail } from "@/lib/email/templates/masterclass-day0-delivery"

describe("revenue email links", () => {
  it("adds lifecycle attribution params to tracked links", () => {
    const url = buildRevenueEmailLink("https://sselfie.ai/checkout/membership", {
      campaign: "brand_strategy_day9_studio",
      content: "studio_checkout",
      source: "brand_strategy_day9_email",
    })

    expect(url).toContain("source=brand_strategy_day9_email")
    expect(url).toContain("utm_source=email")
    expect(url).toContain("utm_medium=lifecycle")
    expect(url).toContain("utm_campaign=brand_strategy_day9_studio")
    expect(url).toContain("utm_content=studio_checkout")
  })

  it("turns the day 14 guide email into a starter kit upsell", () => {
    const email = generateSelfieGuideDay14MayaBridgeEmail({
      firstName: "Sandra",
      recipientEmail: "sandra@example.com",
      accessUrl: "https://sselfie.ai/selfie-guide/access/token-123",
    })

    expect(email.subject).toBe("you probably know what still feels off")
    expect(email.text).toContain("Starter Kit")
    expect(email.text).toContain("utm_campaign=selfie_guide_day14_upsell")
    expect(email.text).toContain("/checkout/starter-kit")
  })

  it("drives the later brand strategy nurture toward Studio", () => {
    const email = generateNurtureStrategyN3Email({
      firstName: "Sandra",
      recipientEmail: "sandra@example.com",
    })

    expect(email.subject).toBe("You are too close to it")
    expect(email.text).toContain("Take a look at Studio")
    expect(email.text).toContain("utm_campaign=brand_strategy_day9_studio")
    expect(email.text).toContain("/checkout/membership")
  })

  it("starts masterclass buyers with the bundled Brand Strategy Pack", () => {
    const email = generateMasterclassDay0DeliveryEmail({
      firstName: "Sandra",
      accessUrl: "https://sselfie.ai/academy/access/brand-strategy",
    })

    expect(email.subject).toBe("start with your strategy")
    expect(email.text).toContain("includes your Brand Strategy Pack")
    expect(email.text).toContain("/academy/access/brand-strategy")
  })
})
