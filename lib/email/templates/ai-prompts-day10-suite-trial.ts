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
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">You've had the free prompts for a while now. Maybe you've made a few photos you like. Maybe you haven't had time.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Either way, here's the honest truth: prompts are the manual way. Maya is the fast way.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">She's the creative director inside my Studio. She already knows every prompt I've ever written. You pick a look, she pulls three concepts, and your photos are done in minutes. They keep your face. That's the whole point.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Try her free: 7 days inside the SUITE, with 20 photos on me. No card needed. Nothing cancels into a charge. It just ends.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("Claim your 7 days", claimUrl)}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Whatever you make is yours to keep.</p>
    <p style="margin:0;font-size:16px;line-height:1.8;">Sandra x</p>
  `

  return {
    subject: "Skip the prompts. Meet Maya",
    html: renderStoneShell({
      eyebrow: "SSELFIE SUITE",
      title: "There's a faster way.",
      bodyHtml,
      footerLead: "Your free prompts stay yours either way.",
      footerSignoff: "",
    }),
    text: `Hi ${firstName},

You've had the free prompts for a while now. Maybe you've made a few photos you like. Maybe you haven't had time.

Either way, here's the honest truth: prompts are the manual way. Maya is the fast way.

She's the creative director inside my Studio. She already knows every prompt I've ever written. You pick a look, she pulls three concepts, and your photos are done in minutes. They keep your face. That's the whole point.

Try her free: 7 days inside the SUITE, with 20 photos on me. No card needed. Nothing cancels into a charge. It just ends.

Claim your 7 days:
${claimUrl}

Whatever you make is yours to keep.

Sandra x`,
  }
}
