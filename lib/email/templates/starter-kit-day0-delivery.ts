import { getEmailHeroImage } from "../email-image-assets"
import { renderStoneButton, renderStoneShell } from "./stone-email"
import { starterKitLandingUrl } from "./selfie-education-links"

export function generateStarterKitDay0DeliveryEmail({
  firstName,
  accessUrl,
  fallbackUrl,
  passwordSetupUrl,
  presetDownloadUrl,
}: {
  firstName: string
  accessUrl: string
  fallbackUrl?: string
  passwordSetupUrl?: string
  presetDownloadUrl?: string
}) {
  const resolvedFallbackUrl = fallbackUrl || starterKitLandingUrl()
  const heroImage = getEmailHeroImage("starter_kit_ai_ready_selfie")

  const kitButton = passwordSetupUrl
    ? `<div style="margin:20px 0 10px;">${renderStoneButton("Set Your Password", passwordSetupUrl)}</div>
       <div style="margin:8px 0 0;">${renderStoneButton("Open Your Starter Kit", accessUrl, "outline")}</div>`
    : `<div style="margin:20px 0 0;">${renderStoneButton("Open Your Starter Kit", accessUrl, "outline")}</div>`

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Your Starter Kit is ready.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Start with the presets and the setup guide. That is the fastest win.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">This is your AI-ready selfie foundation: better phone photos, cleaner edits, easier poses, and captions so the photos actually become content.</p>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#8a8780;">Inside your kit:</p>
    <ul style="margin:0 0 20px;padding-left:20px;font-size:15px;line-height:2;color:#3a3a3a;">
      <li>Lightroom presets</li>
      <li>SSELFIE Preset Setup Guide</li>
      <li>Posing Guide</li>
      <li>Caption Templates</li>
      <li>Storytelling Guide</li>
      <li>Editing Masterclass</li>
      <li>7-Day Content Starter</li>
    </ul>
    ${kitButton}
    <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#a8a49c;">Can't find this email later? Access your kit anytime at: <a href="${resolvedFallbackUrl}" style="color:#a8a49c;">${resolvedFallbackUrl}</a></p>
    <p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:#8a8780;">Questions? Reply to this email or reach us at <a href="mailto:support@sselfie.ai" style="color:#8a8780;">support@sselfie.ai</a></p>
  `

  const textKitLine = passwordSetupUrl
    ? `Set your password: ${passwordSetupUrl}\nOpen your kit: ${accessUrl}\n`
    : `Open your kit: ${accessUrl}\n`

  return {
    subject: "your starter kit is here",
    html: renderStoneShell({
      eyebrow: "Starter Kit",
      title: "Your kit is ready.",
      subtitle: "Your phone-first foundation for cleaner selfies and better AI visual results.",
      bodyHtml,
      ...heroImage,
      footerLead: "One photo. Good light. Keep it simple.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nYour Starter Kit is ready.\n\nStart with the presets and the setup guide. That is the fastest win.\n\nThis is your AI-ready selfie foundation: better phone photos, cleaner edits, easier poses, and captions so the photos actually become content.\n\nInside your kit:\n- Lightroom presets\n- SSELFIE Preset Setup Guide\n- Posing Guide\n- Caption Templates\n- Storytelling Guide\n- Editing Masterclass\n- 7-Day Content Starter\n\n${textKitLine}\nNeed help? Reply here or email support@sselfie.ai\n\nSandra x`,
  }
}
