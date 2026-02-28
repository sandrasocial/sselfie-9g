import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "crypto"

import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { checkRateLimit } from "@/lib/rate-limit-api"
import { logAnalyticsEvent } from "@/lib/analytics/events"

function readIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")?.[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  )
}

export async function POST(req: NextRequest) {
  // This endpoint must be safe and non-blocking: fail open where possible.
  try {
    const ip = readIp(req)

    const body = await req.json().catch(() => ({}))
    const eventName = typeof body?.event === "string" ? body.event : ""
    const properties = body?.properties && typeof body.properties === "object" ? body.properties : {}

    const url = new URL(req.url)
    const path =
      typeof body?.path === "string"
        ? body.path
        : typeof body?.pathname === "string"
          ? body.pathname
          : req.headers.get("x-pathname") || url.searchParams.get("path") || null

    const referrer = req.headers.get("referer") || null
    const utm = {
      source: typeof body?.utm_source === "string" ? body.utm_source : url.searchParams.get("utm_source"),
      medium: typeof body?.utm_medium === "string" ? body.utm_medium : url.searchParams.get("utm_medium"),
      campaign: typeof body?.utm_campaign === "string" ? body.utm_campaign : url.searchParams.get("utm_campaign"),
      content: typeof body?.utm_content === "string" ? body.utm_content : url.searchParams.get("utm_content"),
      term: typeof body?.utm_term === "string" ? body.utm_term : url.searchParams.get("utm_term"),
    }

    const anonCookie = req.cookies.get("sselfie_anon_id")?.value
    const anonId = anonCookie || randomUUID()

    const rate = await checkRateLimit(anonId || ip, "ANALYTICS")
    if (!rate.success) {
      return NextResponse.json({ ok: true, rateLimited: true })
    }

    let neonUserId: string | null = null
    try {
      const supabase = await createServerClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (authUser) {
        const neonUser = await getUserByAuthId(authUser.id).catch(() => null)
        neonUserId = neonUser?.id ? String(neonUser.id) : null
      }
    } catch {
      // ignore auth errors (tracking still works anonymously)
    }

    const analyticsResult = await logAnalyticsEvent({
      eventName,
      userId: neonUserId,
      anonId,
      path,
      referrer,
      utm,
      properties: {
        ...properties,
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
        : { ok: true, accepted: false, reason: analyticsResult.error },
    )
    if (!anonCookie) {
      res.cookies.set("sselfie_anon_id", anonId, {
        httpOnly: true,
        sameSite: "lax",
        // Secure cookies break localhost on http; keep secure in prod.
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      })
    }
    return res
  } catch (err: any) {
    console.error("[analytics] /api/analytics/event failed:", err?.message || String(err))
    return NextResponse.json({ ok: true })
  }
}
