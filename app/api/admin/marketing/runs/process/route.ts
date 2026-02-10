import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getRunDetails } from "@/lib/email/marketing-queue"
import { processMarketingRun } from "@/lib/email/marketing-runner"

function getAdminEmail() {
  return String(process.env.ADMIN_EMAIL || "ssa@ssasocial.com").trim().toLowerCase()
}

const ALLOWED_STATUSES = new Set(["queued", "syncing", "broadcasting", "cleanup"])

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

    if (!ALLOWED_STATUSES.has(String(run.status || ""))) {
      return NextResponse.json(
        {
          error: "Run not processable in current status",
          status: run.status,
        },
        { status: 409 },
      )
    }

    await processMarketingRun({ runId })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] marketing run process failed:", error)
    return NextResponse.json(
      { error: "Failed to process run", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

