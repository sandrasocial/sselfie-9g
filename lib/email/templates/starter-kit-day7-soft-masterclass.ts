import { renderStoneButton, renderStoneShell } from "./stone-email"
import { masterclassLandingUrl } from "./selfie-education-links"

export function generateStarterKitDay7SoftMasterclassEmail({ firstName }: { firstName: string }) {
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">If the Starter Kit gave you the first clean result, the Masterclass is the part that shows you how to repeat it.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Not more stuff. Just the full method in order.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("See The Masterclass", masterclassLandingUrl())}</div>
  `
  return {
    subject: "the next part",
    html: renderStoneShell({
      eyebrow: "Starter Kit",
      title: "This is where it gets repeatable.",
      subtitle: "The Masterclass is the full system, not just the quick win.",
      bodyHtml,
      footerLead: "You do not need it on day one. You might want it once you feel the difference.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nIf the Starter Kit gave you the first clean result, the Masterclass is the full method in order.\n\nSee it here: ${masterclassLandingUrl()}\n\nSandra x`,
  }
}
