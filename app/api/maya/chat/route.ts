import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { MAYA_SYSTEM_PROMPT } from "@/lib/maya/personality"
import { MAYA_PRO_SYSTEM_PROMPT } from "@/lib/maya/pro-personality"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
import { createServerClient } from "@/lib/supabase/server"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { checkCredits, deductCredits } from "@/lib/credits"
import { detectStudioProIntent, getStudioProSystemPrompt } from "@/lib/maya/studio-pro-system-prompt"
import { isWorkbenchModeEnabled } from "@/lib/feature-flags"

/**
 * Get workflow-specific guidance for Maya Pro
 */
function getWorkflowGuidance(workflowType: string): string {
  const guidance: Record<string, string> = {
    carousel: `The user wants to create a carousel post. Guide them through:
1. Ask what topic/theme (offer options: Trending tips, Product showcase, Educational content, Personal story, or Custom)
2. Ask how many slides (3-5 recommended)
3. Confirm you'll use their avatar images and brand kit for consistency
4. After they respond, say "Ready to create? This will use 5 credits per slide."
5. When ready, trigger generation with [GENERATE_CAROUSEL: topic, slideCount]`,
    
    'reel-cover': `The user wants to create a reel cover. Guide them through:
1. Ask what the reel is about (title/topic)
2. Ask if they want text overlay (yes/no)
3. If yes, ask for the text content
4. Confirm you'll use their avatar and brand kit
5. When ready, trigger generation with [GENERATE_REEL_COVER: title: {title}, text: {textOverlay or 'none'}]`,
    
    'ugc-product': `The user wants to create a UGC product photo. Guide them through:
1. Ask which product from their brand assets (or if they want to upload one)
2. Ask what vibe/style (casual, professional, lifestyle, etc.)
3. Confirm you'll place the product naturally in the scene
4. When ready, trigger generation with [GENERATE_UGC_PRODUCT: productUrl, vibe]`,
    
    'quote-graphic': `The user wants to create a quote graphic. Guide them through:
1. Ask for the quote text
2. Ask for style preference (minimalist, bold, elegant, etc.)
3. Confirm you'll use their brand colors and fonts
4. When ready, trigger generation with [GENERATE_QUOTE_GRAPHIC: quote, style]`,
    
    'product-mockup': `The user wants to create a product mockup. Guide them through:
1. Ask which product from their brand assets
2. Ask what setting (lifestyle, studio, outdoor, etc.)
3. Confirm you'll place it naturally
4. When ready, trigger generation with [GENERATE_PRODUCT_MOCKUP: productUrl, setting]`,
  }
  
  return guidance[workflowType] || `Guide the user through the "${workflowType}" workflow step-by-step with structured questions.`
}
import { NextResponse } from "next/server"
import type { Request } from "next/server"

export const maxDuration = 60

