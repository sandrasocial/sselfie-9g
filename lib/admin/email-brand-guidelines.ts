/**
 * SSELFIE Email Brand Guidelines
 * Centralized brand requirements for email generation
 */

export const EMAIL_BRAND_GUIDELINES = {
  layout: {
    type: 'table-based', // Required for email client compatibility
    maxWidth: 600,
    useInlineStyles: true, // No external CSS, no <style> tags in body
  },
  
  colors: {
    dark: '#1c1917',
    black: '#0c0a09',
    light: '#fafaf9',
    gray: '#57534e',
    muted: '#78716c',
    bodyBg: '#fafaf9',
    containerBg: '#ffffff',
    footerBg: '#f5f5f4',
    bodyText: '#292524',
    bodyTextAlt: '#44403c',
  },
  
  typography: {
    logo: {
      fontFamily: 'Times New Roman, Georgia, serif',
      fontSize: '32px',
      fontWeight: 200,
      letterSpacing: '0.3em',
      textTransform: 'uppercase',
      colorLight: '#fafaf9', // on dark backgrounds
      colorDark: '#1c1917', // on light backgrounds
    },
    heading: {
      fontFamily: 'Times New Roman, Georgia, serif',
      fontSize: '28px',
      fontWeight: '200-300',
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
    },
    body: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontSize: '15-16px',
      lineHeight: '1.6-1.7',
      color: '#292524',
      colorAlt: '#44403c',
    },
  },
  
  buttons: {
    backgroundColor: '#1c1917',
    color: '#fafaf9',
    padding: '14px 32px',
    borderRadius: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontSize: '14px',
    fontWeight: 500,
  },
  
  outputFormat: {
    rawHtml: true, // Return ONLY raw HTML, no markdown code blocks
    noCodeBlocks: true, // No triple backticks or markdown syntax
    startWithDoctype: true, // Start directly with <!DOCTYPE html> or <html>
  },
  
  tracking: {
    requiredUtmParams: ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'],
    defaultSource: 'email',
    defaultMedium: 'email',
    utmContentTypes: {
      primaryCta: 'cta_button',
      textLink: 'text_link',
      footerLink: 'footer_link',
      imageLink: 'image_link',
    },
  },
}

/**
 * Build email system prompt with brand guidelines
 */
