import { NextResponse } from "next/server"
import { isMayaDefaultOpenAiEnabled } from "@/lib/feature-flags"

/**
 * Phase 1 Maya rebuild — soft-archive guard for legacy Replicate / Nano Banana / Pro
 * generation routes.
 *
 * Behaviour (per the staged, non-destructive rebuild):
 * - The route is NOT deleted and NOT broken. While the engine cutover flag
 *   (MAYA_DEFAULT_OPENAI) is OFF, this returns null and the legacy route keeps working,
 *   emitting a one-line deprecation warning so we can see if anything still calls it.
 * - Once the cutover flag is ON (in the tested follow-up), this returns 410 Gone so the
 *   route is cleanly retired in favour of /api/maya/generate-image-openai.
 *
 * Usage at the top of a legacy POST handler:
 *   const gone = legacyMayaRouteGuard("/api/maya/generate-image")
 *   if (gone) return gone
 */
export function legacyMayaRouteGuard(routeName: string): NextResponse | null {
  if (isMayaDefaultOpenAiEnabled()) {
    return NextResponse.json(
      {
        error: `This generation route (${routeName}) has been retired. Use /api/maya/generate-image-openai.`,
        code: "legacy_route_gone",
      },
      { status: 410 },
    )
  }
  console.warn(
    `[legacy-maya] DEPRECATED route ${routeName} was hit. Migrate to /api/maya/generate-image-openai.`,
  )
  return null
}
