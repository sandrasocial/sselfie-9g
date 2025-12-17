// Wellness-focused high-end brand prompt templates (Alo Yoga, Lululemon)
// These are Nano Banana-ready prompt blueprints for Studio Pro workflows.

import type { PromptTemplate, PromptContext, PromptVariation } from "../types"
import { BRAND_PROFILES } from "./brand-registry"

// ---------- Helper functions: Alo Yoga ----------

export function generateAloAction(context: PromptContext): string {
  const intent = (context.userIntent || "").toLowerCase()

  if (intent.includes("yoga") || intent.includes("pose")) {
    return "Flowing through a slow yoga sequence, mid-pose with relaxed, controlled movement and natural breathing."
  }

  if (intent.includes("walk") || intent.includes("street") || intent.includes("outdoor")) {
    return "Walking slowly with relaxed posture, one step in front of the other, gently adjusting outfit or hair in a natural, unposed way."
  }

  if (intent.includes("studio") || intent.includes("class")) {
    return "Pausing between movements in a yoga studio, adjusting top or leggings with a calm, centered expression."
  }

  return "Natural wellness movement – walking slowly, adjusting outfit or hair, or holding a gentle stretch with relaxed, effortless body language."
}

export function generateAloOutfit(context: PromptContext): string {
  const intent = (context.userIntent || "").toLowerCase()

  if (intent.includes("monochrome") || intent.includes("neutral")) {
    return "Monochromatic Alo Yoga set in soft neutral tones – high-waisted leggings and fitted bra top with subtle logo on waistband or chest."
  }

  if (intent.includes("earth") || intent.includes("beige") || intent.includes("stone")) {
    return "Earth-toned Alo Yoga outfit – warm beige or stone-colored leggings with matching top, clean lines, and discreet logo detailing."
  }

  return "Alo Yoga monochromatic athletic wear – fitted high-waisted leggings and matching top in soft neutral tones, with subtle Alo logo visible but not overpowering."
}

export function generateAloLighting(context: PromptContext): string {
  const intent = (context.userIntent || "").toLowerCase()

  if (intent.includes("sunset") || intent.includes("golden hour")) {
    return "Golden hour light with warm highlights and soft shadows, in an outdoor wellness space or balcony with clean architectural lines."
  }

  if (intent.includes("morning") || intent.includes("sunrise")) {
    return "Soft morning light coming through large windows in a modern minimalist yoga studio, diffused and balanced across the scene."
  }

  if (intent.includes("indoor") || intent.includes("studio")) {
    return "Natural diffused window light in a bright, modern studio with clean walls and minimal decor, creating gentle, even illumination."
  }

  return "Balanced natural lighting with soft highlights and gentle shadows in a modern minimalist environment or outdoor yoga deck."
}

// ---------- Helper functions: Lululemon ----------

function generateLululemonAction(context: PromptContext): string {
  const intent = (context.userIntent || "").toLowerCase()

  if (intent.includes("run") || intent.includes("running")) {
    return "Mid-stride running moment, one foot lifted off the ground, dynamic arm swing, focused expression, captured in motion."
  }

  if (intent.includes("training") || intent.includes("gym") || intent.includes("strength")) {
    return "Active training pose – holding a lunge, squat, or strength movement with engaged muscles and grounded, powerful stance."
  }

  return "Active lifestyle movement – walking briskly, light jog, or mid-warmup stretch with visible energy and athletic confidence."
}

function generateLululemonOutfit(context: PromptContext): string {
  const intent = (context.userIntent || "").toLowerCase()

  if (intent.includes("bold") || intent.includes("color") || intent.includes("jewel")) {
    return "Bold technical set with jewel-tone leggings and contrasting sports bra, clear Lululemon logo placement on hip or waistband."
  }

  if (intent.includes("black") || intent.includes("monochrome")) {
    return "Black-on-black performance outfit – sleek leggings and supportive top, subtle tonal logo and technical seams highlighting performance fit."
  }

  return "Performance-focused Lululemon outfit – technical leggings and fitted top in bold or jewel-tone colors, with visible but refined logo placement."
}

function generateLululemonLighting(context: PromptContext): string {
  const intent = (context.userIntent || "").toLowerCase()

  if (intent.includes("urban") || intent.includes("city")) {
    return "Crisp daylight in an urban environment – soft overcast light or early evening glow reflecting from buildings, highlighting movement and muscle definition."
  }

  if (intent.includes("studio") || intent.includes("gym") || intent.includes("indoor")) {
    return "Clean indoor lighting in a fitness studio or training space, with bright, even illumination and subtle directional shadows on muscles."
  }

  return "Bright, energetic lighting that clearly defines movement and athletic form, either in an urban street setting or modern training environment."
}

// ---------- Prompt Templates ----------

