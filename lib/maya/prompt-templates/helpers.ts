/**
 * Helper functions for prompt template generation
 */

import type { PromptContext, ImageReference } from './types'

// Character & Identity
export function analyzeUserFromImage(image: ImageReference): string {
  return 'Person from reference image, maintaining exact facial features and natural appearance'
}

export function identifyUserImage(images: ImageReference[]): string {
  const userImage = images.find(img => img.type === 'user_lora')
  return userImage ? `Image ${images.indexOf(userImage) + 1} (LoRA reference)` : 'reference image'
}

export function hasUserImage(context: PromptContext): boolean {
  return context.userImages.some(img => img.type === 'user_lora')
}

// Actions & Poses
export function determineEngagingPose(contentType: string): string {
  const poses: Record<string, string> = {
    'educational': 'Confident, approachable pose with engaging expression',
    'lifestyle': 'Natural, relaxed pose showing authentic personality',
    'product': 'Product-focused pose highlighting item naturally',
    'brand': 'Professional, aspirational pose matching brand aesthetic',
  }
  return poses[contentType] || 'Natural, engaging pose with confident expression'
}

export function generateNaturalAction(contentType: string, slideType: string): string {
  if (slideType === 'content_slide') {
    return 'Natural action relevant to content - reading, working, or engaging with topic'
  }
  return determineEngagingPose(contentType)
}

export function generateProductiveAction(intent: string): string {
  return 'Focused work moment - typing, reading, or engaging with productive task'
}

export function generateAuthenticAction(intent: string): string {
  return 'Natural morning routine action - applying product, drinking coffee, or preparing for day'
}

export function generateProductInteraction(context: PromptContext): string {
  return 'Naturally interacting with product - holding, using, or showcasing in authentic moment'
}

export function generateSkincareAction(context: PromptContext): string {
  return 'Applying skincare product with gentle, natural motion - hands visible, product in use'
}

export function generateFashionAction(context: PromptContext): string {
  return 'Confident pose showcasing outfit - natural stance, outfit clearly visible'
}

export function generateTechProductAction(context: PromptContext): string {
  return 'Using tech product naturally - typing, viewing screen, or engaging with device'
}

export function generateTutorialAction(context: PromptContext): string {
  return 'Mid-action tutorial moment - hands visible performing technique or process'
}

export function generateVlogAction(context: PromptContext): string {
  return 'Candid productive moment - working, creating, or engaging in daily activity'
}

// Environments
export function generateEnvironmentForCarousel(intent: string): string {
  const environments: Record<string, string> = {
    'freedom': 'Urban setting with travel elements, modern workspace, or aspirational lifestyle space',
    'business': 'Professional workspace, modern office, or productive home office',
    'lifestyle': 'Beautiful home interior, coffee shop, or inspiring personal space',
  }
  return environments[intent.toLowerCase()] || 'Modern, clean environment matching content theme'
}

export function varyEnvironmentWhileMaintainingConsistency(context: PromptContext): string {
  return 'Similar aesthetic environment with slight variation - maintains color palette and style from cover slide'
}

export function generateCafeEnvironmentDetails(): string {
  return 'Coffee shop interior with visible tables, other patrons in background (blurred), warm cafe ambiance'
}

export function generateSkincareEnvironment(): string {
  return 'Clean bathroom with natural light, minimal clutter, fresh aesthetic, white/neutral tones'
}

export function generateFashionEnvironment(context: PromptContext): string {
  return 'Urban street setting, modern architecture background, or minimalist interior matching brand aesthetic'
}

export function generateTechEnvironment(): string {
  return 'Modern workspace with laptop, plants, natural light, organized desk, premium home office aesthetic'
}

export function generateUnboxingEnvironment(): string {
  return 'Natural home setting - bed or couch with soft textures, warm lighting, everyday authenticity'
}

export function generateEducationalEnvironment(): string {
  return 'Clean workspace or inspiring environment that suggests learning and growth'
}

export function generateTutorialEnvironment(context: PromptContext): string {
  return 'Clean, well-lit workspace with tutorial materials clearly visible, organized setup'
}

export function generateVlogEnvironment(context: PromptContext): string {
  return 'Productive home workspace, coffee shop, or inspiring personal space showing daily life'
}

export function generateBrandAlignedEnvironment(context: PromptContext): string {
  return 'Environment matching brand aesthetic - clean, modern, aspirational yet accessible'
}

