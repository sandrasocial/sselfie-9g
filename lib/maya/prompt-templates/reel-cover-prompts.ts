/**
 * Instagram Reel Cover Prompt Templates
 * Optimized for stopping scroll and high engagement
 */

import type { PromptTemplate, PromptContext } from './types'
import * as helpers from './helpers'

export const EDUCATIONAL_REEL_COVER: PromptTemplate = {
  id: 'reel_educational_engaging',
  name: 'Educational Content Reel Cover',
  description: 'Engaging expression with text space for tips/how-tos',
  useCases: ['Educational Reels', 'Tutorial covers', 'How-to content'],
  requiredImages: {
    min: 1,
    max: 1,
    types: ['user_lora']
  },
  promptStructure: (context: PromptContext) => `
**Character Identity:** Person from Image 1 (LoRA), exact facial features and styling maintained

**Content Type Signal:** Instagram Reel cover for ${context.contentType || 'educational productivity content'}

**Expression & Gesture:** ${helpers.generateEducationalExpression(context)}

**Outfit:** Professional casual - ${helpers.determineOutfit('educational_content', context)}

**Environment:** ${helpers.generateEducationalEnvironment()}

**Composition:** Vertical 9:16 format for Reels, ${helpers.determineShotType('reel')}, subject positioned ${helpers.determineSubjectPosition(context)}

**Focal Strategy:** Face and gesture in sharp focus (${helpers.calculateFocusPoint(context)}), background softly blurred for emphasis

**Engaging Expression:** ${helpers.generateReelExpression('educational')}

**Lighting:** ${helpers.generateReelLighting('professional')}

**Color Palette:** ${helpers.extractColorPalette(context.userImages) || 'Professional yet approachable - navy, white, warm neutral background'}

**Technical:** 85mm lens, f/1.8 for dramatic shallow depth of field isolating subject, 4K vertical resolution, sharp focus on eyes

**Text Space:** Top 25% reserved clear for bold headline text overlay (e.g., "5 PRODUCTIVITY HACKS")

**Motion Indicator:** ${helpers.generateMotionIndicator(context)} - suggests video content worth watching

**Psychological Hook:** Direct eye contact, engaging expression that promises valuable content

**Final Use:** Instagram Reel cover for educational content series
  `.trim(),
  variations: [
    {
      name: 'Excited Tip Share',
      expression: 'Enthusiastic "I have something great to share" energy, slightly surprised excitement',
      gesture: 'Pointing upward or toward text area'
    },
    {
      name: 'Knowing Confidence',
      expression: 'Confident knowing smile, "I\'ve got this figured out" vibe',
      gesture: 'Arms crossed or hands clasped, grounded pose'
    }
  ]
}

export const TRANSFORMATION_REEL_COVER: PromptTemplate = {
  id: 'reel_transformation_split',
  name: 'Transformation/Before-After Reel Cover',
  description: 'Split-screen or side-by-side transformation visual',
  useCases: ['Transformation content', 'Before/after Reels', 'Glow-up content'],
  requiredImages: {
    min: 1,
    max: 2, // Can use different states or same person
    types: ['user_lora', 'gallery']
  },
  promptStructure: (context: PromptContext) => `
**Concept:** Visual transformation moment using same person in contrasting states

**Character Identity:** Same exact person from ${helpers.identifyUserImage(context.userImages)} in both "before" and "after" states

**BEFORE State (Left/Top):**
- Styling: ${helpers.generateBeforeState(context)}
- Expression: ${helpers.generateExpression('before')}
- Lighting: ${helpers.generateLighting('before_state')}
- Color grading: Muted, flatter tones

**AFTER State (Right/Bottom):**
- Styling: ${helpers.generateAfterState(context)}
- Expression: ${helpers.generateExpression('after')}
- Lighting: ${helpers.generateLighting('after_state')}
- Color grading: Vibrant, warm, enhanced

**Composition:** Vertical 9:16 split ${helpers.determineSplitOrientation(context)}, subtle transition line, both sides show same person from shoulders up

**Visual Contrast:** Clear difference in styling/lighting suggests transformation and valuable content

**Environment:** ${helpers.shouldMaintainEnvironment(context) ? 'Same location with different lighting/time suggests transformation' : 'Contrasting environments support transformation narrative'}

**Technical:** 85mm lens, f/2.8 to keep both sides sharp, 4K resolution, precise matching of framing

**Text Space:** Top 20% reserved for transformation headline (e.g., "MORNING TO NIGHT ROUTINE", "GLOW UP TRANSFORMATION")

**Psychological Appeal:** Clear visual payoff suggesting valuable transformation content worth watching

**Final Use:** Instagram Reel cover for transformation/tutorial content
  `.trim()
}

