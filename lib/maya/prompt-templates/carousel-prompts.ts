/**
 * Instagram Carousel Prompt Templates for NanoBanana Pro
 * Optimized for multi-slide consistency and professional quality
 */

import type { PromptTemplate, PromptContext, PromptVariation } from './types'
import * as helpers from './helpers'

export const CAROUSEL_COVER_SLIDE: PromptTemplate = {
  id: 'carousel_cover_professional',
  name: 'Professional Carousel Cover',
  description: 'High-impact cover slide with text space for educational/brand content',
  useCases: ['Educational carousels', 'Personal brand posts', 'Product launches'],
  requiredImages: {
    min: 1,
    max: 2,
    types: ['user_lora', 'gallery']
  },
  promptStructure: (context: PromptContext) => `
**Character Consistency:** Use the person from Image 1 (LoRA reference), maintaining exact facial features, hair color, and overall appearance

**Subject:** ${helpers.analyzeUserFromImage(context.userImages[0])}

**Action:** ${helpers.determineEngagingPose(context.contentType)}

**Environment:** ${helpers.generateEnvironmentForCarousel(context.userIntent)}

**Composition:** Vertical 4:5 Instagram format, ${helpers.determineShotType(context.contentType)} shot, rule of thirds positioning

**Style:** ${helpers.determineVisualStyle(context.userImages, context.contentType)}

**Lighting:** ${helpers.generateLightingSetup('professional', context.contentType)}

**Technical:** 85mm lens, f/2.0 shallow depth of field, 2K resolution, natural skin texture with visible pores

**Text Space:** Top 30% reserved for bold headline overlay (to be added in post-production)

**Color Palette:** ${helpers.extractColorPalette(context.userImages)}

**Final Use:** Instagram carousel cover slide (Slide 1 of 5), ${context.contentType}
  `.trim(),
  variations: [
    {
      name: 'Luxury Editorial',
      moodAdjustment: 'High-end editorial photography, sophisticated, aspirational',
      lightingAdjustment: 'Soft diffused window light from left, golden hour warmth, professional studio quality',
      styleKeywords: 'Vogue aesthetic, minimal, clean lines, muted color grading'
    },
    {
      name: 'Authentic UGC',
      moodAdjustment: 'Relatable, authentic, approachable entrepreneur vibe',
      lightingAdjustment: 'Natural daylight, slightly imperfect, iPhone quality realism',
      styleKeywords: 'Candid moment, natural expression, everyday authenticity'
    },
    {
      name: 'Bold & Dynamic',
      moodAdjustment: 'Energetic, confident, attention-grabbing',
      lightingAdjustment: 'Dramatic side lighting, high contrast, cinematic quality',
      styleKeywords: 'Dynamic pose, powerful presence, saturated colors'
    }
  ]
}

export const CAROUSEL_CONTENT_SLIDE: PromptTemplate = {
  id: 'carousel_content_consistent',
  name: 'Content Slide with Character Consistency',
  description: 'Maintains identity from cover slide with varied pose/setting',
  useCases: ['Educational content slides', 'Step-by-step guides', 'Storytelling sequences'],
  requiredImages: {
    min: 2, // Cover slide reference + user LoRA
    max: 3,
    types: ['user_lora', 'gallery']
  },
  promptStructure: (context: PromptContext) => `
**Character Lock:** Keep the EXACT same person from ${context.userImages[0]?.description || 'the cover slide reference'} - identical facial features, hair, and overall styling

**Consistency Anchors:** Match the color palette, lighting quality, and visual style from the reference slide

**Subject:** Same person, now in ${helpers.determineContentSlideVariation(context.contentType)}

**Action:** ${helpers.generateNaturalAction(context.contentType, 'content_slide')}

**Environment:** ${helpers.varyEnvironmentWhileMaintainingConsistency(context)}

**Composition:** 4:5 vertical, ${helpers.adjustShotTypeForVariety('medium')}, maintains visual cohesion with cover

**Technical:** Same lens and depth of field as cover (85mm, f/2.0), ensuring consistent image quality

**Text Space:** ${helpers.determineTextPlacement('content_slide')}

**Variation from Cover:** ${helpers.specifyWhatChanges(context)}

**Final Use:** Instagram carousel Slide ${context.slideNumber || 2} of 5
  `.trim(),
  variations: [
    {
      name: 'Workspace Focus',
      environmentFocus: 'Showing productive work environment, laptop/desk visible',
      actionChange: 'Active working moment, natural task-focused expression'
    },
    {
      name: 'Lifestyle Context',
      environmentFocus: 'Real-life setting (coffee shop, outdoor, home)',
      actionChange: 'Relaxed authentic moment showing personality'
    }
  ]
}

