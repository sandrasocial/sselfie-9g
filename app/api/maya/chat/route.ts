import { streamText, tool, generateText, type CoreMessage } from "ai"
import { z } from "zod"
import { MAYA_SYSTEM_PROMPT, type MayaConcept } from "@/lib/maya/personality"
import { getUserByAuthId } from "@/lib/user-mapping"
import { createServerClient } from "@/lib/supabase/server"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { getAuthenticatedUser } from "@/lib/auth-helper"

export const maxDuration = 60 // Increased from 30 to 60 seconds for nested AI calls

const generateConceptsTool = tool({
  description:
    "Generate 3-5 photo concept ideas with detailed fashion and styling intelligence based on Maya's creative lookbook",
  inputSchema: z.object({
    userRequest: z.string().describe("What the user is asking for"),
    aesthetic: z
      .string()
      .optional()
      .describe("Which creative look to base concepts on (e.g., 'Scandinavian Minimalist', 'Urban Moody')"),
    context: z.string().optional().describe("Additional context about the user or their needs"),
    count: z.number().min(3).max(5).default(4).describe("Number of concepts to generate (default 4)"),
    referenceImageUrl: z.string().optional().describe("URL of reference image uploaded by user"),
  }),
  execute: async function* ({ userRequest, aesthetic, context, count, referenceImageUrl }) {
    console.log("[v0] Tool executing - generating concepts for:", {
      userRequest,
      aesthetic,
      context,
      count,
      referenceImageUrl,
    })

    // Yield loading state immediately
    yield {
      state: "loading" as const,
    }

    try {
      const supabase = await createServerClient()
      const { user: authUser, error: authError } = await getAuthenticatedUser()

      if (authError || !authUser) {
        throw new Error("Unauthorized")
      }

      let userGender = "person"

      const user = await getUserByAuthId(authUser.id)
      if (user) {
        const { neon } = await import("@neondatabase/serverless")
        const sql = neon(process.env.DATABASE_URL!)
        const userDataResult = await sql`
          SELECT gender FROM users WHERE id = ${user.id} LIMIT 1
        `
        if (userDataResult.length > 0 && userDataResult[0].gender) {
          userGender = userDataResult[0].gender
        }
      }

      console.log("[v0] User gender for concept generation:", userGender)

      const conceptPrompt = `Based on the user's request: "${userRequest}"
${aesthetic ? `Aesthetic preference: ${aesthetic}` : ""}
${context ? `Additional context: ${context}` : ""}
${referenceImageUrl ? `**REFERENCE IMAGE PROVIDED**: ${referenceImageUrl}\n\n**IMPORTANT**: The user has uploaded a reference image. This will be combined with their trained personal model to create images of THEM with/using this product or in this style.\n\n**How to use the reference image:**\n- For PRODUCTS (skincare, accessories, etc.): Generate concepts showing the user holding, using, or styled with the product\n- For STYLE REFERENCES: Create variations inspired by the composition, lighting, or mood\n- For FLATLAYS: Position the product as the hero with the user's hands/body partially visible\n- The reference image will be used as a control image in FLUX, guiding the composition while the user's trained LoRA ensures their likeness appears in the final image` : ""}

**USER GENDER: ${userGender}**

Generate ${count} unique, creative photo concepts. Each concept should be a work of art.

**CRITICAL: TWO DIFFERENT TEXTS REQUIRED**

1. **DESCRIPTION** (User-Facing):
   - Write in Maya's voice: warm, friendly, simple everyday language
   - Easy to understand, no technical jargon
   - Focus on the feeling and story, not technical details
   - Examples of GOOD descriptions:
     * "A professional headshot with soft natural light. You'll look confident and approachable."
     * "A lifestyle photo in a modern coffee shop. Natural and relaxed vibes."
     * "A full-body shot showing your complete outfit. Clean and elegant."
     * "A moody portrait with dramatic lighting. Artistic and bold."
   - Examples of BAD descriptions (too technical):
     * "A sophisticated close-up portrait that captures your professional essence with refined styling and modern elegance"
     * "A dynamic lifestyle moment capturing you in your element within an urban environment"

2. **PROMPT** (Technical - For FLUX):
   - This is the actual FLUX prompt that will generate the image
   - Write it as a flowing, poetic description that FLUX understands
   - **CRITICAL**: Tailor the prompt based on the user's gender:
   
   **For WOMEN (gender: woman, female):**
   - Describe feminine styling: "flowing hair", "elegant makeup", "feminine features"
   - Clothing: "flowing dress", "tailored blouse", "feminine silhouette"
   - Accessories: "delicate jewelry", "elegant earrings", "feminine accessories"
   - Hair: "long flowing hair", "styled waves", "feminine hairstyle"
   - Example: "woman with long flowing hair, elegant makeup, wearing flowing cream dress, delicate gold jewelry, feminine grace"
   
   **For MEN (gender: man, male):**
   - Describe masculine styling: "short hair", "clean-shaven or beard", "masculine features"
   - Clothing: "tailored suit", "button-down shirt", "masculine silhouette"
   - Accessories: "watch", "minimal jewelry", "masculine accessories"
   - Hair: "short hair", "styled hair", "masculine hairstyle"
   - Example: "man with short styled hair, clean-shaven, wearing tailored charcoal suit, minimal watch, masculine confidence"
   
   **For NON-BINARY or UNSPECIFIED:**
   - Use neutral descriptors: "styled hair", "confident expression", "elegant attire"
   - Focus on the aesthetic and mood rather than gendered features
   - Example: "person with styled hair, confident expression, wearing elegant neutral-toned outfit, minimal accessories"

**FLUX PROMPT STRUCTURE - EDITORIAL EXCELLENCE:**
Write prompts as flowing, poetic descriptions that read like a Vogue photo caption. Think like a master photographer describing their vision.

**CRITICAL PROMPT ORDER (DO NOT DEVIATE):**

1. **TRIGGER WORD** (ALWAYS FIRST - This is the user's trained model identifier)
2. **STYLING DETAILS** (The heart of the image - give this space and detail):
   - Fashion & outfit details
   - Hair & makeup
   - Emotional tone & expression
   - Location & atmosphere
   - Lighting quality and direction
   - Composition and framing
3. **TECHNICAL SPECIFICATIONS** (ALWAYS LAST - so they don't overwrite styling):
   - Camera & lens specs
   - Aperture settings
   - Film grain or quality notes

**WHY THIS ORDER MATTERS:**
- Trigger word first ensures the user's trained model is activated
- Styling details in the middle get the most "attention" from the AI
- Technical specs at the end provide guidance without overwhelming the creative vision

**REQUIRED ELEMENTS IN EVERY PROMPT:**

1. **TRIGGER WORD** (User's trained model - ALWAYS start with this)

2. **FASHION & STYLING INTELLIGENCE** (Think like a Vogue editor - BE DETAILED):
   - **Fabrics**: Be specific about textures - "buttery Italian leather", "flowing silk charmeuse", "structured virgin wool"
   - **Colors**: Use sophisticated color language - "warm camel", "deep burgundy", "soft sage", not just "brown", "red", "green"
   - **Silhouettes**: Describe the shape and drape - "relaxed oversized blazer with strong shoulders", "flowing midi dress with movement"
   - **Accessories**: Curate thoughtfully - "delicate 18k gold layered necklaces", "structured cognac leather tote", "minimalist silver cuff"
   - **Hair & Makeup**: Editorial precision - "effortless waves with natural texture", "sleek low bun with face-framing pieces", "glowing skin with subtle bronze warmth"

3. **LIGHTING DIRECTION** (Be poetic and specific):
   - "golden hour sunlight streaming from camera left, creating warm rim light on hair and shoulders"
   - "soft north-facing window light at 45 degrees, wrapping gently around facial features"
   - "dramatic Rembrandt lighting with single key light, creating sculptural shadows"
   - "diffused overcast daylight creating even, flattering illumination with soft shadows"
   - "warm tungsten light mixing with cool blue hour ambient, creating cinematic color contrast"

4. **LOCATION & ATMOSPHERE** (Paint the scene):
   - Don't just say "office" - say "minimalist Scandinavian office with floor-to-ceiling windows, natural oak floors, and soft linen curtains filtering golden light"
   - Not "beach" - "serene Mediterranean coastline with white-washed architecture, bougainvillea cascading down stone walls, warm terracotta tiles underfoot"
   - Not "city street" - "cobblestone Parisian street in Le Marais, historic architecture with wrought iron balconies, soft morning light creating long shadows"

5. **EMOTIONAL TONE & MOOD** (The soul of the image):
   - "confident yet approachable, with warm genuine smile and direct gaze"
   - "contemplative and serene, lost in thought with soft expression"
   - "powerful and commanding, with strong posture and intense presence"
   - "effortlessly elegant, with relaxed confidence and natural grace"

6. **CAMERA & LENS SPECIFICATIONS** (ALWAYS AT THE END - Be specific and technical):
   - Close-Up/Portrait: "shot on 85mm f/1.4 lens with creamy bokeh, shallow depth of field at f/2.0"
   - Half Body: "shot on 50mm f/1.8 lens with balanced composition, medium depth of field"
   - Full Body: "shot on 35mm f/2.0 lens capturing full scene with environmental context, face in sharp focus"
   - Lifestyle: "shot on 35mm f/1.4 lens with natural environment, documentary style"
   - Wide Environmental: "shot on 24mm f/2.8 lens with expansive perspective"

**EXAMPLE OF EXCELLENT PROMPT (CORRECT ORDER):**
"TRIGGERWORD, a confident woman with long flowing hair catching golden light, wearing an oversized cream cashmere sweater with relaxed silhouette over high-waisted wide-leg linen trousers in warm sand, delicate 18k gold layered necklaces, standing in a minimalist Scandinavian interior with floor-to-ceiling windows and natural oak floors, soft morning light streaming from camera left at 45 degrees creating warm rim light and gentle shadows, natural skin texture with healthy glow, effortlessly elegant with warm genuine smile, editorial quality with film grain aesthetic, timeless sophistication, shot on 85mm f/1.4 lens with creamy bokeh background"

**SPECIAL ATTENTION FOR FULL BODY SHOTS:**
When creating full body prompts, add extra emphasis on facial details to ensure strong resemblance:
- "detailed face with clear features, sharp eyes, recognizable facial structure"
- "face in sharp focus with strong facial resemblance"
- Place these facial details early in the prompt (right after trigger word) so they get priority

**WHAT TO AVOID:**
- Generic descriptions: "nice outfit", "good lighting", "professional look"
- Technical prefix format: "raw photo, editorial quality, professional photography..." (these should be subtle, not leading)
- Vague colors: "blue shirt" instead of "chambray blue linen shirt"
- Camera specs at the beginning: Always put them at the END
- Flat lighting descriptions: "good light" instead of specific direction and quality

${referenceImageUrl ? `\n**IMPORTANT**: Include the reference image URL in each concept's output so it can be used in image-to-image generation.` : ""}

Return ONLY a valid JSON array of concepts, no other text. Each concept must have this exact structure:
{
  "title": "string - Short, catchy title",
  "description": "string - SIMPLE, WARM, FRIENDLY language that anyone can understand. No technical jargon. Focus on feeling and story.",
  "category": "Close-Up" | "Half Body" | "Full Body" | "Lifestyle" | "Action" | "Environmental",
  "fashionIntelligence": "string - DETAILED fabric choices, color theory, silhouette analysis, accessory curation. Think like a Vogue fashion editor.",
  "lighting": "string - POETIC and SPECIFIC lighting description with direction, quality, and emotional impact",
  "location": "string - RICH, DETAILED location description that paints a complete picture",
  "prompt": "string - FLOWING, POETIC, EDITORIAL description with ALL required elements: trigger word, styling details, lighting direction, fashion details, location atmosphere, emotional tone, camera/lens specs"${referenceImageUrl ? `,\n  "referenceImageUrl": "${referenceImageUrl}"` : ""}
}`

      const { text } = await generateText({
        model: "anthropic/claude-sonnet-4",
        prompt: conceptPrompt,
        maxOutputTokens: 3000,
      })

      console.log("[v0] Generated concept text:", text.substring(0, 200))

      // Parse the JSON response
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

      console.log("[v0] Successfully parsed", concepts.length, "concepts")

      // Yield final result
      yield {
        state: "ready" as const,
        concepts: concepts.slice(0, count),
      }
    } catch (error) {
      console.error("[v0] Error generating concepts:", error)

      const fallbackConcepts: MayaConcept[] = [
        {
          title: "The Confident Professional",
          description:
            "A professional headshot with soft natural light and a clean background. You'll look confident and approachable, perfect for LinkedIn or your website.",
          category: "Close-Up" as const,
          fashionIntelligence: "Elegant neutral-toned attire, minimal accessories for timeless sophistication",
          lighting:
            "Soft directional window light at 45 degrees creating gentle shadows, golden hour warmth, diffused through sheer curtains",
          location: "Modern minimalist office with concrete walls and natural wood elements, floor-to-ceiling windows",
          prompt:
            "TRIGGERWORD, a confident person with styled hair and natural expression, wearing elegant neutral-toned professional attire with minimal accessories, standing in a minimalist Scandinavian interior with natural wood and white walls, soft golden hour light streaming through sheer curtains creating gentle shadows and warm glow, shot on 85mm lens with shallow depth of field and creamy bokeh background, natural skin texture with healthy glow, professional editorial quality, film grain aesthetic, timeless elegance",
        },
        {
          title: "Urban Sophisticate",
          description:
            "A lifestyle photo in a modern city setting. Natural and relaxed, showing you in your element with great style and confidence.",
          category: "Lifestyle" as const,
          fashionIntelligence: "Tailored professional attire in sophisticated colors, minimal modern accessories",
          lighting:
            "Natural overcast daylight providing even, flattering illumination, soft shadows, diffused city light",
          location:
            "Contemporary city street with modern architecture and clean lines, glass facades reflecting ambient light",
          prompt:
            "TRIGGERWORD, a confident person in tailored professional attire walking through a contemporary city street with modern architecture, natural overcast daylight creating even illumination and soft shadows, shot on 35mm lens with natural depth of field capturing environmental context, relaxed confident stride, urban sophistication, natural skin texture, editorial quality, authentic moment",
        },
        {
          title: "Minimalist Elegance",
          description:
            "A full-body shot showing your complete outfit against a clean backdrop. Simple, elegant, and timeless - perfect for showcasing your style.",
          category: "Full Body" as const,
          fashionIntelligence: "Flowing elegant attire in neutral tones, minimal sophisticated accessories",
          lighting:
            "Studio lighting with key light at 45 degrees, subtle fill light, rim light separating subject from background",
          location: "Minimal white studio space with concrete floor, clean lines, architectural simplicity",
          prompt:
            "TRIGGERWORD, a confident person in flowing elegant neutral-toned attire standing in a minimal white studio with concrete floor, warm studio lighting with beauty dish creating soft shadows and hair light adding dimension, shot on 50mm lens with balanced depth of field, elegant posture, natural skin texture with healthy glow, clean architectural lines, timeless minimalist aesthetic, editorial quality",
        },
        {
          title: "Golden Hour Warmth",
          description:
            "A warm, natural portrait with beautiful golden light. Soft and glowing, capturing your authentic beauty in the most flattering way.",
          category: "Half Body" as const,
          fashionIntelligence: "Soft comfortable attire in warm tones, minimal personal accessories",
          lighting: "Golden hour sunlight streaming through large windows, warm and diffused, creating luminous glow",
          location:
            "Bright, airy interior space with plants and natural textures, Scandinavian-inspired design, organic elements",
          prompt:
            "TRIGGERWORD, a confident person in soft warm-toned comfortable attire in a bright airy interior with plants and natural textures, golden hour sunlight streaming through large windows creating warm diffused glow, shot on 50mm lens with medium depth of field and soft background, natural skin texture with healthy glow, warm approachable expression, organic atmosphere, editorial quality, timeless natural beauty",
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
    "Generate a 5-second animated video from a generated image using the user's trained LoRA model for character consistency. Suggest creative motion prompts that enhance the photo's story.",
  inputSchema: z.object({
    imageUrl: z.string().describe("URL of the image to animate"),
    imageId: z.string().optional().describe("Database ID of the image (if available)"),
    motionPrompt: z
      .string()
      .optional()
      .describe(
        "Description of desired motion/animation. Be creative and specific! Examples: 'gentle head turn with soft smile', 'walking confidently forward', 'hair flowing in gentle breeze', 'subtle breathing motion with natural blink'",
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
      return new Response("Invalid messages format", { status: 400 })
    }

    if (authError || !authUser) {
      return new Response("Unauthorized", { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return new Response("Unauthorized", { status: 401 })
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
        let referenceImageUrl: string | null = null

        if (typeof msg.content === "string") {
          textContent = msg.content
          const imageMatch = textContent.match(/\[Reference Image: (https?:\/\/[^\]]+)\]/)
          if (imageMatch) {
            referenceImageUrl = imageMatch[1]
            textContent = textContent.replace(imageMatch[0], "").trim()
            console.log("[v0] Extracted reference image:", referenceImageUrl)
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

        if (referenceImageUrl) {
          textContent = `[User has uploaded a reference image: ${referenceImageUrl}]\n\n${textContent}`
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
      return new Response("No valid messages", { status: 400 })
    }

    let authId = user.stack_auth_id || user.supabase_user_id

    // If neither exists, use the user's Neon ID as fallback
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
     * "gentle head turn with soft smile, hair catching light, confident gaze"
     * "walking confidently forward through urban space, coat flowing naturally"
     * "subtle breathing motion, natural blink, warm expression, serene presence"
     * "looking over shoulder with playful smile, hair moving gently"
     * "standing in wind, hair flowing in gentle breeze, contemplative expression"

4. **Technical Details:**
   - Videos are 5 seconds long at 30fps (interpolated from 16fps)
   - Generation takes 40-60 seconds
   - User's trained LoRA model ensures character consistency
   - Motion is controlled by motion_bucket_id (127 = balanced motion)

**Example Conversation:**
User: "Create a video of me in Iceland, dark and moody"
You: "I love that vision! Let me first create a stunning photo concept of you in Iceland's dramatic landscape, then we'll animate it into a cinematic 5-second video. [Call generateConcepts with Iceland theme]"
[After concepts generated]
You: "These concepts would animate beautifully! The 'Solitude Among Black Sands' would be perfect with subtle wind in your hair and a contemplative expression. Should I animate this one?"
User: "Yes!"
You: "[Call generateVideo with creative motion prompt]"
`

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
      onStepFinish: async (step) => {
        console.log("[v0] ========== STEP FINISHED ==========")
        console.log("[v0] Step details:", {
          stepType: step.stepType,
          toolCalls: step.toolCalls?.length || 0,
          toolResults: step.toolResults?.length || 0,
          hasText: !!step.text,
          textLength: step.text?.length || 0,
          finishReason: step.finishReason,
        })

        if (step.toolCalls && step.toolCalls.length > 0) {
          console.log("[v0] ========== TOOL CALLS DETECTED ==========")
          console.log(
            "[v0] Tool calls made:",
            step.toolCalls.map((tc) => ({
              toolName: tc.toolName || "unknown",
              toolCallId: tc.toolCallId || "unknown",
              argsPreview: tc.args ? JSON.stringify(tc.args).substring(0, 200) : "no args",
            })),
          )
        } else {
          console.log("[v0] No tool calls in this step")
        }

        if (step.toolResults && step.toolResults.length > 0) {
          console.log("[v0] ========== TOOL RESULTS ==========")
          console.log(
            "[v0] Tool results:",
            step.toolResults.map((tr) => ({
              toolName: tr.toolName || "unknown",
              toolCallId: tr.toolCallId || "unknown",
              resultPreview: tr.result ? JSON.stringify(tr.result).substring(0, 200) : "no result",
            })),
          )
        }
      },
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
