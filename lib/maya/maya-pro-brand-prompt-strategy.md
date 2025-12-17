# Maya Pro Mode: High-End Brand Prompt System
## Strategic Implementation Plan

---

## 📊 CURRENT STATE ANALYSIS

### What We Have
1. **Maya Pro Mode** - Already implemented with NanoBanana Pro
2. **Concept Card System** - Generates 3-4 concept cards per request
3. **Template System** - Organized prompt templates in `lib/maya/prompt-templates/`
4. **Existing Templates**:
   - Carousel slides
   - UGC content
   - Product mockups
   - Brand partnerships
   - Reel covers

### What We're Missing
1. **High-End Brand Prompts** - Professional, detailed prompts like Alo Yoga examples
2. **Category System** - Organized by lifestyle/luxury/wellness/fashion
3. **Brand Library** - Pre-defined high-end brand styles (Alo, Lululemon, Glossier, etc.)
4. **Smart Detection** - Automatically selecting the right template based on user intent

---

## 🎯 STRATEGIC VISION

### Core Principle
**"From Selfie to CEO"** - Professional brand content that makes women entrepreneurs visible and economically empowered.

### User Experience Goal
1. User says: "I want Alo Yoga style wellness content"
2. Maya detects: Wellness + Alo brand aesthetic
3. Maya generates: 3-4 concept cards with professional, detailed prompts
4. User selects images and generates immediately
5. Result: Professional UGC-style content matching high-end brand standards

---

## 🏗️ ARCHITECTURE DESIGN

### 1. Enhanced Template System

```
lib/maya/prompt-templates/
├── types.ts (existing)
├── helpers.ts (existing)
├── carousel-prompts.ts (existing)
├── ugc-prompts.ts (existing)
├── brand-partnership-prompts.ts (existing)
├── product-mockup-prompts.ts (existing)
├── reel-cover-prompts.ts (existing)
│
└── high-end-brands/ (NEW)
    ├── index.ts                  # Central export
    ├── brand-registry.ts         # Brand definitions and aesthetics
    ├── category-mapper.ts        # Maps user intent to categories
    ├── wellness-brands.ts        # Alo, Lululemon, Athleta, etc.
    ├── luxury-brands.ts          # Chanel, Dior, Hermès, etc.
    ├── lifestyle-brands.ts       # Glossier, Goop, Free People, etc.
    ├── fashion-brands.ts         # Reformation, Everlane, Aritzia, etc.
    └── prompt-builder.ts         # Generates detailed prompts
```

### 2. Brand Registry System

```typescript
// brand-registry.ts
interface BrandProfile {
  id: string
  name: string
  category: BrandCategory[]
  aesthetic: BrandAesthetic
  visualStyle: VisualStyleGuide
  commonElements: string[]
  avoidElements: string[]
}

type BrandCategory = 
  | 'wellness' 
  | 'luxury' 
  | 'lifestyle' 
  | 'fashion'
  | 'beauty'
  | 'fitness'
  | 'tech'

interface BrandAesthetic {
  colorPalette: string[]
  typography: string[]
  mood: string[]
  composition: string[]
  lighting: string[]
}
```

### 3. Smart Category Detection

```typescript
// category-mapper.ts
export function detectCategory(userIntent: string): {
  primary: BrandCategory
  secondary?: BrandCategory
  suggestedBrands: string[]
}
```

---

## 📝 DETAILED IMPLEMENTATION PLAN

### Phase 1: Foundation (Week 1)

#### Step 1: Create Brand Registry
**File**: `lib/maya/prompt-templates/high-end-brands/brand-registry.ts`

```typescript
export const BRAND_PROFILES = {
  ALO: {
    id: 'alo',
    name: 'Alo Yoga',
    category: ['wellness', 'fitness', 'lifestyle'],
    aesthetic: {
      colorPalette: ['Neutral tones', 'Soft beiges', 'Warm whites', 'Earth tones'],
      typography: ['Clean sans-serif', 'Minimalist', 'High contrast'],
      mood: ['Aspirational', 'Authentic', 'Premium wellness'],
      composition: ['Full body', '2:3 vertical', 'Natural movement'],
      lighting: ['Natural', 'Soft', 'Golden hour', 'Diffused']
    },
    visualStyle: {
      photoStyle: 'UGC influencer style with professional polish',
      setting: 'Outdoor wellness spaces, yoga studios, lifestyle moments',
      cameraType: 'iPhone-style, natural bokeh, candid',
      postProcessing: 'Natural glam, soft skin, authentic texture'
    },
    commonElements: [
      'Athletic wear clearly visible',
      'Brand logo subtly integrated',
      'Wellness props (yoga mat, water bottle)',
      'Clean, minimalist backgrounds',
      'Movement and flow',
      'Confident poses'
    ],
    avoidElements: [
      'Overly airbrushed skin',
      'Harsh shadows',
      'Cluttered backgrounds',
      'Forced poses',
      'Obvious product placement'
    ]
  },
  
  LULULEMON: { /* ... */ },
  GLOSSIER: { /* ... */ },
  // ... more brands
}
```

#### Step 2: Category Mapper
**File**: `lib/maya/prompt-templates/high-end-brands/category-mapper.ts`

```typescript
export function detectCategoryAndBrand(
  userIntent: string,
  userImages: ImageReference[]
): {
  category: BrandCategory
  suggestedBrands: BrandProfile[]
  confidence: number
} {
  // Smart detection logic
  // Examples:
  // "Alo yoga vibes" → wellness, [ALO]
  // "luxury fashion editorial" → fashion + luxury, [CHANEL, DIOR]
  // "clean girl aesthetic" → lifestyle + beauty, [GLOSSIER, GOOP]
}
```

#### Step 3: Wellness Brand Templates
**File**: `lib/maya/prompt-templates/high-end-brands/wellness-brands.ts`

```typescript
export const ALO_YOGA_LIFESTYLE: PromptTemplate = {
  id: 'alo_yoga_lifestyle',
  name: 'Alo Yoga - Lifestyle Movement',
  brandProfile: BRAND_PROFILES.ALO,
  description: 'Professional UGC-style wellness content matching Alo Yoga aesthetic',
  useCases: [
    'Wellness lifestyle content',
    'Athletic wear campaigns', 
    'Yoga/fitness moments',
    'Aspirational health content'
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ['user_lora', 'inspiration']
  },
  promptStructure: (context: PromptContext) => `
Vertical 2:3 photo in UGC influencer style captured from Alo Yoga. 

Woman with athletic, slim and defined body, maintaining exactly the characteristics from Image 1 (face, body, skin tone, hair, visual identity), without copying the photo.

**MOVEMENT & ACTION:**
${generateAloAction(context)}

**OUTFIT & STYLING:**
${generateAloOutfit(context)}
Alo brand outfit clearly visible with subtle logo integration.

**HAIR & MAKEUP:**
${generateAloBeauty(context)}

**LIGHTING & ATMOSPHERE:**
Balanced natural lighting. ${generateAloLighting(context)}

**COMPOSITION:**
Full body framing with slight sense of movement. 
Enquadramento de corpo inteiro com leve sensação de movimento.

**AESTHETIC:**
Real, clean and aspirational. Premium UGC style, authentic yet polished.
Estética real, clean e aspiracional.

**TECHNICAL:**
Shot on iPhone 15 Pro, natural bokeh, authentic moment
85mm lens equivalent, f/2.0 depth of field
Natural skin texture with visible pores (not airbrushed)
`,
  
  variations: [
    {
      name: 'Outdoor Wellness Moment',
      environment: 'Modern minimalist outdoor space, natural elements',
      action: 'Walking slowly, adjusting sunglasses, natural movement'
    },
    {
      name: 'Yoga Practice',
      environment: 'Yoga studio or outdoor mat, serene setting',
      action: 'Mid-pose, confident expression, centered energy'
    },
    {
      name: 'Lifestyle Candid',
      environment: 'Urban wellness space, clean architecture',
      action: 'Authentic moment, natural expression, aspirational yet relatable'
    }
  ]
}

// Helper functions for Alo-specific generation
function generateAloAction(context: PromptContext): string {
  // Returns: "She walks slowly through a modern minimalist space..."
}

function generateAloOutfit(context: PromptContext): string {
  // Returns: "Monochromatic Alo outfit, fitted athletic wear..."
}

function generateAloBeauty(context: PromptContext): string {
  // Returns: "Brown hair loose with volume and waves. Natural glam makeup..."
}

function generateAloLighting(context: PromptContext): string {
  // Returns: "Soft golden hour glow" or "Natural window light"
}
```

### Phase 2: Integration (Week 1-2)

#### Step 4: Update Concept Generation API
**File**: `app/api/maya/generate-concepts/route.ts`

Add brand detection:

