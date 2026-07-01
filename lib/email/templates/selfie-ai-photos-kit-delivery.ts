/* eslint-disable no-restricted-syntax */
import { renderStoneButton, renderStoneShell } from "./stone-email"
import { promptVaultCheckoutUrl, studioLandingUrl } from "./selfie-education-links"

export function generateSelfieAiPhotosKitDeliveryEmail({
  firstName,
  accessUrl,
  passwordSetupUrl,
}: {
  firstName: string
  accessUrl: string
  passwordSetupUrl?: string
}) {
  const vaultUrl = `${promptVaultCheckoutUrl()}?source=selfie_ai_photos_kit_delivery&utm_source=email&utm_medium=delivery&utm_campaign=selfie_ai_photos_kit_day0_vault_bridge&checkout_source=selfie_ai_photos_kit_receipt&buyer_stage=micro&cta_keyword=PROMPT`
  const suiteUrl = `${studioLandingUrl()}?utm_source=email&utm_medium=delivery&utm_campaign=selfie_ai_photos_kit_day0_suite_bridge&source=selfie_ai_photos_kit_delivery`
  const primaryButton = passwordSetupUrl
    ? `<div style="margin:20px 0 10px;">${renderStoneButton("Set Your Password", passwordSetupUrl)}</div>
       <div style="margin:8px 0 0;">${renderStoneButton("Open Your AI Photos Kit", accessUrl, "outline")}</div>`
    : `<div style="margin:20px 0 0;">${renderStoneButton("Open Your AI Photos Kit", accessUrl, "outline")}</div>`

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Your Selfie To AI Photos Kit is ready.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Start with the source selfie checklist. Then copy the first prompt and use one clear selfie to create your first AI photo.</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.8;">Inside you have the checklist, good vs bad source photo notes, starter prompts, still-you fix prompts, and a simple 3-image path: profile photo, reel cover, and lifestyle image.</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.8;">The goal is not to look like someone else. The goal is to get a result that feels like you on a clear day.</p>
    ${primaryButton}
    <p style="margin:26px 0 10px;font-size:14px;line-height:1.7;color:#8a8780;">When you want more visual worlds, open the full Prompt Vault:</p>
    <div style="margin:0 0 18px;">${renderStoneButton("Get the Prompt Vault", vaultUrl, "outline")}</div>
    <p style="margin:0 0 10px;font-size:14px;line-height:1.7;color:#8a8780;">When you want Maya to help you keep creating every month, this is the SUITE:</p>
    <div style="margin:0;">${renderStoneButton("See SSELFIE SUITE", suiteUrl, "outline")}</div>
    <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#8a8780;">Questions? Reply here or email <a href="mailto:support@sselfie.ai" style="color:#8a8780;">support@sselfie.ai</a></p>
  `

  const textPrimaryLine = passwordSetupUrl
    ? `Set your password: ${passwordSetupUrl}\nOpen your AI Photos Kit: ${accessUrl}`
    : `Open your AI Photos Kit: ${accessUrl}`

  return {
    subject: "your AI photos kit is ready",
    html: renderStoneShell({
      eyebrow: "Selfie To AI Photos Kit",
      title: "Your Kit is ready.",
      subtitle: "Start with one clear selfie. Keep the result still you.",
      bodyHtml,
      footerLead: "One selfie. One first result. Start there.",
      footerSignoff: "Sandra x",
    }),
    text: [
      `Hi ${firstName},`,
      "",
      "Your Selfie To AI Photos Kit is ready.",
      "",
      "Start with the source selfie checklist. Then copy the first prompt and use one clear selfie to create your first AI photo.",
      "",
      "Inside you have the checklist, good vs bad source photo notes, starter prompts, still-you fix prompts, and a simple 3-image path: profile photo, reel cover, and lifestyle image.",
      "",
      "The goal is not to look like someone else. The goal is to get a result that feels like you on a clear day.",
      "",
      textPrimaryLine,
      "",
      `Prompt Vault: ${vaultUrl}`,
      `SSELFIE SUITE: ${suiteUrl}`,
      "",
      "Need help? Reply here or email support@sselfie.ai",
      "",
      "Sandra x",
    ].join("\n"),
  }
}
