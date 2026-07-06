import { renderStoneButton, renderStoneShell } from "./stone-email"
import { masterclassCheckoutUrl } from "./selfie-education-links"

export function generateStarterKitDay14MasterclassOfferEmail({ firstName }: { firstName: string }) {
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Honestly? A lot of women stop right here. They get the quick win from the kit and never go further.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">If you want the whole method, this is it. The Masterclass walks you through light, pose, edit, post, and doing it again next week without starting from zero.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">One payment. Yours to keep.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("Enroll In The Masterclass", masterclassCheckoutUrl())}</div>
  `
  return {
    subject: "this is the offer",
    html: renderStoneShell({
      eyebrow: "Starter Kit",
      title: "If you want the full method, here it is.",
      subtitle: "The Masterclass is the next step after the kit.",
      bodyHtml,
      footerLead: "Take it when you want the whole system, not just the quick win.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nHonestly? A lot of women stop right here. They get the quick win from the kit and never go further.\n\nIf you want the whole method, this is it: the Masterclass, one payment, yours to keep.\n\nEnroll in the Masterclass: ${masterclassCheckoutUrl()}\n\nSandra x`,
  }
}
