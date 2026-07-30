import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { sql } from "@/lib/db/client"
import { withAuth } from "@/lib/auth/with-auth"
import { buildStudioTabPath } from "@/lib/studio/tab-routing"

export async function handleCreatePortalSession({
  request,
  user: neonUser,
}: {
  request: Request
  user: { id: string | number; email?: string | null }
}) {
  try {
    console.log("[v0] Create portal session: Starting")
    console.log("[v0] Create portal session: Neon user ID:", neonUser.id)

    let stripeCustomerId: string | null = null

    // First, try to get from subscriptions table
    const subscriptionResult = await sql`
      SELECT stripe_customer_id
      FROM subscriptions
      WHERE user_id = ${neonUser.id}
      AND stripe_customer_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (subscriptionResult.length > 0 && subscriptionResult[0].stripe_customer_id) {
      stripeCustomerId = subscriptionResult[0].stripe_customer_id
      console.log("[v0] Create portal session: Found Stripe customer ID in subscriptions table:", stripeCustomerId)
    } else {
      // Fall back to users table
      console.log("[v0] Create portal session: No subscription found, checking users table")
      const userResult = await sql`
        SELECT stripe_customer_id
        FROM users
        WHERE id = ${neonUser.id}
        AND stripe_customer_id IS NOT NULL
        LIMIT 1
      `

      if (userResult.length > 0 && userResult[0].stripe_customer_id) {
        stripeCustomerId = userResult[0].stripe_customer_id
        console.log("[v0] Create portal session: Found Stripe customer ID in users table:", stripeCustomerId)
      }
    }

    if (!stripeCustomerId && neonUser.email) {
      // Try to find customer ID from Stripe by email (for existing users who haven't been backfilled)
      console.log("[v0] Create portal session: No customer ID in database, searching Stripe by email:", neonUser.email)
      try {
        const customers = await stripe.customers.list({
          email: neonUser.email,
          limit: 1,
        })

        if (customers.data.length > 0) {
          stripeCustomerId = customers.data[0].id
          console.log("[v0] Create portal session: Found customer ID from Stripe:", stripeCustomerId)

          // Save it to the database for future use
          await sql`
            UPDATE users
            SET stripe_customer_id = ${stripeCustomerId}
            WHERE id = ${neonUser.id}
          `
          console.log("[v0] Create portal session: Saved customer ID to database")
        }
      } catch (stripeSearchError: any) {
        console.error("[v0] Create portal session: Error searching Stripe:", stripeSearchError.message)
      }
    }

    if (!stripeCustomerId) {
      console.log("[v0] Create portal session: No Stripe customer ID found for user:", neonUser.id)
      return NextResponse.json(
        {
          error: "No subscription found",
          message: "You don't have an active subscription. Please purchase a membership to manage your subscription.",
        },
        { status: 404 },
      )
    }

    const origin = request.headers.get("origin")
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin || "https://sselfie.ai"

    // Optional caller-provided return path (allowlisted). Legacy /studio callers send no body
    // and keep the classic Studio account tab; the new /app Account passes returnPath: "/app".
    let returnPath = buildStudioTabPath("account")
    try {
      const body = (await request.json()) as { returnPath?: string } | null
      if (body?.returnPath === "/app") returnPath = "/app"
      // B1 (2026-07-30): Vault Maya members manage billing from their studio and must
      // return there, not to a surface their tier cannot open.
      if (body?.returnPath === "/vault-maya/studio") returnPath = "/vault-maya/studio"
    } catch {
      // No/invalid JSON body - legacy caller, default return path stands.
    }

    console.log("[v0] Create portal session: Creating Stripe session for customer:", stripeCustomerId)

    try {
      await stripe.customers.retrieve(stripeCustomerId)
    } catch (stripeError: any) {
      console.error("[v0] Create portal session: Invalid Stripe customer:", stripeError.message)
      return NextResponse.json(
        {
          error: "Invalid customer",
          message: "Your subscription data is invalid. Please contact support.",
        },
        { status: 400 },
      )
    }

    // Create Stripe customer portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${baseUrl}${returnPath}`,
      configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID,
    })

    console.log("[v0] Create portal session: Session created successfully")

    return NextResponse.json({ url: portalSession.url })
  } catch (error: any) {
    console.error("[v0] Error creating portal session:", error)
    return NextResponse.json(
      {
        error: "Failed to create portal session",
        message: error.message || "An unexpected error occurred. Please try again or contact support.",
      },
      { status: 500 },
    )
  }
}

export const POST = withAuth(handleCreatePortalSession)
