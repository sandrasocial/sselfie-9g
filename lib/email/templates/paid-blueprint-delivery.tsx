export interface PaidBlueprintDeliveryParams {
  firstName?: string
  email: string
  accessToken: string
  photoPreviewUrls?: string[]
}

// PRESERVE_FOR_EXISTING_BUYERS: old paid_blueprint purchases still receive Feed Planner access.
export const PAID_BLUEPRINT_DELIVERY_SUBJECT = "Your Feed Planner access is ready"

export function generatePaidBlueprintDeliveryEmail(params: PaidBlueprintDeliveryParams): {
  html: string
  text: string
} {
  const { firstName, email, accessToken } = params
  const displayName = firstName || email.split("@")[0]
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

  const feedPlannerUrl = `${siteUrl}/feed-planner?access=${accessToken}&utm_source=email&utm_medium=email&utm_campaign=paid_blueprint&utm_content=delivery`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Feed Planner access is ready</title>
</head>
<body style="margin: 0; padding: 0; font-family: Inter, Arial, sans-serif; background-color: #fafaf9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e7e5e4;">

          <!-- Header -->
          <tr>
            <td style="background-color: #0c0a09; padding: 40px 24px; text-align: center;">
              <h1 style="margin: 0; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 32px; font-weight: 200; letter-spacing: 0.3em; color: #fafaf9; text-transform: uppercase;">
                S S E L F I E
              </h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #1c1917;">
                Hey ${displayName},
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #1c1917;">
                Your Feed Planner access is live. You've got your 9-post grid, your content strategy, and your caption framework, all mapped out and ready to use.
              </p>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.7; color: #1c1917;">
                Here's where to start:
              </p>

              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 24px;">
                <tr>
                  <td style="padding: 16px 20px; background-color: #fafaf9; border-radius: 8px; border: 1px solid #e7e5e4;">
                    <p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #8a8780; letter-spacing: 0.1em; text-transform: uppercase;">Step 1</p>
                    <p style="margin: 0; font-size: 15px; line-height: 1.65; color: #292524;">Open your Feed Planner and review your 9-post grid. Get familiar with the layout before you start filling it in.</p>
                  </td>
                </tr>
                <tr><td style="height: 10px;"></td></tr>
                <tr>
                  <td style="padding: 16px 20px; background-color: #fafaf9; border-radius: 8px; border: 1px solid #e7e5e4;">
                    <p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #8a8780; letter-spacing: 0.1em; text-transform: uppercase;">Step 2</p>
                    <p style="margin: 0; font-size: 15px; line-height: 1.65; color: #292524;">Pick one post slot. Write the caption. Don't try to do all nine at once. One caption today builds the habit.</p>
                  </td>
                </tr>
                <tr><td style="height: 10px;"></td></tr>
                <tr>
                  <td style="padding: 16px 20px; background-color: #fafaf9; border-radius: 8px; border: 1px solid #e7e5e4;">
                    <p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #8a8780; letter-spacing: 0.1em; text-transform: uppercase;">Step 3</p>
                    <p style="margin: 0; font-size: 15px; line-height: 1.65; color: #292524;">Come back tomorrow and do one more. In a week you'll have your whole month planned.</p>
                  </td>
                </tr>
              </table>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${feedPlannerUrl}" style="display: inline-block; background-color: #1c1917; color: #fafaf9; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;">
                  Open your Visibility Reset &rarr;
                </a>
              </div>

              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.7; color: #57534e;">
                If you hit a wall or have questions, just reply here. I read every message.
              </p>

              <p style="margin: 0; font-size: 16px; color: #1c1917;">
                Sandra
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 30px; background-color: #fafaf9; border-top: 1px solid #e7e5e4; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 11px; color: #a8a29e;">
                SSELFIE Studio &bull; Fauskevegen 121, 6230 Sykkylven, Norway
              </p>
              <p style="margin: 0; font-size: 11px; color: #a8a29e;">
                <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color: #a8a29e; text-decoration: underline;">Unsubscribe</a>
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

  const text = `S S E L F I E

Hey ${displayName},

Your Feed Blueprint is live. You've got your 9-post grid, your content strategy, and your caption framework, all mapped out and ready to use.

Here's where to start:

Step 1: Open your Feed Planner and review your 9-post grid. Get familiar with the layout before you start filling it in.

Step 2: Pick one post slot. Write the caption. Don't try to do all nine at once. One caption today builds the habit.

Step 3: Come back tomorrow and do one more. In a week you'll have your whole month planned.

Open your Visibility Reset: ${feedPlannerUrl}

If you hit a wall or have questions, just reply here. I read every message.

Sandra

SSELFIE Studio · Fauskevegen 121, 6230 Sykkylven, Norway
Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`

  return { html, text }
}
