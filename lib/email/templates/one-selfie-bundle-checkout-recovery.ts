import { buildRevenueEmailLink } from "./revenue-links"
import { escapeHtml, renderPersonalLink, renderPersonalNote } from "./stone-email"

export const ONE_SELFIE_BUNDLE_CHECKOUT_RECOVERY_EMAIL_TYPE =
  "one-selfie-bundle-checkout-recovery"

export function generateOneSelfieBundleCheckoutRecoveryEmail({
  firstName,
  recipientEmail,
}: {
  firstName: string
  recipientEmail?: string | null
}) {
  const bundleUrl = buildRevenueEmailLink("/one-selfie", {
    source: "email",
    medium: "checkout_recovery",
    campaign: "one_selfie_bundle_recovery",
    content: "return_to_bundle",
    emailType: ONE_SELFIE_BUNDLE_CHECKOUT_RECOVERY_EMAIL_TYPE,
    checkoutEmail: recipientEmail,
  })
  const safeFirstName = escapeHtml(firstName)
  const bodyHtml = `
    <p style="margin:0 0 16px;">Hi ${safeFirstName},</p>
    <p style="margin:0 0 16px;">You opened the One Selfie Bundle but didn't finish. If checkout got in the way, you can come back here.</p>
    <p style="margin:0 0 16px;">It's $97 once. Five tools stay yours for life. Your 30-day Maya pass ends automatically. Nothing renews.</p>
    <p style="margin:22px 0;">${renderPersonalLink("Finish checkout", bundleUrl)}</p>
    <p style="margin:0 0 16px;">It closes Wednesday at 6 PM Oslo time.</p>
    <p style="margin:0;">If you were only looking, that's completely okay too.</p>
  `

  return {
    subject: "still thinking about the One Selfie Bundle?",
    html: renderPersonalNote({
      title: "Still thinking about the One Selfie Bundle?",
      bodyHtml,
    }),
    text: `Hi ${firstName},

You opened the One Selfie Bundle but didn't finish. If checkout got in the way, you can come back here.

It's $97 once. Five tools stay yours for life. Your 30-day Maya pass ends automatically. Nothing renews.

Finish checkout:
${bundleUrl}

It closes Wednesday at 6 PM Oslo time.

If you were only looking, that's completely okay too.

Sandra x`,
  }
}
