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
  { label: "Make it expensive", prompt: "Use my trained model and create one polished photo that makes my selfie look expensive" },
  { label: "Dark mood", prompt: "Use my trained model and create a dark and moody photo for my brand" },
  { label: "Soft luxury", prompt: "Use my trained model and create a soft luxury photo for my brand" },
  { label: "Natural light", prompt: "Use my trained model and create a natural light photo for my brand" },
]

// Classic style chips when there's no trained model (base model generation)
const BASE_STYLE_PROMPTS: MayaQuickPromptItem[] = [
  { label: "Make it expensive", prompt: "Create one polished photo that makes my selfie look expensive" },
  { label: "Dark mood", prompt: "Create a dark and moody photo for my brand" },
  { label: "Soft luxury", prompt: "Create a soft luxury photo for my brand" },
  { label: "Natural light", prompt: "Create a natural light photo for my brand" },
]

const SELFIE_STYLE_PROMPTS: MayaQuickPromptItem[] = [
  { label: "Make it expensive", prompt: "Use my selfies and create one polished photo that makes it look expensive" },
  { label: "Dark mood", prompt: "Use my selfies and create a dark and moody photo for my brand" },
  { label: "Soft luxury", prompt: "Use my selfies and create a soft luxury photo for my brand" },
  { label: "Natural light", prompt: "Use my selfies and create a natural light photo for my brand" },
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

  // Photos is creation-first: selfie/photo starts, styles, and source choice.
  const modeSupportPrompts: MayaQuickPromptItem[] = proMode
    ? [
        { label: "Upload selfie", prompt: "I want to upload a selfie and make it look expensive" },
        { label: "Use saved photo", prompt: "Show me my gallery so I can reuse an existing brand photo" },
      ]
    : hasTrainedModel
    ? [
        { label: "Use my look", prompt: "Use my trained model and create one polished photo direction for my brand" },
        { label: "Use saved photo", prompt: "Show me my gallery so I can reuse an existing brand photo" },
      ]
    : [
        { label: "Photo ideas", prompt: "Create three polished photo ideas for my personal brand" },
        { label: "Use saved photo", prompt: "Show me my gallery so I can reuse an existing brand photo" },
      ]

  const styleChips = proMode
    ? SELFIE_STYLE_PROMPTS
    : hasTrainedModel
    ? MODEL_STYLE_PROMPTS
    : BASE_STYLE_PROMPTS

  return dedupePrompts([...modeSupportPrompts, ...styleChips]).slice(0, 5)
}

/**
 * Returns the correct input placeholder text for each Maya tab.
 * Matches the mockup's conversational, action-inviting tone.
 */
export function getMayaInputPlaceholder(activeTab: MayaSurfaceTab): string {
  switch (activeTab) {
    case "photos":
      return "Tell Maya what you want to make..."
    case "plan":
      return "What should Maya help you say?"
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
