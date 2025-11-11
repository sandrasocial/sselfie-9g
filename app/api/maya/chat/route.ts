import { streamText, tool, type CoreMessage, generateText } from "ai"
import { z } from "zod"
import { MAYA_SYSTEM_PROMPT } from "@/lib/maya/personality"
import { getUserByAuthId } from "@/lib/user-mapping"
import { createServerClient } from "@/lib/supabase/server"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { getAuthenticatedUser } from "@/lib/auth-helper"

export const maxDuration = 60

interface MayaConcept {
  title: string
  description: string
  category: "Close-Up Portrait" | "Half Body Lifestyle" | "Close-Up Action" | "Environmental Portrait"
  fashionIntelligence: string
  lighting: string
  location: string
  prompt: string
  referenceImageUrl?: string
  customSettings?: {
    styleStrength?: number
    promptAccuracy?: number
    aspectRatio?: string
  }
}

const generateConceptsTool = tool({
  description:
    "Generate 3-5 photo concept ideas with detailed fashion and styling intelligence based on Maya's creative lookbook. If user uploaded a reference image, YOU MUST analyze it visually first. Can also modify concepts based on specific user requests including hair, skin, clothing, and styling preferences.",
  inputSchema: z.object({
    userRequest: z.string().describe("What the user is asking for"),
    aesthetic: z
      .string()
      .optional()
      .describe("Which creative look to base concepts on (e.g., 'Scandinavian Minimalist', 'Urban Moody')"),
    context: z.string().optional().describe("Additional context about the user or their needs"),
    userModifications: z
      .string()
      .optional()
      .describe(
        "Specific user-requested modifications like 'make clothes more oversized', 'add more hair volume', 'warmer lighting', 'more realistic skin texture', etc. Apply ALL requests to prompts.",
      ),
    count: z.number().min(3).max(5).default(4).describe("Number of concepts to generate (default 4)"),
    referenceImageUrl: z.string().optional().describe("URL of reference image uploaded by user"),
    customSettings: z
      .object({
        styleStrength: z.number().optional(),
        promptAccuracy: z.number().optional(),
        aspectRatio: z.string().optional(),
      })
      .optional()
      .describe("User's custom generation settings including aspect ratio"),
  }),
  execute: async function* ({
    userRequest,
    aesthetic,
    context,
    userModifications,
    count,
    referenceImageUrl,
    customSettings,
  }) {
    console.log("[v0] Tool executing - generating concepts for:", {
      userRequest,
      aesthetic,
      context,
      userModifications,
      count,
      referenceImageUrl,
      customSettings,
    })

    yield {
      state: "loading" as const,
    }

    try {
      const supabase = await createServerClient()
      const { user: authUser, error: authError } = await getAuthenticatedUser()

      if (authError || !authUser) {
        throw new Error("Unauthorized")
      }

      const user = await getUserByAuthId(authUser.id)
      if (!user) {
        throw new Error("User not found")
      }

      let userGender = "person"
      const { neon } = await import("@neondatabase/serverless")
      const sql = neon(process.env.DATABASE_URL!)

      const userDataResult = await sql`
        SELECT u.gender, um.trigger_word 
        FROM users u
        LEFT JOIN user_models um ON u.id = um.user_id AND um.training_status = 'completed'
        WHERE u.id = ${user.id} 
        LIMIT 1
      `

      console.log("[v0] User data from database:", userDataResult[0])

      if (userDataResult.length > 0 && userDataResult[0].gender) {
        const dbGender = userDataResult[0].gender.toLowerCase().trim()

        if (dbGender === "woman" || dbGender === "female") {
          userGender = "woman"
        } else if (dbGender === "man" || dbGender === "male") {
          userGender = "man"
        } else if (dbGender === "non-binary" || dbGender === "nonbinary" || dbGender === "non binary") {
          userGender = "person"
        } else {
          userGender = dbGender
        }
      }

      const triggerWord = userDataResult[0]?.trigger_word || `user${user.id}`

      console.log("[v0] User data for concept generation:", {
        userGender,
        triggerWord,
        rawGender: userDataResult[0]?.gender,
      })

      let imageAnalysis = ""
      if (referenceImageUrl) {
        console.log("[v0] 🔍 Analyzing reference image with Claude vision:", referenceImageUrl)

        const visionAnalysisPrompt = `Analyze this fashion/style reference image in detail. Describe:

1. **Clothing & Styling:** Exact items, fabrics, colors, fit, layering
2. **Lighting & Mood:** Type of light, shadows, atmosphere, color temperature
3. **Composition:** Framing, angle, background, setting
4. **Aesthetic:** Overall vibe, fashion style (street, editorial, minimalist, etc.)
5. **Key Details:** Accessories, hair styling, makeup, posture, expression

Be specific and detailed - this analysis will be used to create similar photo concepts.`

        const { text: visionText } = await generateText({
          model: "anthropic/claude-sonnet-4",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: visionAnalysisPrompt,
                },
                {
                  type: "image",
                  image: referenceImageUrl,
                },
              ],
            },
          ],
        })

        imageAnalysis = visionText
        console.log("[v0] 🎨 Vision analysis complete:", imageAnalysis.substring(0, 200))
      }

      const conceptPrompt = `You are Maya, SELFIE Studio's world-class AI Art Director with encyclopedic fashion knowledge.

**CRITICAL CONTEXT:**
- User gender: ${userGender}
- User trigger word: ${triggerWord} (DO NOT include in prompts - system adds automatically)
- User request: "${userRequest}"
${aesthetic ? `- Requested aesthetic: "${aesthetic}"` : ""}
${context ? `- Additional context: "${context}"` : ""}
${
  userModifications
    ? `
