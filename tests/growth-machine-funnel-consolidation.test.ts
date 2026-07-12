// @vitest-environment node

import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("growth machine funnel consolidation", () => {
  it("retires Selfie to Brand Shoot as a new public sale without deleting buyer access", () => {
    const landing = read("app/selfie-to-brand-shoot/page.tsx")
    const checkout = read("app/checkout/selfie-to-brand-shoot/page.tsx")
    const starterKitAccess = read("app/access/starter-kit/[token]/page.tsx")
    const promptVaultTouches = read("lib/email/prompt-vault-email-sequence.ts")
    const starterKitTouches = read("lib/email/starter-kit-email-sequence.ts")
    const starterKitDelivery = read("lib/email/templates/starter-kit-day0-delivery.ts")
    const tools = read("app/admin/tools/page.tsx")

    expect(landing).toContain('redirect("/join/studio?source=selfie_to_brand_shoot_retired")')
    expect(checkout).toContain('redirect("/join/studio?source=selfie_to_brand_shoot_checkout_retired")')
    expect(starterKitAccess).not.toContain("/checkout/selfie-to-brand-shoot")
    expect(starterKitDelivery).not.toContain("selfieToBrandShootCheckoutUrl")
    expect(promptVaultTouches).not.toContain('{ days: 3, emailType: "prompt-vault-day3-system-upgrade" }')
    expect(starterKitTouches).not.toContain('{ days: 7, emailType: "starter-kit-day7-soft-masterclass" }')
    expect(starterKitTouches).not.toContain('{ days: 10, emailType: "starter-kit-day10-masterclass-breakdown" }')
    expect(tools).not.toContain('href: "/admin/selfie-to-brand-shoot"')
    expect(tools).not.toContain('href: "/admin/preview/selfie-to-brand-shoot"')

    expect(existsSync("app/access/selfie-to-brand-shoot/[token]/page.tsx")).toBe(true)
    expect(existsSync("app/academy/access/selfie-to-brand-shoot/page.tsx")).toBe(true)
    expect(existsSync("lib/payments/handlers/selfie-to-brand-shoot.ts")).toBe(true)
  })

  it("redirects duplicate and orphaned public routes into the active warm path", () => {
    expect(read("app/visibility-to-paid/page.tsx")).toContain('redirect("/work-with-me")')
    expect(read("app/editorial-generator/page.tsx")).toContain('redirect("/work-with-me")')
  })

  it("shows the current $37 Prompt Vault price across live runtime surfaces", () => {
    const runtimeFiles = [
      "components/sselfie/public-marketing.tsx",
      "app/bio/page.tsx",
      "components/ai-prompts/single-prompt-gate.tsx",
      "app/checkout/page.tsx",
      "components/prompt-vault/prompt-vault-checkout-email-capture.tsx",
      "components/prompt-vault/prompt-vault-checkout-link.tsx",
    ]

    for (const path of runtimeFiles) {
      expect(read(path), path).not.toContain("$27")
    }

    const products = read("lib/products.ts")
    const validator = read("lib/stripe/validate-pricing-config.ts")
    expect(products).toMatch(/id: "prompt_vault",[\s\S]*?priceInCents: 3700/)
    expect(validator).toMatch(
      /envVarName: "STRIPE_PRICE_PROMPT_VAULT_AFTER_FLASH",[\s\S]*?productType: "prompt_vault",[\s\S]*?expectedAmount: 3700/,
    )
  })

  it("keeps the free AI Prompts access page in one identity", () => {
    const access = read("app/ai-prompts/access/[token]/page.tsx")

    expect(access).toContain("SSELFIE · AI PROMPTS")
    expect(access).not.toContain("SSELFIE · SELFIE TO BRAND SHOOT")
  })
})
