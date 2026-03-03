/**
 * Classic (Flux LoRA) prompt generation.
 * Thin wrapper — delegates to prompt-authority which routes to prompt-constructor.
 * Phase 3D: extract buildPrompt() call directly to remove the authority indirection.
 */
export {
  generatePrompt,
  generatePromptSuggestions,
  generateBlueprintConceptsPrompt,
  generateMayaFeedPromptSystemPrompt,
  generateConceptCardsViaAuthority,
  generateFeedPlannerStrategyPromptViaAuthority,
  generateFeedPlannerClassicModePromptViaAuthority,
  validatePrompt,
  generateBatch,
} from "@/lib/maya/prompt-authority"
