import { renderStoneButton, renderStoneShell } from "./stone-email"

export function generateMasterclassDay2CheckinEmail({ firstName, accessUrl }: { firstName: string; accessUrl: string }) {
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">How did module one feel?</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">If the light changes, the whole photo changes. That is why I start there.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("Back To The Masterclass", accessUrl)}</div>
  `
  return {
    subject: "how's module one?",
    html: renderStoneShell({
      eyebrow: "Masterclass",
      title: "Start with light.",
      subtitle: "That one shift changes more than people think.",
      bodyHtml,
      footerLead: "Stay there until it makes sense in your own photos.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nHow's module one?\n\nBack to the Masterclass: ${accessUrl}\n\nSandra x`,
  }
}
