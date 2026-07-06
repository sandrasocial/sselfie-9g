const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai")
  .replace(/^https:\/\/www\.sselfie\.ai$/, "https://sselfie.ai")
  .replace(/\/+$/, "")

export function generateDormantMemberReengagementEmail(input: {
  firstName?: string
  creditBalance?: number
}) {
  const firstName = input.firstName?.trim() || "friend"
  const creditBalance = typeof input.creditBalance === "number" && input.creditBalance > 0
    ? input.creditBalance
    : null

  const studioUrl = `${SITE_URL}/app?utm_source=email&utm_medium=lifecycle&utm_campaign=dormant_member_reengagement`

  const creditsLine = creditBalance !== null
    ? `You still have ${creditBalance} credits waiting in your SUITE.`
    : "Your credits are waiting in your SUITE."

  const subject = `${firstName}, Maya\u2019s been waiting for you`

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color: #1c1917; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px;">
      <p style="margin:0 0 12px 0;">Hey ${firstName},</p>
      <p style="margin:0 0 16px 0;">${creditsLine}</p>
      <p style="margin:0 0 16px 0;">I noticed you haven\u2019t generated anything in a bit. No shame, just curious: did something get in the way, or has life just been busy?</p>
      <p style="margin:0 0 24px 0;">No agenda here. If you\u2019ve got a post to make or just want to see what Maya comes up with, she\u2019s ready when you are.</p>
      <p style="margin:0 0 20px 0;">
        <a href="${studioUrl}" style="display:inline-block;background:#1c1917;color:#fafaf9;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.05em;">
          Open Maya
        </a>
      </p>
      <p style="margin:0;font-size:12px;color:#666666;">You\u2019re a SUITE member. This is your space. Use it, or just reply and tell me what\u2019s in the way.</p>
    </div>
  `

  const text = [
    `Hey ${firstName},`,
    "",
    creditsLine,
    "",
    "I noticed you haven\u2019t generated anything in a bit. No shame, just curious: did something get in the way, or has life just been busy?",
    "No agenda here. If you\u2019ve got a post to make or just want to see what Maya comes up with, she\u2019s ready when you are.",
    "",
    `Open Maya: ${studioUrl}`,
  ].join("\n")

  return { subject, html, text }
}
