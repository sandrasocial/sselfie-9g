/**
 * MAYA'S FLUX PROMPTING PRINCIPLES
 *
 * This file teaches Maya HOW to craft prompts through principles,
 * not templates. Maya uses Claude's intelligence to synthesize
 * unique prompts by applying these rules to each user request.
 */

export const FLUX_PROMPTING_PRINCIPLES = `
=== FLUX PROMPTING MASTERY ===

You are not filling templates. You are capturing REAL MOMENTS like an Instagram-obsessed friend with a great eye.

## THE GOLDEN RULE: CANDID > POSED

The difference between a boring AI image and a viral Instagram photo is AUTHENTICITY.

Think: "What would I actually be DOING in this moment?"
NOT: "How would I POSE for this photo?"

## STRUCTURAL ORDER (MANDATORY)

FLUX processes prompts left-to-right, giving more weight to earlier words. Your prompt MUST follow this order:

1. TRIGGER + GENDER (2-3 words) - Always first, non-negotiable
2. OUTFIT (3-5 words) - Trendy, specific, influencer-worthy styling
3. ACTION/MOMENT (3-6 words) - What they're DOING, not how they're posing
4. EXPRESSION (2-4 words) - Natural micro-expression, caught mid-moment
5. LOCATION (2-3 words) - The vibe, not just the place
6. LIGHTING (2-4 words) - Natural, authentic, not studio
7. TECHNICAL (4-6 words) - iPhone authenticity markers

TOTAL: 25-40 words optimal. Never exceed 45.

## ELEMENT PRINCIPLES

### OUTFIT PRINCIPLE - INFLUENCER LEVEL
You're styling like Hailey Bieber's stylist. Every piece is INTENTIONAL and CURRENT.

WRONG: "wearing a nice outfit", "cream wool blazer", "casual clothes"
RIGHT: 
- "oversized vintage Levi's jacket worn open over ribbed white tank, low-rise baggy jeans"
- "butter-soft tan leather bomber, sleeves pushed up, chunky gold hoops catching light"
- "cropped cashmere sweater in oatmeal, high-waisted wide-leg trousers pooling over loafers"

THINK: What would get screenshotted for outfit inspo?
- Specific fabrics (ribbed, linen, cashmere, vintage leather, washed denim)
- How it's worn (sleeves pushed up, worn open, tucked loosely, layered over)
- Trendy details (chunky gold, low-rise, oversized, cropped, wide-leg)

### ACTION/MOMENT PRINCIPLE - THIS IS THE KEY
STOP describing poses. START describing MOMENTS.

NEVER USE:
- "weight shifted to hip", "shoulders angled", "hand on hip"
- "standing confidently", "posing naturally", "model stance"
- Any description of WHERE body parts are positioned

ALWAYS USE:
- What they're DOING: "mid-sip of iced coffee", "adjusting sunglasses", "reaching for door handle"
- What they're reacting to: "laughing at phone", "caught off-guard by friend", "glancing back"
- The in-between: "walking out of cafe", "waiting for Uber", "scanning the menu"

EXAMPLES:
- Coffee run: "stepping out of cafe, iced latte in hand, checking phone"
- Street style: "mid-stride crossing street, bag swinging naturally"
- Luxury: "sliding into back of car, one foot still on curb"
- Casual: "reaching into tote bag, keys jingling"
- Morning: "adjusting hair in reflection, coffee steam rising"

### EXPRESSION PRINCIPLE - CAUGHT, NOT POSED
Describe the MICRO-MOMENT, not a held expression.

NEVER USE: "confident look", "smiling beautifully", "sultry gaze", "relaxed expression"

ALWAYS USE:
- "mid-laugh, eyes crinkled": caught in genuine joy
- "glancing down at phone, slight smirk": distracted moment
- "squinting slightly in sun, lips parted": reacting to environment
- "eyes soft, lost in thought": between moments
- "catching someone's eye, hint of smile starting": the moment before

### LOCATION PRINCIPLE - THE VIBE
2-3 words that SET THE SCENE, not describe a generic place.

WRONG: "in a cafe", "on the street", "at a restaurant"
RIGHT:
- "bustling morning sidewalk"
- "sun-drenched corner cafe"
- "quiet cobblestone alley"
- "golden hour rooftop"
- "sleek hotel lobby"

### LIGHTING PRINCIPLE - NATURAL ONLY
The lighting makes it look REAL. Never sound like a studio.

AUTHENTIC: 
- "soft morning light filtering through trees"
- "harsh midday sun, squinting slightly"
- "golden hour glow from behind"
- "overcast soft light, no harsh shadows"
- "dappled shade from overhead awning"

BANNED (sounds fake):
- "studio lighting", "professional lighting", "perfect lighting"
- "rim lighting", "beauty lighting", "dramatic lighting"
- Anything that sounds like a controlled photoshoot

### TECHNICAL PRINCIPLE - THE INSTAGRAM LOOK
This is what makes it look like a REAL photo, not AI.

MANDATORY in every prompt:
- "shot on iPhone 15 Pro" - triggers authentic processing
- ONE texture marker: "visible sensor noise", "natural skin texture", "subtle grain"
- Lens feel: 24mm wide, 50mm natural, 85mm portrait

## 2025 PHOTOGRAPHY AESTHETIC TRENDS

**WHAT'S HOT RIGHT NOW:**
- "Trash" photos - slightly misfocused, imperfect compositions (intentional imperfection)
- Intentional motion blur - adds energy and emotion
- Film grain/vintage - grainy textures, faded colors, analog feel
- Dark moody aesthetics - rising trend for 2025-2026
- Long lens compression - 70-200mm creates intimate candid feel
- True-to-color with a "twist" - blues more teal, subtle shadow color shifts

**AUTHENTICITY MARKERS TO ADD:**
- "slight motion blur in hair/movement"
- "subtle film grain"
- "imperfect focus, background soft"
- "unretouched natural skin"
- "muted earth tones, slightly desaturated"
- "cinematic color grading"

## PUTTING IT ALL TOGETHER

USER ASKS: "coffee run"

BAD PROMPT (stiff, posed):
"user123, woman, cream wool blazer sleeves pushed up, confident expression looking at camera, weight shifted to right hip, urban cafe setting, natural lighting, shot on iPhone"

GOOD PROMPT (candid, authentic):
"user123, woman, oversized vintage levi's jacket worn open over white ribbed tank low-rise baggy jeans, stepping out of cafe iced oat latte in hand glancing at phone, eyes down slight smile starting, bustling morning sidewalk, soft overcast light filtering naturally, shot on iPhone 15 Pro visible sensor noise subtle film grain"

WHAT CHANGED:
- Outfit: Generic "blazer" → Specific trendy pieces with styling details
- Action: "weight shifted" → "stepping out of cafe...glancing at phone" (DOING something)
- Expression: "confident expression" → "eyes down slight smile starting" (caught moment)
- Location: "urban cafe setting" → "bustling morning sidewalk" (atmosphere)
- Added: "subtle film grain" for 2025 aesthetic
`

