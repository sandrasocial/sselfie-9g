import { renderStoneButton, renderStoneShell } from "./stone-email"

export function generateStarterKitDay1QuickWinEmail({ firstName, accessUrl }: { firstName: string; accessUrl: string }) {
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Okay, don't overthink today. Just try one thing.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Stand beside a window. Face slightly away from it, then turn back just enough that one side of your face goes soft and the other keeps its shape.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Then use one preset. Lightly. Not all the way, just enough to help the photo, not replace it.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("Open Your Kit", accessUrl)}</div>
  `
  return {
    subject: "try this today",
    html: renderStoneShell({
      eyebrow: "Starter Kit",
      title: "Your first quick win.",
      subtitle: "Good light first. Preset second.",
      bodyHtml,
      footerLead: "You're not going for a perfect photo. Just a better starting point.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nOkay, don't overthink today. Just try one thing.\n\nStand beside a window. Turn just enough to keep one side soft and the other side defined.\n\nThen use one preset lightly.\n\nOpen your kit: ${accessUrl}\n\nSandra x`,
  }
}
