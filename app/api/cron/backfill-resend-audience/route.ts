import { NextResponse } from "next/server"
import { createCronLogger } from "@/lib/cron-logger"
import { seedAudienceBackfillQueue, processAudienceBackfillBatch } from "@/lib/resend/audience-backfill"

export async function GET(request: Request) {
  const cronLogger = createCronLogger("backfill-resend-audience")
  await cronLogger.start()

  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET
    const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await seedAudienceBackfillQueue()
    const result = await processAudienceBackfillBatch(100)

    await cronLogger.success({
      processed: result.processed,
      synced: result.synced,
      failed: result.failed,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    await cronLogger.error(error, { reason: "Backfill failed" })
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 })
  }
}