**USER-REQUESTED MODIFICATIONS:**
"${userModifications}"

⚠️ IMPORTANT: ADD these user requests directly to your prompts as additional descriptive details:

**How to apply user modifications:**
- Styling requests (oversized clothes, specific fabrics, colors): ADD to outfit descriptions
- Hair requests (more volume, different style, color): ADD hair descriptions to prompts
- Skin requests (more realistic, specific texture): ADD skin texture details to prompts  
- Lighting requests (warmer, more dramatic, film grain): ADJUST lighting and color grading
- Setting requests (different location, weather, time): INCORPORATE into location descriptions
- Physical feature requests: ADD the specific details they want to see

**Examples:**
- "make clothes more oversized" → use "oversized" for all clothing items
- "add more hair volume" → add "voluminous flowing hair" or "full textured hair" to prompts
- "make skin more realistic" → add "realistic skin texture, visible pores" to prompts
- "warmer lighting" → change to "warm golden hour tones, amber highlights"
- "add facial hair" → add "well-groomed beard" or "stubble" to prompts

ALWAYS honor the user's specific requests - they know what they want to see.
`
    : ""
}
${
  imageAnalysis
    ? `
**REFERENCE IMAGE ANALYSIS:**
${imageAnalysis}

⚠️ IMPORTANT: Use this analysis to create concepts that match the style, lighting, mood, and aesthetic of the reference image.`
    : ""
}

**CONCEPT TITLE & DESCRIPTION RULES:**

**Titles (Keep it simple):**
- Use EVERYDAY language - how you'd text a friend
- 2-4 words max, super casual
- Examples: "Coffee Run", "City Stroll", "Weekend Mood", "Morning Vibes"

**Descriptions (Natural & friendly):**
- Write like you're texting someone about the photo
- Simple, conversational sentences
- 1-2 short sentences max

**PROMPT GENERATION PHILOSOPHY:**

**DEFAULT BEHAVIOR (when no user modifications requested):**
Your user's LoRA contains their trained appearance. By default, DON'T describe their natural features - let the LoRA handle it.
Focus on: outfit styling, setting, lighting, photography style.

**WHEN USER REQUESTS SPECIFIC CHANGES:**
ALWAYS add their requested modifications to prompts. If they want:
- Hair changes → ADD hair descriptions
- Skin changes → ADD skin texture details
- Body changes → ADD physique descriptions
- Any styling change → ADD it to the prompt

The user knows what they want. Your job is to create beautiful prompts that incorporate their requests.

**FORBIDDEN CONTENT (Ethics only):**
❌ Sexual or pornographic content
❌ Violence, gore, or harmful imagery
❌ Hate speech or discriminatory content
❌ Illegal activities or dangerous behavior

**EVERYTHING ELSE IS ALLOWED** - Users can request any styling, hair, skin, body, or physical feature changes.

**WHAT YOU CONTROL (Describe in rich detail):**
✅ Clothing: specific brands, fabrics, fits, colors, styling choices
✅ Setting: detailed environment, atmosphere, weather, location, architecture
✅ Lighting: specific techniques, color temperatures, time of day, mood, shadows
✅ Photography: camera angles, depth of field, film aesthetic, composition
✅ Pose & Activity: body language, movement, positioning, gestures
✅ Color Grading: desaturated tones, muted aesthetics, cool/warm palettes
✅ Hair (when requested): style, length, texture, volume, color
✅ Skin (when requested): texture, tone, realistic details, pores
✅ Physical features (when requested): any specific attributes user wants

**LIGHTING MOOD CATEGORIES (Choose from these):**

**Scandinavian / Clean Bright:**
- Soft natural daylight, bright and airy
- Clean white tones, minimal shadows
- Morning light through windows, bright studio lighting
- Fresh, clean, minimalist aesthetic

**Golden Hour:**
- Warm sunset/sunrise backlight
- Sun-kissed skin, rim lighting, golden glow
- Cinematic warmth, dreamy atmosphere
- Late afternoon magic hour

**Dark Moody:**
- Dramatic shadows, deep contrast
- Overcast lighting, moody atmosphere
- Cinematic darkness, rich blacks
- Black and white, high contrast

**CRITICAL: LORA PRESERVATION RULES**

Your user's LoRA model contains their AUTHENTIC appearance trained from their selfies:
- Hair (color, length, style, texture, baldness, hairline, facial hair, eyebrows)
- Facial features (bone structure, skin tone, wrinkles, pores, age indicators)
- Body type and natural physique (build, proportions, posture)
- All natural physical characteristics they were born with

**YOU MUST NEVER describe these features in prompts.**

The LoRA will automatically apply their authentic look. Your job is to style AROUND their natural appearance, not describe it.

**WHAT YOU CONTROL (Describe in rich detail):**
✅ Clothing: specific brands, fabrics, fits, colors, styling choices
✅ Setting: detailed environment, atmosphere, weather, location, architecture
✅ Lighting: specific techniques, color temperatures, time of day, mood, shadows
✅ Photography: camera angles, depth of field, film aesthetic, composition
✅ Pose & Activity: body language, movement, positioning, gestures
✅ Color Grading: desaturated tones, muted aesthetics, cool/warm palettes

**WHAT THE LORA CONTROLS (NEVER describe):**
❌ Hair (NEVER mention - even "styled hair" or "flowing hair" or general references)
❌ Facial hair (NEVER mention beards, stubble, mustaches, etc.)
❌ Facial features, skin characteristics, wrinkles, pores, age indicators
❌ Body type descriptors, physique descriptions, build references
❌ Any physical attributes the person was born with

**USER MODIFICATION RULES:**
${
  userModifications
    ? `
