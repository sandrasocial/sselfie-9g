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

async function fixTestModelsFlag() {
  try {
    console.log("[v0] Fixing is_test flag for test models...")
    
    // Find models that should be test models but have is_test = false
    const testModelsToFix = await sql`
      SELECT 
        id,
        user_id,
        model_name,
        replicate_model_id,
        training_status,
        is_test
      FROM user_models
      WHERE (
        model_name LIKE 'Test Model%' 
        OR replicate_model_id LIKE 'sandrasocial/test-%'
      )
      AND (is_test = false OR is_test IS NULL)
      ORDER BY created_at DESC
    `
    
    console.log(`[v0] Found ${testModelsToFix.length} models that should be marked as test models:`)
    
    if (testModelsToFix.length > 0) {
      for (const model of testModelsToFix) {
        console.log(`\n  - Model ID: ${model.id}`)
        console.log(`    Name: ${model.model_name}`)
        console.log(`    Replicate ID: ${model.replicate_model_id}`)
        console.log(`    Current is_test: ${model.is_test}`)
      }
      
      // Update them to is_test = true
      const updateResult = await sql`
        UPDATE user_models
        SET is_test = true
        WHERE (
          model_name LIKE 'Test Model%' 
          OR replicate_model_id LIKE 'sandrasocial/test-%'
        )
        AND (is_test = false OR is_test IS NULL)
      `
      
      console.log(`\n[v0] ✅ Updated ${testModelsToFix.length} models to is_test = true`)
    } else {
      console.log("[v0] ✅ No models need fixing")
    }
    
  } catch (error: any) {
    console.error("[v0] ❌ Error:", error.message)
    process.exit(1)
  }
}

fixTestModelsFlag()
