export interface QuoteGraphicContext {
  quoteText: string
  caption?: string
  brandColors?: {
    primary_color: string
    secondary_color: string
    accent_color: string
  }
  vibe: 'minimal' | 'editorial' | 'bold' | 'elegant' | 'modern'
  hasReferenceImages: boolean
}

export function buildSophisticatedQuotePrompt(context: QuoteGraphicContext): string {
  const { quoteText, caption, brandColors, vibe, hasReferenceImages } = context
  
  // Base aesthetic for different vibes
  const aesthetics = {
    minimal: {
      background: 'Soft cream stone (#F5F1ED) with subtle paper texture',
      typography: 'Elegant serif (Canela style), dark navy (#1A1A1A)',
      elements: 'Single dried flower stem, minimal styling',
      composition: 'Centered layout, generous negative space',
    },
    editorial: {
      background: 'Layered composition with books, magazines, coffee',
      typography: 'Mix of serif headlines and clean sans-serif details',
      elements: 'Styled flat lay: books, coffee cup, flowers, neutral objects',
      composition: 'Overhead angle, curated editorial aesthetic',
    },
    bold: {
      background: 'Solid bold color or dramatic gradient',
      typography: 'Large bold sans-serif, high contrast',
      elements: 'Minimal or no styling elements, type-focused',
      composition: 'Strong graphic layout, text as primary element',
    },
    elegant: {
      background: 'Soft beige or warm white with organic textures',
      typography: 'Classic serif (Times style), sophisticated hierarchy',
      elements: 'Floral elements, candles, luxury objects',
      composition: 'Balanced asymmetry, refined styling',
    },
    modern: {
      background: 'Clean white or light gray, architectural feel',
      typography: 'Modern sans-serif, bold weight',
      elements: 'Geometric shapes, clean lines, contemporary objects',
      composition: 'Grid-based layout, structured design',
    },
  }
  
  const aesthetic = aesthetics[vibe] || aesthetics.editorial
  
  // Brand color integration
  const colorGuidance = brandColors
    ? `Use brand colors: Primary ${brandColors.primary_color}, Secondary ${brandColors.secondary_color}, Accent ${brandColors.accent_color}.`
    : `Use neutral cream, stone, and warm tones.`
  
  // Build prompt
  const prompt = `
Create a sophisticated Instagram quote graphic with editorial magazine aesthetic.

**QUOTE TEXT (Primary Element):**
"${quoteText}"
Typography: ${aesthetic.typography}, font size very large (100-150pt equivalent)
Text placement: ${aesthetic.composition}
${caption ? `Caption line: "${caption}" in smaller elegant font below quote` : ''}

**VISUAL COMPOSITION:**
Background: ${aesthetic.background}
${colorGuidance}
Styling elements: ${aesthetic.elements}
Composition: ${aesthetic.composition}

**DESIGN REQUIREMENTS:**
- Instagram format 4:5 (1080x1350px)
- Quote text is primary visual focus (largest element)
- Sophisticated, curated aesthetic (not generic)
- High-end magazine quality
- Professional typography and layout
- Text perfectly legible and centered
${hasReferenceImages ? '- Maintain user brand aesthetic from reference images' : ''}

**MOOD & STYLE:**
Magazine-quality, intentional, curated, elevated aesthetic. Think Kinfolk, Cereal Magazine, high-end lifestyle editorial.
`.trim()
  
  return prompt
}



