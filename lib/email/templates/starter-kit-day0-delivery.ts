import { renderStoneButton, renderStoneShell } from "./stone-email"
import { starterKitLandingUrl } from "./selfie-education-links"

export function generateStarterKitDay0DeliveryEmail({
  firstName,
  accessUrl,
}: {
  firstName: string
  accessUrl: string
}) {
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Your Starter Kit is ready.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Start with the quick win. Open the kit. Download the presets. Use one photo that already feels close.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("Open Your Starter Kit", accessUrl)}</div>
    <p style="margin:0;font-size:14px;line-height:1.7;">If the link breaks, use this page instead: <a href="${starterKitLandingUrl()}" style="color:#a8a49c;">Starter Kit</a></p>
  `

  return {
    subject: "your starter kit is here",
    html: renderStoneShell({
      eyebrow: "Starter Kit",
      title: "Your kit is ready.",
      subtitle: "Presets, quick-start, and the guide support are waiting for you.",
      bodyHtml,
      footerLead: "One photo. Good light. Keep it simple.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nYour Starter Kit is ready.\n\nOpen your kit: ${accessUrl}\n\nIf the link breaks, use: ${starterKitLandingUrl()}\n\nSandra x`,
  }
}
