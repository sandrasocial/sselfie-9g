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

async function findAllTestUsers() {
  try {
    console.log("[v0] Finding all users with test models...")
    
    // Find all users who have test models
    const usersWithTestModels = await sql`
      SELECT DISTINCT
        u.id,
        u.email,
        u.display_name,
        COUNT(um.id) as test_model_count
      FROM users u
      INNER JOIN user_models um ON u.id = um.user_id
      WHERE um.is_test = true OR um.model_name LIKE 'Test Model%'
      GROUP BY u.id, u.email, u.display_name
      ORDER BY test_model_count DESC
    `
    
    console.log(`[v0] Found ${usersWithTestModels.length} users with test models:\n`)
    
    for (const user of usersWithTestModels) {
      console.log(`\n📧 User: ${user.email}`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Name: ${user.display_name || 'N/A'}`)
      console.log(`   Test Models: ${user.test_model_count}`)
      
      // Get their test models
      const testModels = await sql`
        SELECT 
          id,
          model_name,
          training_status,
          is_test,
          replicate_model_id,
          trigger_word,
          created_at
        FROM user_models
        WHERE user_id = ${user.id}
        AND (is_test = true OR model_name LIKE 'Test Model%')
        ORDER BY created_at DESC
      `
      
      testModels.forEach((model: any) => {
        console.log(`   - ${model.model_name} (${model.training_status}) - ${model.replicate_model_id || 'no replicate ID'}`)
      })
    }
    
    // Also check for the specific email with case-insensitive search
    console.log(`\n\n[v0] Searching for Sandra email (case-insensitive)...`)
    const sandraUsers = await sql`
      SELECT id, email, display_name
      FROM users
      WHERE LOWER(email) LIKE '%sandra%pereira%'
    `
    
    if (sandraUsers.length > 0) {
      console.log(`[v0] Found ${sandraUsers.length} users matching Sandra:`)
      sandraUsers.forEach((u: any) => {
        console.log(`   - ${u.email} (ID: ${u.id})`)
      })
    } else {
      console.log(`[v0] No users found matching Sandra`)
    }
    
  } catch (error: any) {
    console.error("[v0] ❌ Error:", error.message)
    process.exit(1)
  }
}

findAllTestUsers()
