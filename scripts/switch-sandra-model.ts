/**
 * Switch Sandra's model to an older version
 * Email: sandra.r.m.pereira@gmail.com
 * Old Version: 1258a87267c43b812cb4271a5f134a339133eae5c90900828e05bc038c1a1b46
 */

import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local" })
dotenv.config({ path: ".env" })

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL not found")
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL!)

async function switchSandraModel() {
  try {
    console.log("🔄 Switching Sandra's Model to Older Version\n")
    console.log("Email: sandra.r.m.pereira@gmail.com")
    console.log("New Version: 1258a87267c43b812cb4271a5f134a339133eae5c90900828e05bc038c1a1b46\n")

    // 1. Find user
    const userResult = await sql`
      SELECT id, email
      FROM users
      WHERE email = 'sandra.r.m.pereira@gmail.com'
      LIMIT 1
    `

    if (userResult.length === 0) {
      console.log("❌ User not found!")
      return
    }

    const user = userResult[0]
    console.log("✅ User found:", user.id)
    console.log()

    // 2. Get current model
    const currentModel = await sql`
      SELECT 
        id,
        user_id,
        model_name,
        trigger_word,
        training_status,
        replicate_model_id,
        replicate_version_id,
        lora_weights_url,
        lora_scale,
        created_at,
        updated_at
      FROM user_models
      WHERE user_id = ${user.id}
      AND training_status = 'completed'
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (currentModel.length === 0) {
      console.log("❌ No completed model found!")
      return
    }

    const model = currentModel[0]
    console.log("📦 Current Model:")
    console.log("   - ID:", model.id)
    console.log("   - Model:", model.replicate_model_id)
    console.log("   - Current Version:", model.replicate_version_id)
    console.log("   - LoRA URL:", model.lora_weights_url ? model.lora_weights_url.substring(0, 100) + "..." : "NULL")
    console.log("   - LoRA Scale:", model.lora_scale)
    console.log()

    // 3. Construct new version ID and LoRA URL
    const newVersionId = `${model.replicate_model_id}:1258a87267c43b812cb4271a5f134a339133eae5c90900828e05bc038c1a1b46`
    
    // Construct LoRA URL from version (Replicate delivery format)
    // Format: https://replicate.delivery/{hash}/{version_hash}/flux-lora.tar
    const newLoraUrl = `https://replicate.delivery/pbxt/1258a87267c43b812cb4271a5f134a339133eae5c90900828e05bc038c1a1b46/flux-lora.tar`

    console.log("🔄 Switching to:")
    console.log("   - New Version ID:", newVersionId)
    console.log("   - New LoRA URL:", newLoraUrl)
    console.log()

    // 4. Update model
    const updateResult = await sql`
      UPDATE user_models
      SET 
        replicate_version_id = ${newVersionId},
        lora_weights_url = ${newLoraUrl},
        updated_at = NOW()
      WHERE id = ${model.id}
      RETURNING *
    `

    if (updateResult.length === 0) {
      console.log("❌ Failed to update model!")
      return
    }

    const updatedModel = updateResult[0]
    console.log("✅ Model updated successfully!")
    console.log()
    console.log("📦 Updated Model:")
    console.log("   - ID:", updatedModel.id)
    console.log("   - Model:", updatedModel.replicate_model_id)
    console.log("   - New Version:", updatedModel.replicate_version_id)
    console.log("   - New LoRA URL:", updatedModel.lora_weights_url ? updatedModel.lora_weights_url.substring(0, 100) + "..." : "NULL")
    console.log("   - LoRA Scale:", updatedModel.lora_scale)
    console.log("   - Updated:", updatedModel.updated_at)
    console.log()

    console.log("💡 Next Steps:")
    console.log("   1. Test image generation with the old model")
    console.log("   2. Compare results to see if quality improves")
    console.log("   3. If better, keep this version")
    console.log("   4. If still plastic, may need to retrain with better images")

  } catch (error) {
    console.error("❌ Error switching model:", error)
    throw error
  }
}

switchSandraModel()
  .then(() => {
    console.log("\n✅ Switch complete")
    process.exit(0)
  })
  .catch((error) => {
    console.error("❌ Switch failed:", error)
    process.exit(1)
  })
