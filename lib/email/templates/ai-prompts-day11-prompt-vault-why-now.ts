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
  const subject = "one last note about the Vault"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">One last note about the Prompt Vault, then I&apos;ll leave it with you.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If the free prompts are enough, keep using them. You do not need to buy something just because I sent an email.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If you want full shoots instead of one-off images, the Vault is $37, once. You get every current visual world and the new drops I add later.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">It is there for the moment you want more direction, more images, and less guessing.</p>
    <div style="margin:26px 0 20px;">${renderStoneButton("Get the Vault · $37", promptVaultUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">Sandra x</p>
  `

  const html = renderStoneShell({
    title: "One last note about the Vault.",
    eyebrow: "Prompt Vault",
    subtitle: "Use the free prompts. Choose the Vault when you want the full shoot.",
    bodyHtml,
    footerLead: "It will be here when it is useful.",
    footerSignoff: "",
  })

  const text = `One last note about the Prompt Vault, then I'll leave it with you.

If the free prompts are enough, keep using them. You do not need to buy something just because I sent an email.

If you want full shoots instead of one-off images, the Vault is $37, once. You get every current visual world and the new drops I add later.

It is there for the moment you want more direction, more images, and less guessing.

Get the Vault · $37:
${promptVaultUrl}

Sandra x`

  return { html, text, subject }
}
