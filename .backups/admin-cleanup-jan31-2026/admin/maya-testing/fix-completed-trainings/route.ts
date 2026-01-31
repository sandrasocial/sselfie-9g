import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { getReplicateClient } from "@/lib/replicate-client"

const ADMIN_EMAIL = "ssa@ssasocial.com"
const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
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

    // Find all completed test trainings where user_models status doesn't match
    const completedTestTrainings = await sql`
      SELECT 
        mtt.id,
        mtt.test_user_id,
        mtt.replicate_model_id,
        mtt.training_status,
        mtt.metrics
      FROM maya_test_trainings mtt
      WHERE mtt.training_status = 'completed'
      AND mtt.test_user_id IS NOT NULL
      AND mtt.replicate_model_id IS NOT NULL
    `

    const fixed = []
    const alreadyFixed = []
    const errors = []

    for (const testTraining of completedTestTrainings) {
      try {
        // Check if user_models needs updating
        const userModels = await sql`
          SELECT id, training_status, replicate_model_id, replicate_version_id, lora_weights_url
          FROM user_models
          WHERE user_id = ${testTraining.test_user_id}
          ORDER BY created_at DESC
          LIMIT 1
        `

          if (userModels.length > 0) {
            const userModel = userModels[0]
            
            // Extract version_id and lora_weights_url from metrics if available
            const metrics = typeof testTraining.metrics === 'string' 
              ? JSON.parse(testTraining.metrics) 
              : (testTraining.metrics || {})
            
            let replicateVersionId = metrics.replicate_version_id || null
            let loraWeightsUrl = metrics.lora_weights_url || null
            
            // If missing, try to fetch from Replicate
            if ((!replicateVersionId || !loraWeightsUrl) && testTraining.replicate_model_id) {
              try {
                const replicate = getReplicateClient()
                const modelParts = testTraining.replicate_model_id.split('/')
                
                if (modelParts.length === 2) {
                  const versions = await replicate.models.versions.list(modelParts[0], modelParts[1])
                  if (versions.results && versions.results.length > 0) {
                    const latestVersion = versions.results[0]
                    replicateVersionId = latestVersion.id
                    loraWeightsUrl = `https://replicate.delivery/pbxt/${latestVersion.id}/flux-lora.tar`
                    console.log("[v0] [TESTING] Fetched missing fields from Replicate for:", testTraining.test_user_id)
                  }
                }
              } catch (fetchError: any) {
                console.error("[v0] [TESTING] Failed to fetch from Replicate:", fetchError)
              }
            }
            
            // Check if update is needed
            const needsUpdate = 
              userModel.training_status !== 'completed' ||
              userModel.replicate_model_id !== testTraining.replicate_model_id ||
              (replicateVersionId && userModel.replicate_version_id !== replicateVersionId) ||
              (loraWeightsUrl && userModel.lora_weights_url !== loraWeightsUrl)
            
            if (needsUpdate) {
              // Update to match test training status
              await sql`
                UPDATE user_models
                SET 
                  training_status = 'completed',
                  replicate_model_id = ${testTraining.replicate_model_id},
                  replicate_version_id = COALESCE(${replicateVersionId}, replicate_version_id),
                  lora_weights_url = COALESCE(${loraWeightsUrl}, lora_weights_url),
                  completed_at = COALESCE(completed_at, NOW()),
                  updated_at = NOW()
                WHERE id = ${userModel.id}
              `
              fixed.push({
                test_user_id: testTraining.test_user_id,
                user_model_id: userModel.id,
                old_status: userModel.training_status,
                updated_fields: {
                  replicate_model_id: !!testTraining.replicate_model_id,
                  replicate_version_id: !!replicateVersionId,
                  lora_weights_url: !!loraWeightsUrl,
                },
              })
              console.log("[v0] [TESTING] Fixed user_models for test user:", testTraining.test_user_id, {
                replicate_version_id: replicateVersionId ? "set" : "null",
                lora_weights_url: loraWeightsUrl ? "set" : "null",
              })
            } else {
              alreadyFixed.push({
                test_user_id: testTraining.test_user_id,
                user_model_id: userModel.id,
              })
            }
          } else {
            errors.push({
              test_user_id: testTraining.test_user_id,
              error: "No user_model found",
            })
          }
      } catch (error: any) {
        errors.push({
          test_user_id: testTraining.test_user_id,
          error: error.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Checked ${completedTestTrainings.length} completed test trainings`,
      fixed: fixed.length,
      already_fixed: alreadyFixed.length,
      errors: errors.length,
      details: {
        fixed,
        alreadyFixed,
        errors,
      },
    })
  } catch (error: any) {
    console.error("[v0] Error fixing completed trainings:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fix completed trainings" },
      { status: 500 }
    )
  }
}






























