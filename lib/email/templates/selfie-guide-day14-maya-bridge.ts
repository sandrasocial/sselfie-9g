import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"

export interface SelfieGuideDay14MayaBridgeParams {
  firstName?: string
  recipientEmail: string
  accessUrl: string
}

const SELFIE_METHOD_URL = "https://sselfie.ai/selfie-guide"

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
  const trackedCourseUrl = buildRevenueEmailLink(SELFIE_METHOD_URL, {
    campaign: "selfie_guide_day14_upsell",
    content: "selfie_method_checkout",
    source: "selfie_guide_day14_email",
  })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Two weeks in. Here is what I have seen happen with people who stick with this:</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The free guide gave you the foundations. Light, angles, how to stop avoiding the camera. But the women who see a real change are the ones who go deeper — the ones who learn the full system.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#f0ede8;">The Selfie Method — full course</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">Everything in the free guide, plus: advanced angles for every body type, the confidence framework I use before every shoot, how to turn one 20-minute session into a month of content, and the editing workflow that keeps photos looking like you — not filtered.</p>`,
      "What's inside",
    )}
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">It is €97. One time. No subscription.</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.75;">If you are ready to stop experimenting and actually have a repeatable system — this is it.</p>
    <div style="margin:26px 0 16px;">${renderStoneButton("Get The Selfie Method — €97", trackedCourseUrl)}</div>
    <p style="margin:0 0 4px;font-size:14px;line-height:1.7;text-align:center;"><a href="${trackedGuideUrl}" style="color:#a8a49c;text-decoration:underline;">Go back to the free guide &rarr;</a></p>
  `

  const html = renderStoneShell({
    title: "Ready to go further?",
    eyebrow: "Selfie Guide",
    subtitle: "The free guide started it. The full course finishes it.",
    bodyHtml,
    footerLead: "Reply if you have questions before buying. I read every one.",
    footerSignoff: "Sandra x",
  })

  const text = `Selfie Guide

Hi ${name},

Two weeks in. Here is what I have seen happen with people who stick with this:

The free guide gave you the foundations. Light, angles, how to stop avoiding the camera. But the women who see a real change are the ones who go deeper — the ones who learn the full system.

The Selfie Method — full course

Everything in the free guide, plus: advanced angles for every body type, the confidence framework I use before every shoot, how to turn one 20-minute session into a month of content, and the editing workflow that keeps photos looking like you — not filtered.

It is €97. One time. No subscription.

If you are ready to stop experimenting and actually have a repeatable system — this is it.

Get The Selfie Method — €97: ${trackedCourseUrl}

Go back to the free guide: ${trackedGuideUrl}

Reply if you have questions before buying. I read every one.
Sandra x`

  return {
    html,
    text,
    subject: "Two weeks in — here is what comes next",
  }
}
