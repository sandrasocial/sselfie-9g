import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface TrainedModel {
  id: number
  user_id: string
  model_name: string
  model_type: string
  training_status: string
  training_progress: number
  replicate_model_id: string | null
  replicate_version_id: string | null
  trigger_word: string | null
  lora_weights_url: string | null
  training_id: string | null
  started_at: Date | null
  completed_at: Date | null
  estimated_completion_time: Date | null
  failure_reason: string | null
  is_test: boolean | null
  created_at: Date
  updated_at: Date
}

export interface TrainingImage {
  id: number
  user_id: string
  filename: string
  original_url: string
  processed_url: string | null
  processing_status: string
  validation_status: string | null
  created_at: Date
}

export async function getUserTrainedModels(userId: string): Promise<TrainedModel[]> {
  console.log("[v0] Fetching trained models for user:", userId)

  const models = await sql`
    SELECT * FROM user_models
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `

  console.log("[v0] Found trained models:", models.length)
  return models as TrainedModel[]
}

export async function getLatestTrainedModel(userId: string, includeTest: boolean = false): Promise<TrainedModel | null> {
  console.log("[v0] Fetching latest trained model for user:", userId, "includeTest:", includeTest)

  const models = await sql`
    SELECT * FROM user_models
    WHERE user_id = ${userId}
    ${includeTest ? sql`` : sql`AND (is_test = false OR is_test IS NULL)`}
    ORDER BY created_at DESC
    LIMIT 1
  `

  if (models.length === 0) {
    console.log("[v0] No trained models found")
    return null
  }

  console.log("[v0] Latest model:", models[0])
  return models[0] as TrainedModel
}

export async function getOrCreateTrainingModel(
  userId: string,
  modelName: string,
  modelType: string,
  triggerWord: string,
  isTest: boolean = false,
): Promise<TrainedModel> {
  console.log("[v0] Getting or creating training model for user:", userId, "isTest:", isTest)

  // CRITICAL FIX: Check for ANY existing model for this user (test or production)
  // Because user_models has a unique constraint on user_id, we can only ever have
  // ONE row per user. So:
  // - For test runs (isTest = true), we want to reuse the same row and just mark is_test = true
  // - For production runs (isTest = false), we ALSO reuse the same row (even if it was a test row)
  //   and flip is_test to false, instead of trying to INSERT a new row.
  //
  // We therefore ALWAYS include test models in the search here.
  const existingModel = await getLatestTrainedModel(userId, true)

  if (existingModel) {
    console.log("[v0] Found existing model, updating it for RETRAINING:", existingModel.id)
    console.log("[v0] Current training status:", existingModel.training_status)
    console.log("[v0] Original trigger word:", existingModel.trigger_word)
    console.log("[v0] New trigger word provided:", triggerWord)
    console.log("[v0] Original LoRA scale:", existingModel.lora_scale)

    // CRITICAL:
    // - For TEST runs (isTest = true): preserve the existing trigger word if present
    //   to avoid changing the LoRA trigger mid-test.
    // - For PRODUCTION runs (isTest = false): ALWAYS use the canonical triggerWord passed in.
    //   This lets us safely convert a previous test row into the user's real production model
    //   (e.g. when a test-only user now trains from inside their own account).
    const newTriggerWord =
      isTest && existingModel.trigger_word ? existingModel.trigger_word : triggerWord
    
    // CRITICAL: Preserve LoRA scale if it was customized (not default 1.0)
    // Only reset to 1.0 if it was never set or is null
    const preservedLoraScale =
      existingModel.lora_scale && parseFloat(existingModel.lora_scale) !== 1.0
        ? existingModel.lora_scale
        : null // Will default to 1.0 in progress route

    console.log("[v0] ✅ Using trigger word for this run:", newTriggerWord)
    if (preservedLoraScale) {
      console.log("[v0] ✅ Preserving custom LoRA scale:", preservedLoraScale)
    }

    // CRITICAL FIX: Preserve replicate_model_id when updating for retraining
    // We need it to reuse the same model name on Replicate
    // Only clear it if it doesn't exist (shouldn't happen for completed models)
    const preservedModelId = existingModel.replicate_model_id
    
    // CRITICAL FIX: Update the existing model by ID (most reliable)
    // Use user_id as backup in WHERE clause to ensure we update the right model
    try {
      const result = await sql`
        UPDATE user_models
        SET 
          model_name = ${modelName},
          model_type = ${modelType},
          trigger_word = ${newTriggerWord}, -- Use preserved or canonical trigger word based on isTest
          training_status = 'pending',
          training_progress = 0,
          training_id = NULL,
          replicate_model_id = ${preservedModelId}, -- CRITICAL FIX: Preserve model ID for retraining (needed to reuse model name)
          replicate_version_id = NULL, -- Will be set when training completes
          lora_weights_url = NULL, -- Will be set when training completes
          started_at = NULL,
          completed_at = NULL,
          estimated_completion_time = NULL,
          failure_reason = NULL,
          is_test = ${isTest}, -- Set test flag
          updated_at = NOW()
        WHERE id = ${existingModel.id}
          AND user_id = ${userId} -- CRITICAL: Double-check user_id to prevent updating wrong model
        RETURNING *
      `

      if (result.length === 0) {
        // UPDATE didn't match - this shouldn't happen, but handle gracefully
        console.error("[v0] ⚠️ UPDATE didn't match any rows! Model ID:", existingModel.id, "User ID:", userId)
        throw new Error(`Failed to update existing model. Model may have been deleted or ID mismatch.`)
      }

      console.log("[v0] ✅ Model updated for retraining with preserved trigger word")
      return result[0] as TrainedModel
    } catch (error: any) {
      // If UPDATE fails, log the error and rethrow
      console.error("[v0] ❌ Error updating model for retraining:", error)
      console.error("[v0] Existing model details:", {
        id: existingModel.id,
        user_id: existingModel.user_id,
        training_status: existingModel.training_status,
      })
      throw error
    }
  }

  // Create new model if none exists
  console.log("[v0] No existing model found, creating new one (first-time training)")
  return createTrainingModel(userId, modelName, modelType, "", triggerWord, isTest)
}

