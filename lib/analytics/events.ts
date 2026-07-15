import "server-only"

import { ensureAnalyticsSchema } from "@/lib/analytics/schema"
import { getDb } from "@/lib/db/client"
import {
  isAllowedAnalyticsEventName,
  type AnalyticsEventName,
} from "@/lib/analytics/event-contract"

function safeString(v: unknown, maxLen: number): string | null {
  if (typeof v !== "string") return null
  const s = v.trim()
  if (!s) return null
  return s.length > maxLen ? s.slice(0, maxLen) : s
}

function safeJson(v: unknown): Record<string, any> {
  if (!v || typeof v !== "object") return {}
  try {
    // Strip prototypes / functions and cap size by truncating large strings.
    const obj = JSON.parse(JSON.stringify(v))
    if (!obj || typeof obj !== "object") return {}
    const out: Record<string, any> = {}
    for (const [k, raw] of Object.entries(obj as any)) {
      if (typeof k !== "string" || k.length > 64) continue
      if (typeof raw === "string") out[k] = raw.length > 500 ? raw.slice(0, 500) : raw
      else if (typeof raw === "number" || typeof raw === "boolean" || raw === null) out[k] = raw
      else if (Array.isArray(raw)) out[k] = raw.slice(0, 25)
      else if (typeof raw === "object") out[k] = raw
    }
    return out
  } catch {
    return {}
  }
}

export async function logAnalyticsEvent(input: {
  eventName: AnalyticsEventName | string
  userId?: string | null
  anonId?: string | null
  path?: string | null
  referrer?: string | null
  utm?: {
    source?: string | null
    medium?: string | null
    campaign?: string | null
    content?: string | null
    term?: string | null
  }
  properties?: Record<string, any> | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const eventName = safeString(input.eventName, 64)
    if (!eventName || !isAllowedAnalyticsEventName(eventName)) {
      return { ok: false, error: "Unsupported event" }
    }

    await ensureAnalyticsSchema()
    const sql = getDb()
    const properties = safeJson(input.properties ?? {})
    if (eventName === "suite_intent_detected" && typeof properties.intent_label !== "string") {
      properties.intent_label =
        safeString(properties.format, 80) ||
        (properties.confidence === "needs_clarify" ? "needs_clarify" : "unclassified")
    }

    await sql`
      INSERT INTO analytics_events (
        user_id,
        anon_id,
        event_name,
        path,
        referrer,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        properties
      ) VALUES (
        ${safeString(input.userId ?? null, 128)},
        ${safeString(input.anonId ?? null, 128)},
        ${eventName},
        ${safeString(input.path ?? null, 300)},
        ${safeString(input.referrer ?? null, 500)},
        ${safeString(input.utm?.source ?? null, 100)},
        ${safeString(input.utm?.medium ?? null, 100)},
        ${safeString(input.utm?.campaign ?? null, 150)},
        ${safeString(input.utm?.content ?? null, 150)},
        ${safeString(input.utm?.term ?? null, 150)},
        ${properties}
      )
    `

    return { ok: true }
  } catch (err: any) {
    // Fail open: analytics must never break core flows.
    console.error("[analytics] logAnalyticsEvent failed:", err?.message || String(err))
    return { ok: false, error: err?.message || String(err) }
  }
}
