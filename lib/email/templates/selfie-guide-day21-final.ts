import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"

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
  const trackedStudioUrl = buildRevenueEmailLink(STUDIO_CHECKOUT_URL, {
    campaign: "selfie_guide_day21_studio",
    content: "studio_checkout_bonus",
    source: "selfie_guide_day21_email",
  })
  const trackedGuideUrl = buildRevenueEmailLink(accessUrl, {
    campaign: "selfie_guide_day21_studio",
    content: "return_to_guide",
  })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Maybe you did not need more time.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Maybe you needed less pressure. Less starting over. Less having to become the whole system by yourself every single time.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">That is the real job of Studio.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Not to make you more motivated. To make it easier to keep showing up when motivation is gone.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If you join this week, I&apos;ll keep the 4 bonus credits offer open for you until ${expiryDate}.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">That gives you room to test the system with your own face, your own brand, and your own content rhythm.</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.75;">The offer&apos;s good until ${expiryDate}.</p>
    <div style="margin:26px 0 14px;">${renderStoneButton("Join Studio with 4 Bonus Credits", trackedStudioUrl)}</div>
    <p style="margin:0;font-size:14px;line-height:1.7;text-align:center;"><a href="${trackedGuideUrl}" style="color:#a8a49c;text-decoration:underline;">Need to go back to the guide first? That&apos;s fine.</a></p>
  `

  const html = renderStoneShell({
    title: "Three weeks in.",
    eyebrow: "Selfie Guide",
    subtitle: "This is the part about staying visible when life gets loud.",
    bodyHtml,
    footerLead: "Reply if you want to talk it through before you decide.",
    footerSignoff: "Sandra x",
  })

  const text = `Selfie Guide

Hi ${name},

Maybe you did not need more time.

Maybe you needed less pressure. Less starting over. Less having to become the whole system by yourself every single time.

That is the real job of Studio.

Not to make you more motivated. To make it easier to keep showing up when motivation is gone.

If you join this week, I'll keep the 4 bonus credits offer open for you until ${expiryDate}.

That gives you room to test the system with your own face, your own brand, and your own content rhythm.

The offer's good until ${expiryDate}.

Join Studio with 4 Bonus Credits: ${trackedStudioUrl}

Need to go back to the guide first? ${trackedGuideUrl}

Reply if you want to talk it through before you decide.
Sandra x`

  return {
    html,
    text,
    subject: "Maybe you did not need more time",
  }
}
