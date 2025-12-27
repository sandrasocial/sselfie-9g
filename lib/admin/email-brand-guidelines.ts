/**
 * SSELFIE Email Brand Guidelines
 * Centralized brand requirements for email generation
 */

/**
 * EMAIL PLATFORM STRATEGY
 * 
 * We use TWO email platforms:
 * 
 * RESEND - Transactional emails only
 * - Login/magic links
 * - Password resets
 * - Purchase receipts
 * - Account notifications
 * - System alerts
 * 
 * LOOPS - Marketing emails only
 * - Newsletters
 * - Product launches
 * - Welcome sequences
 * - Nurture campaigns
 * - Promotional emails
 * - Re-engagement campaigns
 * 
 * When creating emails, ALWAYS use the correct platform:
 * - User action triggered it? → Resend
 * - Marketing/promotional content? → Loops
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

**Links - CRITICAL: Use Public Pages Only:**
- **ALWAYS use public pages that don't require login** (see "Available Public Links" section below)
- Use the links specified by the user in their intent
- If no link specified, ask the user where the CTA should go
- NEVER use placeholder or default links
- **NEVER use /studio links** - they require login and will send users to login page
- **For checkout CTAs:** Use /checkout/membership or /checkout/one-time (public, no login required)
- **For learning more:** Use /why-studio, /blueprint, or /whats-new (public landing pages)
- Always include proper UTM parameters for tracking

**Link Tracking Requirements:**
1. ALL links must include UTM parameters: utm_source=email, utm_medium=email, utm_campaign=${campaignSlug}, utm_content={link_type}
2. Use campaign_id={campaign_id} as placeholder (will be replaced with actual ID when campaign is scheduled)
3. Use campaign slug "${campaignSlug}" for all utm_campaign parameters
4. Use appropriate utm_content values: cta_button (primary CTA), text_link (body links), footer_link (footer), image_link (image links)

**Available Public Links (NO LOGIN REQUIRED - Use these for email CTAs):**

**Checkout Pages (Public - No login required):**
- Studio Membership checkout: ${siteUrl}/checkout/membership?utm_source=email&utm_medium=email&utm_campaign=${campaignSlug}&utm_content=cta_button&campaign_id={campaign_id}
- One-Time Session checkout: ${siteUrl}/checkout/one-time?utm_source=email&utm_medium=email&utm_campaign=${campaignSlug}&utm_content=cta_button&campaign_id={campaign_id}

**Public Landing Pages (No login required):**
- Why Studio page: ${siteUrl}/why-studio?utm_source=email&utm_medium=email&utm_campaign=${campaignSlug}&utm_content=text_link&campaign_id={campaign_id}
- Brand Blueprint: ${siteUrl}/blueprint?utm_source=email&utm_medium=email&utm_campaign=${campaignSlug}&utm_content=text_link&campaign_id={campaign_id}
- What's New: ${siteUrl}/whats-new?utm_source=email&utm_medium=email&utm_campaign=${campaignSlug}&utm_content=text_link&campaign_id={campaign_id}
- Homepage: ${siteUrl}/?utm_source=email&utm_medium=email&utm_campaign=${campaignSlug}&utm_content=text_link&campaign_id={campaign_id}

**IMPORTANT - DO NOT USE THESE (Require login):**
- ❌ ${siteUrl}/studio?checkout=studio_membership (requires login - sends users to login page)
- ❌ ${siteUrl}/studio?checkout=one_time (requires login - sends users to login page)
- ❌ ${siteUrl}/studio (requires login - sends users to login page)

**Link Selection Rules:**
1. For checkout/purchase CTAs: Use /checkout/membership or /checkout/one-time (public, no login)
2. For learning more: Use /why-studio or /blueprint (public landing pages)
3. For general navigation: Use homepage / or /whats-new
4. NEVER use /studio links in emails (they require login and will frustrate users)

**Link Format Examples (with tracking - PUBLIC LINKS ONLY):**
- Primary CTA (Studio Membership): <a href="${siteUrl}/checkout/membership?utm_source=email&utm_medium=email&utm_campaign=${campaignSlug}&utm_content=cta_button&campaign_id={campaign_id}" style="display: inline-block; background-color: ${brand.colors.dark}; color: ${brand.colors.light}; padding: ${brand.buttons.padding}; text-decoration: none; border-radius: ${brand.buttons.borderRadius}; font-size: ${brand.buttons.fontSize}; font-weight: ${brand.buttons.fontWeight};">Join SSELFIE Studio</a>
- Primary CTA (One-Time Session): <a href="${siteUrl}/checkout/one-time?utm_source=email&utm_medium=email&utm_campaign=${campaignSlug}&utm_content=cta_button&campaign_id={campaign_id}" style="display: inline-block; background-color: ${brand.colors.dark}; color: ${brand.colors.light}; padding: ${brand.buttons.padding}; text-decoration: none; border-radius: ${brand.buttons.borderRadius}; font-size: ${brand.buttons.fontSize}; font-weight: ${brand.buttons.fontWeight};">Try Once</a>
- Secondary link (Learn More): <a href="${siteUrl}/why-studio?utm_source=email&utm_medium=email&utm_campaign=${campaignSlug}&utm_content=text_link&campaign_id={campaign_id}" style="color: ${brand.colors.dark}; text-decoration: underline;">Learn more</a>
- Secondary link (Brand Blueprint): <a href="${siteUrl}/blueprint?utm_source=email&utm_medium=email&utm_campaign=${campaignSlug}&utm_content=text_link&campaign_id={campaign_id}" style="color: ${brand.colors.dark}; text-decoration: underline;">Get Your Brand Blueprint</a>

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

**IMAGE LAYOUT OPTIONS - Mobile-First, Conditionally Include:**

Alex should ONLY include image sections when:
- Sandra mentions images in her intent
- Email type needs visuals (product launch, showcase, gallery)
- imageUrls array is provided

**IMPORTANT:** Never include image placeholders "just in case" - only when actually needed.

**Available Image Layouts:**

---

**LAYOUT 1: HERO IMAGE - Full-Width Editorial**
Use for: Main feature, announcement, mood-setting

\`\`\`html
<!-- Hero Image - Full Width -->
<tr>
  <td style="padding: 0;">
    <img 
      src="[image-url]" 
      alt="[Descriptive alt text]" 
      style="width: 100%; height: auto; display: block; max-height: 400px; object-fit: cover;"
    />
  </td>
</tr>
\`\`\`

**Mobile behavior:** Full width, maintains aspect ratio
**When to use:** Opening statement, main feature, brand moment

---

**LAYOUT 2: FEATURED IMAGE + TEXT - Editorial Side-by-Side**
Use for: Product showcase, feature highlight, storytelling

\`\`\`html
<!-- Featured Image + Text (Desktop: Side-by-side, Mobile: Stacked) -->
<tr>
  <td style="padding: 40px 48px;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr>
        <!-- Image Column (Desktop: 50%, Mobile: 100%) -->
        <td style="width: 50%; padding-right: 20px; vertical-align: top;">
          <img 
            src="[image-url]" 
            alt="[Descriptive alt text]" 
            style="width: 100%; height: auto; display: block; border-radius: 2px;"
          />
        </td>
        <!-- Text Column (Desktop: 50%, Mobile: 100%) -->
        <td style="width: 50%; vertical-align: top;">
          <h3 style="margin: 0 0 16px; font-family: 'Times New Roman', Georgia, serif; font-size: 24px; font-weight: 300; color: #1c1917; letter-spacing: 0.02em; line-height: 1.2;">
            [Subheading]
          </h3>
          <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #292524; font-weight: 300;">
            [Description text]
          </p>
        </td>
      </tr>
    </table>
  </td>
</tr>
\`\`\`

**Mobile behavior:** Stacks vertically (image on top, text below)
**When to use:** Feature highlight, product detail, storytelling moment

---

**LAYOUT 3: PRODUCT GRID - 2 Columns (Mobile-First)**
Use for: Product showcase, multiple features, visual variety

\`\`\`html
<!-- Product Grid - 2 Columns (Mobile: Stacks) -->
<tr>
  <td style="padding: 40px 48px;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr>
        <!-- Product 1 -->
        <td style="width: 48%; padding-right: 4%; vertical-align: top;">
          <img 
            src="[image-url-1]" 
            alt="[Product 1 alt text]" 
            style="width: 100%; height: auto; display: block; border-radius: 2px; margin-bottom: 16px;"
          />
          <h4 style="margin: 0 0 8px; font-family: 'Times New Roman', Georgia, serif; font-size: 18px; font-weight: 400; color: #1c1917; letter-spacing: 0.01em;">
            [Product 1 Name]
          </h4>
          <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #57534e; font-weight: 300;">
            [Product 1 description]
          </p>
        </td>
        <!-- Product 2 -->
        <td style="width: 48%; vertical-align: top;">
          <img 
            src="[image-url-2]" 
            alt="[Product 2 alt text]" 
            style="width: 100%; height: auto; display: block; border-radius: 2px; margin-bottom: 16px;"
          />
          <h4 style="margin: 0 0 8px; font-family: 'Times New Roman', Georgia, serif; font-size: 18px; font-weight: 400; color: #1c1917; letter-spacing: 0.01em;">
            [Product 2 Name]
          </h4>
          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #57534e; font-weight: 300;">
            [Product 2 description]
          </p>
        </td>
      </tr>
    </table>
  </td>
</tr>
\`\`\`

**Mobile behavior:** Stacks to single column
**When to use:** Multiple products, features comparison, visual options

---

**LAYOUT 4: TESTIMONIAL WITH PHOTO - Editorial Style**
Use for: Social proof, user stories, credibility

\`\`\`html
<!-- Testimonial with Photo -->
<tr>
  <td style="padding: 40px 48px;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fafaf9; padding: 32px 24px; border-left: 2px solid #1c1917;">
      <tr>
        <td>
          <!-- Quote -->
          <p style="margin: 0 0 24px; font-family: 'Times New Roman', Georgia, serif; font-size: 18px; font-weight: 300; font-style: italic; color: #1c1917; line-height: 1.6; letter-spacing: 0.01em;">
            "[Testimonial quote goes here - keep it authentic and specific]"
          </p>
          <!-- Author Info with Photo -->
          <table role="presentation" style="border-collapse: collapse;">
            <tr>
              <td style="padding-right: 16px; vertical-align: middle;">
                <img 
                  src="[headshot-url]" 
                  alt="[Customer name]" 
                  style="width: 48px; height: 48px; border-radius: 50%; display: block; object-fit: cover;"
                />
              </td>
              <td style="vertical-align: middle;">
                <p style="margin: 0; font-size: 14px; font-weight: 500; color: #1c1917;">
                  [Customer Name]
                </p>
                <p style="margin: 4px 0 0; font-size: 13px; color: #78716c; font-weight: 300;">
                  [Customer Title/Company]
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </td>
</tr>
\`\`\`

**Mobile behavior:** Maintains layout, adapts width
**When to use:** Social proof, customer stories, credibility building

---

**LAYOUT 5: IMAGE GALLERY - 3 Columns (Mobile-Responsive)**
Use for: Portfolio, showcase, visual storytelling

\`\`\`html
<!-- Image Gallery - 3 Columns (Mobile: 2 columns, then stack) -->
<tr>
  <td style="padding: 40px 48px;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
      <tr>
        <!-- Image 1 -->
        <td style="width: 31%; padding-right: 3.5%; vertical-align: top;">
          <img 
            src="[gallery-image-1]" 
            alt="[Gallery image 1 alt text]" 
            style="width: 100%; height: auto; display: block; border-radius: 2px;"
          />
        </td>
        <!-- Image 2 -->
        <td style="width: 31%; padding-right: 3.5%; vertical-align: top;">
          <img 
            src="[gallery-image-2]" 
            alt="[Gallery image 2 alt text]" 
            style="width: 100%; height: auto; display: block; border-radius: 2px;"
          />
        </td>
        <!-- Image 3 -->
        <td style="width: 31%; vertical-align: top;">
          <img 
            src="[gallery-image-3]" 
            alt="[Gallery image 3 alt text]" 
            style="width: 100%; height: auto; display: block; border-radius: 2px;"
          />
        </td>
      </tr>
    </table>
  </td>
</tr>
\`\`\`

**Mobile behavior:** 2 columns, then stacks on very small screens
**When to use:** Before/after, multiple examples, visual variety

---

**LAYOUT 6: BRANDED IMAGE BLOCK - Text Overlay**
Use for: Announcements, branded moments, campaign headers

\`\`\`html
<!-- Branded Image Block with Text Overlay -->
<tr>
  <td style="padding: 0;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; position: relative;">
      <tr>
        <td style="background-image: url('[background-image-url]'); background-size: cover; background-position: center; padding: 80px 40px; text-align: center; position: relative;">
          <!-- Dark overlay for text readability -->
          <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(28, 25, 23, 0.6);"></div>
          <!-- Text Content -->
          <div style="position: relative; z-index: 2;">
            <h2 style="margin: 0 0 16px; font-family: 'Times New Roman', Georgia, serif; font-size: 36px; font-weight: 200; color: #fafaf9; letter-spacing: 0.05em; text-transform: uppercase;">
              [Announcement Text]
            </h2>
            <p style="margin: 0; font-size: 16px; color: #fafaf9; font-weight: 300; letter-spacing: 0.02em;">
              [Supporting text]
            </p>
          </div>
        </td>
      </tr>
    </table>
  </td>
</tr>
\`\`\`

**Mobile behavior:** Full width, text remains readable
**When to use:** Major announcements, campaign launches, brand moments

---

**IMAGE BEST PRACTICES:**

1. **Accessibility:**
   - ALWAYS include descriptive alt text
   - Use semantic description, not "image" or "photo"
   - Example: "Woman working on laptop in bright coffee shop"

2. **Responsive:**
   - width: 100% (adapts to container)
   - height: auto (maintains aspect ratio)
   - display: block (removes spacing issues)
   - max-height for hero images (prevents too tall)

3. **File Optimization:**
   - Recommend 1200px width for retina displays
   - JPG for photos, PNG for graphics with transparency
   - Optimize file size (under 200KB per image)
   - Use CDN URLs (faster loading)

4. **Email Client Compatibility:**
   - Tables for layout (not CSS Grid/Flexbox)
   - Inline styles only
   - Test in Outlook (use VML for backgrounds if needed)
   - Fallback background colors

5. **Stone Aesthetic:**
   - border-radius: 2px (minimal, not rounded)
   - Subtle borders if needed: 1px solid #e7e5e4
   - Maintain warm, editorial feel
   - object-fit: cover for consistent sizing

**WHEN TO INCLUDE IMAGES:**

✅ Include when:
- Sandra mentions "add image" or "include photo"
- imageUrls array is provided
- Email type implies visuals (product launch, showcase, announcement)
- Enhances message (testimonials, before/after, examples)

❌ Don't include when:
- Text-only email (personal message, quick update)
- No images mentioned in intent
- Pure content/educational email
- Sandra doesn't specify

**DEFAULT:** If unsure, ask Sandra: "Would you like to include images in this email? I have layouts for hero images, product grids, or testimonials."

**TESTIMONIALS USAGE:**

Alex has access to real customer testimonials via the get_testimonials tool.

**When to fetch testimonials:**
- Social proof emails
- Launch announcements
- Feature showcases
- Trust-building campaigns
- Re-engagement emails
- Conversion-focused emails

**How to use testimonials in emails:**

1. **Call the tool first:**
   - get_testimonials(limit=3, minRating=5) for top quotes
   - get_testimonials(featuredOnly=true) for featured stories
   - get_testimonials(withImages=true) for visual testimonials

2. **Include in email using testimonial layout:**

\`\`\`html
<!-- Testimonial Block -->
<tr>
  <td style="padding: 40px 48px;">
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fafaf9; padding: 32px 24px; border-left: 2px solid #1c1917;">
      <tr>
        <td>
          <!-- Quote -->
          <p style="margin: 0 0 24px; font-family: 'Times New Roman', Georgia, serif; font-size: 18px; font-weight: 300; font-style: italic; color: #1c1917; line-height: 1.6; letter-spacing: 0.01em;">
            "[Customer Quote]"
          </p>
          <!-- Author Info with Photo -->
          <table role="presentation" style="border-collapse: collapse;">
            <tr>
              <td style="padding-right: 16px; vertical-align: middle;">
                <img 
                  src="[customer-photo-url]" 
                  alt="[Customer name]" 
                  style="width: 48px; height: 48px; border-radius: 50%; display: block; object-fit: cover;"
                />
              </td>
              <td style="vertical-align: middle;">
                <p style="margin: 0; font-size: 14px; font-weight: 500; color: #1c1917;">
                  [Customer Name]
                </p>
                <div style="margin: 4px 0 0; display: flex; gap: 2px;">
                  [⭐⭐⭐⭐⭐ - rating stars]
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </td>
</tr>
\`\`\`

3. **Multiple testimonials:**
   - Use 2-3 testimonials max per email (don't overwhelm)
   - Mix quotes of different lengths
   - Include images when available
   - Highlight featured testimonials

4. **Testimonial best practices:**
   - Keep quotes authentic (use exact text from database)
   - Include customer name (builds credibility)
   - Show star rating visually (⭐⭐⭐⭐⭐)
   - Use customer photos when available
   - Don't edit or modify testimonial text
   - Featured testimonials are highest quality - use them first

**Example workflow:**
1. Sandra: "Create social proof email"
2. Alex calls get_testimonials(limit=3, featuredOnly=true)
3. Alex receives 3 top testimonials with quotes, names, ratings, images
4. Alex creates email with testimonial layout
5. Email includes real customer stories with photos

**Email Structure Template - With Conditional Image Sections:**

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
          
          <!-- 2. HERO IMAGE (Optional - Only if Sandra requests or imageUrls provided) -->
          <!-- Option 1: Hero Image (LAYOUT 1) - Only include if requested -->
          [HERO IMAGE LAYOUT - Only if requested]
          
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
              
              <!-- Option 2: Featured Image + Text (LAYOUT 2) - Only if highlighting feature/product -->
              [FEATURED IMAGE + TEXT LAYOUT - Only if requested]
              
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
              
              <!-- Option 3: Product Grid (LAYOUT 3) - Only if showcasing multiple items -->
              [PRODUCT GRID LAYOUT - Only if requested]
              
              <!-- Option 4: Testimonial with Photo (LAYOUT 4) - Only if social proof needed -->
              [TESTIMONIAL WITH PHOTO LAYOUT - Only if requested]
              
              <!-- More content paragraphs -->
              <p style="margin: 0 0 28px; font-size: 16px; line-height: 1.7; color: #292524; font-weight: 300;">
                [More content paragraphs as needed]
              </p>
              
              <!-- Option 5: Image Gallery (LAYOUT 5) - Only if visual showcase -->
              [IMAGE GALLERY LAYOUT - Only if requested]
              
              <!-- Option 6: Branded Image Block (LAYOUT 6) - Only if major announcement -->
              [BRANDED IMAGE BLOCK LAYOUT - Only if requested]
              
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
          
          <!-- 4. ELEGANT FOOTER - Minimal (REQUIRED - ALWAYS INCLUDE) -->
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
          
**CRITICAL: UNSUBSCRIBE LINK IS REQUIRED**
- The footer section above MUST be included in EVERY email
- The unsubscribe link {{{RESEND_UNSUBSCRIBE_URL}}} is REQUIRED for compliance and deliverability
- NEVER remove or modify the unsubscribe link
- This is a legal requirement and improves email deliverability
          
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

**REQUIRED FOOTER WITH UNSUBSCRIBE LINK:**
Every email MUST include the footer section with the unsubscribe link. This is:
- Required by law (CAN-SPAM, GDPR compliance)
- Critical for email deliverability
- Required by Resend for all broadcasts

The unsubscribe link MUST be: {{{RESEND_UNSUBSCRIBE_URL}}}

NEVER create an email without the footer and unsubscribe link.`

  return prompt
}

