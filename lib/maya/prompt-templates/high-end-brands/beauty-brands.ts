// Beauty Lifestyle templates – makeup, skincare, hair & beauty rituals
// These are lifestyle (not brand-specific) high-end prompts for Studio Pro / Nano Banana flows.

import type { PromptTemplate, PromptContext } from "../types"

// ---------- Beauty Lifestyle Templates ----------

export const BEAUTY_MORNING_SKINCARE: PromptTemplate = {
  id: "beauty_morning_skincare",
  name: "Morning Skincare Routine",
  description:
    "Fresh morning skincare portrait with natural light and clean girl aesthetic.",
  useCases: [
    "Skincare routine content",
    "Morning beauty imagery",
    "Clean girl campaigns",
    "Skincare devotion lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3.

Hair: illuminated brown, pulled back with soft headband or clip, clean face framing. Without altering features or skin tone. Hyper-realistic.

Scene: woman in bathroom applying skincare, natural morning light streaming through window.

**OUTFIT & STYLING:**
White fluffy robe or soft cotton pajama top, relaxed morning aesthetic.

**ACCESSORIES:**
Jade roller or gua sha in hand, skincare products arranged on counter.

**POSE & EXPRESSION:**
Applying serum or moisturizer to face, looking at camera with fresh dewy skin, natural no-makeup expression.

**LIGHTING:**
Soft natural morning light from window, bright clean bathroom lighting, skin glowing.

**ENVIRONMENT:**
White marble or clean bathroom counter, organized skincare products (serums, moisturizers, face mist), white towels, minimal aesthetic.

**CAMERA:**
Camera at 1m distance, 50mm lens, intimate beauty moment.

**MOOD:**
Clean girl aesthetic, morning ritual luxury, skincare devotion – authentic skincare moment.`.trim()
  },
}

export const BEAUTY_MAKEUP_APPLICATION: PromptTemplate = {
  id: "beauty_makeup_application",
  name: "Makeup Application Close-Up",
  description:
    "Intimate makeup application portrait with brush and professional beauty lighting.",
  useCases: [
    "Makeup application content",
    "Beauty routine imagery",
    "Getting ready campaigns",
    "Beauty content creation",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain exactly same features from reference image. Format: portrait 2:3.

Hair: illuminated brown, slicked back in low bun or pulled away from face. Hyper-realistic.

Scene: woman applying makeup at vanity, mid-application, beauty moment captured.

**OUTFIT & STYLING:**
Silk robe or soft sweater, relaxed getting-ready aesthetic.

**ACCESSORIES:**
Makeup brush in hand touching face, ring light visible in background, makeup products on vanity.

**POSE & EXPRESSION:**
Applying blush or bronzer to cheek, looking in mirror (not at camera), concentrated beauty expression, hand delicately holding brush to face.

**LIGHTING:**
Ring light creating perfect even illumination, soft shadows, professional beauty lighting.

**ENVIRONMENT:**
Vanity setup with mirror, organized makeup collection, brushes in holder, aesthetic background.

**CAMERA:**
Camera at 1.2m, 50mm lens, close focus on face and hand with brush.

**MOOD:**
Beauty content creation, professional makeup application, intimate getting-ready moment – sophisticated beauty routine.`.trim()
  },
}