export async function getUserTrainingImages(userId: string): Promise<TrainingImage[]> {
  console.log("[v0] Fetching training images for user:", userId)

  const images = await sql`
    SELECT * FROM selfie_uploads
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `

  console.log("[v0] Found training images:", images.length)
  return images as TrainingImage[]
}

export async function createTrainingModel(
  userId: string,
  modelName: string,
  modelType: string,
  gender: string,
  triggerWord: string, // Made required again since DB has NOT NULL constraint
  isTest: boolean = false,
): Promise<TrainedModel> {
  console.log("[v0] Creating new training model for user:", userId, "isTest:", isTest)
  console.log("[v0] Model details:", {
    modelName,
    modelType,
    triggerWord,
    userId,
  })

  try {
    const result = await sql`
      INSERT INTO user_models (
        user_id,
        model_name,
        model_type,
        training_status,
        training_progress,
        trigger_word,
        is_test,
        created_at,
        updated_at
      )
      VALUES (
        ${userId},
        ${modelName},
        ${modelType},
        'pending',
        0,
        ${triggerWord},
        ${isTest},
        NOW(),
        NOW()
      )
      RETURNING *
    `

    console.log("[v0] Created training model:", result[0])
    return result[0] as TrainedModel
  } catch (error: any) {
    console.error("[v0] ❌ Error creating training model:", {
      message: error?.message,
      code: error?.code,
      constraint: error?.constraint,
      detail: error?.detail,
      hint: error?.hint,
      userId,
      modelName,
      triggerWord,
      isTest,
    })
    throw error
  }
}

export async function updateTrainingProgress(modelId: number, progress: number, status: string): Promise<void> {
  console.log("[v0] Updating training progress:", { modelId, progress, status })

  await sql`
    UPDATE user_models
    SET 
      training_progress = ${progress},
      training_status = ${status},
      updated_at = NOW()
    WHERE id = ${modelId}
  `
}

export async function updateTrainingWithReplicate(
  modelId: number,
  trainingId: string,
  triggerWord: string,
): Promise<void> {
  console.log("[v0] Updating training with Replicate details:", { modelId, trainingId })

  await sql`
    UPDATE user_models
    SET 
      training_id = ${trainingId},
      trigger_word = ${triggerWord},
      training_status = 'training',
      started_at = NOW(),
      updated_at = NOW()
    WHERE id = ${modelId}
  `
}

export async function completeTraining(
  modelId: number,
  replicateModelId: string,
  replicateVersionId: string,
  triggerWord: string,
  loraWeightsUrl: string,
): Promise<void> {
  console.log("[v0] Completing training for model:", modelId)

  await sql`
    UPDATE user_models
    SET 
      training_status = 'completed',
      training_progress = 100,
      replicate_model_id = ${replicateModelId},
      replicate_version_id = ${replicateVersionId},
      trigger_word = ${triggerWord},
      lora_weights_url = ${loraWeightsUrl},
      completed_at = NOW(),
      updated_at = NOW()
    WHERE id = ${modelId}
  `
}

export async function failTraining(modelId: number, reason: string): Promise<void> {
  console.log("[v0] Marking training as failed:", { modelId, reason })

  await sql`
    UPDATE user_models
    SET 
      training_status = 'failed',
      failure_reason = ${reason},
      updated_at = NOW()
    WHERE id = ${modelId}
  `
}

export async function deleteTrainingImage(imageId: number, userId: string): Promise<void> {
  await sql`
    DELETE FROM selfie_uploads
    WHERE id = ${imageId} AND user_id = ${userId}
  `
}
