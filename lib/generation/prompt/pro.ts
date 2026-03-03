/**
 * Pro (NanoBanana) prompt generation.
 * Thin wrapper — delegates to prompt-authority which routes to nano-banana-prompt-builder.
 * Phase 3D: extract buildNanaBananaPrompt() call directly to remove the authority indirection.
 */
export {
  generateStudioProPromptsViaAuthority,
  generateFeedPlannerProModePromptViaAuthority,
  routeProModeImagePromptViaAuthority,
} from "@/lib/maya/prompt-authority"
