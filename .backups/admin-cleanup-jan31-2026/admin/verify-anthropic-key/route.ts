import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * Diagnostic endpoint to verify ANTHROPIC_API_KEY is set
 * Only accessible to admin users
 */
export async function GET() {
  try {
    // Check authentication
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

    // Check if key is set (without exposing the actual value)
    const hasKey = !!process.env.ANTHROPIC_API_KEY
    const keyLength = process.env.ANTHROPIC_API_KEY?.length || 0
    const keyPrefix = process.env.ANTHROPIC_API_KEY?.substring(0, 7) || ""

    return NextResponse.json({
      status: "ok",
      hasAnthropicKey: hasKey,
      keyConfigured: hasKey,
      keyLength: hasKey ? keyLength : 0,
      keyPrefix: hasKey ? `${keyPrefix}...` : "not set",
      message: hasKey
        ? "✅ ANTHROPIC_API_KEY is set - Direct Anthropic SDK will be used"
        : "❌ ANTHROPIC_API_KEY is NOT set - Will fallback to AI SDK (tools may fail)",
      environment: process.env.NODE_ENV || "unknown",
    })
  } catch (error: any) {
    console.error("[v0] Error checking ANTHROPIC_API_KEY:", error)
    return NextResponse.json(
      {
        status: "error",
        error: error.message || "Unknown error",
      },
      { status: 500 }
    )
  }
}