```typescript
// Detect if user wants high-end brand style
const brandIntent = detectCategoryAndBrand(userMessage, [])

if (brandIntent.confidence > 0.7) {
  // Add brand-specific instructions to system prompt
  systemPrompt += `
  
**BRAND STYLE DETECTED: ${brandIntent.suggestedBrands[0].name}**

Follow these brand aesthetics:
${JSON.stringify(brandIntent.suggestedBrands[0].aesthetic, null, 2)}

Generate prompts that match this exact visual style.
`
}
```

#### Step 5: Update Prompt Builder
**File**: `lib/maya/nano-banana-prompt-builder.ts`

Add brand-scene enhancement:

```typescript
case 'brand-scene':
  // Check if specific brand was requested
  const detectedBrand = detectBrandFromRequest(userRequest)
  
  if (detectedBrand) {
    optimizedPrompt = buildHighEndBrandPrompt({
      brand: detectedBrand,
      userRequest,
      inputImages: nanoInputs,
      brandKit,
      preferences
    })
  } else {
    // Existing brand-scene logic
    optimizedPrompt = buildBrandScenePrompt({ /* ... */ })
  }
  break
```

### Phase 3: User Experience (Week 2)

#### Step 6: Brand Selection UI (Optional Enhancement)

Add to Maya chat interface:

```typescript
// When user mentions brand or category
Maya: "Love that vibe! ✨ I can create Alo Yoga-style wellness content for you.

Would you like:
1. 🧘‍♀️ Yoga/Movement Lifestyle
2. 🏃‍♀️ Athletic Wear Editorial  
3. 🌅 Outdoor Wellness Moment
4. ☕ Casual Lifestyle Candid

Or just say what you're envisioning!"
```

#### Step 7: Category Quick Access

Add to concept generation triggers:

```typescript
// User can say:
"Create Alo style wellness content" → Wellness category + Alo brand
"Luxury fashion like Chanel" → Fashion + Luxury + Chanel
"Clean girl aesthetic" → Lifestyle + Beauty + Glossier
```

---

## 📸 REAL-WORLD PROMPT EXAMPLES

### Chanel Luxury Fashion (10 Professional Examples)

These are actual professional prompts showing the exact quality and detail level expected for luxury brand content. Each prompt is 150-250 words and includes specific brand elements, technical details, and aesthetic guidance.

#### Example 1: Night Portrait with Studio Lighting
```
Night portrait with studio lighting and soft flash, maintaining exactly the same physical characteristics of the woman in the attached image (face, body, skin tone, hair, and visual identity), without modifications.

She wears a high-neck black velvet blouse, fitted to the body, with a subtle CC embroidery near the neck. She wears a long double-strand pearl necklace. Hair is straight, sleek, and pulled back behind the ears.

Makeup: intense red lipstick, long and well-defined lashes, elegant finish.

Lighting: soft studio flash, creating controlled shine on the skin and velvet.

Background: window with slightly blurred glass, night scene with snow in the background and small twinkling lights.

Aesthetic of luxurious glamour for evening party, sophisticated, elegant and discreet, with Chanel visual code.
```

**Key Elements:**
- Specific Chanel branding (CC embroidery, pearl necklace)
- Detailed outfit description (black velvet, high-neck, fitted)
- Technical lighting specs (soft studio flash, controlled shine)
- Mood and aesthetic (luxurious glamour, sophisticated, Chanel visual code)
- Character consistency emphasis

#### Example 2: High Fashion Portrait with Bold Attitude
```
High fashion portrait of a woman, maintaining exactly the same physical characteristics of the woman in the attached image (face, body, skin tone, hair, and visual identity), without modifications.

She wears a black leather jacket falling partially over her shoulders, revealing a beige Chanel headband with logo stamp prominently displayed. Hair is parted in the middle, extremely polished and shiny, held in a low sleek bun.

She wears dramatic black sunglasses and layered gold jewelry—thick chain chokers, a vintage-inspired CC pendant, and multiple bold rings.

Expression is sensual and confident, with chin slightly raised and lips parted with glossy lipstick.

Lighting: direct flash against continuous white background, creating sharp contours, marked reflective surfaces, and preserved real skin texture.

Aesthetic of bold luxury, logo-loaded and attitude-driven, conveying absolute confidence and dominant fashion energy, with strong brand identity.
```

**Key Elements:**
- Bold brand presence (logo prominently displayed)
- Luxury accessories (layered gold jewelry, vintage CC pendant)
- Specific expression guidance (sensual, confident, chin raised)
- Technical camera work (direct flash, sharp contours)
- Strong mood direction (bold luxury, dominant fashion energy)

#### Example 3: 90s Chanel Campaign Inspired
```
Studio portrait inspired by Chanel campaigns from the 90s—the model wears a white structured blouse with black ribbon bow detail at the neck and cuffs with pearl buttons. Hair is well-aligned, side-parted, held with a small camellia brooch.

Expression: composed, elegant, with chin slightly raised.

Lighting: direct flash on a soft white background, with shadows cast behind the model.

Aesthetic of luxurious editorial, high contrast, clean lines and sophisticated visual.
```

**Key Elements:**
- Historical brand reference (90s Chanel campaigns)
- Iconic Chanel elements (camellia brooch, pearl buttons, black ribbon bow)
- Classic editorial aesthetic
- Minimalist but precise

#### Example 4: Luxury Boutique Street Editorial
```
Maintain rigorously the characteristics of the woman in attachment (face, proportions, visual identity). Do not copy the attached photo.

Fashion editorial portrait captured in front of a luxury boutique, with a softly blurred CHANEL awning above the scene. The woman is positioned outside the store, looking toward the camera in a medium body framing, integrating elegantly into the sophisticated urban environment.

She wears a structured tan tweed blazer with classic golden buttons, combined with a fine silk blouse in light tone and black tailored shorts, creating a refined and timeless contrast. Styling is balanced, elegant and faithful to contemporary French fashion aesthetic.

Polished brown hair is held in a low sleek bun (low chignon), reinforcing the clean sophistication of the visual. She carries a classic CHANEL quilted bag with golden hardware, treated as an iconic styling element.

Pose is natural and confident: one hand rests discreetly inside the bag, while the body leans slightly in rotation, with gaze cast subtly over the shoulder in a contemplative manner. Expression is serene and assured, with relaxed lips and elegant posture.

Natural daylight reflects softly on the polished marble floors in the background, creating diffused shine and visual depth without distractions. Background remains clean and sophisticated, reinforcing focus on the silhouette and styling.

Balanced natural lighting, preserving real skin texture. 50mm camera, vertical 2:3 framing. Image evokes a luxury urban editorial inspired by the Chanel universe—classic, modern, and absolutely timeless.
```

**Key Elements:**
- Environmental storytelling (luxury boutique, CHANEL awning, marble floors)
- Iconic Chanel pieces (tweed blazer, quilted bag with golden hardware)
- Natural but sophisticated pose (hand in bag, subtle shoulder glance)
- Specific technical details (50mm camera, 2:3 framing, natural lighting)
- French fashion aesthetic emphasis
- Lengthy and comprehensive (250+ words for complex scenes)

#### Example 5: Paris Hotel Luxury Lifestyle
```
Photo captured from above, with woman sitting on the bed of a classic luxury Parisian hotel, maintaining exactly the same physical characteristics of the woman in the attached image (face, body, skin tone, hair, and visual identity), without modifications. Long brown hair with waves and volume. Red nails. Gold jewelry. Sharp face, 8k quality.

The environment is a five-star hotel room in Paris, with elegant and timeless architecture: dark upholstered headboard, classic moldings on the walls, tall French doors open in the background, tall mirrors and refined architectural details. In the background, the atmosphere suggests a sophisticated historic Parisian hotel, with real depth and sense of noble space.

Beside her on the bed, a black Chanel shopping bag appears open naturally. The bag ribbon is loose and spread over the white premium cotton sheets, with a handwritten card partially visible inside the bag.

She wears an oversized cream knit sweater, falling slightly off one shoulder. Legs are bare, wearing soft beige cashmere stockings. On one wrist, bracelet.
```

**Key Elements:**
- Luxury lifestyle setting (Parisian five-star hotel)
- Product integration (Chanel shopping bag with ribbon)
- Environmental details (moldings, French doors, mirrors)
- Intimate moment capture (unboxing, natural placement)
- Premium materials emphasis (premium cotton sheets, cashmere)

