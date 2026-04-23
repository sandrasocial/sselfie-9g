import { renderStoneButton, renderStoneShell } from "./stone-email"

export function generateMasterclassDay5DeepenEmail({ firstName, accessUrl }: { firstName: string; accessUrl: string }) {
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">The part most people miss is not the preset. It is the moment before it.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">If the base photo is calmer, the edit gets easier fast.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("Keep Going", accessUrl)}</div>
  `
  return {
    subject: "the thing most people miss",
    html: renderStoneShell({
      eyebrow: "Masterclass",
      title: "The edit starts before the preset.",
      subtitle: "That is what makes the result feel cleaner.",
      bodyHtml,
      footerLead: "Preserve what is already working. Then refine.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nThe edit starts before the preset.\n\nKeep going here: ${accessUrl}\n\nSandra x`,
  }
}
