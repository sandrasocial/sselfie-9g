/**
 * Diagnostic script to check Sandra's user data
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

async function diagnoseSandra() {
  try {
    console.log("🔍 Diagnosing user: sandra.r.m.pereira@gmail.com\n")

    // 1. Find user by email
    const userResult = await sql`
      SELECT 
        id,
        email,
        display_name,
        gender,
        ethnicity,
        created_at,
        updated_at
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
    console.log("   Display Name:", user.display_name)
    console.log("   Gender:", user.gender)
    console.log("   Ethnicity:", user.ethnicity)
    console.log("   Created:", user.created_at)
    console.log("   Updated:", user.updated_at)
    console.log()

    // 2. Check user_models (LoRA training)
    // First check what columns exist
    const columnCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_models' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `
    console.log("   Available columns in user_models:", columnCheck.map((c: any) => c.column_name).join(", "))
    
    // Query user_models - use only columns that exist
    const modelsResult = await sql`
      SELECT 
        um.*
      FROM user_models um
      WHERE um.user_id = ${user.id}
      ORDER BY um.created_at DESC
    `

    console.log(`📦 User Models (${modelsResult.length}):`)
    if (modelsResult.length === 0) {
      console.log("   ⚠️  NO MODELS FOUND - This could be the issue!")
      console.log("   → User may be using fallback trigger word (user${userId})")
    } else {
      // Deduplicate by model ID (in case of multiple lora_weights)
      const uniqueModels = new Map()
      modelsResult.forEach((model) => {
        if (!uniqueModels.has(model.id)) {
          uniqueModels.set(model.id, model)
        } else {
          // If we already have this model, check if this one has a LoRA URL
          const existing = uniqueModels.get(model.id)
          if (!existing.lora_url && model.lora_url) {
            uniqueModels.set(model.id, model)
          }
        }
      })

      Array.from(uniqueModels.values()).forEach((model, idx) => {
        console.log(`\n   Model ${idx + 1}:`)
        console.log("   - ID:", model.id)
        console.log("   - Model Name:", model.model_name || model.name || "N/A")
        console.log("   - Trigger Word:", model.trigger_word)
        console.log("   - Is Active:", model.is_active)
        console.log("   - Training Status:", model.training_status || "Unknown")
        console.log("   - LoRA URL:", (model.lora_url || model.lora_weights_url) ? (model.lora_url || model.lora_weights_url).substring(0, 80) + "..." : "NULL ⚠️")
        console.log("   - LoRA Scale:", model.lora_scale || "NULL (defaults to 1.0)")
        console.log("   - Replicate Version ID:", model.replicate_version_id || "NULL")
        console.log("   - Created:", model.created_at)
        console.log("   - Updated:", model.updated_at)
        if (model.completed_at) {
          console.log("   - Training Completed:", model.completed_at)
        }
        // Show all available fields for debugging
        console.log("   - All fields:", Object.keys(model).join(", "))
      })
    }
    console.log()

    // 3. Check user_personal_brand (physical preferences)
    // First check what columns exist
    const brandColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_personal_brand' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `
    console.log("   Available columns in user_personal_brand:", brandColumns.map((c: any) => c.column_name).join(", "))
    
    const brandResult = await sql`
      SELECT 
        upb.*
      FROM user_personal_brand upb
      WHERE upb.user_id = ${user.id}
      ORDER BY upb.created_at DESC
      LIMIT 1
    `

    console.log(`🎨 Brand Profile:`)
    if (brandResult.length === 0) {
      console.log("   ⚠️  NO BRAND PROFILE FOUND")
    } else {
      const brand = brandResult[0]
      console.log("   - Physical Preferences:", brand.physical_preferences || "NULL")
      console.log("   - Brand Name:", brand.brand_name || brand.name || "NULL")
      console.log("   - Visual Aesthetic:", brand.visual_aesthetic || brand.brand_vibe || "NULL")
      console.log("   - Color Theme:", brand.color_theme || "NULL")
      console.log("   - Created:", brand.created_at)
      console.log("   - Updated:", brand.updated_at)
      console.log("   - All fields:", Object.keys(brand).join(", "))
    }
    console.log()

    // 4. Check recent concept generations (last 10)
    // Try concept_cards table first, fallback to maya_chat_messages if needed
    let conceptsResult: any[] = []
    try {
      conceptsResult = await sql`
        SELECT 
          id,
          chat_id,
          title,
          description,
          prompt,
          created_at
        FROM concept_cards
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
        LIMIT 10
      `
    } catch (error: any) {
      // Fallback: check maya_chat_messages for concept_cards JSONB
      console.log("   concept_cards table not found, checking maya_chat_messages...")
      const messagesResult = await sql`
        SELECT 
          m.id,
          m.chat_id,
          m.concept_cards,
          m.created_at
        FROM maya_chat_messages m
        JOIN maya_chats c ON m.chat_id = c.id
        WHERE c.user_id = ${user.id}
        AND m.concept_cards IS NOT NULL
        ORDER BY m.created_at DESC
        LIMIT 10
      `
      conceptsResult = messagesResult.flatMap((msg: any) => {
        if (Array.isArray(msg.concept_cards)) {
          return msg.concept_cards.map((concept: any, idx: number) => ({
            id: `${msg.id}-${idx}`,
            chat_id: msg.chat_id,
            title: concept.title,
            description: concept.description,
            prompt: concept.prompt,
            created_at: msg.created_at
          }))
        }
        return []
      })
    }

    console.log(`💡 Recent Concept Cards (${conceptsResult.length}):`)
    if (conceptsResult.length > 0) {
      conceptsResult.forEach((concept, idx) => {
        console.log(`\n   Concept ${idx + 1} (${concept.created_at}):`)
        console.log("   - Title:", concept.title)
        console.log("   - Prompt (first 150 chars):", concept.prompt?.substring(0, 150) + "...")
        
        // Check for problematic keywords (exclude negated phrases like "not airbrushed")
        const prompt = concept.prompt?.toLowerCase() || ""
        // Check for banned words but exclude when they're negated
        const plasticWordPatterns = [
          { pattern: /\bultra realistic\b/i, name: "ultra realistic" },
          { pattern: /\bphotorealistic\b/i, name: "photorealistic" },
          { pattern: /\b8k\b/i, name: "8k" },
          { pattern: /\b4k\b/i, name: "4k" },
          { pattern: /\bperfect\b(?!\s+(?:golden hour|moment))/i, name: "perfect" }, // Exclude "perfect golden hour moment"
          { pattern: /\bflawless\b/i, name: "flawless" },
          { pattern: /\bstunning\b/i, name: "stunning" },
          { pattern: /\bbeautiful\b/i, name: "beautiful" },
          { pattern: /\bgorgeous\b/i, name: "gorgeous" },
          { pattern: /\bprofessional photography\b/i, name: "professional photography" },
          { pattern: /\beditorial\b/i, name: "editorial" },
          { pattern: /\bmagazine quality\b/i, name: "magazine quality" },
          { pattern: /\bdramatic\b/i, name: "dramatic" },
          { pattern: /\bcinematic\b/i, name: "cinematic" },
          { pattern: /\bhyper detailed\b/i, name: "hyper detailed" },
          { pattern: /\bsharp focus\b/i, name: "sharp focus" },
          { pattern: /\bultra sharp\b/i, name: "ultra sharp" },
          { pattern: /\bcrystal clear\b/i, name: "crystal clear" },
          { pattern: /\bstudio lighting\b/i, name: "studio lighting" },
          { pattern: /\bperfect lighting\b/i, name: "perfect lighting" },
          { pattern: /\bsmooth skin\b/i, name: "smooth skin" },
          { pattern: /\bflawless skin\b/i, name: "flawless skin" },
          { pattern: /\bairbrushed\b(?!\s*[^,]*not)/i, name: "airbrushed" }, // Only if NOT preceded by "not"
        ]
        const foundPlasticWords: string[] = []
        plasticWordPatterns.forEach(({ pattern, name }) => {
          // Check if word appears but is negated (like "not airbrushed")
          const match = prompt.match(pattern)
          if (match) {
            // Check if it's negated
            const beforeMatch = prompt.substring(0, match.index || 0)
            const isNegated = /\bnot\s+\w*\s*$/.test(beforeMatch.slice(-20)) // Check last 20 chars before match
            if (!isNegated) {
              foundPlasticWords.push(name)
            }
          }
        })
        const hasPlasticWords = foundPlasticWords.length > 0
        const hasAuthenticity = /candid|amateur|cellphone|film grain|muted colors|natural skin texture|pores visible|uneven lighting/i.test(prompt)
        const hasIPhone = /shot on iPhone|iPhone/i.test(prompt)
        
        console.log("   - Has Plastic Words:", hasPlasticWords ? `❌ YES (PROBLEM!): ${foundPlasticWords.join(", ")}` : "✅ NO")
        console.log("   - Has Authenticity Keywords:", hasAuthenticity ? "✅ YES" : "❌ NO (PROBLEM!)")
        console.log("   - Has iPhone Specs:", hasIPhone ? "✅ YES" : "❌ NO")
        if (hasPlasticWords) {
          console.log("   - FULL PROMPT:", concept.prompt)
        }
      })
    } else {
      console.log("   ⚠️  NO RECENT CONCEPTS FOUND")
    }
    console.log()

    // 5. Check recent generated images (last 10)
    // Try generated_images table
    let imagesResult: any[] = []
    try {
      imagesResult = await sql`
        SELECT 
          id,
          user_id,
          prompt,
          image_urls,
          selected_url as image_url,
          created_at
        FROM generated_images
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
        LIMIT 10
      `
      // Extract prompt from first image_url if prompt is null
      imagesResult = imagesResult.map((img: any) => ({
        ...img,
        prompt: img.prompt || "No prompt stored",
        image_url: img.image_url || (Array.isArray(img.image_urls) ? img.image_urls[0] : null)
      }))
    } catch (error: any) {
      console.log("   generated_images table query failed:", error.message)
    }

    console.log(`🖼️  Recent Generated Images (${imagesResult.length}):`)
    if (imagesResult.length > 0) {
      imagesResult.forEach((image, idx) => {
        console.log(`\n   Image ${idx + 1} (${image.created_at}):`)
        console.log("   - Model Used:", image.model_used || "Unknown")
        console.log("   - Prompt (first 150 chars):", image.prompt?.substring(0, 150) + "...")
        
        // Check for problematic keywords (exclude negated phrases like "not airbrushed")
        const prompt = image.prompt?.toLowerCase() || ""
        const plasticWordPatterns = [
          { pattern: /\bultra realistic\b/i, name: "ultra realistic" },
          { pattern: /\bphotorealistic\b/i, name: "photorealistic" },
          { pattern: /\b8k\b/i, name: "8k" },
          { pattern: /\b4k\b/i, name: "4k" },
          { pattern: /\bperfect\b(?!\s+(?:golden hour|moment))/i, name: "perfect" },
          { pattern: /\bflawless\b/i, name: "flawless" },
          { pattern: /\bstunning\b/i, name: "stunning" },
          { pattern: /\bbeautiful\b/i, name: "beautiful" },
          { pattern: /\bgorgeous\b/i, name: "gorgeous" },
          { pattern: /\bprofessional photography\b/i, name: "professional photography" },
          { pattern: /\beditorial\b/i, name: "editorial" },
          { pattern: /\bmagazine quality\b/i, name: "magazine quality" },
          { pattern: /\bdramatic\b/i, name: "dramatic" },
          { pattern: /\bcinematic\b/i, name: "cinematic" },
          { pattern: /\bhyper detailed\b/i, name: "hyper detailed" },
          { pattern: /\bsharp focus\b/i, name: "sharp focus" },
          { pattern: /\bultra sharp\b/i, name: "ultra sharp" },
          { pattern: /\bcrystal clear\b/i, name: "crystal clear" },
          { pattern: /\bstudio lighting\b/i, name: "studio lighting" },
          { pattern: /\bperfect lighting\b/i, name: "perfect lighting" },
          { pattern: /\bsmooth skin\b/i, name: "smooth skin" },
          { pattern: /\bflawless skin\b/i, name: "flawless skin" },
          { pattern: /\bairbrushed\b(?!\s*[^,]*not)/i, name: "airbrushed" }, // Only if NOT preceded by "not"
        ]
        const foundPlasticWords: string[] = []
        plasticWordPatterns.forEach(({ pattern, name }) => {
          const match = prompt.match(pattern)
          if (match) {
            // Check if it's negated (like "not airbrushed")
            const beforeMatch = prompt.substring(0, match.index || 0)
            const isNegated = /\bnot\s+\w*\s*$/.test(beforeMatch.slice(-20))
            if (!isNegated) {
              foundPlasticWords.push(name)
            }
          }
        })
        const hasPlasticWords = foundPlasticWords.length > 0
        const hasAuthenticity = /candid|amateur|cellphone|film grain|muted colors|natural skin texture|pores visible|uneven lighting/i.test(prompt)
        const hasIPhone = /shot on iPhone|iPhone/i.test(prompt)
        
        console.log("   - Has Plastic Words:", hasPlasticWords ? `❌ YES (PROBLEM!): ${foundPlasticWords.join(", ")}` : "✅ NO")
        console.log("   - Has Authenticity Keywords:", hasAuthenticity ? "✅ YES" : "❌ NO (PROBLEM!)")
        console.log("   - Has iPhone Specs:", hasIPhone ? "✅ YES" : "❌ NO")
        if (hasPlasticWords) {
          console.log("   - FULL PROMPT:", image.prompt)
        }
      })
    } else {
      console.log("   ⚠️  NO RECENT IMAGES FOUND")
    }
    console.log()

    // 6. Check training runs
    let trainingResult: any[] = []
    try {
      trainingResult = await sql`
        SELECT 
          tr.*
        FROM training_runs tr
        WHERE tr.user_id = ${user.id}
        ORDER BY tr.created_at DESC
        LIMIT 5
      `
    } catch (error: any) {
      console.log("   training_runs query failed:", error.message)
    }

    console.log(`🏋️  Training Runs (${trainingResult.length}):`)
    if (trainingResult.length > 0) {
      trainingResult.forEach((run, idx) => {
        console.log(`\n   Run ${idx + 1}:`)
        console.log("   - Status:", run.status)
        console.log("   - Progress:", run.progress)
        console.log("   - Started:", run.started_at)
        console.log("   - Completed:", run.completed_at)
        if (run.error_message) {
          console.log("   - Error:", run.error_message)
        }
      })
    } else {
      console.log("   ⚠️  NO TRAINING RUNS FOUND")
    }
    console.log()

    // 7. Summary and recommendations
    console.log("📊 DIAGNOSIS SUMMARY:")
    console.log("=" .repeat(50))
    
    // Deduplicate models for summary
    const uniqueModels = new Map()
    modelsResult.forEach((model) => {
      if (!uniqueModels.has(model.id)) {
        uniqueModels.set(model.id, model)
      } else {
        const existing = uniqueModels.get(model.id)
        if (!existing.lora_url && model.lora_url) {
          uniqueModels.set(model.id, model)
        }
      }
    })
    const modelsArray = Array.from(uniqueModels.values())
    
    // Check for active model - user_models might not have is_active column, check training_status instead
    const activeModel = modelsArray.find(m => 
      (m.is_active === true || m.is_active === undefined) && 
      (m.training_status === 'completed' || m.training_status === null)
    ) || modelsArray.find(m => m.training_status === 'completed')
    
    if (!activeModel) {
      console.log("❌ CRITICAL: No completed model found!")
      console.log("   → User may be using fallback trigger word")
    } else {
      console.log("✅ Active/completed model found:", activeModel.trigger_word)
      if (!activeModel.lora_url && !activeModel.lora_weights_url) {
        console.log("⚠️  WARNING: Model has no LoRA URL!")
        console.log("   → This means the LoRA weights are not linked properly")
      } else {
        console.log("✅ LoRA URL present")
      }
      if (activeModel.training_status && activeModel.training_status !== 'completed') {
        console.log("⚠️  WARNING: Training status is not 'completed':", activeModel.training_status)
      } else {
        console.log("✅ Training status: completed")
      }
      if (activeModel.lora_scale && parseFloat(activeModel.lora_scale) < 0.8) {
        console.log("⚠️  WARNING: LoRA scale is low:", activeModel.lora_scale)
        console.log("   → Consider increasing to 0.9-1.0 for better likeness")
      } else {
        console.log("✅ LoRA scale:", activeModel.lora_scale || "1.0 (default)")
      }
    }

    const hasPhysicalPrefs = brandResult.length > 0 && brandResult[0].physical_preferences
    if (!hasPhysicalPrefs) {
      console.log("⚠️  WARNING: No physical preferences set")
    } else {
      console.log("✅ Physical preferences found")
    }

    // Check recent prompts for issues
    const recentPrompts = [...conceptsResult, ...imagesResult]
      .map(item => item.prompt)
      .filter(Boolean)
      .slice(0, 5)

    if (recentPrompts.length > 0) {
      const plasticCount = recentPrompts.filter(p => 
        /ultra realistic|photorealistic|8k|4k|perfect|flawless|stunning|beautiful|gorgeous|professional photography|editorial|magazine quality|dramatic|cinematic|hyper detailed|sharp focus|ultra sharp|crystal clear|studio lighting|perfect lighting|smooth skin|flawless skin|airbrushed/i.test(p?.toLowerCase() || "")
      ).length

      const authenticityCount = recentPrompts.filter(p =>
        /candid|amateur|cellphone|film grain|muted colors|natural skin texture|pores visible|uneven lighting/i.test(p?.toLowerCase() || "")
      ).length

      console.log("\n📝 Recent Prompt Analysis:")
      console.log(`   - Prompts with plastic words: ${plasticCount}/${recentPrompts.length}`)
      console.log(`   - Prompts with authenticity keywords: ${authenticityCount}/${recentPrompts.length}`)
      
      if (plasticCount > 0) {
        console.log("   ❌ PROBLEM: Recent prompts contain banned plastic words!")
      }
      if (authenticityCount < recentPrompts.length * 0.8) {
        console.log("   ⚠️  WARNING: Many prompts missing authenticity keywords")
      }
    }

    console.log("\n💡 RECOMMENDATIONS:")
    console.log("=" .repeat(50))
    
    if (!activeModel) {
      console.log("1. Ensure user has a completed training run")
      console.log("2. Check if trigger word is being used correctly")
    }
    
    if (recentPrompts.length > 0) {
      const hasPlastic = recentPrompts.some(p => 
        /ultra realistic|photorealistic|8k|4k|perfect|flawless|stunning|beautiful|gorgeous|professional photography|editorial|magazine quality|dramatic|cinematic|hyper detailed|sharp focus|ultra sharp|crystal clear|studio lighting|perfect lighting|smooth skin|flawless skin|airbrushed/i.test(p?.toLowerCase() || "")
      )
      
      if (hasPlastic) {
        console.log("1. ❌ CRITICAL: Recent prompts contain banned words that cause plastic look")
        console.log("   → Check if Enhanced Authenticity toggle is ON")
        console.log("   → Verify prompt generation is removing banned words")
        console.log("   → Check if user is manually editing prompts to add these words")
      }
    }

    if (!hasPhysicalPrefs) {
      console.log("2. User should set physical preferences in brand profile")
    }

    if (activeModel && activeModel.lora_scale && parseFloat(activeModel.lora_scale) < 0.8) {
      console.log("3. Consider increasing LoRA scale to 0.9-1.0 for better likeness")
    }

    console.log("4. Enable Enhanced Authenticity toggle in Classic mode settings")
    console.log("5. Check if user is in Studio Pro mode (should use Nano Banana, not Flux)")

  } catch (error) {
    console.error("❌ Error diagnosing user:", error)
    throw error
  }
}

diagnoseSandra()
  .then(() => {
    console.log("\n✅ Diagnosis complete")
    process.exit(0)
  })
  .catch((error) => {
    console.error("❌ Diagnosis failed:", error)
    process.exit(1)
  })
