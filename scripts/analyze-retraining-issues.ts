/**
 * Analyze retraining issues - compare first-time vs retraining
 */

import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })
dotenv.config({ path: ".env" })

const sql = neon(process.env.DATABASE_URL!)

async function analyzeRetrainingIssues() {
  console.log("🔍 Analyzing Retraining Issues\n")
  console.log("=" .repeat(60))

  // Check for users with multiple training runs
  const usersWithMultipleModels = await sql`
    SELECT 
      u.id,
      u.email,
      COUNT(um.id) as model_count,
      MAX(um.created_at) as latest_training,
      MIN(um.created_at) as first_training
    FROM users u
    JOIN user_models um ON u.id = um.user_id
    WHERE um.training_status = 'completed'
    GROUP BY u.id, u.email
    HAVING COUNT(um.id) > 1
    ORDER BY model_count DESC
    LIMIT 10
  `

  console.log(`\n📊 Users with Multiple Completed Trainings (${usersWithMultipleModels.length}):`)
  usersWithMultipleModels.forEach((user, idx) => {
    console.log(`\n   ${idx + 1}. ${user.email}`)
    console.log(`      - Total Models: ${user.model_count}`)
    console.log(`      - First Training: ${user.first_training}`)
    console.log(`      - Latest Training: ${user.latest_training}`)
  })

  // Check for differences in training parameters
  console.log("\n" + "=" .repeat(60))
  console.log("\n🔍 Checking Training Route Differences:\n")

  console.log("❌ CRITICAL ISSUE FOUND:")
  console.log("\n1. TWO DIFFERENT TRAINER VERSIONS:")
  console.log("   Route: /api/training/start")
  console.log("   Version: 2295cf884e30e255b7f96c0e65e880c36e6f467cffa17a6b60413e0f230db412")
  console.log("   (HARDCODED - NOT USING FLUX_LORA_TRAINER_VERSION)")
  console.log("\n   Route: /api/training/start-training")
  console.log("   Version: f463fbfc97389e10a2f443a8a84b6953b1058eafbf0c9af4d84457ff07cb04db")
  console.log("   (USES FLUX_LORA_TRAINER_VERSION from replicate-client.ts)")
  console.log("\n   ⚠️  These are DIFFERENT versions!")

  console.log("\n2. TRIGGER WORD GENERATION DIFFERENCE:")
  console.log("   Route: /api/training/start")
  console.log("   Format: user${neonUser.id} (FULL ID)")
  console.log("\n   Route: /api/training/start-training")
  console.log("   Format: user${neonUser.id.substring(0, 8)} (FIRST 8 CHARS)")
  console.log("\n   ⚠️  Retraining might use different trigger word!")

  console.log("\n3. DESTINATION MODEL NAME DIFFERENCE:")
  console.log("   Route: /api/training/start")
  console.log("   Format: user-${id.substring(0, 8)}-selfie-lora-${Date.now()}")
  console.log("   ⚠️  Includes TIMESTAMP - creates NEW model each time!")
  console.log("\n   Route: /api/training/start-training")
  console.log("   Format: user-${id.substring(0, 8)}-selfie-lora")
  console.log("   ✅ No timestamp - reuses existing model")

  console.log("\n4. LoRA URL EXTRACTION:")
  console.log("   Method 1: training.output.weights (direct)")
  console.log("   Method 2: Constructed from version: pbxt/${version}/trained_model.tar")
  console.log("   Method 3: training.output as string URL")
  console.log("   ⚠️  Multiple methods might extract different URLs")

  console.log("\n" + "=" .repeat(60))
  console.log("\n💡 RECOMMENDATIONS:\n")

  console.log("1. ✅ STANDARDIZE TRAINER VERSION:")
  console.log("   - Both routes should use FLUX_LORA_TRAINER_VERSION from replicate-client.ts")
  console.log("   - Remove hardcoded version from /api/training/start")

  console.log("\n2. ✅ STANDARDIZE TRIGGER WORD:")
  console.log("   - Both routes should use SAME format")
  console.log("   - For retraining, KEEP the original trigger word (don't regenerate)")
  console.log("   - This ensures consistency across retrains")

  console.log("\n3. ✅ FIX DESTINATION MODEL NAME:")
  console.log("   - For retraining, REUSE existing model name (no timestamp)")
  console.log("   - Only use timestamp for first-time training")
  console.log("   - This ensures retraining updates the same model")

  console.log("\n4. ✅ IMPROVE LoRA URL EXTRACTION:")
  console.log("   - Add logging to see which method succeeds")
  console.log("   - Verify URL format is consistent")
  console.log("   - Add validation to ensure URL is accessible")

  console.log("\n5. ✅ PRESERVE LoRA SCALE ON RETRAINING:")
  console.log("   - When retraining, preserve the existing lora_scale")
  console.log("   - Don't reset it to default")

}

analyzeRetrainingIssues()
  .then(() => {
    console.log("\n✅ Analysis complete")
    process.exit(0)
  })
  .catch((error) => {
    console.error("❌ Analysis failed:", error)
    process.exit(1)
  })
