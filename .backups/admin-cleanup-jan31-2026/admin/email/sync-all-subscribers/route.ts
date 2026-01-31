import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { addOrUpdateResendContact, addContactToSegment } from "@/lib/resend/manage-contact"

const sql = neon(process.env.DATABASE_URL!)
const resend = new Resend(process.env.RESEND_API_KEY)
const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * Sync all subscribers (freebie + blueprint) to Resend and create/update "All Subscribers" segment
 * This ensures the nurture sequence can target everyone
 */
export async function POST() {
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
      })
    }

    console.log("[v0] Syncing all subscribers to Resend...")

    // Get all freebie subscribers who haven't converted
    const freebieSubscribers = await sql`
      SELECT email, name
      FROM freebie_subscribers
      WHERE converted_to_user = false
      AND email IS NOT NULL
      AND email != ''
    `

    // Get all blueprint subscribers who haven't converted
    const blueprintSubscribers = await sql`
      SELECT email, name
      FROM blueprint_subscribers
      WHERE converted_to_user = false
      AND email IS NOT NULL
      AND email != ''
    `

    // Combine and deduplicate
    const allSubscribers = new Map<string, { email: string; name: string }>()
    
    freebieSubscribers.forEach((sub: any) => {
      if (sub.email) allSubscribers.set(sub.email.toLowerCase(), { email: sub.email, name: sub.name || "Subscriber" })
    })
    
    blueprintSubscribers.forEach((sub: any) => {
      if (sub.email) allSubscribers.set(sub.email.toLowerCase(), { email: sub.email, name: sub.name || "Subscriber" })
    })

    console.log(`[v0] Found ${allSubscribers.size} unique subscribers to sync`)

    // Create or get "All Subscribers" segment
    let segmentId: string
    try {
      // Try to find existing segment
      const segmentsResponse = await (resend as any).segments?.list?.({ audienceId })
      const existingSegment = segmentsResponse?.data?.find?.((s: any) => 
        s.name?.toLowerCase().includes("all subscriber") || 
        s.name?.toLowerCase().includes("all subscriber")
      )

      if (existingSegment) {
        segmentId = existingSegment.id
        console.log(`[v0] Found existing segment: ${segmentId}`)
      } else {
        // Create new segment
        const segmentResponse = await (resend as any).segments?.create?.({
          name: "All Subscribers",
          audienceId,
        })
        segmentId = segmentResponse?.data?.id || segmentResponse?.id
        console.log(`[v0] Created new segment: ${segmentId}`)
      }
    } catch (error: any) {
      console.error("[v0] Error creating/getting segment:", error)
      return NextResponse.json({
        success: false,
        error: "Failed to create/get segment",
        details: error.message,
      })
    }

    // Sync all subscribers to Resend and add to segment
    let synced = 0
    let errors = 0
    const errorList: string[] = []

    for (const subscriber of Array.from(allSubscribers.values())) {
      try {
        // Add/update contact in Resend
        await addOrUpdateResendContact(subscriber.email, subscriber.name, {
          tags: ["freebie-subscriber", "nurture-sequence"],
        })

        // Add to segment
        await addContactToSegment(subscriber.email, segmentId)

        synced++
        
        // Rate limiting
        if (synced % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      } catch (error: any) {
        errors++
        errorList.push(`${subscriber.email}: ${error.message}`)
        if (errors <= 5) {
          console.error(`[v0] Error syncing ${subscriber.email}:`, error)
        }
      }
    }

    console.log(`[v0] ✅ Synced ${synced} subscribers, ${errors} errors`)

    return NextResponse.json({
      success: true,
      segmentId,
      segmentName: "All Subscribers",
      synced,
      errors,
      totalSubscribers: allSubscribers.size,
      errorList: errorList.slice(0, 10), // First 10 errors
      message: `Successfully synced ${synced} subscribers to Resend segment "${segmentId}". Use this segment ID for the nurture sequence.`,
    })
  } catch (error: any) {
    console.error("[v0] Error syncing subscribers:", error)
    return NextResponse.json(
      { success: false, error: "Failed to sync subscribers", details: error.message },
      { status: 500 }
    )
  }
}

