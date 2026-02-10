import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getRunDetails, markMarketingRunForCleanupRetry, resetStuckMarketingQueueItems } from "@/lib/email/marketing-queue"
import { processMarketingRun } from "@/lib/email/marketing-runner"

function getAdminEmail() {
  return String(process.env.ADMIN_EMAIL || "ssa@ssasocial.com").trim().toLowerCase()
}

export async function POST(request: Request) {
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

    const body = await request.json().catch(() => ({}))
    const runId = String(body?.runId || "").trim()
    if (!runId) {
      return NextResponse.json({ error: "runId required" }, { status: 400 })
    }

    const run = await getRunDetails(runId)
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 })
    }

    const status = String(run.status || "")
    const broadcastId = String(run.broadcast_id || "").trim()
    if (status !== "failed" || !broadcastId) {
      return NextResponse.json(
        {
          error: "Cleanup retry is only allowed for failed runs that already have a broadcast_id",
          status,
          broadcastId: broadcastId || null,
        },
        { status: 409 },
      )
    }

    // Ensure any stuck "processing" items are moved back into claimable states.
    await resetStuckMarketingQueueItems().catch(() => {})

    await markMarketingRunForCleanupRetry(runId)
    await processMarketingRun({ runId })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] marketing cleanup retry failed:", error)
    return NextResponse.json(
      { error: "Failed to retry cleanup", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

