export interface StrategyEmailParams {
  firstName: string
  email: string
  strategyUrl: string
}

export function generateStrategyEmail(params: StrategyEmailParams): { html: string; text: string } {
  const { firstName, strategyUrl } = params

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Brand Strategy Is Ready</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;">
  <table role="presentation" style="width:100%;border-collapse:collapse;background-color:#0a0a0a;">
    <tr>
      <td align="center" style="padding:24px;">
        <table role="presentation" style="width:100%;max-width:620px;border-collapse:collapse;background-color:#101010;border:1px solid rgba(255,255,255,0.12);">
          <tr>
            <td style="padding:32px 28px 20px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0 0 10px;color:rgba(255,255,255,0.5);font-size:10px;font-weight:600;letter-spacing:0.35em;text-transform:uppercase;">Free Brand Strategy</p>
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:300;letter-spacing:0.18em;text-transform:uppercase;font-family:Georgia,'Times New Roman',serif;">SSELFIE</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:30px 28px 8px;">
              <p style="margin:0 0 16px;color:rgba(255,255,255,0.9);font-size:16px;line-height:1.7;">Hi ${firstName},</p>
              <p style="margin:0 0 16px;color:rgba(255,255,255,0.78);font-size:15px;line-height:1.8;">Maya just finished building your brand strategy.</p>
              <p style="margin:0 0 24px;color:rgba(255,255,255,0.78);font-size:15px;line-height:1.8;">It's ready and waiting for you here:</p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 28px 28px;text-align:center;">
              <a href="${strategyUrl}" style="display:inline-block;padding:14px 30px;background:#ffffff;color:#0a0a0a;text-decoration:none;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;">View Your Strategy</a>
            </td>
          </tr>

          <tr>
            <td style="padding:0 28px 24px;">
              <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);padding:22px;">
                <p style="margin:0 0 12px;color:rgba(255,255,255,0.55);font-size:10px;font-weight:600;letter-spacing:0.33em;text-transform:uppercase;">What's Inside</p>
                <p style="margin:0;color:rgba(255,255,255,0.78);font-size:14px;line-height:1.8;">
                  • Your positioning statement<br />
                  • 3-5 content pillars with post ideas<br />
                  • Your brand voice guide<br />
                  • 10 caption starters<br />
                  • 3 example posts ready to adapt
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:0 28px 16px;">
              <p style="margin:0 0 16px;color:rgba(255,255,255,0.78);font-size:15px;line-height:1.8;">This is yours to keep. Bookmark the link — it lives there permanently.</p>
              <p style="margin:0 0 18px;color:rgba(255,255,255,0.78);font-size:15px;line-height:1.8;">And if you're ready to go deeper: SSELFIE Studio is where this comes to life. Every month, new AI tools, Sandra live, and a community of women building their brand.</p>
              <p style="margin:0 0 22px;"><a href="https://sselfie.ai/checkout/membership" style="color:#ffffff;font-size:13px;font-weight:500;">Join Studio — $97/month</a></p>
              <p style="margin:0;color:rgba(255,255,255,0.78);font-size:15px;line-height:1.7;">— Sandra (& Maya)<br />The Selfie Queen<br />sselfie.ai</p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 28px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;">
              <p style="margin:0;color:rgba(255,255,255,0.42);font-size:11px;">© ${new Date().getFullYear()} SSELFIE Studio. All rights reserved.</p>
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
Hi ${firstName},

Maya just finished building your brand strategy.

It's ready and waiting for you here:

VIEW YOUR STRATEGY: ${strategyUrl}

What's inside:
• Your positioning statement
• 3-5 content pillars with post ideas
• Your brand voice guide
• 10 caption starters
• 3 example posts ready to adapt

This is yours to keep. Bookmark the link — it lives there permanently.

And if you're ready to go deeper: SSELFIE Studio is where this comes to life. Every month, new AI tools, Sandra live, and a community of women building their brand.

Join Studio — $97/month: https://sselfie.ai/checkout/membership

— Sandra (& Maya)
The Selfie Queen
sselfie.ai

© ${new Date().getFullYear()} SSELFIE Studio. All rights reserved.
  `

  return { html, text }
}
