import { renderStoneButton, renderStoneShell } from "./stone-email"
import { workWithMeUrl } from "./selfie-education-links"

export function generateMasterclassDay10DirectInviteEmail({ firstName }: { firstName: string }) {
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">If you want private help, this is the invitation.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">The 1:1 is where we tighten the method, the message, and the business side together.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("Send An Inquiry", workWithMeUrl())}</div>
  `
  return {
    subject: "two spots open right now",
    html: renderStoneShell({
      eyebrow: "Masterclass",
      title: "If you want the private version, here it is.",
      subtitle: "This is the highest-touch way to work with Sandra.",
      bodyHtml,
      footerLead: "Use it if you want direct help, not just the material.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nIf you want private help, here is the invitation:\n${workWithMeUrl()}\n\nSandra x`,
  }
}
