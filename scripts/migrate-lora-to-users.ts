import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function migrateLora() {
  console.log("🔄 Starting LoRA weights migration...\n")

  // Step 1: Get all LoRA weights with correct column names
  const loraWeights = await sql`
    SELECT id, user_id, s3_bucket, s3_key, status, trigger_word, created_at, updated_at
    FROM lora_weights
    WHERE status = 'completed'
    ORDER BY id
  `

  console.log(`📊 Found ${loraWeights.length} LoRA weights\n`)

  // Step 2: Get all users
  const users = await sql`
    SELECT id, email, stack_auth_id
    FROM users
    ORDER BY email
  `

  console.log(`👥 Found ${users.length} users\n`)

  // Step 3: For each LoRA weight, find matching user and update user_models
  let migrated = 0
  let skipped = 0

  for (const lora of loraWeights) {
    const loraUrl = `https://${lora.s3_bucket}.s3.amazonaws.com/${lora.s3_key}`

    console.log(`\n📦 Processing LoRA ID: ${lora.id}`)
    console.log(`   User ID from lora_weights: ${lora.user_id}`)
    console.log(`   S3 Bucket: ${lora.s3_bucket}`)
    console.log(`   S3 Key: ${lora.s3_key}`)
    console.log(`   Constructed URL: ${loraUrl}`)

    // Find user by stack_auth_id matching the lora.user_id
    const matchingUser = users.find((u) => u.stack_auth_id === lora.user_id)

    if (matchingUser) {
      console.log(`   ✅ Found matching user: ${matchingUser.email}`)

      // Check if user_models entry exists
      const existingModel = await sql`
        SELECT id FROM user_models WHERE user_id = ${matchingUser.id}
      `

      if (existingModel.length > 0) {
        // Update existing entry
        await sql`
          UPDATE user_models
          SET lora_weights_url = ${loraUrl},
              trigger_word = ${lora.trigger_word},
              training_status = 'completed',
              updated_at = NOW()
          WHERE user_id = ${matchingUser.id}
        `
        console.log(`   ✅ Updated user_models for ${matchingUser.email}`)
      } else {
        // Create new entry
        await sql`
          INSERT INTO user_models (
            user_id, 
            lora_weights_url, 
            trigger_word,
            training_status,
            created_at, 
            updated_at
          )
          VALUES (
            ${matchingUser.id}, 
            ${loraUrl}, 
            ${lora.trigger_word},
            'completed',
            NOW(), 
            NOW()
          )
        `
        console.log(`   ✅ Created user_models entry for ${matchingUser.email}`)
      }

      migrated++
    } else {
      console.log(`   ⚠️  No matching user found for stack_auth_id: ${lora.user_id}`)
      skipped++
    }
  }

  console.log("\n" + "=".repeat(80))
  console.log(`\n✅ Migration complete!`)
  console.log(`   Migrated: ${migrated}`)
  console.log(`   Skipped: ${skipped}`)

  // Step 4: Verify migration
  console.log("\n📊 Verification - Users with LoRA weights:")
  const usersWithLora = await sql`
    SELECT u.email, um.lora_weights_url, um.trigger_word
    FROM users u
    JOIN user_models um ON u.id = um.user_id
    WHERE um.lora_weights_url IS NOT NULL
    ORDER BY u.email
  `

  usersWithLora.forEach((user) => {
    console.log(`   ✅ ${user.email} - ${user.trigger_word}`)
  })

  console.log(`\n✅ Total users with LoRA weights: ${usersWithLora.length}`)
}

migrateLora().catch(console.error)
