export function stableFeedPlannerIdempotencyKey(prefix: string, payload: unknown): string {
  const raw = typeof payload === "string" ? payload : JSON.stringify(payload)
  let hash = 2166136261
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  const hashHex = (hash >>> 0).toString(16)
  return `${prefix}-${hashHex}`
}

export function randomFeedPlannerIdempotencyKey(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
