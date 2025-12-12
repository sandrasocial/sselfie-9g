export interface NewsletterTemplateParams {
  firstName?: string
  recipientEmail: string
  tipTitle: string
  tipContent: string
  memberStory?: {
    name: string
    quote: string
    result?: string
  }
  ctaText: string
  ctaUrl: string
  psText?: string
}

export function generateNewsletterEmail(params: NewsletterTemplateParams): {
  html: string
  text: string
} {
  const { firstName, recipientEmail, tipTitle, tipContent, memberStory, ctaText, ctaUrl, psText } = params
  const displayName = firstName || recipientEmail.split("@")[0]

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${tipTitle}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fafaf9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 30px 20px; text-align: center;">
              <h1 style="margin: 0 0 20px; color: #1c1917; font-size: 28px; font-weight: 300; letter-spacing: 0.3em; text-transform: uppercase; font-family: Georgia, serif;">
                S S E L F I E
              </h1>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 0 30px 20px;">
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Hey ${displayName},
              </p>
            </td>
          </tr>
          
          <!-- Tip Section -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <h2 style="margin: 0 0 16px; color: #1c1917; font-size: 20px; font-weight: 500; line-height: 1.3;">
                ${tipTitle}
              </h2>
              
              <div style="color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                ${tipContent.split('\n').map(paragraph => 
                  paragraph.trim() ? `<p style="margin: 0 0 16px;">${paragraph}</p>` : ''
                ).join('')}
              </div>
            </td>
          </tr>
          
          ${memberStory ? `
          <!-- Member Story -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <div style="background-color: #fafaf9; border-left: 3px solid #292524; padding: 24px; border-radius: 4px;">
                <p style="margin: 0 0 12px; color: #78716c; font-size: 11px; font-weight: 300; letter-spacing: 0.15em; text-transform: uppercase;">
                  MEMBER SPOTLIGHT
                </p>
                <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7; font-style: italic;">
                  "${memberStory.quote}"
                </p>
                <p style="margin: 0 0 8px; color: #1c1917; font-size: 14px; font-weight: 400;">
                  - ${memberStory.name}
                </p>
                ${memberStory.result ? `<p style="margin: 0; color: #57534e; font-size: 13px; font-weight: 300;">${memberStory.result}</p>` : ''}
              </div>
            </td>
          </tr>
          ` : ''}
          
          <!-- CTA -->
          <tr>
            <td style="padding: 0 30px 30px; text-align: center;">
              <a href="${ctaUrl}" style="display: inline-block; background-color: #1c1917; color: #fafaf9; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">
                ${ctaText}
              </a>
            </td>
          </tr>
          
          ${psText ? `
          <!-- P.S. -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <p style="margin: 0; color: #57534e; font-size: 14px; font-weight: 300; line-height: 1.6; font-style: italic;">
                P.S. ${psText}
              </p>
            </td>
          </tr>
          ` : ''}
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #fafaf9; border-top: 1px solid #e7e5e4; text-align: center;">
              <p style="margin: 0 0 12px; color: #57534e; font-size: 13px; font-weight: 300; line-height: 1.6;">
                Questions? Just reply to this email-I read every message.
              </p>
              <p style="margin: 0; color: #57534e; font-size: 13px; font-weight: 300;">
                XoXo Sandra 💋
              </p>
              <p style="margin: 16px 0 0; color: #a8a29e; font-size: 11px; font-weight: 300;">
                <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color: #a8a29e; text-decoration: underline;">Unsubscribe</a>
              </p>
              <p style="margin: 8px 0 0; color: #a8a29e; font-size: 11px; font-weight: 300;">
                © ${new Date().getFullYear()} SSELFIE. All rights reserved.
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
S S E L F I E

Hey ${displayName},

${tipTitle}

${tipContent}

${memberStory ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MEMBER SPOTLIGHT

"${memberStory.quote}"
- ${memberStory.name}
${memberStory.result ? memberStory.result : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ''}

${ctaText}: ${ctaUrl}

${psText ? `P.S. ${psText}` : ''}

Questions? Just reply to this email-I read every message.

XoXo Sandra 💋

Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}

© ${new Date().getFullYear()} SSELFIE. All rights reserved.
  `

  return { html, text }
}







