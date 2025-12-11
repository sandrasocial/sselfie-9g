import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
// getUserByAuthId will be imported dynamically where needed
import { generateText } from "ai"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { neon } from "@neondatabase/serverless"
import { getMotionSuggestions, getIntensityDistribution } from "@/lib/maya/motion-libraries"
import { isTooSimilarToRecent, findMostDifferentPrompt } from "@/lib/maya/motion-similarity"
import { getUserMotionPreferences, getRecommendedIntensity } from "@/lib/maya/user-preferences"

const sql = neon(process.env.DATABASE_URL || "")

/**
 * Fetch recent motion prompts for a user to ensure diversity
 */
async function getRecentMotionPrompts(userId: number, limit: number = 8): Promise<string[]> {
  try {
    const recentPrompts = await sql`
      SELECT motion_prompt
      FROM generated_videos
      WHERE user_id = ${userId}
        AND motion_prompt IS NOT NULL
        AND motion_prompt != ''
        AND status = 'completed'
      ORDER BY created_at DESC
      LIMIT ${limit}
    `
    return recentPrompts.map((row: any) => row.motion_prompt).filter(Boolean)
  } catch (error) {
    console.error("[v0] Error fetching recent motion prompts:", error)
    return []
  }
}

/**
 * Generate diversity constraint text from recent prompts
 */