export const BEAUTY_HAIR_MASK: PromptTemplate = {
  id: "beauty_hair_mask",
  name: "Hair Mask Treatment",
  description:
    "Spa-like hair mask treatment portrait with glossy hair and self-care atmosphere.",
  useCases: [
    "Hair care content",
    "Self-care imagery",
    "Hair treatment campaigns",
    "Spa luxury lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3.

Hair: illuminated brown, slicked back with hair mask applied, glossy wet appearance. Without altering features. Hyper-realistic.

Scene: woman in bathroom during hair treatment routine, spa-like self-care moment.

**OUTFIT & STYLING:**
White spa robe or tank top, towel around shoulders.

**ACCESSORIES:**
Hair clip holding hair up, hair mask product visible, jade roller or face mask on face.

**POSE & EXPRESSION:**
Applying hair mask with hands, smoothing product through hair, peaceful self-care expression.

**LIGHTING:**
Bright clean bathroom lighting, soft natural light, fresh aesthetic.

**ENVIRONMENT:**
White bathroom with marble or clean tiles, hair care products arranged, towels, plants, spa atmosphere.

**CAMERA:**
Camera at 1m, 50mm lens, upper body beauty portrait.

**MOOD:**
Self-care Sunday, hair care ritual, luxury pampering moment – sophisticated hair treatment.`.trim()
  },
}

export const BEAUTY_VANITY_FLAT_LAY: PromptTemplate = {
  id: "beauty_vanity_flat_lay",
  name: "Vanity Flat Lay Beauty",
  description:
    "Curated beauty products flat lay with face in overhead shot and editorial aesthetic.",
  useCases: [
    "Beauty flat lay content",
    "Product showcase imagery",
    "Beauty collection campaigns",
    "Beauty editorial lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same features from reference image. Format: portrait 2:3, overhead angle.

Hair: illuminated brown, flowing naturally, framing face in overhead shot. Hyper-realistic.

Scene: woman leaning over vanity with curated beauty products arranged aesthetically around face.

**OUTFIT & STYLING:**
Soft sweater or robe, visible from shoulders and upper chest.

**ACCESSORIES ARRANGED:**
Skincare products (serums, moisturizers, masks), makeup (foundation, lipsticks, palettes), beauty tools (jade roller, gua sha, brushes), perfume bottle, flowers.

**POSE & EXPRESSION:**
Looking up at camera, hands gently framing face or touching skin, serene beauty expression.

**LIGHTING:**
Bright overhead lighting, no harsh shadows, clean editorial aesthetic.

**ENVIRONMENT:**
White marble or wooden vanity surface, curated product selection, aesthetic arrangement.

**CAMERA:**
Camera at 1m overhead, looking down, 35mm lens, flat lay perspective.

**MOOD:**
Beauty editorial, product showcase, curated beauty collection – sophisticated flat lay moment.`.trim()
  },
}

export const BEAUTY_FACE_MASK: PromptTemplate = {
  id: "beauty_face_mask",
  name: "Face Mask Self-Care",
  description:
    "Relaxing face mask portrait with spa atmosphere and evening self-care aesthetic.",
  useCases: [
    "Face mask content",
    "Self-care imagery",
    "Spa night campaigns",
    "Wellness beauty lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image with sheet mask or cream mask applied. Format: portrait 2:3.

Hair: illuminated brown, pulled back with headband or clip, spa-ready styling. Hyper-realistic.

Scene: woman relaxing with face mask on, self-care evening at home.

**OUTFIT & STYLING:**
Plush robe or cozy pajama set, comfortable luxury.

**ACCESSORIES:**
Cucumber slices on eyes (optional), tea cup in hand, face mask product packaging visible.

**POSE & EXPRESSION:**
Reclining on bed or couch, relaxed pose, eyes closed or looking at camera peacefully.

**LIGHTING:**
Soft warm evening lighting, cozy ambient light, candles in background.

**ENVIRONMENT:**
Bedroom or bathroom, towels, skincare products, candles, relaxation setup.

**CAMERA:**
Camera at 1.2m, 50mm lens, relaxed beauty moment.

**MOOD:**
Self-care ritual, spa night at home, wellness luxury – peaceful beauty moment.`.trim()
  },
}

export const BEAUTY_BLOWOUT: PromptTemplate = {
  id: "beauty_blowout",
  name: "Blowout Hair Styling",
  description:
    "Professional hair blowout portrait with round brush and styling tools.",
  useCases: [
    "Hair styling content",
    "Blowout imagery",
    "Hair care campaigns",
    "Professional styling lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same features from reference image. Format: portrait 2:3.

Hair: illuminated brown, being styled with round brush and blow dryer, voluminous mid-styling appearance. Hyper-realistic.

Scene: woman blow-drying hair in bathroom, caught in styling moment.

**OUTFIT & STYLING:**
Silk robe or getting-ready outfit, casual yet elevated.

**ACCESSORIES:**
Dyson blow dryer or professional dryer in hand, round brush in hair, styling products on counter.

**POSE & EXPRESSION:**
Both hands styling hair, looking in mirror or at camera, natural styling concentration, hair flowing with movement.

**LIGHTING:**
Bright bathroom lighting, natural window light creating shine on hair.

**ENVIRONMENT:**
Modern bathroom, mirror reflection, hair tools and products visible, clean aesthetic.

**CAMERA:**
Camera at 1.5m, 50mm lens, action beauty shot.

**MOOD:**
Hair care ritual, professional at-home styling, beauty routine luxury – sophisticated styling moment.`.trim()
  },
}

