const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://sselfie.ai"

export function generateWelcomeFirstGenerationFollowupEmail(input: {
  firstName?: string
  generatedImageUrl?: string | null
}) {
  const firstName = input.firstName?.trim() || "friend"
  const generatedImageUrl = input.generatedImageUrl || null

  const ctaUrl = `${SITE_URL}/checkout/membership?utm_source=email&utm_medium=lifecycle&utm_campaign=welcome_first_generation_followup`
  const studioUrl = `${SITE_URL}/maya?utm_source=email&utm_medium=lifecycle&utm_campaign=welcome_first_generation_followup`

  const imageHtml = generatedImageUrl
    ? `<img src="${generatedImageUrl}" alt="Your generated brand photo" style="width:100%;max-width:420px;border-radius:12px;display:block;margin:0 auto 20px auto;" />`
    : ""

  const subject = "Your brand photo is waiting for you"

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #1c1917; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px;">
      <p style="margin:0 0 12px 0;">Hey ${firstName},</p>
      <p style="margin:0 0 16px 0;">Your first brand image is waiting for you inside SSELFIE.</p>
      ${imageHtml}
      <p style="margin:0 0 16px 0;">This is what your brand can look like every week when Maya runs with you.</p>
      <p style="margin:0 0 20px 0;">
        <a href="${ctaUrl}" style="display:inline-block;background:#1c1917;color:#fafaf9;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;">
          Start your membership
        </a>
      </p>
      <p style="margin:0 0 8px 0;">No pressure. You can also jump back into studio first:</p>
      <p style="margin:0;"><a href="${studioUrl}" style="color:#57534e;">Open Maya</a></p>
    </div>
  `

  const text = [
    `Hey ${firstName},`,
    "",
    "Your first brand image is waiting for you inside SSELFIE.",
    "This is what your brand can look like every week when Maya runs with you.",
    "",
    `Start your membership: ${ctaUrl}`,
    `Open Maya: ${studioUrl}`,
  ].join("\n")

  return { subject, html, text }
}

