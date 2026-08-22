import { renderStoneButton, renderStoneShell } from "./stone-email"

interface FreebieGuideTouchParams {
  firstName: string
  recipientEmail: string
  accessUrl: string
}

export function generateFreebieGuideDay1LightTipEmail({
  firstName,
  accessUrl,
}: FreebieGuideTouchParams): { html: string; text: string; subject: string } {
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hey ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Before you take another selfie, try this one thing.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Turn off the overhead light and face a window. Stand about one big step back from it, turn your shoulders slightly, and keep your face toward the light.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Then take three photos with your phone a tiny bit above eye level. Do not change everything at once. Just compare those three.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">That small setup usually makes a bigger difference than a new phone, a filter, or trying twenty poses.</p>
    <div style="margin:28px 0 18px;">${renderStoneButton("Open the Selfie Guide", accessUrl)}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Today I only want you to get one photo that looks better than the last one.</p>
    <p style="margin:0;font-size:16px;line-height:1.8;">Sandra x</p>
  `

  return {
    subject: "one light fix before your next selfie",
    html: renderStoneShell({
      eyebrow: "Selfie Guide",
      title: "Try this before your next selfie.",
      subtitle: "One setup change. No new gear.",
      bodyHtml,
      footerLead: "One better photo is enough for today.",
      footerSignoff: "",
    }),
    text: `Hey ${firstName},

Before you take another selfie, try this one thing.

Turn off the overhead light and face a window. Stand about one big step back from it, turn your shoulders slightly, and keep your face toward the light.

Then take three photos with your phone a tiny bit above eye level. Do not change everything at once. Just compare those three.

That small setup usually makes a bigger difference than a new phone, a filter, or trying twenty poses.

Open the Selfie Guide:
${accessUrl}

Today I only want you to get one photo that looks better than the last one.

Sandra x`,
  }
}
