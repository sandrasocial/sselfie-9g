import { renderStoneButton, renderStoneShell } from "./stone-email"

export function generateStarterKitDay5ProofEmail({ firstName, accessUrl }: { firstName: string; accessUrl: string }) {
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Most bad edits are just heavy edits.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">When someone tells me a preset changed their photo, it usually means it helped them stop doing too much.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">A softer starting point changes the whole photo faster than another half hour of tweaking.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("Open The Starter Kit", accessUrl)}</div>
  `
  return {
    subject: "something I noticed",
    html: renderStoneShell({
      eyebrow: "Starter Kit",
      title: "The better result is usually lighter.",
      subtitle: "You do not need more editing. You need less fighting the photo.",
      bodyHtml,
      footerLead: "If the photo already feels like you, preserve that feeling.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nMost bad edits are just heavy edits.\n\nA softer starting point changes the whole photo faster than another half hour of tweaking.\n\nOpen the Starter Kit: ${accessUrl}\n\nSandra x`,
  }
}
