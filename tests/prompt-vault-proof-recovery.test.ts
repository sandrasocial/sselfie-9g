// @vitest-environment node

import { describe, expect, it } from "vitest"

import { classifyPromptVaultProofRecoveryAudience } from "@/lib/email/campaigns/prompt-vault-proof-recovery-audience"
import { generatePromptVaultProofRecoveryEmail } from "@/lib/email/templates/prompt-vault-proof-recovery"

describe("Prompt Vault proof recovery", () => {
  it("writes the Marbella proof email as one honest next step", () => {
    const email = generatePromptVaultProofRecoveryEmail({
      firstName: "Sandra",
      recipientEmail: "sandra@example.com",
    })

    expect(email.subject).toBe("this was the selfie I started with")
    expect(email.text).toContain("I used one selfie to create the photos I needed for Marbella.")
    expect(email.text).toContain("I was already travelling there.")
    expect(email.text).toContain("The free prompts let you try one photo from each collection.")
    expect(email.text).toContain("It is $37 once.")
    expect(email.text).toContain("If the free prompts are enough for you right now, keep using them.")
    expect(email.text).not.toContain("—")
    expect(email.text).not.toContain("visual world")
    expect(email.text).not.toContain("unlock")
  })

  it("keeps buyers, unsafe contacts, and recently offered leads out", () => {
    const base = {
      firstName: "There",
      isPromptLead: true,
      isVaultBuyer: false,
      isInternalOrTest: false,
      unsubscribed: false,
      blockedDelivery: false,
      receivedRecentVaultOffer: false,
    }
    const result = classifyPromptVaultProofRecoveryAudience([
      { ...base, email: "ready@example.org" },
      { ...base, email: "READY@example.org" },
      { ...base, email: "buyer@example.org", isVaultBuyer: true },
      { ...base, email: "unsub@example.org", unsubscribed: true },
      { ...base, email: "bounce@example.org", blockedDelivery: true },
      { ...base, email: "recent@example.org", receivedRecentVaultOffer: true },
      { ...base, email: "internal@sselfie.ai", isInternalOrTest: true },
    ])

    expect(result.eligible).toEqual([{ email: "ready@example.org", firstName: "There" }])
    expect(result.excluded).toEqual({
      duplicate: 1,
      notPromptLead: 0,
      vaultBuyer: 1,
      internalOrTest: 1,
      unsubscribed: 1,
      blockedDelivery: 1,
      recentVaultOffer: 1,
    })
  })
})
