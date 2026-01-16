import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { grantPaidBlueprintCredits } from "@/lib/credits"

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/cron/resolve-pending-payments
 * 
 * Resolves pending paid blueprint payments where userId could not be resolved at webhook time.
 * Runs every 5 minutes.
 * 
 * Protected with CRON_SECRET verification
 */
export async function GET(request: NextRequest) {
  try {
    const meta = {
      path: request.nextUrl.pathname,
      method: request.method,
      ts: new Date().toISOString(),
      isVercelCron: request.headers.get("x-vercel-cron"),
      userAgent: request.headers.get("user-agent"),
      hasAuthHeader: request.headers.has("authorization"),
      vercelIdHint: request.headers.get("x-vercel-id"),
    }
    console.log(`[CRON_META] ${JSON.stringify(meta)}`)
    // Verify cron secret (REQUIRED)
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error("[v0] [CRON] CRON_SECRET not configured")
      return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error("[v0] [CRON] Unauthorized resolve-pending-payments cron request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] [CRON] Starting pending payment resolution...")

    // Query pending payments (limit 50 per run to avoid timeout)
    const pendingPayments = await sql`
      SELECT 
        id,
        stripe_payment_id,
        metadata,
        created_at
      FROM stripe_payments
      WHERE status = 'pending_resolution'
        AND product_type = 'paid_blueprint'
      ORDER BY created_at ASC
      LIMIT 50
    `

    if (pendingPayments.length === 0) {
      console.log("[v0] [CRON] No pending payments to resolve")
      const summary = {
        path: request.nextUrl.pathname,
        processed: 0,
        resolved: 0,
        failed: 0,
        skipped: 0,
        status: "ok",
      }
      console.log(`[CRON_SUMMARY] ${JSON.stringify(summary)}`)
      return NextResponse.json({ success: true, processed: 0 })
    }

    console.log(`[v0] [CRON] Found ${pendingPayments.length} pending payments to process`)

    let resolved = 0
    let failed = 0
    let skipped = 0

    for (const payment of pendingPayments) {
      try {
        // Payment-first idempotency check: if payment already processed, skip
        const existingProcessed = await sql`
          SELECT id FROM stripe_payments
          WHERE stripe_payment_id = ${payment.stripe_payment_id}
            AND status = 'succeeded'
            AND user_id IS NOT NULL
          LIMIT 1
        `
        
        if (existingProcessed.length > 0) {
          console.log(`[v0] [CRON] ⏭️ Payment ${payment.stripe_payment_id} already processed, skipping`)
          skipped++
          continue
        }

        // Extract customer email from metadata
        const customerEmail = payment.metadata?.customer_email
        if (!customerEmail) {
          console.error(`[v0] [CRON] ⚠️ Payment ${payment.stripe_payment_id} missing customer_email in metadata`)
          failed++
          continue
        }

        // Lookup user by email
        const [user] = await sql`
          SELECT id FROM users WHERE email = ${customerEmail} LIMIT 1
        `

        if (!user) {
          // User not found - increment retry count
          const retryCount = (payment.metadata?.retry_count || 0) + 1
          const lastRetryAt = new Date().toISOString()

          if (retryCount >= 24) {
            // Max retries reached - mark as failed
            await sql`
              UPDATE stripe_payments
              SET 
                status = 'failed_resolution',
                metadata = jsonb_set(
                  jsonb_set(
                    COALESCE(metadata, '{}'::jsonb),
                    '{retry_count}',
                    to_jsonb(${retryCount})
                  ),
                  '{last_retry_at}',
                  to_jsonb(${lastRetryAt})
                ),
                updated_at = NOW()
              WHERE id = ${payment.id}
            `
            console.error(`[v0] [CRON] ❌ Payment ${payment.stripe_payment_id} failed after ${retryCount} attempts`)
            failed++
          } else {
            // Increment retry count and update last_retry_at
            await sql`
              UPDATE stripe_payments
              SET 
                metadata = jsonb_set(
                  jsonb_set(
                    COALESCE(metadata, '{}'::jsonb),
                    '{retry_count}',
                    to_jsonb(${retryCount})
                  ),
                  '{last_retry_at}',
                  to_jsonb(${lastRetryAt})
                ),
                updated_at = NOW()
              WHERE id = ${payment.id}
            `
            console.log(`[v0] [CRON] ⏳ Payment ${payment.stripe_payment_id} retry ${retryCount}/24 (user not found)`)
          }
          continue
        }

        const userId = user.id

        // Secondary idempotency: Check if credits already granted for this payment
        const existingCredit = await sql`
          SELECT id FROM credit_transactions
          WHERE user_id = ${userId}
            AND stripe_payment_id = ${payment.stripe_payment_id}
            AND transaction_type = 'purchase'
          LIMIT 1
        `

        if (existingCredit.length > 0) {
          // Credits already granted - just update payment status
          await sql`
            UPDATE stripe_payments
            SET 
              user_id = ${userId},
              status = 'succeeded',
              updated_at = NOW()
            WHERE id = ${payment.id}
          `
          console.log(`[v0] [CRON] ⏭️ Payment ${payment.stripe_payment_id} credits already granted, updated status`)
          resolved++
          continue
        }

        // Grant credits (has idempotency check internally)
        const creditResult = await grantPaidBlueprintCredits(userId, payment.stripe_payment_id, false)
        
        if (!creditResult.success) {
          console.error(`[v0] [CRON] ⚠️ Failed to grant credits for payment ${payment.stripe_payment_id}: ${creditResult.error}`)
          failed++
          continue
        }

        // Create subscription entry (with idempotency check)
        const existingSubscription = await sql`
          SELECT id FROM subscriptions
          WHERE user_id = ${userId}
            AND product_type = 'paid_blueprint'
            AND status = 'active'
          LIMIT 1
        `

        if (existingSubscription.length === 0) {
          try {
            await sql`
              INSERT INTO subscriptions (
                user_id,
                product_type,
                plan,
                status,
                created_at,
                updated_at
              )
              VALUES (
                ${userId},
                'paid_blueprint',
                'paid_blueprint',
                'active',
                NOW(),
                NOW()
              )
            `
          } catch (insertError: any) {
            if (insertError.code !== '23505') {
              throw insertError
            }
            // Subscription already exists (race condition) - OK
          }
        }

        // Update blueprint_subscribers (if exists)
        await sql`
          UPDATE blueprint_subscribers
          SET 
            paid_blueprint_purchased = TRUE,
            user_id = ${userId},
            updated_at = NOW()
          WHERE email = ${customerEmail}
        `

        // Update payment status
        await sql`
          UPDATE stripe_payments
          SET 
            user_id = ${userId},
            status = 'succeeded',
            metadata = jsonb_set(
              COALESCE(metadata, '{}'::jsonb),
              '{resolved_at}',
              to_jsonb(NOW()::text)
            ),
            updated_at = NOW()
          WHERE id = ${payment.id}
        `

        console.log(`[v0] [CRON] ✅ Resolved payment ${payment.stripe_payment_id} for user ${userId}`)
        resolved++

      } catch (error: any) {
        console.error(`[v0] [CRON] ❌ Error processing payment ${payment.stripe_payment_id}:`, error.message)
        failed++
      }
    }

    console.log(`[v0] [CRON] Completed: ${resolved} resolved, ${failed} failed, ${skipped} skipped`)

    const summary = {
      path: request.nextUrl.pathname,
      processed: pendingPayments.length,
      resolved,
      failed,
      skipped,
      status: "ok",
    }
    console.log(`[CRON_SUMMARY] ${JSON.stringify(summary)}`)

    return NextResponse.json({
      success: true,
      processed: pendingPayments.length,
      resolved,
      failed,
      skipped,
    })
  } catch (error: any) {
    console.error("[v0] [CRON] Error in resolve-pending-payments cron:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to resolve pending payments" },
      { status: 500 }
    )
  }
}
