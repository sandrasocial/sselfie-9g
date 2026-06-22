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
  firstName,
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
  const subject = "that was just shot 1, babe 👀"
  const heroImage = getEmailHeroImage("starter_kit_ai_ready_selfie")

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The free preview gave you a few looks to test. The half-light close-up. The clean-girl morning. The denim street.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Here&apos;s what most people don&apos;t realise. Each one is shot 1 of a whole story.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Take Quiet Luxury London. It&apos;s not one café photo. It&apos;s the whole day. The arrival. The coffee run. The seated hero shot. The reel-cover walk-away. All from one selfie.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The Vault holds every one of those worlds, each a full shoot from start to finish. Still you in every frame, and a new world every time I shoot one.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">No studio. No photographer. No perfect setup. One clear selfie and the direction does the rest.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">It&apos;s $27, one time. Yours for good, every future drop included. And if anything snags, just reply. A real person reads it, usually me.</p>
    <div style="margin:26px 0 20px;">${renderStoneButton("Get the Vault · $27 · one time", promptVaultUrl)}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Start with one world. See where it goes. 🤍</p>
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

  const text = `${firstName},

The free preview gave you a few looks to test. The half-light close-up. The clean-girl morning. The denim street.

Here's what most people don't realise. Each one is shot 1 of a whole story.

Take Quiet Luxury London. It's not one café photo. It's the whole day. The arrival. The coffee run. The seated hero shot. The reel-cover walk-away. All from one selfie.

The Vault holds every one of those worlds, each a full shoot from start to finish. Still you in every frame, and a new world every time I shoot one.

No studio. No photographer. No perfect setup. One clear selfie and the direction does the rest.

It's $27, one time. Yours for good, every future drop included. And if anything snags, just reply. A real person reads it, usually me.

Get the Vault · $27 · one time:
${promptVaultUrl}

Start with one world. See where it goes.

Sandra x`

  return { html, text, subject }
}
