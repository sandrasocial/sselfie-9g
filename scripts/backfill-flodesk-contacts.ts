/**
 * Backfill Existing Contacts to Flodesk
 * 
 * This script syncs all existing users and subscribers to Flodesk.
 * It processes users from the users table who haven't been synced yet.
 * 
 * Usage: npm run backfill-flodesk
 */

import * as dotenv from 'dotenv'
import { neon } from '@neondatabase/serverless'
import { syncContactToFlodesk } from '../lib/flodesk'

// Load environment variables
dotenv.config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

async function backfillFlodeskContacts() {
  console.log('🔄 Backfilling contacts to Flodesk...\n')
  
  try {
    // Get all users not yet synced to Flodesk
    const users = await sql`
      SELECT 
        id,
        email,
        name,
        plan,
        created_at
      FROM users
      WHERE email IS NOT NULL
        AND (synced_to_flodesk = FALSE OR synced_to_flodesk IS NULL)
      ORDER BY created_at DESC
    `
    
    console.log(`Found ${users.length} users to sync\n`)
    
    if (users.length === 0) {
      console.log('✅ No users to sync - all contacts already synced to Flodesk!')
      return
    }
    
    let synced = 0
    let failed = 0
    
    for (const user of users) {
      try {
        // Determine tags based on user status
        const tags: string[] = ['app-user']
        
        if (user.plan && user.plan !== 'free' && user.plan !== null) {
          tags.push('customer', 'paid')
        }
        
        // Get user name or use email prefix as fallback
        const userName = user.name || user.email?.split('@')[0] || 'User'
        
        // Sync to Flodesk
        const result = await syncContactToFlodesk({
          email: user.email,
          name: userName,
          source: 'backfill',
          tags,
          customFields: {
            signup_date: user.created_at ? new Date(user.created_at).toISOString().split('T')[0] : undefined,
            plan: user.plan || 'free',
            source: 'backfill',
            user_id: user.id
          }
        })
        
        if (result.success) {
          synced++
          console.log(`✅ [${synced}/${users.length}] Synced: ${user.email}`)
        } else {
          failed++
          console.error(`❌ Failed: ${user.email} - ${result.error}`)
        }
        
        // Rate limiting - Flodesk API rate limits are unclear, be conservative
        // Wait 200ms between requests to avoid hitting rate limits
        await new Promise(resolve => setTimeout(resolve, 200))
        
      } catch (error: any) {
        failed++
        console.error(`❌ Error syncing ${user.email}:`, error.message || error)
      }
    }
    
    console.log('\n' + '='.repeat(60))
    console.log(`✅ Backfill complete:`)
    console.log(`   Synced: ${synced}`)
    console.log(`   Failed: ${failed}`)
    console.log(`   Total: ${users.length}`)
    console.log('='.repeat(60) + '\n')
    
  } catch (error: any) {
    console.error('\n❌ Backfill failed:', error.message || error)
    console.error('Error details:', error)
    process.exit(1)
  }
}

backfillFlodeskContacts().catch(console.error)