export const CAROUSEL_INFOGRAPHIC_SLIDE: PromptTemplate = {
  id: 'carousel_infographic_nanobanana',
  name: 'Educational Infographic (NanoBanana Pro Strength)',
  description: 'Leverages NanoBanana Pro\'s superior text rendering for educational content',
  useCases: ['Step-by-step guides', 'Data visualizations', 'How-to content', 'Statistics'],
  requiredImages: {
    min: 0, // Can be purely graphic
    max: 1, // Optional brand/style reference
    types: ['inspiration', 'gallery']
  },
  promptStructure: (context: PromptContext) => `
**Visual Type:** Vertical infographic in 9:16 format, optimized for Instagram carousel

**Content Structure:** ${helpers.determineInfographicLayout(context.userIntent)}

**Text Rendering (NanoBanana Pro Strength):** All text must be legible, accurately spelled, and professionally typeset

**Layout:** ${helpers.generateInfographicLayout(context.contentType)}

**Style:** ${helpers.extractStyleFromReference(context.userImages) || 'Modern minimalist, luxury brand aesthetic, clean lines'}

**Color Palette:** ${helpers.extractColorPalette(context.userImages) || 'Soft beige background (#F5F1E8), dark navy text (#1A2332), gold accent (#C9A96E)'}

**Typography:** Bold sans-serif for headers, regular weight for body text, high contrast for readability

**Icons/Graphics:** ${helpers.determineGraphicStyle(context.contentType)}

**Data Integration:** ${helpers.shouldUseGoogleSearch(context.userIntent) ? 'Use Google Search to pull current 2025 data for accuracy' : 'Use provided data points'}

**Spacing:** Professional margins (60px all sides), generous white space, clear visual hierarchy

**Final Use:** Instagram carousel educational slide, ${context.contentType}
  `.trim(),
  variations: [
    {
      name: 'Minimal Data Card',
      layout: 'Single large statistic with supporting context',
      style: 'Ultra-minimal, lots of white space, one accent color'
    },
    {
      name: 'Multi-Step Process',
      layout: '3-5 steps vertically stacked with icons',
      style: 'Clear numbered steps, visual flow indicators'
    },
    {
      name: 'Comparison Chart',
      layout: 'Side-by-side comparison with before/after or vs. data',
      style: 'Clear visual separation, balanced columns'
    }
  ]
}

// Updated Modern Instagram Templates (2025)
export const CAROUSEL_COVER_SLIDE_UPDATED: PromptTemplate = {
  id: 'carousel_cover_modern',
  name: 'Modern Carousel Cover (Instagram 2025)',
  description: 'Clean, minimalistic cover slide matching current Instagram aesthetics',
  useCases: ['Educational carousels', 'Personal brand posts', 'Viral content'],
  requiredImages: {
    min: 1,
    max: 2,
    types: ['user_lora', 'gallery']
  },
  promptStructure: (context: PromptContext) => `
**Character Consistency:** Use the person from Image 1 (LoRA reference), maintaining EXACT facial features, hair color, texture, and overall appearance across all slides

**Subject:** ${helpers.analyzeUserFromImage(context.userImages[0])}

**Action:** ${helpers.determineEngagingPose(context.contentType)}

**Environment:** ${helpers.generateEnvironmentForCarousel(context.userIntent)}

**Composition:** Vertical 4:5 Instagram carousel format (1080x1350px), ${helpers.determineShotType(context.contentType)} framing, subject positioned using rule of thirds for visual balance

**Style:** ${helpers.determineVisualStyle(context.userImages, context.contentType, context.brandProfile)}

**Lighting:** ${helpers.generateLightingSetup('professional', context.contentType)}

**Technical:** 85mm lens equivalent, f/2.0 shallow depth of field for subject isolation, 2K resolution minimum, natural skin texture with visible pores

${helpers.generateColorPalette(context.brandProfile)}

**Typography & Text Overlay:**
${helpers.generateTypography(context.brandProfile)}

**Text Placement (Critical for Instagram):**
- **Large Number/Title:** Lower third OR center-left of image
  - Example: "10 things" in ${context.brandProfile?.primaryColor || '#1A1A1A'}
  - Font size: Very large (120-180pt equivalent), bold weight
  - Position: 20% from bottom, aligned left with 60px padding

- **Subtitle/Hook:** Directly below main title
  - Example: "I wish I knew before using AI"
  - Font size: Medium (40-60pt), regular or italic emphasis on key words
  - Same alignment as main title

- **Text Box (if background is busy):**
  - Semi-transparent dark overlay (rgba(0,0,0,0.6)) behind text ONLY in text area
  - Rounded corners (12px radius)
  - Padding: 30px all sides
  - OR clean white box with subtle drop shadow

${helpers.generateBrandWatermark(context.brandProfile)}

**Top Right Corner:** Small quote or teaser text
  - Example: "NOTHING U SEE HERE IS REAL" (ironic/attention-grabbing)
  - Font size: Small (18-24pt)
  - Position: 40px from top-right corner
  - Color: ${context.brandProfile?.accentColor || '#666666'}

**Bottom Right:** Directional arrow or swipe indicator
  - Simple arrow icon (→) suggesting "swipe for more"
  - Size: 60x60px
  - Position: 40px from bottom-right corner

**White Space Rule:** Minimum 15% of image should remain uncluttered for breathing room

**Text Legibility:**
- All text must have minimum 4.5:1 contrast ratio with background
- If image is busy: use text box overlay or dark gradient behind text
- Keep text crisp and readable at thumbnail size (should be readable at 400px width)

**Visual Hierarchy:**
1. Subject's face/eyes (primary focus)
2. Large number/title (secondary)
3. Subtitle (tertiary)
4. Brand elements (subtle)

**Final Use:** Instagram carousel cover slide (Slide 1 of ${context.totalSlides || 5}), optimized for feed and Explore page
  `.trim(),
  variations: [
    {
      name: 'Luxury Minimal',
      moodAdjustment: 'Ultra-minimal, sophisticated, high-end editorial aesthetic',
      textPlacement: 'Large numbers in elegant serif, lots of white space, subtle brand elements',
      styleKeywords: 'Monochrome palette with one subtle gold accent (#C9A96E)'
    },
    {
      name: 'Bold & Dynamic',
      moodAdjustment: 'High energy, attention-grabbing, vibrant and modern',
      textPlacement: 'Oversized bold sans-serif, high contrast colors, dynamic positioning',
      styleKeywords: 'Strong contrast - black and white with bright accent color'
    },
    {
      name: 'Organic Authentic',
      moodAdjustment: 'Natural, relatable, warm and approachable',
      textPlacement: 'Handwritten-style numbers, casual text, earthy tones',
      styleKeywords: 'Warm neutrals - beige, cream, terracotta accents'
    }
  ]
}

