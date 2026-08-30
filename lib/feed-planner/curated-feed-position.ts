const CURATED_FEED_POSITION_COUNT = 9

/**
 * Calendar plans can continue beyond one 3x3 grid, while curated feed-style prompts
 * intentionally repeat the approved nine-position visual rhythm.
 */
export function curatedPromptPositionForCalendarPosition(position: number): number {
  if (!Number.isInteger(position) || position < 1) {
    throw new Error(`Invalid calendar feed position ${position}.`)
  }

  return ((position - 1) % CURATED_FEED_POSITION_COUNT) + 1
}