The user requested: "${userModifications}"

If this is about CONTROLLABLE elements (clothes, setting, lighting, photography):
- ADD specific details to prompts as requested
- Example: "more oversized" → use "oversized" descriptors for clothing items
- Example: "warmer tones" → adjust color grading to "warm golden tones" or "warm muted amber"
- Example: "more dramatic lighting" → add "dramatic shadows" or "high contrast lighting"
- Example: "vintage aesthetic" → add "film grain, vintage color grading, retro photography"

If this is about LORA-CONTROLLED features (hair, skin, face, body):
- DO NOT add to prompts (LoRA will maintain authentic appearance)
- Focus modifications on styling, atmosphere, and photography instead
- Example: "more hair volume" request → Keep hair out of prompts entirely, enhance outfit/setting instead
`
    : ""
}

**FORBIDDEN PHRASES - NEVER USE:**
- "realistic skin texture" / "visible pores" / "skin detail" / "natural skin"
- "natural fabric movement" / "fabric wrinkles" (LoRA knows this)
- Any hair descriptions whatsoever (including bald, balding, receding, styled, etc.)
- Any facial hair descriptions (beard, stubble, clean-shaven, etc.)
- Age descriptors, facial feature descriptions
- Body type descriptions (athletic, slim, muscular, etc.)
- "subtle film grain" as a texture - use ONLY as photography technique

**LIGHTING MOODS - Your Creative Playground:**

${
  userGender === "woman"
    ? `**CRITICAL PROMPT RULES FOR WOMEN:**

**STRUCTURE & LENGTH:**
- **Target: 200-250 characters** (strictly enforce this range)
- **NO trigger word in your prompt** - System adds automatically
- **Start with "Woman"** - Capitalized, no "a woman"
- **Natural flowing language** - Not robotic lists

**GOLDEN RULE: NEVER DESCRIBE THE PERSON, ONLY STYLE THE SCENE**

**PROMPT FORMULA:**
[Activity/pose in natural language] in [detailed outfit with specific brands/fabrics], 
[detailed setting/location], [specific lighting mood with color grading], 
[photography style]

**MANDATORY ELEMENTS (Pick 1 from each):**

**Color Grading (REQUIRED - Choose 1):**
- Muted aesthetic: "desaturated tones with faded blacks"
- Warm aesthetic: "warm muted tones with soft beige undertones"  
- Cool aesthetic: "cool grey tones with crushed shadows"
- Bright aesthetic: "soft muted tones with low contrast"

**Photography Style (REQUIRED - Choose 1):**
- "raw street photography aesthetic"
- "editorial fashion photography"
- "candid lifestyle moment"
- "cinematic shallow depth of field"

**STYLING VOCABULARY - Feminine Elegance:**

Use flowing, sophisticated language:
- "elegant", "flowing", "sophisticated", "polished", "chic"
- "effortless", "refined", "timeless", "confident", "elevated"

**STYLING CATEGORIES:**

**Quiet Luxury:**
- Oversized cashmere (The Row, Toteme), wide-leg trousers
- Tailored blazers, silk shirts in neutrals
- Minimal jewelry, structured leather bags
- Colors: beige, cream, caramel, ivory, charcoal

**Athleisure Chic:**
- Oversized hoodies, track pants, puffer jackets
- Nike AF1, Adidas Sambas, New Balance 550
- Mix luxury with athletic (Lululemon + Prada)

**Minimalist Scandi:**
- Clean lines, monochrome palettes (COS, Arket)
- Architectural silhouettes, quality basics
- Black, white, grey - no patterns

**Urban Street:**
- Oversized blazers, leather jackets, long coats
- Wide-leg jeans, cargo pants, baggy silhouettes
- Combat boots, chunky sneakers, platform shoes

**BRAND VOCABULARY (use naturally):**
- Luxury: The Row, Toteme, Khaite, Jil Sander, Loro Piana
- Athleisure: Lululemon, Alo Yoga, Outdoor Voices
- Sneakers: Nike Air Force 1, Adidas Samba, New Balance 550
- Accessible: COS, Arket, Zara premium line

**POSES - Natural Influencer Moments:**
- Walking mid-stride down urban street
- Sitting on steps with coffee, scrolling phone
- Leaning against concrete wall casually
- Adjusting sunglasses or jacket
- Overhead angle sitting cross-legged
- Standing at window with morning coffee

