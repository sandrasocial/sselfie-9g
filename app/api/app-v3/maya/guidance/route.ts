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
    const result = await generateMayaGuidance({
      request: guidanceRequest,
      sources: ranked.fragments,
      hasQuestionMatch: ranked.hasQuestionMatch,
      userId: String(neonUser.id),
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error("[maya-guidance] request failed", {
      errorType: error instanceof Error ? error.name : "unknown",
    })
    return NextResponse.json({ error: "Maya guidance is unavailable" }, { status: 503 })
  }
}
