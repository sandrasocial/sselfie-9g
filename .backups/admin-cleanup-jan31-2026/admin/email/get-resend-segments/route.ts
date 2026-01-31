import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

const resend = new Resend(process.env.RESEND_API_KEY)
const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * Get all Resend segments for email sequences
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

    const audienceId = process.env.RESEND_AUDIENCE_ID

    if (!audienceId) {
      return NextResponse.json({
        success: false,
        error: "RESEND_AUDIENCE_ID not configured",
        segments: [],
      })
    }

    let segments: any[] = []

    try {
      // Try to get segments via Resend API
      const segmentsResponse = await (resend as any).segments?.list?.({ audienceId })
      
      if (segmentsResponse?.data) {
        segments = Array.isArray(segmentsResponse.data) 
          ? segmentsResponse.data 
          : segmentsResponse.data.data || []
      }
    } catch (error: any) {
      console.error("[v0] Error fetching segments:", error)
      // Fallback to known segments from env
      segments = [
        ...(process.env.RESEND_BETA_SEGMENT_ID ? [{
          id: process.env.RESEND_BETA_SEGMENT_ID,
          name: "Beta Customers",
        }] : []),
        ...(process.env.RESEND_PHOTOSHOOT_BUYERS_SEGMENT_ID ? [{
          id: process.env.RESEND_PHOTOSHOOT_BUYERS_SEGMENT_ID,
          name: "Photoshoot Buyers",
        }] : []),
      ]
    }

    return NextResponse.json({
      success: true,
      segments: segments.map((s: any) => ({
        id: s.id,
        name: s.name || "Unnamed Segment",
        contactsCount: s.contacts_count || 0,
      })),
    })
  } catch (error: any) {
    console.error("[v0] Error getting Resend segments:", error)
    return NextResponse.json(
      { success: false, error: "Failed to get segments", details: error.message },
      { status: 500 }
    )
  }
}

