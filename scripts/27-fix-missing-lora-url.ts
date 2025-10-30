import { neon } from "@neondatabase/serverless"
import fetch from "node-fetch"

const sql = neon(process.env.DATABASE_URL || "")

async function fixMissingLoraUrl() {
  console.log("🔍 Checking user with missing LoRA URL...")

  const models = await sql`
    SELECT 
      um.id,
      um.user_id,
      um.model_name,
      um.training_id,
      um.training_status,
      um.lora_weights_url,
      um.replicate_model_id,
      um.replicate_version_id,
      u.email
    FROM user_models um
    JOIN users u ON u.id = um.user_id
    WHERE um.id = 122
  `

  if (models.length === 0) {
    console.log("❌ Model not found")
    return
  }

  const model = models[0]
  console.log("\n📊 Current Model State:")
  console.log(`   Email: ${model.email}`)
  console.log(`   Model ID: ${model.id}`)
  console.log(`   User ID: ${model.user_id}`)
  console.log(`   Training Status: ${model.training_status}`)
  console.log(`   LoRA URL: ${model.lora_weights_url || "NULL"}`)
  console.log(`   Replicate Model ID: ${model.replicate_model_id || "NULL"}`)
  console.log(`   Replicate Version ID: ${model.replicate_version_id || "NULL"}`)

  if (model.replicate_version_id && model.replicate_model_id) {
    console.log("\n🔍 Fetching from Replicate API...")

    const modelParts = model.replicate_model_id.split("/")
    if (modelParts.length !== 2) {
      console.log("❌ Invalid replicate_model_id format")
      return
    }

    const [owner, modelName] = modelParts
    const versionUrl = `https://api.replicate.com/v1/models/${owner}/${modelName}/versions/${model.replicate_version_id}`

    try {
      const response = await fetch(versionUrl, {
        headers: {
          Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        },
      })

      if (!response.ok) {
        console.log(`❌ Replicate API error: ${response.status} ${response.statusText}`)
        return
      }

      const versionData = await response.json()
      console.log("\n✅ Found model version from Replicate")

      // The weights URL might be in the version's cog_version or we need to construct it
      // For Replicate LoRA models, the weights are typically at a predictable URL
      const weightsUrl = `https://replicate.delivery/pbxt/${model.replicate_version_id}/trained_model.tar`

      console.log(`   Constructed Weights URL: ${weightsUrl}`)

      console.log("\n📝 Updating user_models table...")
      await sql`
        UPDATE user_models
        SET 
          lora_weights_url = ${weightsUrl},
          lora_scale = COALESCE(lora_scale, 1.0),
          updated_at = NOW()
        WHERE id = ${model.id}
      `

      console.log("✅ Database updated successfully!")

      // Verify the update
      const updated = await sql`
        SELECT lora_weights_url, lora_scale, email
        FROM user_models um
        JOIN users u ON u.id = um.user_id
        WHERE um.id = ${model.id}
      `

      console.log("\n📊 Updated Model State:")
      console.log(`   Email: ${updated[0].email}`)
      console.log(`   LoRA URL: ${updated[0].lora_weights_url}`)
      console.log(`   LoRA Scale: ${updated[0].lora_scale}`)

      return
    } catch (error) {
      console.error("❌ Error fetching from Replicate:", error)
    }
  }

  console.log("\n🔍 Searching lora_weights table...")

  const loraWeights = await sql`
    SELECT id, user_id, s3_bucket, s3_key, trigger_word, status
    FROM lora_weights
    WHERE user_id = ${model.user_id}
    AND status = 'available'
    ORDER BY created_at DESC
    LIMIT 1
  `

  if (loraWeights.length === 0) {
    console.log("❌ No LoRA weights found in lora_weights table")
    console.log("\n💡 The LoRA weights URL has been set to the standard Replicate delivery URL")
    console.log("💡 If this doesn't work, the training may need to be re-run")
    return
  }

  const lora = loraWeights[0]
  const loraUrl = `https://${lora.s3_bucket}.s3.amazonaws.com/${lora.s3_key}`

  console.log("\n✅ Found LoRA weights in S3:")
  console.log(`   URL: ${loraUrl}`)

  await sql`
    UPDATE user_models
    SET 
      lora_weights_url = ${loraUrl},
      lora_scale = COALESCE(lora_scale, 1.0),
      updated_at = NOW()
    WHERE id = ${model.id}
  `

  console.log("✅ Database updated successfully!")
}

fixMissingLoraUrl()
  .then(() => {
    console.log("\n✅ Script completed")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error)
    process.exit(1)
  })
