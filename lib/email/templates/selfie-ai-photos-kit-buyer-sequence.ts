import { buildRevenueEmailLink } from "./revenue-links"
import { promptVaultCheckoutUrl } from "./selfie-education-links"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

interface SelfieAiPhotosKitBuyerEmailParams {
  firstName: string
  accessUrl: string
  recipientEmail?: string | null
}

function buildVaultBridgeUrl(recipientEmail?: string | null): string {
  const checkout = new URL(promptVaultCheckoutUrl())
  checkout.searchParams.set("checkout_source", "selfie_ai_photos_kit_nurture")
  checkout.searchParams.set("buyer_stage", "micro")
  checkout.searchParams.set("cta_keyword", "PROMPT")
  return buildRevenueEmailLink(checkout.toString(), {
    campaign: "selfie_ai_photos_kit_day4_vault_bridge",
    content: "kit_buyer_vault_offer",
    emailType: "selfie-ai-photos-kit-day4-vault-bridge",
    checkoutEmail: recipientEmail,
  })
}

export function generateSelfieAiPhotosKitDay2FirstPhotoEmail({
  firstName,
  accessUrl,
}: SelfieAiPhotosKitBuyerEmailParams): { html: string; text: string; subject: string } {
  const kitUrl = buildRevenueEmailLink(accessUrl, {
    campaign: "selfie_ai_photos_kit_day2",
    content: "open_kit",
    emailType: "selfie-ai-photos-kit-day2-first-photo",
  })
  const subject = "did you make your first AI photo?"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Quick check. Did you run your first prompt from the Kit yet?</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If not, here's the whole start: open the source selfie checklist, pick one clear selfie, and copy the first starter prompt.</p>
    ${renderStonePanel(
      `<p style="margin:0;font-size:15px;line-height:1.8;color:#5f5a52;">Open ChatGPT, upload your selfie, paste the prompt, and run it once before you change anything. The first result shows you what the AI is doing with your face and your light.</p>`,
      "First photo rule"
    )}
    <div style="margin:26px 0 22px;">${renderStoneButton("Open Your Kit", kitUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">If the result looked a little off, don't panic. The still-you fix prompts inside handle most of it. And you can always reply and tell me what happened.</p>
  `

  const html = renderStoneShell({
    title: "Did you make your first AI photo?",
    eyebrow: "Selfie To AI Photos Kit",
    subtitle: "One selfie. One prompt. One first photo.",
    bodyHtml,
    footerLead: "The first result is the one that teaches you the most.",
    footerSignoff: "Sandra x",
  })

  const text = `Hi ${firstName},

Quick check. Did you run your first prompt from the Kit yet?

If not, here's the whole start: open the source selfie checklist, pick one clear selfie, and copy the first starter prompt.

First photo rule:
Open ChatGPT, upload your selfie, paste the prompt, and run it once before you change anything. The first result shows you what the AI is doing with your face and your light.

Open your Kit:
${kitUrl}

If the result looked a little off, don't panic. The still-you fix prompts inside handle most of it. And you can always reply and tell me what happened.

Sandra x`

  return { html, text, subject }
}

export function generateSelfieAiPhotosKitDay4VaultBridgeEmail({
  firstName,
  accessUrl,
  recipientEmail,
}: SelfieAiPhotosKitBuyerEmailParams): { html: string; text: string; subject: string } {
  const vaultUrl = buildVaultBridgeUrl(recipientEmail)
  const kitUrl = buildRevenueEmailLink(accessUrl, {
    campaign: "selfie_ai_photos_kit_day4_vault_bridge",
    content: "open_kit",
    emailType: "selfie-ai-photos-kit-day4-vault-bridge",
  })
  const subject = "when one look isn't enough"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The Kit gives you your first AI photos. One selfie, a few starter prompts, a simple path.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If you caught yourself thinking "okay, this works, I want more looks", that's what the Prompt Vault is for.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">It's not a bigger folder of prompts. It's full collections. Each one is a complete visual world: the light, the outfits, the locations, the mood. And you stay you in every single one.</p>
    ${renderStonePanel(
      `<p style="margin:0;font-size:15px;line-height:1.8;color:#5f5a52;">Same selfie, same steps you already know from the Kit. You just get whole worlds to shoot in instead of single prompts. New collections keep getting added as I release them.</p>`,
      "How it works with your Kit"
    )}
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">It's $27.</p>
    <div style="margin:26px 0 16px;">${renderStoneButton("Get the Prompt Vault", vaultUrl)}</div>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#5f5a52;">Or keep practicing with your Kit first: <a href="${kitUrl}" style="color:#2c2924;text-decoration:underline;">open it here</a>.</p>
    <p style="margin:0;font-size:16px;line-height:1.75;">No rush. The Kit is enough for your first three photos. The Vault is for when you want a real library.</p>
  `

  const html = renderStoneShell({
    title: "When one look isn't enough.",
    eyebrow: "Prompt Vault",
    subtitle: "Whole visual worlds for the selfie you already have.",
    bodyHtml,
    footerLead: "Same selfie. Same steps. More worlds.",
    footerSignoff: "Sandra x",
  })

  const text = `Hi ${firstName},

The Kit gives you your first AI photos. One selfie, a few starter prompts, a simple path.

If you caught yourself thinking "okay, this works, I want more looks", that's what the Prompt Vault is for.

It's not a bigger folder of prompts. It's full collections. Each one is a complete visual world: the light, the outfits, the locations, the mood. And you stay you in every single one.

How it works with your Kit:
Same selfie, same steps you already know from the Kit. You just get whole worlds to shoot in instead of single prompts. New collections keep getting added as I release them.

It's $27.

Get the Prompt Vault:
${vaultUrl}

Or keep practicing with your Kit first:
${kitUrl}

No rush. The Kit is enough for your first three photos. The Vault is for when you want a real library.

Sandra x`

  return { html, text, subject }
}

export function generateSelfieAiPhotosKitDay8SuiteTrialEmail({
  firstName,
  claimUrl,
}: {
  firstName: string
  /** Personal trial claim link (/claim/[token]). */
  claimUrl: string
}): { html: string; text: string; subject: string } {
  const subject = "the faster way to do this"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">If you've made a photo or two from the Kit, you know the feeling. That little "oh, that's actually me" moment.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Here's the thing though. Doing it by hand works. But there's a faster way inside my Studio. Her name's Maya.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">She's the creative director I built. She knows every prompt and every world I've ever made. You pick a look, she pulls three concepts, your photos are done in minutes. They still look like you. Same promise, less work.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Try her free. 7 days in the SUITE, 20 photos on me. No card. Nothing turns into a charge. It just ends.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Your Kit stays yours either way.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("Claim your 7 days", claimUrl)}</div>
  `

  const html = renderStoneShell({
    title: "The faster way to do this.",
    eyebrow: "SSELFIE SUITE",
    subtitle: "You did it by hand. Maya does it with you.",
    bodyHtml,
    footerLead: "Your Kit stays yours either way.",
    footerSignoff: "Sandra x",
  })

  const text = `Hi ${firstName},

If you've made a photo or two from the Kit, you know the feeling. That little "oh, that's actually me" moment.

Here's the thing though. Doing it by hand works. But there's a faster way inside my Studio. Her name's Maya.

She's the creative director I built. She knows every prompt and every world I've ever made. You pick a look, she pulls three concepts, your photos are done in minutes. They still look like you. Same promise, less work.

Try her free. 7 days in the SUITE, 20 photos on me. No card. Nothing turns into a charge. It just ends.

Your Kit stays yours either way.

Claim your 7 days:
${claimUrl}

Sandra x`

  return { html, text, subject }
}
