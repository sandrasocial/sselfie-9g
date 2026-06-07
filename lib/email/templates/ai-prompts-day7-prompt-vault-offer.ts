import { getEmailHeroImage } from "../email-image-assets"
import { buildRevenueEmailLink } from "./revenue-links"
import { promptVaultCheckoutUrl } from "./selfie-education-links"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

export interface AiPromptsDay7Params {
  firstName: string
  recipientEmail?: string | null
}

const EMAIL_TYPE = "ai-prompts-day7-prompt-vault-offer"

export function generateAiPromptsDay7PromptVaultOfferEmail({ firstName, recipientEmail }: AiPromptsDay7Params): {
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
  const subject = "one prompt showed you the door"
  const heroImage = getEmailHeroImage("starter_kit_ai_ready_selfie")

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">That free prompt was not really about one AI photo.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">It was the door.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The moment you see one normal selfie turn into something that feels more polished, more visible, more like the woman you are becoming, your brain starts to understand what is possible.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The Prompt Vault gives you the full visual world, not just one prompt to try.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#2c2924;">Inside the Vault, you get complete copy-paste photoshoot directions for ChatGPT.</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#5f5a52;">Different collections. Different moods. Full shoot concepts you can use with your own selfie when you want your content to feel more intentional.</p>`,
      "What the Vault gives you"
    )}
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You do not need more random AI images. You need a direction you can recognize yourself inside.</p>
    <div style="margin:26px 0 20px;">${renderStoneButton("Get the Prompt Vault", promptVaultUrl)}</div>
    <p style="margin:0;font-size:14px;line-height:1.7;color:#7c766d;">Start with one collection. Use one clear selfie. Let it show you the visual world you want to step into.</p>
  `

  const html = renderStoneShell({
    title: "One prompt showed you the door.",
    eyebrow: "Prompt Vault",
    subtitle: "The Vault gives you the full visual world.",
    bodyHtml,
    ...heroImage,
    footerLead: "One selfie can become more than one photo. It can become a direction.",
    footerSignoff: "Sandra x",
  })

  const text = `Hi ${firstName},

That free prompt was not really about one AI photo.

It was the door.

The moment you see one normal selfie turn into something that feels more polished, more visible, more like the woman you are becoming, your brain starts to understand what is possible.

The Prompt Vault gives you the full visual world, not just one prompt to try.

Inside the Vault, you get complete copy-paste photoshoot directions for ChatGPT.

Different collections. Different moods. Full shoot concepts you can use with your own selfie when you want your content to feel more intentional.

You do not need more random AI images. You need a direction you can recognize yourself inside.

Get the Prompt Vault:
${promptVaultUrl}

Start with one collection. Use one clear selfie. Let it show you the visual world you want to step into.

Sandra x`

  return { html, text, subject }
}
