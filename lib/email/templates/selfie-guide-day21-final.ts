import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStoneShell } from "./stone-email"

export interface SelfieGuideDay21FinalParams {
  firstName?: string
  recipientEmail: string
  accessUrl: string
  expiryDate: string
}

const STUDIO_CHECKOUT_URL = "https://sselfie.ai/checkout/membership?bonus=4credits"

export function generateSelfieGuideDay21FinalEmail({
  firstName,
  recipientEmail,
  accessUrl,
  expiryDate,
}: SelfieGuideDay21FinalParams): {
  html: string
  text: string
  subject: string
} {
  const name = getFirstNameForEmail({ fullName: firstName, email: recipientEmail })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Three weeks since you got the guide.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">I hope you've taken the selfie. I hope you even posted it.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">But if you haven't — if the guide is still sitting there, half-read — I'm not going to make you feel bad about that.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">What I will say is this:</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The women who actually build an audience aren't the ones who learn everything first. They're the ones who start before they're ready and figure it out as they go.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">One selfie. Posted. Imperfectly. Consistently.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">That's the whole system.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If you want the "consistently" part handled for you — so you always have content even on the days when you have nothing — that's exactly what Studio is for.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Join this week and I'll make sure you get 4 bonus credits instead of the usual 2. That's two full AI photo sessions on me.</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.75;">The offer's good until ${expiryDate}.</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("Join Studio with 4 Bonus Credits", STUDIO_CHECKOUT_URL)}</div>
  `

  const html = renderStoneShell({
    title: "Three weeks in.",
    eyebrow: "Selfie Guide",
    subtitle: "One thing I want you to see.",
    bodyHtml,
    footerLead: "Reply if you want to talk it through before you decide.",
    footerSignoff: "Sandra x",
  })

  const text = `Selfie Guide

Hi ${name},

Three weeks since you got the guide.

I hope you've taken the selfie. I hope you even posted it.

But if you haven't — if the guide is still sitting there, half-read — I'm not going to make you feel bad about that.

What I will say is this:

The women who actually build an audience aren't the ones who learn everything first. They're the ones who start before they're ready and figure it out as they go.

One selfie. Posted. Imperfectly. Consistently.

That's the whole system.

If you want the "consistently" part handled for you — so you always have content even on the days when you have nothing — that's exactly what Studio is for.

Join this week and I'll make sure you get 4 bonus credits instead of the usual 2. That's two full AI photo sessions on me.

The offer's good until ${expiryDate}.

Join Studio with 4 Bonus Credits: ${STUDIO_CHECKOUT_URL}

Reply if you want to talk it through before you decide.
Sandra x`

  return {
    html,
    text,
    subject: "Three weeks in. One thing I want you to see.",
  }
}