// Shot Types & Composition
export function determineShotType(contentType: string): string {
  const shots: Record<string, string> = {
    'carousel': 'medium',
    'reel': 'close-up',
    'story': 'medium close-up',
    'post': 'medium',
  }
  return shots[contentType] || 'medium'
}

export function adjustShotTypeForVariety(baseType: string): string {
  return `${baseType} shot with slight angle variation for visual interest`
}

export function determineMockupComposition(contentType: string): string {
  return '4:5 vertical Instagram format, subject and product both clearly visible, balanced composition'
}

export function determineFlatLayComposition(contentType: string): string {
  return '1:1 square format, overhead 90-degree angle, balanced product arrangement with supporting props'
}

export function determineFashionComposition(contentType: string): string {
  return '4:5 vertical format, full or 3/4 body shot showing outfit clearly, editorial framing'
}

export function determineTechComposition(contentType: string): string {
  return '4:5 vertical format, subject and product both in frame, natural lifestyle composition'
}

export function determineProductOnPersonComposition(context: PromptContext): string {
  return '4:5 vertical format, focus on product placement area, subject clearly visible'
}

export function determineTutorialFraming(context: PromptContext): string {
  return 'Hands and process clearly visible, subject in frame, educational clarity prioritized'
}

export function determineTutorialAngle(context: PromptContext): string {
  return 'Slight overhead angle or eye-level, ensuring tutorial process is clearly visible'
}

export function determineSubjectPosition(context: PromptContext): string {
  return 'rule of thirds, upper third for face, lower two-thirds for body/environment'
}

export function calculateFocusPoint(context: PromptContext): string {
  return 'eyes and expression in sharp focus'
}

export function determineShotRange(type: string): string {
  return 'shoulders up to full body depending on content needs'
}

// Lighting
export function generateLightingSetup(quality: string, contentType: string): string {
  if (quality === 'professional') {
    return 'Soft diffused natural window light from left, golden hour warmth, professional quality'
  }
  return 'Natural daylight, slightly imperfect, authentic feel'
}

export function generateUGCLighting(type: string): string {
  return 'Natural bathroom lighting with slight overexposure, authentic phone camera quality, warm tones'
}

export function generateReelLighting(style: string): string {
  return 'Bright natural window light, even exposure, professional yet approachable'
}

export function generateFashionLighting(context: PromptContext): string {
  return 'Natural daylight with soft shadows, golden hour quality, editorial fashion photography'
}

export function generateFlatLayLighting(): string {
  return 'Even overhead lighting, no harsh shadows, soft diffused light, professional product photography'
}

export function generateTechLighting(): string {
  return 'Multiple light sources - natural window light, warm desk lamp, balanced exposure'
}

export function generateTutorialLighting(): string {
  return 'Bright even lighting ensuring all tutorial details are clearly visible, no harsh shadows'
}

export function generateVlogLighting(): string {
  return 'Natural window light with warm interior lights, golden hour quality, inviting atmosphere'
}

export function generateLightDirection(): string {
  return 'left side'
}

export function generateLighting(type: string): string {
  const lighting: Record<string, string> = {
    'before_state': 'Flat, unflattering light, muted tones',
    'after_state': 'Flattering natural light, warm tones, enhanced appearance',
  }
  return lighting[type] || 'Natural flattering light'
}

export function generateBrandAlignedLighting(context: PromptContext): string {
  return 'Soft diffused natural light matching brand aesthetic - clean, professional, aspirational'
}

// Color Palettes
export function extractColorPalette(images: ImageReference[]): string {
  if (images.length === 0) {
    return 'Soft beige background (#F5F1E8), dark navy text (#1A2332), gold accent (#C9A96E)'
  }
  return 'Color palette extracted from reference images - maintaining brand consistency'
}

export function extractBrandColors(images: ImageReference[]): string {
  return extractColorPalette(images)
}

// Text Placement
export function determineTextPlacement(slideType: string): string {
  const placements: Record<string, string> = {
    'content_slide': 'Upper third or side margin reserved for text overlay',
    'cover_slide': 'Top 30% reserved for bold headline overlay',
  }
  return placements[slideType] || 'Strategic text placement with breathing room'
}

