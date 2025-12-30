import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sql } from "@/lib/neon"

const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * Admin endpoint to backfill Stripe customer IDs for existing users
 * 
 * Query params:
 * - email: (optional) Backfill for a specific user by email
 * - userId: (optional) Backfill for a specific user by ID
 * - all: (optional) Backfill all users missing customer IDs
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate admin
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const targetEmail = searchParams.get("email")
    const targetUserId = searchParams.get("userId")
    const backfillAll = searchParams.get("all") === "true"

    const results: Array<{ email: string; userId: string; customerId: string | null; status: string }> = []

    if (targetEmail) {
      // Backfill for specific email
      console.log(`[v0] [BACKFILL] Backfilling customer ID for email: ${targetEmail}`)
      const result = await backfillCustomerIdForEmail(targetEmail)
      results.push(result)
    } else if (targetUserId) {
      // Backfill for specific user ID
      console.log(`[v0] [BACKFILL] Backfilling customer ID for user ID: ${targetUserId}`)
      const user = await sql`
        SELECT id, email FROM users WHERE id = ${targetUserId} LIMIT 1
      `
      if (user.length > 0) {
        const result = await backfillCustomerIdForEmail(user[0].email)
        results.push(result)
      } else {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }
    } else if (backfillAll) {
      // Backfill all users missing customer IDs who have made purchases
      console.log(`[v0] [BACKFILL] Backfilling customer IDs for all users...`)
      
      // Get all users without customer IDs who might have purchases
      // We'll look for users with credits > 0 or who have subscriptions with customer IDs
      const users = await sql`
        SELECT DISTINCT u.id, u.email
        FROM users u
        LEFT JOIN subscriptions s ON s.user_id = u.id
        WHERE u.email IS NOT NULL
        AND (u.stripe_customer_id IS NULL OR u.stripe_customer_id = '')
        AND (
          EXISTS (SELECT 1 FROM user_credits uc WHERE uc.user_id = u.id AND uc.balance > 0)
          OR EXISTS (SELECT 1 FROM subscriptions s2 WHERE s2.user_id = u.id)
        )
        ORDER BY u.created_at DESC
        LIMIT 100
      `

      console.log(`[v0] [BACKFILL] Found ${users.length} users to process`)

      for (const user of users) {
        try {
          const result = await backfillCustomerIdForEmail(user.email)
          results.push(result)
          // Small delay to avoid rate limits
          await new Promise((resolve) => setTimeout(resolve, 100))
        } catch (error: any) {
          console.error(`[v0] [BACKFILL] Error processing ${user.email}:`, error.message)
          results.push({
            email: user.email,
            userId: user.id,
            customerId: null,
            status: `Error: ${error.message}`,
          })
        }
      }
    } else {
      return NextResponse.json(
        { error: "Must provide 'email', 'userId', or 'all=true' parameter" },
        { status: 400 },
      )
    }

    const successCount = results.filter((r) => r.status === "success").length
    const failedCount = results.filter((r) => r.status !== "success").length

    return NextResponse.json({
      success: true,
      processed: results.length,
      successful: successCount,
      failed: failedCount,
      results,
    })
  } catch (error: any) {
    console.error("[v0] [BACKFILL] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to backfill customer IDs",
        message: error.message,
      },
      { status: 500 },
    )
  }
}

async function backfillCustomerIdForEmail(
  email: string,
): Promise<{ email: string; userId: string; customerId: string | null; status: string }> {
  let users: Array<{ id: string; email: string; stripe_customer_id: string | null }> = []
  
  try {
    // Get user from database
    users = await sql`
      SELECT id, email, stripe_customer_id FROM users WHERE email = ${email} LIMIT 1
    `

    if (users.length === 0) {
      return {
        email,
        userId: "",
        customerId: null,
        status: "User not found in database",
      }
    }

    const user = users[0]

    // If user already has a customer ID, skip
    if (user.stripe_customer_id) {
      return {
        email,
        userId: user.id,
        customerId: user.stripe_customer_id,
        status: "Already has customer ID",
      }
    }

    // Search for customer in Stripe by email
    const customers = await stripe.customers.list({
      email: email,
      limit: 10,
    })

    if (customers.data.length === 0) {
      // Try searching checkout sessions as fallback
      console.log(`[v0] [BACKFILL] No Stripe customer found for ${email}, searching checkout sessions...`)
      const customerIdFromSessions = await findCustomerIdFromCheckoutSessions(email)
      
      if (customerIdFromSessions) {
        // Update user with found customer ID
        await sql`
          UPDATE users 
          SET stripe_customer_id = ${customerIdFromSessions}
          WHERE id = ${user.id}
        `
        return {
          email,
          userId: user.id,
          customerId: customerIdFromSessions,
          status: "success",
        }
      }

      return {
        email,
        userId: user.id,
        customerId: null,
        status: "No Stripe customer or checkout sessions found",
      }
    }

    // Use the most recent customer (or first one if multiple)
    const customerId = customers.data[0].id

    // Update user with customer ID
    await sql`
      UPDATE users 
      SET stripe_customer_id = ${customerId}
      WHERE id = ${user.id}
    `

    console.log(`[v0] [BACKFILL] Successfully updated ${email} with customer ID ${customerId}`)

    return {
      email,
      userId: user.id,
      customerId,
      status: "success",
    }
  } catch (error: any) {
    console.error(`[v0] [BACKFILL] Error for ${email}:`, error)
    return {
      email,
      userId: users?.[0]?.id || "",
      customerId: null,
      status: `Error: ${error.message}`,
    }
  }
}

async function findCustomerIdFromCheckoutSessions(email: string): Promise<string | null> {
  try {
    // Search for checkout sessions - we need to list them and filter by metadata or customer_details
    // This is limited but better than nothing
    const sessions = await stripe.checkout.sessions.list({
      limit: 100,
    })

    // Search through checkout sessions for this email
    for (const session of sessions.data) {
      if (
        (session.customer_details?.email === email || session.customer_email === email) &&
        session.customer
      ) {
        const customerId = typeof session.customer === "string" ? session.customer : session.customer.id
        console.log(`[v0] [BACKFILL] Found customer ID ${customerId} from checkout session for ${email}`)
        return customerId
      }
    }

    // Also try searching payment intents
    const payments = await stripe.paymentIntents.list({
      limit: 100,
    })

    for (const payment of payments.data) {
      if (payment.receipt_email === email && payment.customer) {
        const customerId = typeof payment.customer === "string" ? payment.customer : payment.customer.id
        console.log(`[v0] [BACKFILL] Found customer ID ${customerId} from payment intent for ${email}`)
        return customerId
      }
    }

    return null
  } catch (error) {
    console.error(`[v0] [BACKFILL] Error searching checkout sessions:`, error)
    return null
  }
}