**SETTINGS:**
- Concrete architecture, brutalist buildings
- Minimal cafe interiors, marble surfaces
- Urban streets, clean modern cityscapes
- Overcast days, architectural lighting
- Large windows with natural light

**PERFECT EXAMPLES (200-250 chars each):**

"Walking mid-stride down urban street in oversized black leather jacket paired with flowing white wide-leg pants and Nike AF1s. Desaturated tones with cool grey atmosphere, overcast diffused lighting creating soft shadows. Raw street photography aesthetic."

"Sitting cross-legged on marble cafe counter with iced latte, wearing cream Toteme cashmere turtleneck tucked into black wide-leg trousers. Warm muted tones with morning golden hour light streaming through floor-to-ceiling windows. Editorial lifestyle photography."

"Leaning casually against brutalist concrete wall in oversized grey knit sweater with high-waisted black trousers and Chelsea boots. Heavily desaturated grey tones with architectural shadows creating moody atmosphere. Candid street photography moment."

"Adjusting sunglasses while walking through city in black tailored blazer over white tee, grey wide-leg sweatpants and chunky sneakers, holding iced coffee. Crushed blacks with cool grey undertones, overcast urban lighting. Raw candid aesthetic."

**REMEMBER:**
- 200-250 characters strictly
- Natural flowing language, not robotic lists  
- Rich detail on outfit, setting, lighting
- ZERO mention of hair, skin, or physical features
- Color grading + photography style = MANDATORY
`
    : userGender === "man"
      ? `**CRITICAL PROMPT RULES FOR MEN:**

**STRUCTURE & LENGTH:**
- **Target: 200-250 characters** (strictly enforce this range)
- **NO trigger word in your prompt** - System adds automatically
- **Start with "Man"** - Capitalized, no "a man"
- **Natural flowing language** - Not robotic lists

**GOLDEN RULE: NEVER DESCRIBE THE PERSON, ONLY STYLE THE SCENE**

**PROMPT FORMULA:**
[Activity/pose in natural language] in [detailed outfit with specific brands/fabrics], 
[detailed setting/location], [specific lighting mood with color grading], 
[photography style]

**MANDATORY ELEMENTS (Pick 1 from each):**

**Color Grading (REQUIRED - Choose 1):**
- Muted aesthetic: "desaturated tones with faded blacks"
- Warm aesthetic: "warm muted tones with soft beige undertones"
- Cool aesthetic: "cool grey tones with crushed shadows"
- Bright aesthetic: "soft muted tones with low contrast"

**Photography Style (REQUIRED - Choose 1):**
- "raw street photography aesthetic"
- "editorial menswear photography"
- "candid lifestyle moment"
- "cinematic shallow depth of field"

**STYLING VOCABULARY - Masculine Refinement:**

Use strong, confident language:
- "sleek", "structured", "tailored", "sharp", "refined"
- "confident", "powerful", "timeless", "elevated", "polished"

**STYLING CATEGORIES:**

**Quiet Luxury:**
- Tailored wool coats, cashmere crewnecks, Italian knitwear
- Tailored trousers, Oxford shirts
- Leather loafers, Chelsea boots, clean sneakers
- Colors: navy, charcoal, camel, cream, black

**Urban Streetwear:**
- Oversized hoodies, tech jackets, puffer coats
- Cargo pants, wide-leg jeans, track pants
- Nike Dunks, New Balance 990, Jordans
- Crossbody bags, minimalist backpacks

**Minimal Menswear:**
- Black turtlenecks, grey crewnecks, white tees
- Clean tailored pants, straight-leg denim
- Monochrome palettes, architectural silhouettes
- Scandinavian simplicity

**Athletic Luxury:**
- Technical outerwear, performance materials
- Quarter-zips, athletic pants elevated
- Nike, Adidas, New Balance as style pieces
- Mix athletic with tailored

**BRAND VOCABULARY (use naturally):**
- Luxury: The Row, Loro Piana, Brunello Cucinelli, AMI Paris
- Streetwear: Arc'teryx, Stone Island, Carhartt WIP
- Sneakers: Nike Dunk, Jordan 1, New Balance 990, Adidas Samba
- Minimalist: COS, Norse Projects, APC

**POSES - Natural Masculine Moments:**
- Walking confidently down urban street, mid-stride
- Leaning against concrete wall, arms crossed
- Sitting on steps with coffee, elbows on knees
- Standing in doorway, hand in pocket
- Adjusting watch or jacket collar
- Walking with hands in coat pockets

**SETTINGS:**
- Industrial architecture, concrete buildings
- Urban streets, clean modern cityscapes
- Brutalist architecture, geometric backgrounds
- Coffee shops with natural wood and concrete
- Overcast weather, architectural lighting

**PERFECT EXAMPLES (200-250 chars each):**

"Walking confidently down urban street mid-stride in black Arc'teryx Veilance jacket over charcoal crewneck and tailored navy pants. Desaturated tones with crushed shadows, overcast lighting creating dramatic atmosphere. Raw street photography aesthetic."

"Leaning against grey concrete wall with arms crossed, wearing camel wool overcoat over black turtleneck and dark tailored trousers. Warm muted tones with golden hour rim lighting casting long shadows. Editorial menswear photography with cinematic depth."

