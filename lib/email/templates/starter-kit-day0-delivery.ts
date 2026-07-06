import { getEmailHeroImage } from "../email-image-assets"
import { renderStoneButton, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"
import { selfieToBrandShootCheckoutUrl, starterKitLandingUrl } from "./selfie-education-links"

export function generateStarterKitDay0DeliveryEmail({
  firstName,
  recipientEmail,
  accessUrl,
  fallbackUrl,
  passwordSetupUrl,
  presetDownloadUrl: _presetDownloadUrl,
}: {
  firstName: string
  recipientEmail?: string
  accessUrl: string
  fallbackUrl?: string
  passwordSetupUrl?: string
  presetDownloadUrl?: string
}) {
  const resolvedFallbackUrl = fallbackUrl || starterKitLandingUrl()
  const heroImage = getEmailHeroImage("starter_kit_ai_ready_selfie")
  const systemUrl = new URL(buildRevenueEmailLink(selfieToBrandShootCheckoutUrl(), {
    campaign: "starter_kit_day0_system_credit",
    content: "see_system_160",
    emailType: "starter-kit-day0-delivery",
  }))
  if (recipientEmail) {
    systemUrl.searchParams.set("checkout_email", recipientEmail)
  }
  systemUrl.searchParams.set("checkout_source", "starter_kit_receipt_credit")
  systemUrl.searchParams.set("cta_keyword", "STARTER_KIT")
  systemUrl.searchParams.set("buyer_stage", "micro")
  systemUrl.searchParams.set("starter_kit_credit", "1")
  systemUrl.searchParams.set("upgrade_credit", "3700")

  const kitButton = passwordSetupUrl
    ? `<div style="margin:20px 0 10px;">${renderStoneButton("Set Your Password", passwordSetupUrl)}</div>
       <div style="margin:8px 0 0;">${renderStoneButton("Open Your Starter Kit", accessUrl, "outline")}</div>`
    : `<div style="margin:20px 0 0;">${renderStoneButton("Open Your Starter Kit", accessUrl, "outline")}</div>`

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hey ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">You're in. Your Starter Kit is ready and waiting here:</p>
    ${kitButton}
    <p style="margin:24px 0 16px;font-size:16px;line-height:1.8;">Start with the presets and the setup guide. That's your fastest win. Everything else is there when you want it: the posing guide, the captions, and your 7-day content plan.</p>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#8a8780;">Inside your kit:</p>
    <ul style="margin:0 0 20px;padding-left:20px;font-size:15px;line-height:2;color:#3a3a3a;">
      <li>The SSELFIE Presets (phone + desktop)</li>
      <li>Quick Preset Setup Guide</li>
      <li>The Posing Playbook</li>
      <li>The Caption &amp; Content Library</li>
      <li>The Storytelling Captions</li>
      <li>The 7-Day Content Starter</li>
      <li>The Selfie Guide</li>
    </ul>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">One more thing, because I want this to keep paying off for you.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">I've added your <strong>$37 as a credit</strong> on your account. Whenever you're ready for the full guided path, the Selfie to Brand Shoot System, that $37 comes right off the top. <strong>$197 becomes $160.</strong> No code to remember, no deadline. It's just there when you want it.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">The System is the whole method: how to choose your look, build a full shoot from one selfie, pick the images that still look like you, and turn them into content. The Prompt Vault is included too.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">No rush at all. Enjoy your kit first. I just wanted you to know the credit is waiting.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("See the System · your price $160", systemUrl.toString(), "outline")}</div>
    <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#a8a49c;">Can't find this email later? Access your kit anytime at: <a href="${resolvedFallbackUrl}" style="color:#a8a49c;">${resolvedFallbackUrl}</a></p>
    <p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:#8a8780;">Questions? Reply to this email or reach us at <a href="mailto:support@sselfie.ai" style="color:#8a8780;">support@sselfie.ai</a></p>
  `

  const textKitLine = passwordSetupUrl
    ? `Set your password: ${passwordSetupUrl}\nOpen your kit: ${accessUrl}\n`
    : `Open your kit: ${accessUrl}\n`

  return {
    subject: "you're in (and here's a little something)",
    html: renderStoneShell({
      eyebrow: "Starter Kit",
      title: "Your kit is ready.",
      subtitle: "Your $37 is already working for you.",
      bodyHtml,
      ...heroImage,
      footerLead: "No rush. Enjoy the kit first.",
      footerSignoff: "Sandra x",
    }),
    text: `Hey ${firstName},\n\nYou're in. Your Starter Kit is ready and waiting here:\n\n${textKitLine}\nStart with the presets and the setup guide. That's your fastest win. Everything else is there when you want it: the posing guide, the captions, and your 7-day content plan.\n\nInside your kit:\n- The SSELFIE Presets (phone + desktop)\n- Quick Preset Setup Guide\n- The Posing Playbook\n- The Caption & Content Library\n- The Storytelling Captions\n- The 7-Day Content Starter\n- The Selfie Guide\n\nOne more thing, because I want this to keep paying off for you.\n\nI've added your $37 as a credit on your account. Whenever you're ready for the full guided path, the Selfie to Brand Shoot System, that $37 comes right off the top. $197 becomes $160. No code to remember, no deadline. It's just there when you want it.\n\nThe System is the whole method: how to choose your look, build a full shoot from one selfie, pick the images that still look like you, and turn them into content. The Prompt Vault is included too.\n\nNo rush at all. Enjoy your kit first. I just wanted you to know the credit is waiting.\n\nSee the System · your price $160:\n${systemUrl.toString()}\n\nNeed help? Reply here or email support@sselfie.ai\n\nSandra x`,
  }
}
