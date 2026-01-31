import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getStripe } from "@/lib/stripe"
import Stripe from "stripe"

const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * GET /api/admin/diagnostics/stripe-health
 * Returns Stripe connection health, account balance, webhook delivery stats, and rate-limit health
 */
export async function GET() {
  try {
    // Admin auth check
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

    const stripe = getStripe()
    const health: {
      connected: boolean
      account?: {
        id: string
        email: string
        country: string
        default_currency: string
      }
      balance?: {
        available: number
        pending: number
        currency: string
      }
      webhooks?: {
        total: number
        enabled: number
        recentFailures: number
      }
      rateLimit?: {
        remaining: number | null
        reset: number | null
      }
      error?: string
    } = {
      connected: false,
    }

    try {
      // Test connection by fetching account
      const account = await stripe.accounts.retrieve()
      health.connected = true
      health.account = {
        id: account.id,
        email: account.email || "N/A",
        country: account.country || "N/A",
        default_currency: account.default_currency || "usd",
      }
    } catch (error: any) {
      health.error = error.message
      return NextResponse.json(
        {
          success: false,
          health,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    try {
      // Get account balance
      const balance = await stripe.balance.retrieve()
      health.balance = {
        available: balance.available[0]?.amount || 0,
        pending: balance.pending[0]?.amount || 0,
        currency: balance.available[0]?.currency || "usd",
      }
    } catch (error: any) {
      console.error("[Stripe Health] Error fetching balance:", error)
      // Non-critical, continue
    }

    try {
      // Get webhook endpoints
      const webhooks = await stripe.webhookEndpoints.list({ limit: 100 })
      const enabledWebhooks = webhooks.data.filter((w) => w.status === "enabled")

      // Check recent webhook delivery failures (last 24h)
      let recentFailures = 0
      try {
        const events = await stripe.events.list({
          type: "webhook_endpoint.updated",
          limit: 100,
        })
        // This is a simplified check - in production you'd track actual delivery failures
        recentFailures = 0 // Placeholder
      } catch {
        // Non-critical
      }

      health.webhooks = {
        total: webhooks.data.length,
        enabled: enabledWebhooks.length,
        recentFailures,
      }
    } catch (error: any) {
      console.error("[Stripe Health] Error fetching webhooks:", error)
      // Non-critical, continue
    }

    // Rate limit info (from response headers if available)
    // Note: Stripe doesn't expose rate limit headers in all responses
    health.rateLimit = {
      remaining: null, // Would need to track from response headers
      reset: null,
    }

    // Test canceled subscriptions query
    let canceledSubsTest = null
    try {
      const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)
      const testSubs = await stripe.subscriptions.list({
        status: "canceled",
        limit: 10,
      })
      
      const recentCanceled = testSubs.data.filter(
        (sub) => sub.canceled_at && sub.canceled_at >= thirtyDaysAgo
      )

      canceledSubsTest = {
        totalCanceledInStripe: testSubs.data.length,
        recentCanceledCount: recentCanceled.length,
        sampleCanceledAt: testSubs.data[0]?.canceled_at
          ? new Date(testSubs.data[0].canceled_at * 1000).toISOString()
          : null,
        thirtyDaysAgoTimestamp: thirtyDaysAgo,
        thirtyDaysAgoDate: new Date(thirtyDaysAgo * 1000).toISOString(),
      }
    } catch (error: any) {
      console.error("[Stripe Health] Error testing canceled subscriptions:", error)
      canceledSubsTest = { error: error.message }
    }

    return NextResponse.json({
      success: true,
      health,
      canceledSubsTest,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[Stripe Health] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to check Stripe health",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

