/**
 * Verify and Repair Blueprint Feed Style Data
 * 
 * This script:
 * 1. Checks for invalid feed_style values
 * 2. Repairs them if found
 * 3. Reports results
 */

import { config } from 'dotenv'
import { neon } from '@neondatabase/serverless'

// Load environment variables
config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  console.log('============================================')
  console.log('STEP 5A: Verifying Blueprint Feed Style Data')
  console.log('============================================\n')

  // Query 1: Find invalid feed_style values
  console.log('Query 1: Finding rows with invalid feed_style values...')
  const invalidRows = await sql`
    SELECT 
      id,
      email,
      feed_style,
      form_data->>'vibe' AS category_from_form_data,
      form_data->>'selectedFeedStyle' AS mood_from_form_data,
      created_at
    FROM blueprint_subscribers
    WHERE feed_style IS NOT NULL 
      AND feed_style NOT IN ('luxury', 'minimal', 'beige')
    ORDER BY created_at DESC
  `

  console.log(`Found ${invalidRows.length} rows with invalid feed_style values\n`)

  if (invalidRows.length > 0) {
    console.log('Sample invalid rows (first 5):')
    invalidRows.slice(0, 5).forEach((row: any) => {
      console.log(`  - ID: ${row.id}, Email: ${row.email.substring(0, 3)}***, feed_style: "${row.feed_style}", Category: "${row.category_from_form_data}", Correct Mood: "${row.mood_from_form_data || 'N/A'}"`)
    })
    console.log('')
  }

  // Query 2: Count affected rows
  const countResult = await sql`
    SELECT 
      COUNT(*) AS total_invalid_rows,
      COUNT(DISTINCT feed_style) AS unique_invalid_values
    FROM blueprint_subscribers
    WHERE feed_style IS NOT NULL 
      AND feed_style NOT IN ('luxury', 'minimal', 'beige')
  `

  const { total_invalid_rows, unique_invalid_values } = countResult[0]
  console.log(`Total invalid rows: ${total_invalid_rows}`)
  console.log(`Unique invalid values: ${unique_invalid_values}\n`)

  // Query 3: Distribution of all feed_style values
  console.log('Query 3: Distribution of all feed_style values:')
  const distribution = await sql`
    SELECT 
      feed_style,
      COUNT(*) AS count
    FROM blueprint_subscribers
    WHERE feed_style IS NOT NULL
    GROUP BY feed_style
    ORDER BY count DESC
  `

  distribution.forEach((row: any) => {
    const isValid = ['luxury', 'minimal', 'beige'].includes(row.feed_style)
    const status = isValid ? '✅' : '❌'
    console.log(`  ${status} ${row.feed_style}: ${row.count} rows`)
  })
  console.log('')

  // If invalid rows found, run repair
  if (Number(total_invalid_rows) > 0) {
    console.log('============================================')
    console.log('STEP 5A-FIX: Repairing Invalid Data')
    console.log('============================================\n')

    console.log(`BEFORE REPAIR: ${total_invalid_rows} rows with invalid feed_style\n`)

    // Repair 1: Use form_data.selectedFeedStyle
    console.log('Repair 1: Using form_data.selectedFeedStyle...')
    const repair1 = await sql`
      UPDATE blueprint_subscribers
      SET 
        feed_style = form_data->>'selectedFeedStyle',
        updated_at = NOW()
      WHERE feed_style IS NOT NULL
        AND feed_style NOT IN ('luxury', 'minimal', 'beige')
        AND form_data->>'selectedFeedStyle' IN ('luxury', 'minimal', 'beige')
    `
    console.log(`Repaired ${repair1.length} rows using selectedFeedStyle\n`)

    // Repair 2: Use form_data.feed_style as fallback
    console.log('Repair 2: Using form_data.feed_style as fallback...')
    const repair2 = await sql`
      UPDATE blueprint_subscribers
      SET 
        feed_style = form_data->>'feed_style',
        updated_at = NOW()
      WHERE feed_style IS NOT NULL
        AND feed_style NOT IN ('luxury', 'minimal', 'beige')
        AND form_data->>'feed_style' IN ('luxury', 'minimal', 'beige')
    `
    console.log(`Repaired ${repair2.length} rows using feed_style fallback\n`)

    // Repair 3: Set remaining to NULL
    console.log('Repair 3: Setting remaining invalid values to NULL...')
    const repair3 = await sql`
      UPDATE blueprint_subscribers
      SET 
        feed_style = NULL,
        updated_at = NOW()
      WHERE feed_style IS NOT NULL
        AND feed_style NOT IN ('luxury', 'minimal', 'beige')
    `
    console.log(`Set ${repair3.length} rows to NULL (no valid source found)\n`)

    // Verify repair
    const afterRepair = await sql`
      SELECT COUNT(*) AS remaining
      FROM blueprint_subscribers
      WHERE feed_style IS NOT NULL 
        AND feed_style NOT IN ('luxury', 'minimal', 'beige')
    `

    const remaining = Number(afterRepair[0].remaining)
    
    console.log('============================================')
    console.log('AFTER REPAIR:')
    console.log(`  Invalid rows remaining: ${remaining}`)
    
    const validCount = await sql`
      SELECT COUNT(*) AS count
      FROM blueprint_subscribers
      WHERE feed_style IN ('luxury', 'minimal', 'beige')
    `
    console.log(`  Valid rows (luxury/minimal/beige): ${validCount[0].count}`)
    
    const nullCount = await sql`
      SELECT COUNT(*) AS count
      FROM blueprint_subscribers
      WHERE feed_style IS NULL
    `
    console.log(`  NULL rows: ${nullCount[0].count}`)
    console.log('============================================\n')

    if (remaining === 0) {
      console.log('✅ Repair completed successfully!\n')
    } else {
      console.log(`⚠️ Warning: Still have ${remaining} rows with invalid feed_style\n`)
    }
  } else {
    console.log('✅ No invalid data found. Database is clean!\n')
  }

  console.log('============================================')
  console.log('Verification Complete')
  console.log('============================================')
}

main()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
