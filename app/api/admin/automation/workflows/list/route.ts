import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

/**
 * GET /api/admin/automation/workflows/list
 * Returns available workflow definitions
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const workflows = [
      {
        id: "onboarding",
        name: "Onboarding Sequence",
        description: "Welcome new users and guide them through first steps",
        category: "Retention",
        estimatedEmails: 4,
      },
      {
        id: "newsletter",
        name: "Weekly Newsletter",
        description: "Generate and send weekly newsletter to all subscribers",
        category: "Content",
        estimatedEmails: 1,
      },
      {
        id: "retention",
        name: "Re-engagement Campaign",
        description: "Win back inactive users with personalized content",
        category: "Retention",
        estimatedEmails: 3,
      },
      {
        id: "upgrade",
        name: "Upgrade Nudge",
        description: "Encourage free users to upgrade to paid plans",
        category: "Growth",
        estimatedEmails: 2,
      },
      {
        id: "announcement",
        name: "Product Announcement",
        description: "Share new features and updates with users",
        category: "Content",
        estimatedEmails: 1,
      },
      {
        id: "churn-prevention",
        name: "Churn Prevention",
        description: "Identify and re-engage users at risk of churning",
        category: "Retention",
        estimatedEmails: 2,
      },
      {
        id: "sales-dashboard",
        name: "Weekly Sales Report",
        description: "Generate weekly sales insights and send to admin",
        category: "Analytics",
        estimatedEmails: 1,
      },
      {
        id: "user-journey",
        name: "Personalized User Journey",
        description: "Send contextual messages based on user behavior",
        category: "Retention",
        estimatedEmails: "Variable",
      },
    ]

    return NextResponse.json({ workflows })
  } catch (error) {
    console.error("[Automation] Error listing workflows:", error)
    return NextResponse.json(
      { error: "Failed to list workflows", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
