/**
 * Backfill Script: Sync Existing Contacts to Loops
 * 
 * Syncs all existing freebie_subscribers and blueprint_subscribers
 * that haven't been synced to Loops yet.
 * 
 * Usage:
 *   npx tsx scripts/sync-existing-to-loops.ts
 */

import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'
import { syncContactToLoops } from '@/lib/loops/manage-contact'

// Load environment variables
config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

async function syncExistingContactsToLoops() {
  console.log('🔄 Starting backfill of existing contacts to Loops...\n')
  
  if (!process.env.LOOPS_API_KEY) {
    console.error('❌ LOOPS_API_KEY not found in environment')
    console.error('💡 Add LOOPS_API_KEY to your .env.local file')
    process.exit(1)
  }
  
  const results = {
    freebie: { total: 0, synced: 0, failed: 0, skipped: 0 },
    blueprint: { total: 0, synced: 0, failed: 0, skipped: 0 },
    errors: [] as string[]
  }
  
  // Sync freebie subscribers
  console.log('📊 Syncing freebie_subscribers...')
  
  const freebieContacts = await sql`
    SELECT id, email, name, source, email_tags
    FROM freebie_subscribers
    WHERE synced_to_loops = false
    OR synced_to_loops IS NULL
    ORDER BY created_at DESC
  `
  
  results.freebie.total = freebieContacts.length
  console.log(`Found ${freebieContacts.length} freebie contacts to sync`)
  
  for (const contact of freebieContacts) {
    try {
      const loopsResult = await syncContactToLoops({
        email: contact.email,
        name: contact.name,
        source: contact.source || 'freebie-subscriber',
        tags: contact.email_tags || ['freebie-subscriber'],
        customFields: {
          status: 'lead',
          journey: 'nurture'
        }
      })
      
      if (loopsResult.success) {
        await sql`
          UPDATE freebie_subscribers
          SET loops_contact_id = ${loopsResult.contactId || contact.email},
              synced_to_loops = true,
              loops_synced_at = NOW()
          WHERE id = ${contact.id}
        `
        
        results.freebie.synced++
        
        if (results.freebie.synced % 50 === 0) {
          console.log(`  ✅ Synced ${results.freebie.synced}/${results.freebie.total}...`)
        }
      } else {
        // Check if error is "already exists" - treat as success
        if (loopsResult.error?.includes('already in your audience') || loopsResult.error?.includes('409')) {
          // Contact already exists in Loops - mark as synced
          await sql`
            UPDATE freebie_subscribers
            SET loops_contact_id = ${contact.email},
                synced_to_loops = true,
                loops_synced_at = NOW()
            WHERE id = ${contact.id}
          `
          results.freebie.synced++
          if (results.freebie.synced % 50 === 0) {
            console.log(`  ✅ Synced ${results.freebie.synced}/${results.freebie.total}...`)
          }
        } else {
          results.freebie.failed++
          results.errors.push(`Freebie ${contact.email}: ${loopsResult.error}`)
        }
      }
      
      // Rate limiting - don't overwhelm Loops API
      await new Promise(resolve => setTimeout(resolve, 150))
      
    } catch (error: any) {
      results.freebie.failed++
      results.errors.push(`Freebie ${contact.email}: ${error.message}`)
    }
  }
  
  console.log(`\n✅ Freebie subscribers: ${results.freebie.synced} synced, ${results.freebie.failed} failed\n`)
  
  // Sync blueprint subscribers
  console.log('📊 Syncing blueprint_subscribers...')
  
  const blueprintContacts = await sql`
    SELECT id, email, name, source, form_data
    FROM blueprint_subscribers
    WHERE synced_to_loops = false
    OR synced_to_loops IS NULL
    ORDER BY created_at DESC
  `
  
  results.blueprint.total = blueprintContacts.length
  console.log(`Found ${blueprintContacts.length} blueprint contacts to sync`)
  
  for (const contact of blueprintContacts) {
    try {
      const formData = contact.form_data ? (typeof contact.form_data === 'string' ? JSON.parse(contact.form_data) : contact.form_data) : {}
      
      const loopsResult = await syncContactToLoops({
        email: contact.email,
        name: contact.name,
        source: 'blueprint-subscriber',
        tags: ['brand-blueprint', 'lead'],
        customFields: {
          status: 'lead',
          journey: 'nurture',
          business: formData.business,
          dreamClient: formData.dreamClient
        }
      })
      
      if (loopsResult.success) {
        await sql`
          UPDATE blueprint_subscribers
          SET loops_contact_id = ${loopsResult.contactId || contact.email},
              synced_to_loops = true,
              loops_synced_at = NOW()
          WHERE id = ${contact.id}
        `
        
        results.blueprint.synced++
        
        if (results.blueprint.synced % 50 === 0) {
          console.log(`  ✅ Synced ${results.blueprint.synced}/${results.blueprint.total}...`)
        }
      } else {
        // Check if error is "already exists" - treat as success
        if (loopsResult.error?.includes('already in your audience') || loopsResult.error?.includes('409')) {
          // Contact already exists in Loops - mark as synced
          await sql`
            UPDATE blueprint_subscribers
            SET loops_contact_id = ${contact.email},
                synced_to_loops = true,
                loops_synced_at = NOW()
            WHERE id = ${contact.id}
          `
          results.blueprint.synced++
          if (results.blueprint.synced % 50 === 0) {
            console.log(`  ✅ Synced ${results.blueprint.synced}/${results.blueprint.total}...`)
          }
        } else {
          results.blueprint.failed++
          results.errors.push(`Blueprint ${contact.email}: ${loopsResult.error}`)
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 150))
      
    } catch (error: any) {
      results.blueprint.failed++
      results.errors.push(`Blueprint ${contact.email}: ${error.message}`)
    }
  }
  
  console.log(`\n✅ Blueprint subscribers: ${results.blueprint.synced} synced, ${results.blueprint.failed} failed\n`)
  
  // Summary
  console.log('='.repeat(60))
  console.log('📊 MIGRATION SUMMARY')
  console.log('='.repeat(60))
  console.log(`Freebie Subscribers:`)
  console.log(`  Total: ${results.freebie.total}`)
  console.log(`  Synced: ${results.freebie.synced}`)
  console.log(`  Failed: ${results.freebie.failed}`)
  console.log(`\nBlueprint Subscribers:`)
  console.log(`  Total: ${results.blueprint.total}`)
  console.log(`  Synced: ${results.blueprint.synced}`)
  console.log(`  Failed: ${results.blueprint.failed}`)
  console.log(`\nGrand Total: ${results.freebie.synced + results.blueprint.synced} contacts synced to Loops`)
  
  if (results.errors.length > 0) {
    console.log(`\n⚠️ Errors (showing first 20):`)
    results.errors.slice(0, 20).forEach(err => console.log(`  ${err}`))
    if (results.errors.length > 20) {
      console.log(`  ... and ${results.errors.length - 20} more errors`)
    }
  }
  
  console.log('\n✅ Migration complete!')
}

syncExistingContactsToLoops().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})

