import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import { generateWorkWithMeWelcomeEmail } from "@/lib/email/templates/work-with-me-welcome"

const ROOT = process.cwd()

describe("Work With Me fulfillment", () => {
  it("grants the complete private sprint bundle after payment", () => {
    const handler = readFileSync(resolve(ROOT, "lib/payments/handlers/work-with-me.ts"), "utf8")

    expect(handler).toContain('productId: "masterclass"')
    expect(handler).toContain('productId: "brand_strategy_pack"')
    expect(handler).toContain('productId: "selfie_to_brand_shoot_system"')
    expect(handler).toContain('productId: "prompt_vault"')
    expect(handler).toContain("ensurePaidSelfieToBrandShootSubscriber")
    expect(handler).toContain('bought_selfie_to_brand_shoot_system: "true"')
    expect(handler).toContain('bought_prompt_vault: "true"')
  })

  it("makes the booking call the one primary next step and keeps the supporting library", () => {
    const email = generateWorkWithMeWelcomeEmail({
      firstName: "Harmony",
      passwordSetupUrl: "https://sselfie.ai/auth/setup-password?next=%2Facademy%2Faccess%2Fmasterclass",
      masterclassUrl: "https://sselfie.ai/academy/access/masterclass",
      selfieToBrandShootUrl: "https://sselfie.ai/academy/access/selfie-to-brand-shoot",
      promptVaultUrl: "https://sselfie.ai/access/prompt-vault/preview-token",
      bookingUrl: "https://calendly.com/sandrasocial/work-with-me-session-45-min",
    })

    expect(email.html).toContain("https://sselfie.ai/academy/access/masterclass")
    expect(email.html).toContain("https://sselfie.ai/academy/access/selfie-to-brand-shoot")
    expect(email.html).toContain("https://sselfie.ai/access/prompt-vault/preview-token")
    expect(email.html).toContain("https://calendly.com/sandrasocial/work-with-me-session-45-min")
    expect(email.text).toContain("Open Selfie to Brand Shoot")
    expect(email.text).toContain("Open Prompt Vault")
    expect(email.text).toContain("weekly 45-minute sessions")
    expect(email.text).toContain("ONE CLIENT-READY PATH")
    expect(email.text).toContain("offer page copy")
    expect(email.text).toContain("inquiry path")
    expect(email.text).not.toContain("Start your photos")
    expect(email.html).not.toContain("https://sselfie.ai/app")
  })
})
