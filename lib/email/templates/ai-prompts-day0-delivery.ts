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

  const subject = "your five prompts are here"
  const heroImage = {
    heroImageUrl:
      "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/content-kit/shoots/1784653608406-382550.png",
    heroImageAlt: "A warm editorial SSELFIE photo created with an AI photoshoot prompt.",
  }

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Your five free prompts are ready.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Open the page and choose the photo you would love to create. Tap Copy prompt, upload one clear selfie to ChatGPT, and paste the prompt.</p>
    <div style="margin:26px 0 26px;">${renderStoneButton("Open my five prompts", accessUrl)}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You do not need to try all five today. Start with the photo you love most.</p>
    <p style="margin:0;font-size:16px;line-height:1.75;">If the result does not feel like you, reply and tell me what changed. I read every message.</p>
  `

  const html = renderStoneShell({
    title: "Your five prompts are here.",
    eyebrow: "SSELFIE",
    subtitle: "Choose one photo you love and try it with your own selfie.",
    bodyHtml,
    ...heroImage,
    footerLead: "Reply if you need help.",
    footerSignoff: "Sandra x",
  })

  const text = `SSELFIE

Hi ${firstName},

Your five free prompts are ready.

Open the page and choose the photo you would love to create. Tap Copy prompt, upload one clear selfie to ChatGPT, and paste the prompt.

Open my five prompts:
${accessUrl}

You do not need to try all five today. Start with the photo you love most.

If the result does not feel like you, reply and tell me what changed. I read every message.

Sandra x`

  return { html, text, subject }
}