export const BEAUTY_CLEAN_GIRL_MAKEUP: PromptTemplate = {
  id: "beauty_clean_girl_makeup",
  name: "Clean Girl Makeup Look",
  description:
    "Fresh clean girl makeup portrait with dewy skin and natural beauty aesthetic.",
  useCases: [
    "Clean girl content",
    "Natural makeup imagery",
    "No-makeup makeup campaigns",
    "Effortless beauty lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain exactly same person from reference image. Format: portrait 2:3.

Hair: illuminated brown, sleek pulled-back bun or slicked ponytail, clean aesthetic. Hyper-realistic.

Scene: woman with fresh "clean girl" makeup complete, natural beauty moment.

**OUTFIT & STYLING:**
White ribbed tank top or simple neutral top, minimal aesthetic. Accessories: dewy skin, natural brows, subtle lip gloss, minimal jewelry (gold hoops or studs).

**POSE & EXPRESSION:**
Standing in natural light, hand touching face gently, looking at camera with soft natural expression, glowing skin prominent.

**LIGHTING:**
Bright natural window light, creating dewy skin glow, soft shadows, fresh aesthetic.

**ENVIRONMENT:**
White or minimal background, bathroom or bedroom, clean natural setting.

**CAMERA:**
Camera at 1m, 50mm lens, beauty portrait focus.

**MOOD:**
Effortless beauty, "no-makeup" makeup, clean girl aesthetic, natural luxury – authentic clean beauty moment.`.trim()
  },
}

export const BEAUTY_LIP_GLOSS: PromptTemplate = {
  id: "beauty_lip_gloss",
  name: "Lip Gloss Application",
  description:
    "Extreme close-up lip gloss application with macro focus and ASMR aesthetic.",
  useCases: [
    "Lip product content",
    "Beauty detail imagery",
    "ASMR beauty campaigns",
    "Product focus lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same features from reference image. Format: portrait 2:3, close-up focus.

Hair: illuminated brown, natural styling, slightly blurred background. Hyper-realistic.

Scene: extreme close-up of woman applying lip gloss or lipstick.

**OUTFIT & STYLING:**
Not prominent in frame, soft sweater or robe barely visible.

**ACCESSORIES:**
Lip product in hand touching lips, other hand near face, rings visible.

**POSE & EXPRESSION:**
Applying gloss to lips, looking at camera or mirror, mouth slightly open, hand delicately holding applicator to lips.

**LIGHTING:**
Soft diffused light creating glossy lip shine, highlighting product texture, clean beauty lighting.

**ENVIRONMENT:**
Blurred background, focus entirely on lip application moment.

**CAMERA:**
Camera at 0.5m, 85mm lens, macro beauty shot, focus on lips and applicator.

**MOOD:**
Beauty content, product focus, ASMR aesthetic, intimate beauty detail – sophisticated lip moment.`.trim()
  },
}

export const BEAUTY_BATHROOM_ROUTINE: PromptTemplate = {
  id: "beauty_bathroom_routine",
  name: "Bathroom Counter Beauty Routine",
  description:
    "Organized beauty routine portrait with multiple skincare steps and clean aesthetic.",
  useCases: [
    "Beauty routine content",
    "Skincare routine imagery",
    "Organized beauty campaigns",
    "Self-care dedication lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3.

Hair: illuminated brown, natural waves or pulled back, mid-routine styling. Hyper-realistic.

Scene: woman at bathroom counter surrounded by beauty products, organized routine in progress.

**OUTFIT & STYLING:**
White tank top or robe, relaxed morning/evening aesthetic.

**ACCESSORIES:**
Multiple skincare steps visible (cleanser, toner, serum, moisturizer), cotton pads, towel, organized product lineup.

**POSE & EXPRESSION:**
Applying product to face with both hands, natural routine moment, looking at mirror or camera.

**LIGHTING:**
Bright bathroom vanity lighting, natural window light, clean white aesthetic.

**ENVIRONMENT:**
White marble or clean counter, organized beauty products, minimal bathroom décor, plants or candles.

**CAMERA:**
Camera at 1.2m, 50mm lens, environmental beauty portrait.

**MOOD:**
Skincare routine content, organized beauty ritual, self-care dedication – sophisticated beauty routine.`.trim()
  },
}

export const BEAUTY_EYEBROW_GROOMING: PromptTemplate = {
  id: "beauty_eyebrow_grooming",
  name: "Eyebrow Grooming",
  description:
    "Close-up eyebrow grooming portrait with precise technique and professional lighting.",
  useCases: [
    "Brow routine content",
    "Beauty detail imagery",
    "Precision beauty campaigns",
    "Detailed self-care lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same features from reference image. Format: portrait 2:3, close-up beauty shot.

Hair: illuminated brown, pulled away from face with headband, clear face view. Hyper-realistic.

Scene: woman grooming or filling in eyebrows, precise beauty moment.

**OUTFIT & STYLING:**
Simple neutral top, beauty focus not outfit.

**ACCESSORIES:**
Brow pencil or brush in hand near eyebrow, other brow products on counter, ring light reflection in eyes.

**POSE & EXPRESSION:**
Concentrating on mirror, hand with brow tool near face, precise grooming expression, looking at own reflection or camera.

**LIGHTING:**
Bright even lighting, ring light creating catch lights, perfect visibility for detail work.

**ENVIRONMENT:**
Vanity mirror background, beauty tools visible, clean minimalist setup.

**CAMERA:**
Camera at 0.8m, 50mm lens, close focus on face and brow area.

**MOOD:**
Precision beauty, brow routine, detailed self-care, professional technique – sophisticated brow moment.`.trim()
  },
}

