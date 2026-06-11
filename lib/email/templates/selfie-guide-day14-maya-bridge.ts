import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"
import { starterKitCheckoutUrl } from "./selfie-education-links"

export interface SelfieGuideDay14MayaBridgeParams {
  firstName?: string
  recipientEmail: string
  accessUrl: string
}

const STARTER_KIT_URL = starterKitCheckoutUrl()

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
  const trackedStarterKitUrl = buildRevenueEmailLink(STARTER_KIT_URL, {
    campaign: "selfie_guide_day14_upsell",
    content: "starter_kit_checkout",
    source: "selfie_guide_day14_email",
  })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Two weeks in. You probably know what still feels off.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The light is better. The angle is better. Then the edit goes too far. Or not far enough.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">That is what the Starter Kit is for.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#f0ede8;">Starter Kit · $37</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">Presets, the guide, and a quick-start so you can stop fighting one photo and get a result faster.</p>`,
      "The next step",
    )}
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">It is $37. One time.</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.75;">If the free guide gave you the basics, this gives you the first clean result to build from.</p>
    <div style="margin:26px 0 16px;">${renderStoneButton("Get the Starter Kit · $37", trackedStarterKitUrl)}</div>
    <p style="margin:0 0 4px;font-size:14px;line-height:1.7;text-align:center;"><a href="${trackedGuideUrl}" style="color:#a8a49c;text-decoration:underline;">Go back to the free guide &rarr;</a></p>
  `

  const html = renderStoneShell({
    title: "You have the basics. Now get the baseline.",
    eyebrow: "Selfie Guide",
    subtitle: "The free guide gets you started. The Starter Kit helps you repeat it.",
    bodyHtml,
    footerLead: "Reply if you have questions. I read every one.",
    footerSignoff: "Sandra x",
  })

  const text = `Selfie Guide

Hi ${name},

Two weeks in. You probably know what still feels off.

The light is better. The angle is better. Then the edit goes too far. Or not far enough.

Starter Kit · $37

Presets, the guide, and a quick-start so you can stop fighting one photo and get a result faster.

It is $37. One time.

Get The Starter Kit · $37: ${trackedStarterKitUrl}

Go back to the free guide: ${trackedGuideUrl}

Reply if you have questions. I read every one.
Sandra x`

  return {
    html,
    text,
    subject: "you probably know what still feels off",
  }
}
