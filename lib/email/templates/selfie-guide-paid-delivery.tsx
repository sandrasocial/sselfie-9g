import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

export interface SelfieGuidePaidDeliveryParams {
  firstName: string
  email: string
  accessUrl: string
  passwordSetupLink?: string
}

export const SELFIE_GUIDE_PAID_DELIVERY_SUBJECT = "Your First Visible Post Guide is ready"

export function generateSelfieGuidePaidDeliveryEmail(params: SelfieGuidePaidDeliveryParams): {
  html: string
  text: string
  subject: string
} {
  const { firstName, email, accessUrl, passwordSetupLink } = params
  const name = getFirstNameForEmail({ fullName: firstName, email })

  const guidePanel = renderStonePanel(
    `<p style="margin:0 0 10px;font-size:15px;line-height:1.75;color:#f0ede8;">Inside, I'll walk you through the phone photo basics and the content step that makes the photo useful.</p>
     <p style="margin:0;font-size:15px;line-height:1.75;color:#a8a49c;">Your first win is simple: one photo you would actually post, one caption idea, and one clear job for that post.</p>`,
    "What You'll Open",
  )

  const passwordBlock = passwordSetupLink
    ? renderStonePanel(
        `<p style="margin:0 0 12px;font-size:15px;line-height:1.75;color:#f0ede8;">I also created your SSELFIE account so you can come back anytime. Set your password once and you're in.</p>
         <div>${renderStoneButton("Set your password", passwordSetupLink, "outline")}</div>`,
        "Your Account",
      )
    : ""

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Thank you for buying the guide.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">It's ready for you now. This is the first step in the SSELFIE path: take one phone photo and turn it into a post that says something.</p>
    ${guidePanel}
    <div style="margin:26px 0 22px;">${renderStoneButton("Open your guide", accessUrl)}</div>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.75;color:#a8a49c;">Start with the first part in the sidebar. Then take one new photo today, choose its content job, and write the simplest caption you can actually post.</p>
    ${passwordBlock}
    ${renderStonePanel(
      `<p style="margin:0 0 12px;font-size:15px;line-height:1.75;color:#f0ede8;">If you want the next practical step, the Starter Kit gives you the presets, quick-start workflow, and a simple 7-day content starter.</p>
       <div>${renderStoneButton("See the Starter Kit", "https://www.sselfie.ai/starter-kit", "outline")}</div>`,
      "Next Step",
    )}
  `

  const html = renderStoneShell({
    title: "Your guide is ready",
    eyebrow: "Purchase Confirmed",
    subtitle: "Access is live. Start simple and make your first visible post.",
    bodyHtml,
  })

  const text = `Purchase Confirmed

Hey ${name},

Thank you for buying the guide.

It's ready for you now. This is the first step in the SSELFIE path: take one phone photo and turn it into a post that says something.

Open your guide: ${accessUrl}

Start with the first part in the sidebar. Then take one new photo today, choose its content job, and write the simplest caption you can actually post.

${
    passwordSetupLink
      ? `Set your password so you can come back anytime: ${passwordSetupLink}

`
      : ""
  }If you want the next practical step, the Starter Kit is here: https://www.sselfie.ai/starter-kit

Reply if you need me. I read every message.
Sandra`

  return {
    html,
    text,
    subject: SELFIE_GUIDE_PAID_DELIVERY_SUBJECT,
  }
}
