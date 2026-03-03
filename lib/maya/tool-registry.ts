export type MayaToolId = "show_gallery" | "save_to_gallery" | "generate_image" | "show_upload_zone" | "edit_asset" | "create_asset"

export interface MayaToolDefinition {
  id: MayaToolId
  label: string
  marker: string
  resultType: string
}

export const MAYA_TOOL_REGISTRY: Record<MayaToolId, MayaToolDefinition> = {
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
}

export function formatMayaToolMarker(tool: MayaToolId, payload?: string): string {
  const marker = MAYA_TOOL_REGISTRY[tool].marker
  if (!payload || payload.trim().length === 0) {
    return `[${marker}]`
  }
  return `[${marker}:${payload.trim()}]`
}
