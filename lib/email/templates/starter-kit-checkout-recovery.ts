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
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You were looking at the Starter Kit, so here's the link back.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If your AI photos keep feeling a little off, it's usually the source selfie, not you. This is the simple fix.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.8;">Pick a clearer selfie to start from.</p>
       <p style="margin:0 0 10px;font-size:15px;line-height:1.8;">Get the pose, light, and phone setup that makes your real face easier for AI to hold onto.</p>
       <p style="margin:0;font-size:15px;line-height:1.8;">Then use that stronger selfie for every brand photo after it.</p>`,
      "What the Starter Kit helps with",
    )}
    <div style="margin:26px 0 22px;">${renderStoneButton("Get the Starter Kit", checkoutUrl)}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">No photoshoot needed.</p>
    <p style="margin:0;font-size:16px;line-height:1.75;">Just one clearer photo of you to build from.</p>
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

You were looking at the Starter Kit, so here's the link back.

If your AI photos keep feeling a little off, it's usually the source selfie, not you. This is the simple fix.

What the Starter Kit helps with:
- Pick a clearer selfie to start from.
- Get the pose, light, and phone setup that makes your real face easier for AI to hold onto.
- Then use that stronger selfie for every brand photo after it.

Get the Starter Kit:
${checkoutUrl}

No photoshoot needed.

Just one clearer photo of you to build from.

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
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">One more note about the Starter Kit, because this is the part that actually matters.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Your original selfie sets the ceiling. If the light, angle, or expression is off, AI has less of you to work with.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.8;">Start with one clearer photo of yourself.</p>
       <p style="margin:0 0 10px;font-size:15px;line-height:1.8;">Soften the light and make your face easier to read.</p>
       <p style="margin:0;font-size:15px;line-height:1.8;">Then your AI photos have a much better shot at still looking like you.</p>`,
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

One more note about the Starter Kit, because this is the part that actually matters.

Your original selfie sets the ceiling. If the light, angle, or expression is off, AI has less of you to work with.

Why this helps:
- Start with one clearer photo of yourself.
- Soften the light and make your face easier to read.
- Then your AI photos have a much better shot at still looking like you.

Get the Starter Kit:
${checkoutUrl}

No pressure. Just an easier starting point if your photos keep feeling a little off.

Sandra x`,
  }
}
