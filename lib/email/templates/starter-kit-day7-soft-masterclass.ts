import { renderStoneButton, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"
import { selfieToBrandShootCheckoutUrl } from "./selfie-education-links"

export function generateStarterKitDay7SoftMasterclassEmail({
  firstName,
  recipientEmail,
}: {
  firstName: string
  recipientEmail?: string
}) {
  const systemUrl = new URL(buildRevenueEmailLink(selfieToBrandShootCheckoutUrl(), {
    campaign: "starter_kit_day7_ai_brand_shoot",
    content: "start_ai_brand_shoot",
    emailType: "starter-kit-day7-soft-masterclass",
  }))
  if (recipientEmail) systemUrl.searchParams.set("checkout_email", recipientEmail)
  systemUrl.searchParams.set("checkout_source", "starter_kit_buyer_email_credit")
  systemUrl.searchParams.set("starter_kit_credit", "1")
  systemUrl.searchParams.set("upgrade_credit", "3700")
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">If the Starter Kit helped you understand what makes a better selfie, this is the next part.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">That clear selfie can become the source photo for an AI brand shoot.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Not a random AI image. A visual direction you can use for your profile, your content, and the version of you people start recognizing online.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("Start Your AI Brand Shoot", systemUrl.toString())}</div>
  `
  return {
    subject: "now use that selfie",
    html: renderStoneShell({
      eyebrow: "Starter Kit",
      title: "Now use that selfie.",
      subtitle: "Your better source photo can become the start of a brand shoot.",
      bodyHtml,
      footerLead: "The clearer the selfie, the better the AI has a chance to still feel like you.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nIf the Starter Kit helped you understand what makes a better selfie, this is the next part.\n\nThat clear selfie can become the source photo for an AI brand shoot.\n\nNot a random AI image. A visual direction you can use for your profile, your content, and the version of you people start recognizing online.\n\nStart your AI brand shoot: ${systemUrl.toString()}\n\nSandra x`,
  }
}
