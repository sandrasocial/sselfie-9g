import { renderStoneButton, renderStoneShell } from "./stone-email"
import { studioLandingUrl } from "./selfie-education-links"

export function generateStarterKitDay14MasterclassOfferEmail({ firstName }: { firstName: string }) {
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">If the Kit gave you the first result, SUITE is how you keep going.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Maya helps you create the next photo, the next cover, the next caption, and the next post without starting from a blank screen every time.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">You do not need to become someone else to build online. You need a system you can actually come back to.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("See SSELFIE SUITE", studioLandingUrl())}</div>
  `
  return {
    subject: "if you want to keep going",
    html: renderStoneShell({
      eyebrow: "Selfie To AI Photos Kit",
      title: "When you want to keep creating.",
      subtitle: "SUITE is the monthly workspace.",
      bodyHtml,
      footerLead: "Your phone, your face, your story, and the right tools.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nIf the Kit gave you the first result, SUITE is how you keep going.\n\nMaya helps you create the next photo, the next cover, the next caption, and the next post without starting from a blank screen every time.\n\nYou do not need to become someone else to build online. You need a system you can actually come back to.\n\nSee SSELFIE SUITE: ${studioLandingUrl()}\n\nSandra x`,
  }
}
