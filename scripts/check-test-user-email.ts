import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") })

if (!process.env.DATABASE_URL) {
  console.error("[v0] ❌ DATABASE_URL not found")
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

async function checkTestUser() {
  try {
    const email = "Sandra.r.m.pereira@gmail.com"
    console.log(`[v0] Looking up user: ${email}`)
    
    // Find user by email
    const user = await sql`
      SELECT id, email, display_name
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `
    
    if (user.length === 0) {
      console.log(`[v0] ❌ User not found: ${email}`)
      return
    }
    
    const userId = user[0].id
    console.log(`[v0] ✅ Found user:`, {
      id: userId,
      email: user[0].email,
      name: user[0].display_name,
    })
    
    // Find test models for this user
    const testModels = await sql`
      SELECT 
        id,
        user_id,
        model_name,
        training_status,
        is_test,
        replicate_model_id,
        trigger_word,
        created_at
      FROM user_models
      WHERE user_id = ${userId}
      AND (is_test = true OR model_name LIKE 'Test Model%')
      ORDER BY created_at DESC
    `
    
    console.log(`\n[v0] Found ${testModels.length} test models for this user:`)
    testModels.forEach((model: any, idx: number) => {
      console.log(`\n[${idx + 1}] Model ID: ${model.id}`)
      console.log(`    Model Name: ${model.model_name}`)
      console.log(`    Training Status: ${model.training_status}`)
      console.log(`    is_test: ${model.is_test}`)
      console.log(`    Replicate Model ID: ${model.replicate_model_id}`)
      console.log(`    Trigger Word: ${model.trigger_word}`)
      console.log(`    Created: ${model.created_at}`)
    })
    
    // Find production models for this user
    const productionModels = await sql`
      SELECT 
        id,
        user_id,
        model_name,
        training_status,
        is_test,
        replicate_model_id,
        trigger_word,
        created_at
      FROM user_models
      WHERE user_id = ${userId}
      AND (is_test = false OR is_test IS NULL)
      AND (model_name NOT LIKE 'Test Model%' OR model_name IS NULL)
      ORDER BY created_at DESC
    `
    
    console.log(`\n[v0] Found ${productionModels.length} production models for this user:`)
    productionModels.forEach((model: any, idx: number) => {
      console.log(`\n[${idx + 1}] Model ID: ${model.id}`)
      console.log(`    Model Name: ${model.model_name}`)
      console.log(`    Training Status: ${model.training_status}`)
      console.log(`    is_test: ${model.is_test}`)
      console.log(`    Replicate Model ID: ${model.replicate_model_id}`)
      console.log(`    Trigger Word: ${model.trigger_word}`)
      console.log(`    Created: ${model.created_at}`)
    })
    
  } catch (error: any) {
    console.error("[v0] ❌ Error:", error.message)
    process.exit(1)
  }
}

checkTestUser()
