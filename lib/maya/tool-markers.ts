import {
  parseOfferBriefCollectionPayload,
  type MayaOfferBriefField,
  type MayaOfferBriefFormValues,
} from "@/lib/maya/offer-brief"

export type MayaToolMarker =
  | { tool: "show_capabilities" }
  | { tool: "show_studio_hub" }
  | { tool: "show_gallery" }
  | { tool: "save_to_gallery"; imageId?: string; target: "latest" | "explicit" }
  | { tool: "generate_image"; source: "selfies" | "custom_model" | "base_model" | "choose_source" }
  | { tool: "generate_video" }
  | { tool: "show_upload_zone"; category: "selfies" | "products" | "people" | "vibes" }
  | {
      tool: "switch_maya_tab"
      targetTab: "photos" | "plan" | "videos" | "training"
      title?: string
      subtitle?: string
      ctaLabel?: string
    }
  | {
      tool: "collect_offer_brief"
      assetType: "page" | "calendar"
      prefill?: Partial<MayaOfferBriefFormValues>
      missingFields?: MayaOfferBriefField[]
    }
  | { tool: "edit_asset"; assetType: "page" | "calendar" | "pdf"; assetLabel: string }
  | {
      tool: "create_asset"
      assetType: "page" | "calendar" | "pdf"
      assetLabel: string
      assetId?: string
      previewText?: string
      url?: string
    }
  | {
      tool: "structured_asset_blocked"
      assetType: "page" | "calendar" | "pdf"
      reason: "intent_match_failed" | "tool_failed" | "validation_failed"
      missingFields: Array<"action_verb" | "asset_target">
      recoveryHint?: string
    }
  | { tool: "maya_gap_offer"; dayLabels: string[] }
  | {
      tool: "week_plan"
      themeId: string
      photoDirection: string
      captionAngles: string[]
      nextAction: string
    }

const SHOW_CAPABILITIES_REGEX = /\[SHOW_CAPABILITIES\]/gi
const SHOW_STUDIO_HUB_REGEX = /\[SHOW_STUDIO_HUB\]/gi
const SHOW_GALLERY_REGEX = /\[SHOW_GALLERY\]/gi
const SAVE_TO_GALLERY_REGEX = /\[SAVE_TO_GALLERY(?:\s*:\s*([^\]]+))?\]/gi
const GENERATE_IMAGE_REGEX = /\[GENERATE_IMAGE(?:\s*:\s*([^\]]+))?\]/gi
const GENERATE_VIDEO_REGEX = /\[GENERATE_VIDEO(?:\s*:\s*([^\]]+))?\]/gi
const SHOW_UPLOAD_ZONE_REGEX = /\[SHOW_UPLOAD_ZONE(?:\s*:\s*([^\]]+))?\]/gi
const SWITCH_MAYA_TAB_REGEX = /\[SWITCH_MAYA_TAB(?:\s*:\s*([^\]]+))?\]/gi
const COLLECT_OFFER_BRIEF_REGEX = /\[COLLECT_OFFER_BRIEF(?:\s*:\s*([^\]]+))?\]/gi
const SUBMIT_OFFER_BRIEF_REGEX = /\[SUBMIT_OFFER_BRIEF:\s*[^\]]+\]/gi
const EDIT_ASSET_REGEX = /\[EDIT_ASSET(?:\s*:\s*([^\]]+))?\]/gi
const CREATE_ASSET_REGEX = /\[CREATE_ASSET(?:\s*:\s*([^\]]+))?\]/gi
const STRUCTURED_ASSET_BLOCKED_REGEX = /\[STRUCTURED_ASSET_BLOCKED(?:\s*:\s*([^\]]+))?\]/gi
const MAYA_GAP_OFFER_REGEX = /\[MAYA_GAP_OFFER(?:\s*:\s*([^\]]+))?\]/gi
const WEEK_PLAN_REGEX = /\[WEEK_PLAN(?:\s*:\s*([^\]]+))?\]/gi
const VIDEO_CARD_REGEX = /\[VIDEO_CARD:[^\]]+\]/gi
const SAVE_TARGET_IMAGE_ID_REGEX = /^(?:ai|gen)_\d+$/i
const GENERATE_SOURCE_SET = new Set(["selfies", "custom_model", "base_model", "choose_source"])
const UPLOAD_CATEGORY_SET = new Set(["selfies", "products", "people", "vibes"])
const EDIT_ASSET_SET = new Set(["page", "calendar", "pdf"])
const TAB_HANDOFF_SET = new Set(["photos", "plan", "videos", "training"])

