import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getDb } from "@/lib/db"
import * as onboardingWorkflow from "@/agents/workflows/onboardingWorkflow"
import * as newsletterWorkflow from "@/agents/workflows/newsletterWorkflow"
import * as retentionWorkflow from "@/agents/workflows/retentionWorkflow"
import * as upgradeWorkflow from "@/agents/workflows/upgradeWorkflow"

/**
 * POST /api/admin/automation/workflows/run
 * Execute workflow and enqueue emails into marketing_email_queue
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = getDb()
    const body = await request.json()
    const { workflowId, targetUserId, targetEmail, context } = body

    if (!workflowId) {
      return NextResponse.json({ error: "workflowId is required" }, { status: 400 })
    }

    console.log(`[Automation] Running workflow: ${workflowId}`)

    let result: any

    const workflowInput = {
      userId: targetUserId || user.id,
      email: targetEmail || user.email || "",
      context,
    }

    switch (workflowId) {
      case "onboarding":
        result = await onboardingWorkflow.runWorkflow(workflowInput)
        break
      case "newsletter":
        result = await newsletterWorkflow.runWorkflow(workflowInput)
        break
      case "retention":
        result = await retentionWorkflow.runWorkflow(workflowInput)
        break
      case "upgrade":
        result = await upgradeWorkflow.runWorkflow(workflowInput)
        break
      default:
        return NextResponse.json({ error: `Workflow '${workflowId}' not found or not implemented` }, { status: 404 })
    }

    if (result.status === "error") {
      return NextResponse.json({ error: "Workflow execution failed", details: result.debug }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      workflowId,
      result,
      message: `Workflow executed successfully. ${result.emailsSent || 0} emails sent, ${result.emailsScheduled || 0} scheduled.`,
    })
  } catch (error) {
    console.error("[Automation] Error running workflow:", error)
    return NextResponse.json(
      { error: "Failed to run workflow", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
