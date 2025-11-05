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
        SELECT gender FROM users WHERE id = ${user.id} LIMIT 1
      `
      if (userDataResult.length > 0 && userDataResult[0].gender) {
        userGender = userDataResult[0].gender
      }

      console.log("[v0] User gender for concept generation:", userGender)

      const conceptPrompt = `Based on the user's request: "${userRequest}"
${aesthetic ? `Aesthetic preference: ${aesthetic}` : ""}
${context ? `Additional context: ${context}` : ""}
${
  referenceImageUrl
    ? `
**🎨 INSPIRATION IMAGE PROVIDED: ${referenceImageUrl}**

**CRITICAL: YOU ARE IN STYLE REPLICATION MODE**

The user has uploaded an inspiration image. Your PRIMARY job is to ANALYZE and REPLICATE its exact aesthetic.

**MANDATORY ANALYSIS - BE EXTREMELY SPECIFIC:**

1. **LIGHTING** (Most Critical):
   - Light source: ${""} (window, studio, golden hour, single dramatic source, overhead, etc.)
   - Light quality: (soft/diffused, harsh/direct, moody/low-key, bright/high-key)
   - Light direction: (front, side 45°, back, top, bottom, Rembrandt)
   - Color temperature: (warm golden, cool blue, neutral, mixed warm/cool)
   - Shadow depth: (deep dramatic, soft subtle, no shadows, high contrast)
   - Example: "dramatic side lighting from single source at 45 degrees creating deep shadows and high contrast, warm golden tones, moody low-key aesthetic"

2. **COLOR PALETTE**:
   - Dominant colors: (be specific: "deep burgundy" not "red", "warm beige" not "tan")
   - Temperature: (warm/golden, cool/blue, neutral/grey, monochrome)
   - Contrast level: (high contrast, low contrast, medium)
   - Saturation: (highly saturated, desaturated/muted, black and white)
   - Example: "monochromatic dark aesthetic with deep blacks, charcoal greys, warm beige leather accents, low saturation, high contrast"

3. **MOOD & ATMOSPHERE**:
   - Emotion: (moody, bright, serene, dramatic, energetic, intimate, mysterious)
   - Vibe: (editorial luxury, casual lifestyle, minimalist, maximalist, artistic, cinematic)
   - Example: "moody, intimate, luxury editorial with dramatic shadows and sophisticated darkness"

4. **COMPOSITION**:
   - Camera angle: (eye-level, high angle looking down, low angle looking up, overhead flatlay, Dutch angle)
   - Framing: (close-up face, medium waist-up, wide environmental, flatlay overhead)
   - Depth of field: (shallow bokeh f/1.4, medium f/2.8, deep focus f/8)
   - Example: "overhead flatlay composition with shallow depth of field f/2.8, hero subject in center with supporting elements arranged artistically"

5. **STYLING & TEXTURES**:
   - Visible materials: (leather, fabric, metal, wood, glass, etc.)
   - Styling approach: (minimal, abundant, curated, organic, luxurious)
   - Prominent textures: (smooth leather, rough concrete, soft fabric, metallic shine)
   - Example: "luxury tech flatlay with buttery leather textures, metallic accents, minimal curated styling, high-end editorial aesthetic"

**YOUR TASK:**
Create ${count} concepts of the USER (not the product/scene) that REPLICATE this exact aesthetic.

**PROMPT WRITING - CRITICAL RULES:**

1. **START with analyzed lighting** - Copy it EXACTLY from your analysis
2. **THEN describe the user** - Use gender-appropriate descriptor
3. **THEN match colors and mood** - Be specific about colors and atmosphere
4. **THEN replicate composition** - Match the framing and angle
5. **END with technical specs** - Match the inspiration's technical qualities

**DO NOT:**
- Use generic "golden hour" or "soft studio light" if inspiration is dark/moody
- Apply bright cheerful lighting to dark moody inspiration
- Use your default templates - REPLICATE THE INSPIRATION
- Describe the inspiration itself - create NEW concepts of the USER in that STYLE

**EXAMPLE FOR DARK MOODY FLATLAY:**
"dramatic side lighting from single source creating deep shadows and high contrast, warm golden tones, moody low-key aesthetic, a woman's hands elegantly positioned holding luxury tech device, deep blacks and charcoal greys with warm beige leather textures, overhead flatlay composition, curated high-end accessories arranged artistically, sophisticated darkness, editorial luxury quality, shot on 50mm f/2.8 with shallow depth of field"
`
    : ""
}

