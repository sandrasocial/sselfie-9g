export interface EnhancedConversionParams {
  firstName?: string
  email: string
  previewUrl?: string
}

// EMAIL 1: Preview Ready (Day 0)
export function generatePreviewReadyEmail(params: EnhancedConversionParams) {
  const { firstName, email, previewUrl } = params
  const displayName = firstName || email.split("@")[0]
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Preview is Ready!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #fafaf9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px;">
          
          <tr>
            <td style="padding: 40px 30px 20px; text-align: center;">
              <h1 style="margin: 0 0 20px; color: #1c1917; font-size: 28px; font-weight: 300; letter-spacing: 0.3em; text-transform: uppercase; font-family: Georgia, serif;">S S E L F I E</h1>
              <h2 style="margin: 0; color: #292524; font-size: 24px; font-weight: 300; line-height: 1.4;">🎉 ${displayName}, Your Preview is Ready!</h2>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 0 30px 40px;">
              <p style="font-size: 16px; line-height: 1.6; color: #44403c; margin: 0 0 20px;">Maya just finished creating your personalized content strategy and caption templates.</p>
              
              <div style="background: #f5f5f4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px; color: #1c1917; font-size: 18px;">✅ What You Got (Free):</h3>
                <ul style="margin: 0; padding-left: 20px; color: #44403c;">
                  <li>4 content pillars with post ideas</li>
                  <li>Caption templates</li>
                  <li>Instagram strategy</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${siteUrl}/studio?utm_source=email&utm_medium=email&utm_campaign=preview_ready" 
                   style="background-color: #1c1917; color: #fafaf9; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
                  View Your Preview →
                </a>
              </div>
              
              <p style="font-size: 14px; line-height: 1.5; color: #78716c; margin: 20px 0 0; text-align: center;">
                Amazing work completing the setup, ${displayName}!<br>
                Your preview shows exactly what's possible with SSELFIE.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `🎉 ${displayName}, Your Preview is Ready!

Maya just finished creating your personalized content strategy and caption templates.

✅ What You Got (Free):
• 4 content pillars with post ideas  
• Caption templates
• Instagram strategy

View Your Preview: ${siteUrl}/studio?utm_source=email&utm_medium=email&utm_campaign=preview_ready

Amazing work completing the setup, ${displayName}!
Your preview shows exactly what's possible with SSELFIE.

- Sandra`

  return { html, text }
}

// EMAIL 2: Engagement Check (Day 1)  
export function generateEngagementCheckEmail(params: EnhancedConversionParams) {
  const { firstName, email } = params
  const displayName = firstName || email.split("@")[0]
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Quick Question About Your Feed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background-color: #fafaf9; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px;">
    <h2 style="color: #1c1917; font-size: 22px; margin: 0 0 20px;">Hey ${displayName},</h2>
    
    <p style="font-size: 16px; line-height: 1.6; color: #44403c;">I wanted to check in — did you get a chance to look at your preview feed?</p>
    
    <p style="font-size: 16px; line-height: 1.6; color: #44403c;">I'm curious to hear what you think about:</p>
    <ul style="color: #44403c; line-height: 1.6;">
      <li>The content pillars Maya created for you</li>
      <li>How the caption templates feel</li>  
      <li>Whether the strategy makes sense for your brand</li>
    </ul>
    
    <div style="background: #f5f5f4; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <p style="margin: 0; color: #57534e; font-size: 14px;"><strong>Pro tip:</strong> If you love what you see so far, you can unlock 30 actual photos + full feed planner for just $47. Most people spend that on one professional headshot!</p>
    </div>
    
    <p style="font-size: 16px; line-height: 1.6; color: #44403c;">Just reply and let me know how it's looking — I read every email!</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${siteUrl}/studio?utm_source=email&utm_medium=email&utm_campaign=engagement_check" 
         style="background: #1c1917; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
        Back to Your Preview →
      </a>
    </div>
    
    <p style="font-size: 14px; color: #78716c; margin: 20px 0 0;">
      Talk soon,<br>Sandra ✨
    </p>
  </div>
</body>
</html>`

  const text = `Hey ${displayName},

I wanted to check in — did you get a chance to look at your preview feed?

I'm curious to hear what you think about:
• The content pillars Maya created for you
• How the caption templates feel
• Whether the strategy makes sense for your brand

Pro tip: If you love what you see so far, you can unlock 30 actual photos + full feed planner for just $47. Most people spend that on one professional headshot!

Just reply and let me know how it's looking — I read every email!

View your preview: ${siteUrl}/studio?utm_source=email&utm_medium=email&utm_campaign=engagement_check

Talk soon,
Sandra ✨`

  return { html, text }
}

// EMAIL 3: Urgency Conversion (Day 2)
export function generateUrgencyConversionEmail(params: EnhancedConversionParams) {
  const { firstName, email } = params
  const displayName = firstName || email.split("@")[0]
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>48 Hours Left - Your Blueprint Awaits</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #fafaf9; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; border-left: 4px solid #dc2626;">
    
    <h2 style="color: #dc2626; font-size: 20px; margin: 0 0 15px;">⏰ 48 Hours Left</h2>
    <h3 style="color: #1c1917; font-size: 24px; margin: 0 0 20px;">${displayName}, Your Blueprint is Ready to Unlock</h3>
    
    <p style="font-size: 16px; line-height: 1.6; color: #44403c;">You've seen what SSELFIE can do with your preview. Now imagine having:</p>
    
    <div style="background: #f5f5f4; padding: 25px; border-radius: 8px; margin: 20px 0;">
      <h4 style="color: #1c1917; margin: 0 0 15px; font-size: 18px;">✨ Full Blueprint ($47):</h4>
      <ul style="color: #44403c; margin: 0; line-height: 1.8;">
        <li><strong>30 professional photos</strong> that look like you</li>
        <li><strong>Complete feed strategy</strong> (no more blank mind)</li>
        <li><strong>Ready-to-use captions</strong> for each post</li>
        <li><strong>Content calendar</strong> for the next month</li>
      </ul>
    </div>
    
    <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border: 1px solid #f59e0b; margin: 25px 0;">
      <p style="margin: 0; color: #92400e; font-size: 15px; text-align: center;"><strong>⚡ This offer expires in 48 hours</strong><br>After that, it's back to full price.</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${siteUrl}/checkout/blueprint?utm_source=email&utm_medium=urgency&utm_campaign=48h_offer" 
         style="background: #dc2626; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">
        Unlock Blueprint for $47 →
      </a>
    </div>
    
    <p style="font-size: 14px; color: #78716c; text-align: center; margin: 20px 0 0;">
      Questions? Just reply — I respond personally.<br>
      Sandra ✨
    </p>
    
  </div>
</body>
</html>`

  const text = `⏰ 48 Hours Left - ${displayName}, Your Blueprint is Ready to Unlock

You've seen what SSELFIE can do with your preview. Now imagine having:

✨ Full Blueprint ($47):
• 30 professional photos that look like you
• Complete feed strategy (no more blank mind)  
• Ready-to-use captions for each post
• Content calendar for the next month

⚡ This offer expires in 48 hours
After that, it's back to full price.

Unlock Blueprint: ${siteUrl}/checkout/blueprint?utm_source=email&utm_medium=urgency&utm_campaign=48h_offer

Questions? Just reply — I respond personally.
Sandra ✨`

  return { html, text }
}