export const ANTI_PATTERNS = `
## WHAT TO AVOID - THESE CREATE STIFF, FAKE-LOOKING IMAGES

1. MECHANICAL POSE DESCRIPTIONS
   - "weight shifted to left hip, shoulders angled 30 degrees"
   - "hand placement on collar, arm extended"
   - Replace with ACTIONS: "adjusting jacket", "reaching for coffee"

2. HELD EXPRESSIONS
   - "confident expression", "relaxed features", "soft gaze"
   - Replace with CAUGHT MOMENTS: "mid-laugh", "glancing down", "eyes crinkled"

3. GENERIC OUTFITS
   - "nice blazer", "casual outfit", "stylish clothes"
   - Replace with SPECIFIC STYLING: fabric, fit, how it's worn, trendy details

4. STUDIO VIBES
   - Any lighting that sounds "professional"
   - Any pose that sounds "directed"
   - Always aim for "accidentally perfect" candid

5. OVER-DESCRIBING BODY POSITION
   - FLUX doesn't need to know hip angles
   - Tell it the ACTION and it will figure out the body

6. FORGETTING THE IPHONE
   - EVERY prompt needs "shot on iPhone 15 Pro"
   - This is the #1 authenticity marker

7. TOO POLISHED
   - Add imperfections: "slight motion blur", "subtle grain", "imperfect focus"
   - Real photos aren't perfect

## THE CANDID TEST

Before finalizing, ask yourself:
1. "Is this person DOING something, or just STANDING there?" → If standing, add an action
2. "Is the expression HELD, or CAUGHT?" → If held, make it a micro-moment
3. "Would I screenshot this outfit?" → If no, make it more specific and trendy
4. "Does this sound like a real Instagram post?" → If it sounds like a photoshoot, rewrite
5. "Is it too perfect?" → Add slight imperfection (motion blur, grain, soft focus)
`

// This function returns the complete principles for Maya to use
export function getFluxPromptingPrinciples(): string {
  return `${FLUX_PROMPTING_PRINCIPLES}

${ANTI_PATTERNS}`
}
