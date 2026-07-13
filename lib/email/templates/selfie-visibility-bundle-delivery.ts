import { renderStoneButton, renderStoneShell } from "./stone-email"

export function generateSelfieVisibilityBundleDeliveryEmail({
  firstName,
  accessUrl,
}: {
  firstName: string
  accessUrl: string
}) {
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">You're in. Everything in your One Selfie Visibility Bundle is ready.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">I've put it into one simple path so you don't have to figure out where to begin.</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.8;">Start with your selfie. Make the photos. Build the visible brand. Then keep creating with Maya during your 30 days of SUITE access.</p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.8;color:rgb(138 135 128);">Your SUITE pass includes 200 credits, ends automatically after 30 days, and does not renew.</p>
    <div style="margin:22px 0;">${renderStoneButton("Open Your Bundle", accessUrl)}</div>
    <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:rgb(138 135 128);">Questions? Reply to this email or reach us at <a href="mailto:support@sselfie.ai" style="color:inherit;">support@sselfie.ai</a></p>
  `

  return {
    subject: "your One Selfie Visibility Bundle is ready",
    html: renderStoneShell({
      eyebrow: "One Selfie Visibility Bundle",
      title: "Everything is ready.",
      subtitle: "One selfie. One clear path. Start there.",
      bodyHtml,
      footerLead: "The selfie is where we start. Visibility is where it leads.",
      footerSignoff: "Sandra x",
    }),
    text: [
      `Hi ${firstName},`,
      "",
      "You're in. Everything in your One Selfie Visibility Bundle is ready.",
      "",
      "I've put it into one simple path so you don't have to figure out where to begin.",
      "",
      "Start with your selfie. Make the photos. Build the visible brand. Then keep creating with Maya during your 30 days of SUITE access.",
      "",
      "Your SUITE pass includes 200 credits, ends automatically after 30 days, and does not renew.",
      "",
      `Open your bundle: ${accessUrl}`,
      "",
      "Questions? Reply here or email support@sselfie.ai",
      "",
      "Sandra x",
    ].join("\n"),
  }
}
