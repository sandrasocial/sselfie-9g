// WEBHOOK-01 — Paid Blueprint (legacy Feed Planner product) checkout fulfillment,
// extracted VERBATIM from app/api/webhooks/stripe/route.ts (branch body lines 2892-3669 as of
// commit f346b38f; boundary derived by brace counting). LEGACY_ACCESS_ONLY; bounded
// replay/access safeguards live here. The protected Feed Planner app trees are untouched.

import { randomUUID } from "crypto"
import { stripe } from "@/lib/stripe"
import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"
import {
  generatePaidBlueprintDeliveryEmail,
  PAID_BLUEPRINT_DELIVERY_SUBJECT,
} from "@/lib/email/templates/paid-blueprint-delivery"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { grantPaidBlueprintCredits, shouldFulfillStripePurchaseCredits } from "@/lib/credits"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import type { CheckoutFulfillmentContext } from "../types"

/**
 * FIX 2: Expand user's feed from 1 post to 9 posts (free → paid upgrade).
 * Extracted verbatim from the duplicated inline try/catch blocks that previously ran
 * this logic twice per webhook (once inside the existing-blueprint_subscribers branch,
 * once unconditionally after the if/else). Same SQL queries, same log messages, same
 * try/catch/error-swallow behavior as before.
 */
