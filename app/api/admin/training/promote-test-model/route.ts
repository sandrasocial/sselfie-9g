import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const ADMIN_EMAIL = "ssa@ssasocial.com"
const sql = neon(process.env.DATABASE_URL!)

/**
 * Admin endpoint to promote a test model to production
 * 
 * This endpoint:
 * 1. Finds the test model (is_test = true) for the user
 * 2. Finds the production model (is_test = false or NULL) for the user
 * 3. Copies all test model data to production model
 * 4. Optionally keeps test model for reference
 * 
 * POST /api/admin/training/promote-test-model
 * Body: { userId: string, keepTestModel?: boolean }
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
    const { userId, keepTestModel = true } = body

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    // CRITICAL: Verify the user exists and get their email for confirmation
    const targetUser = await sql`
      SELECT id, email, display_name
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `

    if (targetUser.length === 0) {
      return NextResponse.json({ 
        error: "User not found",
        details: `No user found with ID: ${userId}`
      }, { status: 404 })
    }

    const userEmail = targetUser[0].email
    const userName = targetUser[0].display_name || userEmail
    
    console.log("[v0] [ADMIN] Promoting test model for user:", {
      userId,
      email: userEmail,
      name: userName,
    })

    // Get the test model (is_test = true)
    // Note: Handle case where is_test column might not exist yet (fallback to model_name check)
    let testModel
    try {
      testModel = await sql`
        SELECT 
          id,
          user_id,
          model_name,
          model_type,
          training_status,
          replicate_model_id,
          replicate_version_id,
          trigger_word,
          lora_weights_url,
          lora_scale,
          training_id,
          started_at,
          completed_at,
          created_at,
          is_test
        FROM user_models
        WHERE user_id = ${userId}
        AND (
          is_test = true 
          OR (is_test IS NULL AND model_name LIKE 'Test Model%')
          OR (model_name LIKE 'Test Model%' AND replicate_model_id LIKE 'sandrasocial/test-%')
        )
        AND training_status = 'completed'
        ORDER BY created_at DESC
        LIMIT 1
      `
    } catch (dbError: any) {
      // If is_test column doesn't exist, try without it
      console.warn("[v0] [ADMIN] is_test column might not exist, trying fallback query:", dbError.message)
      testModel = await sql`
        SELECT 
          id,
          user_id,
          model_name,
          model_type,
          training_status,
          replicate_model_id,
          replicate_version_id,
          trigger_word,
          lora_weights_url,
          lora_scale,
          training_id,
          started_at,
          completed_at,
          created_at
        FROM user_models
        WHERE user_id = ${userId}
        AND (
          model_name LIKE 'Test Model%' 
          OR replicate_model_id LIKE 'sandrasocial/test-%'
        )
        AND training_status = 'completed'
        ORDER BY created_at DESC
        LIMIT 1
      `
    }

    if (testModel.length === 0) {
      return NextResponse.json({ 
        error: "No completed test model found for this user",
        suggestion: "Make sure a test training has completed successfully and the model has 'Test Model' in its name",
        debug: {
          userId,
          checked: "is_test = true OR model_name LIKE 'Test Model%'"
        }
      }, { status: 404 })
    }

    const test = testModel[0]

    // CRITICAL: Verify the test model belongs to the correct user
    if (test.user_id !== userId) {
      console.error("[v0] [ADMIN] SECURITY ERROR: Test model user_id mismatch!", {
        test_model_user_id: test.user_id,
        requested_user_id: userId,
        test_model_id: test.id,
      })
      return NextResponse.json({ 
        error: "Test model does not belong to the specified user",
        details: `Test model belongs to user ${test.user_id}, but promotion requested for user ${userId}`,
        security_note: "This could indicate a security issue or data inconsistency"
      }, { status: 403 })
    }

    // CRITICAL: The trigger word used for training is: user{first8charsOfUserId}
    // Extract the first 8 characters of the user ID (before the first hyphen)
    const userIdPrefix = userId.split('-')[0]
    const originalTriggerWord = `user${userIdPrefix}`
    
    console.log("[v0] [ADMIN] Using original trigger word pattern:", {
      userId,
      userIdPrefix,
      originalTriggerWord,
      test_model_current_trigger_word: test.trigger_word,
    })

    console.log("[v0] [ADMIN] Found test model:", {
      id: test.id,
      user_id: test.user_id,
      user_email: userEmail,
      model_name: test.model_name,
      training_status: test.training_status,
      has_replicate_model_id: !!test.replicate_model_id,
      has_replicate_version_id: !!test.replicate_version_id,
      has_lora_weights_url: !!test.lora_weights_url,
      test_model_current_trigger_word: test.trigger_word,
      original_trigger_word: originalTriggerWord,
    })

    // Get or create the production model (is_test = false or NULL, or not a test model)
    let productionModel
    try {
      productionModel = await sql`
        SELECT 
          id,
          user_id,
          model_name,
          training_status,
          trigger_word
        FROM user_models
        WHERE user_id = ${userId}
        AND (is_test = false OR is_test IS NULL OR (is_test IS NULL AND model_name NOT LIKE 'Test Model%'))
        ORDER BY created_at DESC
        LIMIT 1
      `
    } catch (dbError: any) {
      // If is_test column doesn't exist, try without it
      console.warn("[v0] [ADMIN] is_test column might not exist, trying fallback query:", dbError.message)
      productionModel = await sql`
        SELECT 
          id,
          user_id,
          model_name,
          training_status,
          trigger_word
        FROM user_models
        WHERE user_id = ${userId}
        AND model_name NOT LIKE 'Test Model%'
        ORDER BY created_at DESC
        LIMIT 1
      `
    }

    let productionModelId: number

    // CRITICAL: The test model itself has the trigger word we need for production
    // But the unique constraint prevents having two models with the same trigger word
    // Solution: 
    // 1. Find ALL models using the original trigger word (including the test model and any production models)
    // 2. Update ALL of them to free up the original trigger word
    // 3. Then create/update production with the original trigger word
    // Note: originalTriggerWord was already calculated above from the first completed model
    
    console.log("[v0] [ADMIN] Finding all models using trigger word:", originalTriggerWord)
    
    // Find ALL models using this trigger word (test model + any production models)
    const allModelsWithTriggerWord = await sql`
      SELECT id, user_id, is_test, model_name, training_status
      FROM user_models
      WHERE trigger_word = ${originalTriggerWord}
      ORDER BY created_at DESC
    `
    
    console.log("[v0] [ADMIN] Found models using trigger word:", allModelsWithTriggerWord.length, allModelsWithTriggerWord)
    
    // Update ALL models using this trigger word (except we'll update the production one later)
    for (const model of allModelsWithTriggerWord) {
      // Skip the test model - we'll update it separately
      if (model.id === test.id) {
        continue
      }
      
      // Skip the production model we're about to update - we'll handle it in the update/create section
      if (productionModel.length > 0 && model.id === productionModel[0].id) {
        continue
      }
      
      // Generate unique trigger word for this conflicting model
      const newTriggerWord = `${originalTriggerWord}_old_${model.id}_${Date.now()}`
      console.log("[v0] [ADMIN] Updating conflicting model trigger word:", {
        model_id: model.id,
        old: originalTriggerWord,
        new: newTriggerWord,
      })
      
      try {
        await sql`
          UPDATE user_models
          SET 
            trigger_word = ${newTriggerWord},
            updated_at = NOW()
          WHERE id = ${model.id}
        `
        console.log("[v0] [ADMIN] Updated conflicting model:", model.id)
      } catch (updateError: any) {
        console.error("[v0] [ADMIN] Failed to update conflicting model:", updateError)
        throw new Error(`Failed to update conflicting model ${model.id}: ${updateError.message}`)
      }
    }
    
    // Now update the test model's trigger word
    const testModelNewTriggerWord = `${originalTriggerWord}_test_${test.id}_${Date.now()}`
    
    console.log("[v0] [ADMIN] Updating test model's trigger word to free it for production:", {
      original: originalTriggerWord,
      new: testModelNewTriggerWord,
      test_model_id: test.id,
    })
    
    try {
      await sql`
        UPDATE user_models
        SET 
          trigger_word = ${testModelNewTriggerWord},
          updated_at = NOW()
        WHERE id = ${test.id}
      `
      console.log("[v0] [ADMIN] Test model trigger word updated, original is now free for production")
    } catch (updateError: any) {
      console.error("[v0] [ADMIN] Failed to update test model trigger word:", updateError)
      console.error("[v0] [ADMIN] Update error details:", {
        message: updateError.message,
        code: updateError.code,
        constraint: updateError.constraint,
        detail: updateError.detail,
      })
      throw new Error(`Failed to update test model trigger word: ${updateError.message || String(updateError)}. Constraint: ${updateError.constraint || 'unknown'}`)
    }

    if (productionModel.length === 0) {
      // Create a new production model if none exists
      console.log("[v0] [ADMIN] Creating new production model for user:", userId)
      
      // Check for any remaining conflicts (shouldn't be any, but just in case)
      const remainingConflicts = await sql`
        SELECT id, trigger_word, is_test, model_name, training_status, user_id
        FROM user_models
        WHERE trigger_word = ${originalTriggerWord}
        AND id != ${test.id}
      `
      
      if (remainingConflicts.length > 0) {
        console.warn("[v0] [ADMIN] Still have conflicts after updating test model:", remainingConflicts)
        // Update any remaining conflicts
        for (const conflict of remainingConflicts) {
          await sql`
            UPDATE user_models
            SET 
              trigger_word = ${conflict.trigger_word + '_replaced_' + Date.now()},
              updated_at = NOW()
            WHERE id = ${conflict.id}
          `
        }
      }
      
      // Now safe to create production model with original trigger word
      try {
        const newProduction = await sql`
          INSERT INTO user_models (
            user_id,
            model_name,
            model_type,
            training_status,
            training_progress,
            trigger_word,
            replicate_model_id,
            replicate_version_id,
            lora_weights_url,
            lora_scale,
            training_id,
            started_at,
            completed_at,
            is_test,
            created_at,
            updated_at
          )
          VALUES (
            ${userId},
            ${test.model_name.replace('Test Model', 'Production Model') || 'Production Model'},
            ${test.model_type},
            'completed',
            100,
            ${originalTriggerWord}, -- CRITICAL: Use original trigger word (LoRA was trained with it)
            ${test.replicate_model_id},
            ${test.replicate_version_id},
            ${test.lora_weights_url},
            ${test.lora_scale || '1.0'},
            ${test.training_id},
            ${test.started_at},
            ${test.completed_at},
            false,
            NOW(),
            NOW()
          )
          RETURNING id
        `
        productionModelId = newProduction[0].id
        console.log("[v0] [ADMIN] Created new production model:", productionModelId)
      } catch (insertError: any) {
        console.error("[v0] [ADMIN] Failed to create production model:", insertError)
        console.error("[v0] [ADMIN] Insert error details:", {
          message: insertError.message,
          code: insertError.code,
          constraint: insertError.constraint,
          detail: insertError.detail,
        })
        throw new Error(`Failed to create production model: ${insertError.message || String(insertError)}. Constraint: ${insertError.constraint || 'unknown'}`)
      }
    } else {
      // Update existing production model
      productionModelId = productionModel[0].id
      const existingProduction = productionModel[0]
      console.log("[v0] [ADMIN] Updating existing production model:", productionModelId)
      
      // CRITICAL: The test model's trigger word is what the LoRA was trained with
      // We MUST use that trigger word, otherwise the LoRA won't work correctly
      // The test model's trigger word was already updated above, so now we can safely update production
      
      // Check for any remaining conflicts (shouldn't be any since we updated the test model)
      const remainingConflicts = await sql`
        SELECT id, trigger_word, is_test, model_name, training_status, user_id
        FROM user_models
        WHERE trigger_word = ${originalTriggerWord}
        AND id != ${productionModelId}
        AND id != ${test.id}
      `
      
      if (remainingConflicts.length > 0) {
        console.warn("[v0] [ADMIN] Still have conflicts after updating test model:", remainingConflicts)
        // Update any remaining conflicts
        for (const conflict of remainingConflicts) {
          await sql`
            UPDATE user_models
            SET 
              trigger_word = ${conflict.trigger_word + '_replaced_' + Date.now()},
              updated_at = NOW()
            WHERE id = ${conflict.id}
          `
        }
      }
      
      // Now safe to update production model with original trigger word
      // This is CRITICAL - the LoRA was trained with this trigger word
      await sql`
        UPDATE user_models
        SET 
          model_name = ${test.model_name.replace('Test Model', 'Production Model') || 'Production Model'},
          model_type = ${test.model_type},
          training_status = 'completed',
          training_progress = 100,
          trigger_word = ${originalTriggerWord}, -- CRITICAL: Must use original trigger word (LoRA was trained with it)
          replicate_model_id = ${test.replicate_model_id},
          replicate_version_id = ${test.replicate_version_id},
          lora_weights_url = ${test.lora_weights_url},
          lora_scale = ${test.lora_scale || '1.0'},
          training_id = ${test.training_id},
          started_at = ${test.started_at},
          completed_at = ${test.completed_at},
          is_test = false,
          updated_at = NOW()
        WHERE id = ${productionModelId}
      `
      console.log("[v0] [ADMIN] Updated production model with test model data (including trigger word - CRITICAL for LoRA)")
    }

    // Optionally mark test model as archived or keep it
    if (!keepTestModel) {
      // Delete the test model (optional - usually we keep it for reference)
      await sql`
        DELETE FROM user_models
        WHERE id = ${test.id}
      `
      console.log("[v0] [ADMIN] Deleted test model (keepTestModel = false)")
    } else {
      // Keep test model but maybe rename it to indicate it's been promoted
      await sql`
        UPDATE user_models
        SET 
          model_name = ${test.model_name + ' (Promoted to Production)'},
          updated_at = NOW()
        WHERE id = ${test.id}
      `
      console.log("[v0] [ADMIN] Kept test model for reference")
    }

    return NextResponse.json({
      success: true,
      message: `Test model promoted to production successfully for ${userEmail}`,
      actions: {
        testModelId: test.id,
        productionModelId,
        promoted: true,
        testModelKept: keepTestModel,
        userId,
        userEmail,
        userName,
      },
      details: {
        replicate_model_id: test.replicate_model_id,
        replicate_version_id: test.replicate_version_id,
        trigger_word: originalTriggerWord, // Use the original trigger word (before test model was updated)
        lora_weights_url: test.lora_weights_url ? "present" : "missing",
      },
      nextSteps: [
        `Production model has been updated for user: ${userEmail}`,
        "The user's production model is now using the test model's trained LoRA",
        "Test model has been " + (keepTestModel ? "kept for reference (trigger word updated)" : "deleted"),
        "Production queries will now use the promoted model",
        `Original trigger word: ${originalTriggerWord} (LoRA was trained with this)`
      ]
    })
  } catch (error: any) {
    const errorDetails = {
      message: error?.message || String(error),
      name: error?.name || 'UnknownError',
      code: error?.code,
      constraint: error?.constraint,
      detail: error?.detail,
      stack: error?.stack,
    }
    
    console.error("[v0] [ADMIN] Error promoting test model:", error)
    console.error("[v0] [ADMIN] Error stack:", error.stack)
    console.error("[v0] [ADMIN] Full error details:", JSON.stringify(errorDetails, null, 2))
    
    // Extract constraint name from error message if not in constraint field
    let constraintName = error.constraint
    if (!constraintName && error.message) {
      const constraintMatch = error.message.match(/constraint "([^"]+)"/)
      if (constraintMatch) {
        constraintName = constraintMatch[1]
      }
    }
    
    return NextResponse.json(
      {
        error: "Failed to promote test model",
        details: errorDetails.message,
        errorCode: errorDetails.code,
        constraint: constraintName || errorDetails.constraint,
        errorDetail: errorDetails.detail,
        hint: constraintName 
          ? `Database constraint error: ${constraintName}. This usually means a unique constraint violation.`
          : errorDetails.code === '42703' 
            ? "The is_test column might not exist. Please run the migration: scripts/41-add-is-test-flag-to-user-models.sql"
            : undefined,
        suggestion: constraintName === 'user_models_trigger_word_unique'
          ? "The trigger word is already in use. The system should have handled this - check server logs for details."
          : "Check server logs for more details. The error details are logged above.",
        fullError: errorDetails, // Include full error for debugging
      },
      { status: 500 }
    )
  }
}
