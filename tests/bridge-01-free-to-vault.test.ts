// @vitest-environment node

import { describe, expect, it } from "vitest"

import { AI_PROMPTS_EMAIL_TOUCHES } from "@/lib/email/ai-prompts-email-sequence"
import { FREEBIE_GUIDE_EMAIL_TOUCHES } from "@/lib/email/freebie-guide-email-sequence"
import { generateAiPromptsDay1VaultBridgeEmail } from "@/lib/email/templates/ai-prompts-day1-vault-bridge"
import { generateAiPromptsDay7PromptVaultOfferEmail } from "@/lib/email/templates/ai-prompts-day7-prompt-vault-offer"
import { generateAiPromptsDay9PromptVaultProofEmail } from "@/lib/email/templates/ai-prompts-day9-prompt-vault-proof"
import { generateAiPromptsDay11PromptVaultWhyNowEmail } from "@/lib/email/templates/ai-prompts-day11-prompt-vault-why-now"
import { generateAiPromptsDay10SuiteTrialEmail } from "@/lib/email/templates/ai-prompts-day10-suite-trial"

describe("BRIDGE-01 free prompts to Vault bridge", () => {
  it("starts the AI prompts nurture with the day 1 Vault bridge", () => {
    expect(AI_PROMPTS_EMAIL_TOUCHES.map(touch => touch.emailType)).toEqual([
      "ai-prompts-day1-vault-bridge",
      "ai-prompts-day5-edit-makes-postable",
      "ai-prompts-day7-prompt-vault-offer",
      "ai-prompts-day9-prompt-vault-proof",
      "ai-prompts-day11-prompt-vault-why-now",
      "ai-prompts-day10-suite-trial",
    ])
    expect(AI_PROMPTS_EMAIL_TOUCHES.map(touch => touch.days)).toEqual([1, 5, 7, 9, 11, 14])
    expect(AI_PROMPTS_EMAIL_TOUCHES).toEqual([
      { days: 1, emailType: "ai-prompts-day1-vault-bridge" },
      { days: 5, emailType: "ai-prompts-day5-edit-makes-postable" },
      {
        days: 7,
        emailType: "ai-prompts-day7-prompt-vault-offer",
        suppressIfSentTypes: ["ai-prompts-day7-starter-kit-offer"],
      },
      { days: 9, emailType: "ai-prompts-day9-prompt-vault-proof" },
      { days: 11, emailType: "ai-prompts-day11-prompt-vault-why-now" },
      {
        days: 14,
        emailType: "ai-prompts-day10-suite-trial",
        suppressIfSentTypes: ["suite_trial_unlock"],
      },
    ])
  })

  it("keeps the named underperforming guide emails out of the active ladder", () => {
    const activeGuideEmails = FREEBIE_GUIDE_EMAIL_TOUCHES.map(touch => touch.emailType)

    expect(activeGuideEmails).toEqual([
      "freebie-guide-day1-light-tip",
      "freebie-guide-day5-story",
      "freebie-guide-day14-masterclass-bridge",
    ])
    expect(activeGuideEmails).not.toContain("freebie-guide-day3-edit-bridge")
    expect(activeGuideEmails).not.toContain("freebie-guide-day8-starter-kit-direct")
  })

  it("renders the day 1 bridge email routing cold leads to the AI Photos Kit with checkout attribution", () => {
    const email = generateAiPromptsDay1VaultBridgeEmail({ firstName: "Sandra" })

    expect(email.subject).toBe("you're not unphotogenic, babe")
    expect(email.text).toContain("Hi Sandra,")
    // Forward Revenue Plan 2026-07-01: cold prompt leads get the Kit, not the Vault.
    expect(email.text).toContain("That is what the AI Photos Kit is for")
    expect(email.text).toContain("/checkout/selfie-to-ai-photos-kit")
    expect(email.text).toContain("email_type=ai-prompts-day1-vault-bridge")
    expect(email.text).not.toContain("/checkout/prompt-vault")
  })

  it("renders the approved Vault offer sequence with attribution and text-only proof", () => {
    const day7 = generateAiPromptsDay7PromptVaultOfferEmail({
      firstName: "Sandra",
      recipientEmail: "sandra@example.com",
    })
    const day9 = generateAiPromptsDay9PromptVaultProofEmail({
      firstName: "Sandra",
      recipientEmail: "sandra@example.com",
    })
    const day11 = generateAiPromptsDay11PromptVaultWhyNowEmail({
      firstName: "Sandra",
      recipientEmail: "sandra@example.com",
    })

    expect(day7.subject).toBe("that was just shot 1, babe 👀")
    expect(day7.text).toContain("The Vault holds every one of those worlds")
    expect(day7.text).toContain("Get the Vault · $37 · one time:")
    expect(day7.text).toContain("email_type=ai-prompts-day7-prompt-vault-offer")

    expect(day9.subject).toBe("proof it still looks like you (not someone else)")
    expect(day9.text).toContain(
      `"I am blown away. I'm so picky it's not even funny. But this? My God."`
    )
    expect(day9.html).not.toContain("screenshot_url")
    expect(day9.html).not.toContain("<img")
    expect(day9.text).toContain("AI should not erase you. It should frame you.")
    expect(day9.text).toContain("email_type=ai-prompts-day9-prompt-vault-proof")

    expect(day11.subject).toBe("your camera roll's still waiting on the full shoot")
    expect(day11.text).toContain("The Vault is $37. One time. Every editorial world I've shot")
    expect(day11.text).toContain("email_type=ai-prompts-day11-prompt-vault-why-now")

    expect(`${day7.text}\n${day9.text}\n${day11.text}`).not.toContain("—")
  })

  it("renders the rescheduled SUITE trial email as the day 14 follow-up", () => {
    const email = generateAiPromptsDay10SuiteTrialEmail({
      firstName: "Sandra",
      claimUrl: "https://www.sselfie.ai/claim/test-token",
    })

    expect(email.subject).toBe("loved making those? there's a faster way.")
    expect(email.text).toContain("Doing it by hand with prompts works.")
    expect(email.text).toContain("Try her free. 7 days in the SUITE, 20 photos on me.")
    expect(email.text).toContain("Nothing turns into a charge. It just ends.")
    expect(email.text).toContain("https://www.sselfie.ai/claim/test-token")
    expect(email.text).not.toContain("—")
  })
})
