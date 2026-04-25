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
  const primaryButton = passwordSetupUrl
    ? renderStoneButton("Set Your Password", passwordSetupUrl)
    : renderStoneButton("Open Your Starter Kit", accessUrl)
  const secondaryButton = passwordSetupUrl
    ? `<div style="margin:10px 0 0;">${renderStoneButton("Open Your Starter Kit", accessUrl, "outline")}</div>`
    : ""
  const resolvedFallbackUrl = fallbackUrl || starterKitLandingUrl()

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Your Starter Kit is ready.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Start with one photo you can actually post. Open the kit inside SSELFIE, download the presets, then use the 7-day starter to turn that photo into content.</p>
    <div style="margin:28px 0 14px;">${primaryButton}</div>
    ${secondaryButton}
    ${
      presetDownloadUrl
        ? `<p style="margin:18px 0 0;font-size:14px;line-height:1.7;">Need the files first? <a href="${presetDownloadUrl}" style="color:#a8a49c;">Download your presets</a></p>`
        : ""
    }
    <p style="margin:18px 0 0;font-size:14px;line-height:1.7;">Fallback access: <a href="${resolvedFallbackUrl}" style="color:#a8a49c;">Open the Starter Kit page</a></p>
  `

  return {
    subject: "your starter kit is here",
    html: renderStoneShell({
      eyebrow: "Starter Kit",
      title: "Your kit is ready.",
      subtitle: passwordSetupUrl
        ? "Set your password once, then your guide, presets, and 7-day content starter are waiting inside SSELFIE."
        : "Guide access, presets, and your 7-day content starter are waiting for you.",
      bodyHtml,
      footerLead: "One photo. Good light. Keep it simple.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nYour Starter Kit is ready.\n\n${
      passwordSetupUrl ? `Set your password: ${passwordSetupUrl}\nOpen your kit: ${accessUrl}\n` : `Open your kit: ${accessUrl}\n`
    }${
      presetDownloadUrl ? `Download your presets: ${presetDownloadUrl}\n` : ""
    }\nStart with one photo you can post, then use it across a simple 7-day content starter.\n\nFallback access: ${resolvedFallbackUrl}\n\nSandra x`,
  }
}
