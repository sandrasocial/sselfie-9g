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

**Product Links & Tracking**

When including links in the email, use these URLs with tracking parameters:

**Product Checkout Links (use campaign slug: "${campaignSlug}"):**
- Studio Membership: ${siteUrl}/studio?checkout=studio_membership&utm_source=email&utm_medium=email&utm_campaign=${campaignSlug}&utm_content=cta_button&campaign_id={campaign_id}
- One-Time Session: ${siteUrl}/studio?checkout=one_time&utm_source=email&utm_medium=email&utm_campaign=${campaignSlug}&utm_content=cta_button&campaign_id={campaign_id}

**Landing Pages (use campaign slug: "${campaignSlug}"):**
- Why Studio: ${siteUrl}/why-studio?utm_source=email&utm_medium=email&utm_campaign=${campaignSlug}&utm_content=text_link&campaign_id={campaign_id}
- Homepage: ${siteUrl}/?utm_source=email&utm_medium=email&utm_campaign=${campaignSlug}&utm_content=text_link&campaign_id={campaign_id}

**Link Tracking:**
1. ALL links must include UTM parameters: utm_source=email, utm_medium=email, utm_campaign=${campaignSlug}, utm_content={link_type}
2. Use campaign_id={campaign_id} as placeholder (will be replaced with actual ID when campaign is scheduled)
3. Use campaign slug "${campaignSlug}" for all utm_campaign parameters
4. Use appropriate utm_content values: cta_button (primary CTA), text_link (body links), footer_link (footer), image_link (image links)

**Link Examples (use these exact formats with campaign slug "${campaignSlug}"):**
- Primary CTA: <a href="${siteUrl}/studio?checkout=studio_membership&utm_source=email&utm_medium=email&utm_campaign=${campaignSlug}&utm_content=cta_button&campaign_id={campaign_id}" style="display: inline-block; background-color: ${brand.colors.dark}; color: ${brand.colors.light}; padding: ${brand.buttons.padding}; text-decoration: none; border-radius: ${brand.buttons.borderRadius}; font-size: ${brand.buttons.fontSize}; font-weight: ${brand.buttons.fontWeight};">Join SSELFIE Studio</a>
- Secondary link: <a href="${siteUrl}/why-studio?utm_source=email&utm_medium=email&utm_campaign=${campaignSlug}&utm_content=text_link&campaign_id={campaign_id}" style="color: ${brand.colors.dark}; text-decoration: underline;">Learn more</a>

**When to Use Which Link:**
- Primary CTA → Use checkout links (checkout=studio_membership or checkout=one_time)
- Educational/nurturing content → Use landing pages (/why-studio, /)
- Always include full tracking parameters for conversion attribution

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

