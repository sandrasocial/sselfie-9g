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

    const betaCustomers = await sql`
      SELECT DISTINCT
        u.email,
        u.first_name,
        u.last_name,
        u.display_name,
        u.created_at,
        s.product_type,
        s.status,
        s.created_at as purchase_date
      FROM users u
      INNER JOIN subscriptions s ON u.id = s.user_id::varchar
      WHERE s.is_test_mode = FALSE
        AND u.email IS NOT NULL
      ORDER BY s.created_at DESC
    `

    console.log(`[v0] Found ${betaCustomers.length} beta customers`)

    if (betaCustomers.length > 0) {
      console.log("[v0] Sample customers:", betaCustomers.slice(0, 5).map(c => ({
        email: c.email,
        product_type: c.product_type,
        status: c.status
      })))
    }

    if (betaCustomers.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No beta customers found",
        message: "No paying customers were found in the database",
      })
    }

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const customer of betaCustomers) {
      try {
        const firstName = customer.display_name || customer.first_name || customer.email.split("@")[0]
        
        let productTag = "unknown"
        if (customer.product_type === "one_time_session") {
          productTag = "one-time-session"
        } else if (customer.product_type === "sselfie_studio_membership") {
          productTag = "studio-membership"
        } else if (customer.product_type === "credit_topup") {
          productTag = "credit-topup"
        }

        const result = await addOrUpdateResendContact(customer.email, firstName, {
          source: "stripe-purchase",
          status: "customer", // This differentiates from "lead" (freebie subscribers)
          journey: "testimonial-request",
          product: productTag,
          "beta-customer": "true",
          customer_since: customer.purchase_date.toISOString().split("T")[0],
        })

        if (result.success) {
          console.log(`[v0] ✓ Tagged as customer: ${customer.email}`)
          successCount++
        } else {
          errorCount++
          errors.push(`${customer.email}: ${result.error}`)
          console.error(`[v0] ✗ Failed to tag ${customer.email}:`, result.error)
        }

        // Rate limit: wait 100ms between requests
        await new Promise((resolve) => setTimeout(resolve, 100))
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
      message: `Successfully tagged ${successCount} beta customers in Resend!`,
      totalTagged: successCount,
      summary: {
        audienceId,
        totalCustomers: betaCustomers.length,
        successfullyTagged: successCount,
        errors: errorCount,
      },
      customers: betaCustomers.slice(0, 10).map(c => ({ email: c.email, product: c.product_type })),
      instructions: [
        "✓ All beta customers have been tagged in your Resend audience!",
        "",
        "Important: Freebie vs. Paying Customer Separation:",
        "• Freebie subscribers have 'status:lead' tag",
        "• Paying customers have 'status:customer' tag",
        "• Beta customers also have 'beta-customer:true' tag",
        "",
        "Next steps to create the segment manually in Resend:",
        "1. Go to https://resend.com/audiences/segments",
        "2. Click 'Create Segment'",
        "3. Name it 'Beta Customers'",
        "4. Add filter: status = customer",
        "5. Save and use this segment for the testimonial broadcast",
        "",
        `Total contacts tagged: ${successCount} of ${betaCustomers.length}`,
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
