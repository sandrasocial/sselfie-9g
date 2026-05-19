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

/**
 * OpenAI image generation — Phase 1
 * Gates the /api/maya/generate-image-openai route.
 * Set FEATURE_OPENAI_IMAGE_ENABLED=true in Vercel env to enable.
 * Default: false (disabled).
 */
export function isOpenAIImageEnabled(): boolean {
  return process.env.FEATURE_OPENAI_IMAGE_ENABLED === 'true'
}

/**
 * When true, untrained users (no Flux LoRA model) are auto-routed to OpenAI
 * instead of NanoBanana Pro. Only takes effect when isOpenAIImageEnabled() is also true.
 * Set FEATURE_OPENAI_DEFAULT_FOR_UNTRAINED=true to enable.
 * Default: false (untrained users stay on NanoBanana Pro path).
 */
export function isOpenAIDefaultForUntrainedEnabled(): boolean {
  return isOpenAIImageEnabled() && process.env.FEATURE_OPENAI_DEFAULT_FOR_UNTRAINED === 'true'
}

/**
 * Maya inline chat images — Phase D
 * When enabled, successful OpenAI quick-image chat dispatch returns the image
 * inside Maya's assistant message instead of a plain URL-only response.
 * Set FEATURE_MAYA_INLINE_CHAT_IMAGES=true to enable.
 * Default: false (chat response remains URL-only).
 */
export function isMayaInlineChatImagesEnabled(): boolean {
  return process.env.FEATURE_MAYA_INLINE_CHAT_IMAGES === 'true'
}
































