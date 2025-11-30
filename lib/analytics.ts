export function track(event: string, data?: Record<string, any>): void {
  try {
    if (typeof window !== "undefined") {
      // Vercel / third-party analytics bridge if available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyWindow = window as any
      if (anyWindow.analytics?.track) {
        anyWindow.analytics.track(event, data || {})
        return
      }
    }
  } catch {
    // no-op
  }
  // Fallback logging (non-breaking)
  // eslint-disable-next-line no-console
  console.log("[analytics]", event, data || {})
}


