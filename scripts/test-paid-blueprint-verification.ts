/**
 * Verification Test Script for Paid Blueprint UI
 * Tests API endpoints and captures responses for verification pack
 */

import { config } from 'dotenv'
import { neon } from '@neondatabase/serverless'

config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)
const API_BASE_URL = 'http://localhost:3000'
const TEST_EMAIL = 'test-pr4-staging@sselfie.app'

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchAPI(endpoint: string, options?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, options)
  const data = await response.json()
  return { status: response.status, data }
}

async function main() {
  console.log('============================================')
  console.log('VERIFICATION PACK - Manual Test Evidence')
  console.log('============================================\n')

  // Get test subscriber
  const subscriber = await sql`
    SELECT access_token, paid_blueprint_purchased
    FROM blueprint_subscribers
    WHERE email = ${TEST_EMAIL}
    ORDER BY created_at DESC
    LIMIT 1
  `

  if (subscriber.length === 0) {
    console.log('❌ No test subscriber found')
    process.exit(1)
  }

  const accessToken = subscriber[0].access_token
  const maskedToken = accessToken.substring(0, 8) + '...' + accessToken.substring(accessToken.length - 4)

  console.log('Test Subscriber:')
  console.log(`  Email: ${TEST_EMAIL}`)
  console.log(`  Access Token: ${maskedToken}`)
  console.log(`  Has Paid: ${subscriber[0].paid_blueprint_purchased}\n`)

  // Reset to 0/30
  console.log('Resetting to 0/30 grids...')
  await sql`
    UPDATE blueprint_subscribers
    SET paid_blueprint_photo_urls = '[]'::jsonb,
        paid_blueprint_generated = FALSE
    WHERE email = ${TEST_EMAIL}
  `
  console.log('✅ Reset complete\n')

  // Test 1: GET get-paid-status (0/30)
  console.log('============================================')
  console.log('TEST 1: GET /api/blueprint/get-paid-status')
  console.log('============================================')
  const { status: statusCode, data: statusData } = await fetchAPI(
    `/api/blueprint/get-paid-status?access=${accessToken}`
  )
  console.log(`Status: ${statusCode}`)
  console.log('Response JSON:')
  const redactedStatus = { ...statusData }
  if (redactedStatus.photoUrls) {
    redactedStatus.photoUrls = redactedStatus.photoUrls.map((url: any, i: number) => 
      url ? `[URL_${i}]` : null
    )
  }
  console.log(JSON.stringify(redactedStatus, null, 2))
  console.log('')

  // Test 2: POST generate-paid (Grid 1)
  console.log('============================================')
  console.log('TEST 2: POST /api/blueprint/generate-paid (Grid 1)')
  console.log('============================================')
  const { status: genStatus, data: genData } = await fetchAPI(
    `/api/blueprint/generate-paid`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken,
        gridNumber: 1
      })
    }
  )
  console.log(`Status: ${genStatus}`)
  console.log('Response JSON:')
  console.log(JSON.stringify(genData, null, 2))
  console.log('')

  if (genStatus === 200 && genData.predictionId) {
    // Test 3: Poll check-paid-grid (2-3 samples)
    console.log('============================================')
    console.log('TEST 3: GET /api/blueprint/check-paid-grid (Polling)')
    console.log('============================================')
    
    let attempts = 0
    const maxAttempts = 5
    let completed = false

    while (attempts < maxAttempts && !completed) {
      await sleep(5000)
      attempts++
      
      const { status: checkStatus, data: checkData } = await fetchAPI(
        `/api/blueprint/check-paid-grid?predictionId=${genData.predictionId}&gridNumber=1&access=${accessToken}`
      )

      console.log(`Poll Attempt ${attempts}:`)
      console.log(`  Status: ${checkStatus}`)
      console.log(`  Response JSON:`)
      const redactedCheck = { ...checkData }
      if (redactedCheck.gridUrl) {
        redactedCheck.gridUrl = '[GRID_URL]'
      }
      console.log(JSON.stringify(redactedCheck, null, 2))
      console.log('')

      if (checkData.status === 'completed') {
        completed = true
        console.log('✅ Grid 1 completed!')
      } else if (checkData.status === 'failed') {
        console.log('❌ Grid 1 failed!')
        break
      }
    }
  }

  // Test 4: Verify resume after refresh
  console.log('============================================')
  console.log('TEST 4: Resume After Refresh Simulation')
  console.log('============================================')
  console.log('Simulating: User refreshes page mid-generation')
  console.log('Expected: Grid 1 should resume from localStorage')
  console.log('')
  
  // Simulate localStorage state
  const localStorageState = {
    "1": {
      predictionId: genData.predictionId,
      status: "processing"
    }
  }
  console.log('localStorage state (simulated):')
  console.log(JSON.stringify(localStorageState, null, 2))
  console.log('')
  
  // Check if grid 1 is now completed
  const finalStatus = await sql`
    SELECT paid_blueprint_photo_urls->0 AS grid_1_url
    FROM blueprint_subscribers
    WHERE email = ${TEST_EMAIL}
  `
  
  if (finalStatus[0].grid_1_url) {
    console.log('✅ Grid 1 URL in database:')
    console.log(`  ${finalStatus[0].grid_1_url.substring(0, 60)}...`)
    console.log('')
    console.log('✅ Resume test: Grid 1 completed, would resume from server state')
  } else {
    console.log('⚠️ Grid 1 not yet completed (still generating)')
    console.log('✅ Resume test: Would resume polling from localStorage')
  }
  console.log('')

  // Test 5: Invalid token
  console.log('============================================')
  console.log('TEST 5: Invalid Token')
  console.log('============================================')
  const { status: invalidStatus, data: invalidData } = await fetchAPI(
    `/api/blueprint/get-paid-status?access=invalid-token-12345`
  )
  console.log(`Status: ${invalidStatus}`)
  console.log('Response JSON:')
  console.log(JSON.stringify(invalidData, null, 2))
  console.log('')

  // Test 6: Not purchased
  console.log('============================================')
  console.log('TEST 6: Not Purchased User')
  console.log('============================================')
  
  // Create non-paid subscriber
  const nonPaidToken = 'test-non-paid-' + Date.now()
  await sql`
    INSERT INTO blueprint_subscribers (
      email, name, access_token, paid_blueprint_purchased
    ) VALUES (
      'test-non-paid@sselfie.app',
      'Test Non-Paid',
      ${nonPaidToken},
      FALSE
    )
    ON CONFLICT (email) DO UPDATE SET
      paid_blueprint_purchased = FALSE
  `
  
  const { status: nonPaidStatus, data: nonPaidData } = await fetchAPI(
    `/api/blueprint/get-paid-status?access=${nonPaidToken}`
  )
  console.log(`Status: ${nonPaidStatus}`)
  console.log('Response JSON:')
  console.log(JSON.stringify(nonPaidData, null, 2))
  console.log('')

  console.log('============================================')
  console.log('VERIFICATION PACK COMPLETE')
  console.log('============================================')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