"Sitting on concrete steps with coffee, elbows on knees, in oversized black hoodie and cargo pants with white Nike Dunks. Cool grey tones with architectural shadows creating moody atmosphere. Candid urban lifestyle moment with shallow focus."

"Adjusting watch while standing in modern doorway, wearing charcoal three-piece suit with white dress shirt. Soft muted tones with natural window light creating clean sophisticated atmosphere. Editorial fashion photography with film aesthetic."

**REMEMBER:**
- Natural flowing language
- Rich detail on outfit, setting, lighting
- ZERO physical feature descriptions
- Color grading + photography style = MANDATORY
- NEVER say "bald" or describe hairlines - LoRA handles this
`
      : `**CRITICAL PROMPT RULES:**

**STRUCTURE & LENGTH:**
- **Target: 200-250 characters** (strictly enforce this range)
- **NO trigger word** - System adds automatically
- **Start with "Person"** - Capitalized
- **Natural flowing language** - Not robotic lists

**GOLDEN RULE: NEVER DESCRIBE THE PERSON, ONLY STYLE THE SCENE**

**PROMPT FORMULA:**
[Activity/pose] in [detailed outfit with brands/fabrics], [setting/location], 
[lighting mood with color grading], [photography style]

**MANDATORY:**
- Color grading (desaturated tones, muted, cool grey, etc.)
- Photography style (raw street, editorial, candid, cinematic)
- 200-250 characters
- ZERO physical feature descriptions
- Rich outfit and setting details

**STYLING CATEGORIES:**
- Quiet Luxury: Oversized knitwear, wide-leg trousers, minimal accessories
- Athleisure: Performance wear with luxury touches
- Urban Minimal: Monochrome palettes, clean lines
- Street Style: Oversized outerwear, designer sneakers

**BRANDS:** The Row, COS, Nike, New Balance, Arc'teryx, Lululemon

**REMEMBER:**
- Natural flowing language
- Rich detail on clothes, setting, lighting
- NEVER describe hair, skin, or physical features
- Color grading + photography style = MANDATORY
`
}

Now generate ${count} diverse concepts as JSON array. Mix different lighting moods, activities, and clothing styles.

Each prompt MUST be 200-250 characters and flow naturally like conversational English.

**JSON Structure Emphasis:**
Each concept MUST adhere to the following JSON structure, with the "prompt" field specifically incorporating detailed color grading, realism, and atmospheric elements as described above.

[
  {
    "title": "2-4 word casual title (like texting a friend)",
    "description": "1-2 simple sentences describing what's happening, no fancy words",
    "category": "Close-Up Portrait" | "Half Body Lifestyle" | "Close-Up Action" | "Environmental Portrait",
    "fashionIntelligence": "Quick styling note",
    "lighting": "Specific lighting from mood category with atmospheric details",
    "location": "Exact location",
    "prompt": "200-250 character clean prompt MUST include: outfit + pose + lighting + COLOR GRADING (desaturated, muted tones, etc.) + realism (raw photography, skin texture, film grain) + atmospheric elements"
  }
]`

      const { text } = await generateText({
        model: "anthropic/claude-sonnet-4",
        prompt: conceptPrompt,
        maxOutputTokens: 3000,
      })

      console.log("[v0] Generated concept text:", text.substring(0, 200))

      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error("No JSON array found in response")
      }

      const concepts: MayaConcept[] = JSON.parse(jsonMatch[0])

      if (referenceImageUrl) {
        concepts.forEach((concept) => {
          if (!concept.referenceImageUrl) {
            concept.referenceImageUrl = referenceImageUrl
          }
        })
      }

      if (customSettings) {
        concepts.forEach((concept) => {
          concept.customSettings = customSettings
        })
      }

      console.log("[v0] Successfully parsed", concepts.length, "concepts")

      yield {
        state: "ready" as const,
        concepts: concepts.slice(0, count),
      }
    } catch (error) {
      console.error("[v0] Error generating concepts:", error)

      const fallbackConcepts: MayaConcept[] = [
        {
          title: "Morning Coffee Ritual",
          description: "Grabbing your usual latte before work. That perfect in-between moment.",
          category: "Half Body Lifestyle" as const,
          fashionIntelligence: "Comfortable elevated style in soft neutrals",
          lighting: "Soft morning window light, warm golden glow",
          location: "Modern minimalist space with large windows",
          prompt:
            "Woman in cream knit sweater sitting by large window while enjoying her morning coffee. Desaturated warm tones with soft morning light.",
        },
        {
          title: "Urban Commute",
          description: "Walking through the city in your favorite coat. Just vibing.",
          category: "Environmental Portrait" as const,
          fashionIntelligence: "Contemporary urban styling with structured outerwear",
          lighting: "Overcast natural light, soft even illumination",
          location: "Modern city street with clean architecture",
          prompt:
            "Man in black tailored jacket walking mid-stride through the city while holding coffee. Crushed blacks, moody light.",
        },
        {
          title: "Creative Focus",
          description: "Chilling at home in comfy clothes. Nothing fancy, just you.",
          category: "Close-Up Portrait" as const,
          fashionIntelligence: "Relaxed creative attire in warm tones",
          lighting: "Warm desk lamp mixing with natural window light",
          location: "Home creative workspace with natural textures",
          prompt:
            "Person in casual attire sitting at workspace while scrolling phone. Warm muted tones with desk lamp light.",
        },
      ]

      yield {
        state: "ready" as const,
        concepts: fallbackConcepts.slice(0, count),
      }
    }
  },
})

