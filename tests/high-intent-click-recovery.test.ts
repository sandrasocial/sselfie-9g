// @vitest-environment node

import { describe, expect, it } from "vitest"

import {
  generateHighIntentClickRecoveryEmail,
  HIGH_INTENT_EMAIL_TYPES,
} from "@/lib/email/templates/high-intent-click-recovery"

describe("high-intent paid-offer click recovery", () => {
  it("keeps the Prompt Vault recovery fit-first instead of pressure-first", () => {
    const email = generateHighIntentClickRecoveryEmail({
      product: "prompt_vault",
      firstName: "Sandra",
    })

    expect(email.subject).toBe("if you're still deciding about the Vault")
    expect(email.text).toContain("You do not need the Vault yet")
    expect(email.text).toContain("31 complete shoot collections")
    expect(email.text).toContain("$37 once")
    expect(email.ctaUrl).toContain("/checkout/prompt-vault")
    expect(email.ctaUrl).toContain("utm_campaign=high_intent_click_recovery")
    expect(email.ctaUrl).not.toContain("checkout_email=")
    expect(HIGH_INTENT_EMAIL_TYPES.prompt_vault).toBe("high-intent-click-prompt-vault")
  })

  it("positions the Starter Kit as the real-photo-first path", () => {
    const email = generateHighIntentClickRecoveryEmail({
      product: "starter_kit",
      firstName: "Sandra",
    })

    expect(email.subject).toBe("before you decide on the Starter Kit")
    expect(email.text).toContain("This one is not")
    expect(email.text).toContain("the real photo first")
    expect(email.text).toContain("you probably do not need it")
    expect(email.ctaUrl).toContain("/checkout/starter-kit")
    expect(email.ctaUrl).not.toContain("checkout_email=")
    expect(HIGH_INTENT_EMAIL_TYPES.starter_kit).toBe("high-intent-click-starter-kit")
  })

  it("escapes recipient names in HTML", () => {
    const email = generateHighIntentClickRecoveryEmail({
      product: "starter_kit",
      firstName: '<script>alert("x")</script>',
    })

    expect(email.html).not.toContain("<script>")
    expect(email.html).toContain("&lt;script&gt;")
  })
})