export const BEAUTY_HAIR_OILING: PromptTemplate = {
  id: "beauty_hair_oiling",
  name: "Hair Oiling Treatment",
  description:
    "Luxurious hair oiling treatment portrait with glossy hair and wellness ritual aesthetic.",
  useCases: [
    "Hair oiling content",
    "Hair treatment imagery",
    "Hair care luxury campaigns",
    "Wellness beauty lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3.

Hair: illuminated brown, oiled and glossy, being massaged or treated. Hyper-realistic.

Scene: woman applying hair oil treatment, luxurious hair care moment.

**OUTFIT & STYLING:**
Silk robe or simple tank top, comfort-focused.

**ACCESSORIES:**
Hair oil bottle in hand or on counter, other hair care products visible.

**POSE & EXPRESSION:**
Hands running through hair applying oil, looking at camera or to side, peaceful self-care expression, hair looking glossy and healthy.

**LIGHTING:**
Soft natural light creating shine on oiled hair, warm intimate lighting.

**ENVIRONMENT:**
Bathroom or bedroom, clean aesthetic, towels, hair care products displayed.

**CAMERA:**
Camera at 1m, 50mm lens, hair care ritual focus.

**MOOD:**
Hair care luxury, nourishing treatment, wellness ritual, healthy hair focus – sophisticated hair treatment.`.trim()
  },
}

export const BEAUTY_PERFUME_APPLICATION: PromptTemplate = {
  id: "beauty_perfume_application",
  name: "Perfume Application",
  description:
    "Elegant perfume application portrait with designer bottle and finishing touch aesthetic.",
  useCases: [
    "Perfume content",
    "Finishing touch imagery",
    "Signature scent campaigns",
    "Elegant preparation lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same features from reference image. Format: portrait 2:3.

Hair: illuminated brown, styled elegantly, final getting-ready touch. Hyper-realistic.

Scene: woman spraying perfume on wrist or neck, finishing touch moment.

**OUTFIT & STYLING:**
Elegant dress or robe, shoulders and décolletage visible, elevated aesthetic. Accessories: designer perfume bottle in hand, delicate jewelry visible, other beauty products on vanity.

**POSE & EXPRESSION:**
Spraying perfume on wrist, bringing wrist to nose, or applying to neck, elegant graceful movement, refined expression.

**LIGHTING:**
Soft elegant lighting, warm glow, luxury atmosphere.

**ENVIRONMENT:**
Vanity or dressing area, organized beauty products, flowers, elegant backdrop.

**CAMERA:**
Camera at 1.2m, 50mm lens, elegant beauty portrait.

**MOOD:**
Final touch luxury, signature scent ritual, elegant preparation – sophisticated perfume moment.`.trim()
  },
}

