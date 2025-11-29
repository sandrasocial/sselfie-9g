/**
 * Maya 3.0 Composition Engine
 *
 * Defines framing, focal distance, camera height, and body positioning
 * based on professional photography composition principles.
 */

export interface CompositionBlock {
  name: string
  description: string
  framing: string
  focalDistance: string
  cameraHeight: string
  bodyPositioning: string
  keywords: string[]
  tags: string[] // Added tags for concept-engine matching
}

const COMPOSITION_LIBRARY: Record<string, CompositionBlock> = {
  "rule-of-thirds": {
    name: "Rule of Thirds",
    description: "Classic composition with subject on intersection points",
    framing: "Subject positioned on left or right third line",
    focalDistance: "Medium shot, waist to head or full upper body",
    cameraHeight: "Eye level to slightly below for flattering angle",
    bodyPositioning: "Slight angle to camera, natural pose, relaxed shoulders",
    keywords: ["rule of thirds", "balanced composition", "off-center framing", "professional standard"],
    tags: ["balanced", "classic", "professional", "versatile"],
  },

  "center-power-pose": {
    name: "Center-Framed Power Pose",
    description: "Bold centered composition for maximum impact",
    framing: "Subject centered and commanding the frame",
    focalDistance: "Medium to tight shot emphasizing presence",
    cameraHeight: "Slightly below eye level for empowering angle",
    bodyPositioning: "Strong confident pose, direct eye line, commanding stance",
    keywords: ["centered composition", "power pose", "direct framing", "confident stance"],
    tags: ["centered", "power", "direct", "confident"],
  },

  "cinematic-wide": {
    name: "Cinematic Wide",
    description: "Wide environmental shot showing context and atmosphere",
    framing: "Subject within environment, significant negative space",
    focalDistance: "Wide shot showing full body and surroundings",
    cameraHeight: "Eye level or slightly elevated for scene overview",
    bodyPositioning: "Natural in environment, interacting with space",
    keywords: ["wide shot", "environmental context", "cinematic scope", "storytelling frame"],
    tags: ["wide", "environmental", "cinematic", "storytelling"],
  },

  "close-up-beauty": {
    name: "Close-Up Beauty Crop",
    description: "Tight beauty shot focusing on face and expression",
    framing: "Tight crop from shoulders up or head and shoulders only",
    focalDistance: "Close-up emphasizing facial features and expression",
    cameraHeight: "Slightly below eye level for flattering angle",
    bodyPositioning: "Shoulders angled, face to camera, expressive gaze",
    keywords: ["beauty close-up", "facial focus", "tight crop", "expressive portrait"],
    tags: ["beauty", "facial", "tight", "expressive"],
  },

  "three-quarter-body": {
    name: "3/4 Body Shot",
    description: "Versatile composition showing personality and style",
    framing: "From mid-thigh or knee to head, showing outfit and pose",
    focalDistance: "Three-quarter length capturing style and presence",
    cameraHeight: "Chest to eye level for balanced proportion",
    bodyPositioning: "Angled pose showing body line, weight on back leg",
    keywords: ["three-quarter length", "fashion shot", "outfit showcase", "balanced frame"],
    tags: ["three-quarter", "fashion", "outfit", "balanced"],
  },

  "over-shoulder": {
    name: "Over-Shoulder Shot",
    description: "Dynamic angle showing interaction or environment",
    framing: "Camera behind shoulder looking at subject or scene",
    focalDistance: "Medium shot with foreground element (shoulder)",
    cameraHeight: "Subject eye level creating intimate viewpoint",
    bodyPositioning: "Turned away slightly, natural candid positioning",
    keywords: ["over shoulder", "dynamic angle", "foreground element", "candid perspective"],
    tags: ["over", "shoulder", "dynamic", "foreground", "candid"],
  },

  "lifestyle-candid": {
    name: "Lifestyle Candid Movement",
    description: "Natural movement captured in authentic moment",
    framing: "Loose framing allowing for movement and spontaneity",
    focalDistance: "Medium to wide capturing action and context",
    cameraHeight: "Varied for natural perspective of scene",
    bodyPositioning: "Natural movement, candid action, authentic gesture",
    keywords: ["candid moment", "natural movement", "lifestyle shot", "spontaneous framing"],
    tags: ["candid", "natural", "lifestyle", "spontaneous"],
  },

  symmetrical: {
    name: "Symmetrical Framing",
    description: "Balanced composition with centered symmetry",
    framing: "Perfect symmetry with subject as central axis",
    focalDistance: "Medium shot with balanced left-right composition",
    cameraHeight: "Eye level for true symmetrical perspective",
    bodyPositioning: "Centered pose, symmetrical stance or environment",
    keywords: ["symmetrical composition", "centered balance", "architectural framing", "formal structure"],
    tags: ["symmetrical", "centered", "architectural", "formal"],
  },

  "micro-detail": {
    name: "Micro-Detail Crop",
    description: "Extreme close-up emphasizing texture and detail",
    framing: "Tight crop on specific feature or detail element",
    focalDistance: "Macro to extreme close-up",
    cameraHeight: "Direct angle to detail being featured",
    bodyPositioning: "Isolated detail - hand, jewelry, fabric texture, eye, etc.",
    keywords: ["macro detail", "extreme close-up", "texture focus", "intimate detail"],
    tags: ["macro", "extreme", "texture", "intimate"],
  },

  "elevator-symmetry": {
    name: "Elevator Symmetry",
    description: "Centered symmetrical composition for confined elevator space",
    framing: "Perfectly centered with symmetrical elevator elements on sides",
    focalDistance: "Medium to tight shot emphasizing vertical space",
    cameraHeight: "Eye level for true symmetrical perspective",
    bodyPositioning: "Centered stance, using mirror and metal elements for symmetry",
    keywords: ["symmetrical framing", "elevator composition", "centered balance", "confined space"],
    tags: ["symmetrical", "elevator", "centered", "confined", "mirror"],
  },

  "mirror-split-composition": {
    name: "Mirror Split Composition",
    description: "Composition utilizing mirror reflection to create dual perspective",
    framing: "Split frame showing direct view and mirror reflection",
    focalDistance: "Medium shot capturing both subject and reflection",
    cameraHeight: "Aligned with mirror for optimal reflection capture",
    bodyPositioning: "Angled to show both direct and reflected view",
    keywords: ["mirror composition", "reflection framing", "dual perspective", "split view"],
    tags: ["mirror", "reflection", "split", "dual", "creative"],
  },

  "tight-vertical-frame": {
    name: "Tight Vertical Frame",
    description: "Vertical crop emphasizing height and vertical elements",
    framing: "Tight vertical format, emphasizing full body or elongated space",
    focalDistance: "Full body or three-quarter in vertical format",
    cameraHeight: "Varied to emphasize vertical perspective",
    bodyPositioning: "Elongated pose emphasizing vertical lines",
    keywords: ["vertical composition", "tight crop", "elongated frame", "vertical emphasis"],
    tags: ["vertical", "tight", "elongated", "full-body"],
  },

  "fashion-crop": {
    name: "Fashion Crop",
    description: "Editorial fashion crop showing outfit and presence",
    framing: "Strategic crop from knees or thighs up, fashion-forward",
    focalDistance: "Three-quarter to full body showing outfit details",
    cameraHeight: "Chest level for editorial proportion",
    bodyPositioning: "Fashion pose with weight shift, editorial stance",
    keywords: ["fashion framing", "editorial crop", "outfit showcase", "fashion proportion"],
    tags: ["fashion", "editorial", "outfit", "stylish", "crop"],
  },

  "shoulder-up-cinematic": {
    name: "Shoulder-Up Cinematic",
    description: "Cinematic tight crop from shoulders emphasizing face and expression",
    framing: "Shoulders to top of head, cinematic intimacy",
    focalDistance: "Close-up with cinematic quality and emotional depth",
    cameraHeight: "Slightly below eye level for cinematic angle",
    bodyPositioning: "Shoulders angled, expressive face, emotional presence",
    keywords: ["cinematic close-up", "shoulder crop", "intimate framing", "emotional depth"],
    tags: ["cinematic", "close-up", "intimate", "emotional", "dramatic"],
  },

  "wide-room-editorial": {
    name: "Wide-Room Editorial",
    description: "Environmental editorial showing subject within luxury space",
    framing: "Wide composition with significant environment context",
    focalDistance: "Wide shot showing full body and luxury interior",
    cameraHeight: "Eye level or slightly elevated for scene overview",
    bodyPositioning: "Subject positioned within environment, showing spatial relationship",
    keywords: ["environmental composition", "wide editorial", "contextual framing", "luxury space"],
    tags: ["wide", "editorial", "environmental", "luxury", "contextual"],
  },

  "golden-hour-backlit": {
    name: "Golden Hour Backlit Framing",
    description: "Silhouette or glow composition with golden hour backlight",
    framing: "Subject framed against golden light source, dramatic rim",
    focalDistance: "Medium to wide showing light quality and atmosphere",
    cameraHeight: "Low to eye level maximizing golden hour effect",
    bodyPositioning: "Positioned to catch rim light, silhouette or glowing edge",
    keywords: ["backlit composition", "golden hour framing", "rim light focus", "atmospheric"],
    tags: ["golden-hour", "backlit", "atmospheric", "dramatic", "glow"],
  },

  "street-diagonal-motion": {
    name: "Street Diagonal Motion Frame",
    description: "Dynamic diagonal composition suggesting movement and energy",
    framing: "Diagonal lines leading to subject, dynamic perspective",
    focalDistance: "Medium shot with environmental diagonal elements",
    cameraHeight: "Varied angle to emphasize diagonal composition",
    bodyPositioning: "Dynamic pose aligned with diagonal energy",
    keywords: ["diagonal composition", "dynamic framing", "motion energy", "street photography"],
    tags: ["street", "diagonal", "dynamic", "motion", "energetic"],
  },

  "vanity-mirror-centered": {
    name: "Vanity Mirror Centered",
    description: "Centered vanity mirror composition with perfect symmetry",
    framing: "Centered in mirror frame with balanced elements",
    focalDistance: "Medium shot capturing mirror frame and subject",
    cameraHeight: "Eye level for direct mirror engagement",
    bodyPositioning: "Centered facing mirror, symmetrical balanced pose",
    keywords: ["vanity composition", "mirror centered", "symmetrical frame", "beauty shot"],
    tags: ["vanity", "mirror", "centered", "symmetrical", "beauty"],
  },
}

export function getCompositionBlock(type: string): CompositionBlock {
  const typeKey = type.toLowerCase().replace(/\s+/g, "-")
  return COMPOSITION_LIBRARY[typeKey] || COMPOSITION_LIBRARY["rule-of-thirds"]
}

export function getAvailableCompositionTypes(): string[] {
  return Object.keys(COMPOSITION_LIBRARY).map((key) =>
    key
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" "),
  )
}

export function getCompositionKeywords(type: string): string[] {
  const block = getCompositionBlock(type)
  return block.keywords
}

export function scoreCompositionWithTags(compositionKey: string, conceptTags: string[]): number {
  const block = COMPOSITION_LIBRARY[compositionKey]
  if (!block) return 0

  let score = 0
  for (const tag of conceptTags) {
    if (block.tags.includes(tag)) {
      score += 5 // Tag match = +5 points
    }
  }
  return score
}
