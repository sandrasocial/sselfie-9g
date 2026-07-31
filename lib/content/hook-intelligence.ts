import type { OutputFormat } from "@/components/app-v3/types"

const HOOK_LED_FORMATS: ReadonlySet<OutputFormat> = new Set([
  "reel-cover",
  "carousel",
  "story-slide",
  "story-sequence",
])

export function isHookLedFormat(format: OutputFormat): boolean {
  return HOOK_LED_FORMATS.has(format)
}

/**
 * Shared hook judgment for Maya's text-led formats.
 *
 * This stays invisible to members. Maya uses it to choose the right opening and
 * make the content deliver that opening, without adding a form, scorecard, or
 * hook-generator step to the creation flow.
 */
export const SSELFIE_HOOK_INTELLIGENCE = `## HOOK INTELLIGENCE (use silently)

The first visible words must start with what this specific audience already cares about, not what the creator wants to teach. Silently identify: she is currently [real situation], but she wants [real desire]. Then choose ONE clear content promise: teach, reveal, reframe, relate, prove, or show what is possible.

Choose the strongest natural opening for this exact idea. You may use:
- Problem: name the real obstacle or mistaken assumption.
- Curiosity: create a specific information gap, never a vague tease.
- Contrarian: challenge familiar advice with a more useful truth.
- Story: begin inside a specific moment, not with background.
- Result: show an honest before and after or concrete outcome.
- Question: describe her reader's exact situation or desired possibility.

Do not force every family or expose these labels to the member. Explore different approaches internally, then make the recommended concept the strongest fit. Alternative concepts must be genuinely different directions, not small rewrites of the same opening.

Match the opening to the audience:
- New or cold audience: make the topic and relevance instantly clear.
- Familiar or warm audience: use connection, story, belief, or reframe.
- Buyer-ready audience: show the useful difference, method, or destination.
Infer this from her request, brand, offer, recent work, and conversation. Do not add a questionnaire.

Make the first frame work as one idea: the image, visible words, and emotional tension should support each other. Use specificity, contrast, consequence, time, proof, or emotion only when natural. Keep the line short enough to grasp immediately and natural enough to say aloud.

Truth is non-negotiable. Never invent numbers, income, results, urgency, experience, or customer proof. Use a result claim only when the member or trusted brand context supports it. When proof is missing, write a strong honest reframe instead of stopping the flow to interrogate her.

The content after the opening must fulfill the exact promise it creates. The next slide or beat continues the thought immediately, each part earns the next, and the ending resolves the tension or gives the promised next step. No bait-and-switch, generic filler, guru language, or vague clickbait.

Before emitting, silently check: instantly clear, specific to her audience, creates a real reason to continue, sounds like her, fully supported, and delivered by the content that follows. Do not show a scorecard or explain this process unless she explicitly asks.`
