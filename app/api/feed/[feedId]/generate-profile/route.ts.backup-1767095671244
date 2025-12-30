import type { NextRequest } from "next/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { neon } from "@neondatabase/serverless"
import { getReplicateClient } from "@/lib/replicate-client"
import { MAYA_QUALITY_PRESETS } from "@/lib/maya/quality-settings"
import { generateObject } from "ai"
import { z } from "zod"

export async function POST(req: NextRequest, { params }: { params: { feedId: string } }) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { feedId } = params
    const sql = neon(process.env.DATABASE_URL!)

    const [feedLayout] = await sql`
      SELECT color_palette, brand_vibe, business_type, profile_image_url, profile_image_prompt 
      FROM feed_layouts 
      WHERE id = ${feedId}
    `

    if (!feedLayout) {
      return Response.json({ error: "Feed not found" }, { status: 404 })
    }

    const [model] = await sql`
      SELECT trigger_word, replicate_version_id, lora_scale, lora_weights_url
      FROM user_models
      WHERE user_id = ${user.id}
      AND training_status = 'completed'
      AND (is_test = false OR is_test IS NULL)
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (!model) {
      return Response.json({ error: "No trained model found" }, { status: 400 })
    }

    if (!model.lora_weights_url) {
      return Response.json({ error: "LoRA weights URL not found" }, { status: 400 })
    }

    let basePrompt = feedLayout.profile_image_prompt

    if (!basePrompt) {
      console.log("[v0] No profile image prompt found, using Maya's styling intelligence...")

      const userDataResult = await sql`
        SELECT gender FROM users WHERE id = ${user.id} LIMIT 1
      `

      const userGender = userDataResult[0]?.gender || "person"

      // Maya's AI-powered profile design with her fashion expertise
      const { object: profileDesign } = await generateObject({
        model: "anthropic/claude-sonnet-4",
        schema: z.object({
          styleDirection: z.string().describe("Maya's specific styling direction for this profile image"),
          composition: z.string().describe("Maya's composition and framing expertise"),
          lightingMood: z.string().describe("Maya's lighting style and mood direction"),
          fashionDetails: z.string().describe("Maya's clothing and styling expertise"),
        }),
        prompt: `You are Maya, an expert fashion photographer and Instagram strategist with sophisticated taste.

Create a high-end editorial profile picture concept for a ${feedLayout.business_type || "professional"} with this brand identity:
- Brand Vibe: ${feedLayout.brand_vibe || "professional and approachable"}
- Color Palette: ${feedLayout.color_palette || "neutral tones"}
- Gender: ${userGender}

Channel your expertise in:
1. **Scandinavian Minimalism** - Clean compositions, neutral palettes, natural light, effortless elegance
2. **Dark Moody Aesthetics** - Dramatic lighting, rich colors, cinematic atmosphere, emotional depth
3. **Editorial Fashion Photography** - Sophisticated styling, impeccable tailoring, authentic presence
4. **Personal Brand Storytelling** - Confidence, approachability, genuine professional energy

The profile image should:
- Be a close-up portrait (face focus, circular crop friendly)
- Convey confidence, approachability, and authentic professional presence
- Match the ${feedLayout.brand_vibe || "professional"} aesthetic perfectly
- Use ${feedLayout.color_palette || "neutral tones"} in clothing and background
- Feel like high-end editorial photography, not a generic headshot

