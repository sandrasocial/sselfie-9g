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
  const subject = "the five free prompts are one photo from each shoot"
  const heroImage = {
    heroImageUrl:
      "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/content-kit/shoots/1784653608406-382550.png",
    heroImageAlt: "A warm editorial SSELFIE photo created with an AI photoshoot prompt.",
  }

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The five free prompts give you five different photos to try.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Inside the Prompt Vault, each of those photos belongs to a complete collection. That means you can create several images that look like they came from the same shoot, instead of stopping after one photo.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">That is the difference.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The free prompts are for trying the method. The Vault is for when you want the complete shoots and more photos to choose from.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">It is $37 once. You get every current collection, an example photo for every prompt, and the new prompt drops I add later.</p>
    <div style="margin:26px 0 20px;">${renderStoneButton("See the complete Prompt Vault · $37", promptVaultUrl)}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If the five free prompts are enough for you, keep using them. You do not need to buy anything today.</p>
    <p style="margin:0;font-size:16px;line-height:1.75;">Sandra x</p>
  `

  const html = renderStoneShell({
    title: "Want the rest of the shoot?",
    eyebrow: "Prompt Vault",
    subtitle: "The five free prompts are one photo from each complete collection.",
    bodyHtml,
    ...heroImage,
    footerLead: "Start with the free prompts. Choose the Vault when you want the complete shoots.",
    footerSignoff: "",
  })

  const text = `Hi ${firstName},

The five free prompts give you five different photos to try.

Inside the Prompt Vault, each of those photos belongs to a complete collection. That means you can create several images that look like they came from the same shoot, instead of stopping after one photo.

That is the difference.

The free prompts are for trying the method. The Vault is for when you want the complete shoots and more photos to choose from.

It is $37 once. You get every current collection, an example photo for every prompt, and the new prompt drops I add later.

See the complete Prompt Vault · $37:
${promptVaultUrl}

If the five free prompts are enough for you, keep using them. You do not need to buy anything today.

Sandra x`

  return { html, text, subject }
}
