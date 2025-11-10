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
    "Generate 3-5 photo concept ideas with detailed fashion and styling intelligence based on Maya's creative lookbook. If user uploaded a reference image, YOU MUST analyze it visually first.",
  inputSchema: z.object({
    userRequest: z.string().describe("What the user is asking for"),
    aesthetic: z
      .string()
      .optional()
      .describe("Which creative look to base concepts on (e.g., 'Scandinavian Minimalist', 'Urban Moody')"),
    context: z.string().optional().describe("Additional context about the user or their needs"),
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
  execute: async function* ({ userRequest, aesthetic, context, count, referenceImageUrl, customSettings }) {
    console.log("[v0] Tool executing - generating concepts for:", {
      userRequest,
      aesthetic,
      context,
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
${imageAnalysis ? `\n**REFERENCE IMAGE ANALYSIS:**\n${imageAnalysis}\n\n⚠️ IMPORTANT: Use this analysis to create concepts that match the style, lighting, mood, and aesthetic of the reference image.` : ""}

**CONCEPT TITLE & DESCRIPTION RULES:**

**Titles (Keep it simple):**
- Use EVERYDAY language - how you'd text a friend
- 2-4 words max, super casual
- Examples: "Coffee Run", "City Stroll", "Weekend Mood", "Morning Vibes", "Street Style", "Casual Friday"
- NOT: "Urban Sophistication Portrait" or "Elevated Minimalist Aesthetic"
- Think Instagram caption energy, not art gallery labels

**Descriptions (Natural & friendly):**
- Write like you're texting someone about the photo
- Simple, conversational sentences
- NO fancy words or formal language
- NO phrases like "captured moment" or "showcasing" or "exudes"
- Just describe what's happening naturally
- Keep it 1-2 short sentences max

**Good Examples:**
- Title: "Coffee Run" / Description: "Grabbing your usual latte before work. That perfect in-between moment."
- Title: "Street Style" / Description: "Walking through the city in your favorite coat. Just vibing."
- Title: "Weekend Mood" / Description: "Chilling at home in comfy clothes. Nothing fancy, just you."
- Title: "Morning Light" / Description: "Sitting by the window with coffee. Natural morning energy."

**Bad Examples (TOO FORMAL):**
- ❌ Title: "Architectural Portrait Session" / Description: "A sophisticated capture showcasing elevated minimalism against urban architecture"
- ❌ Title: "Golden Hour Editorial" / Description: "Exuding confidence in this carefully curated moment of authentic expression"
- ❌ Title: "Minimalist Aesthetic Portrait" / Description: "Captured in soft natural light, this image embodies quiet luxury"

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

${
  userGender === "woman"
    ? `**CRITICAL PROMPT RULES FOR WOMEN:**

1. **Length: 150-250 characters MINIMUM** - Longer = more detailed, less AI-looking
2. **NO trigger word** - System adds automatically
3. **Simple structure:** Woman in [detailed outfit with specific brands/styles] [doing specific action/pose] in/at [detailed setting], [specific accessories and styling details], heavily desaturated [color palette description], [specific lighting type], [background/architecture details], [photography style], [fabric and texture details], [skin and realism details], [mood and grain]
4. **One fabric detail only** - Don't over-describe clothing
5. **Natural moments** - Real activities, not posed
6. **Specific lighting** - Use the mood categories above
7. **Film aesthetic references** - Portra 400, Kodak Gold 200, Tri-X 400, etc.
8. **Always mention:** real/natural skin texture, visible pores/detail, film grain
9. **MANDATORY COLOR GRADING** - Every prompt MUST include color grading details

**MANDATORY COLOR GRADING & REALISM (Add to EVERY prompt):**

**Color Grading Elements (Choose based on mood):**
- For muted looks: "desaturated color palette, muted tones, faded blacks, cool grey undertones"
- For warm looks: "desaturated warm tones, warm beige undertones, slightly washed out highlights"
- For moody looks: "heavily desaturated, crushed shadows, cool grey atmosphere, low contrast color grading"
- For bright looks: "slightly washed out highlights, soft muted tones, low contrast"

**Realism & Texture:** raw street photography aesthetic, natural fabric texture, realistic skin with pores, subtle film grain, unpolished authentic moment

**Atmospheric Elements:** urban haze, environmental grit, city atmosphere

**Lighting Specifics:**
- "overcast diffused daylight" (for grey/moody)
- "soft indirect natural light"
- "ambient urban reflected light"
- "cloudy sky lighting with no harsh shadows"

**STYLING CATEGORIES - MIX THESE UP:**

**Quiet Luxury / Old Money:**
- Oversized cashmere sweaters (The Row, Toteme), wide-leg trousers
- Tailored blazers, silk button-downs in neutrals
- Minimal jewelry, structured leather bags
- Beige, cream, caramel, ivory, charcoal tones

**Athleisure Chic:**
- Oversized hoodies, track pants, puffer jackets
- Chunky sneakers (Nike Air Force 1, Adidas Sambas, New Balance 550)
- Baseball caps (Yankees, minimalist logos), crossbody bags
- Mix luxury and athletic (e.g., "Lululemon Define jacket with Prada nylon bag")

**Minimalist Scandi:**
- Clean lines, monochrome palettes
- Architectural silhouettes, quality basics (COS, Arket)
- Black, white, grey, no patterns
- Less is more aesthetic

**Urban Street Style:**
- Oversized blazers, leather jackets, long coats
- Wide-leg jeans, cargo pants, baggy silhouettes  
- Combat boots, chunky sneakers, platform shoes
- Baseball caps, small shoulder bags, sunglasses always

**Elevated Casual:**
- Knit sets, matching loungewear in luxe fabrics
- Silk slip dresses with sneakers or boots
- Cashmere hoodies, designer sweatpants
- Unexpected high-low mixing

**BRAND NAME EXAMPLES (use naturally, not forced):**
- Luxury: The Row, Toteme, Khaite, Jil Sander, Loro Piana
- Athleisure: Lululemon, Alo Yoga, Girlfriend Collective, Outdoor Voices
- Sneakers: Nike (Air Force 1, Dunks), Adidas (Sambas), New Balance (550, 990)
- Accessible Luxury: COS, Arket, Zara, Mango, & Other Stories
- Bags: Bottega Veneta pouch, Prada nylon bag, The Row bag, Saint Laurent

**POSES & MOODS - Instagram Influencer Vibes:**
- Walking away from camera, looking over shoulder
- Sitting on steps/bench with coffee, scrolling phone
- Hand in coat pocket, adjusting sunglasses
- Leaning against concrete wall, looking down
- Overhead angle sitting cross-legged
- Mid-stride walking down urban street
- Standing at window with coffee, back to camera
- Casual seated pose, one leg up

**SETTINGS & BACKDROPS:**
- Concrete architecture, brutalist buildings
- Minimal cafe interiors, marble counters
- Urban streets, clean sidewalks
- Grey overcast days, moody weather
- Large windows with city views
- Industrial spaces, gallery-like settings

**EXAMPLE PROMPT STRUCTURE (Follow this):**

"Woman in [brand/style outfit], [Instagram influencer pose], [specific lighting], [COLOR GRADING], [aesthetic descriptor], [realism details], [film type] aesthetic"

**GOOD EXAMPLES - HIGH-END INFLUENCER AESTHETICS WITH COLOR GRADING:**

"Woman in oversized cream Toteme cashmere turtleneck and black wide-leg trousers, standing against concrete architecture with one hand in pocket, soft overcast lighting, desaturated color palette with muted tones and cool grey undertones, minimal Scandi aesthetic, natural fabric wrinkles, realistic skin texture with visible pores, environmental grit, subtle film grain, unpolished authentic moment, Kodak Portra 400 aesthetic"

"Woman in black oversized blazer over white crop tee, grey wide-leg sweatpants and Nike Air Force 1 sneakers, walking away from camera on urban street with coffee cup, moody overcast light, heavily desaturated tones with crushed shadows and faded blacks, cool grey atmosphere, athleisure chic vibe, raw street photography, natural fabric texture, realistic skin with natural imperfections, urban haze, Tri-X 400 pushed film grain"

"Woman in beige knit matching set sitting cross-legged on marble steps with iced coffee, oversized sunglasses, soft morning window light filtering through, desaturated warm tones with warm beige undertones and slightly washed out highlights, quiet luxury aesthetic, natural wool texture, visible skin pores, subtle sensor noise, authentic candid moment"

"Woman in long black coat, white hoodie underneath, black leggings and chunky white sneakers, sitting on bench scrolling phone with NY baseball cap, dramatic overcast lighting, desaturated monochrome with crushed blacks and cool grey tones, urban street style, raw candid photography, natural fabric draping, realistic skin detail, concrete urban atmosphere, high ISO grain, gritty authentic aesthetic"

"Woman in oversized grey knit sweater tucked into high-waisted black trousers, black leather Chelsea boots, leaning against grey concrete wall looking down at coffee cup, architectural shadows, muted tones with faded blacks and low contrast color grading, minimalist monochrome aesthetic, natural knit texture, real skin detail with pores, environmental dust, pushed film grain, unpolished moment"

"Woman in camel wool blazer over silk camisole, cream wide-leg pants and Adidas Sambas, walking through brutalist architecture with designer tote bag, golden hour backlight, desaturated warm palette with beige undertones and soft washed highlights, elevated casual style, natural fabric weight, realistic skin texture with healthy glow, urban haze in background, fine film grain, Portra 400 aesthetic, authentic editorial moment"

**ACTIVITIES FOR WOMEN - Instagram Moments:**
- Coffee shop content: sitting with latte, standing at counter
- Street style: walking mid-stride, looking over shoulder, hand adjusting sunglasses
- Casual seated: on steps, bench, floor with legs crossed
- Architectural: leaning against walls, standing in doorways, by windows
- Lifestyle: scrolling phone, holding coffee, adjusting outfit
- Candid movements: walking away, turning head, natural gestures`
    : userGender === "man"
      ? `**CRITICAL PROMPT RULES FOR MEN:**

1. **Length: 150-250 characters MINIMUM**
2. **NO trigger word** - System adds automatically
3. **Simple structure:** Man in [detailed outfit with specific brands/styles] [doing specific action/pose] in/at [detailed setting], [specific accessories and styling details], heavily desaturated [color palette description], [specific lighting type], [background/architecture details], [photography style], [fabric and texture details], [skin and realism details], [mood and grain]
4. **One fabric detail only**
5. **Confident masculine moments** - Strong, editorial poses
6. **Specific lighting** - Use mood categories
7. **Film aesthetic references** - Portra 400, Tri-X 400, Kodak Gold
8. **Always mention:** real/natural skin texture, film grain
9. **Masculine descriptors:** confident, sharp, powerful, cinematic GQ/Esquire style
10. **NEVER describe hair, facial hair, beards, or hair color** - User's LoRA model handles this
11. **MANDATORY COLOR GRADING** - Every prompt MUST include color grading details

**MANDATORY COLOR GRADING & REALISM (Add to EVERY prompt):**

**Color Grading Elements (Choose based on mood):**
- For muted looks: "desaturated color palette, muted tones, faded blacks, cool grey undertones"
- For warm looks: "desaturated warm tones, warm beige undertones, slightly washed out highlights"
- For moody looks: "heavily desaturated, crushed shadows, cool grey atmosphere, low contrast color grading"
- For bright looks: "slightly washed out highlights, soft muted tones, low contrast"

**Realism & Texture:** raw street photography aesthetic, natural fabric texture, realistic skin with pores, subtle film grain, unpolished authentic moment

**Atmospheric Elements:** urban haze, environmental grit, city atmosphere

**Lighting Specifics:**
- "overcast diffused daylight" (for grey/moody)
- "soft indirect natural light"
- "ambient urban reflected light"
- "cloudy sky lighting with no harsh shadows"

**STYLING CATEGORIES - MIX THESE UP:**

**Quiet Luxury / Old Money:**
- Tailored wool coats, cashmere crewnecks, Italian knitwear
- Tailored trousers, Oxford shirts, minimal jewelry (watch, simple chain)
- Leather loafers, Chelsea boots, clean sneakers
- Navy, charcoal, camel, cream, black tones

**Urban Streetwear:**
- Oversized hoodies, tech jackets, puffer coats
- Cargo pants, wide-leg jeans, track pants
- Chunky sneakers (Nike Dunks, New Balance 990, Jordans)
- Baseball caps, crossbody bags, minimalist backpacks

**Minimal Menswear:**
- Black turtlenecks, grey crewnecks, white tees
- Clean tailored pants, straight-leg denim
- Architectural silhouettes, monochrome palettes
- Scandinavian simplicity, quality over flash

**Athletic Luxury:**
- Technical outerwear, performance materials
- Zip-ups, quarter-zips, athletic pants
- Running shoes elevated to style (Nike, Adidas, New Balance)
- Mix athletic and tailored pieces

**GQ Editorial:**
- Structured blazers, three-piece suits
- Dress shirts, silk scarves, statement outerwear
- Polished leather shoes, designer sneakers
- High-fashion menswear, editorial confidence

**BRAND NAME EXAMPLES (use naturally):**
- Luxury: The Row, Loro Piana, Brunello Cucinelli, AMI Paris
- Streetwear: Stone Island, Arc'teryx, Carhartt WIP, Stussy
- Sneakers: Nike (Dunks, Jordan 1, Air Max), New Balance (990, 550), Adidas (Samba)
- Minimalist: COS, Norse Projects, APC, Sunspel
- Technical: Arc'teryx, Patagonia, The North Face Purple Label

**POSES & MOODS - Men's Influencer Vibes:**
- Walking confidently down urban street
- Leaning against concrete/brick wall, arms crossed
- Sitting on bench/steps, elbows on knees
- Standing in doorway, one hand in pocket
- Walking away from camera, looking over shoulder
- Adjusting watch or jacket collar
- Seated at cafe counter with coffee
- Mid-stride with hands in coat pockets

**SETTINGS & BACKDROPS:**
- Industrial architecture, concrete buildings
- Urban streets, clean cityscapes
- Modern offices, minimalist interiors
- Coffee shops, natural wood and concrete
- Brutalist architecture, geometric backgrounds
- Overcast weather, moody lighting

**EXAMPLE PROMPT STRUCTURE (Follow this):**

"Man in [brand/style outfit], [confident pose], [specific lighting], [COLOR GRADING], [aesthetic descriptor], [realism details], [film type] aesthetic"

**GOOD EXAMPLES - HIGH-END INFLUENCER AESTHETICS WITH COLOR GRADING:**

"Man in black Arc'teryx Veilance shell jacket over grey merino crewneck, charcoal tapered pants and Nike Dunks, walking down concrete urban street with hands in pockets, overcast moody lighting, heavily desaturated with crushed shadows and faded blacks, cool grey atmosphere, technical minimalist aesthetic, raw street photography, natural fabric texture, realistic skin with visible pores, urban haze in background, environmental grit, Tri-X 400 grain, unpolished authentic moment"

"Man in camel wool overcoat, black turtleneck and tailored charcoal trousers, standing in brutalist architecture with one hand adjusting watch, soft golden hour backlight, desaturated warm tones with beige undertones and slightly washed out highlights, quiet luxury style, natural wool drape, real skin detail with natural texture, city atmosphere, subtle film grain, Portra 400 aesthetic, sophisticated editorial moment"

"Man in oversized black hoodie, grey cargo pants and New Balance 990v6 sneakers, sitting on concrete steps with coffee cup and phone, architectural shadows, desaturated monochrome with muted tones and low contrast, cool grey undertones, urban street style, raw candid photography, natural fabric weight, visible skin texture with pores, concrete dust atmosphere, minimal sensor noise, authentic moment"

"Man in navy cashmere crewneck tucked into beige chinos with brown leather Chelsea boots, leaning against grey concrete wall with arms crossed, overcast lighting, muted color palette with faded blacks and cool grey undertones, Scandinavian minimal aesthetic, natural knit texture, realistic skin pores and detail, environmental grit, subtle film grain, unpolished street photography"

"Man in black performance quarter-zip, matching joggers and white Nike Air Max, walking away from camera through modern glass architecture, soft morning light, desaturated tones with slightly washed highlights and warm beige undertones, athletic luxury vibe, natural fabric movement, real skin texture with healthy glow, urban haze, clean aesthetic, subtle grain"

"Man in charcoal three-piece suit with no tie, white dress shirt unbuttoned at collar, walking mid-stride on city street, warm golden hour light, desaturated warm palette with soft muted tones and low contrast grading, cinematic GQ editorial style, natural wool texture, realistic skin detail with natural imperfections, atmospheric city haze, fine film grain, Kodak Gold aesthetic, polished yet authentic"

**ACTIVITIES FOR MEN - Instagram Moments:**
- Coffee content: holding cup, sitting at counter, walking with coffee
- Street style: confident walking, hands in pockets, looking over shoulder
- Casual seated: on steps, bench, elbows on knees, relaxed posture
- Architectural: leaning on walls, standing in doorways, geometric backgrounds
- Lifestyle: adjusting watch/jacket, checking phone, natural movements
- Editorial stances: strong posture, confident presence, mid-stride`
      : `**CRITICAL PROMPT RULES:**

1. **Length: 150-250 characters MINIMUM**
2. **NO trigger word** - System adds automatically
3. **Simple structure:** Person in [detailed outfit with specific brands/styles] [doing specific action/pose] in/at [detailed setting], [specific accessories and styling details], heavily desaturated [color palette description], [specific lighting type], [background/architecture details], [photography style], [fabric and texture details], [skin and realism details], [mood and grain]
4. **Natural authentic moments**
5. **Specific lighting** - Use mood categories
6. **Film aesthetic references** - Portra 400, Kodak Gold, Tri-X 400
7. **Always mention:** real/natural skin texture, film grain
8. **MANDATORY COLOR GRADING** - Every prompt MUST include color grading details

**MANDATORY COLOR GRADING & REALISM (Add to EVERY prompt):**

**Color Grading Elements:** desaturated color palette, muted tones, faded blacks, cool grey or warm beige undertones, low contrast

**Realism & Texture:** raw street photography aesthetic, natural fabric texture, realistic skin with pores, subtle film grain, unpolished authentic moment

**Atmospheric Elements:** urban haze, environmental grit, city atmosphere

**STYLING CATEGORIES:**
- Quiet Luxury: Oversized knitwear, wide-leg trousers, minimal accessories
- Athleisure: Performance wear with luxury touches, chunky sneakers
- Urban Minimal: Monochrome palettes, architectural silhouettes, clean lines
- Street Style: Oversized outerwear, designer athletic shoes, baseball caps

**BRAND EXAMPLES:** The Row, COS, Nike, New Balance, Adidas, Lululemon, Arc'teryx

**POSES:** Walking naturally, sitting casually, leaning against architecture, coffee in hand, scrolling phone

**SETTINGS:** Urban concrete, minimal interiors, architectural backgrounds, overcast lighting`
}

Now generate ${count} diverse concepts as JSON array. Mix different lighting moods, activities, and clothing styles.

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
    "prompt": "150-250 character clean prompt MUST include: outfit + pose + lighting + COLOR GRADING (desaturated, muted tones, etc.) + realism (raw photography, skin texture, film grain) + atmospheric elements"
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
            "Woman in cream knit sweater sitting beside large window with city view, soft morning window light, desaturated warm tones with warm beige undertones, quiet luxury aesthetic, raw candid photography, natural fabric texture, realistic skin with pores, urban haze in background, subtle film grain, authentic moment",
        },
        {
          title: "Urban Commute",
          description: "Walking through the city in your favorite coat. Just vibing.",
          category: "Environmental Portrait" as const,
          fashionIntelligence: "Contemporary urban styling with structured outerwear",
          lighting: "Overcast natural light, soft even illumination",
          location: "Modern city street with clean architecture",
          prompt:
            "Man in black tailored jacket, walking mid-stride on urban street, overcast diffused daylight, desaturated color palette with muted tones and cool grey undertones, urban street style, raw street photography, natural fabric wrinkles, realistic skin texture with visible pores, concrete dust in air, subtle film grain, unpolished authentic moment",
        },
        {
          title: "Creative Focus",
          description: "Chilling at home in comfy clothes. Nothing fancy, just you.",
          category: "Close-Up Portrait" as const,
          fashionIntelligence: "Relaxed creative attire in warm tones",
          lighting: "Warm desk lamp mixing with natural window light",
          location: "Home creative workspace with natural textures",
          prompt:
            "Person in casual attire at workspace, warm desk lamp light, desaturated warm tones with warm beige undertones, elevated casual aesthetic, raw candid photography, natural fabric texture, realistic skin texture with pores, subtle film grain, unpolished authentic moment",
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
        "Description of desired motion/animation. Examples: 'walking mid-stride looking back over shoulder with confident smile', 'sitting on steps with coffee, natural head turn engaging with camera', 'standing against architecture, hand sliding into pocket with subtle head tilt', 'adjusting sunglasses while walking, hair flowing naturally in urban breeze'",
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