Provide your expert direction for:
- **Style Direction**: Hair, makeup/grooming, expression, energy (be specific about the look)
- **Composition**: Framing, angle, focus, depth (your photographer's eye)
- **Lighting Mood**: Natural/dramatic, soft/bold, warm/cool (create atmosphere)
- **Fashion Details**: Clothing style, colors, accessories, fabric quality (your fashion expertise)

Be sophisticated and specific - this should feel like a Vogue editorial, not a LinkedIn headshot.`,
      })

      console.log("[v0] ✓ Maya's profile design created:", profileDesign.styleDirection.substring(0, 100))

      // Maya's gender-aware styling expertise
      const genderStyling =
        userGender === "woman" || userGender === "female"
          ? "elegant flowing hair styled naturally with effortless sophistication, refined makeup with natural glow emphasizing bone structure, feminine grace and quiet confidence, authentic presence that feels both powerful and approachable"
          : userGender === "man" || userGender === "male"
            ? "styled hair with clean lines and natural texture, masculine confidence and strong presence, refined grooming with attention to detail, professional demeanor that conveys both authority and warmth"
            : "styled appearance with confident presence and authentic energy, professional polish with natural authenticity, genuine connection that transcends traditional styling"

      // Maya's complete FLUX prompt with her signature sophistication
      basePrompt = `${model.trigger_word}, confident ${feedLayout.business_type || "professional"} with ${genderStyling}, ${profileDesign.fashionDetails}, ${profileDesign.styleDirection}, close-up portrait with shallow depth, face as the hero, ${profileDesign.lightingMood}, natural skin texture with subtle film grain for authenticity and editorial quality, ${profileDesign.composition}, timeless elegance meets modern sophistication, high-end editorial photography with ${feedLayout.brand_vibe || "professional"} aesthetic, perfect for Instagram profile picture with circular crop in mind, genuine professional presence that feels both aspirational and relatable, cohesive with ${feedLayout.color_palette || "neutral tones"} color palette`

      // Save Maya's prompt for future use
      await sql`
        UPDATE feed_layouts
        SET profile_image_prompt = ${basePrompt}
        WHERE id = ${feedId}
      `

      console.log("[v0] ✓ Maya's sophisticated profile prompt saved")
    }

    const finalPrompt = `${model.trigger_word}, ${basePrompt}`

    const qualitySettings = MAYA_QUALITY_PRESETS.default

    if (model.lora_scale !== null && model.lora_scale !== undefined) {
      qualitySettings.lora_scale = Number(model.lora_scale)
    }

    // CRITICAL FIX: Ensure version is just the hash, not full model path
    let replicateVersionId = model.replicate_version_id
    if (replicateVersionId && replicateVersionId.includes(':')) {
      const parts = replicateVersionId.split(':')
      replicateVersionId = parts[parts.length - 1] // Get last part (the hash)
      console.log("[v0] ⚠️ Version was in full format, extracted hash:", replicateVersionId)
    }

    console.log("[v0] Generating profile image:", {
      feedId,
      prompt: finalPrompt.substring(0, 100) + "...",
      versionHash: replicateVersionId,
    })

    const replicate = getReplicateClient()

    const prediction = await replicate.predictions.create({
      version: replicateVersionId,
      input: {
        prompt: finalPrompt,
        guidance_scale: qualitySettings.guidance_scale,
        num_inference_steps: qualitySettings.num_inference_steps,
        aspect_ratio: qualitySettings.aspect_ratio,
        megapixels: qualitySettings.megapixels,
        output_format: qualitySettings.output_format,
        output_quality: qualitySettings.output_quality,
        lora_scale: Number(qualitySettings.lora_scale),
        hf_lora: model.lora_weights_url, // Use hf_lora instead of lora for consistency
        extra_lora: qualitySettings.extra_lora,
        extra_lora_scale: qualitySettings.extra_lora_scale,
        disable_safety_checker: qualitySettings.disable_safety_checker ?? true,
        go_fast: qualitySettings.go_fast ?? false,
        num_outputs: qualitySettings.num_outputs ?? 1,
        model: qualitySettings.model ?? "dev",
      },
    })

    console.log("[v0] Profile image prediction created:", prediction.id)

    return Response.json({ predictionId: prediction.id })
  } catch (error: any) {
    console.error("[v0] Error generating profile image:", error)
    return Response.json({ error: error.message || "Failed to generate profile image" }, { status: 500 })
  }
}
