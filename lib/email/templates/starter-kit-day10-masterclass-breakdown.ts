import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"
import { masterclassLandingUrl } from "./selfie-education-links"

export function generateStarterKitDay10MasterclassBreakdownEmail({ firstName }: { firstName: string }) {
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">The Masterclass covers five things: light, pose, edit, post, repeat.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.8;color:#f0ede8;">Light. Pose. Edit. Post. Repeat.</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">The point is to stop relearning the process every week.</p>`,
      "What it covers",
    )}
    <div style="margin:28px 0 14px;">${renderStoneButton("See The Breakdown", masterclassLandingUrl())}</div>
  `
  return {
    subject: "what the full system looks like",
    html: renderStoneShell({
      eyebrow: "Starter Kit",
      title: "The full system.",
      subtitle: "Everything in one place, in the right order.",
      bodyHtml,
      footerLead: "That is what makes consistency feel calmer.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nThe Masterclass covers five things: light, pose, edit, post, repeat.\n\nSee the breakdown: ${masterclassLandingUrl()}\n\nSandra x`,
  }
}
