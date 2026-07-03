import { buildRevenueEmailLink } from "./revenue-links"
import { promptVaultCheckoutUrl } from "./selfie-education-links"
import { renderStoneButton, renderStoneShell } from "./stone-email"

export interface AiPromptsDay11Params {
  firstName: string
  recipientEmail?: string | null
}

const EMAIL_TYPE = "ai-prompts-day11-prompt-vault-why-now"

export function generateAiPromptsDay11PromptVaultWhyNowEmail({
  recipientEmail,
}: AiPromptsDay11Params): {
  html: string
  text: string
  subject: string
} {
  const promptVaultUrl = buildRevenueEmailLink(promptVaultCheckoutUrl(), {
    campaign: "ai_prompts_day11",
    content: "prompt_vault_why_now",
    medium: "nurture",
    emailType: EMAIL_TYPE,
    checkoutEmail: recipientEmail,
  })
  const subject = "your camera roll's still waiting on the full shoot"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You've had the free shots for almost two weeks now.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Maybe you used them. Maybe they're still sitting there, waiting for the "right" moment.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Here's the thing about showing up. The right moment doesn't come. You just start.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The Vault is $37. One time. Every editorial world I&apos;ve shot, every shot in the sequence, and every new drop I add is yours too. No subscription. No catch.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The women who get the most out of this aren't the ones with the best selfies. They're the ones who stopped waiting to feel ready.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Your face is your brand. You've already got the camera.</p>
    <div style="margin:26px 0 20px;">${renderStoneButton("Get the Vault · $37", promptVaultUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">Sandra x</p>
  `

  const html = renderStoneShell({
    title: "Still sitting in your camera roll?",
    eyebrow: "Prompt Vault",
    subtitle: "The right moment does not come. You start.",
    bodyHtml,
    footerLead: "Your face is your brand. You've already got the camera.",
    footerSignoff: "",
  })

  const text = `You've had the free shots for almost two weeks now.

Maybe you used them. Maybe they're still sitting there, waiting for the "right" moment.

Here's the thing about showing up. The right moment doesn't come. You just start.

The Vault is $37. One time. Every editorial world I've shot, every shot in the sequence, and every new drop I add is yours too. No subscription. No catch.

The women who get the most out of this aren't the ones with the best selfies. They're the ones who stopped waiting to feel ready.

Your face is your brand. You've already got the camera.

Get the Vault · $37:
${promptVaultUrl}

Sandra x`

  return { html, text, subject }
}
