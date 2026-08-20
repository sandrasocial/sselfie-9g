import { sql } from "@/lib/db/client"

export type EventProvider = "stripe" | "resend" | (string & {})

export type ClaimEventInput = {
  provider: EventProvider
  eventId: string
  eventType?: string | null
  objectId?: string | null
  livemode?: boolean | null
  metadata?: Record<string, unknown> | null
  allowStaleClaimReclaim?: boolean
}

export type EventClaim = {
  claimed: boolean
  duplicate: boolean
  duplicateStatus: "processed" | "in_progress" | null
  provider: EventProvider
  eventId: string
  storage: "provider-event" | "legacy-stripe-event"
}

type SqlErrorLike = {
  code?: string
  message?: string
}

export const EVENT_CLAIM_STALE_AFTER_SECONDS = 15 * 60

function isProviderEventSchemaMissing(error: unknown) {
  const err = error as SqlErrorLike
  const message = String(err?.message || "").toLowerCase()

  return (
    err?.code === "42703" ||
    err?.code === "42P01" ||
    err?.code === "42P10" ||
    (message.includes("column") &&
      (message.includes("provider") || message.includes("event_id"))) ||
    message.includes("no unique or exclusion constraint")
  )
}

export async function claimEvent(input: ClaimEventInput): Promise<EventClaim> {
  const eventId = input.eventId.trim()
  const provider = input.provider.trim() as EventProvider

  if (!provider) {
    throw new Error("Event provider is required")
  }

  if (!eventId) {
    throw new Error("Event id is required")
  }

  try {
    const claimed = (await sql`
      INSERT INTO webhook_events (
        provider,
        event_id,
        stripe_event_id,
        event_type,
        object_id,
        livemode,
        status,
        metadata,
        processed_at,
        first_seen_at,
        updated_at
      )
      VALUES (
        ${provider},
        ${eventId},
        ${provider === "stripe" ? eventId : null},
        ${input.eventType || null},
        ${input.objectId || null},
        ${typeof input.livemode === "boolean" ? input.livemode : null},
        'claimed',
        ${JSON.stringify(input.metadata || {})}::jsonb,
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT (provider, event_id) DO NOTHING
      RETURNING id
    `) as Array<{ id: number }>

    if (claimed.length === 0) {
      const reclaimed = (await sql`
        UPDATE webhook_events
        SET
          status = 'claimed',
          metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify(input.metadata || {})}::jsonb,
          processed_at = NOW(),
          updated_at = NOW()
        WHERE provider = ${provider}
          AND event_id = ${eventId}
          AND (
            status = 'failed'
            OR (
              ${input.allowStaleClaimReclaim === true}
              AND status = 'claimed'
              AND updated_at < NOW() - (${EVENT_CLAIM_STALE_AFTER_SECONDS} * INTERVAL '1 second')
            )
          )
        RETURNING id
      `) as Array<{ id: number }>

      if (reclaimed.length > 0) {
        return {
          claimed: true,
          duplicate: false,
          duplicateStatus: null,
          provider,
          eventId,
          storage: "provider-event",
        }
      }

      const existing = (await sql`
        SELECT status
        FROM webhook_events
        WHERE provider = ${provider}
          AND event_id = ${eventId}
        LIMIT 1
      `) as Array<{ status: string }>

      return {
        claimed: false,
        duplicate: true,
        duplicateStatus: existing[0]?.status === "processed" ? "processed" : "in_progress",
        provider,
        eventId,
        storage: "provider-event",
      }
    }

    return {
      claimed: claimed.length > 0,
      duplicate: claimed.length === 0,
      duplicateStatus: null,
      provider,
      eventId,
      storage: "provider-event",
    }
  } catch (error) {
    if (provider === "stripe" && isProviderEventSchemaMissing(error)) {
      return claimLegacyStripeEvent(eventId)
    }

    throw error
  }
}

async function claimLegacyStripeEvent(eventId: string): Promise<EventClaim> {
  try {
    const claimed = (await sql`
      INSERT INTO webhook_events (stripe_event_id, processed_at)
      VALUES (${eventId}, NOW())
      ON CONFLICT (stripe_event_id) DO NOTHING
      RETURNING id
    `) as Array<{ id: number }>

    return {
      claimed: claimed.length > 0,
      duplicate: claimed.length === 0,
      duplicateStatus: claimed.length > 0 ? null : "processed",
      provider: "stripe",
      eventId,
      storage: "legacy-stripe-event",
    }
  } catch (legacyError: unknown) {
    const err = legacyError as SqlErrorLike
    if (err?.code !== "42P01") {
      throw legacyError
    }

    await sql`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id SERIAL PRIMARY KEY,
        stripe_event_id TEXT UNIQUE,
        processed_at TIMESTAMP DEFAULT NOW()
      )
    `

    const claimed = (await sql`
      INSERT INTO webhook_events (stripe_event_id, processed_at)
      VALUES (${eventId}, NOW())
      ON CONFLICT (stripe_event_id) DO NOTHING
      RETURNING id
    `) as Array<{ id: number }>

    return {
      claimed: claimed.length > 0,
      duplicate: claimed.length === 0,
      duplicateStatus: claimed.length > 0 ? null : "processed",
      provider: "stripe",
      eventId,
      storage: "legacy-stripe-event",
    }
  }
}

export async function markEventProcessed(provider: EventProvider, eventId: string) {
  await updateProviderEventStatus(provider, eventId, "processed")
}

export async function markEventFailed(provider: EventProvider, eventId: string, error: unknown) {
  await updateProviderEventStatus(provider, eventId, "failed", {
    error: error instanceof Error ? error.message : String(error),
  })
}

async function updateProviderEventStatus(
  provider: EventProvider,
  eventId: string,
  status: "processed" | "failed",
  metadata?: Record<string, unknown>
) {
  try {
    if (metadata) {
      await sql`
        UPDATE webhook_events
        SET
          status = ${status},
          metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify(metadata)}::jsonb,
          updated_at = NOW()
        WHERE provider = ${provider}
          AND event_id = ${eventId}
      `
      return
    }

    await sql`
      UPDATE webhook_events
      SET
        status = ${status},
        updated_at = NOW()
      WHERE provider = ${provider}
        AND event_id = ${eventId}
    `
  } catch (error) {
    if (provider === "stripe" && isProviderEventSchemaMissing(error)) {
      return
    }

    throw error
  }
}
