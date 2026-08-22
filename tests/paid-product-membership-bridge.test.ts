// @vitest-environment node

import { describe, expect, it } from "vitest"

import { PROMPT_VAULT_EMAIL_TOUCHES } from "@/lib/email/prompt-vault-email-sequence"
import { STARTER_KIT_EMAIL_TOUCHES } from "@/lib/email/starter-kit-email-sequence"
import {
  generatePromptVaultMembershipBridgeEmail,
  generateStarterKitMembershipBridgeEmail,
} from "@/lib/email/templates/paid-product-membership-bridge"

describe("paid product to membership ascension", () => {
  it("keeps legacy product ladders out of the active Starter Kit registry", () => {
    expect(STARTER_KIT_EMAIL_TOUCHES.map(touch => touch.emailType)).toEqual([
      "starter-kit-day0-delivery",
      "starter-kit-day1-quick-win",
      "starter-kit-day3-story",
      "starter-kit-day5-proof",
    ])
  })

  it("keeps Prompt Vault customer-success touches unchanged", () => {
    expect(PROMPT_VAULT_EMAIL_TOUCHES.map(touch => touch.emailType)).toEqual([
      "prompt-vault-day2-first-result",
      "prompt-vault-day5-fix-bad-result",
      "prompt-vault-day10-next-shoot",
    ])
  })

  it("positions membership as the ongoing system after Starter Kit", () => {
    const email = generateStarterKitMembershipBridgeEmail({ firstName: "Sandra" })

    expect(email.subject).toContain("next part")
    expect(email.text).toContain("TAKE → EDIT → EXPAND → USE")
    expect(email.text).toContain("/checkout/membership")
    expect(email.text).toContain("utm_campaign=starter-kit-day10-membership-bridge")
    expect(email.text).not.toContain("Masterclass")
  })

  it("positions membership as the whole system after Prompt Vault", () => {
    const email = generatePromptVaultMembershipBridgeEmail({ firstName: "Sandra" })

    expect(email.subject).toContain("whole system")
    expect(email.text).toContain("TAKE → EDIT → EXPAND → USE")
    expect(email.text).toContain("/checkout/membership")
    expect(email.text).toContain("utm_campaign=prompt-vault-day14-membership-bridge")
    expect(email.text).not.toContain("Masterclass")
  })
})
