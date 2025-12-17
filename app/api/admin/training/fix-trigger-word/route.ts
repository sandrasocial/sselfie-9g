import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getReplicateClient } from "@/lib/replicate-client"
import { neon } from "@neondatabase/serverless"

const ADMIN_EMAIL = "ssa@ssasocial.com"
const sql = neon(process.env.DATABASE_URL!)

/**
 * Admin endpoint to fix trigger word for a user
 * 
 * This endpoint:
 * 1. Checks if user has training in progress with wrong trigger word
 * 2. Cancels the training if needed
 * 3. Updates the trigger word in the database
 * 4. Returns instructions for restarting training
 * 
 * POST /api/admin/training/fix-trigger-word
 * Body: { userId: string }
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    // Get user's current model status
    const currentModel = await sql`
      SELECT 
        id,
        user_id,
        training_status,
        training_id,
        trigger_word,
        replicate_model_id,
        created_at,
        updated_at
      FROM user_models
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (currentModel.length === 0) {
      return NextResponse.json({ error: "No model found for this user" }, { status: 404 })
    }

    const model = currentModel[0]

    // Get the original trigger word from the first completed training
    const originalModel = await sql`
      SELECT trigger_word
      FROM user_models
      WHERE user_id = ${userId}
      AND training_status = 'completed'
      ORDER BY created_at ASC
      LIMIT 1
    `

    if (originalModel.length === 0) {
      return NextResponse.json({ 
        error: "No completed model found. Cannot determine original trigger word.",
        suggestion: "This might be a first-time training. Check the trigger word manually."
      }, { status: 400 })
    }

    const originalTriggerWord = originalModel[0].trigger_word
    const currentTriggerWord = model.trigger_word

    console.log("[v0] [ADMIN] Trigger word check:", {
      userId,
      currentTriggerWord,
      originalTriggerWord,
      trainingStatus: model.training_status,
      hasTrainingId: !!model.training_id,
    })

    // Check if trigger words match
    if (currentTriggerWord === originalTriggerWord) {
      return NextResponse.json({
        success: true,
        message: "Trigger word is already correct",
        triggerWord: currentTriggerWord,
        trainingStatus: model.training_status,
      })
    }

    // If training is in progress, check status first and try to cancel
    if (model.training_status === "training" || model.training_status === "processing") {
      if (!model.training_id) {
        return NextResponse.json({
          error: "Training is in progress but no training_id found",
          suggestion: "Check the database manually"
        }, { status: 400 })
      }

      try {
        // First, check the actual status on Replicate
        const replicate = getReplicateClient()
        const training = await replicate.trainings.get(model.training_id)
        
        console.log("[v0] [ADMIN] Current Replicate training status:", {
          training_id: model.training_id,
          status: training.status,
          created_at: training.created_at,
          started_at: training.started_at,
          completed_at: training.completed_at,
        })

        // If training is already completed/failed/canceled, we can't cancel it
        if (training.status === "succeeded" || training.status === "failed" || training.status === "canceled") {
          console.log("[v0] [ADMIN] Training is already", training.status, "- cannot cancel, but will update trigger word")
          
          // Update database status to match Replicate
          await sql`
            UPDATE user_models
            SET 
              training_status = ${training.status === "succeeded" ? "completed" : "failed"},
              failure_reason = ${training.status === "succeeded" ? null : (training.error || "Training completed with wrong trigger word")},
              updated_at = NOW()
            WHERE id = ${model.id}
          `

          // Update trigger word anyway
          await sql`
            UPDATE user_models
            SET 
              trigger_word = ${originalTriggerWord},
              updated_at = NOW()
            WHERE id = ${model.id}
          `

          return NextResponse.json({
            success: true,
            message: training.status === "succeeded" 
              ? "Training already completed. Trigger word updated. You'll need to retrain with correct trigger word."
              : "Training already finished. Trigger word updated.",
            actions: {
              canceled: false,
              trainingStatus: training.status,
              triggerWordUpdated: true,
              originalTriggerWord,
            },
            nextSteps: training.status === "succeeded"
              ? [
                  "Training completed but was trained with wrong trigger word",
                  "Trigger word has been updated in database",
                  "You need to retrain the model with the correct trigger word",
                  "The completed model won't work correctly with the new trigger word"
                ]
              : [
                  "Training already finished",
                  "Trigger word has been updated",
                  "You can now retrain with the correct trigger word"
                ]
          })
        }

        // Training is still in progress, try to cancel it
        try {
          await replicate.trainings.cancel(model.training_id)
          console.log("[v0] [ADMIN] Training canceled on Replicate:", model.training_id)

          // Update database
          await sql`
            UPDATE user_models
            SET 
              training_status = 'failed',
              failure_reason = 'Canceled by admin to fix trigger word',
              updated_at = NOW()
            WHERE id = ${model.id}
          `
        } catch (cancelError: any) {
          // Cancel might fail if training is too far along or already finished
          console.warn("[v0] [ADMIN] Could not cancel training (may be too far along):", cancelError.message)
          
          // Check status again - it might have completed while we tried to cancel
          const updatedTraining = await replicate.trainings.get(model.training_id)
          if (updatedTraining.status === "succeeded" || updatedTraining.status === "failed" || updatedTraining.status === "canceled") {
            console.log("[v0] [ADMIN] Training status changed to:", updatedTraining.status)
            
            await sql`
              UPDATE user_models
              SET 
                training_status = ${updatedTraining.status === "succeeded" ? "completed" : "failed"},
                failure_reason = ${updatedTraining.status === "succeeded" ? "Completed (needs retraining with correct trigger word)" : (updatedTraining.error || "Failed")},
                updated_at = NOW()
              WHERE id = ${model.id}
            `
          } else {
            // Still in progress, mark as failed in our DB anyway
            await sql`
              UPDATE user_models
              SET 
                training_status = 'failed',
                failure_reason = 'Canceled by admin (Replicate cancel may have failed)',
                updated_at = NOW()
              WHERE id = ${model.id}
            `
          }
        }

        // Update trigger word regardless of cancel success
        await sql`
          UPDATE user_models
          SET 
            trigger_word = ${originalTriggerWord},
            updated_at = NOW()
          WHERE id = ${model.id}
        `

        return NextResponse.json({
          success: true,
          message: "Trigger word fixed. Training cancellation attempted.",
          actions: {
            canceled: true,
            triggerWordUpdated: true,
            originalTriggerWord,
            newTriggerWord: originalTriggerWord,
          },
          nextSteps: [
            "Trigger word has been updated to the original",
            "Training cancellation was attempted (may not succeed if training is too far along)",
            "You can now restart training through the admin Maya testing interface",
            "The new training will use the correct trigger word automatically"
          ]
        })
      } catch (error: any) {
        console.error("[v0] [ADMIN] Error checking/canceling training:", error)
        
        // Update trigger word anyway - this is the most important part
        await sql`
          UPDATE user_models
          SET 
            trigger_word = ${originalTriggerWord},
            updated_at = NOW()
          WHERE id = ${model.id}
        `

        return NextResponse.json({
          success: true,
          warning: "Could not check/cancel training on Replicate, but trigger word was updated",
          error: error.message,
          actions: {
            canceled: false,
            triggerWordUpdated: true,
            originalTriggerWord,
          },
          nextSteps: [
            "Trigger word updated in database",
            "You may need to manually check/cancel the training on Replicate dashboard",
            "Or wait for it to complete and then retrain with correct trigger word",
            "The trigger word is now correct for future trainings"
          ]
        }, { status: 207 }) // 207 Multi-Status
      }
    } else {
      // Training is not in progress, just update the trigger word
      await sql`
        UPDATE user_models
        SET 
          trigger_word = ${originalTriggerWord},
          updated_at = NOW()
        WHERE id = ${model.id}
      `

      return NextResponse.json({
        success: true,
        message: "Trigger word updated",
        actions: {
          triggerWordUpdated: true,
          originalTriggerWord,
          previousTriggerWord: currentTriggerWord,
        },
        trainingStatus: model.training_status,
      })
    }
  } catch (error: any) {
    console.error("[v0] [ADMIN] Error fixing trigger word:", error)
    return NextResponse.json(
      {
        error: "Failed to fix trigger word",
        details: error.message || String(error),
      },
      { status: 500 }
    )
  }
}
