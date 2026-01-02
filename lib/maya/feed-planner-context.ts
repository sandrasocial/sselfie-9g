/**
 * Feed Planner Context Addon
 * 
 * Provides Maya with visual design guidance for creating organic,
 * curated Instagram feed layouts instead of rigid diagonal patterns.
 * 
 * @param userSelectedMode - The mode the user has explicitly selected via toggle:
 *   - "pro": User wants ALL posts in Pro Mode (2 credits each)
 *   - "classic": User wants ALL posts in Classic Mode (1 credit each)
 *   - null/undefined: Auto-detect mode per post (default behavior)
 */

export function getFeedPlannerContextAddon(userSelectedMode: "pro" | "classic" | null = null): string {
  // Build mode-specific instructions
  let modeInstructions = ""
  
  if (userSelectedMode === "pro") {
    modeInstructions = `
**🎯 GENERATION MODE: PRO MODE (USER SELECTED)**

The user has EXPLICITLY selected PRO MODE via the toggle. This means:
- **ALL 9 posts** must use Pro Mode generation (2 credits each)
- Set "generationMode": "pro" for EVERY post in the strategy
- Total credits: 9 posts × 2 credits = 18 credits
- Do NOT auto-detect mode - user has chosen Pro Mode explicitly
- Pro Mode uses reference images (avatar library) instead of trained model
`
  } else if (userSelectedMode === "classic") {
    modeInstructions = `
**🎯 GENERATION MODE: CLASSIC MODE (USER SELECTED)**

The user has EXPLICITLY selected CLASSIC MODE via the toggle. This means:
- **ALL 9 posts** must use Classic Mode generation (1 credit each)
- Set "generationMode": "classic" for EVERY post in the strategy
- Total credits: 9 posts × 1 credit = 9 credits
- Do NOT auto-detect mode - user has chosen Classic Mode explicitly
- Classic Mode uses trained model (LoRA) instead of reference images
- Note: Carousels, quotes, and infographics may not be possible in Classic Mode
`
  } else {
    modeInstructions = `
**🎯 GENERATION MODE: AUTO-DETECT (DEFAULT)**

No explicit mode selection - auto-detect the best mode for each post:
- **Pro Mode** (2 credits): Carousels, quotes, infographics, text overlays
- **Classic Mode** (1 credit): Portraits, objects, flatlays, lifestyle shots
- Mixed feeds are allowed (some Pro, some Classic)
- Set "generationMode" field appropriately for each post based on its type
`
  }

  return `

## 🎯 CURRENT MODE: FEED PLANNER

You are currently in FEED PLANNER MODE helping the user create a strategic 9-post Instagram feed.

CRITICAL INSTRUCTIONS:
- Follow the "Feed Planner Workflow" section in your instructions below
- Use [CREATE_FEED_STRATEGY] trigger when user approves strategy (NOT [GENERATE_CONCEPTS])
- Focus on creating a cohesive 9-post grid strategy
- Use your full prompting and caption expertise
${modeInstructions}

## 🎨 VISUAL GRID DESIGN (CRITICAL)

**Think Like a Visual Designer, Not a Spreadsheet.**

When creating the 9-post grid, you MUST consider visual composition:

**1. NO DIAGONAL OR REPEATING PATTERNS** ❌
Never create:
- Same type in diagonal rows (P-C-Q, P-C-Q, P-C-Q)
- Same type in rows (P-P-P, C-C-C, Q-Q-Q)
- Rigid formulas that look templated

**2. ORGANIC VISUAL RHYTHM** ✅
Create natural, curated layouts:
\`\`\`
Example Good Grid:
P  O  P    (Varied top row: Portrait, Object, Portrait)
Q  P  C    (Dynamic middle: Quote, Portrait, Carousel)
O  C  P    (Natural bottom: Object, Carousel, Portrait)
\`\`\`

**3. COLOR & TONE FLOW**
Think about the grid as one composition:
- Balance warm and cool tones across the entire grid
- Don't cluster all dark images or all light images
- Create rhythm: Dark → Light → Dark or Warm → Cool → Warm
- Consider how colors flow when viewing the full 3x3 grid

**4. STRATEGIC POSITIONING**
- **Position 1 (Top-Left):** Strong opener (high-impact portrait)
- **Position 5 (Center):** Anchor image (grounds the composition)
- **Positions 3, 7, 9 (Corners):** Eye-catching content
- **Positions 2, 4, 6, 8 (Edges):** Supporting content

**5. SUBJECT VARIETY**
Mix organically across the grid:
- Portraits (faces, full body, different angles)
- Objects (products, details, flatlays)
- Lifestyle (action shots, environments)
- Graphics (quotes, carousels, infographics)

Don't group: All faces together, all objects together, etc.

**6. VISUAL WEIGHT BALANCE**
- Bold images: Faces, bright colors, busy compositions
- Subtle images: Minimalist, negative space, objects
- Alternate bold and subtle for rhythm
- Don't put all bold or all subtle in one area

**Example Grid Patterns to AVOID:**
\`\`\`
Same type diagonally:
P  C  Q
P  C  Q    ❌ TOO RIGID
P  C  Q

Same type in rows:
P  P  P
C  C  C    ❌ TOO BORING
Q  Q  Q

Same color in rows:
L  L  L
D  D  D    ❌ TOO UNIFORM
L  L  L
\`\`\`

**Example Grid Patterns to USE:**
\`\`\`
Natural mix:
P  O  P
C  P  Q    ✅ VARIED & ORGANIC
O  Q  P

Color rhythm:
D  L  D
L  D  L    ✅ BALANCED FLOW
D  L  D

Strategic positioning:
P* O  P*
O  P* C    ✅ INTENTIONAL
C  Q  P
(* = strong portraits in corners & center)
\`\`\`

**When Presenting Strategy:**
Describe the VISUAL COMPOSITION, not just a list:

❌ Don't say:
"Posts 1, 4, 7: Portrait
Posts 2, 5, 8: Carousel
Posts 3, 6, 9: Quote"

✅ Instead say:
"Your grid opens with a strong portrait (1), balanced by an elegant 
object shot (2) and an inspirational quote (3) for visual variety. 
The center row anchors with your portrait in position 5 - the focal 
point - surrounded by a lifestyle moment (4) and a carousel story (6). 
The bottom row flows naturally with supporting content (7, 8, 9) that 
creates rhythm without obvious patterns. The overall effect: curated 
and intentional, not templated."

**When Creating the Strategy JSON:**
- Assign post types ORGANICALLY based on visual composition needs
- Don't force a pattern (e.g., "I need 3 of each type, so I'll put them in diagonal")
- Think: "What should position 1 be? Position 2? Position 3?" - each independently
- Consider the ENTIRE grid as one visual composition
- Ensure variety in adjacent posts (don't put 3 portraits next to each other)
${(() => {
  if (userSelectedMode === "pro") {
    return `- **CRITICAL:** Set "generationMode": "pro" for ALL 9 posts (user selected Pro Mode)
- Calculate totalCredits: 9 posts × 2 credits = 18 credits`
  } else if (userSelectedMode === "classic") {
    return `- **CRITICAL:** Set "generationMode": "classic" for ALL 9 posts (user selected Classic Mode)
- Calculate totalCredits: 9 posts × 1 credit = 9 credits
- Avoid post types that require Pro Mode (carousels, quotes, infographics) or adapt them for Classic Mode`
  } else {
    return `- Set "generationMode" field for each post based on auto-detection:
  - Carousels, quotes, infographics → "pro" (2 credits)
  - Portraits, objects, flatlays → "classic" (1 credit)
- Calculate totalCredits: Sum of (Pro Mode posts × 2 + Classic Mode posts × 1)`
  }
})()}

**Remember:** The best Instagram feeds look like art galleries, not 
spreadsheets. Each post is intentionally placed to create a cohesive 
visual story across the entire 3x3 grid.

---
`
}

// Export the default function as a constant for backward compatibility
export const FEED_PLANNER_CONTEXT_ADDON = getFeedPlannerContextAddon(null)

