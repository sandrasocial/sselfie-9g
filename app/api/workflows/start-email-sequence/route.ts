import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { emailSequenceWorkflow, userOnboardingWorkflow } from "@/lib/workflows/email-sequence-workflow"

const ADMIN_EMAIL = "ssa@ssasocial.com"

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { workflowType, sequenceName, userId, userEmail } = body

    let workflowResult

    if (workflowType === "email_sequence") {
      if (!sequenceName) {
        return NextResponse.json({ error: "sequenceName required" }, { status: 400 })
      }

      // Start email sequence workflow
      workflowResult = await emailSequenceWorkflow(userId || user.id, sequenceName)
    } else if (workflowType === "user_onboarding") {
      if (!userId || !userEmail) {
        return NextResponse.json({ error: "userId and userEmail required" }, { status: 400 })
      }

      // Start user onboarding workflow
      workflowResult = await userOnboardingWorkflow(userId, userEmail)
    } else {
      return NextResponse.json({ error: "Invalid workflowType" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      workflowResult,
      message: "Workflow started successfully",
    })
  } catch (error: any) {
    console.error("[v0] Error starting workflow:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
