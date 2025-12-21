/**
 * Product Mockup Prompt Templates
 * Optimized for brand partnerships and product photography
 */

import type { PromptTemplate, PromptContext } from './types'
import * as helpers from './helpers'

export const PRODUCT_LIFESTYLE_MOCKUP: PromptTemplate = {
  id: 'product_lifestyle_integration',
  name: 'Lifestyle Product Integration',
  description: 'Natural product placement in lifestyle scenes',
  useCases: ['Brand partnerships', 'Product photography', 'Sponsored content'],
  requiredImages: {
    min: 2, // User + Product
    max: 4, // User + Product + Style reference + Environment inspiration
    types: ['user_lora', 'product', 'inspiration']
  },
  promptStructure: (context: PromptContext) => `
**Character Consistency:** Person from ${helpers.identifyUserImage(context.userImages)} maintaining exact facial features, styling, and brand alignment

**Product Focus:** ${helpers.extractProductDetails(context.userImages.find(img => img.type === 'product'))}

**Product Integration Style:** ${helpers.determineProductIntegrationStyle(context)} - natural, not forced advertising

**Subject Action:** ${helpers.generateProductInteraction(context)}

**Environment:** ${helpers.generateBrandAlignedEnvironment(context)}

**Composition:** ${helpers.determineMockupComposition(context.contentType)}

**Product Visibility:** Prominently but naturally visible, ${helpers.specifyProductPlacement(context)}

**Brand Aesthetic Matching:** ${helpers.analyzeBrandStyle(context.userImages)}

**Lighting:** ${helpers.generateBrandAlignedLighting(context)}

**Color Palette:** ${helpers.extractBrandColors(context.userImages)}

**Technical:** ${helpers.determineTechnicalSpecs('product_mockup')}

**Styling Details:** ${helpers.generateProductStylingDetails(context)}

**Text Space:** ${helpers.determineTextSpace('brand_partnership')}

**Final Use:** ${context.userIntent || 'Brand partnership Instagram post, product showcase'}
  `.trim(),
  variations: [
    {
      name: 'Minimalist Product Focus',
      styleKeywords: 'Clean background, product and hands as focal points',
      style: 'Apple/Glossier aesthetic - minimal, white space, editorial'
    },
    {
      name: 'Lifestyle Context',
      styleKeywords: 'Rich environment showing product in use',
      style: 'Aspirational lifestyle - full scene with context and story'
    },
    {
      name: 'Editorial Luxury',
      styleKeywords: 'Artistic product placement, creative angles',
      style: 'High-fashion editorial - dramatic lighting, artistic vision'
    }
  ]
}

export const PRODUCT_FLAT_LAY: PromptTemplate = {
  id: 'product_flatlay_aesthetic',
  name: 'Aesthetic Flat Lay Product Photo',
  description: 'Overhead product arrangement for Instagram aesthetic',
  useCases: ['Product photography', 'Instagram feed posts', 'E-commerce'],
  requiredImages: {
    min: 1, // Product
    max: 3, // Product + Style reference + Props inspiration
    types: ['product', 'inspiration']
  },
  promptStructure: (context: PromptContext) => `
**Shot Type:** Overhead flat lay photography, perfect perpendicular angle

**Product Focus:** ${helpers.extractProductDetails(context.userImages.find(img => img.type === 'product'))}

**Surface:** ${helpers.determineSurface(context)}

**Product Arrangement:** ${helpers.generateFlatLayArrangement(context)}

**Supporting Props:** ${helpers.generateFlatLayProps(context)}

**Composition:** ${helpers.determineFlatLayComposition(context.contentType)}

**Lighting:** ${helpers.generateFlatLayLighting()}

**Color Palette:** ${helpers.extractColorPalette(context.userImages) || 'Cohesive aesthetic color scheme matching product and brand'}

**Technical:** Top-down 90-degree angle, f/8 for full sharpness, even lighting, no shadows

**Style Reference:** ${helpers.hasStyleReference(context) ? `Matching the aesthetic from ${helpers.identifyStyleReference(context.userImages)}` : 'Clean Instagram aesthetic, professional product photography'}

**Mood:** ${helpers.determineFlatLayMood(context.userIntent)}

**Final Use:** Instagram feed post, product showcase, e-commerce imagery
  `.trim()
}

export const PRODUCT_MOCKUP_ON_PERSON: PromptTemplate = {
  id: 'product_worn_shown',
  name: 'Product on Person (Jewelry/Fashion/Tech)',
  description: 'Product shown on user for fashion, accessories, tech',
  useCases: ['Fashion photography', 'Jewelry showcase', 'Tech products', 'Accessories'],
  requiredImages: {
    min: 2, // User + Product
    max: 3,
    types: ['user_lora', 'product']
  },
  promptStructure: (context: PromptContext) => `
**Character Identity:** Person from ${helpers.identifyUserImage(context.userImages)}, exact facial features and styling

**Product Showcase:** ${helpers.extractProductDetails(context.userImages.find(img => img.type === 'product'))}

**Product Placement:** ${helpers.determineWearableProductPlacement(context)}

**Subject Pose:** ${helpers.generateFashionAction(context)}

**Environment:** ${helpers.generateFashionEnvironment(context)}

**Composition:** ${helpers.determineProductOnPersonComposition(context)}

**Lighting:** ${helpers.generateFashionLighting(context)}

**Focus Strategy:** ${helpers.determineFocusStrategy('product_on_person')}

**Product Details:** Ensure product is clearly visible with accurate colors, materials, and branding

**Styling:** ${helpers.generateProductComplementaryStyling(context)}

**Technical:** ${helpers.determineTechnicalSpecs('product_showcase')}

**Final Use:** Product showcase post, brand partnership content, fashion/accessory photography
  `.trim()
}

export const PRODUCT_MOCKUP_TEMPLATES = {
  PRODUCT_LIFESTYLE_MOCKUP,
  PRODUCT_FLAT_LAY,
  PRODUCT_MOCKUP_ON_PERSON,
}























