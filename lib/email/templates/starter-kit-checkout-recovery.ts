import { buildRevenueEmailLink } from "./revenue-links"
import { starterKitCheckoutUrl } from "./selfie-education-links"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

export const STARTER_KIT_CHECKOUT_RECOVERY_EMAIL_TYPE = "starter-kit-checkout-recovery"
export const STARTER_KIT_CHECKOUT_RECOVERY_2_EMAIL_TYPE = "starter-kit-checkout-recovery-2"

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
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You don't need a perfect photoshoot setup.</p>
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

You don't need a perfect photoshoot setup.

You just need one clearer photo of yourself to build from.

Reply if checkout gave you trouble.

Sandra x`,
  }
}

export function generateStarterKitCheckoutRecovery2Email({
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
    content: "recovery_2_source_selfie",
    emailType: STARTER_KIT_CHECKOUT_RECOVERY_2_EMAIL_TYPE,
    checkoutEmail: recipientEmail,
  })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">One more note about the Starter Kit, because this is the part that makes AI photos easier.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The original selfie matters. If the light, angle, or expression is off, the AI has less to work with.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.8;">Start with one clearer source photo.</p>
       <p style="margin:0 0 10px;font-size:15px;line-height:1.8;">Make the light softer and the face easier to read.</p>
       <p style="margin:0;font-size:15px;line-height:1.8;">Then your AI images have a much better chance of still feeling like you.</p>`,
      "Why this helps",
    )}
    <div style="margin:26px 0 22px;">${renderStoneButton("Get the Starter Kit", checkoutUrl)}</div>
    <p style="margin:0;font-size:16px;line-height:1.75;">No pressure. Just an easier starting point if your photos keep feeling a little off.</p>
  `

  return {
    subject: "your source selfie matters",
    html: renderStoneShell({
      title: "Your source selfie matters.",
      eyebrow: "Starter Kit",
      subtitle: "A clearer selfie makes everything after it easier.",
      bodyHtml,
      footerLead: "Reply if checkout gave you trouble.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},

One more note about the Starter Kit, because this is the part that makes AI photos easier.

The original selfie matters. If the light, angle, or expression is off, the AI has less to work with.

Why this helps:
- Start with one clearer source photo.
- Make the light softer and the face easier to read.
- Then your AI images have a much better chance of still feeling like you.

Get the Starter Kit:
${checkoutUrl}

No pressure. Just an easier starting point if your photos keep feeling a little off.

Sandra x`,
  }
}
