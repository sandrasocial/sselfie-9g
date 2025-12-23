/**
 * UGC (User-Generated Content) Prompt Templates
 * Optimized for authentic, relatable Instagram content
 */

import type { PromptTemplate, PromptContext } from './types'
import * as helpers from './helpers'

export const UGC_MORNING_ROUTINE: PromptTemplate = {
  id: 'ugc_morning_authentic',
  name: 'Authentic Morning Routine UGC',
  description: 'Relatable morning content with iPhone selfie aesthetic',
  useCases: ['Morning routine content', 'Day-in-the-life posts', 'Relatable moments'],
  requiredImages: {
    min: 1,
    max: 1,
    types: ['user_lora']
  },
  promptStructure: (context: PromptContext) => `
**Character Identity:** Person from Image 1, maintaining exact facial features and natural appearance

**UGC Authenticity Style:** iPhone selfie aesthetic, amateur quality with natural imperfections

**Scene Type:** ${helpers.determineUGCSceneType(context.contentType)}

**Action:** ${helpers.generateAuthenticAction(context.userIntent)}

**Outfit:** Comfortable ${helpers.determineComfortableOutfit(context)} - realistic morning attire

**Environment:** Real bathroom mirror with visible edges, ${helpers.addAuthenticEnvironmentDetails('bathroom')}

**Composition:** Vertical 9:16 selfie perspective, phone visible in mirror, slightly off-center casual framing

**Lighting:** ${helpers.generateUGCLighting('bathroom_morning')}

**Camera Quality:** iPhone 14 Pro natural camera processing, slight noise in shadows, realistic dynamic range, natural color temperature

**Authenticity Markers:** ${helpers.generateAuthenticityDetails()}

**Imperfections (Critical for UGC):** Visible phone case, finger partially covering camera, slight motion blur, natural messy elements, real-life clutter

**Mood:** ${helpers.determineMood(context.userIntent)}

**Final Use:** Instagram Reel cover or Story, "morning routine" authentic content
  `.trim(),
  variations: [
    {
      name: 'Fresh & Energized',
      moodAdjustment: 'Bright and positive, ready for the day energy',
      lightingAdjustment: 'Natural window light, slightly overexposed for fresh feel'
    },
    {
      name: 'Cozy & Relatable',
      moodAdjustment: 'Comfortable and real, just waking up vibe',
      lightingAdjustment: 'Soft bathroom light, natural shadows, warm tones'
    }
  ]
}

export const UGC_COFFEE_SHOP_WORK: PromptTemplate = {
  id: 'ugc_productive_moment',
  name: 'Coffee Shop Work Session',
  description: 'Productive entrepreneur content with authentic cafe aesthetic',
  useCases: ['Productivity content', 'Work-life posts', 'Day in the life'],
  requiredImages: {
    min: 1,
    max: 2,
    types: ['user_lora', 'inspiration']
  },
  promptStructure: (context: PromptContext) => `
**Character Identity:** Exact same person from Image 1 (LoRA), maintaining facial features and styling

**UGC Style:** Elevated authentic content, "productive day" aesthetic, candid influencer moment

**Action:** ${helpers.generateProductiveAction(context.userIntent)}

**Outfit:** Casual elevated - ${helpers.determineOutfit('coffee_shop_casual', context)}

**Environment:** Busy coffee shop, ${helpers.generateCafeEnvironmentDetails()}

**Composition:** 4:5 Instagram format, shot from ${helpers.determineCameraAngle('cafe_work')}, showing both subject and productive workspace

**Lighting:** Natural window light from ${helpers.generateLightDirection()}, cafe ambiance with warm interior lights, golden hour quality through windows

**Camera Quality:** High-quality smartphone photo with natural imperfections - slight noise, authentic color grading, not over-processed

**Realism Details:** ${helpers.generateRealismMarkers('cafe_workspace')}

**Product Integration:** ${helpers.shouldIntegrateProduct(context) ? helpers.generateProductIntegration(context.userImages) : 'Natural workspace items only'}

**Mood:** Productive, focused, aspirational yet relatable

**Final Use:** "Day in the life" Instagram post, relatable entrepreneur content
  `.trim()
}

export const UGC_PRODUCT_UNBOXING: PromptTemplate = {
  id: 'ugc_unboxing_authentic',
  name: 'Product Unboxing Moment',
  description: 'First-person authentic unboxing for affiliate/brand content',
  useCases: ['Product reviews', 'Unboxing content', 'Affiliate marketing'],
  requiredImages: {
    min: 1, // Product photo
    max: 2, // Product + user reference
    types: ['product', 'user_lora']
  },
  promptStructure: (context: PromptContext) => `
**Scene Type:** First-person POV authentic unboxing moment

**Character:** ${helpers.hasUserImage(context) ? 'Hands and partial torso visible (maintaining skin tone from reference LoRA)' : 'Hands visible in natural skin tone'}

**Product Focus:** ${helpers.extractProductDetails(context.userImages.find(img => img.type === 'product'))}

**Product Positioning:** Held naturally in hands, being examined with genuine curiosity

**Environment:** Natural home setting - ${helpers.generateUnboxingEnvironment()}

**Composition:** Overhead shot (9:16 vertical), hands holding product in center, natural casual positioning not perfectly staged

**Lighting:** Soft natural window light creating gentle shadows, golden hour warmth, slight overexposure typical of authentic UGC content

**Camera Quality:** iPhone camera realism - natural colors, slight vignetting, authentic depth of field, phone shadow might be visible

**Authentic Details:** ${helpers.generateUnboxingDetails()}

**Hands Styling:** ${helpers.determineHandsStyling(context)}

**Mood:** Genuine excitement and curiosity, discovery moment, not overly staged or commercial

**Final Use:** Instagram Reel "unboxing" content, affiliate marketing post, product review
  `.trim(),
  variations: [
    {
      name: 'Luxury Unboxing',
      environmentFocus: 'Clean white bedding, organized aesthetic, premium presentation',
      moodAdjustment: 'Elevated excitement, appreciating quality'
    },
    {
      name: 'Casual Real',
      environmentFocus: 'Couch/bed with visible everyday items, natural mess',
      moodAdjustment: 'Spontaneous genuine reaction, relatable moment'
    }
  ]
}

export const UGC_TEMPLATES = {
  UGC_MORNING_ROUTINE,
  UGC_COFFEE_SHOP_WORK,
  UGC_PRODUCT_UNBOXING,
}



























