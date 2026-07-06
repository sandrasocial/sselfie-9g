import { renderStoneButton, renderStoneShell } from "./stone-email"

export function generateStarterKitDay5ProofEmail({ firstName, accessUrl }: { firstName: string; accessUrl: string }) {
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Here's something I've noticed. Most bad edits aren't bad because of the editor. They're just heavy.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">When someone tells me a preset changed their photo, it usually just means it stopped them from doing too much.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">A lighter starting point does more for a photo than another half hour of tweaking ever will.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("Open The Starter Kit", accessUrl)}</div>
  `
  return {
    subject: "something I noticed",
    html: renderStoneShell({
      eyebrow: "Starter Kit",
      title: "The better result is usually lighter.",
      subtitle: "You don't need more editing. You need to stop fighting the photo.",
      bodyHtml,
      footerLead: "If the photo already feels like you, leave that part alone.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nHere's something I've noticed. Most bad edits aren't bad, they're just heavy.\n\nA lighter starting point does more for a photo than another half hour of tweaking ever will.\n\nOpen the Starter Kit: ${accessUrl}\n\nSandra x`,
  }
}