export function determineTextSpace(type: string): string {
  const spaces: Record<string, string> = {
    'brand_partnership': 'Left or right side clear for product name and benefit statements',
    'tutorial': 'Top 25% clear for tutorial title and step indicator',
  }
  return spaces[type] || 'Strategic area reserved for text overlay'
}

export function determineSide(): string {
  return 'left side'
}

// Styling & Aesthetics
export function determineVisualStyle(images: ImageReference[], contentType: string, brandProfile?: BrandProfile): string {
  const baseStyles: Record<string, string> = {
    'luxury': 'High-end editorial photography, sophisticated, aspirational, Vogue aesthetic',
    'minimalist': 'Clean, simple, lots of white space, Scandinavian influence, Instagram-native look',
    'bold': 'High contrast, vibrant, attention-grabbing, modern dynamic energy',
    'organic': 'Natural, warm, approachable, earthy tones, authentic feel',
    'corporate': 'Professional, polished, trustworthy, LinkedIn-appropriate aesthetic'
  }
  
  return baseStyles[brandProfile?.aestheticStyle || 'minimalist']
}

/**
 * Generates color palette from user's brand profile or intelligent defaults
 */
export function generateColorPalette(brandProfile?: BrandProfile): string {
  if (brandProfile?.primaryColor) {
    return `
**Primary Color:** ${brandProfile.primaryColor} (main text/elements)
**Secondary Color:** ${brandProfile.secondaryColor || '#FFFFFF'} (backgrounds/accents)
**Accent Color:** ${brandProfile.accentColor || brandProfile.primaryColor} (highlights/emphasis)
**Background:** ${brandProfile.backgroundColor || '#FFFFFF'}
    `.trim()
  }
  
  // Intelligent defaults - modern minimalistic
  return `
**Primary Color:** #1A1A1A (rich black for text)
**Secondary Color:** #FFFFFF (clean white backgrounds)
**Accent Color:** #E8E8E8 (subtle gray for depth)
**Background:** #FAFAFA (off-white to reduce eye strain)
  `.trim()
}

/**
 * Generates typography style based on brand profile
 */
export function generateTypography(brandProfile?: BrandProfile): string {
  const fontMap: Record<string, string> = {
    'modern': 'Clean sans-serif (Inter/Satoshi style), medium-bold weight for headlines, regular for body',
    'elegant': 'Sophisticated serif for headlines (Playfair Display style), sans-serif for body',
    'bold': 'Bold geometric sans-serif (Montserrat/Poppins style), high contrast weights',
    'minimal': 'Ultra-clean sans-serif (Helvetica Neue style), consistent weights, lots of white space'
  }
  
  return fontMap[brandProfile?.fontStyle || 'modern']
}

/**
 * Generates brand watermark text
 */
export function generateBrandWatermark(brandProfile?: BrandProfile): string {
  if (brandProfile?.brandName || brandProfile?.tagline) {
    return `
**Top Left Corner:** Small text "${brandProfile.tagline || brandProfile.brandName}" in subtle ${brandProfile.secondaryColor || '#808080'}
    `.trim()
  }
  
  return `
**Top Left Corner:** Small text "creators of the future" or similar brand tagline in subtle gray (#808080)
  `.trim()
}

/**
 * Determines appropriate background for quote cards
 */
export function determineQuoteBackground(context: PromptContext): string {
  if (context.brandProfile?.aestheticStyle === 'luxury') {
    return `Solid ${context.brandProfile.backgroundColor || '#FAFAFA'} with subtle texture or soft gradient`
  } else if (context.brandProfile?.aestheticStyle === 'bold') {
    return `High contrast solid color ${context.brandProfile.primaryColor || '#1A1A1A'} with white text`
  } else if (context.brandProfile?.aestheticStyle === 'organic') {
    return `Soft neutral gradient or natural texture (linen, paper, concrete) in ${context.brandProfile.backgroundColor || '#F5F1E8'}`
  }
  
  // Default minimalist
  return `Clean solid ${context.brandProfile?.backgroundColor || '#FFFFFF'} or subtle off-white (#FAFAFA)`
}

export function analyzeBrandAesthetic(images: ImageReference[]): string | null {
  // Would analyze images to determine brand style
  return null
}

export function analyzeBrandStyle(images: ImageReference[]): string {
  return 'Clean, modern, aspirational brand aesthetic matching reference images'
}

