import { buildRevenueEmailLink } from "./revenue-links"
import { promptVaultCheckoutUrl } from "./selfie-education-links"
import { renderStoneButton, renderStoneShell } from "./stone-email"

export interface AiPromptsDay5Params {
  firstName: string
  accessUrl: string
  recipientEmail?: string | null
}

export function generateAiPromptsDay5EditMakesPostableEmail({
  firstName,
  accessUrl,
  recipientEmail,
}: AiPromptsDay5Params): { html: string; text: string; subject: string } {
  const promptPackUrl = buildRevenueEmailLink(accessUrl, {
    campaign: "ai_prompts_day5",
    content: "open_prompt_pack",
    emailType: "ai-prompts-day5-edit-makes-postable",
  })
  const promptVaultUrl = buildRevenueEmailLink(promptVaultCheckoutUrl(), {
    campaign: "ai_prompts_day5",
    content: "prompt_vault_after_fix",
    medium: "nurture",
    emailType: "ai-prompts-day5-edit-makes-postable",
    checkoutEmail: recipientEmail ?? undefined,
  })
  const subject = "if the AI result looked strange"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If the AI result looked strange, don&apos;t throw the prompt out yet.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">A weird result can start with the original photo. Blurry light, heavy shadow, sunglasses, or a difficult angle can give ChatGPT less to work with.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Try one clean selfie in soft window light. Paste the anchor line first, then paste the look you want.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Run it once. If your face still drifts, reply and tell me what changed.</p>
    <div style="margin:26px 0 20px;">${renderStoneButton("Open my prompts", promptPackUrl)}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If one look showed you what is possible and you want the rest of the shoot, the Prompt Vault is the next step. It gives you full visual worlds to work through, not another course to finish.</p>
    <div style="margin:0 0 8px;">${renderStoneButton("See the Prompt Vault · $37", promptVaultUrl)}</div>
  `

  const html = renderStoneShell({
    title: "Fix the weird result.",
    eyebrow: "AI Prompts",
    subtitle: "Try a cleaner source photo before you change the prompt.",
    bodyHtml,
    footerLead: "The goal is one photo that still looks like you.",
    footerSignoff: "Sandra x",
  })

  const text = `Hi ${firstName},

If the AI result looked strange, don't throw the prompt out yet.

A weird result can start with the original photo. Blurry light, heavy shadow, sunglasses, or a difficult angle can give ChatGPT less to work with.

Try one clean selfie in soft window light. Paste the anchor line first, then paste the look you want.

Run it once. If your face still drifts, reply and tell me what changed.

Open my prompts:
${promptPackUrl}

If one look showed you what is possible and you want the rest of the shoot, the Prompt Vault is the next step. It gives you full visual worlds to work through, not another course to finish.

See the Prompt Vault · $37:
${promptVaultUrl}

Sandra x`

  return { html, text, subject }
}
