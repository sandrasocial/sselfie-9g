import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

export interface SelfieGuideDay14MayaBridgeParams {
  firstName?: string
  recipientEmail: string
  accessUrl: string
}

const STUDIO_CHECKOUT_URL = "https://sselfie.ai/checkout/membership"

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

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You've had the guide for two weeks.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">By now, you've probably taken at least one selfie you actually liked. Maybe more.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">I want to show you what happens next.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The guide taught you how to take the photo. Maya takes that photo and turns it into a full visual brand.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Not stock photos. Not someone else's face. Yours. In any setting, any mood, any aesthetic — in under 10 minutes.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#f0ede8;">Here's what that looks like in practice:</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">You take the window light selfie you practiced in Part 2.<br />You upload it to Maya.<br />You type: "editorial portrait, warm studio light, minimal background."<br />Twenty minutes later, you have 20 professional brand photos — all with your face, all consistent, all ready to post.</p>`,
      "Maya in action",
    )}
    <p style="margin:0 0 24px;font-size:16px;line-height:1.75;">That's a month of content from one selfie. As a guide buyer, your first two photos are free when you sign up.</p>
    <div style="margin:26px 0 16px;">${renderStoneButton("Try Maya in Studio", STUDIO_CHECKOUT_URL)}</div>
    <p style="margin:0 0 4px;font-size:14px;line-height:1.7;text-align:center;"><a href="${accessUrl}" style="color:#a8a49c;text-decoration:underline;">See how Maya works first &rarr;</a></p>
  `

  const html = renderStoneShell({
    title: "Here's what happens after the selfie.",
    eyebrow: "Selfie Guide",
    subtitle: "The guide taught you how. Maya takes it from here.",
    bodyHtml,
    footerLead: "Reply if you have questions about Studio. I'll give you an honest answer.",
    footerSignoff: "Sandra x",
  })

  const text = `Selfie Guide

Hi ${name},

You've had the guide for two weeks.

By now, you've probably taken at least one selfie you actually liked. Maybe more.

I want to show you what happens next.

The guide taught you how to take the photo. Maya takes that photo and turns it into a full visual brand.

Not stock photos. Not someone else's face. Yours. In any setting, any mood, any aesthetic — in under 10 minutes.

Here's what that looks like in practice:

You take the window light selfie you practiced in Part 2.
You upload it to Maya.
You type: "editorial portrait, warm studio light, minimal background."
Twenty minutes later, you have 20 professional brand photos — all with your face, all consistent, all ready to post.

That's a month of content from one selfie. As a guide buyer, your first two photos are free when you sign up.

Try Maya in Studio: ${STUDIO_CHECKOUT_URL}

See how Maya works first: ${accessUrl}

Reply if you have questions about Studio. I'll give you an honest answer.
Sandra x`

  return {
    html,
    text,
    subject: "Here's what happens after the selfie",
  }
}
