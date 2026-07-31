import { buildRevenueEmailLink } from "./revenue-links"
import { promptVaultCheckoutUrl } from "./selfie-education-links"
import { renderStoneButton, renderStoneShell } from "./stone-email"

export interface AiPromptsDay9Params {
  firstName: string
  recipientEmail?: string | null
}

const EMAIL_TYPE = "ai-prompts-day9-prompt-vault-proof"

export function generateAiPromptsDay9PromptVaultProofEmail({
  recipientEmail,
}: AiPromptsDay9Params): {
  html: string
  text: string
  subject: string
} {
  const promptVaultUrl = buildRevenueEmailLink(promptVaultCheckoutUrl(), {
    campaign: "ai_prompts_day9",
    content: "prompt_vault_proof",
    medium: "nurture",
    emailType: EMAIL_TYPE,
    checkoutEmail: recipientEmail,
  })
  const subject = "is the Prompt Vault right for you?"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The Prompt Vault is a good fit if you liked trying the free prompts and you want more complete shoots without writing the prompts yourself.</p>
    <p style="margin:0 0 10px;font-size:16px;line-height:1.75;">You get:</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">• Every current Prompt Vault collection<br />• Complete photo sequences, not only one image<br />• An example photo for every prompt<br />• The new prompt drops I add later</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">It is a one-time $37 purchase. It is not a subscription.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You will still copy the prompts into ChatGPT yourself. If you enjoy that process and want more photos to create, this is the next step.</p>
    <div style="margin:26px 0 20px;">${renderStoneButton("Get the Prompt Vault · $37", promptVaultUrl)}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If not, keep the five free prompts. They are yours to use.</p>
    <p style="margin:0;font-size:16px;line-height:1.75;">Sandra x</p>
  `

  const html = renderStoneShell({
    title: "Is the Prompt Vault right for you?",
    eyebrow: "Prompt Vault",
    subtitle: "Here is exactly what you get and how it works.",
    bodyHtml,
    footerLead: "One payment. Complete shoots. You still create the photos in ChatGPT.",
    footerSignoff: "",
  })

  const text = `The Prompt Vault is a good fit if you liked trying the free prompts and you want more complete shoots without writing the prompts yourself.

You get:
- Every current Prompt Vault collection
- Complete photo sequences, not only one image
- An example photo for every prompt
- The new prompt drops I add later

It is a one-time $37 purchase. It is not a subscription.

You will still copy the prompts into ChatGPT yourself. If you enjoy that process and want more photos to create, this is the next step.

Get the Prompt Vault · $37:
${promptVaultUrl}

If not, keep the five free prompts. They are yours to use.

Sandra x`

  return { html, text, subject }
}
