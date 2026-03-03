/**
 * Public API for the prompt generation layer.
 *
 * This is the canonical import path for all prompt generation.
 * Callers should import from here, not directly from lib/maya/prompt-authority.
 *
 * Current state: thin re-export shims over prompt-authority.ts (frozen, 2232 lines).
 * Phase 3D goal: collapse authority into these four focused modules and delete prompt-authority.ts.
 */
export * from "./types"
export * from "./audit"
export * from "./classic"
export * from "./pro"
