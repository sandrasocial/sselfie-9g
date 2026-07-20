import { getEmailHeroImage } from "../email-image-assets"
import { renderStoneButton, renderStoneShell } from "./stone-email"

export interface AiPromptsDay0DeliveryParams {
  firstName: string
  recipientEmail?: string
  accessUrl: string
}

export function generateAiPromptsDay0DeliveryEmail(params: AiPromptsDay0DeliveryParams): {
  html: string
  text: string
  subject: string
} {
  const { firstName, accessUrl } = params

  const subject = "your selfie prompts are here"
  const heroImage = getEmailHeroImage("prompt_pack_hero")

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Here they are. Your prompts are ready.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Open the page, pick a look, and you&apos;re set. Clean Editorial is the easiest place to start if you&apos;re not sure. Upload your selfie to ChatGPT, paste the prompt, let it run.</p>
    <div style="margin:26px 0 26px;">${renderStoneButton("Open my prompts", accessUrl)}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">One thing first, because it trips almost everyone up.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If your photo comes back looking a little plastic, check the original selfie before you change the prompt. Dark or harsh light gives the AI less useful information, and that is often when the result starts to drift.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Try a clear photo in soft window light. AI can still get details wrong, so check the result and run it again if it does not feel like you.</p>
    <p style="margin:0;font-size:16px;line-height:1.75;">Have fun with these. Reply and show me what you make. I read every message.</p>
  `

  const html = renderStoneShell({
    title: "your prompts are here",
    eyebrow: "SSELFIE",
    subtitle: "Plus the one thing that helps AI photos feel more like you.",
    bodyHtml,
    ...heroImage,
    footerLead: "Reply if you need me. I read every message.",
    footerSignoff: "Sandra x",
  })

  const text = `SSELFIE

Hi ${firstName},

Here they are. Your prompts are ready.

Open the page, pick a look, and you're set. Clean Editorial is the easiest place to start if you're not sure. Upload your selfie to ChatGPT, paste the prompt, let it run.

Open my prompts:
${accessUrl}

One thing first, because it trips almost everyone up.

If your photo comes back looking a little plastic, check the original selfie before you change the prompt. Dark or harsh light gives the AI less useful information, and that is often when the result starts to drift.

Try a clear photo in soft window light. AI can still get details wrong, so check the result and run it again if it does not feel like you.

Have fun with these. Reply and show me what you make. I read every message.

Sandra x`

  return { html, text, subject }
}