export const ALO_YOGA_LIFESTYLE: PromptTemplate & { brandProfile: typeof BRAND_PROFILES.ALO } = {
  id: "alo_yoga_lifestyle",
  name: "Alo Yoga - Lifestyle Movement",
  brandProfile: BRAND_PROFILES.ALO,
  description: "Professional UGC-style wellness content matching Alo Yoga aesthetic",
  useCases: ["Wellness lifestyle", "Athletic wear campaigns", "Yoga/fitness", "Aspirational health"],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    const action = generateAloAction(context)
    const outfit = generateAloOutfit(context)
    const lighting = generateAloLighting(context)

    return `Vertical 2:3 photo in UGC influencer style captured from Alo Yoga.

Woman, maintaining exactly the characteristics from Image 1 (face, body, skin tone, hair, visual identity), without copying the photo.

**MOVEMENT & ACTION:**
${action}

**OUTFIT & STYLING:**  
${outfit}
Alo brand outfit clearly visible with subtle logo integration.

**HAIR & MAKEUP:**
hair loose with volume and waves. Natural glam makeup.
Illuminated skin with natural glow.

**LIGHTING & ATMOSPHERE:**
Balanced natural lighting. ${lighting}

**COMPOSITION:**
Full body framing with slight sense of movement.
2:3 vertical format optimized for Instagram.

**AESTHETIC:**
Real, clean and aspirational. Premium UGC style, authentic yet polished.
iPhone 15 Pro aesthetic, natural bokeh, candid moment.

**TECHNICAL:**
Shot on iPhone 15 Pro, natural bokeh, authentic moment
85mm lens equivalent, f/2.0 depth of field
Natural skin texture with visible pores (not airbrushed)`.trim()
  },
  variations: [
    {
      name: "Outdoor Wellness Moment",
      environmentFocus:
        "Outdoor yoga deck, rooftop terrace, or garden space with neutral architecture and soft natural surroundings.",
      moodAdjustment: "Calm, grounded, aspirational wellness energy.",
    },
    {
      name: "Yoga Practice",
      environmentFocus:
        "Minimalist indoor yoga studio with natural light, mats arranged cleanly and plenty of negative space.",
      actionChange:
        "Holding a yoga pose mid-flow – warrior, lunge, or gentle balance with visible strength and control.",
    },
    {
      name: "Lifestyle Candid",
      environmentFocus:
        "Everyday wellness moment – walking through a modern hallway, lobby, or cafe in Alo set, carrying mat or water bottle.",
      actionChange:
        "Caught mid-step or mid-adjustment of jacket or leggings, relaxed smile or soft focused expression.",
    },
  ] satisfies PromptVariation[],
}

export const LULULEMON_LIFESTYLE: PromptTemplate & { brandProfile: typeof BRAND_PROFILES.LULULEMON } = {
  id: "lululemon_lifestyle",
  name: "Lululemon - Performance Lifestyle",
  brandProfile: BRAND_PROFILES.LULULEMON,
  description: "High-energy performance-meets-lifestyle content in Lululemon aesthetic",
  useCases: ["Fitness campaigns", "Urban active lifestyle", "Running content", "Training sessions"],
  requiredImages: {
    min: 1,
    max: 2,
    types: ["user_lora", "inspiration"],
  },
  promptStructure: (context: PromptContext): string => {
    const action = generateLululemonAction(context)
    const outfit = generateLululemonOutfit(context)
    const lighting = generateLululemonLighting(context)

    return `Vertical 2:3 photo in performance-lifestyle style inspired by Lululemon campaigns.

Person, maintaining exactly the characteristics from Image 1 (face, body, skin tone, hair, visual identity), without copying the photo.

**MOVEMENT & ACTION:**
${action}

**OUTFIT & STYLING:**  
${outfit}
Lululemon logo clearly visible in a refined, non-distracting way.

**HAIR & MAKEUP:**
Hair styled for movement (ponytail, bun, or controlled loose hair) with natural, sweat-friendly makeup.
Skin looks real with healthy glow and visible texture.

**LIGHTING & ATMOSPHERE:**
Bright, energetic lighting. ${lighting}

**COMPOSITION:**
Full body or three-quarter framing with visible movement and direction.
2:3 vertical format optimized for Instagram and campaign visuals.

**AESTHETIC:**
Empowered, strong and active. Performance-forward lifestyle content that feels authentic, not staged.
Modern athletic campaign style with crisp detail and true-to-life color.

**TECHNICAL:**
Shot on iPhone 15 Pro aesthetic with high clarity and subtle background blur
85mm lens equivalent feel, f/2.0 style depth of field
Natural skin texture with visible pores (not airbrushed), clear definition on muscles and movement`.trim()
  },
  variations: [
    {
      name: "Outdoor Wellness Moment",
      environmentFocus:
        "Urban running route, bridge, or city park path with architectural lines and open sky.",
      moodAdjustment: "Energetic, driven, confident in movement.",
    },
    {
      name: "Yoga Practice",
      environmentFocus:
        "Indoor or rooftop yoga session with mats and minimal props, focused on strength and balance.",
      actionChange:
        "Holding a strong yoga pose or dynamic transition that shows stability and athletic control.",
    },
    {
      name: "Lifestyle Candid",
      environmentFocus:
        "Everyday movement between workouts – walking through city streets, entering studio, or post-class cool down.",
      actionChange:
        "Zipping jacket, adjusting strap, or light stretch, captured mid-action with relaxed, confident expression.",
    },
  ] satisfies PromptVariation[],
}

export const WELLNESS_BRANDS = {
  ALO_YOGA_LIFESTYLE,
  LULULEMON_LIFESTYLE,
} satisfies Record<string, PromptTemplate>