export const BEAUTY_JADE_ROLLER: PromptTemplate = {
  id: "beauty_jade_roller",
  name: "Jade Roller Facial",
  description:
    "Facial massage portrait with jade roller and lymphatic drainage technique.",
  useCases: [
    "Facial massage content",
    "Skincare tool imagery",
    "Wellness beauty campaigns",
    "Ancient technique modern luxury",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3.

Hair: illuminated brown, pulled back cleanly, clear face access. Hyper-realistic.

Scene: woman using jade roller or gua sha on face, facial massage technique.

**OUTFIT & STYLING:**
White robe or simple top, comfort and cleanliness.

**ACCESSORIES:**
Jade roller pressed to cheek or forehead, serum or facial oil visible on skin, other facial tools on counter.

**POSE & EXPRESSION:**
Using roller on face with proper technique, looking peaceful, hand holding roller to face, relaxed self-care expression.

**LIGHTING:**
Bright clean lighting showing dewy skin, natural glow, fresh aesthetic.

**ENVIRONMENT:**
Clean bathroom or vanity, skincare products, minimal white aesthetic, spa-like.

**CAMERA:**
Camera at 1m, 50mm lens, skincare tool focus.

**MOOD:**
Facial massage ritual, lymphatic drainage, wellness beauty, ancient technique modern luxury – sophisticated facial treatment.`.trim()
  },
}

export const BEAUTY_MIRROR_MAKEUP_CHECK: PromptTemplate = {
  id: "beauty_mirror_makeup_check",
  name: "Mirror Reflection Makeup Check",
  description:
    "Final makeup check portrait in mirror with satisfied expression and ready-to-go energy.",
  useCases: [
    "Makeup check content",
    "Final look imagery",
    "Confidence campaigns",
    "Ready to go lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same features from reference image. Format: portrait 2:3, mirror reflection shot.

Hair: illuminated brown, fully styled, makeup-ready appearance. Hyper-realistic.

Scene: woman checking makeup in handheld mirror or vanity mirror, final look approval.

**OUTFIT & STYLING:**
Getting-ready robe or final outfit, elevated aesthetic. Accessories: holding compact mirror or standing at vanity, makeup fully applied, jewelry on.

**POSE & EXPRESSION:**
Looking at reflection, adjusting makeup or checking final look, hand near face or holding mirror, satisfied expression.

**LIGHTING:**
Soft flattering lighting, ring light or natural light, makeup visible and well-lit.

**ENVIRONMENT:**
Vanity or dressing area, makeup spread, elegant preparation space.

**CAMERA:**
Camera at 1.2m, 50mm lens, capturing mirror reflection and profile.

**MOOD:**
Final check confidence, makeup approval moment, ready to go energy – sophisticated makeup check.`.trim()
  },
}

export const BEAUTY_HAIR_CURLING: PromptTemplate = {
  id: "beauty_hair_curling",
  name: "Hair Curling Styling",
  description:
    "Hair curling action portrait with curling wand and voluminous curls forming.",
  useCases: [
    "Hair curling content",
    "Hair styling imagery",
    "Volume creation campaigns",
    "Beauty preparation lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3.

Hair: illuminated brown, mid-curling with sections already styled, voluminous curls forming. Hyper-realistic.

Scene: woman curling hair with curling iron or wand, styling in progress.

**OUTFIT & STYLING:**
Getting-ready outfit, robe or casual top, shoulders visible.

**ACCESSORIES:**
Curling wand/iron in hand wrapped around hair section, heat protectant spray visible, hair clips holding sections.

**POSE & EXPRESSION:**
Both hands styling hair, looking at mirror or camera, natural styling concentration, curls cascading.

**LIGHTING:**
Bright lighting showing hair texture and shine, natural or ring light.

**ENVIRONMENT:**
Bathroom or vanity area, hair tools and products visible, organized styling station.

**CAMERA:**
Camera at 1.5m, 50mm lens, action beauty shot.

**MOOD:**
Hair styling routine, volume and glamour creation, beauty preparation ritual – sophisticated curling moment.`.trim()
  },
}

export const BEAUTY_SERUM_GLOW: PromptTemplate = {
  id: "beauty_serum_glow",
  name: "Serum Application Glow",
  description:
    "Intimate serum application portrait with dewy skin and glowing aesthetic.",
  useCases: [
    "Serum application content",
    "Dewy skin imagery",
    "Skincare glow campaigns",
    "Healthy skin focus lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain exactly same person from reference image. Format: portrait 2:3, close beauty shot.

Hair: illuminated brown, pulled back from face, skincare focus. Hyper-realistic.

Scene: woman applying facial serum, pressing product into skin, dewy glow visible.

**OUTFIT & STYLING:**
Simple tank or robe, minimal to keep focus on face.

**ACCESSORIES:**
Serum bottle and dropper visible, hands pressing product into cheeks, glowing dewy skin.

**POSE & EXPRESSION:**
Fingertips pressing serum into skin on cheekbones and forehead, looking at camera with fresh expression, skin visibly dewy and glowing.

**LIGHTING:**
Bright clean lighting highlighting dewy skin, soft glow, fresh morning aesthetic.

**ENVIRONMENT:**
Clean bathroom or vanity, skincare products visible, white minimal background.

**CAMERA:**
Camera at 0.8m, 50mm lens, intimate skincare moment.

**MOOD:**
Skincare absorption, dewy skin goals, healthy glow focus, skincare science luxury – sophisticated serum moment.`.trim()
  },
}

