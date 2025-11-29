/**
 * Scoring Engine
 * Calculates nurture stage based on behavior score
 */

/**
 * Calculates the nurture stage for a given behavior score
 * @param score - The behavior score (0-100+)
 * @returns The nurture stage: 'cold', 'warm', or 'hot'
 */
export function calculateNurtureStage(score: number): "cold" | "warm" | "hot" {
  if (score >= 40) return "hot"
  if (score >= 15) return "warm"
  return "cold"
}

/**
 * Scoring map for blueprint events
 * Maps event types to their point values
 */
export const SCORING_MAP: Record<string, number> = {
  blueprint_started: 5,
  blueprint_completed: 15,
  email_opened: 2,
  email_clicked: 8,
  visited_pricing: 10,
  visited_landing_page: 3,
  visited_blueprint: 3,
  watched_demo: 12,
  pdf_downloaded: 10,
  cta_clicked: 12,
  social_share: 5,
}

/**
 * Gets the score value for an event type
 * @param eventType - The event type
 * @returns The score value (0 if event not in map)
 */
export function getEventScore(eventType: string): number {
  return SCORING_MAP[eventType] || 0
}

/**
 * Incorporates funnel scoring into overall intent scoring
 * @param baseScore - The base behavior score
 * @param funnelAdjustment - Adjustment from funnel analysis
 * @returns Final adjusted score
 */
export function incorporateFunnelScoring(baseScore: number, funnelAdjustment: number): number {
  return Math.max(0, Math.min(100, baseScore + funnelAdjustment))
}
