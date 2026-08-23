import type { OutputFormat } from "@/components/app-v3/types"

export const MAYA_WORKSPACE_PATHS = ["ai-photos", "edit-photo", "build-post"] as const

export type MayaWorkspacePath = (typeof MAYA_WORKSPACE_PATHS)[number]

export const MAYA_WORKSPACE_ACTIONS = [
  "create-photo",
  "create-photoshoot",
  "edit-photo",
  "apply-preset",
  "build-carousel",
  "write-caption",
  "build-story-slide",
  "build-story-sequence",
  "build-reel-cover",
] as const

export type MayaWorkspaceAction = (typeof MAYA_WORKSPACE_ACTIONS)[number]

export type MayaWorkspaceTool =
  | "emit_concepts"
  | "ask_clarify"
  | "set_format"
  | "remember"
  | "save_brand_profile"
  | "show_feed_plan"

const FORMATS_BY_PATH: Record<MayaWorkspacePath, readonly OutputFormat[]> = {
  "ai-photos": ["photo", "photoshoot"],
  "edit-photo": [],
  "build-post": ["reel-cover", "carousel", "story-slide", "story-sequence"],
}

const ACTIONS_BY_PATH: Record<MayaWorkspacePath, readonly MayaWorkspaceAction[]> = {
  "ai-photos": ["create-photo", "create-photoshoot"],
  "edit-photo": ["edit-photo", "apply-preset"],
  "build-post": [
    "build-carousel",
    "write-caption",
    "build-story-slide",
    "build-story-sequence",
    "build-reel-cover",
  ],
}

const TOOLS_BY_PATH: Record<MayaWorkspacePath, readonly MayaWorkspaceTool[]> = {
  "ai-photos": [
    "emit_concepts",
    "ask_clarify",
    "set_format",
    "remember",
    "save_brand_profile",
    "show_feed_plan",
  ],
  "edit-photo": ["ask_clarify", "remember", "save_brand_profile"],
  "build-post": [
    "emit_concepts",
    "ask_clarify",
    "set_format",
    "remember",
    "save_brand_profile",
    "show_feed_plan",
  ],
}

export function isMayaWorkspacePath(value: unknown): value is MayaWorkspacePath {
  return (
    typeof value === "string" &&
    (MAYA_WORKSPACE_PATHS as readonly string[]).includes(value)
  )
}

export function isMayaWorkspaceAction(value: unknown): value is MayaWorkspaceAction {
  return (
    typeof value === "string" &&
    (MAYA_WORKSPACE_ACTIONS as readonly string[]).includes(value)
  )
}

export function allowedFormatsForMayaPath(path: MayaWorkspacePath): readonly OutputFormat[] {
  return FORMATS_BY_PATH[path]
}

export function allowedActionsForMayaPath(
  path: MayaWorkspacePath
): readonly MayaWorkspaceAction[] {
  return ACTIONS_BY_PATH[path]
}

export function isFormatAllowedForMayaPath(
  path: MayaWorkspacePath,
  format: OutputFormat | null | undefined
): boolean {
  return format == null || FORMATS_BY_PATH[path].includes(format)
}

export function isActionAllowedForMayaPath(
  path: MayaWorkspacePath,
  action: MayaWorkspaceAction | null | undefined
): boolean {
  return action == null || ACTIONS_BY_PATH[path].includes(action)
}

export function isToolAllowedForMayaPath(
  path: MayaWorkspacePath,
  toolName: MayaWorkspaceTool
): boolean {
  return TOOLS_BY_PATH[path].includes(toolName)
}

export function outputFormatForMayaWorkspaceAction(
  action: MayaWorkspaceAction
): OutputFormat | null {
  if (action === "create-photo") return "photo"
  if (action === "create-photoshoot") return "photoshoot"
  if (action === "build-carousel") return "carousel"
  if (action === "build-story-slide") return "story-slide"
  if (action === "build-story-sequence") return "story-sequence"
  if (action === "build-reel-cover") return "reel-cover"
  return null
}

export function mayaWorkspacePathForFormat(
  format: OutputFormat | null | undefined
): MayaWorkspacePath | null {
  if (format === "photo" || format === "photoshoot") return "ai-photos"
  if (
    format === "reel-cover" ||
    format === "carousel" ||
    format === "story-slide" ||
    format === "story-sequence"
  ) {
    return "build-post"
  }
  return null
}

export function shouldAcceptLastGenerationForMayaPath(
  path: MayaWorkspacePath | null,
  format: OutputFormat
): boolean {
  return path == null || isFormatAllowedForMayaPath(path, format)
}
