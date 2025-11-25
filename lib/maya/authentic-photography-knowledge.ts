// Maya's deep knowledge of authentic photography craft
// This replaces template-based prompting with true photographic intelligence

export const AUTHENTIC_PHOTOGRAPHY_KNOWLEDGE = {
  // Authentic micro-expressions that read as real, not posed
  EXPRESSIONS: {
    NEUTRAL_AUTHENTIC: [
      "expression neutral, eyes resting naturally",
      "subtle relaxed expression, gaze slightly lowered",
      "natural resting face, lips softly parted",
      "calm neutral expression, eyes unfocused in thought",
      "genuine relaxed expression, slight tension in jaw",
      "authentic neutral look, eyes catching light naturally",
    ],
    SUBTLE_EMOTION: [
      "hint of a smile forming, eyes soft",
      "contemplative gaze, brow slightly relaxed",
      "quiet confidence in expression, chin slightly lifted",
      "genuine warmth in eyes, natural smile lines",
      "pensive look, eyes focused on middle distance",
      "subtle amusement, corner of mouth lifted",
    ],
    CANDID_MOMENTS: [
      "caught mid-thought, natural expression",
      "genuine reaction, unposed moment",
      "authentic laugh fading, eyes still bright",
      "natural pause, expression unguarded",
      "real moment of reflection, face relaxed",
    ],
  },

  // Film and photography craft details
  PHOTOGRAPHY_CRAFT: {
    FILM_CHARACTERISTICS: [
      "visible film grain, soft detail rolloff",
      "subtle grain texture, analog warmth",
      "gentle film grain, natural highlight bloom",
      "organic grain structure, soft shadow transitions",
      "fine grain texture, filmic tonal range",
    ],
    COLOR_SCIENCE: [
      "true skin tones, accurate color temperature",
      "realistic color rendering, natural white balance",
      "authentic skin warmth, neutral midtones",
      "true-to-life colors, subtle color cast from environment",
      "natural color temperature, skin tones preserved",
      "realistic tonal range, no artificial saturation",
    ],
    LENS_CHARACTERISTICS: {
      "50mm": "50mm lens, natural perspective, handheld feel",
      "35mm": "35mm lens, environmental context, slight wide angle",
      "85mm": "85mm lens, flattering compression, shallow focus",
      "24mm": "24mm lens, dramatic perspective, environmental storytelling",
    },
    LIGHTING_CRAFT: [
      "natural overcast light, soft directional shadows",
      "golden hour warmth, long natural shadows",
      "open shade, even soft lighting",
      "window light falling naturally, gentle gradients",
      "dusk ambient light, cool shadows warm highlights",
      "diffused natural light, no harsh shadows",
      "backlit with natural flare, rim light on edges",
      "soft cloudy day light, flat but dimensional",
    ],
  },

  // Natural body language and positioning
  BODY_LANGUAGE: {
    HANDS_NATURAL: [
      "fingers relaxed naturally",
      "hands resting casually",
      "natural hand placement, fingers loose",
      "hands in pockets, thumbs visible",
      "one hand brushing hair naturally",
      "hands holding item loosely",
      "fingers gently touching surface",
    ],
    POSTURE_AUTHENTIC: [
      "weight shifted naturally to one side",
      "relaxed shoulders, natural stance",
      "leaning slightly, casual posture",
      "body angled naturally from camera",
      "comfortable seated position, not rigid",
      "standing with natural asymmetry",
    ],
    GAZE_DIRECTION: [
      "looking slightly off-camera",
      "eyes focused on something genuine",
      "gaze naturally directed downward",
      "looking into middle distance",
      "eyes connecting with camera authentically",
      "glancing to the side naturally",
    ],
  },

  // Instagram-authentic quality markers
  AUTHENTICITY_MARKERS: {
    QUALITY_CUES: [
      "shot on iPhone 15 Pro",
      "natural skin texture visible",
      "pores and skin detail preserved",
      "no artificial smoothing",
      "authentic skin imperfections",
    ],
    MOMENT_DESCRIPTORS: [
      "between moments, authentic pause",
      "natural movement blur in edges",
      "genuine casual moment",
      "unstaged authentic instant",
      "real life captured naturally",
    ],
    LIFESTYLE_SCENARIOS: [
      "morning coffee routine, natural light through window",
      "getting ready moment, bathroom mirror reflection",
      "street style candid, walking naturally",
      "cafe setting, relaxed and casual",
      "at home authentic moment, comfortable environment",
      "traveling lifestyle, exploring naturally",
      "sunset walk, golden hour glow",
      "cozy indoor evening, warm ambient light",
    ],
  },

  // Environment and atmosphere
  ENVIRONMENTAL_CRAFT: {
    URBAN_AUTHENTIC: [
      "European city street, morning quiet",
      "urban cafe corner, natural ambient",
      "city sidewalk, architectural backdrop",
      "metropolitan street scene, authentic atmosphere",
    ],
    INTERIOR_AUTHENTIC: [
      "naturally lit interior, window light dominant",
      "home environment, lived-in warmth",
      "minimalist space, clean natural light",
      "boutique interior, soft ambient lighting",
    ],
    OUTDOOR_AUTHENTIC: [
      "outdoor natural setting, overcast sky",
      "park environment, dappled shade",
      "beach at golden hour, warm natural light",
      "rooftop at dusk, city lights emerging",
    ],
  },
}

