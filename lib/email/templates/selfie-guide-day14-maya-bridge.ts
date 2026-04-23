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
    campaign: "selfie_guide_day14_upsell",
    content: "return_to_guide",
  })
  const trackedStrategyUrl = buildRevenueEmailLink(BRAND_STRATEGY_URL, {
    campaign: "selfie_guide_day14_upsell",
    content: "brand_strategy_checkout",
    source: "selfie_guide_day14_email",
  })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Two weeks in. You have the light. You have the angle. You know how to show up on camera.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The next question is harder: what do you say around the photo?</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">What is your message? Who is it for? What makes someone stop scrolling when they see you?</p>
    ${renderStonePanel(
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#f0ede8;">Brand Strategy Pack — $19</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">Answer a short set of questions about who you are and who you serve. My AI builds your full brand strategy — your positioning, your content voice, your audience, your offer angle. Delivered as a personal document you keep forever.</p>`,
      "What it is",
    )}
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">It is $19. One time.</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.75;">Most people post good photos with nothing behind them. This is the thing that makes the photo mean something.</p>
    <div style="margin:26px 0 16px;">${renderStoneButton("Get Your Brand Strategy — $19", trackedStrategyUrl)}</div>
    <p style="margin:0 0 4px;font-size:14px;line-height:1.7;text-align:center;"><a href="${trackedGuideUrl}" style="color:#a8a49c;text-decoration:underline;">Go back to the free guide &rarr;</a></p>
  `

  const html = renderStoneShell({
    title: "The photo is done. Now what do you say?",
    eyebrow: "Selfie Guide",
    subtitle: "The guide taught you to show up. This teaches you what to say.",
    bodyHtml,
    footerLead: "Reply if you have questions. I read every one.",
    footerSignoff: "Sandra x",
  })

  const text = `Selfie Guide

Hi ${name},

Two weeks in. You have the light. You have the angle. You know how to show up on camera.

The next question is harder: what do you say around the photo?

What is your message? Who is it for? What makes someone stop scrolling when they see you?

Brand Strategy Pack — $19

Answer a short set of questions about who you are and who you serve. My AI builds your full brand strategy — your positioning, your content voice, your audience, your offer angle. Delivered as a personal document you keep forever.

It is $19. One time.

Most people post good photos with nothing behind them. This is the thing that makes the photo mean something.

Get Your Brand Strategy — $19: ${trackedStrategyUrl}

Go back to the free guide: ${trackedGuideUrl}

Reply if you have questions. I read every one.
Sandra x`

  return {
    html,
    text,
    subject: "Two weeks in — here is what comes next",
  }
}