export async function POST(req: Request) {
  console.log("[v0] Maya chat API called")

  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      console.error("[v0] Authentication failed:", authError?.message || "No user")
      return NextResponse.json({ error: authError?.message || "Unauthorized" }, { status: 401 })
    }

    const userId = authUser.id
    const user = await getEffectiveNeonUser(userId)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const dbUserId = user.id

    console.log("[v0] User authenticated:", { userId, dbUserId })

    const hasCredits = await checkCredits(dbUserId, 1)
    if (!hasCredits) {
      console.log("[v0] User has insufficient credits for Maya chat")
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 })
    }

    const body = await req.json()
    const { messages: uiMessages, chatId } = body

    if (!uiMessages) {
      console.error("[v0] Messages is null or undefined")
      return NextResponse.json({ error: "Messages is required" }, { status: 400 })
    }

    if (!Array.isArray(uiMessages)) {
      console.error("[v0] Messages is not an array:", typeof uiMessages)
      return NextResponse.json({ error: "Messages must be an array" }, { status: 400 })
    }

    if (uiMessages.length === 0) {
      console.error("[v0] Messages array is empty")
      return NextResponse.json({ error: "Messages cannot be empty" }, { status: 400 })
    }

    // CRITICAL: Filter and validate messages before processing
    // Remove any messages with invalid structure (tool calls, malformed content, etc.)
    const validUIMessages = uiMessages.filter((m: any) => {
      if (!m || !m.role) {
        console.log("[v0] ⚠️ Filtering out message with missing role")
        return false
      }
      
      // Only allow user and assistant messages (no system messages from UI)
      if (m.role !== "user" && m.role !== "assistant") {
        console.log("[v0] ⚠️ Filtering out message with invalid role:", m.role)
        return false
      }
      
      // Check for invalid content structures
      if (m.content && Array.isArray(m.content)) {
        // Check for tool-result or tool-call types (not supported in chat)
        const hasInvalidTypes = m.content.some((c: any) => {
          if (!c || !c.type) return false
          // Filter out tool types that aren't properly formatted
          if (c.type === "tool-result" || c.type === "tool-call") {
            // Check if required fields are missing
            if (c.type === "tool-result" && (!c.toolCallId || !c.toolName || !c.output)) {
              return true // Invalid tool-result
            }
            if (c.type === "tool-call" && (!c.toolCallId || !c.toolName)) {
              return true // Invalid tool-call
            }
          }
          return false
        })
        if (hasInvalidTypes) {
          console.log("[v0] ⚠️ Filtering out message with invalid tool types in content:", m.id || "unknown")
          return false
        }
      }
      
      // Check for invalid parts structure
      if (m.parts && Array.isArray(m.parts)) {
        const hasInvalidTypes = m.parts.some((p: any) => {
          if (!p || !p.type) return false
          // Filter out tool types that aren't properly formatted
          if (p.type === "tool-result" || p.type === "tool-call") {
            // Check if required fields are missing
            if (p.type === "tool-result" && (!p.toolCallId || !p.toolName || !p.output)) {
              return true // Invalid tool-result
            }
            if (p.type === "tool-call" && (!p.toolCallId || !p.toolName)) {
              return true // Invalid tool-call
            }
          }
          // Filter out custom tool types that aren't supported by AI SDK
          if (p.type && p.type.startsWith("tool-") && p.type !== "tool-result" && p.type !== "tool-call") {
            // Custom tool types like "tool-generateConcepts" should be filtered out before sending to AI SDK
            return true
          }
          return false
        })
        if (hasInvalidTypes) {
          console.log("[v0] ⚠️ Filtering out message with invalid parts:", m.id || "unknown")
          return false
        }
      }
      
      return true
    })
    
    console.log("[v0] Filtered", uiMessages.length, "UI messages to", validUIMessages.length, "valid messages")

    // Process UI messages to extract inspiration images from text markers (backward compatibility)
    // AND ensure image parts are properly formatted for AI SDK
    const messages: UIMessage[] = validUIMessages.map((m: any) => {
      // Check if message has text content with inspiration image marker
      let textContent = ""
      if (m.parts && Array.isArray(m.parts)) {
        const textParts = m.parts.filter((p: any) => p && p.type === "text")
        textContent = textParts.map((p: any) => p.text || "").join("\n")
      } else if (typeof m.content === "string") {
        textContent = m.content
      }

      // Extract inspiration image URL from text if present
      const inspirationImageMatch = textContent.match(/\[Inspiration Image: (https?:\/\/[^\]]+)\]/)
      if (inspirationImageMatch && m.role === "user") {
        const imageUrl = inspirationImageMatch[1]
        const cleanedText = textContent.replace(/\[Inspiration Image: https?:\/\/[^\]]+\]/g, "").trim()
        
        // Check if image is already in parts
        const hasImageInParts = m.parts && Array.isArray(m.parts) && 
          m.parts.some((p: any) => p && (p.type === "image" || (p.type === "file" && p.mediaType?.startsWith("image/"))))
        
        if (!hasImageInParts) {
          // Add image to parts array
          const newParts = []
          if (cleanedText) {
            newParts.push({ type: "text", text: cleanedText })
          }
          newParts.push({ type: "image", image: imageUrl })
          
          console.log("[v0] ✅ Extracted inspiration image from text marker:", imageUrl.substring(0, 100) + "...")
          return { ...m, parts: newParts }
        }
      }
      
      // CRITICAL FIX: Ensure image parts have the correct format for AI SDK
      // Sometimes image parts might have different property names
      if (m.parts && Array.isArray(m.parts) && m.role === "user") {
        const normalizedParts = m.parts
          .filter((p: any) => {
            // Filter out invalid part types
            if (!p || !p.type) return false
            // Filter out tool types (not supported in chat messages sent to AI SDK)
            if (p.type === "tool-result" || p.type === "tool-call" || (p.type && p.type.startsWith("tool-"))) {
              console.log("[v0] ⚠️ Filtering out tool part type:", p.type)
              return false
            }
            // Only allow text and image parts
            if (p.type !== "text" && p.type !== "image" && p.type !== "file") {
              console.log("[v0] ⚠️ Filtering out unsupported part type:", p.type)
              return false
            }
            return true
          })
          .map((p: any) => {
            if (p && p.type === "image") {
              // Ensure image URL is in the 'image' property
              const imageUrl = p.image || p.url || p.src || p.data
              if (imageUrl) {
                console.log("[v0] ✅ Normalizing image part with URL:", imageUrl.substring(0, 100) + "...")
                return { type: "image", image: imageUrl }
              }
            }
            // Ensure text parts have required properties
            if (p && p.type === "text") {
              return { type: "text", text: p.text || "" }
            }
            return p
          })
        
        // Only return modified message if parts were actually changed
        const partsChanged = normalizedParts.some((np: any, idx: number) => {
          const original = m.parts[idx]
          return np !== original && np.type === "image"
        })
        
        if (partsChanged) {
          return { ...m, parts: normalizedParts }
        }
      }
      
      return m
    })

    const conversationSummary = uiMessages
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant"))
      .slice(-10) // Last 10 messages for context
      .map((m: any) => {
        const role = m.role === "user" ? "User" : "Maya"
        let content = ""

        // Extract text content from parts or content field
        if (m.parts && Array.isArray(m.parts)) {
          const textParts = m.parts.filter((p: any) => p.type === "text")
          content = textParts
            .map((p: any) => p.text)
            .join(" ")
            .substring(0, 200)
        } else if (typeof m.content === "string") {
          content = m.content.substring(0, 200)
        } else if (Array.isArray(m.content)) {
          // Handle array format (text + image)
          const textParts = m.content.filter((p: any) => p.type === "text")
          content = textParts
            .map((p: any) => p.text || "")
            .join(" ")
            .substring(0, 200)
        }

        // Strip trigger text and inspiration image markers from content
        content = content.replace(/\[GENERATE_CONCEPTS\][^\n]*/g, "").trim()
        content = content.replace(/\[Inspiration Image: https?:\/\/[^\]]+\]/g, "").trim()

        return content ? `${role}: ${content}${content.length >= 200 ? "..." : ""}` : null
      })
      .filter(Boolean)
      .join("\n")

    console.log("[v0] Conversation summary length:", conversationSummary.length)

    // Convert UI messages to model messages using AI SDK's convertToModelMessages
    // This properly handles images, text, and other content types
    let modelMessages = convertToModelMessages(messages)
    
    console.log("[v0] Converted", messages.length, "UI messages to", modelMessages.length, "model messages")
    
    // CRITICAL: Validate and filter model messages to ensure they're in correct format
    modelMessages = modelMessages.filter((m: any) => {
      if (!m || !m.role) {
        console.log("[v0] ⚠️ Filtering out model message with missing role")
        return false
      }
      
      // Validate content structure
      if (m.content) {
        if (Array.isArray(m.content)) {
          // Check for invalid content types
          const hasInvalidTypes = m.content.some((c: any) => {
            if (!c || !c.type) return true
            // Only allow text, image, file types
            if (c.type !== "text" && c.type !== "image" && c.type !== "file") {
              console.log("[v0] ⚠️ Filtering out model message with invalid content type:", c.type)
              return true
            }
            // Validate text parts have text property
            if (c.type === "text" && typeof c.text !== "string") {
              console.log("[v0] ⚠️ Filtering out model message with invalid text part")
              return true
            }
            return false
          })
          if (hasInvalidTypes) return false
        } else if (typeof m.content !== "string") {
          console.log("[v0] ⚠️ Filtering out model message with invalid content type:", typeof m.content)
          return false
        }
      }
      
      return true
    })
    
    console.log("[v0] Validated", modelMessages.length, "valid model messages")
    
    // Log if any messages contain images (BEFORE conversion)
    messages.forEach((m, idx) => {
      if (m.parts && Array.isArray(m.parts)) {
        const imageParts = m.parts.filter((p: any) => p && (p.type === "image" || (p.type === "file" && p.mediaType?.startsWith("image/"))))
        if (imageParts.length > 0) {
          console.log("[v0] ✅ UI Message", idx, "contains", imageParts.length, "image(s)")
          imageParts.forEach((imgPart: any, imgIdx: number) => {
            const imgUrl = imgPart.image || imgPart.url || imgPart.src
            console.log("[v0]   - Image", imgIdx, "URL:", imgUrl?.substring(0, 100) + "...")
          })
        }
      }
    })
    
    // CRITICAL FIX: Manually ensure images are included in model messages
    // Sometimes convertToModelMessages might not properly handle image parts
    modelMessages = modelMessages.map((modelMsg: any, msgIdx: number) => {
      const originalUIMessage = messages[msgIdx]
      
      // Check if original UI message has image parts
      if (originalUIMessage && originalUIMessage.parts && Array.isArray(originalUIMessage.parts)) {
        const imageParts = originalUIMessage.parts.filter((p: any) => p && p.type === "image")
        
        if (imageParts.length > 0) {
          // Check if model message already has these images
          const hasImagesInModel = modelMsg.content && Array.isArray(modelMsg.content) && 
            modelMsg.content.some((c: any) => c && c.type === "image")
          
          if (!hasImagesInModel) {
            console.log("[v0] ⚠️ Model message missing images - manually adding them")
            
            // Build content array with text + images
            const contentParts: any[] = []
            
            // Add text content if it exists
            if (modelMsg.content) {
              if (typeof modelMsg.content === "string") {
                contentParts.push({ type: "text", text: modelMsg.content })
              } else if (Array.isArray(modelMsg.content)) {
                // Add existing content parts (text, etc.) - filter out invalid types
                modelMsg.content.forEach((c: any) => {
                  if (c && c.type && c.type !== "image" && c.type !== "tool-result" && c.type !== "tool-call") {
                    // Ensure text parts have required properties
                    if (c.type === "text" && c.text) {
                      contentParts.push({ type: "text", text: c.text })
                    } else if (c.type !== "text") {
                      contentParts.push(c)
                    }
                  }
                })
              }
            }
            
            // Add image parts
            imageParts.forEach((imgPart: any) => {
              const imageUrl = imgPart.image || imgPart.url || imgPart.src
              if (imageUrl) {
                contentParts.push({ type: "image", image: imageUrl })
                console.log("[v0] ✅ Manually added image to model message:", imageUrl.substring(0, 100) + "...")
              }
            })
            
            return {
              ...modelMsg,
              content: contentParts.length > 0 ? contentParts : modelMsg.content,
            }
          }
        }
      }
      
      return modelMsg
    })
    
    // Log if any MODEL messages contain images (AFTER manual fix)
    modelMessages.forEach((m: any, idx: number) => {
      if (m.content && Array.isArray(m.content)) {
        const imageContent = m.content.filter((c: any) => c && c.type === "image")
        if (imageContent.length > 0) {
          console.log("[v0] ✅ Model Message", idx, "contains", imageContent.length, "image(s) - WILL BE SENT TO CLAUDE")
          imageContent.forEach((imgContent: any, imgIdx: number) => {
            const imgUrl = imgContent.image || imgContent.url || imgContent.src
            console.log("[v0]   - Image", imgIdx, "URL:", imgUrl?.substring(0, 100) + "...")
          })
        } else {
          // Check if it's a string content (no images)
          if (typeof m.content === "string") {
            console.log("[v0] ⚠️ Model Message", idx, "has string content (no images)")
          }
        }
      } else if (typeof m.content === "string") {
        console.log("[v0] ⚠️ Model Message", idx, "has string content only (no images)")
      }
    })

    if (modelMessages.length === 0) {
      console.error("[v0] No valid messages after filtering")
      return NextResponse.json({ error: "No valid messages to process" }, { status: 400 })
    }

    const supabase = await createServerClient()

    console.log(
      "[v0] Maya chat API called with",
      modelMessages.length,
      "model messages (from",
      messages.length,
      "UI messages), chatId:",
      chatId,
    )
    console.log("[v0] User:", user.email, "ID:", user.id)

    // Get user context for personalization (uses effective user ID for impersonation support)
    const userContext = await getUserContextForMaya(userId)

    let userGender = "person"
    try {
      const { neon } = await import("@neondatabase/serverless")
      const sql = neon(process.env.DATABASE_URL!)
      const genderResult = await sql`SELECT gender FROM users WHERE id = ${dbUserId} LIMIT 1`
      if (genderResult.length > 0 && genderResult[0].gender) {
        const dbGender = genderResult[0].gender.toLowerCase().trim()
        if (dbGender === "woman" || dbGender === "female") {
          userGender = "woman"
        } else if (dbGender === "man" || dbGender === "male") {
          userGender = "man"
        }
      }
    } catch (e) {
      console.error("[v0] Error fetching gender:", e)
    }

    // DETECT Studio Pro intent from last user message
    const lastUserMessage = uiMessages
      .filter((m: any) => m.role === "user")
      .slice(-1)[0]
    const lastMessageText = lastUserMessage?.content || 
      (lastUserMessage?.parts?.find((p: any) => p.type === "text")?.text || "")
    
    // Detect workflow start: [WORKFLOW_START: carousel]
    const workflowStartMatch = lastMessageText?.match(/\[WORKFLOW_START:\s*(\w+)\]/i)
    const activeWorkflow = workflowStartMatch ? workflowStartMatch[1].toLowerCase() : null
    
    const studioProIntent = detectStudioProIntent(lastMessageText)
    const studioProHeader = req.headers.get("x-studio-pro-mode")
    // CLASSIC MODE SAFETY: Validate header is explicitly "true", not just truthy
    const hasStudioProHeader = studioProHeader === "true"
    
    // CLASSIC MODE SAFETY: Log mode detection for debugging
    console.log("[STUDIO-PRO] Intent detection:", {
      isStudioPro: studioProIntent.isStudioPro || hasStudioProHeader || !!activeWorkflow,
      mode: studioProIntent.mode,
      workflow: activeWorkflow,
      confidence: studioProIntent.confidence,
      headerValue: studioProHeader,
      headerValid: hasStudioProHeader,
    })

    // Use Maya Pro personality if in Studio Pro mode OR if workflow is active, otherwise use standard Maya
    const isStudioProMode = studioProIntent.isStudioPro || hasStudioProHeader || !!activeWorkflow
    const isWorkbenchMode = isWorkbenchModeEnabled() && hasStudioProHeader && !activeWorkflow
    let systemPrompt = isStudioProMode ? MAYA_PRO_SYSTEM_PROMPT : MAYA_SYSTEM_PROMPT
    
    // Add workbench mode guidance if workbench is enabled
    if (isWorkbenchMode) {
      const workbenchGuidance = getStudioProSystemPrompt(userContext || '', userGender || 'person', true)
      // Extract just the workbench section from the full prompt
      const workbenchSection = workbenchGuidance.split('## 🛠️ WORKBENCH MODE')[1] || ''
      if (workbenchSection) {
        systemPrompt += `\n\n## 🛠️ WORKBENCH MODE - NEW SIMPLIFIED UX${workbenchSection.split('---')[0]}`
      }
    }
    
    // Add workflow context if workflow is starting
    if (activeWorkflow) {
      const workflowGuidance = getWorkflowGuidance(activeWorkflow)
      systemPrompt += `\n\n## ACTIVE WORKFLOW: ${activeWorkflow.toUpperCase()}\n${workflowGuidance}`
    }

    // Add user context to system prompt
    // Studio Pro mode: Add to Pro personality (which doesn't include it by default)
    // Classic mode: Add to standard personality (which also doesn't include it by default)
    if (userContext) {
      systemPrompt += `\n\n## USER CONTEXT\n${userContext}`
    }

    if (conversationSummary && conversationSummary.length > 0) {
      systemPrompt += `\n\n## RECENT CONVERSATION HISTORY
You have been having an ongoing conversation with this user. Here's a summary of the recent exchange:

${conversationSummary}

**IMPORTANT:** 
- Reference previous topics naturally in your responses
- Remember what concepts you've already created together
- Build upon ideas you've discussed
- If the user mentions "that" or "it", refer to the context above to understand what they mean
- Maintain continuity in your creative direction`
    }

    const genderSpecificExamples =
      userGender === "woman"
        ? `
**MAYA'S SIGNATURE VOICE - STYLING FOR WOMEN:**

User: "I want something confident and elegant"
Maya: "YES I love this energy! ✨ Let me create some powerful looks that feel totally you...

[GENERATE_CONCEPTS] elegant confident editorial power feminine"

User: "Something cozy for fall content"
Maya: "Fall vibes are my favorite! 🍂 I'm already seeing warm colors, cozy textures, that golden light. Let me put together some ideas...

[GENERATE_CONCEPTS] cozy autumn luxe warmth feminine"
`
        : userGender === "man"
          ? `
**MAYA'S SIGNATURE VOICE - STYLING FOR MEN:**

User: "I want something confident and powerful"
Maya: "Love this! 🔥 Let me pull together some looks that capture that strong, confident vibe...

[GENERATE_CONCEPTS] powerful confident masculine editorial"

User: "Something relaxed but still stylish"
Maya: "Perfect! 🙌 I'm thinking elevated casual - looks good but feels effortless. Let me create some ideas...

[GENERATE_CONCEPTS] relaxed masculine elevated casual"
`
          : `
**MAYA'S SIGNATURE VOICE:**

User: "I want something confident and elegant"
Maya: "Love this energy! ✨ Let me create some powerful looks for you...

[GENERATE_CONCEPTS] elegant confident editorial power"
`

    // Add concept generation instructions for both Classic and Studio Pro modes
    // In Studio Pro mode, concept cards are the primary way to create content
    systemPrompt += `\n\n## CONCEPT GENERATION TRIGGER
When the user wants to create visual concepts, photoshoot ideas, or asks you to generate content:

1. First, respond AS MAYA with your signature warmth, fashion vocabulary, and creative vision
2. Paint a vivid picture using sensory language - describe what you're seeing in your mind's eye
3. Include fashion-specific details (fabrics, silhouettes, styling choices) APPROPRIATE FOR THE USER'S GENDER
4. Then include the trigger on its own line: [GENERATE_CONCEPTS] followed by 2-6 essence words

${genderSpecificExamples}

**VOICE RULES FOR CONCEPT GENERATION ONLY:**
- When generating concept cards: Keep responses SHORT (2-3 sentences), warm, and get to the trigger quickly
- Use simple everyday language when describing the concept direction
- Keep your emojis and enthusiasm!

**FOR ALL OTHER CONVERSATIONS (Captions, Strategies, Advice, Life Talks):**
- Give FULL, DETAILED, and HELPFUL responses
- Use your built-in web search to research current Instagram best practices, caption formulas, storytelling techniques
- Share specific frameworks, examples, and actionable strategies
- Be thorough and insightful - this is where you shine!
- For captions: Research viral hooks, proven formulas, emotional storytelling patterns
- For strategy: Look up current trends, algorithm insights, growth tactics
- Paint the full picture with your expertise

**CRITICAL:**
- SHORT responses = Only when creating concept cards
- DETAILED responses = Everything else (captions, strategy, life advice, questions)
- ALWAYS use web search for Instagram strategy, captions, and best practices
- Sound like their excited friend AND their smart strategist

${isStudioProMode ? `\n\n## 🎨 STUDIO PRO MODE - CONCEPT CARDS
**IMPORTANT:** In Studio Pro mode, you ALWAYS use [GENERATE_CONCEPTS] to create concept cards, NOT [GENERATE_PROMPTS].

