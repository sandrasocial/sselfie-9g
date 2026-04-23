import { renderStoneButton, renderStoneShell } from "./stone-email"
import { workWithMeUrl } from "./selfie-education-links"

export function generateMasterclassDay7SoftWorkWithMeEmail({ firstName }: { firstName: string }) {
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Some people want the course. Some want me in the room with them.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">That is what the 1:1 is for. Small number of people. Direct support. Tight feedback.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("See 1:1 Details", workWithMeUrl())}</div>
  `
  return {
    subject: "what working closely with me looks like",
    html: renderStoneShell({
      eyebrow: "Masterclass",
      title: "If you want closer support, it exists.",
      subtitle: "The 1:1 is for the person who wants tighter feedback and a clearer system.",
      bodyHtml,
      footerLead: "No pressure. Just the right next step if you need more help.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nIf you want closer support, it exists.\n\nSee the 1:1 here: ${workWithMeUrl()}\n\nSandra x`,
  }
}
