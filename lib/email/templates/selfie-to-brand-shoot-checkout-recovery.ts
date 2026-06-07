import { buildRevenueEmailLink } from "./revenue-links"
import { selfieToBrandShootCheckoutUrl } from "./selfie-education-links"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

export const SELFIE_TO_BRAND_SHOOT_CHECKOUT_RECOVERY_EMAIL_TYPE =
  "selfie-to-brand-shoot-checkout-recovery"

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
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You were looking at Selfie to Brand Shoot, so I wanted to send the link back to you.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">This is for the moment where one good AI image is not enough anymore.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You want to know which selfie to use, what style to choose, how to make the images still look like you, and how to actually use them in your content.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.8;">Choose the right source selfie.</p>
       <p style="margin:0 0 10px;font-size:15px;line-height:1.8;">Pick one Signature Visual World.</p>
       <p style="margin:0 0 10px;font-size:15px;line-height:1.8;">Create your first three brand images.</p>
       <p style="margin:0;font-size:15px;line-height:1.8;">Then turn them into content you can actually post.</p>`,
      "Inside the System"
    )}
    <div style="margin:26px 0 22px;">${renderStoneButton("Start the System", checkoutUrl)}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You do not need a studio, a photographer, or a perfect photo of yourself.</p>
    <p style="margin:0;font-size:16px;line-height:1.75;">Just one clear selfie, one visual direction, and one simple next step.</p>
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

You were looking at Selfie to Brand Shoot, so I wanted to send the link back to you.

This is for the moment where one good AI image is not enough anymore.

You want to know which selfie to use, what style to choose, how to make the images still look like you, and how to actually use them in your content.

Inside the System:
- Choose the right source selfie.
- Pick one Signature Visual World.
- Create your first three brand images.
- Then turn them into content you can actually post.

Start the System:
${checkoutUrl}

You do not need a studio, a photographer, or a perfect photo of yourself.

Just one clear selfie, one visual direction, and one simple next step.

Reply if checkout gave you trouble.

Sandra x`,
  }
}
