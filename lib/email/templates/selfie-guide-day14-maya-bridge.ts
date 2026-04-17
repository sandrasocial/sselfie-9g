import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"

export interface SelfieGuideDay14MayaBridgeParams {
  firstName?: string
  recipientEmail: string
  accessUrl: string
}

const BRAND_STRATEGY_URL = "https://sselfie.ai/checkout/brand-strategy-pack"

export function generateSelfieGuideDay14MayaBridgeEmail({
  firstName,
  recipientEmail,
  accessUrl,
}: SelfieGuideDay14MayaBridgeParams): {
  html: string
  text: string
  subject: string
} {
  const name = getFirstNameForEmail({ fullName: firstName, email: recipientEmail })
  const trackedGuideUrl = buildRevenueEmailLink(accessUrl, {
    campaign: "selfie_guide_day14_brand_strategy",
    content: "return_to_guide",
  })
  const trackedBrandStrategyUrl = buildRevenueEmailLink(BRAND_STRATEGY_URL, {
    campaign: "selfie_guide_day14_brand_strategy",
    content: "brand_strategy_checkout",
    source: "selfie_guide_day14_email",
  })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If the photo part is starting to feel easier, this is usually the next wall.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You have something to post. You just do not fully know what you want to say.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">That is what Brand Strategy Pack is for.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#f0ede8;">What it helps with:</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">Your message. Your pillars. The part of your brand that still feels blurry when you sit down to write. It gives you language you can actually build content from.</p>`,
      "Next Step",
    )}
    <p style="margin:0 0 24px;font-size:16px;line-height:1.75;">The guide helps you show your face. Brand Strategy Pack helps you stop second-guessing your voice.</p>
    <div style="margin:26px 0 16px;">${renderStoneButton("Add Brand Strategy Pack", trackedBrandStrategyUrl)}</div>
    <p style="margin:0 0 4px;font-size:14px;line-height:1.7;text-align:center;"><a href="${trackedGuideUrl}" style="color:#a8a49c;text-decoration:underline;">Go back to the guide first &rarr;</a></p>
  `

  const html = renderStoneShell({
    title: "The photo is not the hard part now.",
    eyebrow: "Selfie Guide",
    subtitle: "Usually the next thing that gets hard is the message.",
    bodyHtml,
    footerLead: "Reply if you want me to tell you whether this is the right next step.",
    footerSignoff: "Sandra x",
  })

  const text = `Selfie Guide

Hi ${name},

If the photo part is starting to feel easier, this is usually the next wall.

You have something to post. You just do not fully know what you want to say.

That is what Brand Strategy Pack is for.

What it helps with:

Your message. Your pillars. The part of your brand that still feels blurry when you sit down to write. It gives you language you can actually build content from.

The guide helps you show your face. Brand Strategy Pack helps you stop second-guessing your voice.

Add Brand Strategy Pack: ${trackedBrandStrategyUrl}

Go back to the guide first: ${trackedGuideUrl}

Reply if you want me to tell you whether this is the right next step.
Sandra x`

  return {
    html,
    text,
    subject: "The photo is not the hard part now",
  }
}
