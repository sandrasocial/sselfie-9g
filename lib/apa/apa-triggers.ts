/**
 * APA Trigger Rules
 *
 * Determines when to trigger APA based on subscriber state
 *
 * PLANNED TRIGGER CONDITIONS (not yet implemented):
 * - Event-based trigger: blueprint_completed
 * - Time-based: 48h inactivity
 * - Score-based: hot stage reached
 * - Probability-based: high conversion score
 * - CTA interaction-based: clicked upgrade CTA
 *
 * SAFETY:
 * - Never auto-executes
 * - Only queues for admin review
 */

export function shouldTriggerAPA({
  probability,
  nurture_stage,
  last_activity,
}: {
  probability: number
  nurture_stage: string
  last_activity: string | null
}) {
  console.log("[APATriggers] Evaluating trigger conditions:", {
    probability,
    nurture_stage,
    last_activity,
  })

  // <PLACEHOLDER> This will be implemented in Phase 6
  // Will return:
  // {
  //   should_trigger: true | false,
  //   reason: "Blueprint completed + hot stage" | "Insufficient signals" | etc.
  // }

  return {
    should_trigger: false,
    reason: "not_implemented",
  }
}