#### Example 6: Cozy Interior Editorial
```
Editorial scene in interior setting: the woman is seated in a brown bouclé armchair next to a lit stone fireplace, maintaining exactly the same physical characteristics of the woman in the attached image (face, body, skin tone, hair, and visual identity), without modifications.

She wears an oversized cream cashmere turtleneck and a black satin mini skirt. Legs are bare and elegantly crossed. On her lap, she opens a black Chanel gift box, tied with a white grosgrain ribbon, naturally and spontaneously.

Hair is held in a low sleek bun, adorned with a velvet headband with pearl details. Warm firelight reflects softly on a golden ring charm and delicate double-C pendant resting on the collarbone.

Lighting: warm and cozy firelight, creating soft shadows and real texture in fabrics and on skin.

Sophisticated winter editorial aesthetic, intimate and luxurious, with elegant and cozy atmosphere, without advertising appearance.
```

**Key Elements:**
- Intimate lifestyle moment (gift opening)
- Luxurious materials (cashmere, satin, bouclé)
- Warm atmospheric lighting (firelight)
- Natural brand integration (gift box, CC pendant)
- "Without advertising appearance" - authentic feel

#### Example 7: Rodeo Drive iPhone-Style Street Shot
```
Hyper-realistic shot in iPhone style, with spontaneous appearance, of a woman walking confidently in front of a Chanel boutique on Rodeo Drive, maintaining exactly the same physical characteristics of the woman in the attached image (face, body, skin tone, hair, and visual identity), without modifications.

She wears a cropped black blazer with golden Chanel buttons over a beige headband with interlaced CC logo stamp, combined with high-waisted pants and needle heels. Hair is straight, sleek, pulled back behind ears, with visible Chanel pearl earrings.

One hand holds a quilted black leather Chanel bag; the other carries a partially consumed iced latte. She casts a sideways glance over oversized cat-eye sunglasses, with glossed lips and slightly parted in a spontaneous half-smile.

Lighting: natural California light, with clean and defined shadows cast on the body. In the background, the boutique façade and signage appear elegantly blurred.

Capture: phone angle at hip height, slightly tilted, with shallow depth of field. Preserved skin texture (pores) and fabric textures, evident editorial realism.

Aesthetic: contemporary luxury lifestyle, confident attitude, urban naturalness, without staged advertising appearance.
```

**Key Elements:**
- "iPhone style" authenticity (phone angle, spontaneous appearance)
- Multiple brand touchpoints (blazer buttons, headband logo, quilted bag, pearl earrings)
- Lifestyle props (iced latte - relatable moment)
- Specific location (Rodeo Drive)
- Technical camera specs (hip height, tilted, shallow depth of field)
- "Without staged advertising appearance" - key differentiator

#### Example 8: Parisian Café Influencer Moment
```
Spontaneous portrait in influencer style of a woman sitting alone at a table in a Parisian street café, maintaining exactly the same physical characteristics of the woman in the attached image (face, body, skin tone, hair, and visual identity), without modifications.

She is drinking an espresso, wearing a Chanel tweed suit in cream tone, two mini-length pieces, with frayed finish and CC buttons catching the sunlight. Hair is loose, with soft waves and side-parted, combined with oversized black sunglasses resting slightly below the eyes.

One arm rests naturally on the table, next to a quilted Chanel wallet and a red lipstick. She wears a discreet pearl earring.

In the background, scooters and Haussmannian shopping bags appear blurred, creating an authentic Parisian urban scene.

Lighting: midday light softly wrapping the face, highlighting glossed lips and subtle shine of pearl earring.

Capture: photo taken from across the street with long lens, creating natural compression and elegant background separation.

Aesthetic: casual luxury, digital Parisian street style, natural, elegant and spontaneous, without staged advertising appearance.
```

**Key Elements:**
- Authentic Parisian lifestyle (café, espresso, Haussmannian architecture)
- Iconic Chanel tweed suit (frayed finish, CC buttons)
- Natural styling details (wallet and lipstick on table)
- Environmental authenticity (scooters, shopping bags in background)
- Technical photography (long lens, compression, background separation)

#### Example 9: Luxury SUV Selfie
```
Ultra-realistic selfie in influencer style, captured on the front seat of a luxury SUV, maintaining exactly the same physical characteristics of the woman in the attached image (face, body, skin tone, hair, and visual identity), without modifications.

A confident woman, with low sleek bun and visible "peekaboo" hair streak, leans slightly toward the camera, framed by natural golden California light. She wears black angular Chanel sunglasses, with prominent white logos on the temples.

She wears a pleated brown halter top with deep v-neck, revealing layered necklaces with mother-of-pearl flower and coordinated bracelet charms that reflect light on the wrist. Long almond-shaped nails rest softly on the collarbone, highlighting a luminous ring and soft glam manicure.

Lighting wraps the face naturally, highlighting glossed lips and cheekbones.

Composition: phone framing just above the dashboard, with soft-focus rear seat and blurred trees passing through the window.

Refined, elegant and ultra-stylish aesthetic—sense of triumphant arrival, silent confidence and contemporary luxury, without staged advertising appearance.
```

**Key Elements:**
- Modern influencer format (selfie in luxury car)
- Subtle brand presence (Chanel sunglasses with logos)
- Jewelry and accessory details (layered necklaces, specific nail description)
- Emotional storytelling (triumphant arrival, silent confidence)
- Natural lighting emphasis (golden California light)

#### Example 10: Studio Portrait with Chanel Code
```
Studio portrait inspired by Chanel campaigns, maintaining woman's exact characteristics from attached image.

She wears a white structured blouse with black ribbon bow at neck and pearl button cuffs. Hair is well-aligned, side-parted, with small camellia brooch.

Expression: composed, elegant, chin slightly raised.

Lighting: direct flash on soft white background, shadows cast behind model.

Aesthetic: luxurious editorial, high contrast, clean lines, sophisticated visual with timeless Chanel code.
```

**Key Elements:**
- Campaign-quality aesthetic
- Iconic Chanel elements (camellia brooch, pearl buttons, ribbon bow)
- Classic studio technique
- Timeless brand code

---

### Prompt Quality Analysis

**What Makes These Prompts Exceptional:**

1. **Specificity** - Not "jewelry" but "layered necklaces with mother-of-pearl flower"
2. **Brand Integration** - Natural placement of logos, iconic items, brand aesthetics
3. **Technical Precision** - Camera angles, lighting types, specific lens choices
4. **Mood Direction** - Not just "confident" but "silent confidence and contemporary luxury"
5. **Authenticity Markers** - "Without staged advertising appearance", "spontaneous", "natural"
6. **Environmental Context** - Specific locations (Rodeo Drive, Parisian café, five-star hotel)
7. **Material Details** - Cashmere, tweed, velvet, satin, bouclé - specific fabric mentions
8. **Length** - 150-250 words for complex scenes, comprehensive yet focused

**Comparison: Generic vs. High-End Brand Prompt:**

❌ **Generic Prompt:**
"Woman wearing Chanel outfit, luxury setting, professional photo"

✅ **High-End Brand Prompt:**
"Hyper-realistic shot in iPhone style, with spontaneous appearance, of a woman walking confidently in front of a Chanel boutique on Rodeo Drive, maintaining exactly the same physical characteristics of the woman in the attached image. She wears a cropped black blazer with golden Chanel buttons over a beige headband with interlaced CC logo stamp... [continues with 200+ words of specific detail]"

---

### Travel & Airport Lifestyle (11 Professional Examples)

These prompts capture the "luxury travel" and "airport aesthetic" that's hugely popular on Instagram. They showcase effortless style, designer luggage, and those aspirational pre-boarding moments that influencers live for.

#### Example 1: It Girl Airport Lounge
```
Header A — Maintain the characteristics of the person in attachment. Do not copy the photo in attachment.

Ultra-realistic 2:3 portrait in it girl style. The woman is seated in a minimalist airport lounge, holding an iced latte with transparent lid while smiling softly at the camera. Look it girl: cropped beige sweater, wide-leg off-white pants, and clean white sneakers. Long voluminous wavy brown hair falling over shoulders. Silver bag next to her, structured bag over the suitcase. Clear and diffused light, luxury travel aesthetic.
```

**Key Elements:**
- "It girl" aesthetic identifier
- Coffee prop (relatable lifestyle moment)
- Minimal neutral outfit (beige, off-white, white)
- Designer luggage visible
- Clear diffused lighting

#### Example 2: Airport Departure Influencer Shot
```
Header A — Maintain the characteristics of the person in attachment. Do not copy attached photo. She is looking at the camera.

Ultra-realistic 2:3 portrait in influencer style, focused on face with maximum sharpness and soft blurred background. The stylish young woman poses relaxed in the outdoor area of the airport departure zone. She wears oversized beige sweatshirt and matching sweatpants, with white New Balance sneakers with thick sole. Long brown hair pulled into a casual low bun, with some loose natural strands around the face. Sunglasses with pastel pink lenses rest on top of her head or are held in hand to guarantee total facial sharpness.

She holds the handles of two rigid pink-light suitcases positioned to the side, with realistic texture. On the front suitcase there is a textured beige griffin bag with pink-light letters and a hanging teddy bear keychain.

Lighting: soft natural light filtered through window shadows, highlighting real skin texture, natural shine in hair and material details.

Environment: modern airport exterior, with smooth concrete floor and metallic pillars; glass doors blurred in background with real depth of field f/2.8.

Camera: 35mm lens, vertical 2:3 composition, framing from shoulders up, ensuring sharpness on face and keeping luggage visible. Clean, minimalist and comfortable aesthetic, conveying confident humor and light travel vibe.
```

