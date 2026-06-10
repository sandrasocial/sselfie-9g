import { buildRevenueEmailLink } from "./revenue-links"
import { starterKitCheckoutUrl } from "./selfie-education-links"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

export const STARTER_KIT_CHECKOUT_RECOVERY_EMAIL_TYPE = "starter-kit-checkout-recovery"

export function generateStarterKitCheckoutRecoveryEmail({
  firstName,
  recipientEmail,
}: {
  firstName: string
  recipientEmail?: string | null
}) {
  const checkoutUrl = buildRevenueEmailLink(starterKitCheckoutUrl(), {
    source: "email",
    medium: "checkout_recovery",
    campaign: "starter_kit_checkout_recovery",
    content: "return_to_checkout",
    emailType: STARTER_KIT_CHECKOUT_RECOVERY_EMAIL_TYPE,
    checkoutEmail: recipientEmail,
  })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You were looking at the Starter Kit, so I wanted to send the link back to you.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">This is the simple place to start if your AI images or brand photos keep feeling a little off because the source selfie is not strong enough yet.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.8;">Choose a clearer source selfie.</p>
       <p style="margin:0 0 10px;font-size:15px;line-height:1.8;">Use the posing, light, and phone setup that makes your face easier for AI to keep.</p>
       <p style="margin:0;font-size:15px;line-height:1.8;">Then use that stronger selfie as the starting point for better brand images.</p>`,
      "What the Starter Kit helps with",
    )}
    <div style="margin:26px 0 22px;">${renderStoneButton("Get the Starter Kit", checkoutUrl)}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You do not need a perfect photoshoot setup.</p>
    <p style="margin:0;font-size:16px;line-height:1.75;">You just need one clearer photo of yourself to build from.</p>
  `

  return {
    subject: "here is the starter kit link",
    html: renderStoneShell({
      title: "Here is the Starter Kit link.",
      eyebrow: "Starter Kit",
      subtitle: "A simple way back to the selfie setup you were looking at.",
      bodyHtml,
      footerLead: "Reply if checkout gave you trouble.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},

You were looking at the Starter Kit, so I wanted to send the link back to you.

This is the simple place to start if your AI images or brand photos keep feeling a little off because the source selfie is not strong enough yet.

What the Starter Kit helps with:
- Choose a clearer source selfie.
- Use the posing, light, and phone setup that makes your face easier for AI to keep.
- Then use that stronger selfie as the starting point for better brand images.

Get the Starter Kit:
${checkoutUrl}

You do not need a perfect photoshoot setup.

You just need one clearer photo of yourself to build from.

Reply if checkout gave you trouble.

Sandra x`,
  }
}
