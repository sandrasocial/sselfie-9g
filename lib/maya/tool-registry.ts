export type MayaToolId =
  | "show_capabilities"
  | "show_studio_hub"
  | "show_gallery"
  | "save_to_gallery"
  | "generate_image"
  | "generate_video"
  | "show_upload_zone"
  | "edit_asset"
  | "create_asset"
  | "collect_offer_brief"

export interface MayaToolDefinition {
  id: MayaToolId
  label: string
  marker: string
  resultType: string
}

export const MAYA_TOOL_REGISTRY: Record<MayaToolId, MayaToolDefinition> = {
  show_capabilities: {
    id: "show_capabilities",
    label: "Show Capabilities",
    marker: "SHOW_CAPABILITIES",
    resultType: "tool-showCapabilities",
  },
  show_studio_hub: {
    id: "show_studio_hub",
    label: "Show Studio Hub",
    marker: "SHOW_STUDIO_HUB",
    resultType: "tool-showStudioHub",
  },
  show_gallery: {
    id: "show_gallery",
    label: "Show Gallery",
    marker: "SHOW_GALLERY",
    resultType: "tool-showGallery",
  },
  save_to_gallery: {
    id: "save_to_gallery",
    label: "Save To Gallery",
    marker: "SAVE_TO_GALLERY",
    resultType: "tool-saveToGallery",
  },
  generate_image: {
    id: "generate_image",
    label: "Generate Image",
    marker: "GENERATE_IMAGE",
    resultType: "tool-generateImage",
  },
  generate_video: {
    id: "generate_video",
    label: "Generate Video",
    marker: "GENERATE_VIDEO",
    resultType: "tool-generateVideo",
  },
  show_upload_zone: {
    id: "show_upload_zone",
    label: "Show Upload Zone",
    marker: "SHOW_UPLOAD_ZONE",
    resultType: "tool-showUploadZone",
  },
  edit_asset: {
    id: "edit_asset",
    label: "Edit Asset",
    marker: "EDIT_ASSET",
    resultType: "tool-editAsset",
  },
  create_asset: {
    id: "create_asset",
    label: "Create Asset",
    marker: "CREATE_ASSET",
    resultType: "tool-createAssetPreview",
  },
  collect_offer_brief: {
    id: "collect_offer_brief",
    label: "Collect Offer Brief",
    marker: "COLLECT_OFFER_BRIEF",
    resultType: "tool-collectOfferBrief",
  },
}

export function formatMayaToolMarker(tool: MayaToolId, payload?: string): string {
  const marker = MAYA_TOOL_REGISTRY[tool].marker
  if (!payload || payload.trim().length === 0) {
    return `[${marker}]`
  }
  return `[${marker}:${payload.trim()}]`
}
