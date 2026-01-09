import { config } from 'dotenv'
import { neon } from '@neondatabase/serverless'

config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  const subscribers = await sql`
    SELECT 
      id,
      email,
      selfie_image_urls,
      jsonb_array_length(COALESCE(selfie_image_urls, '[]'::jsonb)) AS selfie_count
    FROM blueprint_subscribers
    WHERE selfie_image_urls IS NOT NULL
      AND jsonb_array_length(selfie_image_urls) > 0
    ORDER BY created_at DESC
    LIMIT 5
  `

  console.log('Found subscribers with selfie URLs:')
  subscribers.forEach((sub: any) => {
    console.log(`\nID: ${sub.id}`)
    console.log(`Email: ${sub.email}`)
    console.log(`Selfie Count: ${sub.selfie_count}`)
    console.log(`URLs: ${JSON.stringify(sub.selfie_image_urls, null, 2)}`)
  })
}

main()
