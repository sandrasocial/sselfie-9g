import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

import { generateWorkWithMeWelcomeEmail } from "@/lib/email/templates/work-with-me-welcome"

const ROOT = process.cwd()

describe("Work With Me fulfillment", () => {
  it("grants the complete private sprint bundle after payment", () => {
    const handler = readFileSync(resolve(ROOT, "lib/payments/handlers/work-with-me.ts"), "utf8")

    expect(handler).toContain('productId: "masterclass"')
    expect(handler).toContain('productId: "work_with_me"')
    expect(handler).toContain("upsertPaidWorkWithMeProject")
    expect(handler).toContain('productId: "brand_strategy_pack"')
    expect(handler).toContain('productId: "selfie_to_brand_shoot_system"')
    expect(handler).toContain('productId: "prompt_vault"')
    expect(handler).toContain("ensurePaidSelfieToBrandShootSubscriber")
    expect(handler).toContain('bought_selfie_to_brand_shoot_system: "true"')
    expect(handler).toContain('bought_prompt_vault: "true"')
  })

  it("makes the client home the primary next step and keeps the supporting library", () => {
    const email = generateWorkWithMeWelcomeEmail({
      firstName: "Harmony",
      passwordSetupUrl:
        "https://sselfie.ai/auth/setup-password?next=%2Facademy%2Faccess%2Fmasterclass",
      masterclassUrl: "https://sselfie.ai/academy/access/masterclass",
      selfieToBrandShootUrl: "https://sselfie.ai/academy/access/selfie-to-brand-shoot",
      promptVaultUrl: "https://sselfie.ai/access/prompt-vault/preview-token",
      bookingUrl: "https://calendly.com/sandrasocial/work-with-me-session-45-min",
      welcomeUrl: "https://sselfie.ai/work-with-me/welcome",
    })

    expect(email.html).toContain("https://sselfie.ai/academy/access/masterclass")
    expect(email.html).toContain("https://sselfie.ai/academy/access/selfie-to-brand-shoot")
    expect(email.html).toContain("https://sselfie.ai/access/prompt-vault/preview-token")
    expect(email.html).toContain("https://calendly.com/sandrasocial/work-with-me-session-45-min")
    expect(email.text).toContain("Open Selfie to Brand Shoot")
    expect(email.text).toContain("Open Prompt Vault")
    expect(email.text).toContain("Open your client home")
    expect(email.text).toContain("YOUR SIX WEEKS")
    expect(email.text).toContain("Business Brain")
    expect(email.text).toContain("three personal AI roles")
    expect(email.text).toContain("three repeatable workflows")
    expect(email.text).toContain("30-day working plan")
    expect(email.text).toContain("YOU STAY IN CONTROL")
    expect(email.text).not.toContain("promise of clients or income")
    expect(email.text).not.toContain("Start your photos")
    expect(email.html).not.toContain("https://sselfie.ai/app")
    expect(email.subject).toContain("personal AI team")
  })
})
