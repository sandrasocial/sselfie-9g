import { NextResponse } from "next/server"
import { SSELFIE_BRAND_BRAIN } from "@/lib/brand-engine/brand-brain/sselfie-brand-brain"

/**
 * GET /api/brand-engine/brand-brain
 *
 * Returns the current Brand Brain data.
 * Used by Make.com scenarios and the admin dashboard.
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: SSELFIE_BRAND_BRAIN,
      meta: {
        version: SSELFIE_BRAND_BRAIN.version,
        lastUpdated: SSELFIE_BRAND_BRAIN.lastUpdated,
      },
    })
  } catch (error) {
    console.error("Error fetching brand brain:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch brand brain" },
      { status: 500 }
    )
  }
}
