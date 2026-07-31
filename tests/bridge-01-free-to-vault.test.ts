// @vitest-environment node

import { describe, expect, it } from "vitest"

import { AI_PROMPTS_EMAIL_TOUCHES } from "@/lib/email/ai-prompts-email-sequence"
import { FREEBIE_GUIDE_EMAIL_TOUCHES } from "@/lib/email/freebie-guide-email-sequence"
import { generateAiPromptsDay0DeliveryEmail } from "@/lib/email/templates/ai-prompts-day0-delivery"
import { generateAiPromptsDay1VaultBridgeEmail } from "@/lib/email/templates/ai-prompts-day1-vault-bridge"
import { generateAiPromptsDay5EditMakesPostableEmail } from "@/lib/email/templates/ai-prompts-day5-edit-makes-postable"
import { generateAiPromptsDay7PromptVaultOfferEmail } from "@/lib/email/templates/ai-prompts-day7-prompt-vault-offer"
import { generateAiPromptsDay9PromptVaultProofEmail } from "@/lib/email/templates/ai-prompts-day9-prompt-vault-proof"

describe("BRIDGE-01 free prompts to Vault bridge", () => {
  it("starts the AI prompts nurture with the day 1 Vault bridge", () => {
    expect(AI_PROMPTS_EMAIL_TOUCHES.map(touch => touch.emailType)).toEqual([
      "ai-prompts-day1-vault-bridge",
      "ai-prompts-day5-edit-makes-postable",
      "ai-prompts-day7-prompt-vault-offer",
      "ai-prompts-day9-prompt-vault-proof",
    ])
    expect(AI_PROMPTS_EMAIL_TOUCHES.map(touch => touch.days)).toEqual([1, 5, 7, 9])
    expect(AI_PROMPTS_EMAIL_TOUCHES).toEqual([
      { days: 1, emailType: "ai-prompts-day1-vault-bridge" },
      { days: 5, emailType: "ai-prompts-day5-edit-makes-postable" },
      {
        days: 7,
        emailType: "ai-prompts-day7-prompt-vault-offer",
        suppressIfSentTypes: ["ai-prompts-day7-starter-kit-offer"],
      },
      { days: 9, emailType: "ai-prompts-day9-prompt-vault-proof" },
    ])
  })

  it("keeps the named underperforming guide emails out of the active ladder", () => {
    const activeGuideEmails = FREEBIE_GUIDE_EMAIL_TOUCHES.map(touch => touch.emailType)

    expect(activeGuideEmails).toEqual([
      "freebie-guide-day1-light-tip",
      "freebie-guide-day5-story",
    ])
    expect(activeGuideEmails).not.toContain("freebie-guide-day3-edit-bridge")
    expect(activeGuideEmails).not.toContain("freebie-guide-day8-starter-kit-direct")
    expect(activeGuideEmails).not.toContain("freebie-guide-day14-masterclass-bridge")
  })

  it("protects the first useful result before introducing the Vault", () => {
    const accessUrl = "https://www.sselfie.ai/ai-prompts/access/free-token"
    const day0 = generateAiPromptsDay0DeliveryEmail({
      firstName: "Sandra",
      recipientEmail: "sandra@example.com",
      accessUrl,
    })
    const day1 = generateAiPromptsDay1VaultBridgeEmail({
      firstName: "Sandra",
      recipientEmail: "sandra@example.com",
      accessUrl,
    })

    expect(day0.subject).toBe("your five prompts are here")
    expect(day0.text).toContain(accessUrl)
    expect(day0.text).not.toContain("/checkout/")

    expect(day1.subject).toBe("which one did you try first?")
    expect(day1.text).toContain("Hi Sandra,")
    expect(day1.text).toContain(accessUrl)
    expect(day1.text).toContain("Choose the photo you love most")
    expect(day1.text).not.toContain("/checkout/")
  })

  it("uses day 5 only to help the lead get a better first result", () => {
    const email = generateAiPromptsDay5EditMakesPostableEmail({
      firstName: "Sandra",
      recipientEmail: "sandra@example.com",
      accessUrl: "https://www.sselfie.ai/ai-prompts/access/free-token",
    })

    expect(email.subject).toBe("if your first photo looked a little strange")
    expect(email.text).toContain("Open my prompts")
    expect(email.text).toContain("try the same photo again")
    expect(email.text).not.toContain("/checkout/prompt-vault")
    expect(email.text).not.toContain("/checkout/selfie-to-ai-photos-kit")
  })

  it("renders one clear Vault offer and an honest decision email", () => {
    const day7 = generateAiPromptsDay7PromptVaultOfferEmail({
      firstName: "Sandra",
      recipientEmail: "sandra@example.com",
    })
    const day9 = generateAiPromptsDay9PromptVaultProofEmail({
      firstName: "Sandra",
      recipientEmail: "sandra@example.com",
    })
    expect(day7.subject).toBe("the five free prompts are one photo from each shoot")
    expect(day7.text).toContain("each of those photos belongs to a complete collection")
    expect(day7.text).toContain("See the complete Prompt Vault · $37:")
    expect(day7.text).toContain("email_type=ai-prompts-day7-prompt-vault-offer")

    expect(day9.subject).toBe("is the Prompt Vault right for you?")
    expect(day9.html).not.toContain("screenshot_url")
    expect(day9.html).not.toContain("<img")
    expect(day9.text).toContain("It is a one-time $37 purchase. It is not a subscription.")
    expect(day9.text).toContain("You will still copy the prompts into ChatGPT yourself")
    expect(day9.text).toContain("email_type=ai-prompts-day9-prompt-vault-proof")

    expect(`${day7.text}\n${day9.text}`).not.toContain("—")
    expect(`${day7.text}\n${day9.text}`).not.toContain("visual world")
  })

  it("does not promote the failed no-card SUITE trial to free leads", () => {
    const freeLeadTouches = [
      ...AI_PROMPTS_EMAIL_TOUCHES.map(touch => touch.emailType),
      ...FREEBIE_GUIDE_EMAIL_TOUCHES.map(touch => touch.emailType),
    ]

    expect(freeLeadTouches).not.toContain("ai-prompts-day10-suite-trial")
    expect(freeLeadTouches).not.toContain("freebie-guide-day14-masterclass-bridge")
  })
})