**Concept cards in Studio Pro mode:**
- Users can add their own reference images directly to each concept card
- Users can view and edit the prompts Maya generates
- Each concept card generates using Nano Banana Pro (professional quality)
- Concept cards are the primary way to create content in Studio Pro mode

**When user asks for content:**
1. Respond warmly and creatively (2-3 sentences)
2. Use [GENERATE_CONCEPTS] trigger with 2-6 essence words
3. Concept cards will appear with image selection and prompt editing features

**Example:**
User: "I want something confident and elegant"
You: "YES I love this energy! ✨ Let me create some powerful looks that feel totally you...

[GENERATE_CONCEPTS] elegant confident editorial power feminine"

**DO NOT use [GENERATE_PROMPTS] in Studio Pro mode - that's only for workbench mode.**` : ''}`

    let result
    try {
      result = streamText({
        model: "anthropic/claude-sonnet-4-20250514",
        system: systemPrompt,
        messages: modelMessages,
      })
    } catch (streamError) {
      console.error("[v0] Error in streamText call:", streamError)
      throw streamError // Re-throw to be caught by outer catch block
    }

    // Save chat to database if we have a chatId
    if (chatId && supabase) {
      try {
        const lastUserMessage = uiMessages.filter((m: { role: string }) => m.role === "user").pop()
        if (lastUserMessage) {
          // Extract text content for title
          let titleText = ""
          if (lastUserMessage.parts && Array.isArray(lastUserMessage.parts)) {
            const textParts = lastUserMessage.parts.filter((p: any) => p && p.type === "text")
            titleText = textParts.map((p: any) => p.text || "").join(" ")
          } else if (typeof lastUserMessage.content === "string") {
            titleText = lastUserMessage.content
          }
          // Remove inspiration image marker from title
          titleText = titleText.replace(/\[Inspiration Image: https?:\/\/[^\]]+\]/g, "").trim()
          
          await supabase.from("maya_chats").upsert(
            {
              id: chatId,
              user_id: dbUserId,
              title: titleText.slice(0, 50) + (titleText.length > 50 ? "..." : ""),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" },
          )
        }
      } catch (dbError) {
        console.error("[v0] Error saving chat:", dbError)
      }
    }

    // Wrapped in try/catch to avoid breaking the stream if deduction fails
    try {
      await deductCredits(
        dbUserId,
        1,
        "image", // Using "image" type as "maya_chat" is not in the enum
        "Maya conversation",
      )
      console.log("[v0] Successfully deducted 1 credit for Maya chat")
    } catch (deductError) {
      console.error("[v0] Failed to deduct credits for Maya chat (non-fatal):", deductError)
    }

    return result.toUIMessageStreamResponse()
  } catch (error) {
    // Log detailed error information
    let errorMessage = "Failed to process chat"
    let errorDetails: any = {}
    
    if (error instanceof Error) {
      errorMessage = error.message
      errorDetails = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      }
    } else if (error && typeof error === "object") {
      errorDetails = error
      errorMessage = (error as any).message || (error as any).error || errorMessage
    } else {
      errorMessage = String(error)
      errorDetails = { raw: error }
    }
    
    console.error("[v0] Maya chat error:", {
      error: errorMessage,
      details: errorDetails,
      timestamp: new Date().toISOString(),
    })
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? errorDetails : undefined,
      }, 
      { status: 500 }
    )
  }
}
