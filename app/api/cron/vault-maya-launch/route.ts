import { NextResponse } from "next/server"

import { createCronLogger } from "@/lib/cron-logger"
import { envFlag } from "@/lib/env-flags"
import { runDueVaultMayaLaunchFollowups } from "@/lib/email/campaigns/vault-maya-launch-runner"

export const dynamic = "force-dynamic"
export const maxDuration = 300

export async function GET(request: Request) {
  const cronLogger = createCronLogger("vault-maya-launch")
  await cronLogger.start()

  try {
    const isProduction =
      process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"
    const cronSecret = process.env.CRON_SECRET
    if (isProduction && (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`)) {
      await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!envFlag("VAULT_MAYA_LAUNCH_ENABLED")) {
      const result = { enabled: false, due: 0, results: [] }
      await cronLogger.success(result)
      return NextResponse.json({ success: true, ...result })
    }

    const result = await runDueVaultMayaLaunchFollowups()
    await cronLogger.success({ enabled: true, ...result })
    return NextResponse.json({ success: true, enabled: true, ...result })
  } catch (error) {
    await cronLogger.error(error, { step: "vault-maya-launch" })
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Vault Maya launch cron failed",
      },
      { status: 500 },
    )
  }
}