**Key Elements:**
- Comprehensive 250+ word prompt for complex scene
- Specific brand mentions (New Balance)
- Accessory details (teddy bear keychain, griffin bag)
- Technical camera specs (35mm, f/2.8)
- Multiple luggage pieces with textures
- "Light travel vibe" mood direction

#### Example 3: Golden Hour Airport Terminal
```
Header A — Maintain the characteristics of the person in attachment. Do not copy photo in attachment.

Ultra-realistic editorial portrait of a woman standing in front of an airport terminal window during golden hour, with sunlight reflecting softly behind her through the glass. She wears a beige coat thrown over shoulders, a white ribbed tank top underneath and delicate golden jewelry that shine subtly. One hand holds a boarding pass and a folded passport close to her face, catching the light as an accessory. Hair is straight and with center part, pulled back behind ears. Expression: calm, carefree, lips parted with confidence.

Lighting: brilliant golden sunlight with light halo around jawbone, diffused reflections on glass panels behind her.

Details: visible skin texture, loose hair strands shining in backlight, slight highlight on passport corner, light background blur. Photography taken with 85mm lens, f/2.2 for soft bokeh — impeccable realism, no retouching, natural depth.
```

**Key Elements:**
- Golden hour timing (specific lighting moment)
- Travel documents as props (boarding pass, passport)
- Backlit photography technique
- Specific lens choice (85mm, f/2.2)
- "No retouching, natural depth" - authenticity marker

#### Example 5: Morning Airport Waiting Area
```
Maintain the characteristics of the person in attachment.

Ultra-realistic photo, in influencer style, of a woman seated in airport waiting area, with morning light entering through the tall terminal windows. She wears a beige knit outfit — wide-leg pants and loose short-sleeve cardigan — whose soft texture is visibly highlighted under the light. A beige baseball cap lightly shadows her face, and large silver over-ear headphones rest comfortably over her hair. She casually holds a travel coffee cup in one hand, with her wrist adorned by a gold watch and delicate rings.

Beside her, an elegant beige griffin bag rests on a rigid gray-charcoal suitcase. The scene appears spontaneous, but carefully planned — neutral beige, brown and graphite tones predominate in the environment.

Lighting: soft diffused daylight with natural reflections on metallic details; authentic terminal environment visible through window behind her.

Camera: handheld composition, 35mm lens f/1.8 for shallow depth of field; Details in extreme foreground sharpness, background slightly blurred with faint silhouettes of travelers and rows of seats.

Atmosphere: quiet luxury, serene travel confidence, discreet opulence, cinematic lifestyle style.
```

**Key Elements:**
- "Quiet luxury" aesthetic (trending concept)
- Headphones as lifestyle accessory
- Coffee cup prop
- Neutral tonal palette (beige, brown, graphite)
- "Spontaneous but carefully planned" - captures Instagram reality
- Environmental context (travelers, seats in background)

#### Example 6: Textured Coat Terminal Exterior
```
Header A — Maintain the characteristics of the person in attachment. Do not copy photo in attachment.

Vertical 2:3 ultra-realistic portrait of a woman with her original characteristics, in a spontaneous scene at the airport terminal exterior, with natural light reflecting softly on glass panels behind her. She wears a textured pastel pink cozy coat, open over a light gray blouse and high-waisted blue jeans with relaxed fit. Long brown hair in voluminous waves, falling naturally over shoulders and catching ambient light. Defined slim athletic body.

On feet, camel suede moccasins with shearling, creating cozy contrast with the elegant look. Beside her, a rigid pink-blush bag with shiny reflections, topped by a monogrammed griffin tote bag and a small bag she holds in her hand.

Relaxed and graceful posture, looking softly to the side, conveying "quiet luxury travel" aesthetic.

Lighting: soft diffused natural daylight, with soft reflections on glass and subtle highlight on coat texture and bag metals.

Camera: handheld influencer-style composition, 35mm lens at f/2.2, slightly low angle for lifestyle feel. Sharp focus on face and look, with slight background blur for realistic depth.

Mood: minimalist femininity, light sophistication, travel comfort, cinematic luxury lifestyle aesthetic.
```

**Key Elements:**
- Specific fabric textures (cozy coat, shearling, suede)
- Color coordination (pastel pink, light gray, blue, camel)
- Multiple bag types (rigid suitcase, tote, small bag)
- "Quiet luxury travel" - specific aesthetic callout
- Mood descriptors (minimalist femininity, light sophistication)

#### Example 7: Confident Airport Lobby Walk
```
Header A — Maintain the characteristics of the person in attachment. Do not copy photo in attachment.

Vertical 2:3 portrait in cinematic style showing a woman walking confidently through modern airport lobby with glass skylights above. She maintains exactly her facial characteristics, with total face sharpness. Long brown hair, in natural waves that move with her stride, subtly reflecting golden strands in light.

Look it girl travel: minimalist black cropped blazer, structured beige blazer and high-waisted cream pants with elegant fit. Delicate golden collar at neck. Defined slim athletic body. She pulls a silver textured suitcase with one hand and holds a coffee in the other, captured mid-step.

Lighting: soft natural midday light filtered through glass panels, with slight flare at frame edges. A subtle fill flash freezes expression and gives realistic shine to face and hair.

Details: blurred passengers in background create depth; floor reflections follow movement; slight motion blur in hair and blazer hem reinforce realism and walking energy.

Camera: 50mm lens, f/2.8, handheld composition with slight tilt for spontaneous editorial feel.

Expression: subtle smirk, firm forward gaze — confident posture of someone already ready for next destination.
```

**Key Elements:**
- Motion capture (mid-step, hair movement, blazer hem blur)
- Mixed lighting (natural + fill flash)
- Environmental depth (blurred passengers, floor reflections)
- "Confident posture of someone ready for next destination" - emotional storytelling
- Slight camera tilt for editorial spontaneity

#### Example 8: Floor Selfie Pre-Boarding
```
Header A — Maintain the characteristics of the person in attachment. Do not copy photo in attachment.

Ultra-realistic handheld selfie of a stylish woman seated casually on airport floor near boarding gate. She maintains exactly her original facial characteristics, with sharp face. Hair is in long voluminous waves, brown style, falling naturally over shoulders, highlighted by soft terminal light. Defined slim athletic body.

She wears a light gray oversized sweatshirt with relaxed sleeves, deep forest green sweatpants and white sneakers. Uses over-ear pink blush headphones comfortably resting on ears.

She holds phone lightly up and in front of face, creating classic travel selfie angle, with relaxed and confident posture. Behind her, a brown duffel bag with pastel pink griffin tote bag propped on top, including a small keychain attached to handle.

Lighting: soft diffused terminal light, filtered through wide windows, creating natural shine on skin, real shadows on fabric and authentic texture in hair.

Environment: carpet with geometric blue and green pattern adding realistic depth to scene.

Camera: iPhone-style framing, 24mm lens equivalent, arm distance, main focus on sharp face with slightly blurred background.

Mood: cozy, wanderlust, clean influencer aesthetic — the calm and confident moment before boarding.
```

**Key Elements:**
- Floor sitting (casual, relatable influencer moment)
- Selfie angle specifics (arm distance, phone placement)
- Carpet pattern detail (geometric blue and green)
- "Wanderlust" - travel-specific mood
- iPhone-style framing (24mm equivalent)

#### Example 9: Terminal Lounge Direct Gaze
```
Header A — Maintain the characteristics of the person in attachment. Do not copy photo in attachment.

Ultra-realistic portrait in influencer style, in vertical 2:3 composition. The woman is seated in airport terminal area, facing camera, maintaining her original facial characteristics with maximum sharpness. Long brown hair loose, in long waves with natural volume. Defined slim athletic body.

She wears a black lounge outfit — soft jacket with zipper and wide-leg pants — with clean white sneakers. Uses white over-ear headphones on ears. Seated comfortably on a black leather bench, with one casually folded leg, she looks directly at camera with soft and confident expression.

In front of her, there is a silver rigid suitcase with a cream sherpa tote bag resting on it, with minimalist logo in relief and a teddy bear keychain on handle.

Lighting: natural blue light entering through wide terminal windows, creating soft shine on hair and realistic skin texture, without artificial smoothing. Natural reflectors on glass reinforce realism.

Camera: travel lifestyle aesthetic, 35mm lens at f/2.0, slightly below eye line angle to enhance face and keep it perfectly sharp. Realistic visible texture in fabrics, hair, glass reflections and luggage details.

Mood: calm, sophisticated, aspirational — a real moment before boarding.
```

