import { NextResponse } from "next/server"

import { createCronLogger } from "@/lib/cron-logger"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * Retired 2026-08-22.
 *
 * The old lifecycle jumped directly from Starter Kit / Prompt Vault to the paid Studio app.
 * The aligned SSELFIE customer journey is now:
 *   low-ticket quick result -> SSELFIE community/implementation -> Studio app when the
 *   customer needs the premium creation layer.
 *
 * Keep this route as a harmless scheduled no-op until the replacement Skool/community
 * bridge has a canonical paid offer URL and entitlement source of truth. Do not silently
 * repoint this cron: that would mix community access with Studio access and recreate the
 * product-confusion problem this alignment is meant to solve.
 */
export async function GET(request: Request) {
  const logger = createCronLogger("paid-product-membership-bridge")
  await logger.start()

  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  const isProduction =
    process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

  if (isProduction && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
    await logger.error(new Error("Unauthorized"), { reason: "Invalid cron authorization" })
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const summary = {
    enabled: false,
    retired: true,
    sent: 0,
    reason: "direct_low_ticket_to_studio_bridge_retired_pending_community_bridge",
  }

  await logger.success(summary)
  return NextResponse.json({ success: true, ...summary })
}
