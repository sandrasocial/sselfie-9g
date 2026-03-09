import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

export interface SelfieGuidePaidDeliveryParams {
  firstName: string
  email: string
  accessUrl: string
  presetPackUrl?: string
  passwordSetupLink?: string
}

export const SELFIE_GUIDE_PAID_DELIVERY_SUBJECT = "Your Selfie Guide is ready — access inside"

export function generateSelfieGuidePaidDeliveryEmail(params: SelfieGuidePaidDeliveryParams): {
  html: string
  text: string
  subject: string
} {
  const { firstName, email, accessUrl, presetPackUrl, passwordSetupLink } = params
  const name = getFirstNameForEmail({ fullName: firstName, email })

  const guidePanel = renderStonePanel(
    `<p style="margin:0 0 10px;font-size:15px;line-height:1.75;color:#f0ede8;">Inside, I'll walk you through the exact selfie system I use when I want brand photos that feel polished, calm, and real.</p>
     <p style="margin:0;font-size:15px;line-height:1.75;color:#a8a49c;">No expensive setup. No fake confidence. Just your phone, the right light, and a simple structure you can repeat.</p>`,
    "What You'll Open",
  )

  const presetPackBlock = presetPackUrl
    ? renderStonePanel(
        `<p style="margin:0 0 12px;font-size:15px;line-height:1.75;color:#f0ede8;">Your preset pack is here too, so everything lives in one place.</p>
         <div>${renderStoneButton("Open the preset pack", presetPackUrl, "outline")}</div>`,
        "Bonus",
      )
    : ""

  const passwordBlock = passwordSetupLink
    ? renderStonePanel(
        `<p style="margin:0 0 12px;font-size:15px;line-height:1.75;color:#f0ede8;">I also created your SSELFIE account so you can come back anytime. Set your password once and you're in.</p>
         <div>${renderStoneButton("Set your password", passwordSetupLink, "outline")}</div>`,
        "Your Account",
      )
    : ""

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Thank you for buying the Selfie Guide.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">It's ready for you now. This is the framework I built when I needed better brand photos without making it a whole production.</p>
    ${guidePanel}
    <div style="margin:26px 0 22px;">${renderStoneButton("Open your Selfie Guide", accessUrl)}</div>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.75;color:#a8a49c;">Start with chapter one. Then take one new photo today while it's fresh.</p>
    ${presetPackBlock}
    ${passwordBlock}
    ${renderStonePanel(
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.75;color:#f0ede8;">If you want Maya to help you turn your selfies into a full content system after this, Studio is where that happens.</p>
       <div>${renderStoneButton("See Studio", "https://sselfie.ai/checkout/membership", "outline")}</div>`,
      "Want More Support?",
    )}
  `

  const html = renderStoneShell({
    title: "Your Selfie Guide is ready",
    eyebrow: "Purchase Confirmed",
    subtitle: "Access is live. Start simple and make your first photo today.",
    bodyHtml,
  })

  const text = `Purchase Confirmed

Hey ${name},

Thank you for buying the Selfie Guide.

It's ready for you now. This is the framework I built when I needed better brand photos without making it a whole production.

Open your Selfie Guide: ${accessUrl}

Start with chapter one. Then take one new photo today while it's fresh.

${
    presetPackUrl
      ? `Your preset pack is here too: ${presetPackUrl}

`
      : ""
  }${
    passwordSetupLink
      ? `Set your password so you can come back anytime: ${passwordSetupLink}

`
      : ""
  }If you want Maya to help you turn your selfies into a full content system after this, Studio is here: https://sselfie.ai/checkout/membership

Reply if you need me. I read every message.
Sandra`

  return {
    html,
    text,
    subject: SELFIE_GUIDE_PAID_DELIVERY_SUBJECT,
  }
}
