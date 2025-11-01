import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function checkMagdalenaLora() {
  console.log("=== CHECKING MAGDALENA'S LORA SETUP ===\n")

  // Check user and model data
  const userResult = await sql`
    SELECT 
      u.id,
      u.email,
      u.first_name,
      u.last_name,
      u.gender,
      u.created_at as user_created_at,
      um.id as model_id,
      um.training_status,
      um.training_progress,
      um.lora_weights_url,
      um.lora_scale,
      um.trigger_word,
      um.replicate_model_id,
      um.replicate_version_id,
      um.training_id,
      um.model_name,
      um.created_at as model_created_at,
      um.started_at as model_started_at,
      um.completed_at as model_completed_at
    FROM users u
    LEFT JOIN user_models um ON u.id = um.user_id
    WHERE u.email = 'magdalena@nordicnuance.net'
    ORDER BY um.created_at DESC
    LIMIT 1
  `

  if (userResult.length === 0) {
    console.log("❌ User not found: magdalena@nordicnuance.net")
    return
  }

  const user = userResult[0]

  console.log("USER INFORMATION:")
  console.log("─".repeat(80))
  console.log(`Email: ${user.email}`)
  console.log(`Name: ${user.first_name} ${user.last_name}`)
  console.log(`User ID: ${user.id}`)
  console.log(`Gender: ${user.gender || "Not set"}`)
  console.log(`User Created: ${user.user_created_at}`)
  console.log()

  if (!user.model_id) {
    console.log("❌ NO MODEL FOUND")
    console.log("This user has not started training yet.")
    return
  }

  console.log("MODEL INFORMATION:")
  console.log("─".repeat(80))
  console.log(`Model ID: ${user.model_id}`)
  console.log(`Model Name: ${user.model_name || "Not set"}`)
  console.log(`Training Status: ${user.training_status}`)
  console.log(`Training Progress: ${user.training_progress}%`)
  console.log(`Trigger Word: ${user.trigger_word || "Not set"}`)
  console.log()

  console.log("REPLICATE INFORMATION:")
  console.log("─".repeat(80))
  console.log(`Training ID: ${user.training_id || "Not set"}`)
  console.log(`Model ID: ${user.replicate_model_id || "Not set"}`)
  console.log(`Version ID: ${user.replicate_version_id || "Not set"}`)
  console.log()

  console.log("LORA WEIGHTS:")
  console.log("─".repeat(80))
  console.log(`LoRA Scale: ${user.lora_scale || "Not set (will default to 1.05)"}`)

  if (user.lora_weights_url) {
    console.log(`✅ LoRA Weights URL: ${user.lora_weights_url}`)
  } else {
    console.log("❌ LoRA Weights URL: NOT SET")
  }
  console.log()

  console.log("TIMELINE:")
  console.log("─".repeat(80))
  console.log(`Model Created: ${user.model_created_at}`)
  console.log(`Training Started: ${user.model_started_at || "Not started"}`)
  console.log(`Training Completed: ${user.model_completed_at || "Not completed"}`)
  console.log()

  // Validation checks
  console.log("VALIDATION CHECKS:")
  console.log("─".repeat(80))

  const checks = [
    {
      name: "Training Status",
      pass: user.training_status === "completed",
      value: user.training_status,
      expected: "completed",
    },
    {
      name: "LoRA Weights URL",
      pass: user.lora_weights_url !== null && user.lora_weights_url.trim() !== "",
      value: user.lora_weights_url ? "Set" : "Missing",
      expected: "Set",
    },
    {
      name: "Replicate Version ID",
      pass: user.replicate_version_id !== null,
      value: user.replicate_version_id || "Missing",
      expected: "Set",
    },
    {
      name: "Trigger Word",
      pass: user.trigger_word !== null,
      value: user.trigger_word || "Missing",
      expected: "Set",
    },
    {
      name: "LoRA Scale",
      pass: user.lora_scale !== null,
      value: user.lora_scale || "Missing (will use default 1.05)",
      expected: "Set",
    },
  ]

  checks.forEach((check) => {
    const icon = check.pass ? "✅" : "❌"
    console.log(`${icon} ${check.name}: ${check.value} (expected: ${check.expected})`)
  })

  console.log()

  // Overall status
  const allPassed = checks.every((c) => c.pass)
  if (allPassed) {
    console.log("🎉 ALL CHECKS PASSED!")
    console.log("This user's LoRA model is properly configured and ready for image generation.")
  } else {
    console.log("⚠️  SOME CHECKS FAILED")
    console.log("This user's LoRA model may not work correctly for image generation.")

    if (!user.lora_weights_url) {
      console.log("\n💡 RECOMMENDED ACTION:")
      console.log("The LoRA weights URL is missing. This typically happens when:")
      console.log("1. Training hasn't completed yet")
      console.log("2. Training completed but the webhook didn't update the database")
      console.log("3. The Replicate API didn't return the weights URL")
      console.log("\nTo fix:")
      console.log("- Check the training status on Replicate")
      console.log("- Run the training progress endpoint to refresh the status")
      console.log("- Use scripts/27-fix-missing-lora-url.ts to manually set the URL")
    }
  }

  // Test query that image generation would use
  console.log("\n=== IMAGE GENERATION QUERY TEST ===")
  const imageGenQuery = await sql`
    SELECT 
      u.gender,
      um.trigger_word,
      um.replicate_version_id,
      um.training_status,
      um.lora_scale,
      um.lora_weights_url
    FROM users u
    LEFT JOIN user_models um ON u.id = um.user_id
    WHERE u.id = ${user.id}
    AND um.training_status = 'completed'
    ORDER BY um.created_at DESC
    LIMIT 1
  `

  if (imageGenQuery.length === 0) {
    console.log("❌ Image generation query returned NO RESULTS")
    console.log("This means image generation will fail with 'No trained model found'")
  } else {
    console.log("✅ Image generation query returned results:")
    console.log(JSON.stringify(imageGenQuery[0], null, 2))

    if (!imageGenQuery[0].lora_weights_url) {
      console.log("\n❌ BUT LoRA weights URL is missing!")
      console.log("Image generation will fail with 'LoRA weights URL not found'")
    } else {
      console.log("\n✅ LoRA weights URL is present and will be sent to Replicate")
    }
  }
}

checkMagdalenaLora()
  .then(() => {
    console.log("\n✅ Check complete!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("❌ Check failed:", error)
    process.exit(1)
  })