export const LIFESTYLE_VLOG_REEL_COVER: PromptTemplate = {
  id: 'reel_day_in_life',
  name: 'Day-in-the-Life Reel Cover',
  description: 'Candid productive moment for lifestyle vlog content',
  useCases: ['Day in the life', 'Vlog content', 'Lifestyle Reels'],
  requiredImages: {
    min: 1,
    max: 2,
    types: ['user_lora', 'inspiration']
  },
  promptStructure: (context: PromptContext) => `
**Character Identity:** Person from ${helpers.identifyUserImage(context.userImages)}, maintaining exact identity

**Scene Capture:** Candid productive moment that encapsulates "busy successful day" narrative

**Subject Action:** ${helpers.generateVlogAction(context)}

**Outfit:** ${helpers.determineOutfit('lifestyle_vlog', context)}

**Environment:** ${helpers.generateVlogEnvironment(context)}

**Composition:** 9:16 vertical format, subject fills 60% of frame from ${helpers.determineShotRange('vlog')}, rule of thirds with eyes in upper third

**Candid Energy:** ${helpers.generateCandidMoment(context)}

**Lighting:** ${helpers.generateVlogLighting()}

**Color Grading:** Warm, slightly desaturated for editorial vlog aesthetic, inviting and aspirational

**Authentic Details:** ${helpers.generateVlogAuthenticityMarkers()}

**Technical:** 50mm lens, f/2.2 for balanced depth of field, natural grain for authenticity, smartphone-quality realism

**Text Space:** Bottom 25% clear for "DAY IN THE LIFE" or similar text overlay

**Mood:** Relatable aspiration - "this could be you" energy, productive yet accessible

**Psychological Hook:** Shows valuable lifestyle content, suggests productivity tips or inspiration

**Final Use:** Instagram Reel cover for lifestyle/vlog content
  `.trim()
}

export const TUTORIAL_HOWTO_REEL_COVER: PromptTemplate = {
  id: 'reel_tutorial_action',
  name: 'Tutorial/How-To Reel Cover',
  description: 'Mid-action tutorial moment for how-to content',
  useCases: ['Tutorial Reels', 'How-to content', 'Step-by-step guides'],
  requiredImages: {
    min: 1,
    max: 3, // User + Product + Process reference
    types: ['user_lora', 'product', 'inspiration']
  },
  promptStructure: (context: PromptContext) => `
**Character Identity:** Person from ${helpers.identifyUserImage(context.userImages)} maintaining exact features

**Tutorial Type:** ${helpers.determineTutorialType(context)}

**Action Captured:** ${helpers.generateTutorialAction(context)}

**Hands Visibility:** ${helpers.determineHandsVisibility(context)}

**Product/Tool:** ${helpers.hasProduct(context) ? helpers.extractProductDetails(context.userImages.find(img => img.type === 'product')) : 'Tutorial implements or materials clearly visible'}

**Environment:** ${helpers.generateTutorialEnvironment(context)}

**Composition:** 9:16 vertical, ${helpers.determineTutorialFraming(context)}

**Angle:** ${helpers.determineTutorialAngle(context)}

**Lighting:** ${helpers.generateTutorialLighting()}

**Color Palette:** ${helpers.extractColorPalette(context.userImages) || 'Clean, minimal, product/process clearly visible'}

**Technical:** ${helpers.determineTechnicalSpecs('tutorial')}

**Clarity Focus:** ${helpers.generateClarityFocus(context)}

**Text Space:** ${helpers.determineTextSpace('tutorial')} for tutorial title and step indicator

**Action Moment:** Movement frozen at most visually interesting moment of technique/process

**Educational Value:** Clear visual showing what viewer will learn

**Final Use:** Instagram Reel cover for tutorial series
  `.trim()
}

export const REEL_COVER_TEMPLATES = {
  EDUCATIONAL_REEL_COVER,
  TRANSFORMATION_REEL_COVER,
  LIFESTYLE_VLOG_REEL_COVER,
  TUTORIAL_HOWTO_REEL_COVER,
}
