async function expandFeedToNinePosts(userId: string | number): Promise<void> {
  try {
    console.log(`[v0] [FEED EXPANSION] Expanding feed for paid user ${userId}...`)

    // Get user's latest feed
    const userFeed = await sql`
      SELECT id, user_id
      FROM feed_layouts
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (userFeed && userFeed.length > 0) {
      const feedId = userFeed[0].id

      // Check current post count
      const existingPosts = await sql`
        SELECT position
        FROM feed_posts
        WHERE feed_layout_id = ${feedId}
        ORDER BY position ASC
      `

      const existingPositions = existingPosts.map((p: any) => p.position)
      console.log(`[v0] [FEED EXPANSION] Feed ${feedId} has posts at positions:`, existingPositions)

      // Create posts for missing positions 2-9
      const positionsToCreate = [2, 3, 4, 5, 6, 7, 8, 9].filter(
        pos => !existingPositions.includes(pos)
      )

      if (positionsToCreate.length > 0) {
        console.log(`[v0] [FEED EXPANSION] Creating posts for positions:`, positionsToCreate)

        for (const position of positionsToCreate) {
          await sql`
            INSERT INTO feed_posts (
              feed_layout_id,
              user_id,
              position,
              post_type,
              generation_status,
              generation_mode,
              created_at,
              updated_at
            ) VALUES (
              ${feedId},
              ${userId},
              ${position},
              'photo',
              'pending',
              'pro',
              NOW(),
              NOW()
            )
          `
        }

        console.log(
          `[v0] [FEED EXPANSION] ✅ Created ${positionsToCreate.length} new posts for paid user`
        )
      } else {
        console.log(`[v0] [FEED EXPANSION] Feed already has all 9 positions`)
      }
    } else {
      console.log(
        `[v0] [FEED EXPANSION] No feed found for user ${userId} (will be created on first access)`
      )
    }
  } catch (error) {
    console.error("[v0] [FEED EXPANSION] ❌ Error expanding feed:", error)
    throw error
  }
}

/**
 * Returns a Response when the original monolith branch early-returned from the webhook
 * (the dispatcher must forward it); void means fall through to the shared post-chain code.
 */
export async function handlePaidBlueprintCheckout(
  ctx: CheckoutFulfillmentContext
): Promise<{ response?: Response; referralPurchaseUserId: string | null }> {
  const { event, session, isPaymentPaid, source } = ctx
  const userId = ctx.userId as string
  const credits = ctx.credits as number
  const customerEmail = ctx.customerEmail as string
  // The monolith mutated this case-scoped let; the dispatcher assigns it back (shared
  // post-chain referral code reads it). Exact behavior preserved.
  let referralPurchaseUserId: string | null = ctx.referralPurchaseUserId ?? null
  // LEGACY_ACCESS_ONLY: historical Feed Planner buyers still use paid_blueprint fulfillment.
  // Log payment, tag contact, grant credits and subscription.
  // ⚠️ CRITICAL: Process if payment is confirmed OR if $0 payment (coupon code)
  if (!isPaymentPaid) {
    console.log(
      `[v0] ⚠️ Paid Blueprint checkout completed but payment not confirmed (status: '${session.payment_status}'). Skipping processing until payment succeeds.`
    )
    console.log(`[v0] ⚠️ DEBUG BREAKDOWN:`)
    console.log(`[v0]     payment_status === "paid": ${session.payment_status === "paid"}`)
    console.log(
      `[v0]     (no_payment_required && $0): ${session.payment_status === "no_payment_required" && session.amount_total === 0}`
    )
    console.log(`[v0]     Combined result (isPaymentPaid): ${isPaymentPaid}`)
    console.log(`[v0] ❌ BLOCKED: This is why access is not being granted!`)
    console.log(`[v0] ❌ User will NOT receive credits or subscription!`)
  } else {
    console.log(`[v0] 💎 Paid Blueprint purchase from ${customerEmail} - Payment confirmed`)
    console.log(`[v0] 💎 Processing paid blueprint purchase for email: ${customerEmail}`)

    const isTestMode = !event.livemode
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id

    if (!paymentIntentId) {
      console.error("[v0] ⚠️ No payment intent ID found for paid blueprint")
    }

    // Get actual payment amount from Stripe (for revenue tracking)
    let paymentAmountCents: number | null = null
    let customerId: string | null = null
    if (paymentIntentId) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
        paymentAmountCents = paymentIntent.amount
        customerId =
          typeof paymentIntent.customer === "string"
            ? paymentIntent.customer
            : paymentIntent.customer?.id || null
        console.log(`[v0] Retrieved payment amount: $${(paymentAmountCents / 100).toFixed(2)}`)
      } catch (piError: any) {
        console.error(`[v0] Error retrieving payment intent for amount:`, piError.message)
        // Fallback to session amount if available
        if (session.amount_total) {
          paymentAmountCents = session.amount_total
        }
        customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id || null
      }
    } else if (session.amount_total) {
      paymentAmountCents = session.amount_total
      customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id || null
    }

    // Store payment in stripe_payments table (comprehensive revenue tracking)
    // Fix: Handle $0 payments (discount codes) - allow processing even if paymentIntentId is null
    let userId: string | null = session.metadata?.user_id || null
    const isZeroAmountPayment = session.amount_total === 0 || paymentAmountCents === 0
    const paymentIdForStorage = paymentIntentId || session.id // Use session.id for $0 payments (no payment intent)
    const amountForStorage = paymentAmountCents || 0 // Use 0 for $0 payments
    let paymentRecorded = false

    const recordPurchaseAnalytics = async () => {
      if (!paymentRecorded) return
      try {
        await logAnalyticsEvent({
          eventName: "purchase",
          userId: userId ? String(userId) : null,
          properties: {
            source: "stripe_webhook",
            payment_type: "paid_blueprint",
            product_type: "paid_blueprint",
            value: amountForStorage / 100,
            currency: "usd",
            stripe_payment_id: paymentIdForStorage,
            stripe_session_id: session.id,
            offer_slug: session.metadata?.offer_slug || null,
            funnel_stage: session.metadata?.funnel_stage || null,
            attribution_source: session.metadata?.source || null,
            utm_source: session.metadata?.utm_source || null,
            utm_medium: session.metadata?.utm_medium || null,
            utm_campaign: session.metadata?.utm_campaign || null,
            campaign_id: session.metadata?.campaign_id || null,
            referral_code: session.metadata?.referral_code || null,
            is_test_mode: isTestMode,
          },
        })
      } catch {
        // Analytics must never fail the webhook.
      }
    }

    if (customerId && (paymentIntentId || isZeroAmountPayment)) {
      try {
        await sql`
            INSERT INTO stripe_payments (
              stripe_payment_id,
              stripe_customer_id,
              user_id,
              amount_cents,
              currency,
              status,
              payment_type,
              product_type,
              description,
              metadata,
              payment_date,
              is_test_mode,
              created_at,
              updated_at
            )
            VALUES (
              ${paymentIdForStorage},
              ${customerId},
              NULL,
              ${amountForStorage},
              'usd',
              'succeeded',
              'paid_blueprint',
              'paid_blueprint',
              ${"SSELFIE Brand Blueprint - 30 Custom Photos"},
              ${JSON.stringify({
                ...session.metadata,
                customer_email: customerEmail,
                session_id: session.id,
              })},
              NOW(),
              ${isTestMode},
              NOW(),
              NOW()
            )
            ON CONFLICT (stripe_payment_id) 
            DO UPDATE SET
              status = 'succeeded',
              updated_at = NOW()
          `
        console.log(
          `[v0] ✅ Stored paid blueprint payment in stripe_payments table (amount: $${(amountForStorage / 100).toFixed(2)}, payment_id: ${paymentIdForStorage})`
        )
        paymentRecorded = true
      } catch (paymentError: any) {
        console.error(`[v0] Error storing paid blueprint payment:`, paymentError.message)
        // Don't fail webhook if payment storage fails
      }
    }

    if (!shouldFulfillStripePurchaseCredits(event.livemode)) {
      await recordPurchaseAnalytics()
      console.log("[v0] ⏭️ Recorded test-mode paid blueprint without customer fulfillment")
      return { referralPurchaseUserId }
    }

    // Decision 1: Grant 60 credits for paid blueprint purchase (30 images × 2 credits per image)
    // Fix #2: Resolve user_id (priority: session metadata, then email lookup)

    if (userId) {
      console.log(`[v0] Using user_id from session.metadata (authenticated checkout): ${userId}`)
    } else if (customerEmail) {
      // Fallback: Try to find user by email (guest checkout)
      try {
        const userByEmail = await sql`
            SELECT id FROM users WHERE email = ${customerEmail} LIMIT 1
          `
        if (userByEmail.length > 0) {
          userId = userByEmail[0].id
          referralPurchaseUserId = userId
          console.log(`[v0] Resolved user_id from email: ${userId}`)
        }
      } catch (userLookupError: any) {
        console.error(`[v0] Error looking up user by email:`, userLookupError.message)
        // Continue to error handling below
      }
    }

    // Fix #2: If userId still not resolved, log error and exit (don't pretend success)
    if (!userId && isPaymentPaid) {
      console.error(`[v0] ❌ CRITICAL: Cannot resolve user_id for paid blueprint purchase`, {
        customerEmail,
        sessionId: session.id,
        paymentIntentId,
        metadata: session.metadata,
      })

      // Store payment as pending resolution (payment already stored above, update status)
      try {
        await sql`
            UPDATE stripe_payments
            SET 
              status = 'pending_resolution',
              metadata = jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{unresolved_at}',
                to_jsonb(NOW()::text)
              )
            WHERE stripe_payment_id = ${paymentIdForStorage}
          `
        console.log(`[v0] ⚠️ Payment ${paymentIdForStorage} stored as pending_resolution`)
      } catch (updateError: any) {
        console.error(
          `[v0] Error updating payment status to pending_resolution:`,
          updateError.message
        )
      }

      throw new Error(`Paid blueprint user_id unresolved for ${session.id}`)
    }

    // Live paid-blueprint purchases are observed only after authenticated or
    // email-fallback identity resolution. This preserves the Neon ledger and
    // lets the provider join supported guest checkout revenue safely.
    await recordPurchaseAnalytics()

    // Fix #3: Grant credits if user_id found AND payment confirmed (with idempotency check)
    if (userId && isPaymentPaid) {
      referralPurchaseUserId = userId
      try {
        const paymentIdForCredits = paymentIntentId || session.id

        const creditResult = await grantPaidBlueprintCredits(
          userId,
          paymentIdForCredits,
          isTestMode,
          {
            source: "stripe_webhook:paid_blueprint",
          }
        )
        if (!creditResult.success) {
          throw new Error(
            creditResult.error ||
              `Failed to grant paid blueprint credits for ${paymentIdForCredits}`
          )
        }
        if (creditResult.granted) {
          console.log(
            `[v0] ✅ Granted 60 credits for paid blueprint purchase to user ${userId} (30 images × 2 credits per image)`
          )
        } else {
          console.log(`[v0] ⏭️ Paid blueprint credits already granted for ${paymentIdForCredits}`)
        }
      } catch (creditError: any) {
        console.error(`[v0] ❌ Error granting paid blueprint credits:`, creditError.message)
        throw creditError
      }
    } else if (!userId) {
      // userId not resolved - already handled above
    } else {
      console.log(`[v0] ⏭️ Skipping credit grant - payment not confirmed yet`)
    }

    // Create subscription entry for paid blueprint (for entitlement tracking)
    if (userId && isPaymentPaid) {
      try {
        // Check if subscription already exists
        const existingSubscription = await sql`
            SELECT id FROM subscriptions
            WHERE user_id = ${userId}
            AND product_type = 'paid_blueprint'
            AND status = 'active'
            LIMIT 1
          `

        if (existingSubscription.length === 0) {
          // Create subscription entry for paid blueprint
          try {
            await sql`
                INSERT INTO subscriptions (
                  user_id,
                  product_type,
                  plan,
                  status,
                  stripe_customer_id,
                  created_at,
                  updated_at
                )
                VALUES (
                  ${userId},
                  'paid_blueprint',
                  'paid_blueprint',
                  'active',
                  ${customerId || null},
                  NOW(),
                  NOW()
                )
              `
            console.log(`[v0] ✅ Created paid_blueprint subscription entry for user ${userId}`)
          } catch (insertError: any) {
            // Log the full error for debugging
            console.error(`[v0] ⚠️ Error inserting subscription for user ${userId}:`, {
              code: insertError.code,
              message: insertError.message,
              detail: insertError.detail,
              constraint: insertError.constraint,
            })
            // If subscription already exists (race condition), that's OK
            if (
              insertError.code === "23505" ||
              insertError.message?.includes("unique constraint")
            ) {
              console.log(
                `[v0] ⏭️ Subscription already exists for user ${userId} (race condition) - skipping`
              )
            } else {
              throw insertError // Re-throw other errors to be caught by outer catch
            }
          }
        } else {
          console.log(
            `[v0] ⏭️ Subscription already exists for user ${userId} - skipping (idempotency)`
          )
        }
      } catch (subscriptionError: any) {
        console.error(`[v0] ❌ Error creating paid blueprint access:`, subscriptionError.message)
        throw subscriptionError
      }
    }

    // Decision 2: Update blueprint_subscribers with paid_blueprint columns
    // Prioritize linking to user_id if authenticated, otherwise use email (guest checkout)
    // ⚠️ CRITICAL: Link to user_id if authenticated (consistent with other flows)
    try {
      if (userId) {
        // Authenticated user: Link to user_id (consistent with other payment flows)
        console.log(`[v0] 🔍 Linking paid blueprint purchase to authenticated user: ${userId}`)

        const blueprintCheck = await sql`
            SELECT id, paid_blueprint_purchased, user_id
          FROM blueprint_subscribers 
            WHERE user_id = ${userId}
          LIMIT 1
        `

        if (blueprintCheck.length > 0) {
          // Existing blueprint_subscribers record - update with paid purchase
          const stableAccessToken = randomUUID()
          await sql`
              UPDATE blueprint_subscribers
              SET 
                paid_blueprint_purchased = TRUE,
                paid_blueprint_purchased_at = NOW(),
                paid_blueprint_stripe_payment_id = ${paymentIntentId || null},
                access_token = COALESCE(access_token, ${stableAccessToken}),
                converted_to_user = TRUE,
                converted_at = NOW(),
                updated_at = NOW()
              WHERE user_id = ${userId}
            `
          console.log(
            `[v0] ✅ Updated blueprint_subscribers with paid blueprint purchase for user ${userId}`
          )
        } else {
          // No blueprint_subscribers record - create one linked to user_id
          const customerName = getFirstNameForEmail({
            fullName: session.customer_details?.name,
            email: customerEmail || undefined,
            fallback: "User",
          })
          await sql`
              INSERT INTO blueprint_subscribers (
                user_id,
                email,
                name,
                access_token,
                paid_blueprint_purchased,
                paid_blueprint_purchased_at,
                paid_blueprint_stripe_payment_id,
                converted_to_user,
                converted_at,
                created_at,
                updated_at
              )
              VALUES (
                ${userId},
                ${customerEmail || null},
                ${customerName},
                ${randomUUID()},
                TRUE,
                NOW(),
                ${paymentIntentId || null},
                TRUE,
                NOW(),
                NOW(),
                NOW()
              )
            `
          console.log(`[v0] ✅ Created blueprint_subscribers record linked to user ${userId}`)
        }

        // FIX 2: Expand user's feed from 1 post to 9 posts (free → paid upgrade)
        await expandFeedToNinePosts(userId)
      } else if (customerEmail) {
        // Guest checkout: Use email-based lookup (for later migration)
        console.log(
          `[v0] 🔍 Guest checkout - checking for existing blueprint_subscriber with email: ${customerEmail}`
        )

        const blueprintCheck = await sql`
            SELECT id, access_token, email, paid_blueprint_purchased, user_id
            FROM blueprint_subscribers 
            WHERE LOWER(email) = LOWER(${customerEmail})
            LIMIT 1
          `

        if (blueprintCheck.length > 0) {
          // Existing subscriber - update with paid purchase
          const accessToken = blueprintCheck[0].access_token || randomUUID()
          await sql`
            UPDATE blueprint_subscribers
            SET 
              paid_blueprint_purchased = TRUE,
              paid_blueprint_purchased_at = NOW(),
                paid_blueprint_stripe_payment_id = ${paymentIntentId || null},
              converted_to_user = TRUE,
              converted_at = NOW(),
              access_token = ${accessToken},
              updated_at = NOW()
            WHERE LOWER(email) = LOWER(${customerEmail})
          `
          console.log(
            `[v0] ✅ Updated blueprint_subscribers with paid blueprint purchase for ${customerEmail} (guest checkout)`
          )
        } else {
          // New subscriber - create record (will be linked to user_id when user signs up)
          const accessToken = randomUUID()
          const customerName = getFirstNameForEmail({
            fullName: session.customer_details?.name,
            email: customerEmail,
          })
          await sql`
            INSERT INTO blueprint_subscribers (
              email,
              name,
              access_token,
              paid_blueprint_purchased,
              paid_blueprint_purchased_at,
              paid_blueprint_stripe_payment_id,
              converted_to_user,
              converted_at,
              created_at,
              updated_at
            )
            VALUES (
              ${customerEmail},
              ${customerName},
              ${accessToken},
              TRUE,
              NOW(),
              ${paymentIntentId || null},
              TRUE,
              NOW(),
              NOW(),
              NOW()
            )
          `
          console.log(
            `[v0] ✅ Created blueprint_subscribers record for guest checkout: ${customerEmail} (will be linked to user_id on signup)`
          )
        }
      }

      // PR-3: Send paid blueprint delivery email
      try {
        // Check if email already sent (dedupe)
        const existingEmail = await sql`
            SELECT id FROM email_logs
            WHERE LOWER(user_email) = LOWER(${customerEmail})
            AND email_type = 'paid-blueprint-delivery'
            AND status IN ('sent', 'delivered')
            LIMIT 1
          `

        if (existingEmail.length > 0) {
          console.log(`[v0] Skipping duplicate paid-blueprint-delivery email for ${customerEmail}`)
        } else {
          // Fetch subscriber data for email (use the accessToken we just set)
          console.log(`[v0] 🔍 Fetching subscriber data for email delivery: ${customerEmail}`)
          const subscriber = await sql`
              SELECT 
                name,
                access_token,
                paid_blueprint_photo_urls
              FROM blueprint_subscribers
              WHERE LOWER(email) = LOWER(${customerEmail})
              LIMIT 1
            `

          console.log(`[v0] 🔍 Subscriber data for email:`, {
            found: subscriber.length > 0,
            hasAccessToken: subscriber.length > 0 && !!subscriber[0].access_token,
            accessTokenValue:
              subscriber.length > 0
                ? subscriber[0].access_token
                  ? "SET"
                  : "MISSING"
                : "NOT_FOUND",
          })

          if (subscriber.length > 0 && subscriber[0].access_token) {
            const subscriberData = subscriber[0]
            const firstName = subscriberData.name?.split(" ")[0] || undefined
            const finalAccessToken = subscriberData.access_token

            // Extract photo preview URLs if available (up to 4)
            let photoPreviewUrls: string[] | undefined = undefined
            if (
              subscriberData.paid_blueprint_photo_urls &&
              Array.isArray(subscriberData.paid_blueprint_photo_urls)
            ) {
              const validUrls = subscriberData.paid_blueprint_photo_urls
                .filter((url: any) => typeof url === "string" && url.startsWith("http"))
                .slice(0, 4)
              if (validUrls.length > 0) {
                photoPreviewUrls = validUrls
              }
            }

            // Generate email
            const emailContent = generatePaidBlueprintDeliveryEmail({
              firstName,
              email: customerEmail,
              accessToken: finalAccessToken,
              photoPreviewUrls,
            })

            // Send email
            const emailResult = await sendEmail({
              to: customerEmail,
              subject: PAID_BLUEPRINT_DELIVERY_SUBJECT,
              html: emailContent.html,
              text: emailContent.text,
              emailType: "paid-blueprint-delivery",
              tags: ["paid-blueprint", "delivery"],
              idempotencyKey: `paid-blueprint-delivery:${session.id}`,
            })

            if (emailResult.success) {
              console.log(`[v0] ✅ Sent paid blueprint delivery email to ${customerEmail}`)
            } else {
              console.error(
                `[v0] ❌ Failed to send paid blueprint delivery email: ${emailResult.error}`
              )
              throw new Error(
                emailResult.error || `Failed paid blueprint delivery for ${session.id}`
              )
            }
          } else {
            throw new Error(`Paid blueprint subscriber access is incomplete for ${customerEmail}`)
          }
        }
      } catch (emailError: any) {
        console.error(`[v0] ❌ Error sending paid blueprint delivery email:`, emailError.message)
        throw emailError
      }
    } catch (blueprintError: any) {
      console.error(`[v0] ❌ ERROR updating blueprint_subscribers with paid purchase:`)
      console.error(`[v0] Error message:`, blueprintError.message)
      console.error(`[v0] Error stack:`, blueprintError.stack)
      console.error(
        `[v0] Full error:`,
        JSON.stringify(blueprintError, Object.getOwnPropertyNames(blueprintError))
      )
      throw blueprintError
    }
  }
  return { referralPurchaseUserId }
}
