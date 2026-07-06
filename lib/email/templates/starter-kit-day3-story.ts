import { renderStoneButton, renderStoneShell } from "./stone-email"

export function generateStarterKitDay3StoryEmail({ firstName, accessUrl }: { firstName: string; accessUrl: string }) {
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">True story: I almost didn't post one of the photos people still ask me about.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Not because it was a bad photo. Because it felt nearly right, and nearly right is somehow harder to trust than plain bad.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">That's exactly why I care so much about the basics. Good light. One angle you trust. One edit that still looks like you.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("Back To Your Kit", accessUrl)}</div>
  `
  return {
    subject: "I almost didn't post it",
    html: renderStoneShell({
      eyebrow: "Starter Kit",
      title: "Nearly right is hard.",
      subtitle: "That's why the basics matter.",
      bodyHtml,
      footerLead: "You don't need a hundred rules. You need a few you actually trust.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nTrue story: I almost didn't post one of the photos people still ask me about.\n\nThat's exactly why the basics matter: good light, one trusted angle, one edit that still looks like you.\n\nBack to your kit: ${accessUrl}\n\nSandra x`,
  }
}
