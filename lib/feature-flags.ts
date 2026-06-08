/**
 * Feature Flags
 * Simple feature flag system for gradual rollouts
 */

/**
 * Check if workbench mode is enabled
 * Controlled by NEXT_PUBLIC_ENABLE_WORKBENCH_MODE environment variable
 * Default: false (disabled)
 * 
 * Note: For client-side, Next.js exposes NEXT_PUBLIC_ vars at build time.
 * If the env var is set after build, you may need to restart the dev server.
 */
export function isWorkbenchModeEnabled(): boolean {
  // Check both server and client env vars
  // Client-side: Next.js exposes NEXT_PUBLIC_ vars in the browser
  const envValue = typeof window !== 'undefined'
    ? (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_ENABLE_WORKBENCH_MODE
      || process.env.NEXT_PUBLIC_ENABLE_WORKBENCH_MODE
    : process.env.NEXT_PUBLIC_ENABLE_WORKBENCH_MODE

  return envValue === 'true'
}

function isExplicitlyDisabled(value?: string | null): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === 'false' || normalized === '0' || normalized === 'off'
}

/**
 * Maya consolidation — Phase H
 * Makes the chat-first Maya experience the default while preserving instant rollback.
 * Set FEATURE_MAYA_CONSOLIDATED_EXPERIENCE=false or
 * NEXT_PUBLIC_FEATURE_MAYA_CONSOLIDATED_EXPERIENCE=false to restore the previous
 * more workflow-heavy defaults.
 */
export function isMayaConsolidatedExperienceEnabled(): boolean {
  const value =
    typeof window !== 'undefined'
      ? process.env.NEXT_PUBLIC_FEATURE_MAYA_CONSOLIDATED_EXPERIENCE
      : process.env.FEATURE_MAYA_CONSOLIDATED_EXPERIENCE

  return !isExplicitlyDisabled(value)
}

/**
 * OpenAI image generation — default Maya image path
 * Gates the /api/maya/generate-image-openai route.
 * Default: true for Phase H. Set FEATURE_OPENAI_IMAGE_ENABLED=false to rollback.
 */
export function isOpenAIImageEnabled(): boolean {
  return !isExplicitlyDisabled(process.env.FEATURE_OPENAI_IMAGE_ENABLED)
}

/**
 * Maya rebuild — Phase 1 engine cutover flag (SCAFFOLD, default OFF).
 * When true, the Maya generation UI should default to the synchronous OpenAI
 * reference flow (app/api/maya/generate-image-openai) instead of the legacy async
 * job-and-poll Replicate/Nano routes. The actual call-site wiring, user_avatar_images
 * → referenceImageUrl mapping, contract adaptation, and LoRA fallback ship in a
 * separate TESTED follow-up PR. This flag is plumbing only and changes nothing while OFF.
 * Enable with MAYA_DEFAULT_OPENAI=true (server) and NEXT_PUBLIC_MAYA_DEFAULT_OPENAI=true (client).
 */
export function isMayaDefaultOpenAiEnabled(): boolean {
  const value =
    typeof window !== 'undefined'
      ? process.env.NEXT_PUBLIC_MAYA_DEFAULT_OPENAI
      : process.env.MAYA_DEFAULT_OPENAI
  return value === 'true'
}

/**
 * When true, untrained users (no Flux LoRA model) are auto-routed to OpenAI
 * instead of legacy provider flows. Only takes effect when OpenAI image generation is enabled.
 * Default: true for Phase H. Set FEATURE_OPENAI_DEFAULT_FOR_UNTRAINED=false to rollback.
 */
export function isOpenAIDefaultForUntrainedEnabled(): boolean {
  return isOpenAIImageEnabled() && !isExplicitlyDisabled(process.env.FEATURE_OPENAI_DEFAULT_FOR_UNTRAINED)
}

/**
 * Maya inline chat images — Phase D
 * When enabled, successful OpenAI quick-image chat dispatch returns the image
 * inside Maya's assistant message instead of a plain URL-only response.
 * Set FEATURE_MAYA_INLINE_CHAT_IMAGES=true to enable.
 * Default: true for Phase H. Set FEATURE_MAYA_INLINE_CHAT_IMAGES=false to rollback.
 */
export function isMayaInlineChatImagesEnabled(): boolean {
  return !isExplicitlyDisabled(process.env.FEATURE_MAYA_INLINE_CHAT_IMAGES)
}

/**
 * Maya conversational image continuation — Phase E
 * When enabled, Maya can use the most recent inline generated image as context
 * for simple follow-up refinements such as "make it softer" or "more editorial."
 * Set FEATURE_MAYA_IMAGE_CONTINUATION=true to enable.
 * Default: true for Phase H. Set FEATURE_MAYA_IMAGE_CONTINUATION=false to rollback.
 */
export function isMayaImageContinuationEnabled(): boolean {
  return isMayaInlineChatImagesEnabled() && !isExplicitlyDisabled(process.env.FEATURE_MAYA_IMAGE_CONTINUATION)
}

/**
 * Maya proactive creative assistance — Phase F
 * When enabled, successful inline image responses include light, assistant-led
 * creative next steps instead of ending at a passive result.
 * Set FEATURE_MAYA_PROACTIVE_CREATIVE_ASSISTANCE=true to enable.
 * Default: true for Phase H. Set FEATURE_MAYA_PROACTIVE_CREATIVE_ASSISTANCE=false to rollback.
 */
export function isMayaProactiveCreativeAssistanceEnabled(): boolean {
  return (
    isMayaImageContinuationEnabled() &&
    !isExplicitlyDisabled(process.env.FEATURE_MAYA_PROACTIVE_CREATIVE_ASSISTANCE)
  )
}

/**
 * Maya conversational action pills — Phase F
 * Client-side flag for lightweight buttons below inline generated images.
 * Set NEXT_PUBLIC_FEATURE_MAYA_CONVERSATIONAL_ACTION_PILLS=true to enable.
 * Default: true for Phase H. Set NEXT_PUBLIC_FEATURE_MAYA_CONVERSATIONAL_ACTION_PILLS=false to rollback.
 */
export function isMayaConversationalActionPillsEnabled(): boolean {
  return !isExplicitlyDisabled(process.env.NEXT_PUBLIC_FEATURE_MAYA_CONVERSATIONAL_ACTION_PILLS)
}

/**
 * Maya conversational async UX - Phase G
 * Client-side flag for making async Flux/Nano generation cards feel more like
 * the same Maya conversation through softer loading copy and continuation pills.
 * Set NEXT_PUBLIC_FEATURE_MAYA_CONVERSATIONAL_ASYNC_UX=true to enable.
 * Default: true for Phase H. Set NEXT_PUBLIC_FEATURE_MAYA_CONVERSATIONAL_ASYNC_UX=false to rollback.
 */
export function isMayaConversationalAsyncUxEnabled(): boolean {
  return !isExplicitlyDisabled(process.env.NEXT_PUBLIC_FEATURE_MAYA_CONVERSATIONAL_ASYNC_UX)
}



























