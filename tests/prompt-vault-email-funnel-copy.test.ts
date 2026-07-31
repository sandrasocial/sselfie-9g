// @vitest-environment node

import { describe, expect, it } from "vitest"

import {
  generatePromptVaultDay10NextShootEmail,
  generatePromptVaultDay2FirstResultEmail,
  generatePromptVaultDay5FixBadResultEmail,
} from "@/lib/email/templates/prompt-vault-buyer-sequence"
import {
  generatePromptVaultCheckoutRecoveryEmail,
  generatePromptVaultRecovery2Email,
  generatePromptVaultRecovery3Email,
} from "@/lib/email/templates/prompt-vault-checkout-recovery"
import { generatePromptVaultDeliveryEmail } from "@/lib/email/templates/prompt-vault-delivery"

const ACCESS_URL = "https://www.sselfie.ai/access/prompt-vault/test-token"
const RECIPIENT = "sandra@example.com"

describe("Prompt Vault email funnel copy", () => {
  it("gives a buyer a permanent return path and one clear first action", () => {
    const email = generatePromptVaultDeliveryEmail({
      firstName: "Sandra",
      accessUrl: ACCESS_URL,
    })

    expect(email.subject).toBe("your Prompt Vault is ready")
    expect(email.text).toContain("private access link")
    expect(email.text).toContain("you do not need to create a login")
    expect(email.text).toContain("Tap Copy prompt")
    expect(email.text).toContain(ACCESS_URL)
    expect(email.text).toContain("enter the email address you used at checkout")
  })

  it("keeps the buyer sequence focused on activation, recovery, and repeat use", () => {
    const emails = [
      generatePromptVaultDay2FirstResultEmail({ firstName: "Sandra", accessUrl: ACCESS_URL }),
      generatePromptVaultDay5FixBadResultEmail({ firstName: "Sandra", accessUrl: ACCESS_URL }),
      generatePromptVaultDay10NextShootEmail({ firstName: "Sandra", accessUrl: ACCESS_URL }),
    ]

    expect(emails[0].text).toContain("create your first photo")
    expect(emails[1].text).toContain("try a different selfie before you change the prompt")
    expect(emails[2].text).toContain("choose one complete collection")
    expect(emails[2].text).toContain("Create three photos from the same shoot")
  })

  it("keeps checkout recovery accurate and free of fake urgency", () => {
    const emails = [
      generatePromptVaultCheckoutRecoveryEmail({
        firstName: "Sandra",
        recipientEmail: RECIPIENT,
      }),
      generatePromptVaultRecovery2Email({
        firstName: "Sandra",
        recipientEmail: RECIPIENT,
      }),
      generatePromptVaultRecovery3Email({
        firstName: "Sandra",
        recipientEmail: RECIPIENT,
      }),
    ]
    const copy = emails.map(email => `${email.subject}\n${email.text}`).join("\n")

    expect(copy).toContain("$37 once")
    expect(copy).toContain("not a subscription")
    expect(copy).toContain("There is no deadline")
    expect(copy).not.toContain("ten minutes")
    expect(copy).not.toContain("one tap")
    expect(copy).not.toContain("AI should not erase you")
  })

  it("does not use the generic phrases Sandra rejected", () => {
    const emails = [
      generatePromptVaultDeliveryEmail({ firstName: "Sandra", accessUrl: ACCESS_URL }),
      generatePromptVaultDay2FirstResultEmail({ firstName: "Sandra", accessUrl: ACCESS_URL }),
      generatePromptVaultDay5FixBadResultEmail({ firstName: "Sandra", accessUrl: ACCESS_URL }),
      generatePromptVaultDay10NextShootEmail({ firstName: "Sandra", accessUrl: ACCESS_URL }),
      generatePromptVaultCheckoutRecoveryEmail({
        firstName: "Sandra",
        recipientEmail: RECIPIENT,
      }),
      generatePromptVaultRecovery2Email({ firstName: "Sandra", recipientEmail: RECIPIENT }),
      generatePromptVaultRecovery3Email({ firstName: "Sandra", recipientEmail: RECIPIENT }),
    ]
    const copy = emails.map(email => `${email.subject}\n${email.text}`).join("\n").toLowerCase()

    expect(copy).not.toContain("visual world")
    expect(copy).not.toContain("explore")
    expect(copy).not.toContain("version of you")
    expect(copy).not.toContain("—")
  })
})
