import { buildRevenueEmailLink } from "./revenue-links"
import { promptVaultCheckoutUrl } from "./selfie-education-links"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

export interface AiPromptsDay9Params {
  firstName: string
  recipientEmail?: string | null
}

const EMAIL_TYPE = "ai-prompts-day9-prompt-vault-proof"
const TESTIMONIAL = `"I am blown away. I'm so picky it's not even funny. But this? My God."`

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
  const subject = "will it still look like me?"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The question I get most about the Vault: "will it actually look like me, or some AI version of me?"</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The honest answer is that AI can get details wrong. A clear selfie and consistent direction give it more to work with, but you should still check every result.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The aim is not a different face. It is a photo where you still recognize yourself, in a setting you could not easily create alone.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The process is simple:<br />1. Open ChatGPT and upload one clear selfie.<br />2. Paste the prompt.<br />3. Check the result. Keep it if it feels like you. Try again if it does not.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.7;">From a SSELFIE customer:</p>
       <p style="margin:0;font-size:17px;line-height:1.7;font-style:italic;">${TESTIMONIAL}</p>`,
      "Proof"
    )}
    <div style="margin:26px 0 20px;">${renderStoneButton("See the worlds · $37", promptVaultUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">Sandra x</p>
  `

  const html = renderStoneShell({
    title: "Will it actually look like me?",
    eyebrow: "Prompt Vault",
    subtitle: "It's still you. That is the point.",
    bodyHtml,
    footerLead: "AI should not erase you. It should frame you.",
    footerSignoff: "",
  })

  const text = `The question I get most about the Vault: "will it actually look like me, or some AI version of me?"

The honest answer is that AI can get details wrong. A clear selfie and consistent direction give it more to work with, but you should still check every result.

The aim is not a different face. It is a photo where you still recognize yourself, in a setting you could not easily create alone.

The process is simple:
1. Open ChatGPT and upload one clear selfie.
2. Paste the prompt.
3. Check the result. Keep it if it feels like you. Try again if it does not.

From a SSELFIE customer:
${TESTIMONIAL}

See the worlds · $37:
${promptVaultUrl}

Sandra x`

  return { html, text, subject }
}
