import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function checkShannonUploadAccess() {
  try {
    console.log("🔍 Checking Shannon's upload access...\n")

    // Find Shannon's account
    const shannonUser = await sql`
      SELECT id, email, stack_auth_id, supabase_user_id, created_at
      FROM users
      WHERE email = 'shannon@soulresets.com'
    `

    if (shannonUser.length === 0) {
      console.log("❌ Shannon's account not found with email shannon@soulresets.com")
      return
    }

    console.log("✅ Found Shannon's account:")
    console.log(`   Email: ${shannonUser[0].email}`)
    console.log(`   User ID: ${shannonUser[0].id}`)
    console.log(`   Supabase ID: ${shannonUser[0].supabase_user_id}\n`)

    // Check for trained models
    const models = await sql`
      SELECT *
      FROM user_models
      WHERE user_id = ${shannonUser[0].id}
      ORDER BY created_at DESC
    `

    console.log(`📊 Shannon has ${models.length} model(s):`)
    models.forEach((model, i) => {
      console.log(`\n   Model ${i + 1}:`)
      console.log(`      Status: ${model.training_status}`)
      console.log(`      Trigger: ${model.trigger_word}`)
      console.log(`      Created: ${model.created_at}`)
      if (model.lora_weights_url) {
        console.log(`      LoRA URL: ${model.lora_weights_url.substring(0, 50)}...`)
      }
    })

    // Check for training images
    const trainingImages = await sql`
      SELECT COUNT(*) as count
      FROM selfie_uploads
      WHERE user_id = ${shannonUser[0].id}
    `

    console.log(`\n📸 Shannon has ${trainingImages[0].count} training image(s) uploaded\n`)

    // Check if she can upload
    if (shannonUser[0].supabase_user_id) {
      console.log("✅ Shannon has valid Supabase authentication")
      console.log("✅ She should be able to upload images for retraining\n")
    } else {
      console.log("⚠️  Warning: Shannon's Supabase user ID is missing")
      console.log("   This may prevent her from uploading images\n")
    }

    console.log("✅ Check complete!")
  } catch (error) {
    console.error("❌ Error:", error)
  }
}

checkShannonUploadAccess()
