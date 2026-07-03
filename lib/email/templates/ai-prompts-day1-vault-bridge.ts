import { buildRevenueEmailLink } from "./revenue-links"
import { promptVaultCheckoutUrl } from "./selfie-education-links"
import { renderStoneButton, renderStoneShell } from "./stone-email"

export interface AiPromptsDay1VaultBridgeParams {
  firstName: string
  recipientEmail?: string | null
}

const EMAIL_TYPE = "ai-prompts-day1-vault-bridge"

export function generateAiPromptsDay1VaultBridgeEmail({
  firstName,
  recipientEmail,
}: AiPromptsDay1VaultBridgeParams): { html: string; text: string; subject: string } {
  const promptVaultUrl = buildRevenueEmailLink(promptVaultCheckoutUrl(), {
    campaign: "ai_prompts_day1_vault_bridge",
    content: "get_full_vault",
    medium: "nurture",
    emailType: EMAIL_TYPE,
    checkoutEmail: recipientEmail,
  })

  const subject = "you're not unphotogenic, babe"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Can I tell you something most women never hear?</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You&apos;re not unphotogenic. You never were.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The reason your photos never looked like the woman you feel like inside is simple. You had a phone and no direction. Nobody telling you the light, the angle, the world to step into.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">That free prompt you copied was direction. One clear selfie, one look, and suddenly it&apos;s you. Still your face, still recognizable. Just finally framed right.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The Vault is the rest of the directions. Coastal mornings, dark feminine, quiet luxury, editorial street. Every look is a full shoot, not one lucky photo. One selfie, as many shoots as you want.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">It&apos;s $37, one time, and every new collection I add lands in your vault for free.</p>
    <div style="margin:26px 0 20px;">${renderStoneButton("See the full Vault", promptVaultUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">You were always this woman. Now you&apos;ve got the direction to show her. 🤍</p>
  `

  const html = renderStoneShell({
    title: "You're not unphotogenic.",
    eyebrow: "AI Photoshoot Prompts",
    subtitle: "The problem was never you. It was the direction.",
    bodyHtml,
    footerLead: "One selfie. As many shoots as you want.",
    footerSignoff: "Sandra",
  })

  const text = `Hi ${firstName},

Can I tell you something most women never hear?

You're not unphotogenic. You never were.

The reason your photos never looked like the woman you feel like inside is simple. You had a phone and no direction. Nobody telling you the light, the angle, the world to step into.

That free prompt you copied was direction. One clear selfie, one look, and suddenly it's you. Still your face, still recognizable. Just finally framed right.

The Vault is the rest of the directions. Coastal mornings, dark feminine, quiet luxury, editorial street. Every look is a full shoot, not one lucky photo. One selfie, as many shoots as you want.

It's $37, one time, and every new collection I add lands in your vault for free.

See the full Vault:
${promptVaultUrl}

You were always this woman. Now you've got the direction to show her.

Sandra`

  return { html, text, subject }
}
