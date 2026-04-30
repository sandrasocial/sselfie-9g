import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * POST /api/admin/diagnostics/create-missing-tables
 *
 * Disabled for production safety. The previous implementation read migration
 * files from dynamic process.cwd() paths, which caused Vercel to trace and
 * bundle the whole repository into this function. Schema changes should run
 * through reviewed migrations instead of this runtime endpoint.
 */
export async function POST() {
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

    return NextResponse.json(
      {
        success: false,
        error: "Runtime table creation is disabled. Apply reviewed migrations instead.",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    )
  } catch (error: any) {
    console.error("[ADMIN-SCHEMA] Diagnostics endpoint error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to validate admin access",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
