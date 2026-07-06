import { renderStoneButton, renderStoneShell } from "./stone-email"
import { promptVaultLandingUrl, selfieToBrandShootLandingUrl } from "./selfie-education-links"

export function generateSelfieToBrandShootDeliveryEmail({
  firstName,
  accessUrl,
  vaultUrl,
  passwordSetupUrl,
}: {
  firstName: string
  accessUrl: string
  vaultUrl: string
  passwordSetupUrl?: string
}) {
  const fallbackUrl = selfieToBrandShootLandingUrl()
  const fallbackVaultUrl = vaultUrl || promptVaultLandingUrl()

  const systemButtons = passwordSetupUrl
    ? `<div style="margin:20px 0 10px;">${renderStoneButton("Set Your Password", passwordSetupUrl)}</div>
       <div style="margin:8px 0 0;">${renderStoneButton("Open The System", accessUrl, "outline")}</div>`
    : `<div style="margin:20px 0 0;">${renderStoneButton("Open The System", accessUrl, "outline")}</div>`

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Your Selfie to Brand Shoot System is ready.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Start with one clear selfie, choose one visual world, create your first AI brand shoot, then decide where that photo belongs in your content.</p>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#8a8780;">Inside your access:</p>
    <ul style="margin:0 0 20px;padding-left:20px;font-size:15px;line-height:2;color:#3a3a3a;">
      <li>The guided Selfie to Brand Shoot path</li>
      <li>Source selfie guidance</li>
      <li>The Vault included for visual worlds and prompts</li>
      <li>Keep / Fix / Delete checkpoints</li>
      <li>Posting guidance for your first shoot</li>
    </ul>
    ${systemButtons}
    <div style="margin:12px 0 0;">${renderStoneButton("Open The Vault", fallbackVaultUrl, "outline")}</div>
    <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#a8a49c;">Can't find this email later? Start here: <a href="${fallbackUrl}" style="color:#a8a49c;">${fallbackUrl}</a></p>
    <p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:#8a8780;">Questions? Reply here or reach us at <a href="mailto:support@sselfie.ai" style="color:#8a8780;">support@sselfie.ai</a></p>
  `

  const passwordLine = passwordSetupUrl ? `Set your password: ${passwordSetupUrl}\n` : ""

  return {
    subject: "your Selfie to Brand Shoot system is ready",
    html: renderStoneShell({
      eyebrow: "Selfie to Brand Shoot",
      title: "Your system is ready.",
      subtitle: "One clear selfie can become the first shoot for your brand.",
      bodyHtml,
      footerLead: "Start with one photo. Build the visual identity from there.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nYour Selfie to Brand Shoot System is ready.\n\nStart with one clear selfie, choose one visual world, create your first AI brand shoot, then decide where that photo belongs in your content.\n\nInside your access:\n- The guided Selfie to Brand Shoot path\n- Source selfie guidance\n- The Vault included for visual worlds and prompts\n- Keep / Fix / Delete checkpoints\n- Posting guidance for your first shoot\n\n${passwordLine}Open The System: ${accessUrl}\nOpen The Vault: ${fallbackVaultUrl}\n\nNeed help? Reply here or email support@sselfie.ai\n\nSandra x`,
  }
}
