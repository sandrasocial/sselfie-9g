/**
 * Instagram Text Placement & Typography Best Practices
 * Based on analysis of high-performing carousel posts in 2025
 */

export interface TextPlacementConfig {
  fontSize: number
  contrastRatio: number
  marginFromEdge: number
  wordsPerLine: number
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export const INSTAGRAM_TEXT_RULES = {
  
  COVER_SLIDE: {
    mainTitle: {
      position: 'lower-third OR center-left',
      fontSize: '120-180pt',
      fontWeight: 'bold',
      padding: '60px from edges',
      alignment: 'left OR center',
      color: 'brand primary OR high contrast',
      examples: [
        '10 things',
        'BEFORE & AFTER',
        'THE TRUTH ABOUT',
        '5 MISTAKES'
      ]
    },
    subtitle: {
      position: 'directly below main title',
      fontSize: '40-60pt',
      fontWeight: 'regular OR italic for emphasis',
      lineHeight: '1.3',
      color: 'same as main title',
      maxWords: '10-12 per line',
      examples: [
        'I wish I knew before using AI',
        'that changed everything',
        'everyone makes in 2025'
      ]
    },
    textBox: {
      when: 'background is busy or low contrast',
      style: 'semi-transparent overlay OR clean white box',
      opacity: '0.6-0.8 for dark overlay',
      borderRadius: '12-16px',
      padding: '30-40px all sides',
      maxWidth: '85% of image width'
    },
    brandElements: {
      topLeft: 'small tagline or brand name (18-24pt)',
      topRight: 'teaser quote or ironic statement (18-24pt)',
      bottomLeft: 'attribution or handle (14-18pt)',
      bottomRight: 'swipe arrow indicator (60x60px icon)'
    }
  },
  
  CONTENT_SLIDE: {
    numberPoint: {
      position: 'top-third OR center',
      format: 'NUMBER. Main point text',
      numberSize: '80-100pt bold',
      pointSize: '60-80pt regular',
      color: 'brand primary',
      alignment: 'left OR center (consistent across slides)',
      examples: [
        '1. You can create a whole photoshoot without leaving your house.',
        '4. You don\'t need to be an "influencer" to monetize with AI.',
        '9. AI doesn\'t replace your creativity: IT UNLOCKS IT.'
      ]
    },
    supportingText: {
      position: 'below main point, same alignment',
      fontSize: '35-45pt',
      fontWeight: 'regular',
      lineHeight: '1.4',
      maxLines: '2-3',
      emphasis: 'italic for key words, never underline',
      examples: [
        'I used to spend hours planning, choosing wardrobe, makeup, editing...',
        'Now, AI creates the whole outfit, background, lighting, all from one prompt.',
        'The ideas you\'ve had in your head for months? AI helps bring them to life. In minutes.'
      ]
    },
    textBoxConsistency: {
      rule: 'Use SAME text box style across all content slides',
      position: 'Consistent placement (center, lower-third, etc.)',
      style: 'Same background, padding, radius as other slides',
      contrast: 'Always maintain 4.5:1 minimum'
    }
  },
  
  QUOTE_STAT_SLIDE: {
    statNumber: {
      position: 'center OR upper-third',
      fontSize: '140-180pt',
      fontWeight: 'bold',
      color: 'brand primary',
      format: 'NUMBER + % or unit',
      examples: ['78%', '10X', '$50K', '2025']
    },
    statExplanation: {
      position: 'below number with 40px gap',
      fontSize: '40-50pt',
      fontWeight: 'regular',
      color: 'brand secondary or gray',
      maxWidth: '80% of card',
      alignment: 'center',
      examples: [
        'of users prefer personalized content',
        'growth in just 90 days',
        'saved per photoshoot'
      ]
    },
    quote: {
      position: 'center',
      fontSize: '60-80pt for short quotes, 45-60pt for longer',
      fontWeight: 'regular OR light',
      maxWidth: '80% of card',
      alignment: 'center',
      quoteMarks: 'large decorative at start (120pt, opacity 0.3)',
      attribution: 'below quote, italic, 28-36pt, gray color'
    }
  },
  
  TYPOGRAPHY_STANDARDS: {
    fontFamilies: {
      modern: 'Inter, Satoshi, DM Sans, Helvetica Neue',
      elegant: 'Playfair Display, Cormorant, Bodoni Moda (headlines only)',
      bold: 'Montserrat, Poppins, Raleway, Archivo Black',
      minimal: 'Helvetica Neue, SF Pro, Arial, system-ui'
    },
    weights: {
      headlines: '700-900 (bold to black)',
      subheadings: '500-600 (medium to semibold)',
      body: '400 (regular)',
      captions: '400 italic OR 300 light'
    },
    sizes: {
      cover_title: '120-180pt',
      cover_subtitle: '40-60pt',
      content_number: '80-100pt',
      content_point: '60-80pt',
      content_supporting: '35-45pt',
      stat_number: '140-180pt',
      stat_text: '40-50pt',
      quote: '60-80pt',
      brand_tag: '18-24pt',
      attribution: '14-18pt'
    }
  },
  
  COLOR_CONTRAST: {
    minimumRatio: 4.5,
    recommended: 7.0,
    rules: [
      'Dark text (#000000 to #333333) on light backgrounds',
      'Light text (#FFFFFF) on dark backgrounds or busy images',
      'Use text shadows (0px 2px 4px rgba(0,0,0,0.3)) for text on images',
      'Test readability at thumbnail size (400px width)'
    ]
  },
  
  WHITE_SPACE: {
    minimum: '15% of total image area',
    margins: {
      edges: '60px minimum from all edges',
      betweenElements: '30-40px between text blocks',
      textBox: '30-40px padding inside boxes'
    },
    rule: 'More white space = more premium/luxury feel'
  },
  
  COMMON_MISTAKES_TO_AVOID: [
    'Text too small to read at thumbnail size',
    'Insufficient contrast between text and background',
    'Too many font styles in one carousel (max 2)',
    'Centering body text (hard to read, use left-align)',
    'All-caps for long text (decreases readability)',
    'Script/handwritten fonts for body text',
    'Text positioned over subject\'s face (unless intentional)',
    'Inconsistent text placement across slides',
    'Text boxes with different styles on different slides',
    'No breathing room / cluttered composition'
  ]
}

/**
 * Validation function to check if text placement follows Instagram best practices
 */
export function validateTextPlacement(textConfig: TextPlacementConfig): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Check font size
  if (textConfig.fontSize < 35) {
    errors.push('Font size too small for Instagram carousel (minimum 35pt for body text)')
  }
  
  // Check contrast
  if (textConfig.contrastRatio < 4.5) {
    errors.push(`Insufficient contrast ratio: ${textConfig.contrastRatio} (minimum 4.5:1)`)
  } else if (textConfig.contrastRatio < 7.0) {
    warnings.push('Consider increasing contrast for better readability')
  }
  
  // Check margins
  if (textConfig.marginFromEdge < 60) {
    warnings.push('Text too close to edge (recommended minimum 60px)')
  }
  
  // Check line length
  if (textConfig.wordsPerLine > 12) {
    warnings.push('Line too long for easy reading (max 12 words recommended)')
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

















