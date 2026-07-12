import { renderStoneButton, renderStoneShell } from "./stone-email"

// FUNNEL-2026-06-11: membership checkout abandonment → return to checkout.
// Highest-intent audience in the funnel (they reached the €97 checkout).
// Copy approved by Sandra 2026-07-12.

export const MEMBERSHIP_CHECKOUT_RECOVERY_EMAIL_TYPE = "membership-checkout-recovery"

export function generateMembershipCheckoutRecoveryEmail({
  firstName,
  checkoutUrl,
}: {
  firstName: string
  checkoutUrl: string
}): { html: string; text: string; subject: string } {
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">You were one click from joining SSELFIE SUITE. If something held you back, that's okay. &euro;97 is a real decision, not a small one.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("Finish joining", checkoutUrl)}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">If you want to talk it through first, just reply to this email. I read every one.</p>
    <p style="margin:0;font-size:16px;line-height:1.8;">Sandra x</p>
  `

  return {
    subject: "Still thinking about it?",
    html: renderStoneShell({
      eyebrow: "SSELFIE SUITE",
      title: "Still thinking about it?",
      bodyHtml,
      footerLead: "",
      footerSignoff: "",
    }),
    text: `Hi ${firstName},

You were one click from joining SSELFIE SUITE. If something held you back, that's okay. €97 is a real decision, not a small one.

Finish joining:
${checkoutUrl}

If you want to talk it through first, just reply to this email. I read every one.

Sandra x`,
  }
}
