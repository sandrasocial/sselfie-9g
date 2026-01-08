/**
 * Blueprint Discovery Email 4
 * "See how creators use Maya to plan their feeds."
 * 
 * Discovery Funnel - Social Proof
 * Only sent to users who signed up
 * Encourages Maya engagement
 */

export interface BlueprintDiscovery4Params {
  firstName?: string
  recipientEmail: string
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

export function generateBlueprintDiscovery4Email(params: BlueprintDiscovery4Params): {
  html: string
  text: string
  subject: string
} {
  const { firstName, recipientEmail } = params
  const displayName = firstName || recipientEmail.split("@")[0]

  // Generate UTM-tracked studio link (Maya tab)
  const mayaLink = `${SITE_URL}/studio?tab=maya&utm_source=colddiscovery&utm_campaign=blueprint_funnel&utm_content=email4`

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>See how creators use Maya to plan their feeds.</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fafaf9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #0c0a09; padding: 40px 24px; text-align: center;">
              <h1 style="margin: 0; font-family: 'Times New Roman', serif; font-size: 32px; font-weight: 200; letter-spacing: 0.3em; color: #fafaf9; text-transform: uppercase;">
                S S E L F I E
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Hey ${displayName},
              </p>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Creators are using Maya to plan 30 days of content in minutes — not hours.
              </p>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Here's how it works:
              </p>
              
              <div style="background-color: #fafaf9; padding: 24px; border-radius: 8px; margin: 24px 0;">
                <p style="margin: 0 0 12px; font-size: 16px; line-height: 1.6; color: #1c1917; font-weight: 500;">
                  Example: Ask Maya:
                </p>
                <p style="margin: 0 0 16px; padding: 16px; background-color: #ffffff; border-left: 4px solid #1c1917; font-size: 15px; line-height: 1.6; color: #57534e; font-style: italic;">
                  "Create an Instagram feed for my coaching business"
                </p>
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #57534e;">
                  Maya will plan your 9-post grid, write captions, suggest hashtags, and create a strategy — all in one conversation.
                </p>
              </div>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                No more staring at a blank screen wondering what to post.
              </p>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                Maya does the thinking. You do the creating.
              </p>
              
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #1c1917;">
                And remember — planning, captions, and strategy are all free. No credits needed.
              </p>

              <div style="margin: 32px 0; text-align: center;">
                <a href="${mayaLink}" style="display: inline-block; padding: 14px 32px; background-color: #1c1917; color: #fafaf9; text-decoration: none; font-weight: 500; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 8px;">
                  Start planning with Maya →
                </a>
              </div>

              <p style="margin: 32px 0 0; padding-top: 24px; border-top: 1px solid #e7e5e4; font-size: 15px; line-height: 1.6; color: #57534e;">
                Try it. Ask Maya anything about your content strategy. She's ready to help.
              </p>

              <p style="margin: 24px 0 0; font-size: 16px; color: #1c1917;">
                XoXo Sandra 💋
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f5f5f4; border-top: 1px solid #e7e5e4; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #78716c;">
                SSELFIE Studio - Where Visibility Meets Financial Freedom
              </p>
              <p style="margin: 0 0 8px; font-size: 12px; color: #78716c;">
                <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color: #78716c; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `S S E L F I E

Hey ${displayName},

Creators are using Maya to plan 30 days of content in minutes — not hours.

Here's how it works:

Example: Ask Maya:
"Create an Instagram feed for my coaching business"

Maya will plan your 9-post grid, write captions, suggest hashtags, and create a strategy — all in one conversation.

No more staring at a blank screen wondering what to post.

Maya does the thinking. You do the creating.

And remember — planning, captions, and strategy are all free. No credits needed.

Start planning with Maya →: ${mayaLink}

Try it. Ask Maya anything about your content strategy. She's ready to help.

XoXo Sandra 💋

SSELFIE Studio - Where Visibility Meets Financial Freedom
Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}`

  return {
    html,
    text,
    subject: "See how creators use Maya to plan their feeds.",
  }
}