**USER GENDER: ${userGender}**

Generate ${count} unique, creative photo concepts that showcase your fashion and styling expertise.

**CRITICAL: TWO DIFFERENT TEXTS REQUIRED**

1. **DESCRIPTION** (User-Facing):
   - Warm, friendly, simple everyday language
   - Focus on feeling and story, not technical details
   - Examples: "A moody portrait with dramatic shadows" or "A bright lifestyle photo in a modern cafe"

2. **PROMPT** (Technical - For FLUX):
   - This is your creative vision as a master photographer
   - Write it as a flowing, poetic description
   - NO templates, NO hardcoded specs - pure creative freedom
   
**PROMPT STRUCTURE - PURE CREATIVE FREEDOM:**

1. **START with gender**: "${userGender === "woman" || userGender === "female" ? "a woman" : userGender === "man" || userGender === "male" ? "a man" : "a person"}"

2. **YOUR CREATIVE VISION**: Describe the complete scene as you envision it
   - Lighting (be specific and creative)
   - Setting and atmosphere
   - Fashion and styling details
   - Mood and emotion
   - Composition and framing
   - Technical camera details (at the end)

**IMPORTANT**: 
- NO hardcoded templates will override your vision
- Your prompt description is used DIRECTLY
- Be as creative and specific as you want
- Trust your fashion and photography expertise
- The lighting, colors, and mood YOU describe is what will be generated

${referenceImageUrl ? `\n**Include referenceImageUrl in each concept for image-to-image generation**` : ""}

Return ONLY valid JSON array:
{
  "title": "string",
  "description": "string - simple friendly language",
  "category": "Close-Up" | "Half Body" | "Lifestyle" | "Action" | "Environmental",
  "fashionIntelligence": "string",
  "lighting": "string",
  "location": "string",
  "prompt": "string - YOUR complete creative vision, used DIRECTLY without template overrides"${referenceImageUrl ? `,\n  "referenceImageUrl": "${referenceImageUrl}"` : ""}
}`

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

      console.log("[v0] Successfully parsed", concepts.length, "concepts")

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
          textContent = `[User has uploaded an inspiration image: ${inspirationImageUrl}]

**IMPORTANT**: Analyze this image carefully and create concepts that capture its style, mood, composition, and aesthetic. The user wants photos of THEMSELVES that match this inspiration.

${textContent}`
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

**CRITICAL FRAMING GUIDELINES FOR ALL SHOT TYPES:**

**Close-Up**: Head and shoulders, face fills most of frame, intimate connection
**Half Body**: Waist up, subject fills frame vertically, face clearly visible and sharp
**Lifestyle**: Full body or 3/4 body, BUT subject must still fill the frame - NOT shot from far away
**Action**: Dynamic movement, subject prominent in frame, face visible and sharp
**Environmental**: Subject in environment BUT still the clear hero - use "full body portrait in [location]" NOT "wide shot of [location] with small person"

**FACIAL DETAIL IS NON-NEGOTIABLE:**
- In ALL shot types, the subject's face must be large enough in frame to render clearly
- NEVER use phrases like: "shot from far away", "distant figure", "small in frame", "wide environmental shot"
- ALWAYS use phrases like: "full body portrait filling frame", "subject prominent in environment", "environmental portrait with subject as hero"
- Think: "subject IN environment" not "environment WITH subject"

**EXAMPLES OF CORRECT FRAMING:**

❌ WRONG: "wide shot of a person standing in a vast Icelandic landscape, distant figure against mountains"
✅ CORRECT: "full body portrait of a person in dramatic Icelandic landscape, subject fills frame from head to toe, mountains as backdrop, face clearly visible and sharp"

❌ WRONG: "environmental shot showing the entire beach scene with a small figure walking"
✅ CORRECT: "full body portrait of a person walking on beach, subject prominent in frame, ocean and sand as supporting elements, face sharp and expressive"

❌ WRONG: "lifestyle photo in a large modern office, person at desk in background"
✅ CORRECT: "lifestyle portrait of a person at modern desk, shot from medium distance showing full upper body and workspace, face clearly visible, office environment frames the subject"

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
