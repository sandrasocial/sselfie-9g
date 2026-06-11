import { renderStoneButton, renderStoneShell } from "./stone-email"

export function generateMasterclassDay0DeliveryEmail({
  firstName,
  courseUrl,
  brandStrategyUrl,
  passwordSetupUrl,
}: {
  firstName: string
  courseUrl: string
  brandStrategyUrl: string
  passwordSetupUrl?: string
}) {
  const primaryButton = passwordSetupUrl
    ? renderStoneButton("Set Your Password", passwordSetupUrl)
    : renderStoneButton("Open the Masterclass", courseUrl)
  const secondaryButton = passwordSetupUrl
    ? `<div style="margin:10px 0 0;">${renderStoneButton("Open the Masterclass", courseUrl, "outline")}</div>`
    : ""

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Your Masterclass is ready. All the lessons are waiting for you, starting with lesson one.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">One tip before you start: your purchase also includes the Brand Strategy tool. If you want your positioning clear before you build content, <a href="${brandStrategyUrl}" style="color:#2c2b29;">do that first</a>. It takes a few minutes and makes every lesson easier to use.</p>
    <div style="margin:28px 0 14px;">${primaryButton}</div>
    ${secondaryButton}
  `
  return {
    subject: "your Masterclass is ready",
    html: renderStoneShell({
      eyebrow: "Masterclass",
      title: "You're in.",
      subtitle: passwordSetupUrl
        ? "Set your password once, then start with lesson one."
        : "Start with lesson one. Short lessons, built to use right away.",
      bodyHtml,
      footerLead: "One lesson at a time. You don't have to rush this.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nYour Masterclass is ready. All the lessons are waiting for you, starting with lesson one.\n\nOne tip before you start: your purchase also includes the Brand Strategy tool. If you want your positioning clear before you build content, do that first: ${brandStrategyUrl}\n\n${
      passwordSetupUrl
        ? `Set your password: ${passwordSetupUrl}\nOpen the Masterclass: ${courseUrl}\n`
        : `Open the Masterclass: ${courseUrl}\n`
    }\nSandra x`,
  }
}
