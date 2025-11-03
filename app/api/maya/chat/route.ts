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

**CRITICAL - USER GENDER: ${userGender}**

**YOU MUST USE GENDER-SPECIFIC LANGUAGE IN ALL PROMPTS:**
${
  userGender === "woman" || userGender === "female"
    ? `
- ALWAYS use "woman" or "she/her" - NEVER use "person" or "they/them"
- Describe feminine features: "long flowing hair", "elegant makeup", "feminine grace"
- Use feminine clothing: "flowing dress", "silk blouse", "feminine silhouette"
- Use feminine accessories: "delicate jewelry", "elegant earrings"
`
    : userGender === "man" || userGender === "male"
      ? `
- ALWAYS use "man" or "he/him" - NEVER use "person" or "they/them"
- Describe masculine features: "short styled hair", "strong jawline", "masculine confidence"
- Use masculine clothing: "tailored suit", "button-down shirt", "masculine silhouette"
- Use masculine accessories: "watch", "minimal jewelry"
`
      : `
- Use "person" and "they/them" pronouns
- Use neutral descriptors that don't assume gender
`
}

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
   
**CRITICAL PROMPT RULES:**

1. **DO NOT include "TRIGGERWORD" or any placeholder** - The system automatically adds the user's trained model identifier
2. **START with gender-specific descriptor** - ${userGender === "woman" || userGender === "female" ? '"a woman with..." or "woman with..."' : userGender === "man" || userGender === "male" ? '"a man with..." or "man with..."' : '"a person with..."'}
3. **Use gender-appropriate styling throughout the entire prompt**

**FLUX PROMPT STRUCTURE - EDITORIAL EXCELLENCE:**
Write prompts as flowing, poetic descriptions that read like a Vogue photo caption. Think like a master photographer describing their vision.

**CRITICAL PROMPT ORDER (DO NOT DEVIATE):**

1. **START WITH GENDER-SPECIFIC SUBJECT DESCRIPTION:**
   ${userGender === "woman" || userGender === "female" ? '- "a woman with long flowing hair catching golden light"' : userGender === "man" || userGender === "male" ? '- "a man with short styled hair and strong features"' : '- "a person with styled hair"'}
   
2. **STYLING DETAILS** (The heart of the image - give this space and detail):
   - Fashion & outfit details (gender-appropriate)
   - Hair & makeup (gender-appropriate)
   - Emotional tone & expression
   - Location & atmosphere
   - Lighting quality and direction
   - Composition and framing
   
3. **TECHNICAL SPECIFICATIONS** (ALWAYS LAST):
   - Camera & lens specs
   - Aperture settings
   - Film grain or quality notes

**REQUIRED ELEMENTS IN EVERY PROMPT:**

1. **FASHION & STYLING INTELLIGENCE** (Think like a Vogue editor - BE DETAILED):
   ${
     userGender === "woman" || userGender === "female"
       ? `
   - **Fabrics**: "flowing silk charmeuse", "soft cashmere", "delicate lace"
   - **Colors**: "soft blush", "warm camel", "deep burgundy"
   - **Silhouettes**: "flowing midi dress", "relaxed oversized blazer", "feminine cut"
   - **Accessories**: "delicate 18k gold necklaces", "elegant earrings", "feminine jewelry"
   - **Hair & Makeup**: "long flowing hair with natural waves", "elegant makeup with soft glow"
   `
       : userGender === "man" || userGender === "male"
         ? `
   - **Fabrics**: "structured wool", "crisp cotton", "premium denim"
   - **Colors**: "charcoal grey", "navy blue", "warm earth tones"
   - **Silhouettes**: "tailored fit", "relaxed masculine cut", "structured blazer"
   - **Accessories**: "minimal watch", "leather belt", "simple jewelry"
   - **Hair & Grooming**: "short styled hair", "clean-shaven or groomed beard", "masculine styling"
   `
         : `
   - Use neutral, elegant styling that doesn't assume gender
   - Focus on sophisticated, timeless pieces
   `
   }

2. **LIGHTING DIRECTION** (Be poetic and specific):
   - "golden hour sunlight streaming from camera left, creating warm rim light"
   - "soft north-facing window light at 45 degrees, wrapping gently around features"
   - "dramatic Rembrandt lighting with single key light, creating sculptural shadows"

3. **LOCATION & ATMOSPHERE** (Paint the scene):
   - Don't just say "office" - say "minimalist Scandinavian office with floor-to-ceiling windows"
   - Not "beach" - "serene Mediterranean coastline with white-washed architecture"

4. **EMOTIONAL TONE & MOOD** (The soul of the image):
   - "confident yet approachable, with warm genuine smile"
   - "contemplative and serene, lost in thought"
   - "powerful and commanding, with strong posture"

