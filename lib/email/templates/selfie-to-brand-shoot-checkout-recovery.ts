import { buildRevenueEmailLink } from "./revenue-links"
import { selfieToBrandShootCheckoutUrl } from "./selfie-education-links"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

export const SELFIE_TO_BRAND_SHOOT_CHECKOUT_RECOVERY_EMAIL_TYPE =
  "selfie-to-brand-shoot-checkout-recovery"

export function generateSelfieToBrandShootCheckoutRecoveryEmail({
  firstName,
}: {
  firstName: string
}) {
  const checkoutUrl = buildRevenueEmailLink(selfieToBrandShootCheckoutUrl(), {
    source: "email",
    medium: "checkout_recovery",
    campaign: "selfie_to_brand_shoot_checkout_recovery",
    content: "return_to_checkout",
    emailType: SELFIE_TO_BRAND_SHOOT_CHECKOUT_RECOVERY_EMAIL_TYPE,
  })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You were looking at the guided system for turning one selfie into a cohesive personal brand shoot.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If this is still the next step you want, your checkout link is here.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.8;color:#5f5a52;">Inside, you choose the source selfie, choose one Signature Visual World, create the shoot, pick the images that still look like you, and turn them into content.</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#5f5a52;">Start simple. One photo. One visual direction. One first brand shoot.</p>`,
      "What you get"
    )}
    <div style="margin:26px 0 22px;">${renderStoneButton("Continue Checkout", checkoutUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">If now is not the right time, that is okay. No pressure.</p>
  `

  return {
    subject: "your brand shoot link",
    html: renderStoneShell({
      title: "Your brand shoot link.",
      eyebrow: "Selfie to Brand Shoot",
      subtitle: "A calm way back to the guided system.",
      bodyHtml,
      footerLead: "Reply if checkout gave you trouble.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},

You were looking at the guided system for turning one selfie into a cohesive personal brand shoot.

If this is still the next step you want, your checkout link is here.

What you get:
Inside, you choose the source selfie, choose one Signature Visual World, create the shoot, pick the images that still look like you, and turn them into content.

Start simple. One photo. One visual direction. One first brand shoot.

Continue Checkout:
${checkoutUrl}

If now is not the right time, that is okay. No pressure.

Reply if checkout gave you trouble.

Sandra x`,
  }
}
