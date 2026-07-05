import { buildRevenueEmailLink } from "./revenue-links"
import { selfieAiPhotosKitCheckoutUrl } from "./selfie-education-links"
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
  const aiPhotosKitUrl = buildRevenueEmailLink(selfieAiPhotosKitCheckoutUrl(), {
    campaign: "ai_prompts_day1_ai_photos_kit_bridge",
    content: "get_ai_photos_kit",
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
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">But the next question is usually, "Okay, how do I actually make this work?"</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">That is what the AI Photos Kit is for. It shows you how to choose the right source selfie, create your first three AI photos, and fix the result if it starts looking fake or not like you.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Simple. Clear. Still you.</p>
    <div style="margin:26px 0 20px;">${renderStoneButton("Get the AI Photos Kit · $37", aiPhotosKitUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">Start with one clear selfie. I&apos;ll show you what to do next.</p>
  `

  const html = renderStoneShell({
    title: "You're not unphotogenic.",
    eyebrow: "AI Photoshoot Prompts",
    subtitle: "The problem was never you. It was the direction.",
    bodyHtml,
    footerLead: "One clear selfie. Three usable AI photos.",
    footerSignoff: "Sandra",
  })

  const text = `Hi ${firstName},

Can I tell you something most women never hear?

You're not unphotogenic. You never were.

The reason your photos never looked like the woman you feel like inside is simple. You had a phone and no direction. Nobody telling you the light, the angle, the world to step into.

That free prompt you copied was direction. One clear selfie, one look, and suddenly it's you. Still your face, still recognizable. Just finally framed right.

But the next question is usually, "Okay, how do I actually make this work?"

That is what the AI Photos Kit is for. It shows you how to choose the right source selfie, create your first three AI photos, and fix the result if it starts looking fake or not like you.

Simple. Clear. Still you.

Get the AI Photos Kit · $37:
${aiPhotosKitUrl}

Start with one clear selfie. I'll show you what to do next.

Sandra`

  return { html, text, subject }
}
