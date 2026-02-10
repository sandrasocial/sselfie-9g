import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { failStaleMarketingRuns, resetStuckMarketingQueueItems } from "@/lib/email/marketing-queue"

function getAdminEmail() {
  return String(process.env.ADMIN_EMAIL || "ssa@ssasocial.com").trim().toLowerCase()
}

export async function POST() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser || String(neonUser.email || "").trim().toLowerCase() !== getAdminEmail()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const reset = await resetStuckMarketingQueueItems().catch(() => ({
      resetProcessing: 0,
      resetCleanupProcessing: 0,
    }))
    const stale = await failStaleMarketingRuns().catch(() => ({ failedRuns: 0, affectedQueuedEmailLogs: 0 }))

    return NextResponse.json({
      success: true,
      reset,
      stale,
    })
  } catch (error) {
    console.error("[v0] marketing recover failed:", error)
    return NextResponse.json(
      { error: "Failed to run marketing recovery", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