export function analyzeFashionBrand(context: PromptContext): string | null {
  return null
}

export function extractStyleFromReference(images: ImageReference[]): string | null {
  return images.length > 0 ? 'Style matching reference image aesthetic' : null
}

export function hasStyleReference(context: PromptContext): boolean {
  return context.userImages.some(img => img.type === 'inspiration')
}

export function identifyStyleReference(images: ImageReference[]): string {
  const styleRef = images.find(img => img.type === 'inspiration')
  return styleRef ? 'style reference image' : 'brand aesthetic'
}

// Product Details
export function extractProductDetails(image: ImageReference | undefined): string {
  if (!image) return 'Product clearly visible with accurate colors and branding'
  return `Product from ${image.type} image - accurate colors, materials, and branding visible`
}

export function specifyProductPlacement(context: PromptContext): string {
  return 'Product naturally integrated, not forced or overly staged'
}

export function specifyTechProductPlacement(context: PromptContext): string {
  return 'Tech product prominently but naturally visible, integrated into productive scene'
}

export function determineWearableProductPlacement(context: PromptContext): string {
  return 'Product worn/displayed naturally, clearly visible, accurate representation'
}

export function determineProductIntegrationStyle(context: PromptContext): string {
  return 'Natural lifestyle integration - product feels organic to scene, not advertising'
}

// Outfits
export function determineOutfit(type: string, context: PromptContext): string {
  const outfits: Record<string, string> = {
    'educational_content': 'Professional casual - blazer or cardigan, comfortable yet polished',
    'coffee_shop_casual': 'Casual elevated - comfortable sweater or button-down, relaxed fit',
    'lifestyle_vlog': 'Comfortable everyday wear - athleisure or casual chic',
  }
  return outfits[type] || 'Stylish, comfortable outfit matching content theme'
}

export function determineComfortableOutfit(context: PromptContext): string {
  return 'Comfortable loungewear or casual morning attire'
}

export function generateFashionOutfit(context: PromptContext): string {
  return 'Contemporary luxury streetwear - quality pieces, minimalist styling, brand-aligned aesthetic'
}

export function generateProductComplementaryStyling(context: PromptContext): string {
  return 'Styling that complements product without competing - neutral tones, clean aesthetic'
}

// Expressions & Gestures
export function generateEducationalExpression(context: PromptContext): string {
  return 'Engaging, approachable expression - "I have something valuable to share" energy'
}

export function generateReelExpression(type: string): string {
  const expressions: Record<string, string> = {
    'educational': 'Excited, engaging expression promising valuable content',
    'lifestyle': 'Confident, aspirational yet relatable expression',
  }
  return expressions[type] || 'Engaging, confident expression'
}

export function generateExpression(type: string): string {
  const expressions: Record<string, string> = {
    'before': 'Neutral or less confident expression',
    'after': 'Confident, glowing expression showing transformation',
  }
  return expressions[type] || 'Natural, engaging expression'
}

export function generateCandidMoment(context: PromptContext): string {
  return 'Candid productive moment - natural expression, authentic energy, not overly posed'
}

export function generateMotionIndicator(context: PromptContext): string {
  return 'Slight motion blur or dynamic pose suggesting video content'
}

// Technical Specs
export function determineTechnicalSpecs(type: string): string {
  const specs: Record<string, string> = {
    'product_mockup': '85mm lens, f/2.8 for product and subject sharpness, 2K resolution',
    'product_showcase': '85mm lens, f/2.0 for shallow depth of field, 2K resolution',
    'tech_lifestyle': '50mm lens, f/2.2 for balanced depth, natural smartphone quality',
    'fashion_editorial': '85mm lens, f/2.0 for editorial quality, 2K resolution',
    'tutorial': '50mm lens, f/4.0 for clarity, even lighting, 2K resolution',
  }
  return specs[type] || '85mm lens, f/2.0, 2K resolution, professional quality'
}

export function determineFocusStrategy(type: string): string {
  return 'Product and subject both in sharp focus, background softly blurred'
}

// Content Variations
export function determineContentSlideVariation(contentType: string): string {
  return 'varied pose or setting while maintaining visual consistency'
}

export function specifyWhatChanges(context: PromptContext): string {
  return 'Pose and environment vary, but character, color palette, and style remain consistent'
}

export function determineInfographicLayout(intent: string): string {
  return 'Vertical layout optimized for Instagram carousel, clear visual hierarchy'
}

