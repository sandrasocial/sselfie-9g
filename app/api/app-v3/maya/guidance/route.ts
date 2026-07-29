import { NextResponse } from "next/server"

import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { isMayaOperatingLayerEnabled } from "@/lib/app-v3/maya/operating-layer-rollout"
import {
  loadMayaGuidanceSources,
  rankMayaGuidanceSources,
} from "@/lib/app-v3/maya/guidance/source-registry"
import { generateMayaGuidance } from "@/lib/app-v3/maya/guidance/service"
import { sanitizeMayaGuidanceRequest } from "@/lib/app-v3/maya/guidance/types"
import { resolveMethodDepth } from "@/lib/maya/method-depth"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!isMayaOperatingLayerEnabled({ userId: user.id, email: user.email })) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  const guidanceRequest = sanitizeMayaGuidanceRequest(body)
  if (!guidanceRequest) {
    return NextResponse.json({ error: "Invalid guidance request" }, { status: 400 })
  }

  try {
    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(user.id)
    if (!neonUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const entitlements = await getAcademyEntitlementState(String(neonUser.id))
    const accessibleProductIds = new Set(entitlements.accessibleProductIds)
    const methodDepth = resolveMethodDepth({
      hasMembership: entitlements.membershipActive,
      hasMasterclass: ["masterclass", "branded_by_sselfie", "editing_masterclass"].some(id =>
        accessibleProductIds.has(id)
      ),
    })
    const registry = await loadMayaGuidanceSources(String(neonUser.id), { methodDepth })
    const ranked = rankMayaGuidanceSources({
      sources: registry.sources,
      request: guidanceRequest,
      accessibleProductIds,
      lessonProgress: registry.lessonProgress,
    })
    // Cheap maturity signals so the advice matches where she already is (UX audit: an
    // account with hundreds of creations was recommended day-one Branding Planner work).
    let memberActivity: { creationCount: number; calendarReadyCount: number } | undefined
    try {
      const { sql } = await import("@/lib/db/client")
      const [creations, ready] = await Promise.all([
        sql`SELECT COUNT(*)::int AS n FROM ai_images WHERE user_id = ${neonUser.id} AND generation_status = 'completed'`,
        sql`SELECT COUNT(*)::int AS n FROM feed_posts WHERE user_id = ${neonUser.id} AND image_url IS NOT NULL`,
      ])
      memberActivity = {
        creationCount: Number((creations[0] as any)?.n ?? 0),
        calendarReadyCount: Number((ready[0] as any)?.n ?? 0),
      }
    } catch {
      /* guidance still works without the signal */
    }
    const result = await generateMayaGuidance({
      request: guidanceRequest,
      sources: ranked.fragments,
      hasQuestionMatch: ranked.hasQuestionMatch,
      userId: String(neonUser.id),
      memberActivity,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error("[maya-guidance] request failed", {
      errorType: error instanceof Error ? error.name : "unknown",
    })
    return NextResponse.json({ error: "Maya guidance is unavailable" }, { status: 503 })
  }
}
