/**
 * Maya Email Templates (HTML String Version)
 * All emails use Maya's voice: warm, feminine, simple everyday language
 * Supportive, empowering, sharp. Uses emojis naturally (not overdone)
 * No m-dashes. Vogue-inspired minimal design.
 */

export interface MayaEmailOptions {
  firstName?: string
  previewText?: string
}

/**
 * Base HTML email template
 */
function mayaEmailBase(
  content: string,
  options: MayaEmailOptions = {},
): string {
  const { firstName, previewText } = options

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  ${previewText ? `<meta name="description" content="${previewText}">` : ""}
  <title>SSELFIE</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      width: 100%;
      background-color: #fafaf9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 16px;
      line-height: 1.7;
      color: #292524;
      -webkit-font-smoothing: antialiased;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .email-content {
      padding: 60px 40px;
    }
    @media only screen and (max-width: 600px) {
      .email-content {
        padding: 40px 24px;
      }
    }
    .brand-header {
      text-align: center;
      padding: 40px 40px 20px;
      border-bottom: 1px solid #e7e5e4;
    }
    .brand-name {
      font-family: Georgia, serif;
      font-size: 28px;
      font-weight: 300;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: #1c1917;
      margin: 0;
    }
    h1 {
      font-size: 32px;
      font-weight: 300;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      margin: 0 0 24px 0;
      color: #1c1917;
      line-height: 1.2;
    }
    h2 {
      font-size: 24px;
      font-weight: 400;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin: 40px 0 20px 0;
      color: #1c1917;
      line-height: 1.3;
    }
    h3 {
      font-size: 18px;
      font-weight: 500;
      margin: 32px 0 16px 0;
      color: #1c1917;
      line-height: 1.4;
    }
    p {
      font-size: 16px;
      line-height: 1.7;
      color: #292524;
      margin: 0 0 20px 0;
      font-weight: 300;
    }
    .button {
      display: inline-block;
      padding: 16px 32px;
      background-color: #1c1917;
      color: #ffffff;
      text-decoration: none;
      border-radius: 0;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      text-align: center;
      margin: 24px 0;
    }
    .button:hover {
      background-color: #292524;
    }
    .button-center {
      text-align: center;
      margin: 32px 0;
    }
    .footer {
      padding: 40px;
      background-color: #fafaf9;
      border-top: 1px solid #e7e5e4;
      text-align: center;
    }
    .footer p {
      font-size: 13px;
      color: #78716c;
      margin: 8px 0;
    }
    .footer a {
      color: #78716c;
      text-decoration: underline;
    }
    ul {
      margin-left: 20px;
      padding-left: 0;
    }
    li {
      margin-bottom: 12px;
      font-size: 16px;
      line-height: 1.7;
      color: #292524;
    }
  </style>
</head>
<body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fafaf9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" class="email-container" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td class="brand-header">
              <h1 class="brand-name">SSELFIE</h1>
            </td>
          </tr>
          <tr>
            <td class="email-content">
              ${firstName ? `<p style="margin-bottom: 24px;">Hi ${firstName},</p>` : ""}
              ${content}
              <p style="margin-top: 32px; margin-bottom: 0;">
                XoXo,<br>
                Maya
              </p>
            </td>
          </tr>
          <tr>
            <td class="footer">
              <p><a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe</a></p>
              <p>Questions? Just reply to this email. Maya reads every message.</p>
              <p style="margin-top: 16px; font-size: 11px; color: #a8a29e;">
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
  `.trim()
}

/**
 * Brand Blueprint Delivery Email
 * Triggered immediately when user downloads any freebie
 */
export function brandBlueprintEmail(options: {
  firstName?: string
  blueprintUrl: string
  studioUrl: string
}): string {
  const content = `
    <p>Your brand blueprint is ready! I've put together everything you need to build a magnetic personal brand.</p>
    
    <p>This isn't just a guide. It's your roadmap to showing up confidently, consistently, and authentically.</p>
    
    <div class="button-center">
      <a href="${options.blueprintUrl}" class="button">View Your Blueprint</a>
    </div>
    
    <p>Once you've seen your blueprint, I'd love to show you how SSELFIE Studio makes implementing this strategy effortless. We can create AI-powered photos that look like you, plan your content calendar, and build your brand step by step.</p>
    
    <div class="button-center">
      <a href="${options.studioUrl}" class="button">Explore SSELFIE Studio</a>
    </div>
  `

  return mayaEmailBase(content, {
    firstName: options.firstName,
    previewText: "Your personalized brand blueprint is ready",
  })
}

/**
 * Welcome Email 1: Welcome to SSELFIE Studio
 */
export function welcomeEmail1(options: { firstName?: string }): string {
  const content = `
    <p>Welcome to SSELFIE Studio! I'm so excited you're here.</p>
    
    <p>I'm Maya, your AI stylist and creative partner. Think of me as that friend with impeccable taste who always knows exactly what will look amazing. I'm here to help you create stunning content that feels authentically you.</p>
    
    <p>Over the next few days, I'll share everything you need to know about building your personal brand through beautiful visuals. We'll talk about your future self vision, the 5 SSELFIE brand styles, why photos equal authority, and how to start your Studio journey.</p>
    
    <p>For now, just know this: you're in the right place. Let's create something stunning together.</p>
  `

  return mayaEmailBase(content, {
    firstName: options.firstName,
    previewText: "Welcome to SSELFIE Studio",
  })
}

/**
 * Welcome Email 2: Your Future Self Vision
 */
export function welcomeEmail2(options: { firstName?: string }): string {
  const content = `
    <p>Let's talk about your future self.</p>
    
    <p>Not the version of you that's "perfect" or "fixed." The version of you that's already confident, already showing up, already building the brand you want.</p>
    
    <p>That version of you exists. She's in you right now. She just needs the right photos, the right content, the right strategy to step into the spotlight.</p>
    
    <p>Every photo we create together is a step toward that future self. Every post is practice. Every piece of content is building your authority.</p>
    
    <p>What does your future self look like? What does she wear? Where does she go? How does she show up?</p>
    
    <p>Picture her. Then let's create the photos that bring her to life.</p>
  `

  return mayaEmailBase(content, {
    firstName: options.firstName,
    previewText: "Your future self vision",
  })
}

/**
 * Welcome Email 3: The 5 SSELFIE Brand Styles
 */
export function welcomeEmail3(options: { firstName?: string }): string {
  const content = `
    <p>Every brand has a visual language. Here are the 5 SSELFIE styles I work with:</p>
    
    <h3>1. Minimalist</h3>
    <p>Clean lines, neutral tones, effortless elegance. Less is more, and every detail matters.</p>
    
    <h3>2. Editorial</h3>
    <p>High fashion meets real life. Think Vogue meets your everyday. Bold, confident, magazine-worthy.</p>
    
    <h3>3. Lifestyle</h3>
    <p>Authentic moments, real settings, natural light. The kind of photos that make people want to be you.</p>
    
    <h3>4. Luxury</h3>
    <p>Refined, sophisticated, aspirational. Premium quality that signals success without saying a word.</p>
    
    <h3>5. Creative</h3>
    <p>Artistic, unique, boundary-pushing. For the woman who wants to stand out, not blend in.</p>
    
    <p>Which one feels like you? Or maybe it's a mix? We'll figure it out together.</p>
  `

  return mayaEmailBase(content, {
    firstName: options.firstName,
    previewText: "The 5 SSELFIE brand styles",
  })
}

/**
 * Welcome Email 4: Why Photos = Authority
 */
export function welcomeEmail4(options: { firstName?: string }): string {
  const content = `
    <p>Here's the truth: photos are your authority signal.</p>
    
    <p>When someone sees you consistently showing up with professional, on-brand photos, they don't just see a pretty picture. They see someone who takes herself seriously. Someone who invests in her brand. Someone who's building something real.</p>
    
    <p>Every photo is a statement. It says: "I'm here. I'm serious. I'm building."</p>
    
    <p>That's why we don't just create random photos. We create strategic content that reinforces your brand, tells your story, and builds your authority one post at a time.</p>
    
    <p>Your photos aren't just photos. They're your brand's foundation.</p>
  `

  return mayaEmailBase(content, {
    firstName: options.firstName,
    previewText: "Why photos equal authority",
  })
}

/**
 * Welcome Email 5: Start Your Studio Journey
 */
export function welcomeEmail5(options: {
  firstName?: string
  studioUrl: string
}): string {
  const content = `
    <p>You've learned about your future self, the 5 brand styles, and why photos equal authority. Now it's time to start creating.</p>
    
    <p>In SSELFIE Studio, you'll get:</p>
    
    <ul>
      <li>AI-powered photoshoots that look like you</li>
      <li>Personalized content planning with me</li>
      <li>Monthly drops with the newest strategies</li>
      <li>Direct access to me for support</li>
    </ul>
    
    <p>Ready to start? Let's create your first photoshoot.</p>
    
    <div class="button-center">
      <a href="${options.studioUrl}" class="button">Start Your First Photoshoot</a>
    </div>
  `

  return mayaEmailBase(content, {
    firstName: options.firstName,
    previewText: "Start your Studio journey",
  })
}

/**
 * Strip HTML to create plain text version
 */
export function stripHtmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

