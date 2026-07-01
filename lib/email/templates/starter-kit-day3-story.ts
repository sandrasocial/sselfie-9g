import { renderStoneButton, renderStoneShell } from "./stone-email"

export function generateStarterKitDay3StoryEmail({ firstName, accessUrl }: { firstName: string; accessUrl: string }) {
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">If your first AI result looks a little off, that does not mean you failed.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Most people change the whole prompt too fast. Then the next image becomes another random woman in another random world.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Use the fix prompts instead. Keep the same idea, then adjust the face, skin, pose, crop, or light.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("Open The Fix Prompts", accessUrl)}</div>
  `
  return {
    subject: "if the first result feels off",
    html: renderStoneShell({
      eyebrow: "Selfie To AI Photos Kit",
      title: "Fix the detail. Do not abandon yourself.",
      subtitle: "The close result is usually worth saving.",
      bodyHtml,
      footerLead: "AI should not erase you. It should frame you.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nIf your first AI result looks a little off, that does not mean you failed.\n\nMost people change the whole prompt too fast. Then the next image becomes another random woman in another random world.\n\nUse the fix prompts instead. Keep the same idea, then adjust the face, skin, pose, crop, or light.\n\nOpen the fix prompts: ${accessUrl}\n\nSandra x`,
  }
}
