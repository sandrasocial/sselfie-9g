import { renderStoneButton, renderStoneShell } from "./stone-email"

export function generateMasterclassDay0DeliveryEmail({
  firstName,
  accessUrl,
  passwordSetupUrl,
}: {
  firstName: string
  accessUrl: string
  passwordSetupUrl?: string
}) {
  const primaryButton = passwordSetupUrl
    ? renderStoneButton("Set Your Password", passwordSetupUrl)
    : renderStoneButton("Open The Masterclass", accessUrl)
  const secondaryButton = passwordSetupUrl
    ? `<div style="margin:10px 0 0;">${renderStoneButton("Open The Masterclass", accessUrl, "outline")}</div>`
    : ""

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Your Masterclass access is ready.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Start with module one. Do not try to do all of it at once.</p>
    <div style="margin:28px 0 14px;">${primaryButton}</div>
    ${secondaryButton}
  `
  return {
    subject: "it's all there",
    html: renderStoneShell({
      eyebrow: "Masterclass",
      title: "Your Masterclass is ready.",
      subtitle: passwordSetupUrl
        ? "Set your password once, then start with light and move through the rest in order."
        : "Start with light. Then move through the rest in order.",
      bodyHtml,
      footerLead: "One module at a time is enough.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nYour Masterclass is ready.\n\n${
      passwordSetupUrl
        ? `Set your password: ${passwordSetupUrl}\nOpen the Masterclass: ${accessUrl}\n`
        : `Open the Masterclass: ${accessUrl}\n`
    }\nSandra x`,
  }
}
