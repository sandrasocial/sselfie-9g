import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"
import { selfieToBrandShootCheckoutUrl } from "./selfie-education-links"

export function generateStarterKitDay10MasterclassBreakdownEmail({
  firstName,
  recipientEmail,
}: {
  firstName: string
  recipientEmail?: string
}) {
  const systemUrl = new URL(buildRevenueEmailLink(selfieToBrandShootCheckoutUrl(), {
    campaign: "starter_kit_day10_ai_brand_shoot",
    content: "system_breakdown",
    emailType: "starter-kit-day10-masterclass-breakdown",
  }))
  if (recipientEmail) systemUrl.searchParams.set("checkout_email", recipientEmail)
  systemUrl.searchParams.set("checkout_source", "starter_kit_buyer_email_credit")
  systemUrl.searchParams.set("starter_kit_credit", "1")
  systemUrl.searchParams.set("upgrade_credit", "3700")
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">A better selfie is not the end result.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">It is the starting point.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Once your source photo is clear, you can use it to create a small AI brand shoot that actually looks connected: one profile image, one stronger editorial image, and one softer lifestyle image.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.8;color:#f0ede8;">Start with one selfie. Choose one visual world. Create the first shoot. Pick what still looks like you. Turn it into content.</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">That is the part that makes the images feel like a brand, not just a pretty experiment.</p>`,
      "What the System walks you through",
    )}
    <div style="margin:28px 0 14px;">${renderStoneButton("See The Selfie to Brand Shoot System", systemUrl.toString())}</div>
  `
  return {
    subject: "your selfie can become the shoot",
    html: renderStoneShell({
      eyebrow: "Starter Kit",
      title: "Your selfie can become the shoot.",
      subtitle: "The next step is turning the source photo into a visual direction.",
      bodyHtml,
      footerLead: "One clear selfie. One visual world. One first brand shoot.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nA better selfie is not the end result.\n\nIt is the starting point.\n\nOnce your source photo is clear, you can use it to create a small AI brand shoot that actually looks connected: one profile image, one stronger editorial image, and one softer lifestyle image.\n\nThe System walks you through this:\nStart with one selfie. Choose one visual world. Create the first shoot. Pick what still looks like you. Turn it into content.\n\nSee the Selfie to Brand Shoot System: ${systemUrl.toString()}\n\nSandra x`,
  }
}
