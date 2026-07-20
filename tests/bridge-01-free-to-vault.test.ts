// @vitest-environment node

import { describe, expect, it } from "vitest"

import { AI_PROMPTS_EMAIL_TOUCHES } from "@/lib/email/ai-prompts-email-sequence"
import { FREEBIE_GUIDE_EMAIL_TOUCHES } from "@/lib/email/freebie-guide-email-sequence"
import { generateAiPromptsDay0DeliveryEmail } from "@/lib/email/templates/ai-prompts-day0-delivery"
import { generateAiPromptsDay1VaultBridgeEmail } from "@/lib/email/templates/ai-prompts-day1-vault-bridge"
import { generateAiPromptsDay5EditMakesPostableEmail } from "@/lib/email/templates/ai-prompts-day5-edit-makes-postable"
import { generateAiPromptsDay7PromptVaultOfferEmail } from "@/lib/email/templates/ai-prompts-day7-prompt-vault-offer"
import { generateAiPromptsDay9PromptVaultProofEmail } from "@/lib/email/templates/ai-prompts-day9-prompt-vault-proof"
import { generateAiPromptsDay11PromptVaultWhyNowEmail } from "@/lib/email/templates/ai-prompts-day11-prompt-vault-why-now"

describe("BRIDGE-01 free prompts to Vault bridge", () => {
  it("starts the AI prompts nurture with the day 1 Vault bridge", () => {
    expect(AI_PROMPTS_EMAIL_TOUCHES.map(touch => touch.emailType)).toEqual([
      "ai-prompts-day1-vault-bridge",
      "ai-prompts-day5-edit-makes-postable",
      "ai-prompts-day7-prompt-vault-offer",
      "ai-prompts-day9-prompt-vault-proof",
      "ai-prompts-day11-prompt-vault-why-now",
    ])
    expect(AI_PROMPTS_EMAIL_TOUCHES.map(touch => touch.days)).toEqual([1, 5, 7, 9, 11])
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

    expect(day0.subject).toBe("your selfie prompts are here")
    expect(day0.text).toContain(accessUrl)
    expect(day0.text).not.toContain("/checkout/")

    expect(day1.subject).toBe("did you try one yet?")
    expect(day1.text).toContain("Hi Sandra,")
    expect(day1.text).toContain(accessUrl)
    expect(day1.text).toContain("Try one before you decide you need anything else")
    expect(day1.text).not.toContain("/checkout/")
  })

  it("uses the practical day 5 fix as the first paid bridge to Prompt Vault", () => {
    const email = generateAiPromptsDay5EditMakesPostableEmail({
      firstName: "Sandra",
      recipientEmail: "sandra@example.com",
      accessUrl: "https://www.sselfie.ai/ai-prompts/access/free-token",
    })

    expect(email.subject).toBe("if the AI result looked strange")
    expect(email.text).toContain("Open my prompts")
    expect(email.text).toContain("If one look showed you what is possible")
    expect(email.text).toContain("/checkout/prompt-vault")
    expect(email.text).toContain("email_type=ai-prompts-day5-edit-makes-postable")
    expect(email.text).not.toContain("/checkout/selfie-to-ai-photos-kit")
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

    expect(day7.subject).toBe("the free prompt was only the first photo")
    expect(day7.text).toContain("The Vault holds every one of those worlds")
    expect(day7.text).toContain("Get the Vault · $37 · one time:")
    expect(day7.text).toContain("email_type=ai-prompts-day7-prompt-vault-offer")

    expect(day9.subject).toBe("will it still look like me?")
    expect(day9.text).toContain(
      `"I am blown away. I'm so picky it's not even funny. But this? My God."`
    )
    expect(day9.html).not.toContain("screenshot_url")
    expect(day9.html).not.toContain("<img")
    expect(day9.text).toContain("The aim is not a different face")
    expect(day9.text).not.toContain("locks your face")
    expect(day9.text).not.toContain("done in under two minutes")
    expect(day9.text).toContain("email_type=ai-prompts-day9-prompt-vault-proof")

    expect(day11.subject).toBe("one last note about the Vault")
    expect(day11.text).toContain("If the free prompts are enough, keep using them")
    expect(day11.text).toContain("the Vault is $37, once")
    expect(day11.text).toContain("email_type=ai-prompts-day11-prompt-vault-why-now")

    expect(`${day7.text}\n${day9.text}\n${day11.text}`).not.toContain("—")
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
