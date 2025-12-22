import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { getReplicateClient, FLUX_LORA_TRAINER_VERSION } from "@/lib/replicate-client"

const ADMIN_EMAIL = "ssa@ssasocial.com"
const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    // Verify admin access
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const testResultId = searchParams.get("test_result_id")

    if (!testResultId) {
      return NextResponse.json({ error: "test_result_id is required" }, { status: 400 })
    }

    // Get test training record
    const testTraining = await sql`
      SELECT 
        id,
        test_result_id,
        test_user_id,
        replicate_training_id,
        replicate_model_id,
        training_status,
        started_at,
        completed_at
      FROM maya_test_trainings
      WHERE test_result_id = ${parseInt(testResultId)}
      ORDER BY started_at DESC
      LIMIT 1
    `

    if (testTraining.length === 0) {
      return NextResponse.json({ error: "Test training not found" }, { status: 404 })
    }

    const training = testTraining[0]

        // If training is still running, check Replicate status
    if (training.training_status === "training" && training.replicate_training_id) {
      try {
        const replicate = getReplicateClient()
        const replicateTraining = await replicate.trainings.get(training.replicate_training_id)

        // Update status based on Replicate
        let newStatus = training.training_status
        if (replicateTraining.status === "succeeded") {
          newStatus = "completed"
          
          const testUserId = training.test_user_id
          // CRITICAL: Use the stored destination model ID (stored when training started)
          // This is the correct destination model (sandrasocial/test-xxx-lora)
          // NOT replicateTraining.model (which points to the trainer)
          let replicateModelId = training.replicate_model_id
          
          // Prefer training.output.model if it exists and looks correct (destination model format)
          if (replicateTraining.output?.model && replicateTraining.output.model.includes('lora')) {
            replicateModelId = replicateTraining.output.model
            console.log("[v0] [TESTING] ✅ Using destination model ID from training.output.model:", replicateModelId)
          } else if (!replicateModelId) {
            // Last resort: use replicateTraining.model, but this might be the trainer
            replicateModelId = replicateTraining.model
            console.warn("[v0] [TESTING] ⚠️ WARNING: Using replicateTraining.model (might be trainer!):", replicateModelId)
          } else {
            console.log("[v0] [TESTING] ✅ Using stored destination model ID:", replicateModelId)
          }
          
          // CRITICAL: Get version ID from the DESTINATION model (sandrasocial/test-xxx-lora)
          // NOT from training.output (which might be from the trainer)
          // Always fetch from the destination model to ensure we get the correct version
          let loraWeightsUrl = null
          let replicateVersionId = null
          
          // PRIMARY METHOD: Fetch version from destination model (most reliable)
          if (replicateModelId) {
            try {
              const replicate = getReplicateClient()
              const modelParts = replicateModelId.split('/')
              if (modelParts.length === 2) {
                const [owner, modelName] = modelParts
                
                // CRITICAL: Ensure we're getting version from destination model, not trainer
                if (modelName.includes('fast-flux-trainer')) {
                  console.error("[v0] [TESTING] ⚠️ ERROR: replicateModelId points to trainer! Should be destination model")
                  console.error("[v0] [TESTING] This usually means training.output.model is missing or incorrect")
                  // Don't throw - try to continue with fallback
                } else {
                  // Get latest version from destination model
                  // This returns versions of the destination model (sandrasocial/test-xxx-lora)
                  // The version.id is the hash (e.g., "1855b556")
                  const versions = await replicate.models.versions.list(owner, modelName)
                  if (versions.results && versions.results.length > 0) {
                    const latestVersion = versions.results[0]
                    // latestVersion.id should be just the hash (e.g., "1855b556")
                    // This is what we use for predictions.create({ version: "1855b556" })
                    replicateVersionId = latestVersion.id
                    loraWeightsUrl = `https://replicate.delivery/pbxt/${latestVersion.id}/flux-lora.tar`
                    
                    console.log("[v0] [TESTING] ✅ Got version from destination model:", {
                      destination_model: replicateModelId,
                      version_hash: replicateVersionId,
                      full_version_string: `${replicateModelId}:${replicateVersionId}`,
                      version_created_at: latestVersion.created_at,
                    })
                    
                    // Validate: version hash should NOT match trainer version
                    if (replicateVersionId === '56cb4a64' || replicateVersionId === FLUX_LORA_TRAINER_VERSION) {
                      console.error("[v0] [TESTING] ⚠️ ERROR: Version hash matches trainer version! This is wrong!")
                      console.error("[v0] [TESTING] Expected destination model version hash (e.g., 1855b556), got:", replicateVersionId)
                    }
                  } else {
                    console.warn("[v0] [TESTING] ⚠️ No versions found for destination model:", replicateModelId)
                  }
                }
              }
            } catch (err) {
              console.error("[v0] [TESTING] Failed to fetch version from destination model:", err)
            }
          }
          
          // FALLBACK: Try training.output.version if we don't have destination model version
          if (!replicateVersionId && replicateTraining.output) {
            if (replicateTraining.output.version) {
              const outputVersion = replicateTraining.output.version.includes(':')
                ? replicateTraining.output.version.split(':')[1]
                : replicateTraining.output.version
              
              replicateVersionId = outputVersion
              console.log("[v0] [TESTING] ⚠️ Using version from training.output (fallback):", outputVersion)
            }
            
            // Extract LoRA weights URL - Method 1: Direct weights URL
            if (!loraWeightsUrl && replicateTraining.output.weights) {
              loraWeightsUrl = replicateTraining.output.weights
            }
            // Method 2: Construct from version hash
            else if (!loraWeightsUrl && replicateVersionId) {
              loraWeightsUrl = `https://replicate.delivery/pbxt/${replicateVersionId}/flux-lora.tar`
            }
            // Method 3: String URL
            else if (!loraWeightsUrl && typeof replicateTraining.output === "string" && replicateTraining.output.startsWith("http")) {
              loraWeightsUrl = replicateTraining.output
            }
          }
          
          console.log("[v0] [TESTING] Training completed:", {
            replicateModelId,
            replicateVersionId,
            loraWeightsUrl,
            hasOutput: !!replicateTraining.output,
          })
          
          // Update test training record
          await sql`
            UPDATE maya_test_trainings
            SET 
              training_status = 'completed',
              completed_at = NOW(),
              replicate_model_id = ${replicateModelId || null},
              metrics = ${JSON.stringify({
                status: replicateTraining.status,
                completed_at: replicateTraining.completed_at,
                replicate_version_id: replicateVersionId,
                lora_weights_url: loraWeightsUrl,
              })}
            WHERE id = ${training.id}
          `

          // Update test result
          await sql`
            UPDATE maya_test_results
            SET 
              status = 'completed',
              results = ${JSON.stringify({
                training_status: "completed",
                replicate_model_id: replicateModelId,
                replicate_version_id: replicateVersionId,
                completed_at: replicateTraining.completed_at,
              })}
            WHERE id = ${training.test_result_id}
          `
          
          // CRITICAL: Also update user_models table so the user appears in the test user list
          if (testUserId && replicateModelId) {
            // Find the most recent training model for this user
            const userModel = await sql`
              SELECT id
              FROM user_models
              WHERE user_id = ${testUserId}
              AND training_status = 'training'
              ORDER BY created_at DESC
              LIMIT 1
            `
            
            if (userModel.length > 0) {
              await sql`
                UPDATE user_models
                SET 
                  training_status = 'completed',
                  replicate_model_id = ${replicateModelId},
                  replicate_version_id = ${replicateVersionId || null},
                  lora_weights_url = ${loraWeightsUrl || null},
                  completed_at = NOW(),
                  updated_at = NOW()
                WHERE id = ${userModel[0].id}
              `
              console.log("[v0] [TESTING] Updated user_models table for test user:", testUserId, "model id:", userModel[0].id, {
                replicate_model_id: replicateModelId,
                replicate_version_id: replicateVersionId,
                lora_weights_url: loraWeightsUrl ? "set" : "null",
              })
            } else {
              console.log("[v0] [TESTING] No training model found to update for test user:", testUserId)
            }
          }
        } else if (replicateTraining.status === "failed" || replicateTraining.status === "canceled") {
          newStatus = "failed"
          
          await sql`
            UPDATE maya_test_trainings
            SET 
              training_status = 'failed',
              metrics = ${JSON.stringify({
                status: replicateTraining.status,
                error: replicateTraining.error || "Training failed",
              })}
            WHERE id = ${training.id}
          `

          await sql`
            UPDATE maya_test_results
            SET 
              status = 'failed',
              results = ${JSON.stringify({
                training_status: "failed",
                error: replicateTraining.error || "Training failed",
              })}
            WHERE id = ${training.test_result_id}
          `
        }

        return NextResponse.json({
          success: true,
          status: newStatus,
          replicate_status: replicateTraining.status,
          progress: replicateTraining.status === "succeeded" ? 100 : 
                   replicateTraining.status === "processing" ? 50 : 0,
        })
      } catch (error: any) {
        console.error("[v0] Error checking Replicate training:", error)
        return NextResponse.json({
          success: true,
          status: training.training_status,
          error: error.message,
        })
      }
    }

    // If training is already completed but user_models wasn't updated, fix it
    if (training.training_status === "completed" && training.test_user_id && training.replicate_model_id) {
      const userModel = await sql`
        SELECT id, training_status
        FROM user_models
        WHERE user_id = ${training.test_user_id}
        ORDER BY created_at DESC
        LIMIT 1
      `
      
      if (userModel.length > 0 && userModel[0].training_status !== 'completed') {
        await sql`
          UPDATE user_models
          SET 
            training_status = 'completed',
            replicate_model_id = ${training.replicate_model_id},
            completed_at = NOW(),
            updated_at = NOW()
          WHERE id = ${userModel[0].id}
        `
        console.log("[v0] [TESTING] Fixed user_models status for completed test training:", training.test_user_id)
      }
    }

    return NextResponse.json({
      success: true,
      status: training.training_status,
      started_at: training.started_at,
      completed_at: training.completed_at,
    })
  } catch (error: any) {
    console.error("[v0] Error getting training progress:", error)
    return NextResponse.json(
      { error: error.message || "Failed to get training progress" },
      { status: 500 }
    )
  }
}






