export const BEAUTY_LASH_CURLER: PromptTemplate = {
  id: "beauty_lash_curler",
  name: "Lash Curler Close-Up",
  description:
    "Extreme close-up eyelash curling with macro focus and ASMR beauty detail.",
  useCases: [
    "Lash routine content",
    "Beauty detail imagery",
    "ASMR beauty campaigns",
    "Precise technique lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same features from reference image. Format: portrait 2:3, extreme close-up.

Hair: pulled back, not prominent in frame. Hyper-realistic.

Scene: extreme close-up of woman using eyelash curler, eye makeup prep moment.

**OUTFIT & STYLING:**
Not prominent in tight frame.

**ACCESSORIES:**
Eyelash curler at eye, other hand steadying, mascara or eye makeup products barely visible.

**POSE & EXPRESSION:**
Curling lashes, eye looking up or to side, focused beauty task, hand holding curler to lashes.

**LIGHTING:**
Bright perfect lighting for eye detail, no shadows on face, clear beauty lighting.

**ENVIRONMENT:**
Barely visible, all focus on eye and curler, blurred background.

**CAMERA:**
Camera at 0.5m, 85mm lens, macro detail shot focusing on eye area.

**MOOD:**
Detailed beauty routine, precise technique, ASMR beauty content, eye makeup preparation – sophisticated lash moment.`.trim()
  },
}

export const BEAUTY_FRIDGE: PromptTemplate = {
  id: "beauty_fridge",
  name: "Beauty Fridge Moment",
  description:
    "Beauty fridge organization portrait with chilled skincare and luxury storage aesthetic.",
  useCases: [
    "Beauty organization content",
    "Beauty fridge imagery",
    "Chilled skincare campaigns",
    "Beauty enthusiast lifestyle",
  ],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    return `Reference image: photo sent. Face: maintain same person from reference image. Format: portrait 2:3.

Hair: illuminated brown, casual morning styling, natural texture. Hyper-realistic.

Scene: woman opening small beauty fridge, retrieving chilled skincare product.

**OUTFIT & STYLING:**
Silk pajama set or morning robe, fresh morning aesthetic.

**ACCESSORIES:**
Mini beauty fridge open showing organized skincare, holding face roller or serum, organized beauty collection visible.

**POSE & EXPRESSION:**
Reaching for product in beauty fridge, looking at camera or products, excited morning routine expression.

**LIGHTING:**
Soft morning light, fridge interior light, clean bright aesthetic.

**ENVIRONMENT:**
Vanity or bathroom counter, beauty fridge as focal point, organized aesthetic, luxury beauty storage.

**CAMERA:**
Camera at 1.2m, 50mm lens, beauty organization moment.

**MOOD:**
Beauty organization goals, chilled skincare luxury, elevated routine, beauty enthusiast lifestyle – sophisticated beauty storage moment.`.trim()
  },
}

export const BEAUTY_BRANDS = {
  BEAUTY_MORNING_SKINCARE,
  BEAUTY_MAKEUP_APPLICATION,
  BEAUTY_HAIR_MASK,
  BEAUTY_VANITY_FLAT_LAY,
  BEAUTY_FACE_MASK,
  BEAUTY_BLOWOUT,
  BEAUTY_CLEAN_GIRL_MAKEUP,
  BEAUTY_LIP_GLOSS,
  BEAUTY_BATHROOM_ROUTINE,
  BEAUTY_EYEBROW_GROOMING,
  BEAUTY_HAIR_OILING,
  BEAUTY_PERFUME_APPLICATION,
  BEAUTY_JADE_ROLLER,
  BEAUTY_MIRROR_MAKEUP_CHECK,
  BEAUTY_HAIR_CURLING,
  BEAUTY_SERUM_GLOW,
  BEAUTY_LASH_CURLER,
  BEAUTY_FRIDGE,
} satisfies Record<string, PromptTemplate>

