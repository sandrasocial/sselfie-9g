export function BetaTestimonialRequestEmail({ customerName }: { customerName?: string }) {
  const { html } = generateBetaTestimonialEmail({ customerName })
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

export function generateBetaTestimonialEmail(params: { customerName?: string }): {
  html: string
  text: string
} {
  const { customerName } = params

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're helping me build something incredible</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fafaf9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          
          <!-- Logo & Header -->
          <tr>
            <td style="padding: 40px 30px 20px; text-align: center;">
              <h1 style="margin: 0 0 20px; color: #1c1917; font-size: 28px; font-weight: 300; letter-spacing: 0.3em; text-transform: uppercase; font-family: Georgia, serif;">
                S S E L F I E
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 0 30px 20px;">
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Hey ${customerName || "love"}!
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                I hope you're having fun playing with your SSELFIE photos! 
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                I've been watching the beta community grow these past few days and honestly? I'm getting emotional seeing what you all are creating. When I was coding this app in my tiny apartment, dreaming of helping women feel confident in their content - THIS is exactly what I imagined.
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                You being part of the beta means everything to me. You're not just a user - you're helping me build something that's going to change how women show up online.
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                If you're loving your experience so far, would you mind sharing a quick testimonial? Even just a sentence about your favorite part or how SSELFIE is helping you would be incredible.
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Other women are still scared to try AI photography, and hearing from real beta users like you helps them see what's possible. Your words could be exactly what someone needs to finally start showing up confidently online.
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                You can just reply to this email with whatever feels authentic to you! And if you want to share it publicly (Instagram, LinkedIn, wherever), I'd be so grateful - but no pressure at all.
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                Thank you for believing in this vision and being part of our story. Seriously. It means more than you know.
              </p>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 30px 30px; text-align: center;">
              <!-- Updated link to testimonial submission page -->
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"}/share-your-story" style="display: inline-block; background-color: #1c1917; color: #fafaf9; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 400; letter-spacing: 0.1em; text-transform: uppercase;">
                Share Your Testimonial
              </a>
            </td>
          </tr>
          
          <!-- Personal Note -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <div style="background-color: #fafaf9; border-left: 3px solid #292524; padding: 20px; border-radius: 4px;">
                <p style="margin: 0 0 12px; color: #292524; font-size: 14px; font-weight: 300; line-height: 1.7;">
                  P.S. If you have any requests for Maya or features you'd love to see - I'm all ears! This is YOUR studio too.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Signature -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <p style="margin: 0; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                XoXo<br />
                Sandra 💋
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #fafaf9; border-top: 1px solid #e7e5e4;">
              <p style="margin: 0; color: #a8a29e; font-size: 11px; font-weight: 300; text-align: center;">
                <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color: #a8a29e; text-decoration: underline;">Unsubscribe</a>
              </p>
              <p style="margin: 8px 0 0; color: #a8a29e; font-size: 11px; font-weight: 300; text-align: center;">
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

Hey ${customerName || "love"}!

I hope you're having fun playing with your SSELFIE photos! 

I've been watching the beta community grow these past few days and honestly? I'm getting emotional seeing what you all are creating. When I was coding this app in my tiny apartment, dreaming of helping women feel confident in their content - THIS is exactly what I imagined.

You being part of the beta means everything to me. You're not just a user - you're helping me build something that's going to change how women show up online.

If you're loving your experience so far, would you mind sharing a quick testimonial? Even just a sentence about your favorite part or how SSELFIE is helping you would be incredible.

Other women are still scared to try AI photography, and hearing from real beta users like you helps them see what's possible. Your words could be exactly what someone needs to finally start showing up confidently online.

You can just reply to this email with whatever feels authentic to you! And if you want to share it publicly (Instagram, LinkedIn, wherever), I'd be so grateful - but no pressure at all.

Thank you for believing in this vision and being part of our story. Seriously. It means more than you know.

Share your testimonial: ${process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"}/share-your-story

XoXo
Sandra 💋

P.S. If you have any requests for Maya or features you'd love to see - I'm all ears! This is YOUR studio too.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}

© ${new Date().getFullYear()} SSELFIE. All rights reserved.
  `

  return { html, text }
}