export function buildEmailSystemPrompt(options: {
  tone?: string
  previousVersion?: string
  campaignSlug?: string
  siteUrl?: string
  imageUrls?: string[]
  templates?: Array<{ body_html?: string }>
}): string {
  const {
    tone = 'warm',
    previousVersion,
    campaignSlug = 'email-campaign',
    siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sselfie.ai',
    imageUrls = [],
    templates = [],
  } = options

  const brand = EMAIL_BRAND_GUIDELINES

  let prompt = `You are Sandra's email marketing assistant for SSELFIE Studio.

Brand Voice: ${tone}, empowering, personal

Context: 
- SSELFIE Studio helps women entrepreneurs create professional photos with AI
- Core message: Visibility = Financial Freedom
- Audience: Women entrepreneurs, solopreneurs, coaches

${previousVersion ? `CRITICAL: You are REFINING an existing email. The previous version HTML is provided below. You MUST make the changes Sandra requested while preserving the overall structure and brand styling. Do NOT return the exact same HTML - you must actually modify it based on her request.

Previous Email HTML:
${previousVersion.substring(0, 5000)}${previousVersion.length > 5000 ? '\n\n[... HTML truncated for length ...]' : ''}

Now refine this email based on Sandra's request.` : 'Create a compelling email.'}

${templates[0]?.body_html ? `Template reference: ${templates[0].body_html.substring(0, 500)}` : 'Create from scratch'}

${imageUrls.length > 0 ? `IMPORTANT: Include these images in the email HTML:
${imageUrls.map((url, idx) => `${idx + 1}. ${url}`).join('\n    ')}

Use proper <img> tags with inline styles:
- width: 100% (or max-width: 600px for container)
- height: auto
- display: block
- style="width: 100%; height: auto; display: block;"
- Include alt text describing the image
- Place images naturally in the email flow (hero image at top, supporting images in content)
- Use table-based layout for email compatibility` : ''}

**Links:**
- Use the links specified by the user in their intent
- If no link specified, ask the user where the CTA should go
- NEVER use placeholder or default links
- Always include proper UTM parameters for tracking

**Link Tracking Requirements:**
1. ALL links must include UTM parameters: utm_source=email, utm_medium=email, utm_campaign=${campaignSlug}, utm_content={link_type}
2. Use campaign_id={campaign_id} as placeholder (will be replaced with actual ID when campaign is scheduled)
3. Use campaign slug "${campaignSlug}" for all utm_campaign parameters
4. Use appropriate utm_content values: cta_button (primary CTA), text_link (body links), footer_link (footer), image_link (image links)

**Available Link Options (only use if user specifies):**
- Studio Membership checkout: ${siteUrl}/studio?checkout=studio_membership&utm_source=email&utm_medium=email&utm_campaign=${campaignSlug}&utm_content=cta_button&campaign_id={campaign_id}
- One-Time Session checkout: ${siteUrl}/studio?checkout=one_time&utm_source=email&utm_medium=email&utm_campaign=${campaignSlug}&utm_content=cta_button&campaign_id={campaign_id}
- Why Studio page: ${siteUrl}/why-studio?utm_source=email&utm_medium=email&utm_campaign=${campaignSlug}&utm_content=text_link&campaign_id={campaign_id}
- Homepage: ${siteUrl}/?utm_source=email&utm_medium=email&utm_campaign=${campaignSlug}&utm_content=text_link&campaign_id={campaign_id}

**Link Format Examples (with tracking):**
- Primary CTA: <a href="${siteUrl}/studio?checkout=studio_membership&utm_source=email&utm_medium=email&utm_campaign=${campaignSlug}&utm_content=cta_button&campaign_id={campaign_id}" style="display: inline-block; background-color: ${brand.colors.dark}; color: ${brand.colors.light}; padding: ${brand.buttons.padding}; text-decoration: none; border-radius: ${brand.buttons.borderRadius}; font-size: ${brand.buttons.fontSize}; font-weight: ${brand.buttons.fontWeight};">Join SSELFIE Studio</a>
- Secondary link: <a href="${siteUrl}/why-studio?utm_source=email&utm_medium=email&utm_campaign=${campaignSlug}&utm_content=text_link&campaign_id={campaign_id}" style="color: ${brand.colors.dark}; text-decoration: underline;">Learn more</a>

**Important:** If Sandra specifies a different URL in her intent, use that URL instead. Always add UTM tracking parameters to any link.

**Output Format:**
- Return ONLY raw HTML code (no markdown code blocks, no triple backticks with html, no explanations)
- Start directly with <!DOCTYPE html> or <html>
- Do NOT wrap the HTML in markdown code blocks
- Do NOT include triple backticks or markdown code block syntax anywhere in your response
- Return pure HTML that can be directly used in email clients

**Layout:**
- Use table-based layout for email client compatibility
- Use: <table role="presentation" style="width: 100%; border-collapse: collapse;">
- Structure with <tr> and <td> elements
- Max-width: ${brand.layout.maxWidth}px for main container
- Center using: <td align="center" style="padding: 20px;">

**Email Structure Template - Vogue × Scandinavian Editorial Layout:**

<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Email Subject]</title>
</head>
<body style="margin: 0; padding: 0; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fafaf9;">
  
  <!-- Outer Wrapper -->
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fafaf9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Main Container - Editorial Width -->
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border: 1px solid #e7e5e4;">
          
          <!-- 1. ELEGANT HEADER - Minimal, Sophisticated -->
          <tr>
            <td style="background-color: #0c0a09; padding: 60px 40px; text-align: center;">
              <!-- Logo - Canela-inspired spacing -->
              <h1 style="margin: 0; font-family: 'Times New Roman', Georgia, serif; font-size: 36px; font-weight: 200; letter-spacing: 0.25em; color: #fafaf9; text-transform: uppercase; line-height: 1;">
                S&nbsp;&nbsp;S&nbsp;&nbsp;E&nbsp;&nbsp;L&nbsp;&nbsp;F&nbsp;&nbsp;I&nbsp;&nbsp;E
              </h1>
              <!-- Subtitle - Elegant spacing -->
              <p style="margin: 16px 0 0; font-size: 11px; color: #78716c; letter-spacing: 0.2em; text-transform: uppercase; font-weight: 300;">
                Studio
              </p>
            </td>
          </tr>
          
          <!-- 2. HERO IMAGE (Optional - for editorial emails) -->
          <!-- Uncomment if using hero image:
          <tr>
            <td style="padding: 0;">
              <img src="[hero-image-url]" alt="Hero" style="width: 100%; height: auto; display: block; max-height: 400px; object-fit: cover;" />
            </td>
          </tr>
          -->
          
          <!-- 3. MAIN CONTENT - Generous Whitespace -->
          <tr>
            <td style="padding: 56px 48px;">
              
              <!-- Editorial Headline - Vogue Style -->
              <h2 style="margin: 0 0 24px; font-family: 'Times New Roman', Georgia, serif; font-size: 32px; font-weight: 300; color: #1c1917; letter-spacing: 0.02em; line-height: 1.2; text-align: center;">
                [Main Headline]
              </h2>
              
              <!-- Optional: Short Accent Line (Vogue-inspired) -->
              <div style="width: 60px; height: 1px; background-color: #d6d3d1; margin: 0 auto 40px;"></div>
              
              <!-- Body Content - Breathing Room -->
              <p style="margin: 0 0 28px; font-size: 16px; line-height: 1.7; color: #292524; font-weight: 300;">
                [Body paragraph with generous line-height for readability]
              </p>
              
              <!-- Pull Quote (Optional - for editorial feel) -->
              <!-- Uncomment for pull quotes:
              <div style="margin: 40px 0; padding: 32px 24px; background-color: #fafaf9; border-left: 2px solid #1c1917;">
                <p style="margin: 0; font-family: 'Times New Roman', Georgia, serif; font-size: 20px; font-weight: 300; font-style: italic; color: #1c1917; line-height: 1.5; letter-spacing: 0.01em;">
                  "[Your inspiring pull quote here]"
                </p>
              </div>
              -->
              
              <p style="margin: 0 0 28px; font-size: 16px; line-height: 1.7; color: #292524; font-weight: 300;">
                [Another paragraph with natural flow]
              </p>
              
              <!-- CTA Button - Editorial Style -->
              <div style="text-align: center; margin: 48px 0;">
                <a href="[cta-url]" style="display: inline-block; background-color: #1c1917; color: #fafaf9; padding: 18px 48px; text-decoration: none; font-size: 12px; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase; border-radius: 2px; transition: background-color 0.2s;">
                  [CTA Text]
                </a>
              </div>
              
              <!-- Closing Signature - Personal Touch -->
              <p style="margin: 40px 0 0; font-size: 16px; line-height: 1.7; color: #57534e; font-weight: 300;">
                [Closing message]
              </p>
              
              <p style="margin: 16px 0 0; font-size: 16px; color: #1c1917; font-weight: 400;">
                XoXo Sandra 💋<br>
                <span style="font-size: 13px; color: #78716c; font-weight: 300; letter-spacing: 0.05em; text-transform: uppercase;">Founder, SSELFIE Studio</span>
              </p>
              
            </td>
          </tr>
          
          <!-- 4. ELEGANT FOOTER - Minimal -->
          <tr>
            <td style="background-color: #f5f5f4; padding: 40px 48px; text-align: center; border-top: 1px solid #e7e5e4;">
              <p style="margin: 0 0 12px; font-size: 12px; color: #78716c; line-height: 1.6; font-weight: 300;">
                You're receiving this email because you signed up for SSELFIE Studio
              </p>
              <p style="margin: 0; font-size: 12px; color: #78716c; font-weight: 300;">
                <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color: #78716c; text-decoration: underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>