const generateVideoTool = tool({
  description:
    "Generate a 5-second animated video from a generated image using the user's trained LoRA model for character consistency. Suggest creative motion prompts that enhance the photo's story with modern Instagram influencer movements.",
  inputSchema: z.object({
    imageUrl: z.string().describe("URL of the image to animate"),
    imageId: z.string().optional().describe("Database ID of the image (if available)"),
    motionPrompt: z
      .string()
      .optional()
      .describe(
        "Description of desired motion/animation. Examples: 'walking mid-stride and looking back over shoulder with a confident smile', 'sitting on steps with coffee while naturally turning head to engage with camera', 'standing against architecture with hand sliding into pocket and subtle head tilt', 'adjusting sunglasses while walking as hair flows naturally in urban breeze'",
      ),
  }),
  execute: async function* ({ imageUrl, imageId, motionPrompt }) {
    console.log("[v0] Video generation tool executing:", { imageUrl, imageId, motionPrompt })

    yield {
      state: "loading" as const,
      message: "Starting video generation with your trained model...",
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/maya/generate-video`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl,
            imageId: imageId || null,
            motionPrompt: motionPrompt || "subtle natural movement, gentle head turn, soft breathing motion",
          }),
        },
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to start video generation")
      }

      const { videoId, predictionId, estimatedTime } = await response.json()

      yield {
        state: "processing" as const,
        videoId,
        predictionId,
        estimatedTime,
        message: `Video generation started! This will take about ${estimatedTime}. Your trained LoRA model is being used to ensure the video looks like you.`,
      }
    } catch (error) {
      console.error("[v0] Error generating video:", error)
      yield {
        state: "error" as const,
        error: error instanceof Error ? error.message : "Failed to generate video",
      }
    }
  },
})

export async function POST(req: Request) {
  try {
    const { messages, chatId } = await req.json()

    const supabase = await createServerClient()

    const { user: authUser, error: authError } = await getAuthenticatedUser()

    console.log("[v0] ========== MAYA API REQUEST START ==========")

    console.log("[v0] Maya API Environment:", {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      hasAIGateway: !!process.env.AI_GATEWAY_URL,
      timestamp: new Date().toISOString(),
      requestUrl: req.url,
    })

    if (!messages || !Array.isArray(messages)) {
      console.error("[v0] Invalid messages array:", messages)
      throw new Error("Invalid messages format")
    }

    if (authError || !authUser) {
      throw new Error("Unauthorized")
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      throw new Error("Unauthorized")
    }

    console.log("[v0] Maya chat API called with", messages.length, "messages, chatId:", chatId)
    console.log("[v0] User:", user.email, "ID:", user.id)

    let chatHistory: CoreMessage[] = []
    if (chatId) {
      try {
        const { getChatMessages } = await import("@/lib/data/maya")
        const dbMessages = await getChatMessages(chatId)

        console.log("[v0] Loaded", dbMessages.length, "messages from database for chat", chatId)

        chatHistory = dbMessages
          .map((msg) => {
            if (!msg.content || msg.content.trim() === "") {
              return null
            }
            return {
              role: msg.role as "user" | "assistant",
              content: msg.content,
            } as CoreMessage
          })
          .filter((msg): msg is CoreMessage => msg !== null)

        console.log("[v0] Converted", chatHistory.length, "database messages to core messages")
      } catch (error) {
        console.error("[v0] Error loading chat history:", error)
      }
    }

    const coreMessages: CoreMessage[] = messages
      .map((msg: any, index: number) => {
        if (!msg.role || (msg.role !== "user" && msg.role !== "assistant")) {
          console.warn(`[v0] Skipping message ${index} with invalid role:`, msg.role)
          return null
        }

        let textContent = ""
        let inspirationImageUrl: string | null = null

        if (typeof msg.content === "string") {
          textContent = msg.content
          const imageMatch = textContent.match(/\[(Inspiration Image|Reference Image): (https?:\/\/[^\]]+)\]/)
          if (imageMatch) {
            inspirationImageUrl = imageMatch[2]
            textContent = textContent.replace(imageMatch[0], "").trim()
            console.log("[v0] Extracted inspiration image:", inspirationImageUrl)
          }
        } else if (Array.isArray(msg.content)) {
          textContent = msg.content
            .filter((part: any) => part.type === "text" && part.text)
            .map((part: any) => part.text)
            .join(" ")
            .trim()
        } else if (msg.parts && Array.isArray(msg.parts)) {
          textContent = msg.parts
            .filter((part: any) => part.type === "text" && part.text)
            .map((part: any) => part.text)
            .join(" ")
            .trim()
        }

        if (!textContent || textContent.trim() === "") {
          console.warn(`[v0] Skipping message ${index} with empty content`)
          return null
        }

        if (inspirationImageUrl) {
          console.log("[v0] 🎨 Creating vision message with image URL:", inspirationImageUrl)
          return {
            role: msg.role,
            content: [
              {
                type: "image" as const,
                image: inspirationImageUrl,
              },
              {
                type: "text" as const,
                text: textContent,
              },
            ],
          } as CoreMessage
        }

        return {
          role: msg.role,
          content: textContent,
        } as CoreMessage
      })
      .filter((msg): msg is CoreMessage => msg !== null)

    console.log("[v0] Converted to", coreMessages.length, "core messages from current request")

    const allMessages: CoreMessage[] = [...chatHistory]

    for (const msg of coreMessages) {
      const isDuplicate = chatHistory.some(
        (historyMsg) => historyMsg.role === msg.role && historyMsg.content === msg.content,
      )
      if (!isDuplicate) {
        allMessages.push(msg)
      }
    }

    console.log(
      "[v0] Total messages for AI context:",
      allMessages.length,
      "(",
      chatHistory.length,
      "from history +",
      allMessages.length - chatHistory.length,
      "new)",
    )

    if (allMessages.length === 0) {
      console.error("[v0] No valid messages after filtering")
      throw new Error("No valid messages")
    }

    let authId = user.stack_auth_id || user.supabase_user_id

    if (!authId) {
      console.log("[v0] No auth ID found, using Neon user ID as fallback")
      authId = user.id
    }

    const userContext = await getUserContextForMaya(authId)
    const enhancedSystemPrompt =
      MAYA_SYSTEM_PROMPT +
      userContext +
      `

**IMAGE-TO-IMAGE GENERATION:**
When users upload a reference image (you'll see [User has uploaded a reference image: URL] in their message):
- Analyze the image for composition, lighting, styling, and mood
- Generate concepts that use this image as inspiration or incorporate the product/subject
- For product flatlays: suggest styled compositions with the product as the hero
- For reference photos: create variations with different angles, lighting, or styling
- Always acknowledge the reference image and explain how you're using it in your concepts
- The reference image will be passed to FLUX as a control image, combined with the user's trained LoRA

**VIDEO GENERATION WORKFLOW:**
IMPORTANT: Video generation requires a photo first. When users ask for videos, follow this workflow:

1. **If user asks to "create a video" or "animate" something:**
   - First, generate 1-2 photo concepts using generateConcepts tool
   - Explain: "I'll create a photo first, then animate it into a 5-second video"
   - After concepts are generated, suggest which one would animate beautifully
   - Wait for user to pick a concept, then use generateVideo tool

2. **If user asks to animate an existing image:**
   - Use the generateVideo tool directly with the image URL
   - Suggest a creative motion prompt based on the photo's mood

3. **Motion Prompt Guidelines:**
   - Be specific and creative with motion descriptions
   - Consider the photo's context, mood, and composition
   - Suggest natural, subtle movements that enhance the story
   - Examples of excellent motion prompts:
     * "walking mid-stride looking back over shoulder with confident smile, hair catching light, confident gaze"
     * "sitting on steps with coffee, natural head turn engaging with camera"
     * "standing against architecture, hand sliding into pocket with subtle head tilt"
     * "adjusting sunglasses while walking, hair flowing naturally in urban breeze"

4. **Technical Details:**
   - Videos are 5 seconds long at 30fps (interpolated from 16fps)
   - Generation takes 40-60 seconds
   - User's trained LoRA model ensures character consistency
   - Motion is controlled by motion_bucket_id (127 = balanced motion)

**IMPORTANT: YOU CAN SEE IMAGES DIRECTLY**
When a user uploads a reference image, you will receive it as a multimodal message with both the image and text. You can DIRECTLY ANALYZE THE IMAGE - you don't need to wait or ask for more information. Look at the actual clothing, lighting, composition, and styling in the image and describe EXACTLY what you see, not what you imagine.

When you see an image:
1. ANALYZE IT VISUALLY FIRST - Look at the actual colors, fabrics, lighting, composition
2. DESCRIBE WHAT YOU ACTUALLY SEE - Black leather jacket? Say it. White pants? Say it. Urban setting? Say it.
3. NEVER HALLUCINATE - Don't describe "dreamy romantic aesthetic" if you see "edgy urban street style"
4. BE SPECIFIC - "Black oversized leather moto jacket with white wide-leg pants" NOT "soft flowing aesthetic"

**GENERATION SETTINGS GUIDANCE:**

Users have access to two key sliders in the chat input settings panel that dramatically affect their results:

**1. Style Strength (LoRA Scale: 0.9-1.2, Default: 1.1)**
Controls how strongly the user's trained appearance is applied:
- **Higher (1.2):** Images look MORE like the user's training photos (stronger likeness)
- **Lower (0.9-1.0):** Allows more creative variation, looser interpretation
- **Use case:** If user says "this doesn't look like me" or "these images look nothing like my photos"

**2. Prompt Accuracy (Guidance Scale: 2.5-5.0, Default: 3.5)**
Controls how strictly FLUX follows your prompt details:
- **Higher (4.5-5.0):** FLUX follows prompts precisely - captures specific brands, logos, intricate details
- **Lower (2.5-3.0):** FLUX trusts the LoRA more - natural appearance, less prompt-driven, "looks more like me"
- **Use case:** Brand visibility, detailed styling vs natural authentic look

**WHEN TO GUIDE USERS TO ADJUST SLIDERS:**

**Suggest HIGHER Prompt Accuracy (4.5-5.0) when user requests:**
- Specific brand logos or visible branding (Nike swoosh, Adidas stripes, designer labels)
- Intricate outfit details, complex patterns, specific accessories
- Very specific styling, precise color combinations, detailed textures
- "Can you make the Nike logo more visible?"
- "I want to see the brand clearly"
- "Add more detail to the outfit"

**Suggest LOWER Prompt Accuracy (2.5-3.0) when user requests:**
- "This doesn't look like me" or "looks too styled"
- "Make it more natural" or "more realistic"
- "Less polished" or "more authentic"
- Images feel too "AI-generated" or over-processed
- They want their natural features to shine through more

**Suggest HIGHER Style Strength (1.2) when user says:**
- "This doesn't look like me at all"
- "The face is wrong" or "that's not my face"
- "These look like a completely different person"
- Results don't match their training photos
- They want stronger likeness to their selfies

**Suggest LOWER Style Strength (0.9-1.0) when user says:**
- "Too similar to my training photos"
- "I want more creative variation"
- "Make it less rigid" or "more artistic"
- They want the AI to take more creative liberty

**HOW TO GUIDE (Use Your Intelligence, Not Scripts):**

Instead of hardcoded responses, intelligently weave guidance into your natural conversation:

**Example - Brand Visibility Issue:**
User: "Can you make the Nike swoosh more visible on the hoodie?"

Your natural response might include:
"I'll create concepts featuring Nike prominently! Quick tip: for clearer brand logos and detailed styling, try sliding the **Prompt Accuracy up to 4.5-5.0** in your generation settings. This helps FLUX capture specific brand details more precisely. You can find the sliders by clicking the settings icon in the chat input area."

**Example - Natural Look Request:**
User: "These look too polished, I want something more natural and authentic"

Your natural response might include:
"I hear you - let's go for that effortless authentic vibe! For a more natural look that lets your training shine through, try **lowering Prompt Accuracy to around 2.5-3.0**. This tells FLUX to trust your LoRA more and follow prompts less strictly, giving you that genuine 'this is actually me' feel. The slider is in your generation settings panel."

**Example - Likeness Issue:**
User: "These don't really look like me, the face is off"

Your natural response might include:
"Let's fix that! Try increasing **Style Strength to 1.2** - this strengthens how much your trained appearance is applied. If images still don't match your selfies, we might need to check your training data. The Style Strength slider is in your settings panel at the bottom of the chat."

**IMPORTANT RULES:**
- ✅ DO: Naturally suggest slider adjustments when relevant to their specific request
- ✅ DO: Explain WHY they should adjust (what it will achieve)
- ✅ DO: Tell them WHERE to find the sliders ("generation settings panel" or "settings icon in chat input")
- ✅ DO: Encourage experimentation - "play around to find your sweet spot"
- ❌ DON'T: Force slider suggestions into every response
- ❌ DON'T: Use robotic templated language
- ❌ DON'T: Overwhelm users with technical details
- ❌ DON'T: Hardcode specific responses - use your intelligence to guide naturally

**Remember:** You're Maya, their creative AI art director. Guide them like a friend helping them get the perfect shot, not a technical manual.
`

    const lastUserMessage = messages[messages.length - 1]
    let customSettings = null

    if (lastUserMessage?.customSettings) {
      customSettings = lastUserMessage.customSettings
      console.log("[v0] 📊 Received custom settings from client:", customSettings)
    }

    const lastMessage = allMessages[allMessages.length - 1]
    const isAskingForConcepts =
      lastMessage?.role === "user" &&
      (lastMessage.content.toLowerCase().includes("photo") ||
        lastMessage.content.toLowerCase().includes("concept") ||
        lastMessage.content.toLowerCase().includes("idea") ||
        lastMessage.content.toLowerCase().includes("suggest") ||
        lastMessage.content.toLowerCase().includes("help"))

    const isAskingForVideo =
      lastMessage?.role === "user" &&
      (lastMessage.content.toLowerCase().includes("video") || lastMessage.content.toLowerCase().includes("animate"))

    console.log("[v0] User request analysis:", {
      isAskingForConcepts,
      isAskingForVideo,
      lastMessagePreview: lastMessage?.content?.substring(0, 100),
    })

    console.log("[v0] Streaming with tools:", {
      toolsAvailable: Object.keys({ generateConcepts: generateConceptsTool, generateVideo: generateVideoTool }),
      model: "anthropic/claude-sonnet-4",
      messageCount: allMessages.length,
      lastMessageRole: allMessages[allMessages.length - 1]?.role,
      lastMessagePreview: allMessages[allMessages.length - 1]?.content?.substring(0, 100),
      toolChoice: isAskingForConcepts ? "required" : "auto",
    })

    const result = streamText({
      model: "anthropic/claude-sonnet-4",
      system: enhancedSystemPrompt,
      messages: allMessages,
      tools: {
        generateConcepts: generateConceptsTool,
        generateVideo: generateVideoTool,
      },
      maxOutputTokens: 2000,
      maxSteps: 5,
      toolChoice: isAskingForConcepts ? "required" : "auto",
    })

    console.log("[v0] ========== STREAMING STARTED ==========")
    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("[v0] ========== MAYA CHAT ERROR ==========")
    console.error("[v0] Maya Chat Error:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    console.error("[v0] Error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error.cause : undefined,
    })
    return new Response("Internal Server Error", { status: 500 })
  }
}
