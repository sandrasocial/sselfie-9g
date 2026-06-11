export interface ShopifyMigrationWelcomeParams {
  firstName: string
  courseName: string
  courseId: string
  isNewAccount: boolean
  passwordSetupUrl?: string
  siteUrl: string
}

export function generateShopifyMigrationEmail(params: ShopifyMigrationWelcomeParams): {
  html: string
  text: string
} {
  const { firstName, courseName, isNewAccount, passwordSetupUrl, siteUrl } = params
  const safeName = firstName?.trim() ? firstName.trim() : "there"

  const resolvedPasswordUrl = passwordSetupUrl || `${siteUrl}/auth/setup-password`

  const accountLine = isNewAccount
    ? `Your account has been set up. Set your password here: ${resolvedPasswordUrl}`
    : "Log in with the email you used on Shopify"

  const htmlAccountLine = isNewAccount
    ? `Your account has been set up. <a href="${resolvedPasswordUrl}" style="color: #1c1917; text-decoration: underline;">Click here to set your password</a>.`
    : "Log in with the email you used on Shopify."

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ${courseName} is waiting for you</title>
</head>
<body style="margin: 0; padding: 0; font-family: Inter, Arial, sans-serif; background-color: #fafaf9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 24px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="padding: 36px 32px 16px; text-align: center;">
              <h1 style="margin: 0 0 12px; color: #1c1917; font-size: 26px; font-weight: 300; letter-spacing: 0.3em; text-transform: uppercase; font-family: 'Cormorant Garamond', Georgia, serif;">
                S S E L F I E
              </h1>
              <p style="margin: 0; color: #57534e; font-size: 15px; font-weight: 300; line-height: 1.6;">
                Your ${courseName} is waiting for you.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 24px;">
              <p style="margin: 0 0 12px; color: #292524; font-size: 15px; line-height: 1.7;">
                Hey ${safeName},
              </p>
              <p style="margin: 0 0 12px; color: #292524; font-size: 15px; line-height: 1.7;">
                I wanted to reach out personally because I know this has been confusing, and that's on me.
              </p>
              <p style="margin: 0 0 12px; color: #292524; font-size: 15px; line-height: 1.7;">
                I moved everything from Shopify into my own app, SSELFIE Studio. Which means your ${courseName} is now inside there, waiting for you.
              </p>
              <p style="margin: 0 0 12px; color: #292524; font-size: 15px; line-height: 1.7;">
                You paid for it. It's yours. Always has been.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 24px;">
              <p style="margin: 0 0 12px; color: #292524; font-size: 15px; line-height: 1.7;">
                Here's how to access it:
              </p>
              <ol style="margin: 0; padding-left: 18px; color: #292524; font-size: 15px; line-height: 1.7;">
                <li style="margin-bottom: 8px;">Go to <a href="${siteUrl}" style="color: #1c1917; text-decoration: underline;">sselfie.ai</a></li>
                <li style="margin-bottom: 8px;">${htmlAccountLine}</li>
                <li style="margin-bottom: 8px;">Head to Academy in the app</li>
                <li>Your course will be right there</li>
              </ol>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 24px;">
              <p style="margin: 0 0 12px; color: #292524; font-size: 15px; line-height: 1.7;">
                I'm genuinely sorry for the confusion. Moving platforms is messy and you shouldn't have had to chase this down.
              </p>
              <p style="margin: 0; color: #292524; font-size: 15px; line-height: 1.7;">
                If anything doesn't work, just reply to this email. I'll sort it personally.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 36px;">
              <p style="margin: 0; color: #292524; font-size: 15px; line-height: 1.7;">
                Sandra<br />
                The Selfie Queen 🖤
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  const text = `
Hey ${safeName},

I wanted to reach out personally because I know this has been confusing, and that's on me.

I moved everything from Shopify into my own app, SSELFIE Studio. Which means your ${courseName} is now inside there, waiting for you.

You paid for it. It's yours. Always has been.

Here's how to access it:
1) Go to sselfie.ai
2) ${accountLine}
3) Head to Academy in the app
4) Your course will be right there

I'm genuinely sorry for the confusion. Moving platforms is messy and you shouldn't have had to chase this down.

If anything doesn't work, just reply to this email. I'll sort it personally.

Sandra
The Selfie Queen 🖤
  `

  return { html, text }
}
