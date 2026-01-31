import { NextResponse } from "next/server"
import { Resend } from "resend"
import { neon } from "@neondatabase/serverless"
import { hasStudioMembership } from "@/lib/subscription"
import { addContactToSegment } from "@/lib/resend/manage-contact"

const sql = neon(process.env.DATABASE_URL || "")
const resend = new Resend(process.env.RESEND_API_KEY)
const audienceId = process.env.RESEND_AUDIENCE_ID!

/**
 * Creates the "Instagram Photoshoot Buyers" segment in Resend
 * and syncs all one-time session buyers who don't have Studio memberships
 */
export async function POST() {
  try {
    console.log("[v0] Creating Instagram Photoshoot Buyers segment in Resend...")
    
    if (!audienceId) {
      return NextResponse.json(
        { error: "RESEND_AUDIENCE_ID not configured" },
        { status: 400 }
      )
    }

    // Create the segment in Resend
    let segmentId: string
    try {
      // @ts-ignore - Resend types may not include segments.create yet
      const segmentResponse = await resend.segments.create({
        name: "Instagram Photoshoot Buyers",
        audienceId: audienceId,
      })

      segmentId = segmentResponse.data?.id || segmentResponse.id
      console.log(`[v0] ✅ Created segment: ${segmentId}`)
    } catch (error: any) {
      // If segment already exists, try to find it
      if (error.message?.includes("already exists") || error.message?.includes("duplicate")) {
        console.log("[v0] Segment may already exist, attempting to find it...")
        
        try {
          // @ts-ignore
          const segments = await resend.segments.list({ audienceId })
          const existingSegment = segments.data?.data?.find(
            (s: any) => s.name === "Instagram Photoshoot Buyers"
          )
          
          if (existingSegment) {
            segmentId = existingSegment.id
            console.log(`[v0] ✅ Found existing segment: ${segmentId}`)
          } else {
            throw new Error("Segment not found and could not be created")
          }
        } catch (findError) {
          return NextResponse.json(
            { error: "Could not create or find segment", details: error.message },
            { status: 500 }
          )
        }
      } else {
        return NextResponse.json(
          { error: "Failed to create segment", details: error.message },
          { status: 500 }
        )
      }
    }

    // Now sync all one-time session buyers who don't have Studio memberships
    console.log("[v0] Fetching one-time session buyers from database...")
    
    const oneTimeBuyers = await sql`
      SELECT DISTINCT
        u.id as user_id,
        u.email,
        u.display_name,
        ct.created_at as purchase_date
      FROM users u
      INNER JOIN credit_transactions ct ON u.id = ct.user_id::varchar
      WHERE u.email IS NOT NULL
        AND u.email != ''
        AND ct.is_test_mode = FALSE
        AND ct.transaction_type = 'purchase'
        AND ct.amount > 0
        AND ct.product_type = 'one_time_session'
      ORDER BY ct.created_at DESC
    `

    console.log(`[v0] Found ${oneTimeBuyers.length} one-time session buyers`)

    let successCount = 0
    let excludedCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const buyer of oneTimeBuyers) {
      try {
        // Check if user has active Studio membership
        const hasActiveMembership = await hasStudioMembership(buyer.user_id)
        
        if (hasActiveMembership) {
          console.log(`[v0] ⏭️ Excluding ${buyer.email} - has active Studio membership`)
          excludedCount++
          continue
        }

        // Add to segment
        const segmentResult = await addContactToSegment(buyer.email, segmentId)
        
        if (segmentResult.success) {
          console.log(`[v0] ✅ Added ${buyer.email} to segment`)
          successCount++
        } else {
          errorCount++
          errors.push(`${buyer.email}: ${segmentResult.error}`)
          console.error(`[v0] ✗ Failed to add ${buyer.email}: ${segmentResult.error}`)
        }

        // Rate limit: wait 600ms between requests
        await new Promise((resolve) => setTimeout(resolve, 600))
      } catch (error: any) {
        errorCount++
        errors.push(`${buyer.email}: ${error.message}`)
        console.error(`[v0] ✗ Error processing ${buyer.email}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      segmentId,
      segmentName: "Instagram Photoshoot Buyers",
      stats: {
        totalBuyers: oneTimeBuyers.length,
        added: successCount,
        excluded: excludedCount,
        errors: errorCount,
      },
      message: `Segment created/updated. Added ${successCount} buyers, excluded ${excludedCount} Studio members.`,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Limit error output
      note: "Add RESEND_PHOTOSHOOT_BUYERS_SEGMENT_ID to your environment variables with the segment ID above",
    })
  } catch (error: any) {
    console.error("[v0] Error creating Photoshoot Buyers segment:", error)
    return NextResponse.json(
      { error: "Failed to create segment", details: error.message },
      { status: 500 }
    )
  }
}

