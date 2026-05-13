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

  // Preset download is the first action — it's what buyers came for.
  // If the preset URL is available, lead with it. Then set password / open kit.
  const presetBlock = presetDownloadUrl
    ? `<div style="margin:28px 0 10px;">${renderStoneButton("Download Your Presets", presetDownloadUrl)}</div>
       <p style="margin:0 0 4px;font-size:13px;line-height:1.6;color:#8a8780;">Open the .zip file and import into Lightroom Mobile or Desktop.</p>`
    : ""

  const kitButton = passwordSetupUrl
    ? `<div style="margin:20px 0 10px;">${renderStoneButton("Set Your Password", passwordSetupUrl)}</div>
       <div style="margin:8px 0 0;">${renderStoneButton("Open Your Starter Kit", accessUrl, "outline")}</div>`
    : `<div style="margin:20px 0 0;">${renderStoneButton("Open Your Starter Kit", accessUrl, "outline")}</div>`

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Your Starter Kit is ready.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Your presets are the fastest win — download them first, install in Lightroom, then open the kit to work through the selfie guide and 7-day content starter.</p>
    ${presetBlock}
    ${kitButton}
    <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#a8a49c;">Can't find the email later? Access your kit anytime at: <a href="${resolvedFallbackUrl}" style="color:#a8a49c;">${resolvedFallbackUrl}</a></p>
    <p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:#8a8780;">Questions? Reply to this email or reach us at <a href="mailto:support@sselfie.ai" style="color:#8a8780;">support@sselfie.ai</a></p>
  `

  const textPresetLine = presetDownloadUrl
    ? `Download your Lightroom presets: ${presetDownloadUrl}\n(Open the .zip and import into Lightroom Mobile or Desktop)\n\n`
    : ""

  const textKitLine = passwordSetupUrl
    ? `Set your password: ${passwordSetupUrl}\nOpen your kit: ${accessUrl}\n`
    : `Open your kit: ${accessUrl}\n`

  return {
    subject: "your starter kit is here — presets inside",
    html: renderStoneShell({
      eyebrow: "Starter Kit",
      title: "Your presets are ready.",
      subtitle: presetDownloadUrl
        ? "Download your Lightroom presets, then open the selfie guide and 7-day content starter."
        : "Your guide, presets, and 7-day content starter are waiting for you.",
      bodyHtml,
      footerLead: "One photo. Good light. Keep it simple.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nYour Starter Kit is ready.\n\n${textPresetLine}${textKitLine}\nStart with one photo you can post, then use the 7-day content starter to turn it into content.\n\nNeed help? Reply here or email support@sselfie.ai\n\nSandra x`,
  }
}
