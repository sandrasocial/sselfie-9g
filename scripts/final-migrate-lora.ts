import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function migrateLora() {
  try {
    console.log("🚀 Starting LoRA weights migration...\n")

    // Get all available LoRA weights
    const loraWeights = await sql`
      SELECT 
        id,
        user_id as stack_auth_id,
        s3_bucket,
        s3_key,
        trigger_word,
        status,
        created_at
      FROM lora_weights
      WHERE status = 'available'
      ORDER BY id
    `

    console.log(`📊 Found ${loraWeights.length} available LoRA weights\n`)

    // Get all users with their Stack Auth IDs and Supabase IDs
    const users = await sql`
      SELECT 
        id as supabase_id,
        email,
        stack_auth_id
      FROM users
      WHERE stack_auth_id IS NOT NULL
    `

    console.log(`👥 Found ${users.length} users with Stack Auth IDs\n`)

    const stackToSupabase = new Map()
    for (const user of users) {
      stackToSupabase.set(user.stack_auth_id, {
        supabase_id: user.supabase_id,
        email: user.email,
      })
    }

    let migrated = 0
    let skipped = 0
    let notFound = 0

    console.log("================================================================================")
    console.log("Migration Progress:")
    console.log("================================================================================\n")

    for (const lora of loraWeights) {
      try {
        const userInfo = stackToSupabase.get(lora.stack_auth_id)

        if (!userInfo) {
          console.log(`❌ No Supabase user found for Stack Auth ID: ${lora.stack_auth_id}`)
          notFound++
          continue
        }

        // Construct the S3 URL
        const loraUrl = `https://${lora.s3_bucket}.s3.amazonaws.com/${lora.s3_key}`

        // Check if user already has this LoRA weight
        const existing = await sql`
          SELECT id FROM user_models
          WHERE user_id = ${userInfo.supabase_id}
        `

        if (existing.length > 0) {
          console.log(`⏭️  Skipping ${userInfo.email} - already has LoRA weights`)
          skipped++
          continue
        }

        // Insert into user_models
        await sql`
          INSERT INTO user_models (
            user_id,
            lora_weights_url,
            trigger_word,
            created_at,
            updated_at
          ) VALUES (
            ${userInfo.supabase_id},
            ${loraUrl},
            ${lora.trigger_word},
            NOW(),
            NOW()
          )
        `

        console.log(`✅ Migrated ${userInfo.email}`)
        console.log(`   Stack Auth ID: ${lora.stack_auth_id}`)
        console.log(`   Supabase ID: ${userInfo.supabase_id}`)
        console.log(`   Trigger Word: ${lora.trigger_word}`)
        console.log(`   LoRA URL: ${loraUrl}\n`)

        migrated++
      } catch (error) {
        console.error(`❌ Error migrating LoRA ID ${lora.id}:`, error)
      }
    }

    console.log("================================================================================")
    console.log("✅ Migration complete!")
    console.log(`   Migrated: ${migrated}`)
    console.log(`   Skipped: ${skipped}`)
    console.log(`   Not Found: ${notFound}`)
    console.log("================================================================================\n")

    // Verify migration
    const verifyResults = await sql`
      SELECT 
        u.email,
        um.trigger_word,
        um.lora_weights_url
      FROM user_models um
      JOIN users u ON u.id = um.user_id
      ORDER BY u.email
    `

    console.log("📊 Verification - Users with LoRA weights:")
    for (const result of verifyResults) {
      console.log(`   ✅ ${result.email} - ${result.trigger_word}`)
    }
    console.log(`\n   ✅ Total users with LoRA weights: ${verifyResults.length}`)
  } catch (error) {
    console.error("❌ Fatal error during migration:", error)
    throw error
  }
}

migrateLora().catch((error) => {
  console.error("❌ Migration failed:", error)
  process.exit(1)
})