**Key Elements:**
- Direct camera gaze (connection with viewer)
- Lounge outfit specifics (soft jacket, wide-leg pants)
- Sherpa texture detail
- "Without artificial smoothing" - natural skin emphasis
- "Real moment before boarding" - authentic feeling

#### Example 10: Vogue Editorial Airport Lobby
```
Header A — Maintain the characteristics of the person in attachment. Do not copy photo in attachment.

Vertical 2:3 portrait in ultra-realistic Vogue aesthetic. The woman is seated in airport lobby, facing camera, directly staring with confident and editorial expression. Face is in absolute sharpness, with natural skin texture, soft shine and realistic contour. Camera is positioned about 1.5m away, slightly below eye line to convey presence and elegance.

She wears light gray over-ear headphones, textured beige knit outfit and white sneakers. Legs are elegantly crossed, with foot resting on her rigid light green suitcase, which becomes part of the fashion composition. Gray backpack remains to the side, composing the minimalist frame.

Lighting is natural, coming from tall windows behind camera, creating uniform diffused light that highlights face and adds editorial shine to brown hair, in well-defined waves. Small reflections on glass and floor give Vogue finish.

Background: wide windows, blurred airport terminal, modern architectural lines that create depth and sophistication.

Camera: 50mm, f/2.2, absolute focus on face, soft bokeh around. International magazine aesthetic: clean, modern and luxurious.
```

**Key Elements:**
- "Vogue aesthetic" - editorial quality identifier
- Luggage as composition element (foot resting on suitcase)
- Specific camera distance (1.5m)
- "International magazine aesthetic" - aspirational level
- Glass and floor reflections for finish

#### Example 11: Terminal Window Iced Latte
```
Header A — Maintain the characteristics of the person in attachment. Do not copy photo in attachment.

Ultra-realistic portrait in lifestyle style of a woman seated beside airport terminal window, in vertical 2:3 composition. She maintains exactly her facial characteristics, with total face sharpness. Long brown hair pulled into a messy clip bun, with some loose strands highlighted by golden backlight that highlights its natural texture. Defined slim athletic body.

She holds an iced latte in one hand, with cup condensation reflecting golden light, while slides finger on phone with other hand. Look includes oversized sand-colored sweatshirt, cream jogger and robust white sneakers. Beside her, on seat, rests an elegant silver rigid suitcase.

Lighting: natural golden light entering through airport floor-to-ceiling windows, creating realistic shine on face, soft highlights on skin and reflections on coffee cup. Soft and diffused shadows reinforce realism.

Environment: wide window with view to terminal, background slightly blurred to maintain total face and hands sharpness.

Mood: calm, warm, aspirational — realistic influencer aesthetic, captured in serene moment before boarding.
```

**Key Elements:**
- Coffee cup condensation detail (ultra-realistic touch)
- Messy bun with loose strands (natural styling)
- Phone in hand (multitasking, relatable)
- Golden backlight through hair
- "Serene moment before boarding" - pre-travel calm

---

### Travel Prompt Quality Analysis

**What Makes These Travel Prompts Exceptional:**

1. **Lifestyle Integration** - Not just "woman at airport" but "woman holding iced latte while checking phone"
2. **Accessory Storytelling** - Teddy bear keychains, griffin bags, designer headphones tell a lifestyle story
3. **Lighting Specificity** - Golden hour, blue terminal light, soft diffused morning light
4. **Mood Descriptors** - "Wanderlust", "quiet luxury", "serene travel confidence", "it girl travel"
5. **Technical Precision** - Camera angles (arm distance for selfies, slightly below eye line)
6. **Environmental Context** - Geometric carpet patterns, blurred passengers, glass reflections
7. **Authenticity Markers** - "Spontaneous but carefully planned", "natural imperfections", "no artificial smoothing"

**Common Travel Elements:**

- **Coffee/Latte Props** - Appears in 5+ prompts (relatable luxury)
- **Designer Luggage** - Rigid suitcases, tote bags, multiple pieces
- **Over-Ear Headphones** - Status symbol + practical accessory
- **Neutral Color Palette** - Beige, cream, white, gray, pastel pink
- **Floor/Bench Sitting** - Casual, authentic influencer moments
- **Terminal Windows** - Natural light source, environmental context
- **"It Girl" Aesthetic** - Effortless style identifier

**Comparison: Generic vs. Travel Lifestyle Prompt:**

❌ **Generic Prompt:**
"Woman at airport with luggage, travel outfit"

✅ **Travel Lifestyle Prompt:**
"Ultra-realistic handheld selfie of a stylish woman seated casually on airport floor near boarding gate. She wears light gray oversized sweatshirt with relaxed sleeves, deep forest green sweatpants and white sneakers. Uses over-ear pink blush headphones. She holds phone lightly up creating classic travel selfie angle. Behind her, brown duffel bag with pastel pink griffin tote bag, small keychain attached. Lighting: soft diffused terminal light through wide windows. Environment: carpet with geometric blue and green pattern. Camera: iPhone-style framing, 24mm equivalent, arm distance. Mood: cozy, wanderlust, clean influencer aesthetic — calm moment before boarding."

---

### Christmas/Holiday Seasonal (11 Professional Examples)

These prompts capture festive luxury lifestyle content perfect for seasonal marketing. They combine cozy holiday aesthetics with sophisticated styling - think Pinterest Christmas meets editorial glamour.

#### Example 1: Christmas Tree Bokeh Elegance
```
Image sent — maintain only the natural physical characteristics of the person (glowing brown skin, slim athletic body, defined eyebrows, brown eyes, nude pink lips, brown hair with waves). Do not copy pose, expression, background or original light. Only general aesthetic reference. Sharp and real face.

Prompt:
Sophisticated portrait with Christmas tree background in bokeh with warm lights. Model seated or crouched with elegant posture, wearing structured black satin dress and long black lace gloves, shiny long drop earrings. Confident and feminine expression looking at camera. Soft glam look, soft diffused lighting. Camera distance 80cm — 50mm lens.
```

**Key Elements:**
- Christmas tree bokeh (out of focus warm lights)
- Elegant formal wear (black satin dress, lace gloves)
- Sophisticated evening aesthetic
- 50mm lens at 80cm distance
- "Soft glam" makeup direction

#### Example 2: Red Couture Christmas Interior
```
Image sent — follow only natural characteristics of the person. Nothing copied literally from photo.

Prompt:
Interior setting with illuminated white tree and presents. Model standing with couture mini red dress look with structured bow + long black satin gloves + heels. Straight elegant posture, sophisticated expression. Sophisticated cinematic lighting.
```

**Key Elements:**
- Couture approach (structured bow detail)
- Christmas red signature color
- White tree backdrop (elegant vs. traditional green)
- Standing posture (full-body showcase)
- "Cinematic lighting" - elevated production value

#### Example 3: Cozy Christmas Living Room
```
Image sent — use only real physical characteristics of person (glowing brown skin, slim athletic body, brown hair with natural waves and volume, delicate realistic face). Do not copy pose, setting or lighting. Only general aesthetic. Face always sharp.

Prompt:
Cozy Christmas living room setting with fireplace, garland and warm yellow lights. Model seated comfortably on sofa holding soft white pillow. Wearing short red knit dress, sweet and natural expression with light smile. Soft lighting, Christmas lifestyle vibe. 35-50mm lens.
```

**Key Elements:**
- Cozy lifestyle aesthetic (fireplace, garland, soft pillow)
- Red knit dress (comfortable elegance)
- "Sweet and natural" expression
- "Christmas lifestyle vibe" - relatable luxury
- Flexible lens range (35-50mm for environment context)

#### Example 4: Kitchen Hot Chocolate Moment
```
Image sent — apply only natural physical characteristics (glowing brown skin, slim athletic body, brown eyes, nude pink lips, brown hair with waves). Do not reproduce pose, setting or identical clothing. Only inspiration. Realistic and sharp face.

Prompt:
Modern kitchen setting decorated for Christmas with red arrangements and warm ambient light. Model preparing hot chocolate with golden spoon while smiling naturally. Red velvet outfit look (zip hoodie + shorts). Relaxed posture, cozy luxury vibe. Soft internal lighting.
```

