import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStoneShell } from "./stone-email"

export interface BrandStrategySetupNotificationParams {
  firstName?: string
  recipientEmail: string
  setupUrl: string
}

export function generateBrandStrategySetupNotificationEmail({
  firstName,
  recipientEmail,
  setupUrl,
}: BrandStrategySetupNotificationParams): {
  html: string
  text: string
  subject: string
} {
  const name = getFirstNameForEmail({ fullName: firstName, email: recipientEmail })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Payment confirmed. You're one step away from your brand strategy.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Click the button below, answer four quick questions about your business, and Maya will build your strategy in minutes.</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("Build My Strategy →", setupUrl)}</div>
    <p style="margin:0;font-size:14px;line-height:1.75;color:#a8a49c;">This link is yours. It won't expire. But don't sit on it too long. The sooner you do it, the sooner your strategy is live.</p>
  `

  const html = renderStoneShell({
    title: "One step away",
    eyebrow: "Brand Strategy",
    subtitle: "Payment confirmed. Time to meet Maya.",
    bodyHtml,
    footerLead: "Any trouble? Reply to this email. I read every message.",
  })

  const text = `Brand Strategy

Hey ${name},

Payment confirmed. You're one step away from your brand strategy.

Click the link below, answer four quick questions about your business, and Maya will build your strategy in minutes.

Build My Strategy: ${setupUrl}

This link is yours. It won't expire. But don't sit on it too long. The sooner you do it, the sooner your strategy is live.

Any trouble? Reply to this email. I read every message.

Sandra`

  return {
    html,
    text,
    subject: `${name}, your brand strategy is one step away`,
  }
}
