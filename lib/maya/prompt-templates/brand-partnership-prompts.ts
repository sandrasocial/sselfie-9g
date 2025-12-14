/**
 * Brand Partnership Prompt Templates
 * Optimized for high-quality sponsored content matching brand aesthetics
 */

import type { PromptTemplate, PromptContext } from './types'
import * as helpers from './helpers'

export const SKINCARE_BRAND_PARTNERSHIP: PromptTemplate = {
  id: 'skincare_brand_content',
  name: 'Skincare Brand Partnership',
  description: 'Clean beauty aesthetic for skincare brand collaborations',
  useCases: ['Skincare partnerships', 'Beauty brand content', 'Product launches'],
  requiredImages: {
    min: 2, // User + Product
    max: 3, // + Brand style reference
    types: ['user_lora', 'product', 'inspiration']
  },
  promptStructure: (context: PromptContext) => `
**Character Consistency:** Person from ${helpers.identifyUserImage(context.userImages)}, maintaining all facial features and natural beauty

**Brand Aesthetic Alignment:** ${helpers.analyzeBrandAesthetic(context.userImages) || 'Clean beauty, minimalist luxury (Glossier/The Ordinary style)'}

**Subject Styling:** Glowing natural skin, minimal makeup showcasing skin health, hair pulled back cleanly

**Product Action:** ${helpers.generateSkincareAction(context)}

**Product Details:** ${helpers.extractProductDetails(context.userImages.find(img => img.type === 'product'))}

**Environment:** ${helpers.generateSkincareEnvironment()}

**Composition:** Vertical 4:5 for Instagram, medium close-up showing face and product clearly, text space on ${helpers.determineSide()}

**Style:** Editorial beauty photography meets accessible luxury, professional yet relatable

**Lighting:** Soft diffused north-facing window light from left, no harsh shadows, natural flattering light, slight catchlight in eyes

**Color Palette:** ${helpers.extractBrandColors(context.userImages) || 'Whites (#FFFFFF), warm beige (#F5F0E8), rose gold accents (#E8C4B8), natural skin tones'}

**Skin Rendering:** Natural skin texture visible including pores, healthy glow, realistic beauty

**Technical:** 85mm macro lens, f/2.8 for product and face sharpness with slight background blur

**Text Space:** ${helpers.determineTextSpace('brand_partnership')} clear for product name and benefit statements

**Final Use:** Instagram carousel Slide 1 - skincare partnership announcement
  `.trim(),
  variations: [
    {
      name: 'Morning Routine',
      timing: 'Fresh morning application moment',
      lightingAdjustment: 'Bright natural morning light, energized feel'
    },
    {
      name: 'Evening Ritual',
      timing: 'Relaxed nighttime skincare',
      lightingAdjustment: 'Warm golden hour, self-care moment'
    }
  ]
}

export const FASHION_BRAND_COLLABORATION: PromptTemplate = {
  id: 'fashion_brand_editorial',
  name: 'Fashion Brand Collaboration',
  description: 'Editorial street style for fashion partnerships',
  useCases: ['Fashion brand content', 'Clothing launches', 'Style partnerships'],
  requiredImages: {
    min: 1, // User (outfit will be described in prompt)
    max: 3, // + Product reference + Style inspiration
    types: ['user_lora', 'product', 'inspiration']
  },
  promptStructure: (context: PromptContext) => `
**Identity Lock:** Exact same person from ${helpers.identifyUserImage(context.userImages)}, facial features maintained precisely

**Brand Alignment:** ${helpers.analyzeFashionBrand(context) || 'Contemporary luxury streetwear (Everlane/COS aesthetic)'}

**Outfit Focus:** ${helpers.generateFashionOutfit(context)}

**Outfit Details:** ${helpers.extractProductDetails(context.userImages.find(img => img.type === 'product')) || 'Brand\'s signature pieces with visible quality and styling'}

**Action:** ${helpers.generateFashionAction(context)}

**Environment:** ${helpers.generateFashionEnvironment(context)}

**Composition:** ${helpers.determineFashionComposition(context.contentType)}

**Style:** Editorial street style photography, European fashion week aesthetic, professional yet accessible

**Lighting:** ${helpers.generateFashionLighting(context)}

**Color Palette:** ${helpers.extractBrandColors(context.userImages) || 'Sophisticated neutral tones, minimal color for editorial feel'}

**Movement:** ${helpers.shouldAddMovement(context) ? 'Natural motion captured - coat flowing, hair movement, mid-stride energy' : 'Still moment with strong pose'}

**Styling Details:** ${helpers.generateFashionStylingDetails(context)}

**Technical:** ${helpers.determineTechnicalSpecs('fashion_editorial')}

**Final Use:** ${context.userIntent || 'Brand partnership Reel or Instagram post, New Collection announcement'}
  `.trim()
}

export const TECH_PRODUCT_INTEGRATION: PromptTemplate = {
  id: 'tech_lifestyle_integration',
  name: 'Tech Product Lifestyle Integration',
  description: 'Premium tech product in authentic lifestyle setting',
  useCases: ['Tech partnerships', 'Gadget reviews', 'Lifestyle tech content'],
  requiredImages: {
    min: 2, // User + Product
    max: 4,
    types: ['user_lora', 'product', 'inspiration']
  },
  promptStructure: (context: PromptContext) => `
**Character Identity:** Person from ${helpers.identifyUserImage(context.userImages)} maintaining exact features and professional styling

**Product Focus:** ${helpers.extractProductDetails(context.userImages.find(img => img.type === 'product'))}

**Tech Integration Style:** Natural productivity lifestyle, premium but achievable aesthetic

**Subject Action:** ${helpers.generateTechProductAction(context)}

**Product Visibility:** ${helpers.specifyTechProductPlacement(context)}

**Environment:** ${helpers.generateTechEnvironment()}

**Composition:** ${helpers.determineTechComposition(context.contentType)}

**Multiple Light Sources:** ${helpers.generateTechLighting()}

**Color Palette:** ${helpers.extractBrandColors(context.userImages) || 'Tech premium: whites, grays, chrome accents, wood tones, natural green from plants'}

**Technical:** ${helpers.determineTechnicalSpecs('tech_lifestyle')}

**Workspace Styling:** ${helpers.generateWorkspaceStyling(context)}

**Product Integration:** Product naturally integrated into productive lifestyle, not forced showcase

**Mood:** Productive professional, aspirational yet realistic, premium lifestyle

**Final Use:** Tech brand partnership blog header, LinkedIn featured post, Instagram collaboration
  `.trim()
}

export const BRAND_PARTNERSHIP_TEMPLATES = {
  SKINCARE_BRAND_PARTNERSHIP,
  FASHION_BRAND_COLLABORATION,
  TECH_PRODUCT_INTEGRATION,
}
