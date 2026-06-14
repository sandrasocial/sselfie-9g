import { getEmailHeroImage } from "../email-image-assets"
import { buildRevenueEmailLink } from "./revenue-links"
import { promptVaultCheckoutUrl } from "./selfie-education-links"
import { renderStoneButton, renderStoneShell } from "./stone-email"

export interface AiPromptsDay7Params {
  firstName: string
  recipientEmail?: string | null
}

const EMAIL_TYPE = "ai-prompts-day7-prompt-vault-offer"

export function generateAiPromptsDay7PromptVaultOfferEmail({
  recipientEmail,
}: AiPromptsDay7Params): {
  html: string
  text: string
  subject: string
} {
  const promptVaultUrl = buildRevenueEmailLink(promptVaultCheckoutUrl(), {
    campaign: "ai_prompts_day7",
    content: "prompt_vault_offer",
    medium: "nurture",
    emailType: EMAIL_TYPE,
    checkoutEmail: recipientEmail,
  })
  const subject = "that was 1 of 92, babe 👀"
  const heroImage = getEmailHeroImage("starter_kit_ai_ready_selfie")

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">In the free pack, you got the opening shot of every world. The half-light close-up. The clean-girl morning. The denim street.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">One shot each. Just the door.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Here's what most people miss. Each of those is shot 1 of a whole story.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Take Quiet Luxury London. It's not one café photo. It's nine. The arrival. The coffee run. The seated hero shot. The reel-cover exit. A whole day, from one selfie.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The Vault has ten of those worlds. 92 shots, start to finish. Every one keeps your face. Still you, just on your best day.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You already know it works. You've watched your own selfie turn into something you'd actually post.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">This is the rest of it.</p>
    <div style="margin:26px 0 20px;">${renderStoneButton("Get the Vault · $27 · one time", promptVaultUrl)}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Start with one world. Use one clear selfie. See where it goes.</p>
    <p style="margin:0;font-size:16px;line-height:1.75;">Sandra x</p>
  `

  const html = renderStoneShell({
    title: "One shot each. The Vault is the whole story.",
    eyebrow: "Prompt Vault",
    subtitle: "The free pack opened the door. The Vault is the full shoot.",
    bodyHtml,
    ...heroImage,
    footerLead: "Start with one world. Use one clear selfie.",
    footerSignoff: "",
  })

  const text = `In the free pack, you got the opening shot of every world. The half-light close-up. The clean-girl morning. The denim street.

One shot each. Just the door.

Here's what most people miss. Each of those is shot 1 of a whole story.

Take Quiet Luxury London. It's not one café photo. It's nine. The arrival. The coffee run. The seated hero shot. The reel-cover exit. A whole day, from one selfie.

The Vault has ten of those worlds. 92 shots, start to finish. Every one keeps your face. Still you, just on your best day.

You already know it works. You've watched your own selfie turn into something you'd actually post.

This is the rest of it.

Get the Vault · $27 · one time:
${promptVaultUrl}

Start with one world. Use one clear selfie. See where it goes.

Sandra x`

  return { html, text, subject }
}
