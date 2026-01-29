/**
 * SSELFIE Brand Engine
 *
 * A private AI brand operating system that acts as a "celebrity social department"
 * for personal brands.
 *
 * Structure:
 * - /brand_brain/ = Truth (identity, voice, offers, rules)
 * - /signals/ = External reality (trends, competitors, culture)
 * - /performance/ = Internal reality (insights, tests, results)
 *
 * The Brand Reasoner Agent is the "Kim/Kylie social director" that decides
 * what to do today based on all three data sources.
 */

// Types
export * from "./types"

// Brand Brain
export { SSELFIE_BRAND_BRAIN, getActiveOffer, getCTAByFunnelStage, isBannedWord, getPillarById } from "./brand-brain/sselfie-brand-brain"

// Agents
export { BRAND_REASONER_CONFIG, BRAND_REASONER_SYSTEM_PROMPT, generateWeeklyBrief, generateTodaysPlan } from "./agents/brand-reasoner"
export { COMPETITOR_INTEL_CONFIG, COMPETITOR_INTEL_SYSTEM_PROMPT, DEFAULT_COMPETITORS } from "./agents/competitor-intel"
export { EXPERIMENT_PLANNER_CONFIG, EXPERIMENT_PLANNER_SYSTEM_PROMPT, EXPERIMENT_TEMPLATES } from "./agents/experiment-planner"
export { VOICE_COPY_CONFIG, VOICE_COPY_SYSTEM_PROMPT, voiceCheck, buildCaptionPrompt, buildHookPrompt, buildEmailPrompt } from "./agents/voice-copy"
export { CREATIVE_DIRECTOR_CONFIG, CREATIVE_DIRECTOR_SYSTEM_PROMPT, FORMAT_RECOMMENDATIONS } from "./agents/creative-director"
export { SCHEDULER_CONFIG, SCHEDULER_SYSTEM_PROMPT, OPTIMAL_POSTING_TIMES, BATCHING_TEMPLATES, REPURPOSING_MATRIX } from "./agents/scheduler"

// Coordinator
export { AGENT_REGISTRY, WORKFLOWS, ENGINE_COORDINATOR_CONFIG, initializeEngineState, startWorkflow, handleApproval, getWorkflowInputs } from "./coordinator/engine-coordinator"
