#!/usr/bin/env tsx
/**
 * Grant Academy access to Shopify migration customer
 * Run from app root: pnpm tsx scripts/grant-shopify-customer-access.ts
 */

import { sql } from '@/lib/db/client'
import { createAdminClient } from '@/lib/supabase/admin'
import { getNeonUserByEmail, getOrCreateNeonUser } from '@/lib/user-mapping'

const CUSTOMER_EMAIL = 'kywhitt@yahoo.com'
const COURSE_ID = 'branded_by_sselfie'
const REASON = 'Shopify migration - customer purchased on old platform, manually granting access (2026-03-07)'

async function main() {
  console.log(`[grant-access] Starting grant for ${CUSTOMER_EMAIL} -> ${COURSE_ID}`)

  let userId = ''
  let firstName = CUSTOMER_EMAIL.split('@')[0]

  // 1. Check if Neon user exists
  const existingNeonUser = await getNeonUserByEmail(CUSTOMER_EMAIL)

  if (existingNeonUser) {
    userId = existingNeonUser.id
    firstName = existingNeonUser.first_name || existingNeonUser.display_name || firstName
    console.log(`[grant-access] Found existing Neon user: ${userId}`)
  } else {
    // 2. Check if Supabase user exists
    const supabaseAdmin = createAdminClient()
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()

    if (listError) {
      throw new Error(`Failed to list Supabase users: ${listError.message}`)
    }

    const existingUser = existingUsers?.users?.find((user) => user.email?.toLowerCase() === CUSTOMER_EMAIL)

    if (existingUser) {
      const neonUser = await getOrCreateNeonUser(existingUser.id, CUSTOMER_EMAIL, null)
      userId = neonUser.id
      firstName = neonUser.first_name || neonUser.display_name || firstName
      console.log(`[grant-access] Found existing Supabase user, created Neon mapping: ${userId}`)
    } else {
      // 3. Create new Supabase + Neon user
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: CUSTOMER_EMAIL,
        email_confirm: true,
        user_metadata: {
          created_via: 'shopify_migration_manual_grant',
        },
      })

      if (createError || !createData.user) {
        throw new Error(`Failed to create Supabase user: ${createError?.message}`)
      }

      const neonUser = await getOrCreateNeonUser(createData.user.id, CUSTOMER_EMAIL, null)
      userId = neonUser.id

      // Mark password setup incomplete
      await sql`
        UPDATE users
        SET password_setup_complete = FALSE
        WHERE id = ${userId}
      `

      console.log(`[grant-access] Created new user: ${userId}`)
    }
  }

  // 4. Grant course access in academy_course_purchases
  const existingPurchase = await sql`
    SELECT id FROM academy_course_purchases
    WHERE user_id = ${userId}
      AND course_id = ${COURSE_ID}
    LIMIT 1
  `

  if (existingPurchase.length > 0) {
    await sql`
      UPDATE academy_course_purchases
      SET status = 'active',
          purchased_at = NOW()
      WHERE id = ${existingPurchase[0].id}
    `
    console.log(`[grant-access] Updated existing purchase record`)
  } else {
    await sql`
      INSERT INTO academy_course_purchases (user_id, course_id, stripe_payment_intent_id, amount_paid, currency, status, purchased_at)
      VALUES (${userId}, ${COURSE_ID}, 'shopify_migration_manual', 39700, 'eur', 'active', NOW())
    `
    console.log(`[grant-access] Created new purchase record`)
  }

  // 5. Verify access
  const verification = await sql`
    SELECT * FROM academy_course_purchases
    WHERE user_id = ${userId}
      AND course_id = ${COURSE_ID}
      AND status = 'active'
  `

  if (verification.length === 0) {
    throw new Error('Verification failed: no active purchase record found')
  }

  console.log(`[grant-access] ✅ Access granted and verified for ${CUSTOMER_EMAIL}`)
  console.log(`[grant-access] User ID: ${userId}`)
  console.log(`[grant-access] Course: ${COURSE_ID}`)
  console.log(`[grant-access] Purchase record:`, verification[0])

  return { userId, courseId: COURSE_ID, success: true }
}

main()
  .then((result) => {
    console.log(`[grant-access] Done:`, result)
    process.exit(0)
  })
  .catch((error) => {
    console.error(`[grant-access] Fatal error:`, error)
    process.exit(1)
  })