**Key Elements:**
- Activity-based moment (preparing hot chocolate)
- Kitchen setting (relatable, everyday luxury)
- Red velvet athleisure (zip hoodie + shorts)
- Golden spoon detail (luxury touch)
- "Cozy luxury vibe" - aspirational yet accessible

#### Example 5: Luxurious Marble Christmas Setting
```
Image sent — respect only natural physical characteristics of person. Real and sharp face.

Prompt:
Model next to sofa in luxurious setting with marble and decorated white tree. Wearing light pink satin pajamas holding mug with marshmallows. Soft expression, elegant posture. Warm lighting, sophisticated feminine aesthetic.
```

**Key Elements:**
- Marble environment (luxury indicator)
- Satin pajamas (elevated loungewear)
- Marshmallow mug prop (cozy detail)
- Pink color palette (soft femininity vs. traditional red)
- "Sophisticated feminine aesthetic"

#### Example 6: Pinterest Christmas Editorial
```
Reference image sent — maintain only natural physical characteristics of person (soft glow brown skin, slim athletic body, brown hair with natural waves, defined eyebrows, brown eyes, nude pink lips). Do not copy pose, setting, lighting or reference styling. Only general aesthetic inspiration. Face always sharp, realistic.

Prompt:
Cozy Christmas setting with illuminated tree and red bows. Model appears seated on sofa with elegant posture holding warm hot chocolate cup.

She wears candy cane striped pajamas red and white.
Hair is pulled in chic bun decorated with large red velvet bow, with two soft strands framing face.
Delicate expression with closed elegant smile.
Warm and soft light, feminine and romantic atmosphere Pinterest Christmas editorial style.
50mm lens, realistic skin texture.
```

**Key Elements:**
- "Pinterest Christmas editorial style" - specific aesthetic reference
- Candy cane striped pajamas (playful classic)
- Hair accessory as statement (large red velvet bow)
- "Closed elegant smile" - specific expression
- Pinterest-quality aspirational content

#### Example 7: Close-Up Hot Chocolate Cozy
```
Reference image sent — maintain only natural characteristics of person (glow brown skin, slim athletic body, defined eyebrows, brown eyes, nude pink lips and brown hair). Do not copy pose, look or original background. Only aesthetic inspiration. Hyper-realistic face.

Prompt:
Close-up portrait with blurred Christmas background (tree with bokeh lights and red bows).
Model holds warm hot chocolate cup with marshmallows close to face, creating cozy influencer aesthetic composition.

Hair pulled in elegant and modern bun, with loose subtle strands framing face.
Soft expression with closed smile, natural and delicate gaze to camera.
Light glow clean girl style with soft glam finish.
Real skin texture, visible pores, without artificial appearance.
Soft lighting with warm tones, 85mm lens for editorial portrait.
```

**Key Elements:**
- Close-up composition (focus on face + prop)
- Hot chocolate held close to face (composition technique)
- "Cozy influencer aesthetic composition"
- "Clean girl style with soft glam" - trending aesthetic
- "Real skin texture, visible pores" - authenticity emphasis
- 85mm portrait lens for flattering perspective

#### Example 8: Floor Christmas Luxury Portrait
```
Reference image sent — use only natural physical characteristics (glowing brown skin, slim athletic body, nude pink lips, brown eyes, brown hair). Do not copy pose, clothing, background or identical light. Only aesthetic inspiration. Sharp and realistic face.

Prompt:
Elegant setting with large super illuminated white tree with red bows, silver ornaments and warm lights creating bokeh.
Model is seated on floor, leaning on sofa, holding mug with marshmallows and hot chocolate.

Look: candy cane striped pajamas (red and white) classic Christmas aesthetic.
Hair pulled in sophisticated elegant bun, with two loose thin strands framing face.
Soft glam with visible glow skin.
Elegant closed smile, calm and feminine expression.
Warm cinematic lighting luxury Christmas portrait style.
35mm lens, focus on face and realistic texture.
```

**Key Elements:**
- Floor sitting position (casual luxury)
- "Super illuminated" tree (bright, magical)
- Silver ornaments specification
- "Luxury Christmas portrait style" - elevated production
- Multiple hot chocolate props across examples (signature element)

#### Example 10: White Sweater Dress Tree Ornament
```
Image sent — do not copy pose, setting or identical items. Use only original physical characteristics.

Prompt:
Model kneeling near decorated silver tree, holding transparent ornament. Look: white oversized mini sweater dress + long knit socks. Hair pulled back with large white bow. Warm and romantic lighting soft editorial edit style.
```

**Key Elements:**
- Interactive moment (holding ornament)
- Kneeling position (active engagement with tree)
- White monochrome outfit (fresh, clean aesthetic vs. red)
- Long knit socks (cozy detail)
- Silver tree (modern, non-traditional)
- "Soft editorial edit style"

#### Example 11: Red Dress Marble Staircase
```
Reference image: photo sent by user — only to maintain proportions and physical characteristics. Do not copy pose.

Woman is on white marble staircase with golden railing.
She wears a long red dress with high slit and elegant neckline.
One leg is slightly forward, showing slit naturally.
Hand rests on railing, and gaze is direct to camera, strong and feminine expression.
Loose wavy hair, golden jewelry.
Camera 1.8m, 50mm lens, warm soft light indoor editorial style.
```

**Key Elements:**
- Marble staircase (luxury architectural element)
- Golden railing (elegant detail)
- Long red dress with high slit (evening glamour)
- Specific pose direction (leg forward, hand on railing)
- "Strong and feminine expression"
- Camera distance specified (1.8m)
- More formal than other examples (elevated event aesthetic)

---

### Christmas Prompt Quality Analysis

**What Makes These Christmas Prompts Exceptional:**

1. **Color Palette Consistency** - Red, white, gold, pink (classic Christmas luxury)
2. **Prop Integration** - Hot chocolate with marshmallows appears in 6+ prompts
3. **Setting Variety** - Living rooms, kitchens, by trees, on stairs, on floors
4. **Outfit Range** - Pajamas, dresses, athleisure, couture (all elevated)
5. **Hair Styling Details** - Buns with bows, loose strands framing face
6. **Lighting Direction** - Warm tones, soft, cinematic, bokeh from tree lights
7. **Mood Descriptors** - "Cozy luxury", "sophisticated feminine", "Pinterest editorial"

**Common Christmas Elements:**

- 🎄 **Christmas Trees** - White trees (modern), illuminated with bokeh
- ☕ **Hot Chocolate** - With marshmallows (ultimate cozy prop)
- 🎀 **Red Bows** - On trees, in hair, as outfit details
- 🕯️ **Warm Lighting** - Fireplace, string lights, golden tones
- 🎁 **Gift Elements** - Wrapped presents, ornaments as props
- 👗 **Red Outfits** - Dresses, pajamas, velvet athleisure
- 🎀 **Hair Bows** - Large velvet bows, elegant styling
- 🪞 **Marble/Luxury Materials** - Sophisticated settings

**Outfit Categories:**

1. **Cozy Pajamas** - Candy cane stripes, satin, velvet loungewear
2. **Red Dresses** - Knit mini, couture with bows, long with slits
3. **Athleisure Glam** - Zip hoodies, shorts, elevated casual
4. **White Elegance** - Oversized sweater dresses, monochrome clean
5. **Formal Evening** - Black satin with gloves, long gowns

**Lighting Techniques:**

- Christmas tree bokeh (warm out-of-focus lights)
- Fireplace glow (warm, cozy)
- Soft diffused interior lighting
- Cinematic warm tones
- Editorial soft lighting

**Aesthetic References:**

- "Pinterest Christmas editorial style"
- "Cozy luxury vibe"
- "Sophisticated feminine aesthetic"
- "Clean girl style with soft glam"
- "Luxury Christmas portrait style"
- "Cinematic lighting"

**Comparison: Generic vs. Christmas Lifestyle Prompt:**

❌ **Generic Prompt:**
"Woman in Christmas outfit by tree, festive photo"

✅ **Christmas Lifestyle Prompt:**
"Cozy Christmas setting with illuminated tree and red bows. Model seated on sofa with elegant posture holding warm hot chocolate cup. She wears candy cane striped pajamas red and white. Hair pulled in chic bun decorated with large red velvet bow, with two soft strands framing face. Delicate expression with closed elegant smile. Warm and soft light, feminine and romantic atmosphere Pinterest Christmas editorial style. 50mm lens, realistic skin texture."

---

### Seasonal Content Strategic Value

**Why Christmas/Holiday Content Matters:**

1. **Time-Sensitive Demand** - High engagement November-December
2. **E-commerce Driver** - Holiday shopping season content
3. **Emotional Connection** - Nostalgia, family, celebration
4. **Visual Richness** - Colors, lights, props create stunning imagery
5. **Shareability** - Seasonal content gets saved and shared more

**Content Types from These Prompts:**

