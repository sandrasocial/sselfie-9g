// @vitest-environment node

import { describe, expect, it } from "vitest"

import { AI_PROMPTS_EMAIL_TOUCHES } from "@/lib/email/ai-prompts-email-sequence"
import { FREEBIE_GUIDE_EMAIL_TOUCHES } from "@/lib/email/freebie-guide-email-sequence"
import { generateAiPromptsDay1VaultBridgeEmail } from "@/lib/email/templates/ai-prompts-day1-vault-bridge"

describe("BRIDGE-01 free prompts to Vault bridge", () => {
  it("starts the AI prompts nurture with the day 1 Vault bridge", () => {
    expect(AI_PROMPTS_EMAIL_TOUCHES.map((touch) => touch.emailType)).toEqual([
      "ai-prompts-day1-vault-bridge",
      "ai-prompts-day5-edit-makes-postable",
      "ai-prompts-day7-prompt-vault-offer",
    ])
    expect(AI_PROMPTS_EMAIL_TOUCHES[0]).toMatchObject({
      days: 1,
      emailType: "ai-prompts-day1-vault-bridge",
    })
  })

  it("keeps the named underperforming guide emails out of the active ladder", () => {
    const activeGuideEmails = FREEBIE_GUIDE_EMAIL_TOUCHES.map((touch) => touch.emailType)

    expect(activeGuideEmails).toEqual([
      "freebie-guide-day1-light-tip",
      "freebie-guide-day5-story",
      "freebie-guide-day14-masterclass-bridge",
    ])
    expect(activeGuideEmails).not.toContain("freebie-guide-day3-edit-bridge")
    expect(activeGuideEmails).not.toContain("freebie-guide-day8-starter-kit-direct")
  })

  it("renders the approved day 1 Vault bridge email with checkout attribution", () => {
    const email = generateAiPromptsDay1VaultBridgeEmail({ firstName: "Sandra" })

    expect(email.subject).toBe("did your photo come out?")
    expect(email.text).toContain("Hi Sandra,")
    expect(email.text).toContain("the free prompt was one look. The Vault is the full shoot")
    expect(email.text).toContain("/checkout/prompt-vault")
    expect(email.text).toContain("email_type=ai-prompts-day1-vault-bridge")
    expect(email.text).not.toContain("www.sselfie.ai/prompt-vault?")
  })
})
