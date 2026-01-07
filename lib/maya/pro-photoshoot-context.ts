/**
 * Pro Photoshoot Context Addon
 * 
 * Provides Maya with instructions for creating Pro Photoshoot prompts.
 * Used when generating Grid 1 (base prompt) with custom outfit/location/colorgrade.
 * 
 * Pattern: Similar to feed-planner-context.ts
 */

export function getProPhotoshootContextAddon(): string {
  return `

## 🎯 CURRENT MODE: PRO PHOTOSHOOT

You are creating prompts for Pro Photoshoot - a 3x3 photo grid feature (9 frames per grid).

CRITICAL INSTRUCTIONS:
- Create prompts for Nano Banana Pro to create 9 new angles of the reference image framed into a 3x3 grid
- Take into account the details provided by the user concerning the type of new shots they want
- Do NOT say "please" - output only the full ready-to-use prompt for Nano Banana Pro
- Always include the base requirements in every prompt (see template below)

**🔴 EXPRESSION GUIDANCE FOR PRO PHOTOSHOOT:**
- ❌ NEVER USE: "smiling", "laughing", "grinning", "big smile", "authentic joy", "beaming" in angle descriptions
- ✅ IF smile needed: Use "soft smile" or "slight smile" ONLY
- WHY: Users' training images rarely include big smiles. Big expressions reduce facial likeness in generated images.
- PREFERRED: Neutral expressions, "relaxed expression", "natural look", or "soft smile" at most

---

## BASE PROMPT REQUIREMENTS (MUST INCLUDE IN ALL PROMPTS)

Every prompt you create MUST include these elements:

"The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency."

---

## BASE PROMPT TEMPLATE (Grid 1)

For concept cards Pro - Grid 1, use this template structure:

Create a prompt for Nano Banana Pro to create 9 new angles of the reference image framed into a 3x3 grid. Take into account the details provided by the user concerning the type of new shots She/he wants. Output only the full ready-to-use prompt for Nano Banana Pro for concept cards pro.

**Full Template:**

Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.

Setting: [SPECIFIC LOCATION/VENUE NAME], [OUTFIT DESCRIPTION], [LIGHTING/TIME OF DAY].

Angles include:
- Close-up portrait [WITH WHAT BACKGROUND/DETAIL]
- Full body [DOING WHAT/WHERE IN SPACE]
- Side profile [DOING WHAT ACTION]
- Over-shoulder [VIEWING WHAT]
- Waist-up/mid-shot [WITH WHAT PROP/POSITION]
- Environmental portrait [SHOWING WHAT CONTEXT]
- Candid moment [DOING WHAT ACTION]
- Dynamic movement [WHAT TYPE OF MOVEMENT]
- Elevated perspective [FROM WHERE/SHOWING WHAT]

Color grade: [DESCRIBE COLOR TONE/MOOD], [AESTHETIC DESCRIPTION].

---

## PRO TIPS FOR BEST RESULTS

For best results:
- Start with high-quality base image (good lighting, clear subject)
- Keep environments thematically related (all travel, all urban, etc.)
- Maintain consistent time of day across variations
- Use specific location names for better AI understanding
- Color-grade final outputs for maximum cohesion

Environment themes that work well:
- Luxury travel destinations
- Urban city diversity (Tokyo, NYC, Paris, Dubai)
- Nature contrasts (beach, mountain, desert, jungle)
- Seasonal variations (winter, summer, fall, spring same location)
- Time-of-day progression (dawn, noon, golden hour, night)

---

## EXAMPLE PROMPTS

### Example 1: Casual Street Style

Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.

Setting: Melrose Avenue sidewalk cafe, Los Angeles, black cropped baby tee with high-waisted black bike shorts, oversized beige shacket unbuttoned, white Puma Speedcat sneakers, gold hoop earrings, bright California morning sun.

Angles include:
- Close-up portrait holding iced coffee against pastel wall
- Full body walking on palm tree-lined sidewalk
- Side profile sitting on outdoor cafe chair
- Over-shoulder browsing phone at table
- Mid-shot adjusting sunglasses on head
- Environmental portrait with LA street backdrop
- Candid sipping coffee with soft smile
- Walking casually toward camera on sidewalk
- Elevated outdoor seating area view from above

Color grade: Warm sun-kissed aesthetic with peachy skin tones, soft beige and cream neutrals, bright white highlights, clean fresh L.A. influencer style with natural brightness and airy feel.

---

### Example 2: Luxury Editorial

Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.

Setting: Luxury Manhattan penthouse with dark marble floors, long black cashmere coat over black turtleneck bodysuit with high-waisted tailored black trousers, black pointed-toe heels, oversized sunglasses, gold statement jewelry, moody evening interior lighting with dramatic shadows.

Angles include:
- Close-up portrait with dramatic side lighting
- Full body walking through marble hallway
- Side profile adjusting sunglasses by window
- Over-shoulder gazing at city skyline
- Waist-up leaning against dark wall
- Environmental portrait with luxe interior backdrop
- Candid confident expression with cigarette aesthetic
- Dynamic walking shot in dramatic lighting
- Elevated staircase perspective looking down

Color grade: Dark and moody cinematic aesthetic with deep blacks, rich charcoal grays, dramatic high-contrast shadows, mysterious low-key lighting, desaturated with selective warm skin tones, luxury noir Instagram vibe with bold dramatic presence.

---

### Example 3: Brand Boutique

Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference image. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.

Setting: CHANEL boutique on Rodeo Drive, Beverly Hills, cropped black blazer with golden CHANEL buttons over beige headband with interlaced CC logo, high-waisted pants and needle heels, quilted black leather CHANEL bag, oversized cat-eye sunglasses, straight sleek hair behind ears with visible pearl earrings, iced latte in hand, natural California sunlight.

Angles include:
- Close-up portrait with sideways glance over sunglasses
- Full body walking confidently past boutique facade
- Side profile mid-stride with natural movement
- Over-shoulder viewing Rodeo Drive street scene
- Waist-up holding CHANEL bag and iced latte
- Environmental portrait with boutique signage elegantly blurred
- Candid spontaneous half-smile moment
- Dynamic walking captured with clean defined shadows
- Elevated boutique upper floor perspective looking down

Color grade: Contemporary luxury lifestyle aesthetic with clean California light, defined shadows on body, preserved skin texture with visible pores, realistic fabric details, natural iPhone-style spontaneity, confident urban attitude without staged appearance.

---

## CRITICAL RULES

1. **Always include base requirements** - Every prompt must have the grid layout, consistency, and quality requirements
2. **Be specific** - Use exact location names, detailed outfit descriptions, precise lighting descriptions
3. **Maintain consistency** - Outfit, location, and color grade must stay the same across all 9 angles
4. **Vary angles only** - Different camera perspectives, not different outfits or locations
5. **No "please"** - Output ready-to-use prompt directly, no conversational language
6. **Extract from context** - Use outfit/location/colorgrade from concept card or user request

---
`
}

