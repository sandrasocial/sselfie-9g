import {
  MAYA_CHAT_TYPE_DEFAULT,
  MAYA_CHAT_TYPE_FEED_PLANNER,
  MAYA_CHAT_TYPE_PRO,
  MAYA_CHAT_TYPE_VIDEOS,
} from "@/lib/maya/chat-type"

export type MayaSurfaceTab = "photos" | "videos" | "training" | "prompts" | "feed"
export type MayaTabHandoffTarget = "photos" | "videos" | "training"

export interface MayaTabHandoff {
  targetTab: MayaTabHandoffTarget
  title: string
  subtitle: string
  ctaLabel: string
}

const VIDEO_SCOPE_REGEX = /\b(video|reel|animate|animation|motion|b-?roll)\b/i
const TRAINING_SCOPE_REGEX = /\b(train|training|my model|custom model|trained model|lora)\b/i
const VIDEOS_TAB_ALLOWED_REGEX =
  /\b(video|reel|animate|animation|motion|b-?roll|gallery|reference|upload|latest photo|pick .*photo|choose .*photo)\b/i
const CHAT_SCOPE_REGEX =
  /\b(photo|photos|image|images|picture|pictures|post|ideas?|calendar|week|captions?|strategy|content|feed|brand|gallery)\b/i

function isTruthy(value?: string | null): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === "1" || normalized === "true" || normalized === "yes"
}

export function isMayaTabScopedChatEnabled(envValue?: string | null): boolean {
  if (envValue !== undefined) {
    return isTruthy(envValue)
  }

  const clientValue =
    typeof window !== "undefined"
      ? (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_FEATURE_MAYA_TAB_SCOPED_CHAT ||
        process.env.NEXT_PUBLIC_FEATURE_MAYA_TAB_SCOPED_CHAT
      : process.env.FEATURE_MAYA_TAB_SCOPED_CHAT || process.env.NEXT_PUBLIC_FEATURE_MAYA_TAB_SCOPED_CHAT

  if (clientValue === undefined || clientValue === null || String(clientValue).trim() === "") {
    return true
  }

  return isTruthy(String(clientValue))
}

export function resolveMayaChatTypeForTab(input: {
  activeTab?: MayaSurfaceTab
  proMode: boolean
  enabled: boolean
}): string {
  const activeTab = input.activeTab || "photos"

  if (activeTab === "feed") {
    return MAYA_CHAT_TYPE_FEED_PLANNER
  }

  if (input.enabled && activeTab === "videos") {
    return MAYA_CHAT_TYPE_VIDEOS
  }

  return input.proMode ? MAYA_CHAT_TYPE_PRO : MAYA_CHAT_TYPE_DEFAULT
}

export function resolveMayaTabHandoff(input: {
  activeTab?: MayaSurfaceTab
  userText: string
}): MayaTabHandoff | null {
  const userText = input.userText.trim()
  if (!userText) return null

  const activeTab = input.activeTab || "photos"

  if (activeTab === "photos") {
    if (TRAINING_SCOPE_REGEX.test(userText)) {
      return {
        targetTab: "training",
        title: "Let’s switch to Train",
        subtitle: "Training has its own setup. I’ll guide you through the images and the model step there.",
        ctaLabel: "Go to Train",
      }
    }

    if (VIDEO_SCOPE_REGEX.test(userText)) {
      return {
        targetTab: "videos",
        title: "Let’s make this in Videos",
        subtitle: "Videos has its own chat and image picker, so motion work stays in one clean place.",
        ctaLabel: "Go to Videos",
      }
    }

    return null
  }

  if (activeTab === "videos") {
    if (TRAINING_SCOPE_REGEX.test(userText)) {
      return {
        targetTab: "training",
        title: "Let’s switch to Train",
        subtitle: "Training lives in its own flow. I’ll meet you there and walk you through it.",
        ctaLabel: "Go to Train",
      }
    }

    if (VIDEOS_TAB_ALLOWED_REGEX.test(userText)) {
      return null
    }

    if (CHAT_SCOPE_REGEX.test(userText)) {
      return {
        targetTab: "photos",
        title: "Let’s move this to Chat",
        subtitle: "This tab is just for video work. In Chat I can help with photos, planning, and next steps.",
        ctaLabel: "Go to Chat",
      }
    }
  }

  return null
}

export function encodeMayaTabHandoffPayload(handoff: MayaTabHandoff): string {
  return [
    handoff.targetTab,
    encodeURIComponent(handoff.title),
    encodeURIComponent(handoff.subtitle),
    encodeURIComponent(handoff.ctaLabel),
  ].join("|")
}

export function getMayaVideosTabQuickPrompts(): Array<{ label: string; prompt: string }> {
  return [
    {
      label: "Make a Reel",
      prompt: "Create a short video from one of my photos",
    },
    {
      label: "Choose a Photo",
      prompt: "Show me my gallery so I can choose a photo for a video",
    },
    {
      label: "Use My Latest Photo",
      prompt: "Use my latest photo for a video",
    },
    {
      label: "Show Motion Ideas",
      prompt: "Show me the best video options for my photos",
    },
  ]
}