export function generateInfographicLayout(contentType: string): string {
  return 'Clean grid layout with icons, data points, and clear sections'
}

export function determineGraphicStyle(contentType: string): string {
  return 'Minimalist icons, clean lines, professional data visualization style'
}

export function shouldUseGoogleSearch(intent: string): boolean {
  return intent.toLowerCase().includes('current') || intent.toLowerCase().includes('2025')
}

// UGC Specific
export function determineUGCSceneType(contentType: string): string {
  return 'Authentic morning routine moment - bathroom, kitchen, or bedroom setting'
}

export function addAuthenticEnvironmentDetails(type: string): string {
  return 'Visible everyday items, natural clutter, real-life authenticity'
}

export function generateAuthenticityDetails(): string {
  return 'Visible phone case, slight motion blur, natural imperfections, real-life elements'
}

export function generateRealismMarkers(type: string): string {
  return 'Natural imperfections, authentic details, not overly staged or perfect'
}

export function generateUnboxingDetails(): string {
  return 'Product box visible, packaging elements, natural unboxing moment, genuine curiosity'
}

export function determineHandsStyling(context: PromptContext): string {
  return 'Natural hands in authentic skin tone, realistic positioning, not overly manicured'
}

export function determineHandsVisibility(context: PromptContext): string {
  return 'Hands clearly visible performing action, natural positioning'
}

// Flat Lay
export function determineSurface(context: PromptContext): string {
  return 'Clean white or neutral surface - marble, wood, or fabric matching aesthetic'
}

export function generateFlatLayArrangement(context: PromptContext): string {
  return 'Product as focal point, supporting props arranged aesthetically, balanced composition'
}

export function generateFlatLayProps(context: PromptContext): string {
  return 'Minimal supporting props - plants, books, or aesthetic items matching brand'
}

export function determineFlatLayMood(intent: string): string {
  return 'Clean, aspirational, Instagram-worthy aesthetic'
}

// Tutorial
export function determineTutorialType(context: PromptContext): string {
  return 'Step-by-step process tutorial with clear visual demonstration'
}

export function hasProduct(context: PromptContext): boolean {
  return context.userImages.some(img => img.type === 'product')
}

export function generateClarityFocus(context: PromptContext): string {
  return 'Process and hands in sharp focus, all tutorial details clearly visible'
}

// Transformation
export function generateBeforeState(context: PromptContext): string {
  return 'Less styled, natural state, minimal enhancement'
}

export function generateAfterState(context: PromptContext): string {
  return 'Styled, enhanced, polished appearance showing transformation'
}

export function determineSplitOrientation(context: PromptContext): string {
  return 'vertical split (left/right) or horizontal split (top/bottom)'
}

export function shouldMaintainEnvironment(context: PromptContext): boolean {
  return true
}

// Mood & Atmosphere
export function determineMood(intent: string): string {
  return 'Fresh, energized, ready for the day'
}

// Product Integration
export function shouldIntegrateProduct(context: PromptContext): boolean {
  return context.userImages.some(img => img.type === 'product')
}

export function generateProductIntegration(images: ImageReference[]): string {
  const product = images.find(img => img.type === 'product')
  return product ? `Product naturally integrated: ${extractProductDetails(product)}` : 'Natural workspace items'
}

export function generateProductStylingDetails(context: PromptContext): string {
  return 'Product styled to match brand aesthetic, natural placement, not forced'
}

export function generateWorkspaceStyling(context: PromptContext): string {
  return 'Organized, aspirational workspace - plants, quality items, productive aesthetic'
}

export function generateFashionStylingDetails(context: PromptContext): string {
  return 'Outfit styled with attention to detail, accessories complementing, brand-aligned'
}

// Camera Angles
export function determineCameraAngle(type: string): string {
  const angles: Record<string, string> = {
    'cafe_work': 'slight overhead or eye-level showing workspace',
    'tutorial': 'slight overhead ensuring process visibility',
  }
  return angles[type] || 'natural eye-level or slight angle variation'
}

export function shouldAddMovement(context: PromptContext): boolean {
  return context.contentType.includes('dynamic') || context.contentType.includes('action')
}

export function generateVlogAuthenticityMarkers(): string {
  return 'Natural workspace details, authentic moments, not overly staged'
}


