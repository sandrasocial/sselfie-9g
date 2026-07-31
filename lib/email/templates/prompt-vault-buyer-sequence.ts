import { buildRevenueEmailLink } from "./revenue-links"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

interface PromptVaultBuyerEmailParams {
  firstName: string
  accessUrl: string
  recipientEmail?: string | null
}

export function generatePromptVaultDay2FirstResultEmail({
  firstName,
  accessUrl,
}: PromptVaultBuyerEmailParams): { html: string; text: string; subject: string } {
  const vaultUrl = buildRevenueEmailLink(accessUrl, {
    campaign: "prompt_vault_day2",
    content: "open_vault",
    emailType: "prompt-vault-day2-first-result",
  })
  const subject = "did you create your first Vault photo?"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Did you create your first photo from the Vault yet?</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If not, do not start by looking through everything. Choose the first photo that makes you think, I would use that.</p>
    ${renderStonePanel(
      `<p style="margin:0;font-size:15px;line-height:1.8;color:#5f5a52;">Open the Vault, tap Copy prompt, upload one clear selfie to ChatGPT, and paste the prompt. Try it once before you change any of the details.</p>`,
      "Your first photo"
    )}
    <div style="margin:26px 0 22px;">${renderStoneButton("Open my Prompt Vault", vaultUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">If the result did not feel like you, reply and tell me what changed. I&apos;ll help you work out what to try next.</p>
  `

  const html = renderStoneShell({
    title: "Did you create your first Vault photo?",
    eyebrow: "Prompt Vault",
    subtitle: "Choose one photo you love and start there.",
    bodyHtml,
    footerLead: "You do not need to use the whole Vault today.",
    footerSignoff: "Sandra x",
  })

  const text = `Hi ${firstName},

Did you create your first photo from the Vault yet?

If not, do not start by looking through everything. Choose the first photo that makes you think, I would use that.

Your first photo:
Open the Vault, tap Copy prompt, upload one clear selfie to ChatGPT, and paste the prompt. Try it once before you change any of the details.

Open my Prompt Vault:
${vaultUrl}

If the result did not feel like you, reply and tell me what changed. I'll help you work out what to try next.

Sandra x`

  return { html, text, subject }
}

export function generatePromptVaultDay5FixBadResultEmail({
  firstName,
  accessUrl,
}: PromptVaultBuyerEmailParams): { html: string; text: string; subject: string } {
  const vaultUrl = buildRevenueEmailLink(accessUrl, {
    campaign: "prompt_vault_day5",
    content: "open_vault",
    emailType: "prompt-vault-day5-fix-bad-result",
  })
  const subject = "if your photo did not feel like you"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If ChatGPT changed your face too much, try a different selfie before you change the prompt.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.8;color:#5f5a52;">Choose a clear photo in soft window light.</p>
       <p style="margin:0 0 10px;font-size:15px;line-height:1.8;color:#5f5a52;">Make sure your face is easy to see, without sunglasses, heavy shadow, blur, or an extreme angle.</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#5f5a52;">Then try the same prompt again so you can see what the new selfie changes.</p>`,
      "Try this first"
    )}
    <div style="margin:26px 0 22px;">${renderStoneButton("Open my Prompt Vault", vaultUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">AI can still get details wrong. Keep the photos that feel like you and try again when they do not.</p>
  `

  const html = renderStoneShell({
    title: "If your photo did not feel like you.",
    eyebrow: "Prompt Vault",
    subtitle: "Try a clearer selfie before you change the prompt.",
    bodyHtml,
    footerLead: "Reply if you want help working out what changed.",
    footerSignoff: "Sandra x",
  })

  const text = `Hi ${firstName},

If ChatGPT changed your face too much, try a different selfie before you change the prompt.

Try this first:
- Choose a clear photo in soft window light.
- Make sure your face is easy to see, without sunglasses, heavy shadow, blur, or an extreme angle.
- Then try the same prompt again so you can see what the new selfie changes.

Open my Prompt Vault:
${vaultUrl}

AI can still get details wrong. Keep the photos that feel like you and try again when they do not.

Sandra x`

  return { html, text, subject }
}

export function generatePromptVaultDay10NextShootEmail({
  firstName,
  accessUrl,
}: PromptVaultBuyerEmailParams): { html: string; text: string; subject: string } {
  const vaultUrl = buildRevenueEmailLink(accessUrl, {
    campaign: "prompt_vault_day10",
    content: "open_vault",
    emailType: "prompt-vault-day10-next-shoot",
  })
  const subject = "try one complete shoot next"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If you have tried a few single photos, choose one complete collection next.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Create three photos from the same shoot. They are designed to work together, so you will have more than one image to use without starting from scratch each time.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.8;color:#5f5a52;">Choose one collection that feels useful for what you are sharing now.</p>
       <p style="margin:0 0 10px;font-size:15px;line-height:1.8;color:#5f5a52;">Create the first three photos.</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#5f5a52;">Save the ones you would actually post.</p>`,
      "A simple way to use the Vault"
    )}
    <div style="margin:26px 0 22px;">${renderStoneButton("Choose my next shoot", vaultUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">Reply and tell me which collection you chose. I want to know what you are actually using.</p>
  `

  const html = renderStoneShell({
    title: "Try one complete shoot next.",
    eyebrow: "Prompt Vault",
    subtitle: "Create three photos that are designed to work together.",
    bodyHtml,
    footerLead: "One complete collection is more useful than ten unfinished ideas.",
    footerSignoff: "Sandra x",
  })

  const text = `Hi ${firstName},

If you have tried a few single photos, choose one complete collection next.

Create three photos from the same shoot. They are designed to work together, so you will have more than one image to use without starting from scratch each time.

A simple way to use the Vault:
- Choose one collection that feels useful for what you are sharing now.
- Create the first three photos.
- Save the ones you would actually post.

Choose my next shoot:
${vaultUrl}

Reply and tell me which collection you chose. I want to know what you are actually using.

Sandra x`

  return { html, text, subject }
}
