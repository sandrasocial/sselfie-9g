import type { MayaSurfaceTab } from "@/lib/maya/tab-scope"
import { getMayaVideosTabQuickPrompts } from "@/lib/maya/tab-scope"

export interface MayaQuickPromptItem {
  label: string
  prompt: string
}

const WEEKLY_CONTENT_PROMPTS: MayaQuickPromptItem[] = [
  {
    label: "Start my weekly ritual",
    prompt: "Let's plan my week. Walk me through the SSELFIE weekly ritual — theme, photo direction, captions, and next action.",
  },
  {
    label: "Plan my week",
    prompt: "Plan my content for this week with photo ideas, captions, and the first post I should create.",
  },
  {
    label: "3 photo ideas",
    prompt: "Give me three photo ideas for this week's content and explain when I should use each one.",
  },
  {
    label: "Write captions",
    prompt: "Write captions for my next post and give me a soft call to action.",
  },
  {
    label: "Show up today",
    prompt: "Help me show up today without overthinking. Give me one simple post idea, photo direction, and caption.",
  },
]

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

  // Weekly content comes first; photo-generation mode details stay available as support.
  const modeSupportPrompts: MayaQuickPromptItem[] = proMode
    ? [
        { label: "Use my selfies", prompt: "Use my selfies and create a photo direction for this week's content" },
        { label: "Upload references", prompt: "I want to upload photos and brand references for this week's content plan" },
      ]
    : hasTrainedModel
    ? [
        { label: "Use My Model", prompt: "Use my trained model for photo ideas in this week's content plan" },
        { label: "Soft luxury", prompt: "Give me a soft luxury photo direction for this week's content" },
      ]
    : [
        { label: "Photo ideas", prompt: "Give me photo ideas for this week's content" },
        { label: "Train My Model", prompt: "I want to train my custom model when I'm ready" },
      ]

  const styleChips = proMode
    ? SELFIE_STYLE_PROMPTS
    : hasTrainedModel
    ? MODEL_STYLE_PROMPTS
    : BASE_STYLE_PROMPTS

  return dedupePrompts([...WEEKLY_CONTENT_PROMPTS, ...modeSupportPrompts, ...styleChips]).slice(0, 7)
}

/**
 * Returns the correct input placeholder text for each Maya tab.
 * Matches the mockup's conversational, action-inviting tone.
 */
export function getMayaInputPlaceholder(activeTab: MayaSurfaceTab): string {
  switch (activeTab) {
    case "photos":
      return "What's your theme this week?"
    case "videos":
      return "Pick a photo below to animate"
    case "training":
      return "Ask me anything about your model..."
    case "feed":
      return "What do you want your content to sell or say?"
    default:
      return "What are you showing up for this week?"
  }
}
