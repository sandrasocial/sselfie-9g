/**
 * Motion Libraries - Category-based motion prompts for diverse video generation
 * 
 * These libraries provide context-aware motion suggestions based on image category,
 * environment, and user preferences.
 */

export interface MotionTemplate {
  motion: string
  camera: string
  intensity: "subtle" | "moderate" | "dynamic"
  category: string[]
  tags: string[]
}

export const MOTION_LIBRARIES: Record<string, MotionTemplate[]> = {
  lifestyle: [
    {
      motion: "Breeze catches hair lifting gently, hand reaches up tucking strands behind ear naturally, eyes close briefly feeling air, head tilts into breeze, shoulders relax",
      camera: "camera fixed",
      intensity: "subtle",
      category: ["lifestyle", "outdoor"],
      tags: ["hair", "breeze", "outdoor", "natural"]
    },
    {
      motion: "Lifts coffee mug slowly to lips, takes deliberate sip, eyes gaze thoughtfully through window, lowers mug with satisfied exhale",
      camera: "camera subtle dolly-in",
      intensity: "moderate",
      category: ["lifestyle", "indoor"],
      tags: ["coffee", "morning", "contemplative", "indoor"]
    },
    {
      motion: "Warm light shifts across face, eyes close slowly savoring warmth, fingers wrap around mug lifting to lips, takes deliberate sip, lowers with peaceful smile",
      camera: "camera gentle push-in",
      intensity: "subtle",
      category: ["lifestyle", "indoor"],
      tags: ["light", "warmth", "cozy", "indoor"]
    },
    {
      motion: "Head turns gently toward distant sound, gaze softens in thought, slight smile forms naturally, shoulders relax settling into scene",
      camera: "camera fixed",
      intensity: "subtle",
      category: ["lifestyle", "outdoor"],
      tags: ["contemplative", "natural", "outdoor"]
    },
    {
      motion: "Fingers trace along book pages slowly, eyes scan text thoughtfully, thumb turns page gently, head nods slightly in understanding",
      camera: "camera slight tilt down",
      intensity: "moderate",
      category: ["lifestyle", "indoor"],
      tags: ["reading", "intellectual", "indoor"]
    },
    {
      motion: "Phone screen illuminates face, thumb scrolls slowly, eyes widen slightly at content, subtle smile forms, head tilts in interest",
      camera: "camera fixed",
      intensity: "moderate",
      category: ["lifestyle", "indoor", "outdoor"],
      tags: ["phone", "modern", "casual"]
    }
  ],

  fashion: [
    {
      motion: "Hand adjusts collar of jacket, fingers smooth fabric, head tilts checking fit in reflection, shoulders square confidently",
      camera: "camera slow pan right",
      intensity: "moderate",
      category: ["fashion", "indoor"],
      tags: ["outfit", "adjustment", "confident"]
    },
    {
      motion: "Fingers run through hair styling naturally, head turns side to side checking look, hand adjusts accessory, satisfied nod",
      camera: "camera gentle arc left",
      intensity: "moderate",
      category: ["fashion", "indoor", "outdoor"],
      tags: ["hair", "styling", "preparation"]
    },
    {
      motion: "Hand reaches for sunglasses, lifts them slowly, places on face adjusting position, head tilts checking angle",
      camera: "camera subtle dolly-out",
      intensity: "moderate",
      category: ["fashion", "outdoor"],
      tags: ["accessories", "outdoor", "style"]
    },
    {
      motion: "Fingers adjust necklace absently, thumb traces chain, head tilts slightly, eyes glance down at jewelry, subtle smile",
      camera: "camera gentle push-in",
      intensity: "subtle",
      category: ["fashion", "indoor", "outdoor"],
      tags: ["jewelry", "delicate", "elegant"]
    },
    {
      motion: "Hand smooths down dress fabric, fingers adjust hem, spins slowly checking drape, stops with confident posture",
      camera: "camera slow pan left",
      intensity: "dynamic",
      category: ["fashion", "indoor"],
      tags: ["dress", "movement", "elegant"]
    }
  ],

  travel: [
    {
      motion: "Head turns scanning horizon, eyes widen taking in view, hand raises to shield eyes from sun, deep breath of appreciation",
      camera: "camera slow pan right",
      intensity: "moderate",
      category: ["travel", "outdoor"],
      tags: ["landscape", "view", "appreciation"]
    },
    {
      motion: "Hand holds map, fingers trace route, head looks up comparing to surroundings, nods in recognition, folds map",
      camera: "camera slight tilt down",
      intensity: "moderate",
      category: ["travel", "outdoor"],
      tags: ["navigation", "exploration", "adventure"]
    },
    {
      motion: "Camera raises to eye level, finger presses shutter, lowers camera checking screen, smiles at captured moment",
      camera: "camera fixed",
      intensity: "moderate",
      category: ["travel", "outdoor"],
      tags: ["photography", "capturing", "moment"]
    },
    {
      motion: "Steps forward slowly, head turns left then right taking in environment, hand reaches out touching texture, curious expression",
      camera: "camera subtle dolly-in",
      intensity: "moderate",
      category: ["travel", "outdoor"],
      tags: ["exploration", "discovery", "curiosity"]
    }
  ],

  professional: [
    {
      motion: "Fingers scroll through document on screen, eyes scan content, head nods in understanding, hand reaches for notes",
      camera: "camera fixed",
      intensity: "moderate",
      category: ["professional", "indoor"],
      tags: ["work", "focused", "indoor"]
    },
    {
      motion: "Hand adjusts tie, fingers smooth collar, head tilts checking appearance, shoulders straighten with confidence",
      camera: "camera slight tilt up",
      intensity: "subtle",
      category: ["professional", "indoor"],
      tags: ["formal", "preparation", "confident"]
    },
    {
      motion: "Eyes look up from screen thoughtfully, hand reaches for coffee, takes sip, returns to work with renewed focus",
      camera: "camera fixed",
      intensity: "subtle",
      category: ["professional", "indoor"],
      tags: ["work", "break", "focused"]
    }
  ],

  fitness: [
    {
      motion: "Stretches arms overhead slowly, deep breath filling chest, releases tension with satisfied exhale, rolls shoulders back",
      camera: "camera slight tilt up",
      intensity: "dynamic",
      category: ["fitness", "indoor", "outdoor"],
      tags: ["stretching", "energy", "movement"]
    },
    {
      motion: "Hands rest on hips, head tilts side to side stretching neck, deep breath, eyes close in relaxation",
      camera: "camera fixed",
      intensity: "moderate",
      category: ["fitness", "indoor", "outdoor"],
      tags: ["recovery", "stretching", "relaxation"]
    }
  ],

  food: [
    {
      motion: "Hand lifts fork slowly, eyes admire presentation, brings to lips, takes bite, eyes close savoring flavor, satisfied smile",
      camera: "camera gentle push-in",
      intensity: "moderate",
      category: ["food", "indoor"],
      tags: ["eating", "enjoyment", "savoring"]
    },
    {
      motion: "Fingers hold glass, raises to light examining color, swirls gently, brings to nose inhaling aroma, takes sip",
      camera: "camera subtle dolly-in",
      intensity: "moderate",
      category: ["food", "indoor"],
      tags: ["wine", "tasting", "sophisticated"]
    }
  ]
}

