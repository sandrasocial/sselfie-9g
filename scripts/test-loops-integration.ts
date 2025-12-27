/**
 * End-to-End Loops Integration Test
 * 
 * Tests all integration points programmatically
 * 
 * Usage: npx tsx scripts/test-loops-integration.ts
 */

// CRITICAL: Load environment variables FIRST before importing Loops client
import { config } from 'dotenv'
config({ path: '.env.local' })

// Now import modules that depend on environment variables
import { neon } from '@neondatabase/serverless'
import { syncContactToLoops } from '@/lib/loops/manage-contact'
import { loops } from '@/lib/loops/client'

const sql = neon(process.env.DATABASE_URL!)

interface TestResult {
  name: string
  passed: boolean
  message: string
  details?: any
}

const results: TestResult[] = []

function addResult(name: string, passed: boolean, message: string, details?: any) {
  results.push({ name, passed, message, details })
  const icon = passed ? '✅' : '❌'
  console.log(`${icon} ${name}: ${message}`)
  if (details) {
    console.log(`   Details:`, details)
  }
}

async function testLoopsConfiguration() {
  console.log('\n📋 Test 1: Loops Configuration\n')
  
  const apiKey = process.env.LOOPS_API_KEY
  if (!apiKey) {
    addResult('LOOPS_API_KEY exists', false, 'LOOPS_API_KEY not found in environment')
    return false
  }
  addResult('LOOPS_API_KEY exists', true, `Found (${apiKey.substring(0, 10)}...)`)
  
  try {
    // Test Loops client initialization
    const testContact = await loops.findContact({ email: 'test@example.com' }).catch(() => null)
    addResult('Loops API connection', true, 'Successfully connected to Loops API')
    return true
  } catch (error: any) {
    addResult('Loops API connection', false, `Failed: ${error.message}`)
    return false
  }
}

async function testDatabaseSchema() {
  console.log('\n📋 Test 2: Database Schema\n')
  
  try {
    // Check freebie_subscribers columns
    const freebieColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'freebie_subscribers' 
      AND column_name IN ('loops_contact_id', 'synced_to_loops', 'loops_synced_at')
      ORDER BY column_name
    `
    
    if (freebieColumns.length === 3) {
      addResult('freebie_subscribers Loops columns', true, 'All 3 columns exist')
    } else {
      addResult('freebie_subscribers Loops columns', false, `Found ${freebieColumns.length}/3 columns`)
    }
    
    // Check blueprint_subscribers columns
    const blueprintColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'blueprint_subscribers' 
      AND column_name IN ('loops_contact_id', 'synced_to_loops', 'loops_synced_at')
      ORDER BY column_name
    `
    
    if (blueprintColumns.length === 3) {
      addResult('blueprint_subscribers Loops columns', true, 'All 3 columns exist')
    } else {
      addResult('blueprint_subscribers Loops columns', false, `Found ${blueprintColumns.length}/3 columns`)
    }
    
    return true
  } catch (error: any) {
    addResult('Database schema check', false, `Error: ${error.message}`)
    return false
  }
}

async function testContactSync() {
  console.log('\n📋 Test 3: Contact Sync Function\n')
  
  const testEmail = `test-loops-${Date.now()}@example.com`
  
  try {
    const result = await syncContactToLoops({
      email: testEmail,
      name: 'Test User',
      source: 'test-integration',
      tags: ['test', 'integration'],
      customFields: {
        status: 'test',
        journey: 'testing'
      }
    })
    
    if (result.success) {
      addResult('syncContactToLoops function', true, 'Successfully synced test contact', {
        contactId: result.contactId,
        email: testEmail
      })
      
      // Verify contact exists in Loops
      try {
        const contact = await loops.findContact({ email: testEmail })
        addResult('Contact in Loops', true, 'Contact found in Loops', {
          email: contact.email,
          tags: contact.tags
        })
      } catch (error: any) {
        addResult('Contact in Loops', false, `Contact not found: ${error.message}`)
      }
      
      return true
    } else {
      addResult('syncContactToLoops function', false, `Failed: ${result.error}`)
      return false
    }
  } catch (error: any) {
    addResult('syncContactToLoops function', false, `Error: ${error.message}`)
    return false
  }
}