export const CAROUSEL_CONTENT_SLIDE_UPDATED: PromptTemplate = {
  id: 'carousel_content_modern',
  name: 'Content Slide with Modern Text Layout',
  description: 'Consistent content slides with Instagram-optimized text placement',
  useCases: ['Educational content', 'Tips & tricks', 'List posts'],
  requiredImages: {
    min: 2,
    max: 3,
    types: ['user_lora', 'gallery']
  },
  promptStructure: (context: PromptContext) => `
**Character Lock:** Keep the EXACT same person from the cover slide reference - identical facial features, hair, styling, and proportions

**Consistency Anchors from Cover Slide:**
- Same color palette: ${helpers.generateColorPalette(context.brandProfile)}
- Same lighting quality and direction
- Same visual style and mood
- Same typography and text formatting

**Subject Variation:** Same person, now in ${helpers.determineContentSlideVariation(context.contentType)}

**Action:** ${helpers.generateNaturalAction(context.contentType, 'content_slide')}

**Environment:** ${helpers.varyEnvironmentWhileMaintainingConsistency(context)}

**Composition:** 4:5 vertical Instagram format, ${helpers.adjustShotTypeForVariety('medium')}, maintains visual cohesion with cover

**Technical:** Same camera specs as cover (85mm, f/2.0), ensuring consistent depth of field and image quality

**Text Overlay Structure (Instagram Best Practice):**

**Slide Number & Main Point:**
- **Position:** Top third of image OR center, depending on subject placement
- **Format:** 
  - Number: "${context.slideNumber}." in large bold (80-100pt)
  - Main point: "You can create a whole photoshoot without leaving your house." (60-80pt)
  - Both in ${context.brandProfile?.primaryColor || '#1A1A1A'}

**Supporting Text/Explanation:**
- **Position:** Directly below main point, same left alignment
- **Format:**
  - 2-3 lines maximum for readability
  - Regular weight (35-45pt)
  - Line height: 1.4 for easy reading
  - Example: "I used to spend hours planning, choosing wardrobe, makeup, editing..."

**Emphasis Technique:**
- Italicize key words or phrases for visual interest
- Example: "Now, AI creates the whole outfit, background, lighting, all from *one prompt*."
- NO underlining, NO all-caps for body text

**Text Box Style (Choose One Based on Background):**

OPTION A - Semi-Transparent Dark Overlay:
Background: rgba(0, 0, 0, 0.65) - dark semi-transparent
Border radius: 16px rounded corners
Padding: 40px all sides
Position: Centered OR lower third
Text color: White (#FFFFFF)
Max width: 85% of image width

OPTION B - Clean White Box:
Background: #FFFFFF or rgba(255, 255, 255, 0.95)
Border radius: 16px rounded corners
Padding: 40px all sides
Subtle drop shadow: 0px 4px 20px rgba(0,0,0,0.1)
Text color: ${context.brandProfile?.primaryColor || '#1A1A1A'}
Max width: 85% of image width

OPTION C - No Box (If Background is Clean):
Text directly on image
Add subtle text shadow for legibility: 0px 2px 4px rgba(0,0,0,0.3)
Ensure background area is not too busy

${helpers.generateBrandWatermark(context.brandProfile)}

**Text Legibility Rules:**
- All text readable at 400px width (Instagram thumbnail size)
- Minimum 4.5:1 contrast ratio
- Line length: Maximum 12 words per line for easy reading
- Avoid text over subject's face unless intentional design choice

**Variation from Cover:**
- Different pose/angle of same person
- Same environment OR complementary environment
- Text box in consistent position across all content slides
- Maintains brand colors and typography exactly

**Visual Balance:**
- If subject on left: text box on right (and vice versa)
- If subject centered: text in upper or lower third
- Always leave white space - never fill entire frame with text

**Final Use:** Instagram carousel content slide (Slide ${context.slideNumber || 2} of ${context.totalSlides || 5})
  `.trim()
}

export const CAROUSEL_QUOTE_SLIDE_UPDATED: PromptTemplate = {
  id: 'carousel_quote_modern',
  name: 'Quote/Stat Card (Minimalist)',
  description: 'Clean quote or statistic slide following Instagram best practices',
  useCases: ['Quote cards', 'Statistics', 'Key takeaways', 'Testimonials'],
  requiredImages: {
    min: 0,
    max: 1,
    types: ['inspiration', 'gallery']
  },
  promptStructure: (context: PromptContext) => `
**Visual Type:** Clean quote or statistic card in 4:5 Instagram carousel format

**Background Style:** ${helpers.determineQuoteBackground(context)}

${helpers.generateColorPalette(context.brandProfile)}

**Quote/Stat Layout:**

**Main Quote/Number:**
- **Position:** Centered vertically and horizontally
- **Font:** ${helpers.generateTypography(context.brandProfile)}
- **Size:** Very large (100-140pt for stats, 60-80pt for quotes)
- **Color:** ${context.brandProfile?.primaryColor || '#1A1A1A'}
- **Max width:** 80% of card width (leave 10% margins each side)
- **Alignment:** Center-aligned for quotes, left-aligned for lists

**Quote Marks (if applicable):**
- Use subtle, large opening quote mark in ${context.brandProfile?.accentColor || '#E8E8E8'}
- Position: Top-left of quote text, slightly oversized decorative element
- Size: 120pt, opacity 0.3 for subtle effect

**Attribution/Source:**
- **Position:** Below quote with 40px spacing
- **Format:** "— [Author Name]" or "— [Source]"
- **Font:** Italic, regular weight (28-36pt)
- **Color:** ${context.brandProfile?.secondaryColor || '#666666'}

**For Statistics:**
- **Large Number:** "${context.userIntent.match(/\d+/)?.[0] || '78'}%" in bold ${context.brandProfile?.primaryColor || '#1A1A1A'}
- **Position:** Upper third, slightly off-center
- **Supporting Text:** Below number explaining what it represents
- **Accent Element:** Thin horizontal line or shape in ${context.brandProfile?.accentColor || '#E8E8E8'}

${helpers.generateBrandWatermark(context.brandProfile)}

**White Space:**
- Generous margins (minimum 60px all sides)
- Let the quote/stat breathe
- Clean, uncluttered aesthetic

**Text Hierarchy:**
1. Main quote/number (largest, primary color)
2. Supporting text (medium, secondary color)
3. Attribution (smallest, accent color)

**Optional Design Elements:**
- Subtle geometric shapes in brand colors (opacity 0.1-0.2)
- Minimal line accents
- Soft gradient background (if brand appropriate)

**Avoid:**
- Busy patterns that compete with text
- Multiple font styles (max 2 font families)
- Excessive decoration
- Hard-to-read script fonts for main text

**Final Use:** Instagram carousel quote/stat slide, maintains visual consistency with other slides
  `.trim()
}

// Export all carousel templates (including updated versions)
export const CAROUSEL_TEMPLATES = {
  CAROUSEL_COVER_SLIDE,
  CAROUSEL_CONTENT_SLIDE,
  CAROUSEL_INFOGRAPHIC_SLIDE,
  // Updated modern templates
  CAROUSEL_COVER_SLIDE_UPDATED,
  CAROUSEL_CONTENT_SLIDE_UPDATED,
  CAROUSEL_QUOTE_SLIDE_UPDATED,
}























