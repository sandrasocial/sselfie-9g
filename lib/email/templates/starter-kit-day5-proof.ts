import { renderStoneButton, renderStoneShell } from "./stone-email"

export function generateStarterKitDay5ProofEmail({ firstName, accessUrl }: { firstName: string; accessUrl: string }) {
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Once you have one AI photo you like, use it.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Not someday. Not after twenty more versions. Use the best one as a profile refresh, a story intro, a reel cover, or a soft post about what you are building.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">That is why the Kit includes the 7-day starter. A photo only helps your brand if it leaves your camera roll.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("Open The 7-Day Starter", accessUrl)}</div>
  `
  return {
    subject: "use the best one",
    html: renderStoneShell({
      eyebrow: "Selfie To AI Photos Kit",
      title: "Now make it useful.",
      subtitle: "The photo needs somewhere to go.",
      bodyHtml,
      footerLead: "The photo gets attention. The next post gives it meaning.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nOnce you have one AI photo you like, use it.\n\nNot someday. Not after twenty more versions. Use the best one as a profile refresh, a story intro, a reel cover, or a soft post about what you are building.\n\nThat is why the Kit includes the 7-day starter. A photo only helps your brand if it leaves your camera roll.\n\nOpen the 7-day starter: ${accessUrl}\n\nSandra x`,
  }
}
