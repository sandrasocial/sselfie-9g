import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const successContent = readFileSync("components/checkout/success-content.tsx", "utf8")
const deliveryTemplate = readFileSync("lib/email/templates/prompt-vault-delivery.ts", "utf8")
const promptVaultHandler = readFileSync("lib/payments/handlers/prompt-vault.ts", "utf8")
const accessRecoveryPage = readFileSync("app/access/page.tsx", "utf8")

describe("Prompt Vault post-purchase handoff", () => {
  it("uses a calm, truthful confirmation instead of a countdown", () => {
    expect(successContent).toContain("Your Prompt Vault is opening.")
    expect(successContent).toContain("Your access link is also on its way to your inbox.")

    const promptVaultLoadingBlock = successContent.slice(
      successContent.indexOf("if (isPollingPromptVaultAccess && isPromptVaultPurchase)"),
      successContent.indexOf("if (showPromptVaultTimeout && isPromptVaultPurchase)")
    )

    expect(promptVaultLoadingBlock).not.toContain("Estimated time remaining")
    expect(promptVaultLoadingBlock).not.toContain("MAX_POLL_ATTEMPTS")
  })

  it("gives a paid buyer a real self-serve recovery path", () => {
    expect(successContent).toContain('href="/access"')
    expect(successContent).toContain("Recover my access")
    expect(deliveryTemplate).toContain("accessRecoveryUrl")
    expect(deliveryTemplate).not.toContain("promptVaultLandingUrl")
  })

  it("makes the transactional delivery idempotent per Stripe checkout session", () => {
    expect(promptVaultHandler).toContain("idempotencyKey: `prompt-vault-delivery:${session.id}`")
  })

  it("does not interrupt the handoff with Vault Maya", () => {
    const promptVaultLoadingAndTimeout = successContent.slice(
      successContent.indexOf("if (isPollingPromptVaultAccess && isPromptVaultPurchase)"),
      successContent.indexOf("if (isPollingSelfieAiPhotosKitAccess && isSelfieAiPhotosKitPurchase)")
    )

    expect(promptVaultLoadingAndTimeout).not.toContain("Vault Maya")
  })

  it("keeps access recovery focused on retrieving a paid purchase", () => {
    expect(accessRecoveryPage).toContain("Enter the email address you used when you purchased.")
    expect(accessRecoveryPage).not.toContain('href="/starter-kit"')
    expect(accessRecoveryPage).not.toContain('href="/selfie-guide"')
    expect(accessRecoveryPage).not.toContain("it arrives within a minute")
  })
})
