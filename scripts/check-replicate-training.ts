/**
 * Check Replicate training details for Sandra's model
 */

import * as dotenv from "dotenv"
import { Replicate } from "replicate"

dotenv.config({ path: ".env.local" })
dotenv.config({ path: ".env" })

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

async function checkReplicateTraining() {
  try {
    console.log("🔍 Checking Replicate Training for Sandra\n")
    
    const modelName = "sandrasocial/user-5040000c-selfie-lora"
    const versionId = "a6918e48c02f7ec453ee4c18cd3ddb0f921421677eae1f68dd9cc83230cc55c5"
    
    console.log(`Model: ${modelName}`)
    console.log(`Version: ${versionId}\n`)
    
    // Get model details
    try {
      const model = await replicate.models.get(modelName)
      console.log("✅ Model found on Replicate")
      console.log(`   - Owner: ${model.owner}`)
      console.log(`   - Name: ${model.name}`)
      console.log(`   - Description: ${model.description || 'N/A'}`)
      console.log(`   - Visibility: ${model.visibility || 'N/A'}`)
      console.log(`   - GitHub URL: ${model.github_url || 'N/A'}`)
      console.log()
      
      // Get version details
      const version = await replicate.models.versions.get(modelName, versionId)
      console.log("✅ Version details:")
      console.log(`   - ID: ${version.id}`)
      console.log(`   - Created: ${version.created_at}`)
      console.log(`   - Cog Version: ${version.cog_version || 'N/A'}`)
      console.log(`   - OpenAPI Schema: ${version.openapi_schema ? 'Present' : 'N/A'}`)
      
      if (version.training_job) {
        console.log(`\n📚 Training Job Information:`)
        console.log(`   - Training Job ID: ${version.training_job}`)
        
        // Try to get training job details
        try {
          // Note: Replicate API might not expose training job details directly
          // But we can check if there's a way to get it
          console.log(`   → Training job exists but details may not be accessible via API`)
          console.log(`   → Check on Replicate dashboard: https://replicate.com/${modelName}/versions`)
        } catch (e) {
          console.log(`   ⚠️  Could not fetch training job details: ${e}`)
        }
      } else {
        console.log(`\n⚠️  No training job information in version metadata`)
      }
      
      // Check if we can get the model's training info
      console.log(`\n💡 To check training details:`)
      console.log(`   → Visit: https://replicate.com/${modelName}/versions/${versionId}`)
      console.log(`   → Check training parameters, number of images, training duration`)
      
    } catch (error: any) {
      console.error(`❌ Error fetching model from Replicate:`, error.message)
      if (error.status === 404) {
        console.log(`   → Model not found - may have been deleted or is private`)
      }
    }
    
    // Check LoRA file directly
    const loraUrl = "https://replicate.delivery/xezq/fesc2oMlXVrP5EeoOS4WRSbHi8Y0Mxzy0Qy58fCAVpxcHOMXB/flux-lora.tar"
    console.log(`\n📦 LoRA File Check:`)
    console.log(`   - URL: ${loraUrl}`)
    console.log(`   → Try accessing URL to verify it's still valid`)
    console.log(`   → Check file size (should be ~50-200MB for a good LoRA)`)
    
  } catch (error) {
    console.error("❌ Error:", error)
    throw error
  }
}

checkReplicateTraining()
  .then(() => {
    console.log("\n✅ Check complete")
    process.exit(0)
  })
  .catch((error) => {
    console.error("❌ Check failed:", error)
    process.exit(1)
  })
