import { buildRevenueEmailLink } from "./revenue-links"
import { promptVaultCheckoutUrl } from "./selfie-education-links"
import { renderStoneButton, renderStoneShell } from "./stone-email"

export interface AiPromptsDay1VaultBridgeParams {
  firstName: string
}

const EMAIL_TYPE = "ai-prompts-day1-vault-bridge"

export function generateAiPromptsDay1VaultBridgeEmail({
  firstName,
}: AiPromptsDay1VaultBridgeParams): { html: string; text: string; subject: string } {
  const promptVaultUrl = buildRevenueEmailLink(promptVaultCheckoutUrl(), {
    campaign: "ai_prompts_day1_vault_bridge",
    content: "get_full_vault",
    medium: "nurture",
    emailType: EMAIL_TYPE,
  })

  const subject = "did your photo come out?"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Did your selfie come out the way you hoped? When it works, that first image is a little bit magic.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Here&apos;s the honest thing: the free prompt was one look. The Vault is the full shoot. Every collection, every prompt, the example images so you&apos;re never guessing. Coastal, dark feminine, editorial, street. The ones people keep asking me for.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">One selfie. As many shoots as you want. It&apos;s a one-time $27, and you keep every new collection I add.</p>
    <div style="margin:26px 0 20px;">${renderStoneButton("Get the full Vault", promptVaultUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">If you loved the free one, you&apos;re going to lose it over the rest.</p>
  `

  const html = renderStoneShell({
    title: "Did your photo come out?",
    eyebrow: "AI Photoshoot Prompts",
    subtitle: "If you loved the free one, this is the rest of the shoot.",
    bodyHtml,
    footerLead: "One selfie. As many shoots as you want.",
    footerSignoff: "Sandra",
  })

  const text = `Hi ${firstName},

Did your selfie come out the way you hoped? When it works, that first image is a little bit magic.

Here's the honest thing: the free prompt was one look. The Vault is the full shoot. Every collection, every prompt, the example images so you're never guessing. Coastal, dark feminine, editorial, street. The ones people keep asking me for.

One selfie. As many shoots as you want. It's a one-time $27, and you keep every new collection I add.

Get the full Vault:
${promptVaultUrl}

If you loved the free one, you're going to lose it over the rest.

Sandra`

  return { html, text, subject }
}
