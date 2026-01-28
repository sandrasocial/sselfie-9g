export interface SocialProofParams {
  firstName?: string
  email: string
}

// EMAIL 1: Laurie's Success Story
export function generateLaurieStoryEmail(params: SocialProofParams) {
  const { firstName, email } = params
  const displayName = firstName || email.split("@")[0]
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>How Laurie Got 40% More Engagement</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #fafaf9; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px;">
    
    <h2 style="color: #1c1917; font-size: 22px; margin: 0 0 20px;">Hey ${displayName},</h2>
    
    <p style="font-size: 16px; line-height: 1.6; color: #44403c;">I wanted to share something incredible with you...</p>
    
    <div style="background: #f0fdf4; padding: 30px; border-radius: 12px; border-left: 4px solid #16a34a; margin: 25px 0;">
      <h3 style="color: #15803d; margin: 0 0 15px; font-size: 18px;">📈 Real Results from Laurie Garcia:</h3>
      
      <blockquote style="margin: 0; padding: 0; border: none; font-style: italic; color: #374151; font-size: 15px; line-height: 1.6;">
        "As a 48 year old business owner, I never thought I'd struggle with social media! But SSELFIE Studio is LITERALLY your personal photographer, assistant, marketer, advisor, strategist, and tech guru all in one.
        <br><br>
        <strong style="color: #15803d;">It took one session and 1 post for my reel views to go up by 40%!</strong>
        <br><br>
        The technology and effort in this app is worth every penny. If you're on the fence, this is for you. Don't wait."
      </blockquote>
      
      <p style="margin: 15px 0 0; color: #15803d; font-weight: 600; text-align: right;">— Laurie Garcia, Esthetician & Business Owner</p>
    </div>
    
    <p style="font-size: 16px; line-height: 1.6; color: #44403c;">Laurie went from feeling "stuck in the 80's" to <strong>40% more engagement</strong> with just one SSELFIE session.</p>
    
    <p style="font-size: 16px; line-height: 1.6; color: #44403c;">You've already got your preview and content strategy. Want the same results Laurie got?</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${siteUrl}/checkout/blueprint?utm_source=email&utm_medium=social_proof&utm_campaign=laurie_story" 
         style="background: #16a34a; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; display: inline-block;">
        Get the Same Results →
      </a>
    </div>
    
    <p style="font-size: 14px; color: #78716c; text-align: center; margin: 20px 0 0;">
      30 photos + complete strategy = $47<br>
      (Most photographers charge $200+ for one session)
    </p>
    
  </div>
</body>
</html>`

  const text = `Hey ${displayName},

I wanted to share something incredible with you...

📈 REAL RESULTS FROM LAURIE GARCIA:

"As a 48 year old business owner, I never thought I'd struggle with social media! But SSELFIE Studio is LITERALLY your personal photographer, assistant, marketer, advisor, strategist, and tech guru all in one.

It took one session and 1 post for my reel views to go up by 40%!

The technology and effort in this app is worth every penny. If you're on the fence, this is for you. Don't wait."
— Laurie Garcia, Esthetician & Business Owner

Laurie went from feeling "stuck in the 80's" to 40% more engagement with just one SSELFIE session.

You've already got your preview and content strategy. Want the same results Laurie got?

Get the Same Results: ${siteUrl}/checkout/blueprint?utm_source=email&utm_medium=social_proof&utm_campaign=laurie_story

30 photos + complete strategy = $47
(Most photographers charge $200+ for one session)

- Sandra`

  return { html, text }
}

// EMAIL 2: Before/After Transformation 
export function generateTransformationEmail(params: SocialProofParams) {
  const { firstName, email } = params
  const displayName = firstName || email.split("@")[0]
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>See These Transformations</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #fafaf9; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px;">
    
    <h2 style="color: #1c1917; font-size: 22px; margin: 0 0 20px;">${displayName}, see these transformations</h2>
    
    <p style="font-size: 16px; line-height: 1.6; color: #44403c;">Remember feeling unsure about showing up online?</p>
    
    <p style="font-size: 16px; line-height: 1.6; color: #44403c;">Here's what happens when women stop overthinking and start creating with SSELFIE:</p>
    
    <div style="background: #f8fafc; padding: 25px; border-radius: 8px; margin: 25px 0;">
      <h3 style="color: #1e40af; margin: 0 0 15px;">🎨 "This is incredible... WOW!!!"</h3>
      <p style="margin: 0; color: #475569; font-style: italic; line-height: 1.6;">
        "I started just having fun with the photos but then I started tweaking and asking Maya to make adjustments and WOW!!! It's so good! Love that you can turn the pics into video and I'm diving into the course now!"
      </p>
      <p style="margin: 10px 0 0; color: #1e40af; font-weight: 600; text-align: right; font-size: 14px;">— SSELFIE Member</p>
    </div>
    
    <div style="background: #fef3c7; padding: 25px; border-radius: 8px; margin: 25px 0;">
      <h3 style="color: #92400e; margin: 0 0 15px;">🔥 "BEST APP EVER!!!!"</h3>  
      <p style="margin: 0; color: #78350f; font-style: italic; line-height: 1.6;">
        Simple but powerful — that's exactly what Hafdis said about her SSELFIE experience.
      </p>
      <p style="margin: 10px 0 0; color: #92400e; font-weight: 600; text-align: right; font-size: 14px;">— Hafdis</p>
    </div>
    
    <p style="font-size: 16px; line-height: 1.6; color: #44403c;"><strong>Here's what I know about you, ${displayName}:</strong></p>
    
    <ul style="color: #44403c; line-height: 1.8;">
      <li>You took the time to complete the setup</li>
      <li>You uploaded your photos (that's commitment!)</li>
      <li>You got your strategy and loved what you saw</li>
    </ul>
    
    <p style="font-size: 16px; line-height: 1.6; color: #44403c;">The only thing standing between you and results like theirs? <strong>Clicking the button below.</strong></p>
    
    <div style="text-align: center; margin: 35px 0;">
      <a href="${siteUrl}/checkout/blueprint?utm_source=email&utm_medium=social_proof&utm_campaign=transformations" 
         style="background: #1c1917; color: white; padding: 18px 36px; text-decoration: none; border-radius: 6px; font-size: 18px; font-weight: 600; display: inline-block;">
        Start Your Transformation ($47) →
      </a>
    </div>
    
    <p style="font-size: 14px; color: #78716c; text-align: center; margin: 20px 0 0;">
      30 professional photos + strategy<br>
      One-time payment, yours forever ✨
    </p>
    
  </div>
</body>
</html>`

  const text = `${displayName}, see these transformations

Remember feeling unsure about showing up online?

Here's what happens when women stop overthinking and start creating with SSELFIE:

🎨 "This is incredible... WOW!!!"
"I started just having fun with the photos but then asking Maya to make adjustments and WOW!!! It's so good! Love that you can turn the pics into video!" 
— SSELFIE Member

🔥 "BEST APP EVER!!!!"  
— Hafdis

Here's what I know about you, ${displayName}:
• You took the time to complete the setup
• You uploaded your photos (that's commitment!)
• You got your strategy and loved what you saw

The only thing standing between you and results like theirs? Clicking the button below.

Start Your Transformation: ${siteUrl}/checkout/blueprint?utm_source=email&utm_medium=social_proof&utm_campaign=transformations

30 professional photos + strategy = $47
One-time payment, yours forever ✨

- Sandra`

  return { html, text }
}