- **Cozy Home Lifestyle** (Examples 3, 4, 5) - Relatable luxury
- **Elegant Evening** (Examples 1, 2, 11) - Event/party content
- **Pinterest Editorial** (Examples 6, 7, 8) - Aspirational lifestyle
- **Playful Festive** (Example 10) - Interactive, fun moments
- **Behind the Scenes** (Example 4) - Activity-based authenticity

**Cross-Category Potential:**

- Christmas + Wellness (cozy self-care, hot cocoa rituals)
- Christmas + Luxury (marble settings, designer loungewear)
- Christmas + Fashion (red dress moments, styled holiday looks)
- Christmas + Lifestyle (home decoration, entertaining)

---

## 📱 CORE CONTENT CATEGORIES - Strategic Expansion

### Overview: Essential Daily Content Types

While brand-specific content (Chanel, Alo Yoga) and special occasions (Christmas, Travel) are important, **women entrepreneurs need consistent, versatile content for daily business building**. These 6 new categories provide the foundational content types users need every single week.

### Strategic Value

**Why These Categories Matter:**
1. **Daily Usability** - Content needed weekly, not just for special occasions
2. **Universal Appeal** - Every SSELFIE Studio user needs these, regardless of industry
3. **Business Building** - Directly supports "Selfie to CEO" mission
4. **Platform Optimization** - Covers all major content types for Instagram, LinkedIn, TikTok
5. **Authenticity Range** - From polished professional to vulnerable real talk

---

### Category 1: SELFIE STYLES (15 Examples) ⭐⭐⭐⭐⭐

**Strategic Priority: CRITICAL**

This is THE most important category for SSELFIE Studio - it's literally in the name! Users need variety in selfie styles to maintain engaging, diverse content.

**Subcategories:**
- Mirror Selfies (bathroom, bedroom, gym, elevator)
- Close-Up Beauty (golden hour, makeup showcase, natural)
- Car Selfies (morning coffee, post-workout, evening out)
- Golden Hour (window light, outdoor)
- Getting Ready (makeup, hair styling)
- Candid Moments (spontaneous laughter, authentic)

**Key Example - Bathroom Mirror Selfie:**
```
Bathroom mirror selfie in modern minimalist setting. Woman holds phone at eye level, creating classic mirror selfie angle. Clean modern bathroom with marble countertop, soft neutral tones. Casual elevated look: white tank top or ribbed bodysuit, high-waisted jeans. Natural confident posture, direct eye contact with camera. Soft diffused bathroom lighting, natural light from window mixing with artificial. Loose natural waves or sleek straight hair, natural glam makeup. Phone camera POV, slight arm's length distance. Effortless confidence, relatable luxury, "Getting ready" energy, casual and real.
```

**Business Value:**
- Most used content type weekly
- Variety prevents feed monotony
- Different selfie styles for different messages
- Foundation of personal brand visibility

---

### Category 2: PROFESSIONAL/BUSINESS (10 Examples) ⭐⭐⭐⭐⭐

**Strategic Priority: HIGH VALUE**

Directly supports "Selfie to CEO" positioning. Women entrepreneurs NEED professional photos for credibility, authority, and business growth.

**Subcategories:**
- LinkedIn Headshots (classic, modern, creative)
- Conference/Speaking (thought leader positioning)
- Business Casual (modern workplace)
- Podcast Guest (media presence)
- Virtual/Zoom Ready (remote professional)
- Professional Outdoor (versatile locations)

**Key Example - LinkedIn Headshot:**
```
Professional LinkedIn headshot with clean background and approachable executive presence. Head and shoulders portrait, face centered, professional crop. Warm approachable professional smile, eyes engaging and confident. Professional business attire: blazer in neutral (black, navy, gray, beige), crisp blouse. Professional hair styling, polished neat, natural makeup enhanced professionally. Solid neutral background or subtle blur of office environment. Soft even professional lighting, flattering but natural. 50mm lens equivalent, sharp focus on eyes. Professional credibility, approachable expertise, "Hire me / Work with me" confidence.
```

**Business Value:**
- Builds credibility and authority
- Essential for LinkedIn, websites, media kits
- Positions users as serious professionals
- Supports premium pricing and partnerships

---

### Category 3: DAILY LIFESTYLE MOMENTS (12 Examples) ⭐⭐⭐⭐

**Strategic Priority: HIGH ENGAGEMENT**

Authentic daily content that builds connection with audience. Shows the human behind the business, creating relatable touchpoints.

**Subcategories:**
- Coffee Shop Entrepreneur (laptop, productivity)
- Morning Routines (wellness, intentional living)
- OOTD (outfit showcases)
- Workout/Gym (fitness journey)
- Home Office (productivity workspace)
- Night Out Prep (getting glam)
- Sunday Reset (planning, self-care)

**Key Example - Coffee Shop Entrepreneur:**
```
Coffee shop lifestyle photo capturing entrepreneur working with laptop and coffee. Medium shot showing person, laptop, and coffee shop context. Seated at table, focused on laptop OR looking up with smile. Modern coffee shop with aesthetic interior, laptop open on wooden table, latte with art in frame. Casual chic entrepreneur style: comfortable sweater or blouse, jeans. MacBook, aesthetic coffee cup, notebook visible. Warm coffee shop ambiance, natural window light mixing with warm interior. Focused productivity OR friendly pause from work. Digital nomad lifestyle, entrepreneur freedom, productive cozy vibes.
```

**Business Value:**
- Daily content opportunities
- High relatability = high engagement
- Shows lifestyle beyond just business
- Builds authentic audience connection

---

### Category 4: FOOD & SOCIAL (10 Examples) ⭐⭐⭐⭐

**Strategic Priority: SHAREABLE CONTENT**

Food and social moments are highly engaging and shareable. Shows balanced life, celebration, and human connection.

**Subcategories:**
- Coffee Moments (morning rituals, aesthetic)
- Restaurant Dining (solo confidence, social groups)
- Brunch Aesthetic (weekend lifestyle, celebrations)
- Cooking at Home (chef mode, content demos)
- Wine/Cocktails (sophistication, unwinding)

**Key Example - Brunch Aesthetic:**
```
Weekend brunch photo with beautiful food presentation and leisurely dining. Overhead or angled shot, food spread visible with person enjoying. Beautiful brunch: avocado toast, pancakes, fresh fruit, mimosa or coffee visible. Trendy brunch spot OR beautiful home setup. Casual chic brunch outfit: sundress, cute top and jeans. Bright fresh daytime light, morning/early afternoon brightness. Content indulgent expression, enjoying weekend pace. Weekend brunch life, self-care through good food, leisurely living, weekend wellness.
```

**Business Value:**
- High shareability (food content performs well)
- Shows balanced lifestyle
- Celebration content for milestones
- Relatability through universal experiences

---

### Category 5: CONFIDENCE BUILDERS (8 Examples) ⭐⭐⭐⭐⭐

**Strategic Priority: EMPOWERMENT MISSION**

Aligns perfectly with SSELFIE Studio's mission of visibility = economic power. Content that inspires and empowers.

**Subcategories:**
- Power Pose (CEO energy, casual confidence)
- Celebration Moments (milestones, everyday wins)
- Transformation (progress journey, before/after)
- Affirmation Style (motivational content)
- Vulnerability (real talk, authenticity)

**Key Example - Power Pose CEO Energy:**
```
Power pose photo radiating CEO energy and unshakeable confidence. Full body or three-quarter shot, power stance visible. Classic power positioning: hands on hips, arms crossed confidently, standing tall. Power outfit: suit, blazer, executive attire. Professional environment: office, city backdrop. Upright posture, shoulders back, chin up. Confident determined expression, "I belong here" energy. Strong clear lighting. "CEO energy," power confidence, "I run this," executive presence, unapologetic ambition.
```

**Business Value:**
- Directly supports brand mission
- Inspirational content gets high engagement
- Builds authority and confidence
- Attracts aspirational audience

---

### Category 6: CONTENT CREATOR ESSENTIALS (8 Examples) ⭐⭐⭐⭐

**Strategic Priority: META-CONTENT**

Behind-the-scenes and process content. Shows the work behind the brand, builds transparency and expertise.

**Subcategories:**
- Unboxing (product reveals, PR packages)
- Review/Demo (product testing, results)
- BTS Studio (creation workspace, filming setup)
- Planning/Strategy (content calendar, business side)
- Community Engagement (responding, connection)

**Key Example - BTS Studio Setup:**
```
Behind the scenes photo showing content creation setup and professional workspace. Creator in workspace with equipment visible, setup shown. Ring light, camera, tripod, laptop, lighting setup visible. Setting up equipment OR mid-content creation. Content creation space: home studio, organized creator corner. Organized supplies, aesthetic background setups, professional equipment. Content creator casual wear. Creator lighting visible: ring light on, professional setup illuminated. "This is how I create" energy. Behind the scenes, content creator life, workspace goals, professional creator status.
```

