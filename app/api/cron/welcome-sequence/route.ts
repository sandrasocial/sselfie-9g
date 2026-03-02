import { NextResponse } from "next/server"
import { createCronLogger } from "@/lib/cron-logger"

/**
 * Welcome Sequence - DISABLED
 *
 * Ownership has moved to /api/cron/onboarding-sequence for Studio lifecycle sends.
 * This route intentionally no-ops to prevent duplicate onboarding email deliveries.
 */
export async function GET(request: Request) {
  const cronLogger = createCronLogger("welcome-sequence")
  await cronLogger.start()

  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await cronLogger.success({
      skipped: true,
      disabled: true,
      reason: "sequence_owner_changed",
      owner: "onboarding-sequence",
    })

    return NextResponse.json({
      success: true,
      skipped: true,
      disabled: true,
      reason: "Welcome sequence is disabled. Studio lifecycle sends are owned by /api/cron/onboarding-sequence.",
    })
  } catch (error: unknown) {
    await cronLogger.error(error, {})
    const message = error instanceof Error ? error.message : "Failed to process welcome sequence"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
