import { getCache, setCache } from "./cache"

const WEBHOOK_EVENT_TTL = 86400 // 24 hours

/**
 * Check if webhook event has already been processed
 * Returns true if event is new, false if duplicate
 */
export async function isNewWebhookEvent(eventId: string): Promise<boolean> {
  const cacheKey = `webhook:processed:${eventId}`
  const processed = await getCache<boolean>(cacheKey)

  if (processed) {
    console.log(`[v0] Duplicate webhook event detected: ${eventId}`)
    return false
  }

  // Mark as processed
  await setCache(cacheKey, true, WEBHOOK_EVENT_TTL)
  return true
}