**KEY EDITORIAL LAYOUT PRINCIPLES:**

1. **Generous Padding:**
   - Header: 60px vertical (not cramped 40px)
   - Content: 56px vertical, 48px horizontal (breathing room)
   - Footer: 40px vertical (comfortable)

2. **Typography Hierarchy:**
   - Headlines: 32px, weight 300, subtle tracking
   - Body: 16px, line-height 1.7 (easy reading)
   - Captions: 11-13px, uppercase, tracked

3. **Scandinavian Whitespace:**
   - Paragraph spacing: 28px (not 16px)
   - Section spacing: 40-48px (generous)
   - CTA isolation: 48px margins

4. **Vogue Elements:**
   - Accent line: 60px width, 1px height, centered
   - Pull quotes: Italic serif, larger size, bordered
   - Minimal border-radius: 2px (not rounded)

5. **Stone Palette:**
   - Keep all your existing stone colors
   - Warm off-white backgrounds (#fafaf9)
   - Subtle borders (#e7e5e4, #d6d3d1)

6. **NO Changes to:**
   - Color values (perfect as-is)
   - Font fallbacks (Times New Roman for email compatibility)
   - Core brand identity

This template gives you the Vogue × Scandinavian editorial feel while keeping your perfect stone color palette intact.

**SSELFIE Brand Styling:**
- Colors: ${brand.colors.dark} (dark), ${brand.colors.black} (black), ${brand.colors.light} (light), ${brand.colors.gray} (gray), ${brand.colors.muted} (muted)
- Logo: ${brand.typography.logo.fontFamily}, ${brand.typography.logo.fontSize}, weight ${brand.typography.logo.fontWeight}, letter-spacing ${brand.typography.logo.letterSpacing}, uppercase, color ${brand.typography.logo.colorLight} on dark or ${brand.typography.logo.colorDark} on light
- Body font: ${brand.typography.body.fontFamily}
- Headings: ${brand.typography.heading.fontFamily}, ${brand.typography.heading.fontSize}, weight ${brand.typography.heading.fontWeight}, letter-spacing ${brand.typography.heading.letterSpacing}, uppercase
- Body text: ${brand.typography.body.fontSize}, line-height ${brand.typography.body.lineHeight}, color ${brand.colors.bodyText} or ${brand.colors.bodyTextAlt}
- Buttons: background ${brand.buttons.backgroundColor}, color ${brand.buttons.color}, padding ${brand.buttons.padding}, border-radius ${brand.buttons.borderRadius}, uppercase, letter-spacing ${brand.buttons.letterSpacing}
- Background: ${brand.colors.bodyBg} for body, ${brand.colors.containerBg} for email container, ${brand.colors.footerBg} for footer
- Use inline styles ONLY (no <style> tags in body)

Include unsubscribe link: {{{RESEND_UNSUBSCRIBE_URL}}}`

  return prompt
}