**Business Value:**
- Educational content (teaches audience)
- Transparency builds trust
- Shows professional approach
- Positions as expert content creator

---

### Cross-Category Strategic Combinations

These categories work powerfully together:

**For Building Authority:**
- Professional Headshot + Power Pose + Conference Speaking = Thought Leader

**For Daily Engagement:**
- Morning Routine + Coffee Shop + OOTD = Relatable Lifestyle  

**For Celebration Content:**
- Confidence Builder + Food & Social + Getting Ready = Milestone Moments

**For Authentic Connection:**
- Vulnerability + Daily Lifestyle + Community Engagement = Real Human Brand

---

### Implementation Priority

**Phase 1 (Implement Immediately):**
1. **Selfie Styles** - Core offering, highest daily use
2. **Professional/Business** - Mission-critical, high value
3. **Daily Lifestyle** - Consistent content opportunities

**Phase 2 (Next Month):**
4. **Confidence Builders** - Brand alignment
5. **Food & Social** - Engagement drivers
6. **Content Creator** - Meta-content value

---

**TOTAL PROMPT LIBRARY NOW:**
- **Brand-Specific**: Alo Yoga (10), Chanel (10) = 20 prompts
- **Occasions**: Travel (11), Christmas (11) = 22 prompts
- **Core Content**: 63 new prompts across 6 categories
- **GRAND TOTAL: 105 Professional Prompt Examples**

---

## 🎨 BRAND CATALOG STRUCTURE

### Wellness Brands
- **Alo Yoga** - Athletic luxury, wellness lifestyle
- **Lululemon** - Performance meets lifestyle
- **Athleta** - Empowered active living
- **Outdoor Voices** - Recreation-focused wellness

### Luxury Brands  
- **Chanel** - Timeless French luxury ✅ EXAMPLES ADDED
- **Dior** - Romantic haute couture
- **Hermès** - Understated sophistication
- **Gucci** - Bold contemporary luxury

### Lifestyle Brands
- **Glossier** - Minimal beauty, "skin first"
- **Goop** - Wellness-driven luxury lifestyle
- **Free People** - Bohemian romantic
- **Reformation** - Sustainable feminine style

### Fashion Brands
- **Everlane** - Radical transparency, minimal
- **Aritzia** - Elevated everyday style
- **Madewell** - Effortless American classic
- **& Other Stories** - European editorial style

### Travel & Lifestyle
- **Airport Aesthetic** - Luxury travel, influencer style, quiet luxury ✅ EXAMPLES ADDED
- **"It Girl" Travel** - Effortless airport style, designer luggage, coffee moments
- **Wanderlust Lifestyle** - Pre-boarding vibes, terminal aesthetics, travel confidence

### Seasonal & Holiday
- **Christmas/Holiday** - Cozy luxury, festive glamour, seasonal lifestyle ✅ EXAMPLES ADDED
- **Valentine's Day** - Romantic elegance, soft femininity
- **Summer Seasonal** - Beach luxury, vacation vibes

### Core Content Categories (NEW)
- **Selfie Styles** - Mirror, beauty, car, golden hour, getting ready ✅ 15 EXAMPLES ADDED
- **Professional/Business** - LinkedIn headshots, conference, business casual ✅ 10 EXAMPLES ADDED
- **Daily Lifestyle** - Coffee shop, morning routines, OOTD, home office ✅ 12 EXAMPLES ADDED
- **Food & Social** - Coffee moments, dining, brunch, cooking ✅ 10 EXAMPLES ADDED
- **Confidence Builders** - Power poses, celebrations, transformations ✅ 8 EXAMPLES ADDED
- **Content Creator** - Unboxing, reviews, BTS, community engagement ✅ 8 EXAMPLES ADDED

---

## 📦 SCALABILITY STRATEGY

### Adding New Brands

```typescript
// Simple 3-step process:

// 1. Add brand profile to registry
export const NEW_BRAND = {
  id: 'brand-id',
  name: 'Brand Name',
  // ... aesthetic details
}

// 2. Create template (copy existing, modify aesthetics)
export const NEW_BRAND_TEMPLATE = { /* ... */ }

// 3. Export in category file
export const WELLNESS_BRANDS = {
  ALO_YOGA_LIFESTYLE,
  NEW_BRAND_TEMPLATE,
  // ...
}
```

### User-Contributed Brands

Future feature: Users can submit their own brand aesthetics:

```typescript
interface UserBrandProfile {
  name: string
  referenceImages: string[] // Pinterest, Instagram refs
  aiAnalyzedAesthetic: BrandAesthetic // Generated by Maya
  userApproved: boolean
}
```

---

## 🚀 IMPLEMENTATION CHECKLIST

### Week 1: Foundation
- [ ] Create `high-end-brands/` folder structure
- [ ] Build brand registry with 4-5 initial brands
- [ ] Create category mapper
- [ ] Build wellness brand templates (Alo, Lululemon)
- [ ] Build luxury brand templates (Chanel, Dior)

### Week 1-2: Integration
- [ ] Update concept generation API
- [ ] Enhance prompt builder
- [ ] Add brand detection logic
- [ ] Test with real user prompts
- [ ] Refine prompt quality

### Week 2: Polish
- [ ] Add 10+ more brands across categories
- [ ] Create Maya personality responses for brand selection
- [ ] Build brand quick-access system
- [ ] Documentation for adding new brands
- [ ] User testing and refinement

---

## 💡 USER EXPERIENCE EXAMPLES

### Example 1: Simple Request
```
User: "Create Alo yoga content for me"

Maya: "YES! Love the Alo vibe ✨ Creating 3 wellness lifestyle concepts with that premium athletic aesthetic...

[GENERATE_CONCEPTS] alo yoga wellness lifestyle athletic"

Result: 3 concept cards with detailed Alo-style prompts
```

### Example 2: Category Request
```
User: "I need luxury fashion editorial content"

Maya: "Ooh, going high fashion! Let's create some editorial magic ✨ 

Which vibe speaks to you:
- Chanel (timeless French elegance)
- Dior (romantic femininity)
- Gucci (bold contemporary)
- Or surprise me!

[GENERATE_CONCEPTS] luxury fashion editorial sophisticated"
```

### Example 3: Lifestyle Request
```
User: "Clean girl aesthetic for my brand"

Maya: "The clean girl aesthetic is SO good for visibility! Minimal, glowy, effortless... 

Creating concepts with that Glossier-inspired look ✨

[GENERATE_CONCEPTS] clean girl lifestyle minimal glossier"
```

---

## 🔧 TECHNICAL IMPLEMENTATION DETAILS

### File Changes Required

#### 1. New Files (Create)
```
lib/maya/prompt-templates/high-end-brands/
  ├── index.ts
  ├── brand-registry.ts
  ├── category-mapper.ts
  ├── wellness-brands.ts
  ├── luxury-brands.ts
  ├── lifestyle-brands.ts
  ├── fashion-brands.ts
  └── prompt-builder.ts
```

#### 2. Modified Files (Update)
```
app/api/maya/generate-concepts/route.ts
  - Add brand detection
  - Enhance system prompt with brand aesthetics
  
lib/maya/nano-banana-prompt-builder.ts
  - Add high-end brand case
  - Import brand templates
  
lib/maya/pro-personality.ts
  - Add brand awareness responses
  - Add category quick-access triggers
```

#### 3. No Changes Needed
```
components/sselfie/concept-card.tsx
  - Existing image selection works perfectly
  
app/api/maya/generate-studio-pro
  - No changes needed, uses prompt from concept
```

---

## 🎯 SUCCESS METRICS

### Quality Indicators
- Prompts match high-end brand aesthetics
- Users generate professional content without editing prompts
- Consistent brand style across generations

### User Experience
- Clear brand/category selection
- Fast concept generation
- Easy to add new brands

### Scalability
- Simple 3-step process to add brands
- Modular template system
- Maintainable codebase

---

## 📋 NEXT STEPS

1. **Review this strategy** - Approve approach
2. **Create Cursor prompts** - Detailed implementation instructions
3. **Build foundation** - Brand registry + templates
4. **Test and iterate** - Real user testing
5. **Scale** - Add more brands and categories

---

## 💬 QUESTIONS TO ANSWER

1. **Initial Brand Set**: Start with 4-5 brands or 10+?
2. **UI Enhancement**: Add visual brand selector or keep chat-based?
3. **User Brands**: Allow users to define custom brands?
4. **Pricing**: Premium feature or included in Pro mode?
5. **Language**: Support multilingual brand prompts (Portuguese/English)?