/**
 * Get motion suggestions based on category
 */
export function getMotionSuggestions(
  category: string,
  excludeSimilar: string[] = [],
  maxSuggestions: number = 3
): MotionTemplate[] {
  const categoryLower = category.toLowerCase()
  
  // Find matching category
  let matchingMotions: MotionTemplate[] = []
  
  // Direct category match
  if (MOTION_LIBRARIES[categoryLower]) {
    matchingMotions = MOTION_LIBRARIES[categoryLower]
  } else {
    // Find by tag or partial match
    Object.values(MOTION_LIBRARIES).forEach(motions => {
      motions.forEach(motion => {
        if (
          motion.category.some(c => c.toLowerCase().includes(categoryLower)) ||
          motion.tags.some(t => t.toLowerCase().includes(categoryLower))
        ) {
          matchingMotions.push(motion)
        }
      })
    })
  }
  
  // If no matches, use lifestyle as default
  if (matchingMotions.length === 0) {
    matchingMotions = MOTION_LIBRARIES.lifestyle
  }
  
  // Filter out similar motions (basic string matching for now)
  const filtered = matchingMotions.filter(motion => {
    const motionText = `${motion.motion} ${motion.camera}`.toLowerCase()
    return !excludeSimilar.some(excluded => 
      motionText.includes(excluded.toLowerCase()) || 
      excluded.toLowerCase().includes(motionText)
    )
  })
  
  // Shuffle and return
  const shuffled = [...filtered].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, maxSuggestions)
}

/**
 * Get motion intensity distribution
 */
export function getIntensityDistribution(): "subtle" | "moderate" | "dynamic" {
  const rand = Math.random()
  // 50% subtle, 35% moderate, 15% dynamic
  if (rand < 0.5) return "subtle"
  if (rand < 0.85) return "moderate"
  return "dynamic"
}