5. **CAMERA & LENS SPECIFICATIONS** (ALWAYS AT THE END):
   - Close-Up/Portrait: "shot on 85mm f/1.4 lens with creamy bokeh"
   - Half Body: "shot on 50mm f/1.8 lens with balanced composition"
   - Full Body: "shot on 35mm f/2.0 lens capturing full scene"

**EXAMPLE OF EXCELLENT PROMPT (${userGender === "woman" || userGender === "female" ? "FOR WOMAN" : userGender === "man" || userGender === "male" ? "FOR MAN" : "GENDER NEUTRAL"}):**
${
  userGender === "woman" || userGender === "female"
    ? `
"a woman with long flowing hair catching golden light, wearing an oversized cream cashmere sweater with relaxed silhouette over high-waisted wide-leg linen trousers in warm sand, delicate 18k gold layered necklaces, standing in a minimalist Scandinavian interior with floor-to-ceiling windows and natural oak floors, soft morning light streaming from camera left at 45 degrees creating warm rim light and gentle shadows, natural skin texture with healthy glow, effortlessly elegant with warm genuine smile, editorial quality with film grain aesthetic, timeless sophistication, shot on 85mm f/1.4 lens with creamy bokeh background"
`
    : userGender === "man" || userGender === "male"
      ? `
"a man with short styled hair and strong masculine features, wearing a tailored charcoal wool suit with crisp white dress shirt and silk tie, minimal silver watch, standing in a modern urban office with floor-to-ceiling windows overlooking the city, golden hour light streaming from camera right creating dramatic rim light and strong shadows, natural skin texture with healthy glow, confident and commanding presence with strong posture, editorial quality with subtle film grain, powerful sophistication, shot on 85mm f/1.4 lens with creamy bokeh background"
`
      : `
"a person with styled hair and confident expression, wearing elegant neutral-toned attire with minimal accessories, standing in a minimalist interior with natural light, soft golden hour illumination creating warm atmosphere, natural skin texture, confident presence, editorial quality, timeless elegance, shot on 85mm f/1.4 lens"
`
}

**WHAT TO AVOID:**
- Generic descriptions: "nice outfit", "good lighting"
- Using "person" when gender is specified (${userGender === "woman" || userGender === "female" ? "ALWAYS use 'woman'" : userGender === "man" || userGender === "male" ? "ALWAYS use 'man'" : "use 'person'"})
- Including "TRIGGERWORD" or any placeholder text
- Camera specs at the beginning
- Gender-inappropriate clothing or styling

${referenceImageUrl ? `\n**IMPORTANT**: Include the reference image URL in each concept's output so it can be used in image-to-image generation.` : ""}

Return ONLY a valid JSON array of concepts, no other text. Each concept must have this exact structure:
{
  "title": "string - Short, catchy title",
  "description": "string - SIMPLE, WARM, FRIENDLY language",
  "category": "Close-Up" | "Half Body" | "Full Body" | "Lifestyle" | "Action" | "Environmental",
  "fashionIntelligence": "string - DETAILED gender-appropriate styling",
  "lighting": "string - POETIC lighting description",
  "location": "string - RICH location description",
  "prompt": "string - MUST start with '${userGender === "woman" || userGender === "female" ? "a woman" : userGender === "man" || userGender === "male" ? "a man" : "a person"}' and use gender-appropriate styling throughout"${referenceImageUrl ? `,\n  "referenceImageUrl": "${referenceImageUrl}"` : ""}
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
            "a confident person with styled hair and natural expression, wearing elegant neutral-toned professional attire with minimal accessories, standing in a minimalist Scandinavian interior with natural wood and white walls, soft golden hour light streaming through sheer curtains creating gentle shadows and warm glow, natural skin texture with healthy glow, professional editorial quality, film grain aesthetic, timeless elegance, shot on 85mm lens with shallow depth of field and creamy bokeh background",
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
            "a confident person in tailored professional attire walking through a contemporary city street with modern architecture, natural overcast daylight creating even illumination and soft shadows, relaxed confident stride, urban sophistication, natural skin texture, editorial quality, authentic moment, shot on 35mm lens with natural depth of field capturing environmental context",
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
            "a confident person in flowing elegant neutral-toned attire standing in a minimal white studio with concrete floor, warm studio lighting with beauty dish creating soft shadows and hair light adding dimension, elegant posture, natural skin texture with healthy glow, clean architectural lines, timeless minimalist aesthetic, editorial quality, shot on 50mm lens with balanced depth of field",
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
            "a confident person in soft warm-toned comfortable attire in a bright airy interior with plants and natural textures, golden hour sunlight streaming through large windows creating warm diffused glow, natural skin texture with healthy glow, warm approachable expression, organic atmosphere, editorial quality, timeless natural beauty, shot on 50mm lens with medium depth of field and soft background",
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