function decodeMarkerText(value: string): string {
  if (!value) return ""
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function getDefaultAssetLabel(assetType: "page" | "calendar" | "pdf"): string {
  if (assetType === "calendar") return "Content Calendar"
  if (assetType === "pdf") return "Workbook"
  return "Landing Page"
}

export function parseMayaToolMarkers(text: string): MayaToolMarker[] {
  if (!text) return []

  const markers: MayaToolMarker[] = []

  if (SHOW_CAPABILITIES_REGEX.test(text)) {
    markers.push({ tool: "show_capabilities" })
  }
  SHOW_CAPABILITIES_REGEX.lastIndex = 0

  if (SHOW_STUDIO_HUB_REGEX.test(text)) {
    markers.push({ tool: "show_studio_hub" })
  }
  SHOW_STUDIO_HUB_REGEX.lastIndex = 0

  if (SHOW_GALLERY_REGEX.test(text)) {
    markers.push({ tool: "show_gallery" })
  }
  SHOW_GALLERY_REGEX.lastIndex = 0

  let saveMatch: RegExpExecArray | null = null
  while ((saveMatch = SAVE_TO_GALLERY_REGEX.exec(text)) !== null) {
    const rawTarget = (saveMatch[1] || "").trim()
    if (!rawTarget || rawTarget.toLowerCase() === "latest") {
      markers.push({ tool: "save_to_gallery", target: "latest" })
      continue
    }

    if (SAVE_TARGET_IMAGE_ID_REGEX.test(rawTarget)) {
      markers.push({
        tool: "save_to_gallery",
        target: "explicit",
        imageId: rawTarget.toLowerCase(),
      })
      continue
    }

    // Unknown payload defaults to latest for safety
    markers.push({ tool: "save_to_gallery", target: "latest" })
  }

  SAVE_TO_GALLERY_REGEX.lastIndex = 0

  let generateMatch: RegExpExecArray | null = null
  while ((generateMatch = GENERATE_IMAGE_REGEX.exec(text)) !== null) {
    const rawSource = (generateMatch[1] || "").trim().toLowerCase()
    const source = GENERATE_SOURCE_SET.has(rawSource) ? rawSource : "choose_source"
    markers.push({
      tool: "generate_image",
      source: source as "selfies" | "custom_model" | "base_model" | "choose_source",
    })
  }

  GENERATE_IMAGE_REGEX.lastIndex = 0

  let generateVideoMatch: RegExpExecArray | null = null
  while ((generateVideoMatch = GENERATE_VIDEO_REGEX.exec(text)) !== null) {
    markers.push({
      tool: "generate_video",
    })
  }

  GENERATE_VIDEO_REGEX.lastIndex = 0

  let uploadMatch: RegExpExecArray | null = null
  while ((uploadMatch = SHOW_UPLOAD_ZONE_REGEX.exec(text)) !== null) {
    const rawCategory = (uploadMatch[1] || "").trim().toLowerCase()
    const category = UPLOAD_CATEGORY_SET.has(rawCategory) ? rawCategory : "selfies"
    markers.push({
      tool: "show_upload_zone",
      category: category as "selfies" | "products" | "people" | "vibes",
    })
  }

  SHOW_UPLOAD_ZONE_REGEX.lastIndex = 0

  let switchTabMatch: RegExpExecArray | null = null
  while ((switchTabMatch = SWITCH_MAYA_TAB_REGEX.exec(text)) !== null) {
    const rawPayload = (switchTabMatch[1] || "").trim()
    const [rawTab = "", rawTitle = "", rawSubtitle = "", rawCta = ""] = rawPayload.split("|")
    const normalizedTab = rawTab.trim().toLowerCase()
    const targetTab = TAB_HANDOFF_SET.has(normalizedTab) ? normalizedTab : "photos"

    markers.push({
      tool: "switch_maya_tab",
      targetTab: targetTab as "photos" | "plan" | "videos" | "training",
      title: decodeMarkerText(rawTitle.trim()) || undefined,
      subtitle: decodeMarkerText(rawSubtitle.trim()) || undefined,
      ctaLabel: decodeMarkerText(rawCta.trim()) || undefined,
    })
  }

  SWITCH_MAYA_TAB_REGEX.lastIndex = 0

  let collectOfferBriefMatch: RegExpExecArray | null = null
  while ((collectOfferBriefMatch = COLLECT_OFFER_BRIEF_REGEX.exec(text)) !== null) {
    const rawPayload = (collectOfferBriefMatch[1] || "").trim()
    const parsedPayload =
      parseOfferBriefCollectionPayload(rawPayload) ||
      (rawPayload.toLowerCase() === "calendar"
        ? { assetType: "calendar" as const, prefill: {}, missingFields: [] }
        : rawPayload.toLowerCase() === "page"
          ? { assetType: "page" as const, prefill: {}, missingFields: [] }
          : null)
    const marker: MayaToolMarker = {
      tool: "collect_offer_brief",
      assetType: parsedPayload?.assetType === "calendar" ? "calendar" : "page",
    }

    if (parsedPayload?.prefill && Object.keys(parsedPayload.prefill).length > 0) {
      marker.prefill = parsedPayload.prefill
    }
    if (parsedPayload?.missingFields && parsedPayload.missingFields.length > 0) {
      marker.missingFields = parsedPayload.missingFields
    }

    markers.push(marker)
  }

  COLLECT_OFFER_BRIEF_REGEX.lastIndex = 0

  let editAssetMatch: RegExpExecArray | null = null
  while ((editAssetMatch = EDIT_ASSET_REGEX.exec(text)) !== null) {
    const rawPayload = (editAssetMatch[1] || "").trim()
    const [rawType = "", rawLabel = ""] = rawPayload.split("|")
    const normalizedType = rawType.toLowerCase()
    const parsedType = EDIT_ASSET_SET.has(normalizedType) ? (normalizedType as "page" | "calendar" | "pdf") : "page"
    let assetLabel = getDefaultAssetLabel(parsedType)

    if (rawLabel.trim().length > 0) {
      try {
        assetLabel = decodeURIComponent(rawLabel.trim())
      } catch {
        assetLabel = rawLabel.trim()
      }
    }

    markers.push({
      tool: "edit_asset",
      assetType: parsedType,
      assetLabel,
    })
  }

  EDIT_ASSET_REGEX.lastIndex = 0

  let createAssetMatch: RegExpExecArray | null = null
  while ((createAssetMatch = CREATE_ASSET_REGEX.exec(text)) !== null) {
    const rawPayload = (createAssetMatch[1] || "").trim()
    const [rawType = "", rawLabel = "", rawAssetId = "", rawPreview = "", rawUrl = ""] = rawPayload.split("|")
    const normalizedType = rawType.toLowerCase()
    const parsedType = EDIT_ASSET_SET.has(normalizedType) ? (normalizedType as "page" | "calendar" | "pdf") : "page"

    let assetLabel = getDefaultAssetLabel(parsedType)
    if (rawLabel.trim().length > 0) {
      try {
        assetLabel = decodeURIComponent(rawLabel.trim())
      } catch {
        assetLabel = rawLabel.trim()
      }
    }

    let previewText = ""
    if (rawPreview.trim().length > 0) {
      try {
        previewText = decodeURIComponent(rawPreview.trim())
      } catch {
        previewText = rawPreview.trim()
      }
    }

    let url = ""
    if (rawUrl.trim().length > 0) {
      try {
        url = decodeURIComponent(rawUrl.trim())
      } catch {
        url = rawUrl.trim()
      }
    }

    markers.push({
      tool: "create_asset",
      assetType: parsedType,
      assetLabel,
      assetId: rawAssetId.trim() || undefined,
      previewText: previewText || undefined,
      url: url || undefined,
    })
  }

  CREATE_ASSET_REGEX.lastIndex = 0

  let structuredBlockedMatch: RegExpExecArray | null = null
  while ((structuredBlockedMatch = STRUCTURED_ASSET_BLOCKED_REGEX.exec(text)) !== null) {
    const rawPayload = (structuredBlockedMatch[1] || "").trim()
    const [rawType = "", rawReason = "", rawMissing = "", rawHint = ""] = rawPayload.split("|")
    const normalizedType = rawType.toLowerCase()
    const parsedType = EDIT_ASSET_SET.has(normalizedType) ? (normalizedType as "page" | "calendar" | "pdf") : "calendar"
    const parsedReason =
      rawReason === "intent_match_failed" || rawReason === "tool_failed" || rawReason === "validation_failed"
        ? rawReason
        : "intent_match_failed"
    const missingFields = rawMissing
      .split(",")
      .map((field) => field.trim().toLowerCase())
      .filter((field): field is "action_verb" | "asset_target" => field === "action_verb" || field === "asset_target")

    let recoveryHint = ""
    if (rawHint.trim().length > 0) {
      try {
        recoveryHint = decodeURIComponent(rawHint.trim())
      } catch {
        recoveryHint = rawHint.trim()
      }
    }

    markers.push({
      tool: "structured_asset_blocked",
      assetType: parsedType,
      reason: parsedReason,
      missingFields: missingFields.length > 0 ? missingFields : ["action_verb"],
      recoveryHint: recoveryHint || undefined,
    })
  }

  STRUCTURED_ASSET_BLOCKED_REGEX.lastIndex = 0

  let mayaGapOfferMatch: RegExpExecArray | null = null
  while ((mayaGapOfferMatch = MAYA_GAP_OFFER_REGEX.exec(text)) !== null) {
    const rawPayload = (mayaGapOfferMatch[1] || "").trim()
    const dayLabels = rawPayload ? rawPayload.split("|").map((s) => s.trim()).filter(Boolean) : []
    markers.push({ tool: "maya_gap_offer", dayLabels })
  }

  MAYA_GAP_OFFER_REGEX.lastIndex = 0

  let weekPlanMatch: RegExpExecArray | null = null
  while ((weekPlanMatch = WEEK_PLAN_REGEX.exec(text)) !== null) {
    const rawPayload = (weekPlanMatch[1] || "").trim()
    const [rawThemeId = "", rawPhotoDir = "", rawCaption1 = "", rawCaption2 = "", rawNextAction = ""] =
      rawPayload.split("|")
    const captionAngles = [rawCaption1, rawCaption2]
      .map((c) => decodeMarkerText(c.trim()))
      .filter(Boolean)
    markers.push({
      tool: "week_plan",
      themeId: rawThemeId.trim() || "quiet_authority",
      photoDirection: decodeMarkerText(rawPhotoDir.trim()),
      captionAngles,
      nextAction: decodeMarkerText(rawNextAction.trim()),
    })
  }

  WEEK_PLAN_REGEX.lastIndex = 0
  return markers
}

export function stripMayaToolMarkers(text: string): string {
  if (!text) return ""
  return text
    .replace(SHOW_CAPABILITIES_REGEX, "")
    .replace(SHOW_STUDIO_HUB_REGEX, "")
    .replace(SHOW_GALLERY_REGEX, "")
    .replace(SAVE_TO_GALLERY_REGEX, "")
    .replace(GENERATE_IMAGE_REGEX, "")
    .replace(GENERATE_VIDEO_REGEX, "")
    .replace(SHOW_UPLOAD_ZONE_REGEX, "")
    .replace(SWITCH_MAYA_TAB_REGEX, "")
    .replace(COLLECT_OFFER_BRIEF_REGEX, "")
    .replace(SUBMIT_OFFER_BRIEF_REGEX, "")
    .replace(EDIT_ASSET_REGEX, "")
    .replace(CREATE_ASSET_REGEX, "")
    .replace(STRUCTURED_ASSET_BLOCKED_REGEX, "")
    .replace(MAYA_GAP_OFFER_REGEX, "")
    .replace(WEEK_PLAN_REGEX, "")
    .replace(VIDEO_CARD_REGEX, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s{2,}/g, " ")
    .trim()
}
