const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://www.sselfie.ai")
  .replace(/^https:\/\/sselfie\.ai$/, "https://www.sselfie.ai")
  .replace(/\/+$/, "")

export function generatePostActivationUpgradeEmail(input: {
  firstName?: string
  generatedImageUrl?: string | null
}) {
  const firstName = input.firstName?.trim() || "friend"
  const generatedImageUrl = input.generatedImageUrl || null

  const ctaUrl = `${SITE_URL}/checkout/membership?utm_source=email&utm_medium=lifecycle&utm_campaign=post_activation_upgrade`
  const studioUrl = `${SITE_URL}/app?utm_source=email&utm_medium=lifecycle&utm_campaign=post_activation_upgrade`

  const imageHtml = generatedImageUrl
    ? `<img src="${generatedImageUrl}" alt="Your brand photo" style="width:100%;max-width:420px;border-radius:12px;display:block;margin:0 auto 24px auto;" />`
    : ""

  const subject = `${firstName}, your first photo came out great`

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color: #1c1917; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px;">
      <p style="margin:0 0 12px 0;">Hey ${firstName},</p>
      <p style="margin:0 0 16px 0;">You made your first photo with Maya. That\u2019s the hard part done.</p>
      ${imageHtml}
      <p style="margin:0 0 16px 0;">Most women who make one photo end up making 10 more in the same week.</p>
      <p style="margin:0 0 16px 0;">The SUITE gives you 100 credits every month. Maya helps you turn them into the content you need next.</p>
      <p style="margin:0 0 24px 0;">If you liked what Maya made today, the SUITE just keeps it going.</p>
      <p style="margin:0 0 20px 0;">
        <a href="${ctaUrl}" style="display:inline-block;background:#1c1917;color:#fafaf9;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.05em;">
          Join SSELFIE SUITE \u00b7 \u20ac97/month
        </a>
      </p>
      <p style="margin:0 0 4px 0;font-size:13px;color:#57534e;">Not ready yet? No worries.</p>
      <p style="margin:0;font-size:13px;"><a href="${studioUrl}" style="color:#57534e;">Go back to Maya</a></p>
    </div>
  `

  const text = [
    `Hey ${firstName},`,
    "",
    "You made your first photo with Maya. That\u2019s the hard part done.",
    "",
    "Most women who make one photo end up making 10 more in the same week.",
    "The SUITE gives you 100 credits every month. Maya helps you turn them into the content you need next.",
    "",
    `Join SSELFIE SUITE: ${ctaUrl}`,
    `Go back to Maya: ${studioUrl}`,
  ].join("\n")

  return { subject, html, text }
}
