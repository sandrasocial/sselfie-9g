import { renderStoneButton, renderStoneShell } from "./stone-email"

export function generateStarterKitDay1QuickWinEmail({ firstName, accessUrl }: { firstName: string; accessUrl: string }) {
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Try this today before you touch a prompt.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Stand beside a window. Face slightly away from it. Turn back just enough so one side of your face stays soft and the other keeps shape.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Take ten photos. Choose the one that already feels most like you. That is your source selfie.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Then use the first AI starter prompt in your Kit. Do not overthink it.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("Open Your Kit", accessUrl)}</div>
  `
  return {
    subject: "try this before the prompt",
    html: renderStoneShell({
      eyebrow: "Selfie To AI Photos Kit",
      title: "Your source selfie comes first.",
      subtitle: "Good light first. Prompt second.",
      bodyHtml,
      footerLead: "The goal is not a perfect photo. It is a clear starting point.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nTry this before the prompt.\n\nStand beside a window. Turn just enough to keep one side soft and the other side defined.\n\nTake ten photos. Choose the one that already feels most like you. That is your source selfie.\n\nThen use the first AI starter prompt in your Kit. Do not overthink it.\n\nOpen your kit: ${accessUrl}\n\nSandra x`,
  }
}
