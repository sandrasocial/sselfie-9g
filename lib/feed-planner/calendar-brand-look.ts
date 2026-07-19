import { CURATED_FEED_STYLE_MAP, type CuratedFeedStyleName } from "@/lib/style-presets"
import type { FeedVisualDirectionMode } from "@/lib/feed-planner/visual-direction"

interface CalendarBrandLookInput {
  feed?: Record<string, unknown> | null
  personalBrand?: { data?: Record<string, unknown> | null } | null
}

export interface CalendarBrandLook {
  directionMode: FeedVisualDirectionMode | null
  feedStyle: CuratedFeedStyleName | null
  feedStyleVariationId: number | null
  inherited: boolean
}

const DIRECTION_MODES = new Set<FeedVisualDirectionMode>([
  "maya",
  "curated",
  "custom",
  "inspiration",
])

function feedStyle(value: unknown): CuratedFeedStyleName | null {
  return typeof value === "string" && value in CURATED_FEED_STYLE_MAP
    ? (value as CuratedFeedStyleName)
    : null
}

function variationId(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

/**
 * Calendar grids created before the shared brand profile can be missing their own
 * direction fields. In that case the member's saved look is still the source of truth.
 */
export function resolveCalendarBrandLook({
  feed,
  personalBrand,
}: CalendarBrandLookInput): CalendarBrandLook {
  const explicitMode = DIRECTION_MODES.has(feed?.visual_direction_mode as FeedVisualDirectionMode)
    ? (feed?.visual_direction_mode as FeedVisualDirectionMode)
    : null
  const explicitStyle = feedStyle(feed?.feed_style)
  const explicitVariation = variationId(feed?.feed_style_variation_id)

  if (explicitMode || explicitStyle || explicitVariation) {
    return {
      directionMode: explicitMode ?? (explicitStyle ? "curated" : "maya"),
      feedStyle: explicitStyle,
      feedStyleVariationId: explicitVariation,
      inherited: false,
    }
  }

  const settingsPreference = personalBrand?.data?.settingsPreference
  const savedStyle = feedStyle(
    Array.isArray(settingsPreference) ? settingsPreference[0] : settingsPreference
  )
  if (!savedStyle) {
    return {
      directionMode: null,
      feedStyle: null,
      feedStyleVariationId: null,
      inherited: false,
    }
  }

  return {
    directionMode: "curated",
    feedStyle: savedStyle,
    feedStyleVariationId: variationId(personalBrand?.data?.feedStyleVariationId),
    inherited: true,
  }
}
