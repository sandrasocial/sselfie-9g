/**
 * FEED PLANNER — DB-DRIVEN SCENE RESOLVER
 *
 * Loads scene definitions from the database (single source of truth).
 * No template logic, no vibe mapping, no overrides.
 */

import {
  loadFeedPositionTemplates,
  loadStyleDefinition,
  normalizeFeedStyle,
  normalizeFashionStyle,
  normalizeVisualAesthetic,
  type FeedPositionTemplate,
  type FeedStyleDefinition,
} from "./database-loader"

export interface FeedPlannerScene {
  position: number
  activity: string
  narrative: string
  location: {
    type: string
    description: string
    indoor: boolean
    public: boolean
  }
  outfit: {
    style: string
    description: string
    base: string
    layer?: string
  }
  objects: Array<{
    type: string
    description: string
    position?: "hand" | "table" | "bag" | "ground"
  }>
  lighting: {
    type: string
    quality: "even" | "uneven" | "dramatic"
    description: string
  }
  camera: {
    device: "iphone_15_pro"
    mode: "portrait" | "photo"
    framing: "close_up" | "midshot" | "full_body" | "environmental" | "flatlay"
  }
  pose: {
    type: string
    description: string
  }
  category: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
  mood: "luxury" | "minimal" | "beige"
  visualAesthetic?: string
  fashionStyle: string
  userId: string
  feedId: number
  finalPromptOverride?: string | null
}

function parseSelectionList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean)
      }
    } catch {
      return value.trim() ? [value.trim()] : []
    }
  }
  return []
}

function normalizeCameraFraming(value?: string | null): FeedPlannerScene["camera"]["framing"] {
  const framing = value?.toLowerCase().trim()
  if (framing === "close_up" || framing === "closeup") return "close_up"
  if (framing === "midshot" || framing === "mid_shot") return "midshot"
  if (framing === "flatlay") return "flatlay"
  if (framing === "environmental") return "environmental"
  return "full_body"
}

function inferIndoorPublic(locationType?: string | null): { indoor: boolean; public: boolean } {
  const normalized = locationType?.toLowerCase() || ""
  const indoor = normalized.includes("indoor")
  const publicFlag = normalized.includes("public") || normalized.includes("street") || normalized.includes("urban") || normalized.includes("outdoor")
  return { indoor, public: publicFlag }
}

function resolveLabels(
  feedLayout: { visual_aesthetic?: unknown; feed_style?: string | null; fashion_style?: unknown } | null | undefined,
  defaults: { visualAesthetic: string; feedStyle: string; fashionStyle: string }
) {
  const visualAestheticRaw = parseSelectionList(feedLayout?.visual_aesthetic)[0] || defaults.visualAesthetic
  const feedStyleRaw = feedLayout?.feed_style || defaults.feedStyle
  const fashionStyleRaw = parseSelectionList(feedLayout?.fashion_style)[0] || defaults.fashionStyle

  const visualAesthetic = normalizeVisualAesthetic(String(visualAestheticRaw)) || defaults.visualAesthetic
  const feedStyle = normalizeFeedStyle(String(feedStyleRaw)) || defaults.feedStyle
  const fashionStyle = normalizeFashionStyle(String(fashionStyleRaw)) || defaults.fashionStyle

  return { visualAesthetic, feedStyle, fashionStyle }
}

function mapTemplateToScene(
  template: FeedPositionTemplate,
  style: FeedStyleDefinition,
  userId: string,
  feedId: number,
  visualAesthetic: string,
  fashionStyle: string
): FeedPlannerScene {
  const framing = normalizeCameraFraming(template.camera_framing)
  const locationFlags = inferIndoorPublic(template.location_type)
  const outfitDesc = template.outfit_description || "editorial outfit"

  return {
    position: template.position,
    activity: template.activity || "lifestyle",
    narrative: template.narrative || "Lifestyle moment",
    location: {
      type: template.location_type || "lifestyle",
      description: template.location_description || "lifestyle location",
      indoor: locationFlags.indoor,
      public: locationFlags.public,
    },
    outfit: {
      style: outfitDesc,
      description: outfitDesc,
      base: "custom_base",
    },
    objects: (template.objects || []).map((obj) => ({
      type: obj.type,
      description: obj.description || obj.type,
      position: obj.position as FeedPlannerScene["objects"][number]["position"],
    })),
    lighting: {
      type: template.lighting_type || "natural_window_light",
      quality: "even",
      description: template.lighting_type || "natural light",
    },
    camera: {
      device: "iphone_15_pro",
      mode: "photo",
      framing,
    },
    pose: {
      type: template.pose_description || "natural_pose",
      description: template.pose_description || "natural pose",
    },
    category: style.category as FeedPlannerScene["category"],
    mood: style.mood as FeedPlannerScene["mood"],
    visualAesthetic,
    fashionStyle: fashionStyle.toLowerCase(),
    userId,
    feedId,
    finalPromptOverride: template.final_prompt_override || null,
  }
}

export async function resolveFeedPlannerScene(
  feedLayout: {
    id?: string | number
    feed_style?: string | null
    visual_aesthetic?: unknown
    fashion_style?: unknown
  } | null | undefined,
  user: { id: string | number },
  position: number,
  options: {
    defaultCategory?: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
  } = {}
): Promise<FeedPlannerScene> {
  const defaults = {
    visualAesthetic: normalizeVisualAesthetic(options.defaultCategory || "minimal") || "Minimal",
    feedStyle: normalizeFeedStyle("Light & Minimalistic") || "Light & Minimalistic",
    fashionStyle: normalizeFashionStyle("Casual") || "Casual",
  }

  const { visualAesthetic, feedStyle, fashionStyle } = resolveLabels(feedLayout, defaults)
  const styleDefinition = await loadStyleDefinition(visualAesthetic, feedStyle)
  const templates = await loadFeedPositionTemplates(visualAesthetic, feedStyle, fashionStyle)
  const template = templates.find((item) => item.position === position)

  if (!template) {
    throw new Error(`No template found for position ${position} in "${visualAesthetic} + ${feedStyle} + ${fashionStyle}".`)
  }

  return mapTemplateToScene(
    template,
    styleDefinition,
    String(user.id),
    Number(feedLayout?.id || 0),
    visualAesthetic,
    fashionStyle
  )
}

export async function resolveAllFeedPlannerScenes(
  feedLayout: {
    id?: string | number
    feed_style?: string | null
    visual_aesthetic?: unknown
    fashion_style?: unknown
  } | null | undefined,
  user: { id: string | number },
  options: {
    defaultCategory?: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
  } = {}
): Promise<FeedPlannerScene[]> {
  const defaults = {
    visualAesthetic: normalizeVisualAesthetic(options.defaultCategory || "minimal") || "Minimal",
    feedStyle: normalizeFeedStyle("Light & Minimalistic") || "Light & Minimalistic",
    fashionStyle: normalizeFashionStyle("Casual") || "Casual",
  }

  const { visualAesthetic, feedStyle, fashionStyle } = resolveLabels(feedLayout, defaults)
  const styleDefinition = await loadStyleDefinition(visualAesthetic, feedStyle)
  const templates = await loadFeedPositionTemplates(visualAesthetic, feedStyle, fashionStyle)

  if (templates.length !== 9) {
    throw new Error(
      `Expected 9 templates for "${visualAesthetic} + ${feedStyle} + ${fashionStyle}", found ${templates.length}.`
    )
  }

  return templates.map((template) =>
    mapTemplateToScene(
      template,
      styleDefinition,
      String(user.id),
      Number(feedLayout?.id || 0),
      visualAesthetic,
      fashionStyle
    )
  )
}
