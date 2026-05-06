import type { MayaSurfaceTab } from "@/lib/maya/tab-scope"
import { getMayaVideosTabQuickPrompts } from "@/lib/maya/tab-scope"

export interface MayaQuickPromptItem {
  label: string
  prompt: string
}

const PLAN_PROMPTS: MayaQuickPromptItem[] = [
  {
    label: "Write my next post",
    prompt: "Help me write my next post. Start with the goal, then give me the hook, caption, visual idea, and CTA.",
  },
  {
    label: "Fix my message",
    prompt: "Help me make my message clearer. Turn what I do into one simple offer line, three hooks, and one CTA.",
  },
  {
    label: "Plan this week",
    prompt: "Plan this week with the post order, captions, photo direction, and one first action for each day.",
  },
  {
    label: "Improve sales post",
    prompt: "Make this sales post clearer and easier to act on. Keep it simple, specific, and trust-building.",
  },
  {
    label: "Images for concept",
    prompt: "Generate image ideas and prompts for this content concept so the visual supports the message.",
  },
  {
    label: "What to sell",
    prompt: "Tell me what to sell this week based on my current message, audience, and easiest next step.",
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

  if (activeTab === "plan") {
    return PLAN_PROMPTS
  }

  if (activeTab !== "photos") {
    return []
  }

  // Photos is creation-first: image prompts, concept cards, styles, and source choice.
  const modeSupportPrompts: MayaQuickPromptItem[] = proMode
    ? [
        { label: "Use my selfies", prompt: "Use my selfies and create three photo concepts for my brand" },
        { label: "Upload references", prompt: "I want to upload photos and brand references before creating images" },
        { label: "Reuse gallery", prompt: "Show me my gallery so I can reuse an existing brand photo" },
      ]
    : hasTrainedModel
    ? [
        { label: "Use My Model", prompt: "Use my trained model and create three photo concepts for my brand" },
        { label: "Concept cards", prompt: "Create concept cards for a personal brand photoshoot" },
        { label: "Reuse gallery", prompt: "Show me my gallery so I can reuse an existing brand photo" },
      ]
    : [
        { label: "Concept cards", prompt: "Create concept cards for a personal brand photoshoot" },
        { label: "Reuse gallery", prompt: "Show me my gallery so I can reuse an existing brand photo" },
        { label: "Train My Model", prompt: "I want to train my custom model when I'm ready" },
      ]

  const styleChips = proMode
    ? SELFIE_STYLE_PROMPTS
    : hasTrainedModel
    ? MODEL_STYLE_PROMPTS
    : BASE_STYLE_PROMPTS

  return dedupePrompts([...modeSupportPrompts, ...styleChips]).slice(0, 7)
}

/**
 * Returns the correct input placeholder text for each Maya tab.
 * Matches the mockup's conversational, action-inviting tone.
 */
export function getMayaInputPlaceholder(activeTab: MayaSurfaceTab): string {
  switch (activeTab) {
    case "photos":
      return "What photo should we create?"
    case "plan":
      return "What are you selling, sharing, or planning?"
    case "videos":
      return "Pick a photo below to make a video"
    case "training":
      return "Ask me anything about your model..."
    case "feed":
      return "What do you want your content to sell or say?"
    default:
      return "What are you showing up for this week?"
  }
}
