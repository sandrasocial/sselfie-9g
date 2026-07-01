import { getEmailHeroImage } from "../email-image-assets"
import { renderStoneButton, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"
import { promptVaultCheckoutUrl, starterKitLandingUrl, studioLandingUrl } from "./selfie-education-links"

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
  const vaultUrl = new URL(buildRevenueEmailLink(promptVaultCheckoutUrl(), {
    campaign: "selfie_ai_kit_day0_vault_bridge",
    content: "open_vault",
    emailType: "starter-kit-day0-delivery",
  }))
  const suiteUrl = new URL(buildRevenueEmailLink(studioLandingUrl(), {
    campaign: "selfie_ai_kit_day0_suite_bridge",
    content: "see_suite",
    emailType: "starter-kit-day0-delivery",
  }))
  if (recipientEmail) {
    vaultUrl.searchParams.set("checkout_email", recipientEmail)
    suiteUrl.searchParams.set("checkout_email", recipientEmail)
  }
  vaultUrl.searchParams.set("checkout_source", "selfie_ai_kit_receipt")
  vaultUrl.searchParams.set("cta_keyword", "STARTER_KIT")
  vaultUrl.searchParams.set("buyer_stage", "micro")
  suiteUrl.searchParams.set("checkout_source", "selfie_ai_kit_receipt")
  suiteUrl.searchParams.set("cta_keyword", "STARTER_KIT")
  suiteUrl.searchParams.set("buyer_stage", "micro")

  const kitButton = passwordSetupUrl
    ? `<div style="margin:20px 0 10px;">${renderStoneButton("Set Your Password", passwordSetupUrl)}</div>
       <div style="margin:8px 0 0;">${renderStoneButton("Open Your Starter Kit", accessUrl, "outline")}</div>`
    : `<div style="margin:20px 0 0;">${renderStoneButton("Open Your Starter Kit", accessUrl, "outline")}</div>`

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hey ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">You&apos;re in. Your Selfie To AI Photos Kit is ready here:</p>
    ${kitButton}
    <p style="margin:24px 0 16px;font-size:16px;line-height:1.8;">Start with the source selfie checklist. That is the part most people skip, and it is usually why the AI photo starts looking strange.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Then use the starter prompts and the fix prompts. If the result is close, do not start over. Fix the face, light, pose, or crop first.</p>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#8a8780;">Inside your kit:</p>
    <ul style="margin:0 0 20px;padding-left:20px;font-size:15px;line-height:2;color:#3a3a3a;">
      <li>Source selfie checklist</li>
      <li>Good vs bad source photo guidance</li>
      <li>AI photo starter prompts</li>
      <li>Still-you fix prompts</li>
      <li>3-image starter shoot path</li>
      <li>Presets, posing help, captions, and your 7-day content starter</li>
    </ul>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">One small note: if you love the first result and want more visual worlds, the Prompt Vault is the next step. If you want Maya to help you keep creating photos, covers, and content every month, SUITE is there too.</p>
    <div style="margin:28px 0 10px;">${renderStoneButton("Open the Prompt Vault", vaultUrl.toString(), "outline")}</div>
    <div style="margin:8px 0 14px;">${renderStoneButton("See SSELFIE SUITE", suiteUrl.toString(), "outline")}</div>
    <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#a8a49c;">Can't find this email later? Access your kit anytime at: <a href="${resolvedFallbackUrl}" style="color:#a8a49c;">${resolvedFallbackUrl}</a></p>
    <p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:#8a8780;">Questions? Reply to this email or reach us at <a href="mailto:support@sselfie.ai" style="color:#8a8780;">support@sselfie.ai</a></p>
  `

  const textKitLine = passwordSetupUrl
    ? `Set your password: ${passwordSetupUrl}\nOpen your kit: ${accessUrl}\n`
    : `Open your kit: ${accessUrl}\n`

  return {
    subject: "you're in (and here's a little something)",
    html: renderStoneShell({
      eyebrow: "Selfie To AI Photos Kit",
      title: "Your kit is ready.",
      subtitle: "Start with one clear selfie.",
      bodyHtml,
      ...heroImage,
      footerLead: "No rush. Enjoy the kit first.",
      footerSignoff: "Sandra x",
    }),
    text: `Hey ${firstName},\n\nYou're in. Your Selfie To AI Photos Kit is ready here:\n\n${textKitLine}\nStart with the source selfie checklist. That is the part most people skip, and it is usually why the AI photo starts looking strange.\n\nThen use the starter prompts and the fix prompts. If the result is close, do not start over. Fix the face, light, pose, or crop first.\n\nInside your kit:\n- Source selfie checklist\n- Good vs bad source photo guidance\n- AI photo starter prompts\n- Still-you fix prompts\n- 3-image starter shoot path\n- Presets, posing help, captions, and your 7-day content starter\n\nOne small note: if you love the first result and want more visual worlds, the Prompt Vault is the next step. If you want Maya to help you keep creating photos, covers, and content every month, SUITE is there too.\n\nOpen the Prompt Vault:\n${vaultUrl.toString()}\n\nSee SSELFIE SUITE:\n${suiteUrl.toString()}\n\nNeed help? Reply here or email support@sselfie.ai\n\nSandra x`,
  }
}
