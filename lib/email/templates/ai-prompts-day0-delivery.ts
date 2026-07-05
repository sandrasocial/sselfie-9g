import { getEmailHeroImage } from "../email-image-assets"
import { renderStoneButton, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"
import { selfieAiPhotosKitCheckoutUrl } from "./selfie-education-links"

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
  const aiPhotosKitUrl = new URL(buildRevenueEmailLink(selfieAiPhotosKitCheckoutUrl(), {
    campaign: "ai_prompts_to_selfie_ai_photos_kit",
    medium: "ai_prompts_day0",
    emailType: "ai_prompts_delivery",
    checkoutEmail: params.recipientEmail,
  }))

  aiPhotosKitUrl.searchParams.set("checkout_source", "ai_prompts_day0_ai_photos_kit_bridge")
  aiPhotosKitUrl.searchParams.set("cta_keyword", "first_ai_photos_after_free_prompt")
  aiPhotosKitUrl.searchParams.set("buyer_stage", "lead")

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Here they are. Your prompts are ready.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Open the page, pick a look, and you&apos;re set. The Clean Editorial one is the easiest place to start if you&apos;re not sure where to begin. Just upload your selfie to ChatGPT, paste the prompt, and let it run.</p>
    <div style="margin:26px 0 26px;">${renderStoneButton("Open my prompts", accessUrl)}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">One quick thing first, because it trips almost everyone up:</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If your photo comes back looking a little plastic or fake, it&apos;s almost never the AI. It&apos;s the lighting in your original selfie. When the light is dark or harsh, the AI gets bad information and starts guessing, and that&apos;s when skin goes waxy.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The fix is simple. Start with a clearer, better-lit photo. That one change does more than any prompt ever will.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If you want the step-by-step version, start with the AI Photos Kit. It shows you how to choose the right selfie, create your first three AI photos, and fix the result if it starts looking fake.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Not a huge course. Just the next clear step after the free prompts.</p>
    <div style="margin:26px 0 26px;">${renderStoneButton("Get the AI Photos Kit · $37", aiPhotosKitUrl.toString(), "outline")}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">Have fun with these. Reply and show me what you make. I read every message.</p>
  `

  const html = renderStoneShell({
    title: "your prompts are here",
    eyebrow: "SSELFIE",
    subtitle: "Plus the one thing that makes AI photos actually look real.",
    bodyHtml,
    ...heroImage,
    footerLead: "Reply if you need me. I read every message.",
    footerSignoff: "Sandra x",
  })

  const text = `SSELFIE

Hi ${firstName},

Here they are. Your prompts are ready.

Open the page, pick a look, and you're set. The Clean Editorial one is the easiest place to start if you're not sure where to begin. Just upload your selfie to ChatGPT, paste the prompt, and let it run.

Open my prompts:
${accessUrl}

One quick thing first, because it trips almost everyone up:

If your photo comes back looking a little plastic or fake, it's almost never the AI. It's the lighting in your original selfie. When the light is dark or harsh, the AI gets bad information and starts guessing, and that's when skin goes waxy.

The fix is simple. Start with a clearer, better-lit photo. That one change does more than any prompt ever will.

If you want the step-by-step version, start with the AI Photos Kit. It shows you how to choose the right selfie, create your first three AI photos, and fix the result if it starts looking fake.

Not a huge course. Just the next clear step after the free prompts.

Get the AI Photos Kit · $37:
${aiPhotosKitUrl.toString()}

Have fun with these. Reply and show me what you make. I read every message.

Sandra x`

  return { html, text, subject }
}
