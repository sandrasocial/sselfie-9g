import type { MayaSurfaceTab } from "@/lib/maya/tab-scope"
import { getMayaVideosTabQuickPrompts } from "@/lib/maya/tab-scope"

export interface MayaQuickPromptItem {
  label: string
  prompt: string
}

// Style mood chips — mode-specific so there's no cross-mode confusion
const MODEL_STYLE_PROMPTS: MayaQuickPromptItem[] = [
  { label: "Dark & Moody", prompt: "Use my trained model and create a dark and moody photo for my brand" },
  { label: "Soft Luxury", prompt: "Use my trained model and create a soft luxury photo for my brand" },
  { label: "Street Style", prompt: "Use my trained model and create a street style photo for my brand" },
  { label: "Natural Light", prompt: "Use my trained model and create a natural light photo for my brand" },
]

// Classic style chips when there's no trained model (base model generation)
const BASE_STYLE_PROMPTS: MayaQuickPromptItem[] = [
  { label: "Dark & Moody", prompt: "Create a dark and moody photo for my brand" },
  { label: "Soft Luxury", prompt: "Create a soft luxury photo for my brand" },
  { label: "Street Style", prompt: "Create a street style photo for my brand" },
  { label: "Natural Light", prompt: "Create a natural light photo for my brand" },
]

const SELFIE_STYLE_PROMPTS: MayaQuickPromptItem[] = [
  { label: "Dark & Moody", prompt: "Use my selfies and create a dark and moody photo for my brand" },
  { label: "Soft Luxury", prompt: "Use my selfies and create a soft luxury photo for my brand" },
  { label: "Natural Light", prompt: "Use my selfies and create a natural light photo for my brand" },
  { label: "Bold Fashion", prompt: "Use my selfies and create a bold fashion photo for my brand" },
]

function dedupePrompts(prompts: MayaQuickPromptItem[]): MayaQuickPromptItem[] {
  const seen = new Set<string>()
  return prompts.filter((item) => {
    const key = `${item.label.toLowerCase()}::${item.prompt.toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function getMayaSurfaceQuickPrompts(input: {
  activeTab: MayaSurfaceTab
  proMode: boolean
  hasTrainedModel: boolean
}): MayaQuickPromptItem[] {
  const { activeTab, proMode, hasTrainedModel } = input

  if (activeTab === "videos") {
    return getMayaVideosTabQuickPrompts()
  }

  if (activeTab !== "photos") {
    return []
  }

  // Primary action prompts — each mode shows only what it can actually deliver.
  // No cross-mode chips: if a user wants the other mode they use the MY MODEL ↔ SELFIE toggle.
  const primaryPrompts: MayaQuickPromptItem[] = proMode
    ? [
        { label: "New Photo", prompt: "Use my selfies and create a new photo for my brand" },
        { label: "Plan My Week", prompt: "Build a content calendar for my brand this week" },
        { label: "Upload & Create", prompt: "I want to upload photos and brand references for a new photo" },
      ]
    : hasTrainedModel
    ? [
        { label: "New Photo", prompt: "Use my trained model and create a new photo for my brand" },
        { label: "Plan My Week", prompt: "Build a content calendar for my brand this week" },
        { label: "My Model", prompt: "Use my trained model and create a photo for my brand now" },
      ]
    : [
        { label: "New Photo", prompt: "Create a new photo for my brand" },
        { label: "Plan My Week", prompt: "Build a content calendar for my brand this week" },
        { label: "Train My Model", prompt: "I want to train my custom model" },
      ]

  const styleChips = proMode
    ? SELFIE_STYLE_PROMPTS
    : hasTrainedModel
    ? MODEL_STYLE_PROMPTS
    : BASE_STYLE_PROMPTS

  return dedupePrompts([...primaryPrompts, ...styleChips]).slice(0, 7)
}

/**
 * Returns the correct input placeholder text for each Maya tab.
 * Matches the mockup's conversational, action-inviting tone.
 */
export function getMayaInputPlaceholder(activeTab: MayaSurfaceTab): string {
  switch (activeTab) {
    case "photos":
      return "What do you want to create?"
    case "videos":
      return "Pick a photo below to animate"
    case "training":
      return "Ask me anything about your model..."
    case "feed":
      return "Tell me what you're working on..."
    default:
      return "What do you want to create?"
  }
}
