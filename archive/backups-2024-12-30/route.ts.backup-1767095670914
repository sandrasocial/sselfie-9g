import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { hasStudioMembership } from "@/lib/subscription"
import { addContactToSegment, addOrUpdateResendContact } from "@/lib/resend/manage-contact"

const sql = neon(process.env.DATABASE_URL || "")

/**
 * Syncs all existing one-time session buyers to the Instagram Photoshoot Buyers segment
 * Excludes users who have active Studio memberships
 */
export async function POST(request: Request) {
  try {
    const { segmentId } = await request.json().catch(() => ({}))
    
    const photoshootBuyersSegmentId = segmentId || process.env.RESEND_PHOTOSHOOT_BUYERS_SEGMENT_ID
    
    if (!photoshootBuyersSegmentId) {
      return NextResponse.json(
        { 
          error: "Segment ID required",
          message: "Provide segmentId in request body or set RESEND_PHOTOSHOOT_BUYERS_SEGMENT_ID environment variable"
        },
        { status: 400 }
      )
    }

    console.log(`[v0] Syncing one-time session buyers to segment: ${photoshootBuyersSegmentId}`)
    
    // Fetch all one-time session buyers
    const oneTimeBuyers = await sql`
      SELECT DISTINCT
        u.id as user_id,
        u.email,
        u.first_name,
        u.last_name,
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
    const added: string[] = []
    const excluded: string[] = []

    for (const buyer of oneTimeBuyers) {
      try {
        // Check if user has active Studio membership
        const hasActiveMembership = await hasStudioMembership(buyer.user_id)
        
        if (hasActiveMembership) {
          console.log(`[v0] ⏭️ Excluding ${buyer.email} - has active Studio membership`)
          excludedCount++
          excluded.push(buyer.email)
          continue
        }

        // First, ensure contact exists in Resend audience
        const firstName = buyer.display_name || buyer.first_name || buyer.email.split('@')[0]
        const contactResult = await addOrUpdateResendContact(buyer.email, firstName, {
          source: 'stripe-purchase',
          status: "customer",
          product: "one-time-session",
          journey: "onboarding",
        })

        if (!contactResult.success) {
          errorCount++
          const errorMsg = `${buyer.email}: Failed to add to Resend audience - ${contactResult.error}`
          errors.push(errorMsg)
          console.error(`[v0] ✗ Failed to add ${buyer.email} to Resend: ${contactResult.error}`)
          continue
        }

        // Now add to segment
        console.log(`[v0] Adding ${buyer.email} to segment...`)
        const segmentResult = await addContactToSegment(buyer.email, photoshootBuyersSegmentId)
        
        if (segmentResult.success) {
          console.log(`[v0] ✅ Added ${buyer.email} to segment`)
          successCount++
          added.push(buyer.email)
        } else {
          errorCount++
          const errorMsg = `${buyer.email}: ${segmentResult.error}`
          errors.push(errorMsg)
          console.error(`[v0] ✗ Failed to add ${buyer.email} to segment: ${segmentResult.error}`)
        }

        // Rate limit: wait 600ms between requests to avoid API limits
        await new Promise((resolve) => setTimeout(resolve, 600))
      } catch (error: any) {
        errorCount++
        const errorMsg = `${buyer.email}: ${error.message}`
        errors.push(errorMsg)
        console.error(`[v0] ✗ Error processing ${buyer.email}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      segmentId: photoshootBuyersSegmentId,
      stats: {
        totalBuyers: oneTimeBuyers.length,
        added: successCount,
        excluded: excludedCount,
        errors: errorCount,
      },
      added: added.slice(0, 20), // First 20 for preview
      excluded: excluded.slice(0, 20), // First 20 for preview
      errors: errors.slice(0, 20), // First 20 errors
      message: `Sync complete. Added ${successCount} buyers, excluded ${excludedCount} Studio members, ${errorCount} errors.`,
    })
  } catch (error: any) {
    console.error("[v0] Error syncing Photoshoot Buyers segment:", error)
    return NextResponse.json(
      { error: "Failed to sync segment", details: error.message },
      { status: 500 }
    )
  }
}

