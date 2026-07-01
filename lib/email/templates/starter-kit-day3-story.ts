import { renderStoneButton, renderStoneShell } from "./stone-email"

export function generateStarterKitDay3StoryEmail({ firstName, accessUrl }: { firstName: string; accessUrl: string }) {
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">I almost did not post one of the photos people still ask me about.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Not because the photo was bad. Because it felt nearly right, which is sometimes the hardest kind.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">That is why I care so much about baseline. Good light. One angle you trust. One edit that keeps you looking like yourself.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("Back To Your Kit", accessUrl)}</div>
  `
  return {
    subject: "I almost didn't post it",
    html: renderStoneShell({
      eyebrow: "Starter Kit",
      title: "Nearly right is hard.",
      subtitle: "That is why the baseline matters.",
      bodyHtml,
      footerLead: "You do not need a hundred rules. You need a few you trust.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nI almost didn't post one of the photos people still ask me about.\n\nThat is why the baseline matters: good light, one trusted angle, one clean edit.\n\nBack to your kit: ${accessUrl}\n\nSandra x`,
  }
}
