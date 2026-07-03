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
  const subject = "proof it still looks like you (not someone else)"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The question I get most about the Vault: "will it actually look like me, or some AI version of me?"</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Honest answer: it looks like you.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Every prompt starts the same way. It locks your face first. Your eyes, your features, your skin. The AI changes the room, the light, the mood. Not you. That's the whole point. AI should not erase you. It should frame you.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">And it's easier than you think. Three steps:<br />1. Open ChatGPT. Upload one clear selfie.<br />2. Paste the prompt.<br />3. That's it. Your photo's done in under two minutes.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">No app to learn. No photographer. No "tech girlie" required. If you can text, you can do this.</p>
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

Honest answer: it looks like you.

Every prompt starts the same way. It locks your face first. Your eyes, your features, your skin. The AI changes the room, the light, the mood. Not you. That's the whole point. AI should not erase you. It should frame you.

And it's easier than you think. Three steps:
1. Open ChatGPT. Upload one clear selfie.
2. Paste the prompt.
3. That's it. Your photo's done in under two minutes.

No app to learn. No photographer. No "tech girlie" required. If you can text, you can do this.

From a SSELFIE customer:
${TESTIMONIAL}

See the worlds · $37:
${promptVaultUrl}

Sandra x`

  return { html, text, subject }
}