function buildDiversityConstraint(recentPrompts: string[]): string {
  if (recentPrompts.length === 0) {
    return ""
  }

  const uniquePrompts = recentPrompts.slice(0, 5) // Use last 5 for diversity
  return `

**DIVERSITY REQUIREMENT:**
The user has recently generated videos with these motion prompts. Create something COMPLETELY DIFFERENT:
${uniquePrompts.map((p, i) => `${i + 1}. "${p}"`).join("\n")}

Avoid similar motions, camera movements, or phrasing. Be creative and unique!`
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { fluxPrompt, description, category, imageUrl } = await request.json()

    if (!fluxPrompt) {
      return NextResponse.json({ error: "FLUX prompt is required" }, { status: 400 })
    }

    const userContext = await getUserContextForMaya(authUser.id)

    // Fetch recent motion prompts for diversity
    const recentPrompts = await getRecentMotionPrompts(Number(neonUser.id))
    const diversityConstraint = buildDiversityConstraint(recentPrompts)

    // Get user preferences for personalized motion selection
    const userPreferences = await getUserMotionPreferences(Number(neonUser.id))
    const recommendedIntensity = getRecommendedIntensity(userPreferences, category)

    // Get motion suggestions from library based on category
    const motionSuggestions = category
      ? getMotionSuggestions(category, recentPrompts, 3)
      : []

    console.log("[v0] === GENERATING MOTION PROMPT FOR WAN-2.5 I2V ===")
    console.log("[v0] FLUX Prompt:", fluxPrompt)
    console.log("[v0] Description:", description)
    console.log("[v0] Category:", category)
    console.log("[v0] Image URL:", imageUrl ? `✅ Provided: ${imageUrl.substring(0, 100)}...` : "❌ NOT PROVIDED - Claude cannot analyze image!")
    console.log("[v0] Recent prompts found:", recentPrompts.length)
    console.log("[v0] Recommended intensity:", recommendedIntensity)
    console.log("[v0] Motion suggestions from library:", motionSuggestions.length)
    if (recentPrompts.length > 0) {
      console.log("[v0] Ensuring diversity from recent videos")
    }

    if (imageUrl) {
      // Validate image URL format
      const isValidUrl = imageUrl.startsWith("http://") || imageUrl.startsWith("https://") || imageUrl.startsWith("data:")
      if (!isValidUrl) {
        console.log("[v0] ⚠️ WARNING: Invalid image URL format:", imageUrl.substring(0, 50))
        console.log("[v0] ⚠️ Claude may not be able to access this image")
      }
      
      console.log("[v0] ✅ Using Claude vision analysis for pose-accurate motion")
      console.log("[v0] 📸 Image will be analyzed by Claude Sonnet 4 for:")
      console.log("[v0]    - Body position and pose")
      console.log("[v0]    - Hand/arm positions")
      console.log("[v0]    - Environment and context")
      console.log("[v0]    - Motion constraints")
      console.log("[v0] 📐 Image URL format:", isValidUrl ? "✅ Valid" : "❌ Invalid")
    } else {
      console.log("[v0] ⚠️ WARNING: No imageUrl provided - Claude will generate motion from text only (less accurate)")
    }

    if (imageUrl) {

      // Build motion inspiration from library
      const motionInspiration = motionSuggestions.length > 0
        ? `\n**MOTION INSPIRATION (use as reference, but create something unique):**
${motionSuggestions.map((m, i) => `${i + 1}. "${m.motion}; ${m.camera}" (${m.intensity} intensity)`).join("\n")}
Use these as inspiration but create something DIFFERENT and unique to this specific image.`
        : ""

      const intensityGuidance = `\n**RECOMMENDED INTENSITY:** ${recommendedIntensity} (based on user preferences, but feel free to vary if the image suggests otherwise)`

      const visionPrompt = `You're Maya - a creative director specializing in authentic Instagram B-roll motion for WAN-2.5 I2V.

**ENHANCED IMAGE ANALYSIS (MINIMAL EXPRESSION FOCUS):**
1. **Body Position:** Exact pose? (sitting, standing, leaning, walking, etc.)
2. **Hands/Arms:** Where positioned? What are they doing or could do?
3. **Head & Gaze:** Position? Direction? **Keep expression minimal/neutral - NO smiling or dramatic expressions**
4. **Environment:** Indoor/outdoor? Specific location? Objects nearby?
5. **Energy Level:** Relaxed, alert, contemplative, energetic, calm? (Express through body, NOT face)
6. **Objects Present:** Coffee, phone, book, accessories, clothing details?
7. **Natural Triggers:** Breeze, light shifts, shadows, sounds, temperature, textures?
8. **Interaction Opportunities:** What could the subject interact with naturally? (Hands/body, NOT facial reactions)
9. **Mood & Atmosphere:** What feeling does the scene evoke? (Express through body language, NOT facial expression)
10. **Motion Constraints:** What movements are physically possible from this pose? **Focus on body movements, NOT facial expressions**

**WAN-2.5 I2V MOTION FORMULA:**
Motion Description + Camera Movement (split on purpose)

**5-SECOND STRUCTURE:**
[0-2s] Initial subject motion + camera starts
[2-4s] Motion develops + camera continues
[4-5s] Settle + camera completes

**PROMPT FORMAT:**
"[Subject performs action]; camera [specific movement]"

**SUBJECT MOTION PRINCIPLES (30-50 words) - MINIMAL EXPRESSION FOCUS:**
- Match the exact pose (sitting stays sitting, standing stays standing)
- **🔴 MINIMAL EXPRESSIONS:** Keep facial expressions neutral, subtle, or minimal - avoid any dramatic expressions
- **🔴 NO SMILING:** Never include smiling, laughing, or grinning - these make videos look fake and AI-generated
- Use micro-movements: blinks, breaths, subtle weight shifts, finger movements, eye movements (NOT facial expressions)
- Speed modifiers: slowly, gently, subtly, gradually, softly, naturally, smoothly
- Natural triggers: breeze, light shifts, shadows, reflections, sounds, warmth, textures
- Body parts: eyes (subtle glances), head (gentle turns), fingers, hands, shoulders, chest, hair, neck - **AVOID lips/mouth movements**
- ONE continuous fluid sequence - no jumps or cuts
- Motion intensity: Keep it subtle (10-20%) or moderate (30-50%) - avoid dynamic (60-80%) which looks fake

**MOTION TYPES TO CONSIDER (MINIMAL EXPRESSION):**
- Environmental: breeze effects, light shifts, shadow movements, reflections
- Physiological: breathing, subtle weight shifts, muscle relaxations - **AVOID micro-expressions (they look fake)**
- Interactional: object handling, clothing adjustments, hair movements, accessory touches
- Temporal: morning energy, evening calm, mid-day pause, contemplative moments
- Sensory: subtle reactions to warmth, cold, texture, sound, visual interest - **NO facial reactions, just body/head movements**

**🔴 EXPRESSION RULES (CRITICAL FOR AUTHENTICITY):**
- **Facial expression:** Keep neutral, minimal, or completely omit
- **Eyes:** Subtle glances, gentle blinks, looking away naturally - NOT dramatic eye movements
- **Mouth/Lips:** NEVER mention - no smiling, no lip movements, no mouth expressions
- **Face:** Neutral, relaxed, contemplative - NOT expressive, NOT animated
- **Focus on body:** Hands, shoulders, head turns, weight shifts - NOT facial expressions

**EXPANDED CAMERA MOVEMENT OPTIONS (choose one):**
- "camera fixed" (most authentic Instagram, no movement)
- "camera gentle push-in" (subtle intimacy, 10-15% zoom)
- "camera subtle pull-out" (reveal more context, breathing room)
- "camera slight tilt up" (reveal upper context, sky, ceiling)
- "camera slight tilt down" (reveal lower context, ground, objects)
- "camera slow pan left" (environmental reveal, follow action)
- "camera slow pan right" (environmental reveal, follow action)
- "camera subtle dolly-in" (intimate approach, focus on subject)
- "camera subtle dolly-out" (contextual reveal, space expansion)
- "camera gentle arc left" (cinematic movement, dynamic framing)
- "camera gentle arc right" (cinematic movement, dynamic framing)
- "camera slight rotation clockwise" (subtle dynamism)
- "camera slight rotation counter-clockwise" (subtle dynamism)
- "camera fixed with micro-adjust" (imperceptible human-like movement)

**KEY FOR REALISM:**
- Split motion on purpose: subject performs; camera moves independently
- Favor gentle camera moves (70% static, 30% movement) to prevent jitter
- Keep camera mostly static for Instagram authenticity
- Avoid tiny flickering details that cause artifacts
- No conflicting movements with pose
- Motion should feel natural and unforced

❌ AVOID (CRITICAL - These make videos look fake):
- **SMILING, LAUGHING, GRINNING** - These always look fake and AI-generated
- **Any facial expressions** - Keep face neutral, minimal, or omit entirely
- **Micro-expressions** - Too subtle to animate well, looks fake
- **Lip/mouth movements** - Never mention these
- **Dramatic eye movements** - Keep eyes subtle (gentle glances, blinks only)
- Dramatic gestures or poses that don't match the image
- Walking/running if person is still in image
- Camera-aware movements (subject looking at camera)
- Multiple simultaneous complex actions
- Fast camera movements that cause jitter
- Repetitive motions from recent videos
- **Expressive faces** - Neutral is more authentic${diversityConstraint}

Scene: "${fluxPrompt}"
${description ? `Mood: "${description}"` : ""}
${category ? `Category: "${category}"` : ""}${motionInspiration}${intensityGuidance}${diversityConstraint}

Return ONLY: [Subject motion]; camera [movement]
No headers, quotes, explanations, or bullet points.`

      console.log("[v0] 🔍 Sending image to Claude Sonnet 4 for vision analysis...")
      console.log("[v0] 📋 Vision prompt length:", visionPrompt.length, "characters")

      const { text: motionPrompt } = await generateText({
        model: "anthropic/claude-sonnet-4-20250514",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: visionPrompt,
              },
              {
                type: "image",
                image: imageUrl, // Claude will analyze this image URL
              },
            ],
          },
        ],
        temperature: 0.85,
      })
      
      console.log("[v0] ✅ Claude vision analysis complete")
      console.log("[v0] 📝 Raw motion prompt from Claude:", motionPrompt.substring(0, 200))

      let trimmedPrompt = motionPrompt.trim()

      // Remove markdown headers
      trimmedPrompt = trimmedPrompt.replace(/\*\*[^*]+:\*\*/g, "")

      // Remove bullet points
      trimmedPrompt = trimmedPrompt.replace(/^[-*•]\s*/gm, "")

      // Take only first line (ignore explanations)
      trimmedPrompt = trimmedPrompt.split("\n")[0]

      // Remove quotes
      trimmedPrompt = trimmedPrompt.replace(/^["'`]|["'`]$/g, "")

      // Remove asterisks
      trimmedPrompt = trimmedPrompt.replace(/\*/g, "")

      // Remove any prefixes like "Motion:" or "Prompt:"
      trimmedPrompt = trimmedPrompt.replace(/^(motion|prompt|description):\s*/i, "")

      // 🔴 POST-PROCESSING: Remove expression-related words that make videos look fake
      const expressionWords = [
        "smiling", "smile", "laughing", "laugh", "grinning", "grin",
        "micro-expression", "micro-expressions", "facial expression", "facial expressions",
        "expressive", "animated face", "face lights up", "eyes light up",
        "lip movements", "mouth movements", "lips part", "mouth opens"
      ]
      
      expressionWords.forEach((word) => {
        const regex = new RegExp(`\\b${word}\\b`, "gi")
        trimmedPrompt = trimmedPrompt.replace(regex, "")
      })

      // Clean up multiple commas and spaces
      trimmedPrompt = trimmedPrompt.replace(/,\s*,/g, ",").replace(/\s+/g, " ").trim()

      // Final trim
      trimmedPrompt = trimmedPrompt.trim()

      // Check semantic similarity with recent prompts
      const isSimilar = await isTooSimilarToRecent(trimmedPrompt, recentPrompts, 0.65)
      
      if (isSimilar && recentPrompts.length > 0) {
        console.log("[v0] ⚠️ Generated prompt too similar to recent, generating alternative...")
        
        // Generate 2 more alternatives
        const alternatives: string[] = [trimmedPrompt]
        
        for (let i = 0; i < 2; i++) {
          const altResult = await generateText({
            model: "anthropic/claude-sonnet-4-20250514",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: visionPrompt + `\n\nIMPORTANT: The previous attempt was too similar to recent videos. Create something COMPLETELY DIFFERENT.`,
                  },
                  {
                    type: "image",
                    image: imageUrl,
                  },
                ],
              },
            ],
            temperature: 0.9 + Math.random() * 0.1, // Higher temperature for more variation
          })
          
          let altPrompt = altResult.text.trim()
          altPrompt = altPrompt.replace(/\*\*[^*]+:\*\*/g, "")
          altPrompt = altPrompt.replace(/^[-*•]\s*/gm, "")
          altPrompt = altPrompt.split("\n")[0]
          altPrompt = altPrompt.replace(/^["'`]|["'`]$/g, "")
          altPrompt = altPrompt.replace(/\*/g, "")
          altPrompt = altPrompt.replace(/^(motion|prompt|description):\s*/i, "")
          
          // 🔴 POST-PROCESSING: Remove expression-related words that make videos look fake
          const expressionWords = [
            "smiling", "smile", "laughing", "laugh", "grinning", "grin",
            "micro-expression", "micro-expressions", "facial expression", "facial expressions",
            "expressive", "animated face", "face lights up", "eyes light up",
            "lip movements", "mouth movements", "lips part", "mouth opens"
          ]
          
          expressionWords.forEach((word) => {
            const regex = new RegExp(`\\b${word}\\b`, "gi")
            altPrompt = altPrompt.replace(regex, "")
          })

          // Clean up multiple commas and spaces
          altPrompt = altPrompt.replace(/,\s*,/g, ",").replace(/\s+/g, " ").trim()
          
          altPrompt = altPrompt.trim()
          
          alternatives.push(altPrompt)
        }
        
        // Find the most different one
        trimmedPrompt = await findMostDifferentPrompt(alternatives, recentPrompts)
        console.log("[v0] ✅ Selected most different alternative")
      }

      console.log("[v0] ========================================")
      console.log("[v0] Wan-2.5 I2V optimized motion prompt:")
      console.log("[v0]", trimmedPrompt)
      console.log("[v0] Word count:", trimmedPrompt.split(" ").length)
      console.log("[v0] Intensity:", recommendedIntensity)
      console.log("[v0] ========================================")

      return NextResponse.json({
        motionPrompt: trimmedPrompt,
        success: true,
      })
    }

    console.log("[v0] No image - generating from FLUX prompt with Wan-2.5 best practices")

    // Vary temperature for more diversity (0.75-0.95 range)
    const temperature = 0.75 + Math.random() * 0.2 // Random between 0.75 and 0.95

    // Build motion inspiration from library
    const motionInspiration = motionSuggestions.length > 0
      ? `\n**MOTION INSPIRATION (use as reference, but create something unique):**
${motionSuggestions.map((m, i) => `${i + 1}. "${m.motion}; ${m.camera}" (${m.intensity} intensity)`).join("\n")}
Use these as inspiration but create something DIFFERENT and unique.`
      : ""

    const intensityGuidance = `\n**RECOMMENDED INTENSITY:** ${recommendedIntensity} (based on user preferences)`

    const { text: motionPrompt } = await generateText({
      model: "anthropic/claude-sonnet-4-20250514",
      system: `You're Maya, creating authentic motion prompts for WAN-2.5 I2V (image-to-video) 5-second clips.

**WAN-2.5 FORMULA:**
Motion Description + Camera Movement (split on purpose)

**FORMAT:**
"[Subject performs action]; camera [specific movement]"

**5-SECOND STRUCTURE:**
[0-2s] Initial subject motion + camera starts
[2-4s] Motion develops + camera continues  
[4-5s] Settle + camera completes

**SUBJECT MOTION PRINCIPLES (30-50 words) - MINIMAL EXPRESSION FOCUS:**
- Use varied speed modifiers: slowly, gently, subtly, gradually, softly, naturally, smoothly, delicately, tenderly
- **🔴 MINIMAL EXPRESSIONS:** Keep facial expressions neutral, subtle, or minimal - avoid any dramatic expressions
- **🔴 NO SMILING:** Never include smiling, laughing, or grinning - these make videos look fake and AI-generated
- Specify body parts: eyes (subtle glances only), head, fingers, hands, shoulders, chest, hair, neck, arms, legs - **AVOID lips/mouth**
- Natural triggers: breeze, light shifts, shadows, reflections, sounds, warmth, textures, temperature changes
- Motion intensity: Keep it subtle (10-20%) or moderate (30-50%) - avoid dynamic (60-80%) which looks fake
- ONE continuous sequence - no jumps or cuts
- Micro-movements: blinks, breaths, weight shifts, finger movements, subtle eye movements (NOT facial expressions), muscle relaxations

**MOTION TYPES TO CONSIDER (MINIMAL EXPRESSION):**
- Environmental: breeze effects, light shifts, shadow movements, reflections, temperature changes
- Physiological: breathing, subtle weight shifts, muscle relaxations, natural fidgets - **AVOID micro-expressions (they look fake)**
- Interactional: object handling, clothing adjustments, hair movements, accessory touches, phone interactions
- Temporal: morning energy, evening calm, mid-day pause, contemplative moments, energetic bursts
- Sensory: reacting to warmth, cold, texture, sound, visual interest, smells

**EXPANDED CAMERA MOVEMENT OPTIONS (choose one):**
- "camera fixed" (most authentic Instagram, no movement - use 40% of the time)
- "camera gentle push-in" (subtle intimacy, 10-15% zoom)
- "camera subtle pull-out" (reveal more context, breathing room)
- "camera slight tilt up" (reveal upper context, sky, ceiling)
- "camera slight tilt down" (reveal lower context, ground, objects)
- "camera slow pan left" (environmental reveal, follow action)
- "camera slow pan right" (environmental reveal, follow action)
- "camera subtle dolly-in" (intimate approach, focus on subject)
- "camera subtle dolly-out" (contextual reveal, space expansion)
- "camera gentle arc left" (cinematic movement, dynamic framing)
- "camera gentle arc right" (cinematic movement, dynamic framing)
- "camera slight rotation clockwise" (subtle dynamism)
- "camera slight rotation counter-clockwise" (subtle dynamism)
- "camera fixed with micro-adjust" (imperceptible human-like movement)

**KEY PRINCIPLES:**
- Split motion: subject performs; camera moves independently
- Favor gentle camera moves (70% static, 30% movement) to prevent jitter
- Keep camera mostly static for Instagram authenticity
- Avoid tiny flickering details that cause artifacts
- Motion should feel natural and unforced
- Vary motion intensity and camera movement type for diversity${diversityConstraint}

**🔴 EXPRESSION RULES (CRITICAL FOR AUTHENTICITY):**
- **Facial expression:** Keep neutral, minimal, or completely omit
- **Eyes:** Subtle glances, gentle blinks, looking away naturally - NOT dramatic eye movements
- **Mouth/Lips:** NEVER mention - no smiling, no lip movements, no mouth expressions
- **Face:** Neutral, relaxed, contemplative - NOT expressive, NOT animated
- **Focus on body:** Hands, shoulders, head turns, weight shifts - NOT facial expressions

❌ AVOID (CRITICAL - These make videos look fake):
- **SMILING, LAUGHING, GRINNING** - These always look fake and AI-generated
- **Any facial expressions** - Keep face neutral, minimal, or omit entirely
- **Micro-expressions** - Too subtle to animate well, looks fake
- **Lip/mouth movements** - Never mention these
- **Dramatic eye movements** - Keep eyes subtle (gentle glances, blinks only)
- Dramatic gestures or poses that don't match the image
- Walking/running if person is still in image
- Camera-aware movements (subject looking at camera)
- Multiple simultaneous complex actions
- Fast camera movements that cause jitter
- **Expressive faces** - Neutral is more authentic

Return ONLY: [Subject motion]; camera [movement]`,
      prompt: `Scene: "${fluxPrompt}"
${description ? `Mood: "${description}"` : ""}
${category ? `Category: "${category}"` : ""}${motionInspiration}${intensityGuidance}${diversityConstraint}

Create a unique 5-second motion sequence that feels authentic and human:`,
      temperature: temperature,
    })

    let trimmedPrompt = motionPrompt.trim()
    trimmedPrompt = trimmedPrompt.replace(/\*\*[^*]+:\*\*/g, "")
    trimmedPrompt = trimmedPrompt.replace(/^[-*•]\s*/gm, "")
    trimmedPrompt = trimmedPrompt.split("\n")[0]
    trimmedPrompt = trimmedPrompt.replace(/^["'`]|["'`]$/g, "")
    trimmedPrompt = trimmedPrompt.replace(/\*/g, "")
    trimmedPrompt = trimmedPrompt.replace(/^(motion|prompt|description):\s*/i, "")
    
    // 🔴 POST-PROCESSING: Remove expression-related words that make videos look fake
    const expressionWords = [
      "smiling", "smile", "laughing", "laugh", "grinning", "grin",
      "micro-expression", "micro-expressions", "facial expression", "facial expressions",
      "expressive", "animated face", "face lights up", "eyes light up",
      "lip movements", "mouth movements", "lips part", "mouth opens"
    ]
    
    expressionWords.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, "gi")
      trimmedPrompt = trimmedPrompt.replace(regex, "")
    })

    // Clean up multiple commas and spaces
    trimmedPrompt = trimmedPrompt.replace(/,\s*,/g, ",").replace(/\s+/g, " ").trim()
    
    trimmedPrompt = trimmedPrompt.trim()

    // Check semantic similarity with recent prompts
    const isSimilar = await isTooSimilarToRecent(trimmedPrompt, recentPrompts, 0.65)
    
    if (isSimilar && recentPrompts.length > 0) {
      console.log("[v0] ⚠️ Generated prompt too similar to recent, generating alternative...")
      
      // Generate 2 more alternatives
      const alternatives: string[] = [trimmedPrompt]
      
      for (let i = 0; i < 2; i++) {
        const altResult = await generateText({
          model: "anthropic/claude-sonnet-4-20250514",
          system: `You're Maya, creating authentic motion prompts for WAN-2.5 I2V (image-to-video) 5-second clips.

**WAN-2.5 FORMULA:**
Motion Description + Camera Movement (split on purpose)

**FORMAT:**
"[Subject performs action]; camera [specific movement]"

**5-SECOND STRUCTURE:**
[0-2s] Initial subject motion + camera starts
[2-4s] Motion develops + camera continues  
[4-5s] Settle + camera completes

**SUBJECT MOTION PRINCIPLES (30-50 words) - MINIMAL EXPRESSION FOCUS:**
- Use varied speed modifiers: slowly, gently, subtly, gradually, softly, naturally, smoothly, delicately, tenderly
- **🔴 MINIMAL EXPRESSIONS:** Keep facial expressions neutral, subtle, or minimal - avoid any dramatic expressions
- **🔴 NO SMILING:** Never include smiling, laughing, or grinning - these make videos look fake and AI-generated
- Specify body parts: eyes (subtle glances only), head, fingers, hands, shoulders, chest, hair, neck, arms, legs - **AVOID lips/mouth**
- Natural triggers: breeze, light shifts, shadows, reflections, sounds, warmth, textures, temperature changes
- Motion intensity: Keep it subtle (10-20%) or moderate (30-50%) - avoid dynamic (60-80%) which looks fake
- ONE continuous sequence - no jumps or cuts
- Micro-movements: blinks, breaths, weight shifts, finger movements, subtle eye movements (NOT facial expressions), muscle relaxations

**MOTION TYPES TO CONSIDER (MINIMAL EXPRESSION):**
- Environmental: breeze effects, light shifts, shadow movements, reflections, temperature changes
- Physiological: breathing, subtle weight shifts, muscle relaxations, natural fidgets - **AVOID micro-expressions (they look fake)**
- Interactional: object handling, clothing adjustments, hair movements, accessory touches, phone interactions
- Temporal: morning energy, evening calm, mid-day pause, contemplative moments, energetic bursts
- Sensory: reacting to warmth, cold, texture, sound, visual interest, smells

**EXPANDED CAMERA MOVEMENT OPTIONS (choose one):**
- "camera fixed" (most authentic Instagram, no movement - use 40% of the time)
- "camera gentle push-in" (subtle intimacy, 10-15% zoom)
- "camera subtle pull-out" (reveal more context, breathing room)
- "camera slight tilt up" (reveal upper context, sky, ceiling)
- "camera slight tilt down" (reveal lower context, ground, objects)
- "camera slow pan left" (environmental reveal, follow action)
- "camera slow pan right" (environmental reveal, follow action)
- "camera subtle dolly-in" (intimate approach, focus on subject)
- "camera subtle dolly-out" (contextual reveal, space expansion)
- "camera gentle arc left" (cinematic movement, dynamic framing)
- "camera gentle arc right" (cinematic movement, dynamic framing)
- "camera slight rotation clockwise" (subtle dynamism)
- "camera slight rotation counter-clockwise" (subtle dynamism)
- "camera fixed with micro-adjust" (imperceptible human-like movement)

**KEY PRINCIPLES:**
- Split motion: subject performs; camera moves independently
- Favor gentle camera moves (70% static, 30% movement) to prevent jitter
- Keep camera mostly static for Instagram authenticity
- Avoid tiny flickering details that cause artifacts
- Motion should feel natural and unforced
- Vary motion intensity and camera movement type for diversity${diversityConstraint}

**🔴 EXPRESSION RULES (CRITICAL FOR AUTHENTICITY):**
- **Facial expression:** Keep neutral, minimal, or completely omit
- **Eyes:** Subtle glances, gentle blinks, looking away naturally - NOT dramatic eye movements
- **Mouth/Lips:** NEVER mention - no smiling, no lip movements, no mouth expressions
- **Face:** Neutral, relaxed, contemplative - NOT expressive, NOT animated
- **Focus on body:** Hands, shoulders, head turns, weight shifts - NOT facial expressions

❌ AVOID (CRITICAL - These make videos look fake):
- **SMILING, LAUGHING, GRINNING** - These always look fake and AI-generated
- **Any facial expressions** - Keep face neutral, minimal, or omit entirely
- **Micro-expressions** - Too subtle to animate well, looks fake
- **Lip/mouth movements** - Never mention these
- **Dramatic eye movements** - Keep eyes subtle (gentle glances, blinks only)
- Dramatic gestures or poses that don't match the image
- Walking/running if person is still in image
- Camera-aware movements (subject looking at camera)
- Multiple simultaneous complex actions
- Fast camera movements that cause jitter
- **Expressive faces** - Neutral is more authentic

Return ONLY: [Subject motion]; camera [movement]`,
          prompt: `Scene: "${fluxPrompt}"
${description ? `Mood: "${description}"` : ""}
${category ? `Category: "${category}"` : ""}${motionInspiration}${intensityGuidance}

IMPORTANT: The previous attempt was too similar to recent videos. Create something COMPLETELY DIFFERENT and unique.`,
          temperature: 0.9 + Math.random() * 0.1, // Higher temperature for more variation
        })
        
        let altPrompt = altResult.text.trim()
        altPrompt = altPrompt.replace(/\*\*[^*]+:\*\*/g, "")
        altPrompt = altPrompt.replace(/^[-*•]\s*/gm, "")
        altPrompt = altPrompt.split("\n")[0]
        altPrompt = altPrompt.replace(/^["'`]|["'`]$/g, "")
        altPrompt = altPrompt.replace(/\*/g, "")
        altPrompt = altPrompt.replace(/^(motion|prompt|description):\s*/i, "")
        
        // 🔴 POST-PROCESSING: Remove expression-related words that make videos look fake
        const expressionWords = [
          "smiling", "smile", "laughing", "laugh", "grinning", "grin",
          "micro-expression", "micro-expressions", "facial expression", "facial expressions",
          "expressive", "animated face", "face lights up", "eyes light up",
          "lip movements", "mouth movements", "lips part", "mouth opens"
        ]
        
        expressionWords.forEach((word) => {
          const regex = new RegExp(`\\b${word}\\b`, "gi")
          altPrompt = altPrompt.replace(regex, "")
        })

        // Clean up multiple commas and spaces
        altPrompt = altPrompt.replace(/,\s*,/g, ",").replace(/\s+/g, " ").trim()
        
        altPrompt = altPrompt.trim()
        
        alternatives.push(altPrompt)
      }
      
      // Find the most different one
      trimmedPrompt = await findMostDifferentPrompt(alternatives, recentPrompts)
      console.log("[v0] ✅ Selected most different alternative")
    }

    console.log("[v0] ========================================")
    console.log("[v0] Wan-2.5 optimized motion:", trimmedPrompt)
    console.log("[v0] Word count:", trimmedPrompt.split(" ").length)
    console.log("[v0] Intensity:", recommendedIntensity)
    console.log("[v0] ========================================")

    return NextResponse.json({
      motionPrompt: trimmedPrompt,
      success: true,
    })
  } catch (error) {
    console.error("[v0] Error generating motion prompt:", error)
    return NextResponse.json({ error: "Failed to generate motion prompt" }, { status: 500 })
  }
}
