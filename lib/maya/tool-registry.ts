export type MayaToolId =
  | "show_capabilities"
  | "show_studio_hub"
  | "show_gallery"
  | "save_to_gallery"
  | "generate_image"
  | "generate_video"
  | "show_upload_zone"
  | "switch_maya_tab"
  | "edit_asset"
  | "create_asset"
  | "collect_offer_brief"
  | "structured_asset_blocked"
  | "maya_gap_offer"
  | "week_plan"

export type MayaToolConfirmationPolicy = "auto" | "confirm_before" | "confirm_with_preview"

export interface MayaToolDefinition {
  id: MayaToolId
  label: string
  marker: string
  resultType: string
  description: string
  confirmationPolicy: MayaToolConfirmationPolicy
  estimatedCreditCost: number
}

export const MAYA_TOOL_REGISTRY: Record<MayaToolId, MayaToolDefinition> = {
  show_capabilities: {
    id: "show_capabilities",
    label: "Show Capabilities",
    marker: "SHOW_CAPABILITIES",
    resultType: "tool-showCapabilities",
    description: "Show Maya's available actions and product boundaries inside the current surface.",
    confirmationPolicy: "auto",
    estimatedCreditCost: 0,
  },
  show_studio_hub: {
    id: "show_studio_hub",
    label: "Show Studio Hub",
    marker: "SHOW_STUDIO_HUB",
    resultType: "tool-showStudioHub",
    description: "Open a workspace summary with recent feeds, photos, and videos.",
    confirmationPolicy: "auto",
    estimatedCreditCost: 0,
  },
  show_gallery: {
    id: "show_gallery",
    label: "Show Gallery",
    marker: "SHOW_GALLERY",
    resultType: "tool-showGallery",
    description: "Show the user's latest saved photos so Maya can reuse an existing image before generating a new one.",
    confirmationPolicy: "auto",
    estimatedCreditCost: 0,
  },
  save_to_gallery: {
    id: "save_to_gallery",
    label: "Save To Gallery",
    marker: "SAVE_TO_GALLERY",
    resultType: "tool-saveToGallery",
    description: "Save an existing generated image into the user's gallery.",
    confirmationPolicy: "auto",
    estimatedCreditCost: 0,
  },
  generate_image: {
    id: "generate_image",
    label: "Generate Image",
    marker: "GENERATE_IMAGE",
    resultType: "tool-generateImage",
    description: "Prepare a new image generation flow. Source choice is a preview step and generation must be explicitly confirmed.",
    confirmationPolicy: "confirm_before",
    estimatedCreditCost: 1,
  },
  generate_video: {
    id: "generate_video",
    label: "Generate Video",
    marker: "GENERATE_VIDEO",
    resultType: "tool-generateVideo",
    description: "Animate an existing image into a video draft.",
    confirmationPolicy: "confirm_before",
    estimatedCreditCost: 3,
  },
  show_upload_zone: {
    id: "show_upload_zone",
    label: "Show Upload Zone",
    marker: "SHOW_UPLOAD_ZONE",
    resultType: "tool-showUploadZone",
    description: "Open the inline upload flow for selfies, products, people, or vibe references.",
    confirmationPolicy: "auto",
    estimatedCreditCost: 0,
  },
  switch_maya_tab: {
    id: "switch_maya_tab",
    label: "Switch Maya Tab",
    marker: "SWITCH_MAYA_TAB",
    resultType: "tool-switchMayaTab",
    description: "Move the user into the Maya tab that owns the requested workflow.",
    confirmationPolicy: "auto",
    estimatedCreditCost: 0,
  },
  edit_asset: {
    id: "edit_asset",
    label: "Edit Asset",
    marker: "EDIT_ASSET",
    resultType: "tool-editAsset",
    description: "Resume editing on an existing generated asset inside its supported flow.",
    confirmationPolicy: "auto",
    estimatedCreditCost: 0,
  },
  create_asset: {
    id: "create_asset",
    label: "Create Asset",
    marker: "CREATE_ASSET",
    resultType: "tool-createAssetPreview",
    description: "Create a structured draft asset preview such as a calendar or page draft.",
    confirmationPolicy: "auto",
    estimatedCreditCost: 0,
  },
  collect_offer_brief: {
    id: "collect_offer_brief",
    label: "Collect Offer Brief",
    marker: "COLLECT_OFFER_BRIEF",
    resultType: "tool-collectOfferBrief",
    description: "Collect the minimum missing offer details before building a structured asset.",
    confirmationPolicy: "auto",
    estimatedCreditCost: 0,
  },
  structured_asset_blocked: {
    id: "structured_asset_blocked",
    label: "Structured Asset Blocked",
    marker: "STRUCTURED_ASSET_BLOCKED",
    resultType: "tool-structuredAssetBlocked",
    description: "Explain why a structured asset could not be built yet and ask for the missing instruction.",
    confirmationPolicy: "auto",
    estimatedCreditCost: 0,
  },
  maya_gap_offer: {
    id: "maya_gap_offer",
    label: "Calendar Gap Offer",
    marker: "MAYA_GAP_OFFER",
    resultType: "tool-mayaGapOffer",
    description: "Offer Maya's calendar gap-filling flow when a content plan has open publishing days.",
    confirmationPolicy: "auto",
    estimatedCreditCost: 0,
  },
  week_plan: {
    id: "week_plan",
    label: "Week Plan",
    marker: "WEEK_PLAN",
    resultType: "tool-weekPlan",
    description: "Surface the weekly content plan summary card with theme, photo directions, captions, and next action.",
    confirmationPolicy: "auto",
    estimatedCreditCost: 0,
  },
}

export function formatMayaToolMarker(tool: MayaToolId, payload?: string): string {
  const marker = MAYA_TOOL_REGISTRY[tool].marker
  if (!payload || payload.trim().length === 0) {
    return `[${marker}]`
  }
  return `[${marker}:${payload.trim()}]`
}
