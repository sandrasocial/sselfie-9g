import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function findChristianData() {
  console.log("🔍 Searching for Christian's data...\n")

  // Search for users with "christian" in name or "levelpartner" in email
  console.log("👤 Searching for Christian in users table:")
  const users = await sql`
    SELECT id, email, first_name, last_name, created_at
    FROM users
    WHERE LOWER(first_name) LIKE '%christian%'
       OR LOWER(last_name) LIKE '%christian%'
       OR LOWER(email) LIKE '%christian%'
       OR LOWER(email) LIKE '%levelpartner%'
    ORDER BY created_at DESC
  `

  if (users.length > 0) {
    users.forEach((user) => {
      console.log(`  User ID: ${user.id}`)
      console.log(`  Email: ${user.email}`)
      console.log(`  Name: ${user.first_name || ""} ${user.last_name || ""}`)
      console.log(`  Created: ${new Date(user.created_at).toLocaleString()}\n`)
    })
  } else {
    console.log('  ❌ No users found with "christian" or "levelpartner"\n')
  }

  // Search for trained models with "christian" in name
  console.log('🤖 Searching for trained models with "christian":')
  const models = await sql`
    SELECT um.id, um.user_id, um.model_name, um.replicate_model_id, 
           um.training_status, um.created_at,
           u.email, u.first_name, u.last_name
    FROM user_models um
    LEFT JOIN users u ON um.user_id = u.id
    WHERE LOWER(um.model_name) LIKE '%christian%'
       OR LOWER(um.replicate_model_id) LIKE '%christian%'
    ORDER BY um.created_at DESC
  `

  if (models.length > 0) {
    models.forEach((model) => {
      console.log(`  Model ID: ${model.id}`)
      console.log(`  Model Name: ${model.model_name}`)
      console.log(`  User: ${model.email} (${model.first_name || ""} ${model.last_name || ""})`)
      console.log(`  User ID: ${model.user_id}`)
      console.log(`  Status: ${model.training_status}`)
      console.log(`  Replicate Model: ${model.replicate_model_id}`)
      console.log(`  Created: ${new Date(model.created_at).toLocaleString()}\n`)
    })
  } else {
    console.log('  ❌ No trained models found with "christian"\n')
  }

  // Search for images with "christian" in prompt
  console.log('📸 Searching for images with "christian":')
  const images = await sql`
    SELECT ai.id, ai.user_id, ai.prompt, ai.created_at,
           u.email, u.first_name, u.last_name
    FROM ai_images ai
    LEFT JOIN users u ON ai.user_id = u.id
    WHERE LOWER(ai.prompt) LIKE '%christian%'
    ORDER BY ai.created_at DESC
    LIMIT 10
  `

  if (images.length > 0) {
    images.forEach((img) => {
      console.log(`  Image ID: ${img.id}`)
      console.log(`  User: ${img.email} (${img.first_name || ""} ${img.last_name || ""})`)
      console.log(`  User ID: ${img.user_id}`)
      console.log(`  Prompt: ${img.prompt?.substring(0, 100)}...`)
      console.log(`  Created: ${new Date(img.created_at).toLocaleString()}\n`)
    })
  } else {
    console.log('  ❌ No images found with "christian" in prompt\n')
  }

  // List ALL trained models to see what exists
  console.log("🤖 ALL Trained Models in database:")
  const allModels = await sql`
    SELECT um.id, um.user_id, um.model_name, um.training_status, um.created_at,
           u.email, u.first_name, u.last_name
    FROM user_models um
    LEFT JOIN users u ON um.user_id = u.id
    ORDER BY um.created_at DESC
  `

  if (allModels.length > 0) {
    allModels.forEach((model) => {
      console.log(`  Model: ${model.model_name}`)
      console.log(`  User: ${model.email} (${model.first_name || ""} ${model.last_name || ""})`)
      console.log(`  User ID: ${model.user_id}`)
      console.log(`  Status: ${model.training_status}`)
      console.log(`  Created: ${new Date(model.created_at).toLocaleString()}\n`)
    })
  } else {
    console.log("  ❌ No trained models found in database\n")
  }

  console.log("✅ Search complete!")
}

findChristianData().catch(console.error)
