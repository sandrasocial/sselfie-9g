import { renderStoneButton, renderStoneShell } from "./stone-email"

// FUNNEL-2026-06-11: membership checkout abandonment → 7-day trial offer.
// Highest-intent audience in the funnel (they reached the €97 checkout).
// Copy adapted from the Sandra-approved trial-unlock email.

export const MEMBERSHIP_CHECKOUT_RECOVERY_EMAIL_TYPE = "membership-checkout-recovery"

export function generateMembershipCheckoutRecoveryEmail({
  firstName,
  claimUrl,
}: {
  firstName: string
  claimUrl: string
}): { html: string; text: string; subject: string } {
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">You were one click from joining SSELFIE SUITE. If something held you back, that's okay. &euro;97 is a real decision.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">So decide with your own photos instead: here's 7 days inside, with 20 photos on me. No card needed. Nothing cancels into a charge. It just ends.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Maya pulls the looks for you, keeps it looking like you in every photo, and writes captions that sound like you.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("Claim your 7 days", claimUrl)}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">If it's not for you, your photos stay yours anyway.</p>
    <p style="margin:0;font-size:16px;line-height:1.8;">Sandra x</p>
  `

  return {
    subject: "Not ready for €97? Try it free",
    html: renderStoneShell({
      eyebrow: "SSELFIE SUITE",
      title: "Try it before you decide.",
      bodyHtml,
      footerLead: "No card. No catch. It just ends.",
      footerSignoff: "",
    }),
    text: `Hi ${firstName},

You were one click from joining SSELFIE SUITE. If something held you back, that's okay. €97 is a real decision.

So decide with your own photos instead: here's 7 days inside, with 20 photos on me. No card needed. Nothing cancels into a charge. It just ends.

Maya pulls the looks for you, keeps it looking like you in every photo, and writes captions that sound like you.

Claim your 7 days:
${claimUrl}

If it's not for you, your photos stay yours anyway.

Sandra x`,
  }
}