// Helper to get random element from array
export function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Build authentic photography context for Claude
export function getAuthenticPhotographyContext(): string {
  return `
=== INSTAGRAM AUTHENTIC PHOTOGRAPHY PRINCIPLES ===

Your images must look like LIFESTYLE INFLUENCER CONTENT - candid, authentic, realistic. NOT professional photoshoots.

**DEFAULT AESTHETIC: Instagram Influencer Lifestyle**
Unless the user specifically asks for something else (like "editorial", "high fashion", "professional"), your default is:
- Candid, natural moments that look spontaneous
- Lifestyle scenarios: coffee shops, city streets, home environments, travel moments
- Amateur cellphone quality aesthetic (not polished professional photography)
- Authentic expressions and body language (not posed or stiff)

**MICRO-EXPRESSIONS (what makes it feel real):**
Instead of "smiling" or "looking confident", use SPECIFIC authentic expressions:
- "${getRandomElement(AUTHENTIC_PHOTOGRAPHY_KNOWLEDGE.EXPRESSIONS.NEUTRAL_AUTHENTIC)}"
- "${getRandomElement(AUTHENTIC_PHOTOGRAPHY_KNOWLEDGE.EXPRESSIONS.SUBTLE_EMOTION)}"
- "${getRandomElement(AUTHENTIC_PHOTOGRAPHY_KNOWLEDGE.EXPRESSIONS.CANDID_MOMENTS)}"

**AUTHENTIC BODY LANGUAGE (not model poses):**
- Hands: ${getRandomElement(AUTHENTIC_PHOTOGRAPHY_KNOWLEDGE.BODY_LANGUAGE.HANDS_NATURAL)}
- Posture: ${getRandomElement(AUTHENTIC_PHOTOGRAPHY_KNOWLEDGE.BODY_LANGUAGE.POSTURE_AUTHENTIC)}
- Gaze: ${getRandomElement(AUTHENTIC_PHOTOGRAPHY_KNOWLEDGE.BODY_LANGUAGE.GAZE_DIRECTION)}

**LIFESTYLE SCENARIOS (where influencers create content):**
- ${getRandomElement(AUTHENTIC_PHOTOGRAPHY_KNOWLEDGE.AUTHENTICITY_MARKERS.LIFESTYLE_SCENARIOS)}

**NATURAL LIGHTING (never studio/professional):**
- ${getRandomElement(AUTHENTIC_PHOTOGRAPHY_KNOWLEDGE.PHOTOGRAPHY_CRAFT.LIGHTING_CRAFT)}
- Describe light SOURCE and QUALITY (window light, golden hour, overcast), not "good lighting"

**QUALITY MARKERS (what makes it Instagram-authentic):**
- ${getRandomElement(AUTHENTIC_PHOTOGRAPHY_KNOWLEDGE.AUTHENTICITY_MARKERS.QUALITY_CUES)}
- ${getRandomElement(AUTHENTIC_PHOTOGRAPHY_KNOWLEDGE.AUTHENTICITY_MARKERS.MOMENT_DESCRIPTORS)}

**FILM & COLOR (subtle realism):**
- ${getRandomElement(AUTHENTIC_PHOTOGRAPHY_KNOWLEDGE.PHOTOGRAPHY_CRAFT.FILM_CHARACTERISTICS)}
- ${getRandomElement(AUTHENTIC_PHOTOGRAPHY_KNOWLEDGE.PHOTOGRAPHY_CRAFT.COLOR_SCIENCE)}

**BANNED (reads as professional/fake):**
- "Professional photoshoot", "studio lighting", "editorial quality"
- "Hand on hip", "model pose", "power stance"
- "Gorgeous", "stunning", "beautiful", "perfect"
- Generic lighting terms: "nice light", "good lighting"

**REMEMBER:** Users want to look like successful influencers, not models in magazines. Authentic > Polished.
`
}
