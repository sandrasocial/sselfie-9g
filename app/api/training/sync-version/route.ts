import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
import { getDbClient } from "@/lib/db-singleton"

const sql = getDbClient()

/**
 * Sync Model Version Endpoint
 * 
 * Updates existing user models to use the latest version from Replicate
 * without requiring retraining. This fixes cases where:
 * - Version ID is stored in wrong format
 * - Version ID is outdated (from before latest retraining)
 * 
 * POST /api/training/sync-version
 */
export async function POST() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const neonUser = await getEffectiveNeonUser(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get user's latest completed model
    const models = await sql`
      SELECT 
        id,
        replicate_model_id,
        replicate_version_id,
        lora_weights_url,
        training_status
      FROM user_models
      WHERE user_id = ${neonUser.id}
      AND training_status = 'completed'
      AND (is_test = false OR is_test IS NULL)
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (models.length === 0) {
      return NextResponse.json(
        { error: "No completed model found. Please complete training first." },
        { status: 400 }
      )
    }

    const model = models[0]

    if (!model.replicate_model_id) {
      return NextResponse.json(
        { error: "Model ID not found. Please retrain your model." },
        { status: 400 }
      )
    }

    // Fetch latest version from Replicate
    try {
      const modelResponse = await fetch(
        `https://api.replicate.com/v1/models/${model.replicate_model_id}/versions`,
        {
          headers: {
            Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
          },
        }
      )

      if (!modelResponse.ok) {
        console.error("[v0] Failed to fetch versions from Replicate:", modelResponse.status)
        return NextResponse.json(
          { error: "Failed to fetch model versions from Replicate" },
          { status: 500 }
        )
      }

      const versionsData = await modelResponse.json()
      const latestVersion = versionsData.results?.[0]

      if (!latestVersion || !latestVersion.id) {
        return NextResponse.json(
          { error: "No versions found for this model" },
          { status: 404 }
        )
      }

      const latestVersionHash = latestVersion.id
      const currentVersionHash = model.replicate_version_id?.includes(':')
        ? model.replicate_version_id.split(':')[1]
        : model.replicate_version_id

      // Check if update is needed
      if (currentVersionHash === latestVersionHash) {
        return NextResponse.json({
          success: true,
          message: "Model is already using the latest version",
          version: latestVersionHash,
          updated: false,
        })
      }

      // Update to latest version
      const updatedLoraUrl = `https://replicate.delivery/pbxt/${latestVersionHash}/flux-lora.tar`

      await sql`
        UPDATE user_models
        SET 
          replicate_version_id = ${latestVersionHash},
          lora_weights_url = ${updatedLoraUrl},
          updated_at = NOW()
        WHERE id = ${model.id}
      `

      console.log("[v0] ✅ Synced model version:", {
        userId: neonUser.id,
        modelId: model.id,
        oldVersion: currentVersionHash,
        newVersion: latestVersionHash,
      })

      return NextResponse.json({
        success: true,
        message: "Model version updated to latest",
        oldVersion: currentVersionHash,
        newVersion: latestVersionHash,
        updated: true,
      })
    } catch (replicateError: any) {
      console.error("[v0] Error syncing version:", replicateError)
      return NextResponse.json(
        {
          error: "Failed to sync version",
          details: replicateError.message || "Unknown error",
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("[v0] Error in sync-version endpoint:", error)
    return NextResponse.json(
      { error: "Failed to sync model version" },
      { status: 500 }
    )
  }
}
