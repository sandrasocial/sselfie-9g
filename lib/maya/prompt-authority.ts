/**
 * Compatibility shim.
 *
 * Canonical prompt authority implementation now lives in `lib/generation/prompt`.
 * Keep this file as a stable import path until downstream docs/tests are fully updated.
 */

export * from "@/lib/generation/prompt"

import {
  auditLogMayaChatGeneration,
  generateBatch,
  generatePrompt,
  validatePrompt,
} from "@/lib/generation/prompt"

const promptAuthority = {
  generatePrompt,
  validatePrompt,
  generateBatch,
  auditLogMayaChatGeneration,
}

export default promptAuthority
