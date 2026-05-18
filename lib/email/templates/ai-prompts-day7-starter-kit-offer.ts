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

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If the prompts helped, this is the next step.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The SSELFIE Starter Kit gives you my simple selfie edit system, so you can get a clean photo before you ask AI to do anything with it.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#f0ede8;">SSELFIE Starter Kit — $37</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">Lightroom presets, quick edit steps, posing help, captions, and a 7-day content starter.</p>`,
      "The next step"
    )}
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">It is not a new app. It is the simple KIT I would give you if you asked, “Sandra, how do I make this selfie usable?”</p>
    <div style="margin:26px 0 20px;">${renderStoneButton("Get KIT", starterKitUrl)}</div>
    <p style="margin:0 0 10px;font-size:14px;line-height:1.7;color:#a8a49c;">If you want the full method later, the Masterclass is here: <a href="${masterclassUrl}" style="color:#f0ede8;text-decoration:underline;">see the Masterclass</a>.</p>
    <p style="margin:0;font-size:14px;line-height:1.7;color:#a8a49c;">If you want the AI studio too, start here: <a href="${studioUrl}" style="color:#f0ede8;text-decoration:underline;">see SSELFIE Studio</a>.</p>
  `

  const html = renderStoneShell({
    title: "Want the full edit system?",
    eyebrow: "KIT",
    subtitle: "The prompts help. The edit system makes the result easier to repeat.",
    bodyHtml,
    footerLead: "Start small. One clean selfie can carry a lot of content.",
    footerSignoff: "Sandra x",
  })

  const text = `Hi ${firstName},

If the prompts helped, this is the next step.

The SSELFIE Starter Kit gives you my simple selfie edit system, so you can get a clean photo before you ask AI to do anything with it.

SSELFIE Starter Kit - $37

Lightroom presets, quick edit steps, posing help, captions, and a 7-day content starter.

It is not a new app. It is the simple KIT I would give you if you asked, "Sandra, how do I make this selfie usable?"

Get KIT:
${starterKitUrl}

If you want the full method later, the Masterclass is here:
${masterclassUrl}

If you want the AI studio too, start here:
${studioUrl}

Sandra x`

  return { html, text, subject }
}
