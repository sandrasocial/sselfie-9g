import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import {
  getEmailControlSettings,
  setEmailSendingEnabled,
  setEmailTestMode,
} from "@/lib/email/email-control"

const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * GET /api/admin/email-control/settings
 * Get current email control settings
 */
export async function GET(request: Request) {
  try {
    // Admin auth check
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

    const settings = await getEmailControlSettings()

    return NextResponse.json({
      success: true,
      settings,
    })
  } catch (error: any) {
    console.error("[EMAIL-CONTROL] Error fetching settings:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch email control settings",
      },
      { status: 500 },
    )
  }
}

/**
 * POST /api/admin/email-control/settings
 * Update email control settings
 * Body: { emailSendingEnabled?: boolean, emailTestMode?: boolean }
 */
export async function POST(request: Request) {
  try {
    // Admin auth check
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
    const { emailSendingEnabled, emailTestMode } = body

    // Update settings
    if (typeof emailSendingEnabled === "boolean") {
      await setEmailSendingEnabled(emailSendingEnabled, user.email)
    }

    if (typeof emailTestMode === "boolean") {
      await setEmailTestMode(emailTestMode, user.email)
    }

    const settings = await getEmailControlSettings()

    return NextResponse.json({
      success: true,
      settings,
    })
  } catch (error: any) {
    console.error("[EMAIL-CONTROL] Error updating settings:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update email control settings",
      },
      { status: 500 },
    )
  }
}

