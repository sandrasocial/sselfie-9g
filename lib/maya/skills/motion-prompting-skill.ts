export interface MayaMotionPromptingSkill {
  id: "motion_prompting"
  version: string
  changelog: string[]
  guidance: string[]
  bannedPatterns: string[]
}

export const MOTION_PROMPTING_SKILL: MayaMotionPromptingSkill = {
  id: "motion_prompting",
  version: "2026.03.06",
  changelog: [
    "Initial curated motion prompt skill pack for i2v workflows.",
    "Adds deterministic camera-path + subject-action + timing structure.",
  ],
  guidance: [
    "Write motion prompts in this order: camera move -> subject motion -> interaction detail -> environment movement -> cadence/timing.",
    "Keep subject motion physically small and believable unless user explicitly asks for dramatic movement.",
    "Use one dominant camera instruction (e.g., slow push-in, lateral dolly, static handheld) to avoid motion conflict.",
    "Reference visible elements from source image only; avoid introducing unseen props.",
    "For social clips, target a clear 3-6 second readable action arc with a distinct first-frame hook.",
  ],
  bannedPatterns: [
    "conflicting camera moves in one sentence",
    "high-speed action without scene support",
    "adding unseen props not present in reference image",
  ],
}
