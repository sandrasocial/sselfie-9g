/**
 * Engagement Tagging Script
 * 
 * Adds engagement-level tags to Loops contacts for better audience targeting:
 * - "engaged" + "active" - Users active in last 14 days
 * - "cold" + "inactive" - Users inactive for 30-90 days
 * - "vip" + "engaged-customer" - Paying customers who are actively engaged
 * 
 * Usage:
 *   npm run tag-engagement
 *   or
 *   npx tsx scripts/add-engagement-tags.ts
 */

import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'
import { addLoopsContactTags } from '@/lib/loops/manage-contact'

// Load environment variables
config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

async function addEngagementTags() {
  console.log('🏷️  Adding engagement tags to Loops contacts...\n')
  
  if (!process.env.LOOPS_API_KEY) {
    console.error('❌ LOOPS_API_KEY not found in environment')
    console.error('💡 Add LOOPS_API_KEY to your .env.local file')
    process.exit(1)
  }

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment')
    process.exit(1)
  }

  let totalTagged = 0
  let totalFailed = 0

  // Tag engaged users (active in last 14 days)
  console.log('📊 Finding engaged users (active in last 14 days)...')
  const engagedUsers = await sql`
    SELECT DISTINCT email, name
    FROM (
      SELECT email, name, updated_at 
      FROM freebie_subscribers
      WHERE updated_at >= NOW() - INTERVAL '14 days'
        AND email IS NOT NULL
        AND email != ''
      UNION
      SELECT email, name, updated_at 
      FROM blueprint_subscribers
      WHERE updated_at >= NOW() - INTERVAL '14 days'
        AND email IS NOT NULL
        AND email != ''
    ) AS active_users
    ORDER BY email
  `

  console.log(`   Found ${engagedUsers.length} engaged users\n`)

  for (const user of engagedUsers) {
    try {
      await addLoopsContactTags(user.email, ['engaged', 'active'])
      console.log(`   ✅ Tagged ${user.email} as engaged`)
      totalTagged++
      await new Promise(resolve => setTimeout(resolve, 150))
    } catch (error: any) {
      console.error(`   ❌ Failed to tag ${user.email}:`, error.message || error)
      totalFailed++
    }
  }

  // Tag cold users (inactive for 30+ days, but not older than 90 days)
  console.log(`\n📊 Finding cold users (inactive for 30-90 days)...`)
  const coldUsers = await sql`
    SELECT DISTINCT email, name
    FROM (
      SELECT email, name, updated_at 
      FROM freebie_subscribers
      WHERE updated_at < NOW() - INTERVAL '30 days'
        AND updated_at >= NOW() - INTERVAL '90 days'
        AND email IS NOT NULL
        AND email != ''
      UNION
      SELECT email, name, updated_at 
      FROM blueprint_subscribers
      WHERE updated_at < NOW() - INTERVAL '30 days'
        AND updated_at >= NOW() - INTERVAL '90 days'
        AND email IS NOT NULL
        AND email != ''
    ) AS cold_users
    ORDER BY email
  `

  console.log(`   Found ${coldUsers.length} cold users\n`)

  for (const user of coldUsers) {
    try {
      await addLoopsContactTags(user.email, ['cold', 'inactive'])
      console.log(`   ✅ Tagged ${user.email} as cold`)
      totalTagged++
      await new Promise(resolve => setTimeout(resolve, 150))
    } catch (error: any) {
      console.error(`   ❌ Failed to tag ${user.email}:`, error.message || error)
      totalFailed++
    }
  }

  // Tag VIP customers (purchased and engaged in last 14 days)
  console.log(`\n📊 Finding VIP customers (purchased + engaged in last 14 days)...`)
  const vipCustomers = await sql`
    SELECT DISTINCT u.email, u.display_name as name
    FROM users u
    INNER JOIN subscriptions s ON u.id = s.user_id::varchar
    WHERE s.is_test_mode = FALSE
      AND u.updated_at >= NOW() - INTERVAL '14 days'
      AND u.email IS NOT NULL
      AND u.email != ''
    ORDER BY u.email
  `

  console.log(`   Found ${vipCustomers.length} VIP customers\n`)

  for (const user of vipCustomers) {
    try {
      await addLoopsContactTags(user.email, ['vip', 'engaged-customer'])
      console.log(`   ✅ Tagged ${user.email} as VIP`)
      totalTagged++
      await new Promise(resolve => setTimeout(resolve, 150))
    } catch (error: any) {
      console.error(`   ❌ Failed to tag ${user.email}:`, error.message || error)
      totalFailed++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Engagement tagging complete!')
  console.log(`   Total tagged: ${totalTagged}`)
  if (totalFailed > 0) {
    console.log(`   Failed: ${totalFailed}`)
  }
  console.log('='.repeat(60))
}

addEngagementTags()
  .then(() => {
    console.log('\n✨ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })

