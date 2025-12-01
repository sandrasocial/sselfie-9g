/**
 * Resend Audience Sync Endpoint
 * Manually trigger sync from Resend Audience API
 * POST /api/email-sequence/sync
 */

import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/security/require-admin"
import { syncResendAudience } from "@/lib/data/sync-resend-users"

export async function POST(request: Request) {
  try {
    // Require admin access
    const guard = await requireAdmin(request)
    if (guard instanceof NextResponse) {
      return guard
    }

    console.log("[EmailSequenceSync] Starting Resend Audience sync...")

    const result = await syncResendAudience()

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          ...result,
        },
        { status: 500 },
      )
    }

    console.log(
      `[EmailSequenceSync] Sync complete: ${result.synced} new, ${result.updated} updated`,
    )

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error("[EmailSequenceSync] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

