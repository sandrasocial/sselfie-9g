import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "node:crypto"

import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { checkRateLimit } from "@/lib/rate-limit-api"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { isPostHogPurchaseEvent, postHogDistinctId } from "@/lib/analytics/posthog"

type AnalyticsIdentity = {
  anonCookie: string | undefined
  anonId: string
  neonUserId: string | null
}

const SERVER_ONLY_ANALYTICS_EVENTS = new Set(["purchase", "suite_ready_post_saved"])
const POSTHOG_RESET_ACK_HEADER = "x-sselfie-posthog-reset-ack"

type AnalyticsRequestInput = {
  eventName: string
  properties: Record<string, unknown>
  path: string | null
  referrer: string | null
  utm: {
    source: string | null
    medium: string | null
    campaign: string | null
    content: string | null
    term: string | null
  }
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {}
}

function stringValue(body: Record<string, unknown>, key: string): string | null {
  return typeof body[key] === "string" ? body[key] : null
}

function analyticsRequestInput(req: NextRequest, value: unknown): AnalyticsRequestInput {
  const body = objectValue(value)
  const url = new URL(req.url)
  const parameter = (key: string) => stringValue(body, key) ?? url.searchParams.get(key)
  return {
    eventName: stringValue(body, "event") ?? "",
    properties: objectValue(body.properties),
    path:
      stringValue(body, "path") ??
      stringValue(body, "pathname") ??
      req.headers.get("x-pathname") ??
      url.searchParams.get("path"),
    referrer: req.headers.get("referer"),
    utm: {
      source: parameter("utm_source"),
      medium: parameter("utm_medium"),
      campaign: parameter("utm_campaign"),
      content: parameter("utm_content"),
      term: parameter("utm_term"),
    },
  }
}

function readIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")?.[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  )
}

async function resolveAnalyticsIdentity(
  req: NextRequest,
  rotateAnonymous = false
): Promise<AnalyticsIdentity | null> {
  const anonCookie = rotateAnonymous ? undefined : req.cookies.get("sselfie_anon_id")?.value
  const anonId = anonCookie || randomUUID()
  let neonUserId: string | null = null

  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (authUser) {
      const neonUser = await getUserByAuthId(authUser.id)
      if (!neonUser?.id) return null
      neonUserId = String(neonUser.id)
    }
  } catch {
    // Capture stays disabled when authentication or user mapping is uncertain.
    return null
  }

  return { anonCookie, anonId, neonUserId }
}

function setAnonCookie(response: NextResponse, identity: AnalyticsIdentity) {
  if (identity.anonCookie) return
  response.cookies.set("sselfie_anon_id", identity.anonId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })
}

function clearPostHogResetCookie(response: NextResponse) {
  response.cookies.set("sselfie_posthog_reset", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = new URL(req.url).searchParams
    const rotateAnonymous = searchParams.get("rotate_anonymous") === "1"
    const resetPostHog = req.cookies.get("sselfie_posthog_reset")?.value === "1"
    const identity = await resolveAnalyticsIdentity(req, rotateAnonymous)
    if (!identity) {
      const response = NextResponse.json({ distinctId: null, resetPostHog: false })
      response.headers.set("Cache-Control", "private, no-store")
      return response
    }
    const response = NextResponse.json({
      distinctId: postHogDistinctId({
        eventName: "$identity",
        userId: identity.neonUserId,
        anonId: identity.anonId,
      }),
      resetPostHog,
    })
    response.headers.set("Cache-Control", "private, no-store")
    setAnonCookie(response, identity)
    return response
  } catch {
    return NextResponse.json({ distinctId: null })
  }
}

export async function POST(req: NextRequest) {
  // This endpoint must be safe and non-blocking: fail open where possible.
  try {
    const resetAcknowledgement = req.headers.get(POSTHOG_RESET_ACK_HEADER)
    if (resetAcknowledgement !== null) {
      const requestOrigin = new URL(req.url).origin
      if (resetAcknowledgement !== "1" || req.headers.get("origin") !== requestOrigin) {
        return NextResponse.json({ ok: false }, { status: 403 })
      }
      const response = NextResponse.json({ ok: true })
      response.headers.set("Cache-Control", "private, no-store")
      if (req.cookies.get("sselfie_posthog_reset")?.value === "1") {
        clearPostHogResetCookie(response)
      }
      return response
    }

    const ip = readIp(req)

    const input = analyticsRequestInput(req, await req.json().catch(() => ({})))
    const { eventName } = input

    if (SERVER_ONLY_ANALYTICS_EVENTS.has(eventName) || isPostHogPurchaseEvent(eventName)) {
      return NextResponse.json({ ok: true, accepted: false, reason: "Unsupported event" })
    }

    const identity = await resolveAnalyticsIdentity(req)
    if (!identity) {
      return NextResponse.json({ ok: true, accepted: false, reason: "Identity unavailable" })
    }

    const rate = await checkRateLimit(identity.anonId || ip, "ANALYTICS")
    if (!rate.success) {
      return NextResponse.json({ ok: true, rateLimited: true })
    }

    const analyticsResult = await logAnalyticsEvent({
      eventName,
      userId: identity.neonUserId,
      anonId: identity.anonId,
      path: input.path,
      referrer: input.referrer,
      utm: input.utm,
      properties: {
        ...input.properties,
        ip_hint: ip,
        user_agent: req.headers.get("user-agent") || null,
      },
    })

    if (!analyticsResult.ok) {
      console.warn("[analytics] event rejected:", {
        eventName,
        reason: analyticsResult.error,
      })
    }

    const res = NextResponse.json(
      analyticsResult.ok
        ? { ok: true, accepted: true }
        : { ok: true, accepted: false, reason: analyticsResult.error }
    )
    setAnonCookie(res, identity)
    return res
  } catch (err: unknown) {
    console.error(
      "[analytics] /api/analytics/event failed:",
      err instanceof Error ? err.message : String(err)
    )
    return NextResponse.json({ ok: true })
  }
}
