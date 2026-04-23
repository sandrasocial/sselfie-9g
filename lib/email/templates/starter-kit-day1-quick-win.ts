import { renderStoneButton, renderStoneShell } from "./stone-email"

export function generateStarterKitDay1QuickWinEmail({ firstName, accessUrl }: { firstName: string; accessUrl: string }) {
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Try this today.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Stand beside a window. Face slightly away from it. Turn back just enough so one side of your face stays soft and the other keeps shape.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Then use one preset lightly. Not all the way. Just enough.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("Open Your Kit", accessUrl)}</div>
  `
  return {
    subject: "try this today",
    html: renderStoneShell({
      eyebrow: "Starter Kit",
      title: "Your first quick win.",
      subtitle: "Good light first. Preset second.",
      bodyHtml,
      footerLead: "The goal is not a perfect photo. It is a better starting point.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nTry this today.\n\nStand beside a window. Turn just enough to keep one side soft and the other side defined.\n\nThen use one preset lightly.\n\nOpen your kit: ${accessUrl}\n\nSandra x`,
  }
}
