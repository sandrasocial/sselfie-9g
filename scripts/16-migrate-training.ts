import { neon } from "@neondatabase/serverless"
import { createClient } from "@supabase/supabase-js"

const prodDb = neon(
  "postgresql://neondb_owner:npg_4JbrOoe0YugU@ep-dawn-mountain-adwrqtdk-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require",
)

const supabaseUrl = process.env.SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

const supabase = createClient(supabaseUrl, supabaseKey)

async function migrateTraining() {
  console.log("[v0] Migrating training runs...")

  try {
    const trainingRuns = await prodDb`SELECT * FROM training_runs`
    console.log(`[v0] Found ${trainingRuns.length} training runs`)

    for (const run of trainingRuns) {
      const { error } = await supabase.from("training_runs").upsert(
        {
          id: run.id,
          user_id: run.user_id,
          replicate_model_id: run.replicate_model_id,
          trigger_word: run.trigger_word,
          training_status: run.training_status || "pending",
          model_name: run.model_name,
          created_at: run.created_at,
          completed_at: run.completed_at,
          replicate_version_id: run.replicate_version_id,
          training_progress: run.training_progress || 0,
          estimated_completion_time: run.estimated_completion_time,
          failure_reason: run.failure_reason,
          updated_at: run.updated_at,
          trained_model_path: run.trained_model_path,
          started_at: run.started_at,
          is_luxury: run.is_luxury || false,
          model_type: run.model_type || "flux",
          finetune_id: run.finetune_id,
          lora_weights_url: run.lora_weights_url,
          training_id: run.training_id,
        },
        { onConflict: "id" },
      )

      if (error) {
        console.log(`[v0] ✗ Error migrating training run ${run.id}:`, error.message)
      } else {
        console.log(`[v0] ✓ Migrated training run ${run.id}`)
      }
    }

    console.log("[v0] ✅ Training runs migration complete!")
  } catch (error) {
    console.error("[v0] Migration failed:", error)
  }
}

migrateTraining()
