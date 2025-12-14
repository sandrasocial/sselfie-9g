/**
 * Check Sandra's training data and LoRA extraction
 * Email: sandra.r.m.pereira@gmail.com
 */

import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"

// Load environment variables
dotenv.config({ path: ".env.local" })
dotenv.config({ path: ".env" })

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in environment variables")
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL!)

async function checkSandraTraining() {
  try {
    console.log("🔍 Checking Sandra's Training Data & LoRA\n")
    console.log("Email: sandra.r.m.pereira@gmail.com\n")

    // 1. Find user
    const userResult = await sql`
      SELECT id, email, display_name
      FROM users
      WHERE email = 'sandra.r.m.pereira@gmail.com'
      LIMIT 1
    `

    if (userResult.length === 0) {
      console.log("❌ User not found!")
      return
    }

    const user = userResult[0]
    console.log("✅ User found:")
    console.log("   ID:", user.id)
    console.log("   Email:", user.email)
    console.log()

    // 2. Check all training runs (try both old and new schema)
    // Old schema: user_id is TEXT, id is SERIAL
    // New schema: user_id is UUID, id is UUID
    let trainingRuns: any[] = []
    try {
      // Try new schema first (UUID)
      trainingRuns = await sql`
        SELECT 
          tr.*
        FROM training_runs tr
        WHERE tr.user_id::text = ${user.id}
        ORDER BY tr.created_at DESC
      `
    } catch (error: any) {
      // Fallback to old schema (TEXT)
      if (error?.code === '42804' || error?.code === '42P01') {
        try {
          trainingRuns = await sql`
            SELECT 
              tr.*
            FROM training_runs tr
            WHERE tr.user_id = ${user.id}
            ORDER BY tr.created_at DESC
          `
        } catch (e) {
          console.log("   Could not query training_runs table:", e)
        }
      }
    }

    console.log(`📦 Training Runs (${trainingRuns.length}):`)
    if (trainingRuns.length === 0) {
      console.log("   ⚠️  NO TRAINING RUNS FOUND")
    } else {
      trainingRuns.forEach((run, idx) => {
        console.log(`\n   Run ${idx + 1}:`)
        console.log("   - ID:", run.id)
        console.log("   - Status:", run.status)
        console.log("   - Progress:", run.progress)
        console.log("   - Replicate Training ID:", run.replicate_training_id || "NULL")
        console.log("   - Replicate Version ID:", run.replicate_version_id || "NULL")
        console.log("   - Trigger Word:", run.trigger_word || "NULL")
        console.log("   - Started:", run.started_at || "NULL")
        console.log("   - Completed:", run.completed_at || "NULL")
        console.log("   - Created:", run.created_at)
        console.log("   - Updated:", run.updated_at)
        if (run.error_message) {
          console.log("   - ⚠️  Error:", run.error_message)
        }
      })
    }
    console.log()

    // 3. Check selfie uploads (try both schemas and also check by user_id)
    // First, check all selfie uploads for this user (regardless of training_run_id)
    const allSelfies = await sql`
      SELECT 
        su.*
      FROM selfie_uploads su
      WHERE su.user_id::text = ${user.id} OR su.user_id = ${user.id}
      ORDER BY su.created_at DESC
    `
    
    console.log(`📸 All Selfie Uploads for User (${allSelfies.length} total):`)
    if (allSelfies.length === 0) {
      console.log("   ⚠️  NO SELFIES FOUND FOR THIS USER")
    } else {
      console.log("   - Total Images:", allSelfies.length)
      const totalSize = allSelfies.reduce((sum, s) => sum + (s.file_size || 0), 0)
      const avgSize = totalSize / allSelfies.length
      console.log("   - Total Size:", `${(totalSize / 1024 / 1024).toFixed(2)} MB`)
      console.log("   - Average Size:", `${(avgSize / 1024 / 1024).toFixed(2)} MB`)
      
      // Show first 5 and last 5
      console.log("\n   First 5 uploads:")
      allSelfies.slice(0, 5).forEach((selfie, idx) => {
        console.log(`   ${idx + 1}. ${selfie.created_at} - ${selfie.file_url ? selfie.file_url.substring(0, 80) + "..." : "NULL"}`)
      })
      if (allSelfies.length > 10) {
        console.log("   ...")
        console.log("   Last 5 uploads:")
        allSelfies.slice(-5).forEach((selfie, idx) => {
          console.log(`   ${allSelfies.length - 4 + idx}. ${selfie.created_at} - ${selfie.file_url ? selfie.file_url.substring(0, 80) + "..." : "NULL"}`)
        })
      }
    }
    console.log()
    
    // 4. Check selfie uploads for each training run
    for (const run of trainingRuns) {
      let selfies: any[] = []
      try {
        selfies = await sql`
          SELECT 
            su.*
          FROM selfie_uploads su
          WHERE su.training_run_id::text = ${run.id} OR su.training_run_id = ${run.id}
          ORDER BY su.created_at ASC
        `
      } catch (error: any) {
        // Try with integer if run.id is numeric
        if (typeof run.id === 'number') {
          selfies = await sql`
            SELECT 
              su.*
            FROM selfie_uploads su
            WHERE su.training_run_id = ${run.id}
            ORDER BY su.created_at ASC
          `
        }
      }

      console.log(`📸 Selfie Uploads for Training Run ${run.id} (${selfies.length} images):`)
      if (selfies.length === 0) {
        console.log("   ⚠️  NO SELFIES FOUND FOR THIS RUN")
      } else {
        console.log("   - Total Images:", selfies.length)
        selfies.forEach((selfie, idx) => {
          console.log(`\n   Image ${idx + 1}:`)
          console.log("   - ID:", selfie.id)
          console.log("   - File URL:", selfie.file_url ? selfie.file_url.substring(0, 100) + "..." : "NULL")
          console.log("   - File Size:", selfie.file_size ? `${(selfie.file_size / 1024 / 1024).toFixed(2)} MB` : "NULL")
          console.log("   - MIME Type:", selfie.mime_type || "NULL")
          console.log("   - Status:", selfie.status || "NULL")
          console.log("   - Uploaded:", selfie.created_at)
        })
        
        // Check for potential issues
        const totalSize = selfies.reduce((sum, s) => sum + (s.file_size || 0), 0)
        const avgSize = totalSize / selfies.length
        console.log(`\n   📊 Statistics:`)
        console.log("   - Total Size:", `${(totalSize / 1024 / 1024).toFixed(2)} MB`)
        console.log("   - Average Size:", `${(avgSize / 1024 / 1024).toFixed(2)} MB`)
        
        if (selfies.length < 10) {
          console.log("   ⚠️  WARNING: Less than 10 images - may affect training quality")
        }
        if (selfies.length > 30) {
          console.log("   ⚠️  WARNING: More than 30 images - may cause overfitting")
        }
        if (avgSize < 0.1 * 1024 * 1024) {
          console.log("   ⚠️  WARNING: Average file size very small (< 100KB) - may be low quality")
        }
        if (avgSize > 5 * 1024 * 1024) {
          console.log("   ⚠️  WARNING: Average file size very large (> 5MB) - may need compression")
        }
      }
      console.log()
    }

    // 5. Check LoRA weights
    for (const run of trainingRuns) {
      const loraWeights = await sql`
        SELECT 
          lw.*
        FROM lora_weights lw
        WHERE lw.training_run_id = ${run.id}
        ORDER BY lw.created_at DESC
      `

      console.log(`🎯 LoRA Weights for Training Run ${run.id} (${loraWeights.length}):`)
      if (loraWeights.length === 0) {
        console.log("   ⚠️  NO LoRA WEIGHTS FOUND FOR THIS RUN")
      } else {
        loraWeights.forEach((lora, idx) => {
          console.log(`\n   LoRA ${idx + 1}:`)
          console.log("   - ID:", lora.id)
          console.log("   - File URL:", lora.file_url ? lora.file_url.substring(0, 100) + "..." : "NULL")
          console.log("   - File Size:", lora.file_size ? `${(lora.file_size / 1024 / 1024).toFixed(2)} MB` : "NULL")
          console.log("   - Version:", lora.version || "NULL")
          console.log("   - Created:", lora.created_at)
        })
      }
      console.log()
    }

    // 6. Check user_models first (before using activeModel)
    const userModels = await sql`
      SELECT 
        um.*
      FROM user_models um
      WHERE um.user_id = ${user.id}
      ORDER BY um.created_at DESC
    `

    const activeModel = userModels.find(m => m.training_status === 'completed')
    
    // 7. Check Replicate training data via API (if we have the training ID)
    if (activeModel && activeModel.replicate_version_id) {
      console.log(`🔗 Replicate Model Information:`)
      console.log(`   - Model: ${activeModel.replicate_model_id || 'NULL'}`)
      console.log(`   - Version: ${activeModel.replicate_version_id}`)
      console.log(`   - LoRA URL: ${activeModel.lora_weights_url ? 'Present' : 'MISSING'}`)
      
      // Extract training ID from version if possible
      const versionParts = activeModel.replicate_version_id.split(':')
      if (versionParts.length > 1) {
        console.log(`   - Version Hash: ${versionParts[1]}`)
      }
      
      console.log(`\n   💡 To check training details on Replicate:`)
      console.log(`   → Visit: https://replicate.com/${activeModel.replicate_model_id || 'models'}`)
      console.log(`   → Check training parameters, number of images used, training duration`)
    }
    console.log()

    // 8. Display user_models (already fetched above)
    console.log(`🤖 User Models (${userModels.length}):`)
    if (userModels.length === 0) {
      console.log("   ⚠️  NO USER MODELS FOUND")
    } else {
      userModels.forEach((model, idx) => {
        console.log(`\n   Model ${idx + 1}:`)
        console.log("   - ID:", model.id)
        console.log("   - Model Name:", model.model_name || "NULL")
        console.log("   - Trigger Word:", model.trigger_word || "NULL")
        console.log("   - Training Status:", model.training_status || "NULL")
        console.log("   - LoRA Weights URL:", model.lora_weights_url ? model.lora_weights_url.substring(0, 100) + "..." : "NULL ⚠️")
        console.log("   - LoRA Scale:", model.lora_scale || "NULL")
        console.log("   - Replicate Model ID:", model.replicate_model_id || "NULL")
        console.log("   - Replicate Version ID:", model.replicate_version_id || "NULL")
        console.log("   - Training Run ID:", model.training_run_id || "NULL")
        console.log("   - Created:", model.created_at)
        console.log("   - Updated:", model.updated_at)
        console.log("   - Completed:", model.completed_at || "NULL")
        
        // Check if LoRA URL is accessible
        if (model.lora_weights_url) {
          const url = model.lora_weights_url
          if (url.includes('replicate.delivery')) {
            console.log("   - ✅ LoRA URL format: Replicate delivery (correct)")
          } else if (url.includes('huggingface.co')) {
            console.log("   - ✅ LoRA URL format: HuggingFace (correct)")
          } else if (url.includes('s3.amazonaws.com')) {
            console.log("   - ✅ LoRA URL format: S3 (correct)")
          } else {
            console.log("   - ⚠️  LoRA URL format: Unknown/possibly incorrect")
          }
        }
      })
    }
    console.log()

    // 6. Summary and recommendations
    console.log("📊 DIAGNOSIS SUMMARY:")
    console.log("=" .repeat(50))
    
    const completedRuns = trainingRuns.filter(r => r.status === 'completed')
    const failedRuns = trainingRuns.filter(r => r.status === 'failed')
    // activeModel already declared above
    
    console.log(`\n✅ Completed Training Runs: ${completedRuns.length}`)
    console.log(`❌ Failed Training Runs: ${failedRuns.length}`)
    console.log(`🤖 Active Completed Model: ${activeModel ? 'YES' : 'NO'}`)
    
    if (completedRuns.length > 0) {
      const latestRun = completedRuns[0]
      const selfies = await sql`
        SELECT COUNT(*) as count
        FROM selfie_uploads
        WHERE training_run_id = ${latestRun.id}
      `
      const selfieCount = selfies[0]?.count || 0
      
      console.log(`\n📸 Latest Training Run Details:`)
      console.log(`   - Images Used: ${selfieCount}`)
      console.log(`   - Trigger Word: ${latestRun.trigger_word || 'NULL'}`)
      console.log(`   - Replicate Version: ${latestRun.replicate_version_id || 'NULL'}`)
      
      if (selfieCount < 10) {
        console.log(`   ⚠️  WARNING: Only ${selfieCount} images - may cause poor training quality`)
        console.log(`   → Recommendation: Retrain with 15-25 high-quality selfies`)
      } else if (selfieCount > 30) {
        console.log(`   ⚠️  WARNING: ${selfieCount} images - may cause overfitting`)
        console.log(`   → Recommendation: Use 15-25 diverse images instead`)
      } else {
        console.log(`   ✅ Image count is optimal (${selfieCount} images)`)
      }
    }
    
    if (activeModel) {
      console.log(`\n🎯 Active Model Analysis:`)
      console.log(`   - LoRA URL: ${activeModel.lora_weights_url ? 'Present' : 'MISSING ⚠️'}`)
      console.log(`   - LoRA Scale: ${activeModel.lora_scale || 'NULL'}`)
      console.log(`   - Trigger Word: ${activeModel.trigger_word || 'NULL'}`)
      
      if (!activeModel.lora_weights_url) {
        console.log(`   ❌ CRITICAL: LoRA weights URL is missing!`)
        console.log(`   → This means the model cannot be used for generation`)
      }
      
      if (activeModel.lora_scale && parseFloat(activeModel.lora_scale) < 0.8) {
        console.log(`   ⚠️  WARNING: LoRA scale is low (${activeModel.lora_scale})`)
        console.log(`   → Consider increasing to 0.9-1.0 for better likeness`)
      }
    }
    
    console.log("\n💡 RECOMMENDATIONS:")
    console.log("=" .repeat(50))
    
    if (completedRuns.length === 0) {
      console.log("1. ❌ No completed training runs found")
      console.log("   → User needs to complete training first")
    } else {
      const latestRun = completedRuns[0]
      const selfies = await sql`
        SELECT COUNT(*) as count, AVG(file_size) as avg_size
        FROM selfie_uploads
        WHERE training_run_id = ${latestRun.id}
      `
      const selfieCount = selfies[0]?.count || 0
      const avgSize = selfies[0]?.avg_size || 0
      
      if (selfieCount < 10) {
        console.log("1. ⚠️  Training data may be insufficient")
        console.log("   → Retrain with 15-25 high-quality, diverse selfies")
        console.log("   → Ensure images show different angles, expressions, lighting")
      }
      
      if (avgSize < 0.1 * 1024 * 1024) {
        console.log("2. ⚠️  Training images may be low quality (small file size)")
        console.log("   → Use higher resolution images (at least 512x512, preferably 1024x1024)")
        console.log("   → Ensure images are clear and not heavily compressed")
      }
      
      if (!activeModel || !activeModel.lora_weights_url) {
        console.log("3. ❌ CRITICAL: LoRA weights URL is missing")
        console.log("   → Check if training completed successfully")
        console.log("   → Verify LoRA extraction process")
      }
      
      if (failedRuns.length > 0) {
        console.log("4. ⚠️  Some training runs failed")
        console.log("   → Check error messages in failed runs")
        console.log("   → Verify training data quality")
      }
      
      console.log("5. ✅ Check training image quality:")
      console.log("   → Images should be clear, well-lit, showing face clearly")
      console.log("   → Avoid heavily filtered or edited images")
      console.log("   → Use diverse angles and expressions")
      console.log("   → Ensure consistent person across all images")
    }

  } catch (error) {
    console.error("❌ Error checking training data:", error)
    throw error
  }
}

checkSandraTraining()
  .then(() => {
    console.log("\n✅ Diagnosis complete")
    process.exit(0)
  })
  .catch((error) => {
    console.error("❌ Diagnosis failed:", error)
    process.exit(1)
  })
