import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { getReplicateClient, FLUX_LORA_TRAINER, FLUX_LORA_TRAINER_VERSION, DEFAULT_TRAINING_PARAMS } from "@/lib/replicate-client"
import { createTrainingZip } from "@/lib/storage"
import { getOrCreateTrainingModel } from "@/lib/data/training"

const ADMIN_EMAIL = "ssa@ssasocial.com"
const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
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
    const { test_type, training_params, prompt_settings, generation_settings, test_name, test_user_id, image_urls, user_request, production_mode = false } = body

    if (!test_type) {
      return NextResponse.json({ error: "test_type is required" }, { status: 400 })
    }

    // Create test result record
    const testResult = await sql`
      INSERT INTO maya_test_results (
        test_name,
        test_type,
        test_user_id,
        configuration,
        created_by,
        status
      ) VALUES (
        ${test_name || `${test_type} test - ${new Date().toISOString()}`},
        ${test_type},
        ${test_user_id || null},
        ${JSON.stringify({
          training_params: training_params || null,
          prompt_settings: prompt_settings || null,
          generation_settings: generation_settings || null,
          user_request: user_request || null,
        })},
        ${neonUser.id},
        'pending'
      )
      RETURNING id, test_name
    `

    const testResultId = testResult[0].id

    // Handle different test types
    if (test_type === "training" && training_params) {
      if (!test_user_id) {
        return NextResponse.json({ error: "test_user_id is required for training tests" }, { status: 400 })
      }
      if (!image_urls || image_urls.length < 5) {
        return NextResponse.json({ error: "At least 5 training images are required" }, { status: 400 })
      }

      try {
        // Update status to running
        await sql`
          UPDATE maya_test_results
          SET status = 'running'
          WHERE id = ${testResultId}
        `

        const replicate = getReplicateClient()

        // Create training dataset ZIP
        console.log("[v0] [TESTING] Creating training ZIP from", image_urls.length, "images")
        const datasetUrl = await createTrainingZip(image_urls)
        
        if (!datasetUrl || typeof datasetUrl !== 'string') {
          throw new Error(`Invalid dataset URL returned: ${datasetUrl}`)
        }
        
        console.log("[v0] [TESTING] Dataset ZIP created:", datasetUrl.substring(0, 100) + "...")

        // CRITICAL: Get existing model first to preserve trigger word during retraining
        // Generate trigger word only if no existing model (first-time training)
        const existingModelCheck = await sql`
          SELECT trigger_word, created_at
          FROM user_models
          WHERE user_id = ${test_user_id}
          AND training_status = 'completed'
          ORDER BY created_at ASC
          LIMIT 1
        `
        
        // CRITICAL: Always use the ORIGINAL trigger word pattern: user{first8charsOfUserId}
        // This ensures consistency even if the trigger word was modified during promotion attempts
        const userIdPrefix = test_user_id.split('-')[0]
        const originalTriggerWordPattern = `user${userIdPrefix}`
        
        // Check if we have a first completed model and if its trigger word matches the pattern
        let triggerWord: string
        let isRetraining = false
        
        if (existingModelCheck.length > 0) {
          const firstModelTriggerWord = existingModelCheck[0].trigger_word
          // Check if the trigger word matches the original pattern (not modified)
          const isOriginalPattern = firstModelTriggerWord === originalTriggerWordPattern || 
                                   firstModelTriggerWord.startsWith(`user${userIdPrefix}`) && 
                                   !firstModelTriggerWord.includes('_test_') && 
                                   !firstModelTriggerWord.includes('_old_') && 
                                   !firstModelTriggerWord.includes('_replaced_')
          
          if (isOriginalPattern) {
            // Use the original trigger word from the first model
            triggerWord = firstModelTriggerWord
            isRetraining = true
            console.log("[v0] [TESTING] Using original trigger word from first completed model:", triggerWord)
          } else {
            // Trigger word was modified, use the pattern instead
            triggerWord = originalTriggerWordPattern
            isRetraining = true
            console.log("[v0] [TESTING] First model trigger word was modified, using original pattern:", triggerWord)
          }
        } else {
          // First-time training - use the pattern
          triggerWord = originalTriggerWordPattern
          console.log("[v0] [TESTING] First-time training, using pattern:", triggerWord)
        }
        
        console.log(`[v0] [TESTING] ${isRetraining ? 'RETRAINING' : 'FIRST-TIME TRAINING'}`)
        console.log("[v0] [TESTING] Final trigger word:", triggerWord)

        // Create test training record
        const testTraining = await sql`
          INSERT INTO maya_test_trainings (
            test_result_id,
            test_user_id,
            training_params,
            training_status,
            training_images_count,
            training_images_urls
          ) VALUES (
            ${testResultId},
            ${test_user_id},
            ${JSON.stringify(training_params)},
            'pending',
            ${image_urls.length},
            ${image_urls}
          )
          RETURNING id
        `

        const testTrainingId = testTraining[0].id

        // CRITICAL: Check if we're in production mode or test mode
        // Production mode: Update the user's actual production model (is_test = false)
        // Test mode: Create/update a test model (is_test = true)
        const isProductionMode = production_mode === true
        
        if (isProductionMode) {
          console.log("[v0] [TESTING] ⚠️ PRODUCTION MODE: Will update user's actual production model!")
          console.log("[v0] [TESTING] User ID:", test_user_id)
          
          // Verify the user exists and get their email for confirmation
          const targetUser = await sql`
            SELECT id, email, display_name
            FROM users
            WHERE id = ${test_user_id}
            LIMIT 1
          `
          
          if (targetUser.length === 0) {
            throw new Error(`User not found: ${test_user_id}`)
          }
          
          console.log("[v0] [TESTING] Production mode - Target user:", {
            id: targetUser[0].id,
            email: targetUser[0].email,
            name: targetUser[0].display_name,
          })
        }
        
        // CRITICAL FIX: Use getOrCreateTrainingModel to handle retraining scenarios
        // This will UPDATE existing model if one exists, or CREATE new one if not
        // CRITICAL: Always use the original trigger word pattern to avoid modified trigger words
        // CRITICAL: Set is_test based on production_mode flag
        const modelName = isProductionMode
          ? `${test_name || 'Production Model'}`
          : `Test Model - ${test_name || `Test #${testResultId}`}`
        
        const model = await getOrCreateTrainingModel(
          test_user_id,
          modelName,
          "flux-dev-lora",
          triggerWord, // This is now always the original pattern
          !isProductionMode // is_test = false for production mode, true for test mode
        )
        
        // CRITICAL: Always use the original trigger word pattern (not the model's current trigger word)
        // The model's trigger word may have been modified during promotion attempts
        // We MUST use the original pattern that the LoRA was trained with
        const actualTriggerWord = triggerWord // Use the pattern we calculated, not model.trigger_word
        console.log("[v0] [TESTING] Using trigger word for training (original pattern):", actualTriggerWord)
        console.log("[v0] [TESTING] Model's current trigger word (may be modified):", model.trigger_word)
        console.log("[v0] [TESTING] Production mode:", isProductionMode, "is_test:", !isProductionMode)
        
        // CRITICAL: Update the model's trigger word back to the original pattern if it was modified
        if (model.trigger_word !== actualTriggerWord) {
          console.log("[v0] [TESTING] Fixing model trigger word from modified to original:", {
            from: model.trigger_word,
            to: actualTriggerWord,
          })
          await sql`
            UPDATE user_models
            SET trigger_word = ${actualTriggerWord}
            WHERE id = ${model.id}
          `
          console.log("[v0] [TESTING] Model trigger word fixed to original pattern")
        }

        // Build training parameters - start with defaults, then override with custom values
        // This ensures all required parameters are included
        // CRITICAL: Use actualTriggerWord (preserved from original model if retraining)
        const customTrainingParams = {
          ...DEFAULT_TRAINING_PARAMS,
          input_images: datasetUrl,
          trigger_word: actualTriggerWord, // CRITICAL: Use preserved trigger word
          // Override with custom test parameters if provided
          steps: training_params.steps ?? DEFAULT_TRAINING_PARAMS.steps,
          lora_rank: training_params.lora_rank ?? DEFAULT_TRAINING_PARAMS.lora_rank,
          learning_rate: training_params.learning_rate ?? DEFAULT_TRAINING_PARAMS.learning_rate,
          caption_dropout_rate: training_params.caption_dropout_rate ?? DEFAULT_TRAINING_PARAMS.caption_dropout_rate,
          num_repeats: training_params.num_repeats ?? DEFAULT_TRAINING_PARAMS.num_repeats,
          network_alpha: training_params.network_alpha ?? training_params.lora_rank ?? DEFAULT_TRAINING_PARAMS.network_alpha,
        }
        
        // CRITICAL: Validate training parameters before sending to Replicate
        if (!customTrainingParams.input_images) {
          throw new Error("Missing input_images in training parameters")
        }
        if (!customTrainingParams.trigger_word || customTrainingParams.trigger_word.trim() === "") {
          throw new Error("Missing or empty trigger_word in training parameters")
        }
        console.log("[v0] [TESTING] Training parameters validated:", {
          hasInputImages: !!customTrainingParams.input_images,
          triggerWord: customTrainingParams.trigger_word,
          steps: customTrainingParams.steps,
          lora_rank: customTrainingParams.lora_rank,
        })

        // CRITICAL: Use test prefix and ensure it doesn't conflict with admin user's model
        // Verify test user is NOT the admin user
        const adminUser = await sql`
          SELECT id FROM users WHERE email = ${ADMIN_EMAIL} LIMIT 1
        `
        
        if (test_user_id === adminUser[0]?.id) {
          await sql`
            UPDATE maya_test_results
            SET status = 'failed', results = ${JSON.stringify({ error: "Cannot run test training on admin user. Use test user instead." })}
            WHERE id = ${testResultId}
          `
          return NextResponse.json(
            { error: "Cannot run test training on admin user. Please use the dedicated test user for testing." },
            { status: 400 }
          )
        }

        const replicateUsername = process.env.REPLICATE_USERNAME || "sandrasocial"
        const destinationModelName = `test-${test_user_id.substring(0, 8)}-${testResultId}-lora`
        const destination = `${replicateUsername}/${destinationModelName}`
        
        // CRITICAL: Verify this model name doesn't conflict with admin's production model
        console.log("[v0] [TESTING] Test model destination:", destination, "(separate from production)")

        // Check if destination model exists, create it if needed (matching production pattern)
        console.log("[v0] [TESTING] Checking if destination model exists on Replicate...")
        const checkModelResponse = await fetch(`https://api.replicate.com/v1/models/${destination}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
          },
        })

        if (checkModelResponse.status === 404) {
          // Model doesn't exist, create it
          console.log("[v0] [TESTING] Model doesn't exist, creating it...")
          const createModelResponse = await fetch("https://api.replicate.com/v1/models", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              owner: replicateUsername,
              name: destinationModelName,
              visibility: "private",
              hardware: "gpu-t4",
              description: `Test LoRA model for testing (Test #${testResultId})`,
            }),
          })

          if (!createModelResponse.ok && createModelResponse.status !== 409) {
            const errorData = await createModelResponse.json().catch(() => ({}))
            console.error("[v0] [TESTING] Failed to create destination model:", {
              status: createModelResponse.status,
              error: errorData,
            })
            throw new Error(`Failed to create destination model: ${JSON.stringify(errorData)}`)
          }

          console.log("[v0] [TESTING] Destination model created successfully")
        } else if (checkModelResponse.ok) {
          console.log("[v0] [TESTING] Destination model already exists, will use it for training")
        } else {
          const errorData = await checkModelResponse.json().catch(() => ({}))
          console.error("[v0] [TESTING] Error checking model existence:", {
            status: checkModelResponse.status,
            error: errorData,
          })
          // Don't throw here, continue - model might still work
        }

        console.log("[v0] [TESTING] Starting test training:", {
          test_result_id: testResultId,
          test_training_id: testTrainingId,
          destination,
          trigger_word: actualTriggerWord, // CRITICAL: Use preserved trigger word
          image_count: image_urls.length,
          trainer: FLUX_LORA_TRAINER,
          trainer_version: FLUX_LORA_TRAINER_VERSION,
          is_retraining: isRetraining,
        })
        console.log("[v0] [TESTING] Training parameters:", JSON.stringify(customTrainingParams, null, 2))

        // Store destination model ID in test training record BEFORE starting training
        // This ensures we have the correct destination model ID even if training.output is missing later
        await sql`
          UPDATE maya_test_trainings
          SET replicate_model_id = ${destination}
          WHERE id = ${testTrainingId}
        `
        console.log("[v0] [TESTING] Stored destination model ID in test training record:", destination)
        
        // CRITICAL: Validate trainer constants before starting training
        const trainerOwner = FLUX_LORA_TRAINER.split("/")[0]
        const trainerName = FLUX_LORA_TRAINER.split("/")[1]
        
        if (!trainerOwner || !trainerName) {
          throw new Error(`Invalid FLUX_LORA_TRAINER format: ${FLUX_LORA_TRAINER}`)
        }
        
        if (!FLUX_LORA_TRAINER_VERSION || FLUX_LORA_TRAINER_VERSION.trim() === "") {
          throw new Error("FLUX_LORA_TRAINER_VERSION is empty or not set")
        }
        
        console.log("[v0] [TESTING] Starting Replicate training with:", {
          trainer: `${trainerOwner}/${trainerName}`,
          version: FLUX_LORA_TRAINER_VERSION.substring(0, 8) + "...",
          destination,
          hasInputImages: !!customTrainingParams.input_images,
          triggerWord: customTrainingParams.trigger_word,
        })
        
        // Start training with Replicate (using correct signature matching production training)
        const training = await replicate.trainings.create(
          trainerOwner,
          trainerName,
          FLUX_LORA_TRAINER_VERSION,
          {
            destination,
            input: customTrainingParams as any,
          }
        )

        console.log("[v0] [TESTING] Replicate training started successfully:", {
          training_id: training.id,
          status: training.status,
          destination,
        })
        
        if (!training.id) {
          throw new Error("Replicate training.create() returned no training ID")
        }

        // Update test training record
        await sql`
          UPDATE maya_test_trainings
          SET 
            replicate_training_id = ${training.id},
            replicate_model_id = ${destination},
            training_status = 'training',
            started_at = NOW()
          WHERE id = ${testTrainingId}
        `

        // Update user model with training ID and replicate model ID (matching production pattern)
        // CRITICAL: Use actualTriggerWord (preserved from original model if retraining)
        await sql`
          UPDATE user_models
          SET 
            training_id = ${training.id},
            replicate_model_id = ${destination},
            trigger_word = ${actualTriggerWord}, -- CRITICAL: Use preserved trigger word
            training_status = 'training',
            started_at = NOW(),
            updated_at = NOW()
          WHERE id = ${model.id}
        `

        // Update test result
        await sql`
          UPDATE maya_test_results
          SET 
            status = 'running',
            results = ${JSON.stringify({
              training_id: training.id,
              replicate_training_id: training.id,
              model_id: model.id,
              started_at: new Date().toISOString(),
            })}
          WHERE id = ${testResultId}
        `

        return NextResponse.json({
          success: true,
          test_id: testResultId,
          training_id: training.id,
          message: "Test training started successfully",
          replicate_training_id: training.id,
        })
      } catch (error: any) {
        console.error("[v0] [TESTING] Training error:", error)
        console.error("[v0] [TESTING] Error details:", {
          message: error.message,
          status: error.status,
          statusCode: error.statusCode,
          response: error.response,
          body: error.body,
          stack: error.stack,
        })
        
        // Try to extract more details from Replicate API errors
        if (error.response) {
          try {
            const errorBody = await error.response.json().catch(() => null)
            if (errorBody) {
              console.error("[v0] [TESTING] Replicate API error body:", errorBody)
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }

        // Update test result to failed
        await sql`
          UPDATE maya_test_results
          SET 
            status = 'failed',
            results = ${JSON.stringify({ 
              error: error.message || String(error),
              details: error.response || error.status,
            })}
          WHERE id = ${testResultId}
        `

        // Also update test training record if it exists
        try {
          await sql`
            UPDATE maya_test_trainings
            SET training_status = 'failed'
            WHERE test_result_id = ${testResultId}
          `
        } catch (updateError) {
          console.error("[v0] [TESTING] Failed to update test training status:", updateError)
        }

        return NextResponse.json(
          { 
            error: "Training failed to start", 
            details: error.message || String(error),
            test_id: testResultId,
          },
          { status: 500 }
        )
      }
    } else if (test_type === "generation") {
      if (!test_user_id) {
        return NextResponse.json({ error: "test_user_id is required for generation tests" }, { status: 400 })
      }
      if (!user_request) {
        return NextResponse.json({ error: "user_request is required for generation tests" }, { status: 400 })
      }

      try {
        // Update status to running
        await sql`
          UPDATE maya_test_results
          SET status = 'running'
          WHERE id = ${testResultId}
        `

        // Get user's trained model
        const userModel = await sql`
          SELECT 
            id,
            trigger_word,
            replicate_model_id,
            replicate_version_id,
            lora_weights_url,
            training_status
          FROM user_models
          WHERE user_id = ${test_user_id}
          AND training_status = 'completed'
          ORDER BY created_at DESC
          LIMIT 1
        `

        if (userModel.length === 0) {
          await sql`
            UPDATE maya_test_results
            SET status = 'failed', results = ${JSON.stringify({ error: "User does not have a completed trained model" })}
            WHERE id = ${testResultId}
          `
          return NextResponse.json(
            { error: "User does not have a completed trained model" },
            { status: 400 }
          )
        }

        const model = userModel[0]
        
        console.log("[v0] [TESTING] Model found:", {
          id: model.id,
          has_replicate_model_id: !!model.replicate_model_id,
          has_replicate_version_id: !!model.replicate_version_id,
          has_lora_weights_url: !!model.lora_weights_url,
          trigger_word: model.trigger_word,
        })
        
        // CRITICAL: Get the version ID from the DESTINATION model (sandrasocial/test-xxx-lora)
        // NOT from the trainer model (replicate/fast-flux-trainer)
        // The replicate_version_id should be the version hash (e.g., "1855b556") from the destination model
        let replicateVersionId = model.replicate_version_id
        let loraWeightsUrl = model.lora_weights_url
        
        // CRITICAL: Check if stored version is the trainer version (wrong!) and force refresh
        const { FLUX_LORA_TRAINER_VERSION } = await import("@/lib/replicate-client")
        const isTrainerVersion = replicateVersionId === '56cb4a64' || replicateVersionId === FLUX_LORA_TRAINER_VERSION
        
        // If missing OR if it's the trainer version (wrong!), fetch from destination model
        if (!replicateVersionId || !loraWeightsUrl || isTrainerVersion) {
          if (isTrainerVersion) {
            console.warn("[v0] [TESTING] ⚠️ Stored version_id is trainer version (WRONG!):", replicateVersionId)
            console.warn("[v0] [TESTING] Forcing refresh from destination model...")
          }
          console.log("[v0] [TESTING] Model missing version_id or lora_url, fetching from destination model...")
          
          if (model.replicate_model_id) {
            try {
              const replicate = getReplicateClient()
              const modelParts = model.replicate_model_id.split('/')
              
              if (modelParts.length === 2) {
                const [owner, modelName] = modelParts
                
                // CRITICAL: Ensure we're fetching from the destination model (user's LoRA model)
                // NOT the trainer model (replicate/fast-flux-trainer)
                if (modelName.includes('fast-flux-trainer')) {
                  throw new Error("ERROR: replicate_model_id points to trainer model! Should point to destination model like 'sandrasocial/user-xxx-selfie-lora'")
                }
                
                // Get latest version from the destination model
                // This should return version hash like "1855b556" (NOT the trainer version "56cb4a64")
                const versions = await replicate.models.versions.list(owner, modelName)
                if (versions.results && versions.results.length > 0) {
                  const latestVersion = versions.results[0]
                  // latestVersion.id is the version hash (e.g., "1855b556")
                  replicateVersionId = latestVersion.id
                  loraWeightsUrl = `https://replicate.delivery/pbxt/${latestVersion.id}/flux-lora.tar`
                  
                  console.log("[v0] [TESTING] ✅ Fetched version from destination model:", {
                    destination_model: model.replicate_model_id,
                    version_hash: replicateVersionId,
                    full_version_string: `${model.replicate_model_id}:${replicateVersionId}`,
                    version_created_at: latestVersion.created_at,
                  })
                  
                  // Validate: Ensure we got destination model version, not trainer version
                  if (replicateVersionId === '56cb4a64' || replicateVersionId === FLUX_LORA_TRAINER_VERSION) {
                    throw new Error(`ERROR: Fetched version hash matches trainer version! This means we're querying the wrong model. Got: ${replicateVersionId}. Destination model: ${model.replicate_model_id}`)
                  }
                  
                  console.log("[v0] [TESTING] ✅ Fetched correct version from destination model:", {
                    destination_model: model.replicate_model_id,
                    version_hash: replicateVersionId,
                    full_version_string: `${model.replicate_model_id}:${replicateVersionId}`,
                    was_trainer_version: isTrainerVersion,
                  })
                  
                  // Update database with correct values
                  await sql`
                    UPDATE user_models
                    SET 
                      replicate_version_id = ${replicateVersionId},
                      lora_weights_url = ${loraWeightsUrl},
                      updated_at = NOW()
                    WHERE id = ${model.id}
                  `
                  console.log("[v0] [TESTING] ✅ Updated database with correct destination model version")
                }
              }
            } catch (err: any) {
              console.error("[v0] [TESTING] Failed to fetch from destination model:", err)
              console.error("[v0] [TESTING] Error details:", {
                message: err.message,
                status: err.response?.status,
                data: err.response?.data,
              })
            }
          } else {
            console.error("[v0] [TESTING] Model missing replicate_model_id, cannot fetch version")
          }
        }
        
        // Validation: Log warning if model ID looks wrong, but don't block generation
        // (Allow retraining scenarios where model might not be perfect yet)
        if (model.replicate_model_id && model.replicate_model_id.includes('fast-flux-trainer')) {
          console.warn("[v0] [TESTING] ⚠️ WARNING: replicate_model_id appears to point to trainer model:", model.replicate_model_id)
          console.warn("[v0] [TESTING] This usually means training didn't complete properly or model ID wasn't updated correctly.")
          console.warn("[v0] [TESTING] Try retraining the model or running the Sync button after training completes.")
        }
        
        if (!replicateVersionId || !loraWeightsUrl) {
          const errorMsg = `Model is missing required fields: version_id=${!!replicateVersionId}, lora_url=${!!loraWeightsUrl}, model_id=${!!model.replicate_model_id}`
          await sql`
            UPDATE maya_test_results
            SET status = 'failed', results = ${JSON.stringify({ error: errorMsg })}
            WHERE id = ${testResultId}
          `
          return NextResponse.json(
            { 
              error: "Model is missing required fields for generation",
              details: errorMsg + ". Please ensure training completed successfully and try running the Sync button.",
              replicate_model_id: model.replicate_model_id || "missing",
              replicate_version_id: replicateVersionId ? "present" : "missing",
              lora_weights_url: loraWeightsUrl ? "present" : "missing",
            },
            { status: 400 }
          )
        }

        // Build prompt with trigger word
        const triggerWord = model.trigger_word || `user${test_user_id}`
        const fullPrompt = `${triggerWord} ${user_request}`

        // Use custom generation settings if provided, otherwise use quality presets
        let qualitySettings: any
        if (generation_settings) {
          // Use custom settings from UI
          qualitySettings = {
            guidance_scale: generation_settings.guidance_scale,
            num_inference_steps: generation_settings.num_inference_steps,
            aspect_ratio: generation_settings.aspect_ratio,
            megapixels: generation_settings.megapixels,
            output_format: generation_settings.output_format,
            output_quality: generation_settings.output_quality,
            lora_scale: generation_settings.lora_scale,
            extra_lora: generation_settings.extra_lora_enabled 
              ? "https://huggingface.co/strangerzonehf/Flux-Super-Realism-LoRA/resolve/main/super-realism.safetensors"
              : undefined,
            extra_lora_scale: generation_settings.extra_lora_enabled ? generation_settings.extra_lora_scale : 0,
            disable_safety_checker: true,
            go_fast: false,
            num_outputs: 1,
            model: "dev",
          }
        } else {
          // Fallback to default quality presets
          const { MAYA_QUALITY_PRESETS } = await import("@/lib/maya/quality-settings")
          qualitySettings = MAYA_QUALITY_PRESETS.portrait
        }

        console.log("[v0] [TESTING] Starting generation with:", {
          replicate_model_id: model.replicate_model_id,
          replicate_version_id: replicateVersionId,
          trigger_word: triggerWord,
          prompt_preview: fullPrompt.substring(0, 100),
          lora_weights_url: loraWeightsUrl?.substring(0, 100) + "...",
        })
        
        // CRITICAL: Verify we're not using the trainer model version
        if (replicateVersionId && model.replicate_model_id) {
          const modelParts = model.replicate_model_id.split('/')
          if (modelParts.length === 2 && !modelParts[1].includes('fast-flux-trainer')) {
            console.log("[v0] [TESTING] ✓ Using trained LoRA model version (not trainer):", model.replicate_model_id)
          } else {
            console.error("[v0] [TESTING] ⚠️ WARNING: replicate_model_id might be incorrect:", model.replicate_model_id)
          }
        }

        // Start image generation with Replicate
        // NOTE: The trained LoRA model version requires 'txt' field (not 'prompt')
        // This is model-version specific - some versions use 'prompt', others use 'txt'
        const replicate = getReplicateClient()
        let prediction
        try {
          const predictionInput: any = {
            txt: fullPrompt, // This model version requires 'txt' field
            guidance_scale: qualitySettings.guidance_scale,
            num_inference_steps: qualitySettings.num_inference_steps,
            aspect_ratio: qualitySettings.aspect_ratio,
            megapixels: qualitySettings.megapixels,
            output_format: qualitySettings.output_format,
            output_quality: qualitySettings.output_quality,
            lora_scale: qualitySettings.lora_scale,
            hf_lora: loraWeightsUrl, // LoRA weights from trained model
            disable_safety_checker: qualitySettings.disable_safety_checker ?? true,
            go_fast: qualitySettings.go_fast ?? false,
            num_outputs: 1, // Generate 1 image for testing
            model: qualitySettings.model ?? "dev",
          }
          
          // Only include extra_lora if enabled and scale > 0
          if (qualitySettings.extra_lora && qualitySettings.extra_lora_scale > 0) {
            predictionInput.extra_lora = qualitySettings.extra_lora
            predictionInput.extra_lora_scale = qualitySettings.extra_lora_scale
          }
          
          // IMPORTANT: Use the trained LoRA model version (replicate_version_id)
          // This is the version of the trained destination model (sandrasocial/user-xxx-selfie-lora), NOT the trainer
          // The version should be from training.output.version which is the destination model version
          console.log("[v0] [TESTING] Creating prediction with trained model version:", {
            version: replicateVersionId,
            replicate_model_id: model.replicate_model_id,
            has_lora_weights: !!loraWeightsUrl,
          })
          
          // CRITICAL VALIDATION: Ensure we're using destination model version, not trainer
          if (!replicateVersionId) {
            throw new Error("replicate_version_id is missing - cannot generate without trained model version from destination model")
          }
          
          // Validation: Log warning if model ID format looks suspicious, but don't block
          // Allow retraining scenarios where model might need to be fixed
          if (model.replicate_model_id) {
            if (model.replicate_model_id.includes('fast-flux-trainer')) {
              console.error("[v0] [TESTING] ⚠️ WARNING: replicate_model_id points to trainer model:", model.replicate_model_id)
              console.error("[v0] [TESTING] This means training didn't complete properly or model ID wasn't stored correctly.")
              console.error("[v0] [TESTING] Try retraining or running Sync button after training completes.")
            } else if (!model.replicate_model_id.includes('lora') && !model.replicate_model_id.includes('test-')) {
              console.warn("[v0] [TESTING] ⚠️ replicate_model_id format might be incorrect:", model.replicate_model_id)
              console.warn("[v0] [TESTING] Expected format: sandrasocial/test-xxx-lora or sandrasocial/user-xxx-selfie-lora")
            }
          }
          
          // CRITICAL: Final validation before creating prediction
          // Ensure we're using the destination model version hash (e.g., "1855b556")
          // NOT the trainer version hash (e.g., "56cb4a64")
          // The version parameter expects just the hash string
          if (replicateVersionId === '56cb4a64' || replicateVersionId === FLUX_LORA_TRAINER_VERSION) {
            throw new Error(`CRITICAL ERROR: Using trainer version hash instead of destination model version! Got: ${replicateVersionId}. Expected destination model version hash (e.g., 1855b556). Please run Sync button or retrain.`)
          }
          
          console.log("[v0] [TESTING] ✅ Creating prediction with correct destination model version:", {
            destination_model: model.replicate_model_id,
            version_hash: replicateVersionId,
            full_version_string: `${model.replicate_model_id}:${replicateVersionId}`,
            validation: "PASSED - Not trainer version",
          })
          
          prediction = await replicate.predictions.create({
            version: replicateVersionId, // This should be the version hash from destination model (e.g., "1855b556")
            input: predictionInput,
          })
          
          console.log("[v0] [TESTING] ✅ Prediction created successfully with correct destination model version:", {
            prediction_id: prediction.id,
            status: prediction.status,
            version_used: replicateVersionId,
            destination_model: model.replicate_model_id,
          })
        } catch (predictError: any) {
          console.error("[v0] [TESTING] Replicate prediction.create failed:", predictError)
          console.error("[v0] [TESTING] Prediction error details:", {
            message: predictError.message,
            status: predictError.response?.status,
            statusText: predictError.response?.statusText,
            data: predictError.response?.data,
            body: predictError.body,
          })
          throw new Error(`Replicate API error: ${predictError.message || String(predictError)}`)
        }

        // Save test image record
        await sql`
          INSERT INTO maya_test_images (
            test_result_id,
            prompt,
            prompt_settings,
            image_url,
            generation_params,
            replicate_prediction_id
          ) VALUES (
            ${testResultId},
            ${fullPrompt},
            ${JSON.stringify(prompt_settings || {})},
            '',
            ${JSON.stringify({
              replicate_version_id: replicateVersionId,
              generation_settings: generation_settings || null,
              quality_preset: generation_settings ? 'custom' : 'portrait',
            })},
            ${prediction.id}
          )
        `

        // Update test result
        await sql`
          UPDATE maya_test_results
          SET 
            status = 'running',
            results = ${JSON.stringify({
              prediction_id: prediction.id,
              status: prediction.status,
              started_at: new Date().toISOString(),
            })}
          WHERE id = ${testResultId}
        `

        return NextResponse.json({
          success: true,
          test_id: testResultId,
          prediction_id: prediction.id,
          message: "Image generation started successfully",
        })
      } catch (error: any) {
        console.error("[v0] [TESTING] Generation error:", error)
        console.error("[v0] [TESTING] Generation error stack:", error.stack)
        console.error("[v0] [TESTING] Generation error full:", {
          message: error.message,
          name: error.name,
          response: error.response,
          body: error.body,
          status: error.status,
          statusCode: error.statusCode,
        })
        
        const errorDetails = {
          message: error.message || String(error),
          type: error.name || "UnknownError",
          response_status: error.response?.status,
          response_data: error.response?.data,
        }
        
        await sql`
          UPDATE maya_test_results
          SET 
            status = 'failed',
            results = ${JSON.stringify({ error: errorDetails })}
          WHERE id = ${testResultId}
        `

        return NextResponse.json(
          { 
            error: "Generation failed to start", 
            details: error.message || String(error),
            full_error: errorDetails,
            test_id: testResultId,
            suggestion: "Check server logs for detailed error information. This could be due to missing model fields or Replicate API issues.",
          },
          { status: 500 }
        )
      }
    } else {
      return NextResponse.json({
        success: true,
        test_id: testResultId,
        message: "Test configuration saved.",
      })
    }
  } catch (error: any) {
    console.error("[v0] [TESTING] Outer error handler - Error running test:", error)
    console.error("[v0] [TESTING] Outer error details:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
    })
    return NextResponse.json(
      { 
        error: error.message || "Failed to run test",
        details: error.stack || String(error),
      },
      { status: 500 }
    )
  }
}
