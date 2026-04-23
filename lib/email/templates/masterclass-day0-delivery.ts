import { renderStoneButton, renderStoneShell } from "./stone-email"

export function generateMasterclassDay0DeliveryEmail({ firstName, accessUrl }: { firstName: string; accessUrl: string }) {
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Your Masterclass access is ready.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Start with module one. Do not try to do all of it at once.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("Open The Masterclass", accessUrl)}</div>
  `
  return {
    subject: "it's all there",
    html: renderStoneShell({
      eyebrow: "Masterclass",
      title: "Your Masterclass is ready.",
      subtitle: "Start with light. Then move through the rest in order.",
      bodyHtml,
      footerLead: "One module at a time is enough.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nYour Masterclass is ready.\n\nOpen it here: ${accessUrl}\n\nSandra x`,
  }
}
