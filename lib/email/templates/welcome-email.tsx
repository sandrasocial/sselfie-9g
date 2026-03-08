import type { WelcomeEmailParams } from "./welcome-email-params"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

export function generateWelcomeEmail(params: WelcomeEmailParams): {
  html: string
  text: string
} {
  const { customerName, customerEmail, creditsGranted, packageName, productType, passwordSetupUrl } = params
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  const studioUrl = `${siteUrl}/studio`
  const name = getFirstNameForEmail({ fullName: customerName, email: customerEmail })

  if (productType === "credit_topup") {
    const bodyHtml = `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${name},</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Your credits are in and ready to use.</p>
      ${renderStonePanel(
        `<p style="margin:0 0 8px;font-size:15px;line-height:1.75;color:#f0ede8;">Order:</p>
         <p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">${packageName}<br />${creditsGranted} credits added to your account</p>`,
        "Payment Confirmed",
      )}
      <div style="margin:26px 0 22px;">${renderStoneButton("Open Studio", studioUrl)}</div>
      <p style="margin:0;font-size:15px;line-height:1.75;color:#a8a49c;">Use them while the idea is fresh.</p>
    `

    const html = renderStoneShell({
      title: "Credits added",
      eyebrow: "Payment Confirmed",
      subtitle: "Your next image is ready when you are.",
      bodyHtml,
    })

    const text = `Payment Confirmed

Hey ${name},

Your credits are in and ready to use.

${packageName}
${creditsGranted} credits added to your account

Open Studio: ${studioUrl}

Use them while the idea is fresh.

Sandra`

    return { html, text }
  }

  const isMembership = productType === "sselfie_studio_membership"
  const ctaUrl = passwordSetupUrl || studioUrl
  const ctaText = passwordSetupUrl ? "Set your password" : "Open Studio"

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hey ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You're officially in.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">${isMembership ? "Studio is ready for you now." : "Your account is ready now."} The fastest way to make this feel real is to get one result on the board today.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 8px;font-size:15px;line-height:1.75;color:#f0ede8;">Your order:</p>
       <p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">${packageName}<br />${creditsGranted} credits included</p>`,
      "What You Have",
    )}
    ${
      passwordSetupUrl
        ? renderStonePanel(
            `<p style="margin:0;font-size:15px;line-height:1.8;color:#a8a49c;">Set your password first, then you'll land inside Studio and can start creating straight away.</p>`,
            "First Step",
          )
        : ""
    }
    <div style="margin:26px 0 22px;">${renderStoneButton(ctaText, ctaUrl)}</div>
    <p style="margin:0;font-size:15px;line-height:1.75;color:#a8a49c;">If you want the best first win, open Maya and make one image today.</p>
  `

  const html = renderStoneShell({
    title: isMembership ? "You're in" : "Welcome in",
    eyebrow: isMembership ? "Studio Membership" : "Purchase Confirmed",
    subtitle: "Let's make your first result happen fast.",
    bodyHtml,
  })

  const text = `${isMembership ? "Studio Membership" : "Purchase Confirmed"}

Hey ${name},

You're officially in.

${isMembership ? "Studio is ready for you now." : "Your account is ready now."} The fastest way to make this feel real is to get one result on the board today.

Your order:
${packageName}
${creditsGranted} credits included

${passwordSetupUrl ? `Set your password: ${passwordSetupUrl}` : `Open Studio: ${studioUrl}`}

If you want the best first win, open Maya and make one image today.

Sandra`

  return { html, text }
}
