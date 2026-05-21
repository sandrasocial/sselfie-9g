import { getEmailHeroImage } from "../email-image-assets"
import { buildRevenueEmailLink } from "./revenue-links"
import {
  masterclassLandingUrl,
  starterKitLandingUrl,
  studioLandingUrl,
} from "./selfie-education-links"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

export interface AiPromptsDay7Params {
  firstName: string
}

export function generateAiPromptsDay7StarterKitOfferEmail({ firstName }: AiPromptsDay7Params): {
  html: string
  text: string
  subject: string
} {
  const starterKitUrl = buildRevenueEmailLink(starterKitLandingUrl(), {
    campaign: "ai_prompts_day7",
    content: "starter_kit_offer",
    medium: "nurture",
    emailType: "ai-prompts-day7-starter-kit-offer",
  })
  const masterclassUrl = buildRevenueEmailLink(masterclassLandingUrl(), {
    campaign: "ai_prompts_day7",
    content: "masterclass_soft_bridge",
    emailType: "ai-prompts-day7-starter-kit-offer",
  })
  const studioUrl = buildRevenueEmailLink(studioLandingUrl(), {
    campaign: "ai_prompts_day7",
    content: "studio_soft_bridge",
    emailType: "ai-prompts-day7-starter-kit-offer",
  })

  const subject = "Want my full selfie edit system?"
  const heroImage = getEmailHeroImage("starter_kit_ai_ready_selfie")

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If the prompts helped, this is the next step.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Your AI photos are only as good as the selfie you start with.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">That is why the Starter Kit starts before the prompt. It helps you take, edit, pose, and use cleaner phone photos so your AI visuals stop looking random, fake, or unfinished.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#2c2924;">SSELFIE Starter Kit - $37</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#5f5a52;">16 presets, selfie guide, posing and editing help, caption templates, and a 7-day content starter.</p>`,
      "The next step"
    )}
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">It is the first layer of cinematic personal brand content. Better input photos. Better edits. Better prompts. Better posts.</p>
    <div style="margin:26px 0 20px;">${renderStoneButton("Get KIT", starterKitUrl)}</div>
    <p style="margin:0 0 10px;font-size:14px;line-height:1.7;color:#7c766d;">If you want the full method later, the Masterclass is here: <a href="${masterclassUrl}" style="color:#2c2924;text-decoration:underline;">see the Masterclass</a>.</p>
    <p style="margin:0;font-size:14px;line-height:1.7;color:#7c766d;">If you want the AI studio too, start here: <a href="${studioUrl}" style="color:#2c2924;text-decoration:underline;">see SSELFIE Studio</a>.</p>
  `

  const html = renderStoneShell({
    title: "Want the photo to look better first?",
    eyebrow: "KIT",
    subtitle: "The prompt helps. The starting selfie matters more than most people think.",
    bodyHtml,
    ...heroImage,
    footerLead: "Start small. One clean selfie can carry a lot of content.",
    footerSignoff: "Sandra x",
  })

  const text = `Hi ${firstName},

If the prompts helped, this is the next step.

Your AI photos are only as good as the selfie you start with.

That is why the Starter Kit starts before the prompt. It helps you take, edit, pose, and use cleaner phone photos so your AI visuals stop looking random, fake, or unfinished.

SSELFIE Starter Kit - $37

16 presets, selfie guide, posing and editing help, caption templates, and a 7-day content starter.

It is the first layer of cinematic personal brand content. Better input photos. Better edits. Better prompts. Better posts.

Get KIT:
${starterKitUrl}

If you want the full method later, the Masterclass is here:
${masterclassUrl}

If you want the AI studio too, start here:
${studioUrl}

Sandra x`

  return { html, text, subject }
}
