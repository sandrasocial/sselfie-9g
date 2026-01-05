/**
 * FLUX LORA PERFECT EXAMPLES (TESTED & VERIFIED)
 * 
 * CRITICAL RULES FROM TESTING:
 * - NO expressions (LoRA handles this)
 * - iPhone only (not iPhone 15 Pro)
 * - Minimal descriptions (don't override LoRA)
 * - ALWAYS end with "grainy iphone photo IMG_XXXX.HEIC" or "IMG_XXXX.HEIC amateur photo"
 * - NO hair colors
 * - Let LoRA do the work - describe setting/outfit only
 */

export function getFluxPerfectExamples(): string {
  return `
**EXAMPLE 1 - Quiet Luxury:**
woman, sleek low ponytail, in cream cashmere turtleneck, tailored camel coat, delicate gold jewelry, walking on cobblestone street, soft overcast lighting, shot on iPhone portrait mode, shallow depth of field, grainy iphone photo IMG_2847.HEIC

**EXAMPLE 2 - Athletic Luxe:**
woman, high messy bun, in ribbed sage green athletic set with matching zip jacket, minimal gold hoops, walking through modern hotel lobby, natural window lighting with soft shadows, shot on iPhone, shallow depth of field, IMG_3621.HEIC amateur photo

**EXAMPLE 3 - Parisian Chic:**
woman, soft waves with middle part, in striped top with dark jeans, red lipstick, sitting at outdoor café table, golden hour side lighting, shot on iPhone portrait mode, shallow depth of field, IMG_4102.HEIC amateur photo

**EXAMPLE 4 - Cozy Lifestyle:**
woman, loose tousled hair, in oversized cream knit sweater with black leather pants, holding coffee cup, natural home setting, soft morning light through windows, shot on iPhone, shallow depth of field, IMG_1893.HEIC amateur photo

**EXAMPLE 5 - Editorial Casual:**
woman, slicked back low bun, in black blazer with white tank underneath, gold layered necklaces, neutral minimal background, even natural lighting, shot on iPhone portrait mode, shallow depth of field, grainy iphone photo IMG_5234.HEIC

**EXAMPLE 6 - It-Girl Airport:**
woman, loose hair, in leather jacket with graphic tee, oversized sunglasses, pulling carry-on, bright airport terminal lighting, walking naturally mid-stride, shot on iPhone, shallow depth of field, grainy iphone photo IMG_6891.HEIC

**EXAMPLE 7 - Romantic Feminine:**
woman, soft curls, in flowing midi dress with delicate print, gold jewelry, walking through sunlit garden, dappled natural light through trees, shot on iPhone portrait mode, shallow depth of field, grainy iphone photo IMG_2156.HEIC

**EXAMPLE 8 - Minimal Chic:**
woman, straight hair, in white button-down with tailored black trousers, simple gold watch, modern office space, natural window light, shot on iPhone, shallow depth of field, grainy iphone photo IMG_7432.HEIC

**EXAMPLE 9 - Weekend Ease:**
woman, messy bun, in oversized denim jacket with ribbed tank, minimal jewelry, urban scandinavian setting, natural daylight, shot on iPhone portrait mode, shallow depth of field, grainy iphone photo IMG_9124.HEIC

**EXAMPLE 10 - Elevated Basics:**
woman, sleek ponytail, in black turtleneck with high-waisted jeans, layered chains, clean neutral interior, soft uneven lighting, shot on iPhone, shallow depth of field, grainy iphone photo IMG_3847.HEIC

---

**CRITICAL RULES - WHAT YOU LEARNED FROM TESTING:**

❌ NEVER DO:
- Describe expressions (genuine laugh, smile, looking away naturally, etc.)
- Use specific iPhone models (iPhone 15 Pro, iPhone 14, etc.)
- Over-describe settings or fashion details
- Override what LoRA handles (facial expressions, poses, personality)
- Use emotional descriptors (confident, serene, thoughtful, etc.)

✅ ALWAYS DO:
- Say "iPhone" only (no model number)
- End with "grainy iphone photo IMG_XXXX.HEIC" or "IMG_XXXX.HEIC amateur photo"
- Keep descriptions minimal (hair style, outfit, location, lighting)
- Let LoRA handle: expressions, poses, personality, detailed styling
- Random IMG numbers (make it feel authentic)

**Structure (30-45 words max):**
woman, [hair style - no color], in [outfit - essential pieces only], [location - minimal], [lighting - simple], shot on iPhone [portrait mode optional], shallow depth of field, grainy iphone photo IMG_XXXX.HEIC

**What the LoRA Does (Don't Describe):**
- Facial expressions
- Exact pose details
- Emotional energy
- Personality/vibe
- Fine details of styling

**What You Describe (Keep Minimal):**
- Hair style (not color)
- Essential outfit pieces
- Basic location
- Lighting type
- Camera style
`
}
