import { buildRevenueEmailLink } from "./revenue-links"
import { selfieToBrandShootCheckoutUrl } from "./selfie-education-links"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

export const SELFIE_TO_BRAND_SHOOT_CHECKOUT_RECOVERY_EMAIL_TYPE =
  "selfie-to-brand-shoot-checkout-recovery"
export const SELFIE_TO_BRAND_SHOOT_CHECKOUT_RECOVERY_2_EMAIL_TYPE =
  "selfie-to-brand-shoot-checkout-recovery-2"

export function generateSelfieToBrandShootCheckoutRecoveryEmail({
  firstName,
  recipientEmail,
}: {
  firstName: string
  recipientEmail?: string | null
}) {
  const checkoutUrl = buildRevenueEmailLink(selfieToBrandShootCheckoutUrl(), {
    source: "email",
    medium: "checkout_recovery",
    campaign: "selfie_to_brand_shoot_checkout_recovery",
    content: "return_to_checkout",
    emailType: SELFIE_TO_BRAND_SHOOT_CHECKOUT_RECOVERY_EMAIL_TYPE,
    checkoutEmail: recipientEmail,
  })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You were looking at Selfie to Brand Shoot, so here's the link back.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">This is for the moment when one good AI photo isn't enough anymore.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You want to know which selfie to use, what style fits you, how to keep it looking like you, and what to actually do with the photos after.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.8;">Choose the right source selfie.</p>
       <p style="margin:0 0 10px;font-size:15px;line-height:1.8;">Pick one Signature Visual World.</p>
       <p style="margin:0 0 10px;font-size:15px;line-height:1.8;">Create your first three brand photos.</p>
       <p style="margin:0;font-size:15px;line-height:1.8;">Then turn them into content you can actually post.</p>`,
      "Inside the System"
    )}
    <div style="margin:26px 0 22px;">${renderStoneButton("Start the System", checkoutUrl)}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Start with one clear selfie. I'll show you what to do with it from there.</p>
    <p style="margin:0;font-size:16px;line-height:1.75;">One selfie, one direction, one simple next step.</p>
  `

  return {
    subject: "here is the brand shoot link",
    html: renderStoneShell({
      title: "Here is the brand shoot link.",
      eyebrow: "Selfie to Brand Shoot",
      subtitle: "A calm way back to the system for turning one selfie into your first AI brand shoot.",
      bodyHtml,
      footerLead: "Reply if checkout gave you trouble.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},

You were looking at Selfie to Brand Shoot, so here's the link back.

This is for the moment when one good AI photo isn't enough anymore.

You want to know which selfie to use, what style fits you, how to keep it looking like you, and what to actually do with the photos after.

Inside the System:
- Choose the right source selfie.
- Pick one Signature Visual World.
- Create your first three brand photos.
- Then turn them into content you can actually post.

Start the System:
${checkoutUrl}

Start with one clear selfie. I'll show you what to do with it from there.

One selfie, one direction, one simple next step.

Reply if checkout gave you trouble.

Sandra x`,
  }
}

export function generateSelfieToBrandShootCheckoutRecovery2Email({
  firstName,
  recipientEmail,
}: {
  firstName: string
  recipientEmail?: string | null
}) {
  const checkoutUrl = buildRevenueEmailLink(selfieToBrandShootCheckoutUrl(), {
    source: "email",
    medium: "checkout_recovery",
    campaign: "selfie_to_brand_shoot_checkout_recovery",
    content: "recovery_2_still_you",
    emailType: SELFIE_TO_BRAND_SHOOT_CHECKOUT_RECOVERY_2_EMAIL_TYPE,
    checkoutEmail: recipientEmail,
  })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">One more note about Selfie to Brand Shoot.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The point isn't one pretty AI photo you then don't know what to do with.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">It's a small set of photos that still feel like you, fit one visual direction, and actually have a job in your content.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.8;">One profile photo.</p>
       <p style="margin:0 0 10px;font-size:15px;line-height:1.8;">One reel cover.</p>
       <p style="margin:0 0 10px;font-size:15px;line-height:1.8;">One lifestyle photo.</p>
       <p style="margin:0;font-size:15px;line-height:1.8;">One visual direction that makes you easy to recognize.</p>`,
      "What you build first",
    )}
    <div style="margin:26px 0 22px;">${renderStoneButton("Start the System", checkoutUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">AI should not erase you. It should frame you.</p>
  `

  return {
    subject: "one selfie needs a direction",
    html: renderStoneShell({
      title: "One selfie needs a direction.",
      eyebrow: "Selfie to Brand Shoot",
      subtitle: "A calm way back to the guided brand shoot system.",
      bodyHtml,
      footerLead: "Reply if checkout gave you trouble.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},

One more note about Selfie to Brand Shoot.

The point isn't one pretty AI photo you then don't know what to do with.

It's a small set of photos that still feel like you, fit one visual direction, and actually have a job in your content.

What you build first:
- One profile photo.
- One reel cover.
- One lifestyle photo.
- One visual direction that makes you easy to recognize.

Start the System:
${checkoutUrl}

AI should not erase you. It should frame you.

Sandra x`,
  }
}