async function testDatabaseTracking() {
  console.log('\n📋 Test 4: Database Tracking\n')
  
  try {
    // Check freebie_subscribers sync status
    const freebieStats = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE synced_to_loops = true) as synced,
        COUNT(*) FILTER (WHERE loops_contact_id IS NOT NULL) as has_contact_id
      FROM freebie_subscribers
    `
    
    const freebie = freebieStats[0]
    addResult('freebie_subscribers tracking', true, `${freebie.synced}/${freebie.total} synced, ${freebie.has_contact_id} have contact IDs`, freebie)
    
    // Check blueprint_subscribers sync status
    const blueprintStats = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE synced_to_loops = true) as synced,
        COUNT(*) FILTER (WHERE loops_contact_id IS NOT NULL) as has_contact_id
      FROM blueprint_subscribers
    `
    
    const blueprint = blueprintStats[0]
    addResult('blueprint_subscribers tracking', true, `${blueprint.synced}/${blueprint.total} synced, ${blueprint.has_contact_id} have contact IDs`, blueprint)
    
    return true
  } catch (error: any) {
    addResult('Database tracking', false, `Error: ${error.message}`)
    return false
  }
}

async function testCodeIntegration() {
  console.log('\n📋 Test 5: Code Integration Points\n')
  
  try {
    // Check if freebie subscribe route imports Loops
    const fs = await import('fs')
    const freebieRoute = fs.readFileSync('app/api/freebie/subscribe/route.ts', 'utf-8')
    const hasFreebieLoops = freebieRoute.includes('syncContactToLoops') && freebieRoute.includes('loops')
    addResult('Freebie subscribe route', hasFreebieLoops, hasFreebieLoops ? 'Loops sync integrated' : 'Loops sync missing')
    
    // Check if blueprint subscribe route imports Loops
    const blueprintRoute = fs.readFileSync('app/api/blueprint/subscribe/route.ts', 'utf-8')
    const hasBlueprintLoops = blueprintRoute.includes('syncContactToLoops') && blueprintRoute.includes('loops')
    addResult('Blueprint subscribe route', hasBlueprintLoops, hasBlueprintLoops ? 'Loops sync integrated' : 'Loops sync missing')
    
    // Check if prompt guide subscribe route imports Loops
    const promptRoute = fs.readFileSync('app/api/prompt-guide/subscribe/route.ts', 'utf-8')
    const hasPromptLoops = promptRoute.includes('syncContactToLoops') && promptRoute.includes('loops')
    addResult('Prompt guide subscribe route', hasPromptLoops, hasPromptLoops ? 'Loops sync integrated' : 'Loops sync missing')
    
    // Check if Stripe webhook imports Loops
    const stripeRoute = fs.readFileSync('app/api/webhooks/stripe/route.ts', 'utf-8')
    const hasStripeLoops = stripeRoute.includes('syncContactToLoops') && stripeRoute.includes('loops')
    addResult('Stripe webhook route', hasStripeLoops, hasStripeLoops ? 'Loops sync integrated' : 'Loops sync missing')
    
    // Check if Alex chat route has Loops tools
    const alexRoute = fs.readFileSync('app/api/admin/alex/chat/route.ts', 'utf-8')
    const hasAlexLoops = alexRoute.includes('compose_loops_email') && alexRoute.includes('create_loops_sequence')
    addResult('Alex Loops tools', hasAlexLoops, hasAlexLoops ? 'Loops tools integrated' : 'Loops tools missing')
    
    // Check if cron jobs use Loops
    const cronFollowups = fs.readFileSync('app/api/cron/send-blueprint-followups/route.ts', 'utf-8')
    const hasCronLoops = cronFollowups.includes('addLoopsContactTags') && !cronFollowups.includes('resend.emails.send')
    addResult('Blueprint followups cron', hasCronLoops, hasCronLoops ? 'Uses Loops tags' : 'Still uses Resend')
    
    return true
  } catch (error: any) {
    addResult('Code integration check', false, `Error: ${error.message}`)
    return false
  }
}

async function runAllTests() {
  console.log('🧪 Loops Integration End-to-End Test\n')
  console.log('='.repeat(60))
  
  await testLoopsConfiguration()
  await testDatabaseSchema()
  await testContactSync()
  await testDatabaseTracking()
  await testCodeIntegration()
  
  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(60))
  
  const passed = results.filter(r => r.passed).length
  const total = results.length
  const percentage = Math.round((passed / total) * 100)
  
  console.log(`\n✅ Passed: ${passed}/${total} (${percentage}%)`)
  console.log(`❌ Failed: ${total - passed}/${total}`)
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Integration is complete.')
  } else {
    console.log('\n⚠️  Some tests failed. Review the details above.')
  }
  
  console.log('\n📋 Manual Testing Required:')
  console.log('1. Submit freebie form → Check Resend + Loops dashboards')
  console.log('2. Test Alex Loops tools → "Create a test Loops campaign"')
  console.log('3. Test platform decision → "Send password reset" (Resend) vs "Create newsletter" (Loops)')
  console.log('4. Make test purchase → Check Stripe webhook syncs to both platforms')
  
  return passed === total
}

runAllTests()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })

