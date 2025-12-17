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

async function checkTestModels() {
  try {
    console.log("[v0] Checking for test models in database...")
    
    // Get all models with is_test = true
    const testModels = await sql`
      SELECT 
        id,
        user_id,
        model_name,
        training_status,
        is_test,
        replicate_model_id,
        replicate_version_id,
        created_at
      FROM user_models
      WHERE is_test = true
      ORDER BY created_at DESC
    `
    
    console.log(`[v0] Found ${testModels.length} test models:`)
    testModels.forEach((model: any, idx: number) => {
      console.log(`\n[${idx + 1}] Model ID: ${model.id}`)
      console.log(`    User ID: ${model.user_id}`)
      console.log(`    Model Name: ${model.model_name}`)
      console.log(`    Training Status: ${model.training_status}`)
      console.log(`    is_test: ${model.is_test}`)
      console.log(`    Replicate Model ID: ${model.replicate_model_id}`)
      console.log(`    Replicate Version ID: ${model.replicate_version_id}`)
      console.log(`    Created: ${model.created_at}`)
    })
    
    // Also check models with "Test" in the name
    const testNamedModels = await sql`
      SELECT 
        id,
        user_id,
        model_name,
        training_status,
        is_test,
        replicate_model_id
      FROM user_models
      WHERE model_name LIKE '%Test%'
      ORDER BY created_at DESC
    `
    
    console.log(`\n[v0] Found ${testNamedModels.length} models with 'Test' in name:`)
    testNamedModels.forEach((model: any, idx: number) => {
      console.log(`\n[${idx + 1}] Model ID: ${model.id}`)
      console.log(`    User ID: ${model.user_id}`)
      console.log(`    Model Name: ${model.model_name}`)
      console.log(`    Training Status: ${model.training_status}`)
      console.log(`    is_test: ${model.is_test}`)
      console.log(`    Replicate Model ID: ${model.replicate_model_id}`)
    })
    
  } catch (error: any) {
    console.error("[v0] ❌ Error:", error.message)
    process.exit(1)
  }
}

checkTestModels()
