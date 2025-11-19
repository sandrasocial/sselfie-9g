import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"
import { addOrUpdateResendContact } from "@/lib/resend/manage-contact"

const sql = neon(process.env.DATABASE_URL || "")
const resend = new Resend(process.env.RESEND_API_KEY)
const audienceId = process.env.RESEND_AUDIENCE_ID!

export async function POST() {
  try {
    console.log("[v0] Creating beta customer segment in Resend...")
    
    console.log("[v0] Fetching ALL paying customers from database (memberships + one-time sessions)...")
    
    const dbCustomers = await sql`
      SELECT DISTINCT
        u.email,
        u.first_name,
        u.last_name,
        u.display_name,
        'membership' as purchase_type,
        s.product_type,
        s.created_at as purchase_date
      FROM users u
      INNER JOIN subscriptions s ON u.id = s.user_id::varchar
      WHERE u.email IS NOT NULL
        AND u.email != ''
        AND s.is_test_mode = FALSE
      
      UNION
      
      SELECT DISTINCT
        u.email,
        u.first_name,
        u.last_name,
        u.display_name,
        'credit_purchase' as purchase_type,
        'one_time_session' as product_type,
        ct.created_at as purchase_date
      FROM users u
      INNER JOIN credit_transactions ct ON u.id = ct.user_id::varchar
      WHERE u.email IS NOT NULL
        AND u.email != ''
        AND ct.is_test_mode = FALSE
        AND ct.transaction_type = 'purchase'
        AND ct.amount > 0
      
      ORDER BY purchase_date DESC
    `

    console.log(`[v0] Found ${dbCustomers.length} paying customers`)
    console.log("[v0] Breakdown by purchase type:")
    const membershipCount = dbCustomers.filter((c: any) => c.purchase_type === 'membership').length
    const creditCount = dbCustomers.filter((c: any) => c.purchase_type === 'credit_purchase').length
    console.log(`[v0]  - Memberships: ${membershipCount}`)
    console.log(`[v0]  - One-time sessions/credits: ${creditCount}`)

    if (dbCustomers.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No beta customers found",
        message: "No paying customers were found in the database",
      })
    }

    console.log("[v0] Creating 'Beta Customers' segment via Resend API...")
    let segmentId: string

    try {
      const { data: segment, error: segmentError } = await resend.segments.create({
        name: 'Beta Customers',
      })

      if (segmentError || !segment) {
        console.error("[v0] Failed to create segment:", segmentError)
        return NextResponse.json({
          success: false,
          error: "Failed to create segment",
          message: segmentError?.message || "Could not create segment in Resend",
        }, { status: 500 })
      }

      segmentId = segment.id
      console.log(`[v0] ✓ Segment created with ID: ${segmentId}`)
    } catch (error) {
      console.error("[v0] Exception creating segment:", error)
      return NextResponse.json({
        success: false,
        error: "Failed to create segment",
        message: error instanceof Error ? error.message : "Unknown error",
      }, { status: 500 })
    }

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const customer of dbCustomers) {
      try {
        const firstName = customer.display_name || customer.first_name || customer.email.split('@')[0]

        let productTag = "unknown"
        if (customer.product_type === "one_time_session" || customer.purchase_type === "credit_purchase") {
          productTag = "one-time-session"
        } else if (customer.product_type === "sselfie_studio_membership") {
          productTag = "studio-membership"
        } else if (customer.product_type === "credit_topup") {
          productTag = "credit-topup"
        }

        console.log(`[v0] Adding/updating contact: ${customer.email} (${customer.purchase_type})`)

        const result = await addOrUpdateResendContact(customer.email, firstName, {
          source: 'stripe-purchase',
          status: "customer",
          journey: "testimonial-request",
          product: productTag,
          "beta-customer": "true",
        })

        if (result.success) {
          console.log(`[v0] ✓ Tagged as customer: ${customer.email}`)

          try {
            await resend.contacts.segments.add({
              email: customer.email,
              segmentId: segmentId,
            })

            console.log(`[v0] ✓ Added to segment: ${customer.email}`)
            successCount++
          } catch (segError) {
            console.error(`[v0] ✗ Failed to add to segment: ${customer.email}`, segError)
            errorCount++
            errors.push(`${customer.email}: Failed to add to segment`)
          }
        } else {
          errorCount++
          errors.push(`${customer.email}: ${result.error}`)
          console.error(`[v0] ✗ Failed to tag ${customer.email}:`, result.error)
        }

        await new Promise((resolve) => setTimeout(resolve, 600))
      } catch (error) {
        errorCount++
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        errors.push(`${customer.email}: ${errorMsg}`)
        console.error(`[v0] ✗ Exception for ${customer.email}:`, error)
      }
    }

    console.log(`[v0] Beta segment sync complete: ${successCount} success, ${errorCount} errors`)

    return NextResponse.json({
      success: true,
      message: `Successfully created segment and added ${successCount} beta customers!`,
      totalAdded: successCount,
      segmentId,
      segmentName: "Beta Customers",
      summary: {
        audienceId,
        segmentId,
        totalCustomers: dbCustomers.length,
        memberships: membershipCount,
        oneTimeSessions: creditCount,
        successfullyAdded: successCount,
        errors: errorCount,
      },
      customers: dbCustomers.slice(0, 10).map((c: any) => ({ 
        email: c.email, 
        purchaseType: c.purchase_type,
        productType: c.product_type 
      })),
      instructions: [
        "✓ Beta Customers segment created in Resend!",
        `✓ Segment ID: ${segmentId}`,
        `✓ ${successCount} customers added to segment`,
        `✓ ${membershipCount} studio memberships`,
        `✓ ${creditCount} one-time session purchases`,
        "",
        "The segment is ready to use for broadcasting.",
        "All freebie subscribers are excluded (they have 'status:lead' tag).",
      ],
      errorDetails: errors.length > 0 ? errors.slice(0, 10) : undefined,
    })
  } catch (error) {
    console.error("[v0] Error creating beta segment:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create beta segment",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
