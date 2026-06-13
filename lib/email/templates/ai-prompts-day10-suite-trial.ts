import { renderStoneButton, renderStoneShell } from "./stone-email"

// FUNNEL-2026-06-11: day-10 trial offer for free AI-prompts subscribers the $27 Vault
// didn't convert. Copy adapted from the Sandra-approved trial-unlock email.

export function generateAiPromptsDay10SuiteTrialEmail({
  firstName,
  claimUrl,
}: {
  firstName: string
  /** Personal trial claim link (/claim/[token]). */
  claimUrl: string
}): { html: string; text: string; subject: string } {
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">If you've been making photos with the prompts, you know the feeling. That little "oh, that's actually me" moment.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Here's something I don't talk about much.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Doing it by hand with prompts works. But there's a faster way inside my Studio. Her name's Maya.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">She's the creative director I built. She already knows every prompt I've ever written. You pick a look, she pulls three concepts, your photos are done in minutes. They keep your face. Same promise, less work.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Try her free. 7 days in the SUITE, 20 photos on me. No card. Nothing turns into a charge. It just ends.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("Claim your 7 days", claimUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.8;">Your prompts stay yours either way.</p>
  `

  return {
    subject: "loved making those? there's a faster way.",
    html: renderStoneShell({
      eyebrow: "SSELFIE SUITE",
      title: "There's a faster way.",
      bodyHtml,
      footerLead: "Your prompts stay yours either way.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},

If you've been making photos with the prompts, you know the feeling. That little "oh, that's actually me" moment.

Here's something I don't talk about much.

Doing it by hand with prompts works. But there's a faster way inside my Studio. Her name's Maya.

She's the creative director I built. She already knows every prompt I've ever written. You pick a look, she pulls three concepts, your photos are done in minutes. They keep your face. Same promise, less work.

Try her free. 7 days in the SUITE, 20 photos on me. No card. Nothing turns into a charge. It just ends.

Claim your 7 days:
${claimUrl}

Your prompts stay yours either way.

Sandra x`,
  }
}
