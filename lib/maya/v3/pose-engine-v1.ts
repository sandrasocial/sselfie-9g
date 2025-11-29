/**
 * Pose Engine V1
 * Natural, influencer-style poses that match scenarios
 * Avoids generic AI poses and repetitive descriptions
 */

export interface PoseBlock {
  name: string
  description: string
  keywords: string[]
  scenarioTypes: string[] // Which scenarios this pose works with
}

const POSE_LIBRARY: PoseBlock[] = [
  {
    name: "natural-mirror-selfie",
    description: "relaxed shoulders; soft expression; natural mirror selfie pose; gentle chin tilt",
    keywords: ["mirror", "selfie", "bathroom", "bedroom", "elevator"],
    scenarioTypes: ["bathroom", "elevator", "bedroom", "hotel"],
  },
  {
    name: "casual-confidence",
    description: "subtle confidence; natural stance; relaxed posture; authentic presence",
    keywords: ["casual", "standing", "indoor", "outdoor"],
    scenarioTypes: ["cafe", "street", "rooftop", "lobby"],
  },
  {
    name: "editorial-poise",
    description: "editorial posture; elegant positioning; refined composure; fashion-forward stance",
    keywords: ["fashion", "editorial", "styled", "elegant"],
    scenarioTypes: ["paris", "rooftop", "luxury", "hotel"],
  },
  {
    name: "candid-natural",
    description: "candid moment; natural movement; unposed authenticity; genuine expression",
    keywords: ["natural", "candid", "lifestyle", "everyday"],
    scenarioTypes: ["cafe", "street", "outdoor", "casual"],
  },
  {
    name: "confident-gaze",
    description: "direct gaze; confident presence; strong eye contact; assured posture",
    keywords: ["confident", "strong", "direct", "powerful"],
    scenarioTypes: ["rooftop", "elevator", "luxury", "urban"],
  },
  {
    name: "soft-profile",
    description: "soft profile angle; gentle turn; natural side view; relaxed positioning",
    keywords: ["profile", "side", "angle", "soft"],
    scenarioTypes: ["paris", "cafe", "window", "indoor"],
  },
  {
    name: "seated-elegance",
    description: "seated elegance; poised positioning; refined sitting posture; comfortable grace",
    keywords: ["sitting", "seated", "chair", "lounge"],
    scenarioTypes: ["cafe", "lobby", "hotel", "indoor"],
  },
  {
    name: "walking-motion",
    description: "natural walking motion; mid-stride elegance; dynamic movement; effortless stride",
    keywords: ["walking", "street", "motion", "movement"],
    scenarioTypes: ["street", "paris", "outdoor", "urban"],
  },
  {
    name: "leaning-casual",
    description: "casual lean; relaxed against surface; effortless positioning; natural rest",
    keywords: ["leaning", "wall", "railing", "casual"],
    scenarioTypes: ["rooftop", "street", "elevator", "urban"],
  },
  {
    name: "seated-floor",
    description: "seated on floor; relaxed ground position; casual floor pose; natural sitting",
    keywords: ["floor", "ground", "casual", "relaxed"],
    scenarioTypes: ["bedroom", "studio", "indoor", "casual"],
  },
]

export function selectPoseV1(scenarioName: string, keywords: string[]): PoseBlock {
  // Score each pose based on scenario match
  const scores = POSE_LIBRARY.map((pose) => {
    let score = 0

    // Match scenario types (+5 points)
    if (pose.scenarioTypes.some((type) => scenarioName.toLowerCase().includes(type))) {
      score += 5
    }

    // Match keywords (+2 points each)
    keywords.forEach((keyword) => {
      if (pose.keywords.some((k) => keyword.toLowerCase().includes(k) || k.includes(keyword.toLowerCase()))) {
        score += 2
      }
    })

    return { pose, score }
  })

  // Get highest scoring pose
  scores.sort((a, b) => b.score - a.score)

  // If no good match, return natural-mirror-selfie as default
  return scores[0].score > 0 ? scores[0].pose : POSE_LIBRARY[0]
}

export function getPoseBlock(poseName: string): PoseBlock | null {
  return POSE_LIBRARY.find((p) => p.name === poseName) || null
}

export function getAllPoses(): PoseBlock[] {
  return POSE_LIBRARY
}
