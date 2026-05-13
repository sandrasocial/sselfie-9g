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
    : renderStoneButton("Start With Brand Strategy", accessUrl)
  const secondaryButton = passwordSetupUrl
    ? `<div style="margin:10px 0 0;">${renderStoneButton("Start With Brand Strategy", accessUrl, "outline")}</div>`
    : ""

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Your Masterclass access is ready, and it starts with your strategy foundation.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Start with your positioning first. Once you know what you sell, who it is for, and what you want to be known for, the lessons become much easier to use.</p>
    <div style="margin:28px 0 14px;">${primaryButton}</div>
    ${secondaryButton}
  `
  return {
    subject: "start with your strategy",
    html: renderStoneShell({
      eyebrow: "Masterclass",
      title: "Start with strategy.",
      subtitle: passwordSetupUrl
        ? "Set your password once, then complete your strategy foundation before moving through the lessons."
        : "Complete your strategy foundation first, then move through the lessons with a clearer offer.",
      bodyHtml,
      footerLead: "One clear offer first. Then one module at a time.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nYour Masterclass is ready, and it starts with your strategy foundation.\n\nStart with your positioning first. Once you know what you sell, who it is for, and what you want to be known for, the lessons become much easier to use.\n\n${
      passwordSetupUrl
        ? `Set your password: ${passwordSetupUrl}\nStart with Brand Strategy: ${accessUrl}\n`
        : `Start with Brand Strategy: ${accessUrl}\n`
    }\nSandra x`,
  }
}
