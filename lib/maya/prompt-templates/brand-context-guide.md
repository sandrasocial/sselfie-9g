# How Maya Uses Brand Context

## Brand Profile Structure

Users set their brand preferences in their profile:

```typescript
interface UserBrandProfile {
  // Colors
  primaryColor: string      // Main text/brand color (#1A2332)
  secondaryColor: string    // Backgrounds/secondary elements (#FFFFFF)
  accentColor: string       // Highlights/emphasis (#C9A96E)
  backgroundColor: string   // Default background (#FAFAFA)
  
  // Typography
  fontStyle: 'modern' | 'elegant' | 'bold' | 'minimal'
  
  // Branding
  brandName: string         // "SSELFIE Studio"
  tagline: string           // "Built from selfies, built from nothing"
  
  // Aesthetic
  aestheticStyle: 'luxury' | 'minimalist' | 'bold' | 'organic' | 'corporate'
}
```

## How Prompts Use This Context

### Example: User with Luxury Brand Profile

```typescript
const userBrand: BrandProfile = {
  primaryColor: '#1A1A1A',      // Rich black
  secondaryColor: '#FAFAFA',     // Off-white
  accentColor: '#C9A96E',        // Muted gold
  backgroundColor: '#FFFFFF',    // Pure white
  fontStyle: 'elegant',
  brandName: 'Entrepreneur Diaries',
  tagline: 'Built from nothing',
  aestheticStyle: 'luxury'
}
```

**Generated Prompt Would Include:**

```
**Color Palette:**
**Primary Color:** #1A1A1A (main text/elements)
**Secondary Color:** #FAFAFA (backgrounds/accents)
**Accent Color:** #C9A96E (highlights/emphasis)
**Background:** #FFFFFF

**Typography:**
Sophisticated serif for headlines (Playfair Display style), sans-serif for body

**Brand Watermark:**
**Top Left Corner:** Small text "Built from nothing" in subtle #C9A96E

**Visual Style:**
High-end editorial photography, sophisticated, aspirational, Vogue aesthetic
```

### Example: User with NO Brand Profile Set

**Generated Prompt Would Include:**

```
**Color Palette:**
**Primary Color:** #1A1A1A (rich black for text)
**Secondary Color:** #FFFFFF (clean white backgrounds)
**Accent Color:** #E8E8E8 (subtle gray for depth)
**Background:** #FAFAFA (off-white to reduce eye strain)

**Typography:**
Clean sans-serif (Inter/Satoshi style), medium-bold weight for headlines, regular for body

**Brand Watermark:**
**Top Left Corner:** Small text "creators of the future" or similar brand tagline in subtle gray (#808080)

**Visual Style:**
Clean, simple, lots of white space, Scandinavian influence, Instagram-native look
```

## Smart Defaults System

If user hasn't set brand colors, Maya should:

1. **Analyze their existing photos** to extract dominant colors
2. **Use monochrome + one accent** as safe default
3. **Suggest brand colors** based on their content style
4. **Never assume** gold/navy unless user specified

```typescript
function getSmartDefaults(userContent: Image[]): BrandProfile {
  // Extract dominant colors from user's existing content
  const dominantColors = extractDominantColors(userContent)
  
  // Default to safe monochrome if no clear palette
  return {
    primaryColor: '#1A1A1A',
    secondaryColor: '#FFFFFF',
    accentColor: dominantColors[0] || '#4A5568', // Use extracted or gray
    backgroundColor: '#FAFAFA',
    fontStyle: 'modern',
    aestheticStyle: 'minimalist'
  }
}
```

## Maya's Prompt Generation Logic

```typescript
function generateCarouselPrompt(context: PromptContext): string {
  // 1. Check if user has brand profile
  const brandProfile = context.user?.brandProfile
  
  // 2. Get colors (user's or smart defaults)
  const colors = brandProfile 
    ? extractUserColors(brandProfile)
    : getSmartDefaults(context.userImages)
  
  // 3. Generate prompt with proper colors
  return `
**Color Palette:**
${generateColorPalette(brandProfile)}

**Typography:**
${generateTypography(brandProfile)}

**Brand Elements:**
${generateBrandWatermark(brandProfile)}

**Text Overlay:** 
[Large title in ${colors.primary}]
[Subtitle in ${colors.primary} with italic emphasis]
[Text box background: ${colors.background} with ${colors.accent} accents]
  `
}
```

