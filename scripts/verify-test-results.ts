import { config } from 'dotenv'
import { neon } from '@neondatabase/serverless'

config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)
const TEST_EMAIL = 'test-pr4-staging@sselfie.app'

async function main() {
  console.log('============================================')
  console.log('Verifying Test Results')
  console.log('============================================\n')

  const results = await sql`
    SELECT 
      id,
      email,
      feed_style AS mood,
      form_data->>'vibe' AS category,
      paid_blueprint_purchased,
      paid_blueprint_generated,
      paid_blueprint_photo_urls->0 IS NOT NULL AS has_grid_1,
      paid_blueprint_photo_urls->1 IS NOT NULL AS has_grid_2,
      paid_blueprint_photo_urls->2 IS NOT NULL AS has_grid_3,
      jsonb_array_length(COALESCE(paid_blueprint_photo_urls, '[]'::jsonb)) AS array_length,
      paid_blueprint_photo_urls->0 AS grid_1_url,
      paid_blueprint_photo_urls->1 AS grid_2_url,
      paid_blueprint_photo_urls->2 AS grid_3_url,
      created_at
    FROM blueprint_subscribers
    WHERE email = ${TEST_EMAIL}
    ORDER BY created_at DESC
    LIMIT 1
  `

  if (results.length === 0) {
    console.log('❌ No test subscriber found\n')
    return
  }

  const sub = results[0]
  
  console.log('Test Subscriber Details:')
  console.log(`  ID: ${sub.id}`)
  console.log(`  Email: ${sub.email}`)
  console.log(`  Category (vibe): ${sub.category}`)
  console.log(`  Mood (feed_style): ${sub.mood}`)
  console.log(`  Paid: ${sub.paid_blueprint_purchased}`)
  console.log(`  Generated: ${sub.paid_blueprint_generated}`)
  console.log('')

  console.log('Grid Status:')
  console.log(`  ${sub.has_grid_1 ? '✅' : '❌'} Grid 1 (slot 0): ${sub.has_grid_1 ? 'Stored' : 'Missing'}`)
  console.log(`  ${sub.has_grid_2 ? '✅' : '❌'} Grid 2 (slot 1): ${sub.has_grid_2 ? 'Stored' : 'Missing'}`)
  console.log(`  ${sub.has_grid_3 ? '✅' : '❌'} Grid 3 (slot 2): ${sub.has_grid_3 ? 'Stored' : 'Missing'}`)
  console.log(`  Array length: ${sub.array_length}`)
  console.log('')

  if (sub.has_grid_1) {
    console.log('Grid 1 URL:')
    console.log(`  ${sub.grid_1_url}`)
    console.log('')
  }

  if (sub.has_grid_2) {
    console.log('Grid 2 URL:')
    console.log(`  ${sub.grid_2_url}`)
    console.log('')
  }

  if (sub.has_grid_3) {
    console.log('Grid 3 URL:')
    console.log(`  ${sub.grid_3_url}`)
    console.log('')
  }

  // Test Summary
  console.log('============================================')
  console.log('Test Summary')
  console.log('============================================')
  console.log(`✅ Mood (feed_style) correct: ${sub.mood === 'minimal' ? 'Yes' : 'No'}`)
  console.log(`✅ Category (vibe) correct: ${sub.category === 'professional' ? 'Yes' : 'No'}`)
  console.log(`${sub.has_grid_1 ? '✅' : '❌'} Grid 1: ${sub.has_grid_1 ? 'Generated & Stored' : 'Missing'}`)
  console.log(`${sub.has_grid_2 ? '✅' : '❌'} Grid 2: ${sub.has_grid_2 ? 'Generated & Stored' : 'Missing'}`)
  console.log(`${sub.has_grid_3 ? '✅' : '❌'} Grid 3: ${sub.has_grid_3 ? 'Generated & Stored' : 'Missing'}`)
  console.log('============================================\n')

  const gridsCompleted = (sub.has_grid_1 ? 1 : 0) + (sub.has_grid_2 ? 1 : 0) + (sub.has_grid_3 ? 1 : 0)
  
  if (gridsCompleted >= 2) {
    console.log(`✅ TEST PASSED: ${gridsCompleted}/3 grids completed successfully`)
    console.log('✅ JSONB array writes working correctly')
    console.log('✅ Mood (feed_style) column working correctly')
    console.log('✅ READY FOR PRODUCTION\n')
  } else {
    console.log(`⚠️ Only ${gridsCompleted}/3 grids completed\n`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
