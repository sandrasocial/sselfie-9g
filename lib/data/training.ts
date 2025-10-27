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

export async function getLatestTrainedModel(userId: string): Promise<TrainedModel | null> {
  console.log("[v0] Fetching latest trained model for user:", userId)

  const models = await sql`
    SELECT * FROM user_models
    WHERE user_id = ${userId}
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
): Promise<TrainedModel> {
  console.log("[v0] Creating new training model for user:", userId)

  const result = await sql`
    INSERT INTO user_models (
      user_id,
      model_name,
      model_type,
      training_status,
      training_progress,
      created_at,
      updated_at
    )
    VALUES (
      ${userId},
      ${modelName},
      ${modelType},
      'pending',
      0,
      NOW(),
      NOW()
    )
    RETURNING *
  `

  console.log("[v0] Created training model:", result[0])
  return result[0] as TrainedModel
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
