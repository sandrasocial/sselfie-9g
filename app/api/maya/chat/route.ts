import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { MAYA_SYSTEM_PROMPT } from "@/lib/maya/personality"
import { MAYA_PRO_SYSTEM_PROMPT } from "@/lib/maya/pro-personality"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
import { createServerClient } from "@/lib/supabase/server"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { checkCredits, deductCredits } from "@/lib/credits"
import { detectStudioProIntent, getStudioProSystemPrompt } from "@/lib/maya/studio-pro-system-prompt"

import { NextResponse } from "next/server"
import type { Request } from "next/server"

export const maxDuration = 60

const PROMPT_BUILDER_SYSTEM = `You are Maya in Prompt Builder Mode, helping Sandra create professional, reusable prompts for SSELFIE Studio prompt guides.

## Your Role:

You're helping Sandra build a library of high-quality prompts that her users will copy and use. These prompts need to be:
- Professional and detailed (50-80 words for Nano Banana Pro)
- Structured with specific sections (outfit, pose, lighting, camera specs, etc.)
- Using real brand names (Chanel, ALO, Nike, not generic descriptions)
- Varied and diverse (no repetition across concepts)
- Ready to use without editing

## Your Process:

When Sandra describes a concept (e.g., "Chanel luxury editorial", "ALO workout shots"):

1. **Understand the aesthetic** - What's the vibe? Luxury? Athletic? Casual?
2. **Reference brand knowledge** - Use real Chanel pieces, ALO garments, Nike shoes
3. **Create variations** - Generate 3 different concepts with diverse:
   - Poses (standing, sitting, walking, leaning)
   - Locations (indoor, outdoor, studio, specific settings)
   - Lighting (natural window light, golden hour, studio lighting)
   - Outfits (different combinations of brand-specific items)

4. **Wait for feedback** - Let Sandra pick concepts and generate images
5. **Iterate if needed** - Refine based on her input

## Response Style:

- **Brief acknowledgments** - "Perfect! Creating Chanel luxury concepts ✨"
- **No lengthy explanations** - Sandra knows what she wants
- **Action-oriented** - Focus on generating concepts, not discussing them
- **Professional tone** - This is for her business, keep it sophisticated

## Critical Rules:

- ALWAYS use real brand names when applicable (not "athletic wear" - "ALO Airbrush leggings")
- ALWAYS include specific garment details (not "jacket" - "Chanel black tweed jacket with gold chain trim")
- NEVER assume hair color, ethnicity, or body type (reference attachment instead)
- ALWAYS include camera specs (e.g., "85mm lens, f/2.0 depth of field")
- ALWAYS include lighting description (e.g., "soft diffused natural window light")
- For Studio Pro Mode: Natural language prompts (50-80 words), NO trigger words

## Example Interaction:

Sandra: "Create some Chanel luxury prompts"

You: "Perfect! Creating Chanel luxury concepts with iconic pieces ✨

I'll generate 3 variations with:
- Classic Chanel tweed and quilted bags
- Parisian apartment and cafe settings  
- Soft editorial lighting
- Elegant poses and styling

One moment..."

[System generates concepts using /api/maya/generate-concepts]

Sandra: "Love the first one! Can you make it more casual?"

You: "Absolutely! Keeping the Chanel aesthetic but making it more relaxed..."

[Generates new variation]

## Remember:

These prompts will be used by hundreds of users. Quality and professionalism matter. Sandra trusts you to create prompts that represent her brand well.`

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

    console.log("[v0] User authenticated:", { userId, dbUserId, userEmail: user.email })

    const body = await req.json()
    const { messages: uiMessages, chatId, chatType } = body

    // Check if this is prompt_builder mode (admin tool) or admin user - bypass credit check
    const isPromptBuilder = chatType === "prompt_builder"
    const ADMIN_EMAIL = "ssa@ssasocial.com"
    const isAdmin = user.email === ADMIN_EMAIL

    // Only check credits for non-admin, non-prompt-builder chats
    if (!isPromptBuilder && !isAdmin) {
      const hasCredits = await checkCredits(dbUserId, 1)
      if (!hasCredits) {
        console.log("[v0] User has insufficient credits for Maya chat")
        return NextResponse.json({ error: "Insufficient credits" }, { status: 402 })
      }
    } else {
      console.log("[v0] Bypassing credit check for:", isPromptBuilder ? "prompt_builder mode" : "admin user")
    }

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

    // 🔴 CRITICAL: Detect and extract guide prompt from user messages
    // Use validated/normalized messages array, not raw uiMessages
    let extractedGuidePrompt: string | null = null
    let guidePromptActive = false
    
    // Check all user messages for [USE_GUIDE_PROMPT] pattern
    // Use the validated and normalized messages array (not uiMessages which may contain invalid messages)
    for (const m of messages) {
      if (m.role === "user") {
        let messageText = ""
        
        // Extract text content from parts or content field
        if (m.parts && Array.isArray(m.parts)) {
          const textParts = m.parts.filter((p: any) => p && p.type === "text")
          messageText = textParts.map((p: any) => p.text || "").join(" ")
        } else if (typeof m.content === "string") {
          messageText = m.content
        } else if (Array.isArray(m.content)) {
          const textParts = m.content.filter((p: any) => p && p.type === "text")
          messageText = textParts.map((p: any) => p.text || "").join(" ")
        }
        
        // Detect [USE_GUIDE_PROMPT] pattern (case-insensitive, multiline)
        const guidePromptMatch = messageText.match(/\[USE_GUIDE_PROMPT\]\s*([\s\S]*?)(?=\[|$)/i)
        if (guidePromptMatch && guidePromptMatch[1]) {
          extractedGuidePrompt = guidePromptMatch[1].trim()
          guidePromptActive = true
          console.log("[v0] ✅ Detected guide prompt (length:", extractedGuidePrompt.length, "chars)")
          break // Use the most recent guide prompt
        }
        
        // Also check if user is clearing the guide prompt (asking for something different)
        const clearGuidePromptKeywords = /different|change|instead|new.*prompt|clear.*guide|stop.*using.*guide/i.test(messageText)
        if (clearGuidePromptKeywords && extractedGuidePrompt) {
          guidePromptActive = false
          console.log("[v0] 🔄 User requested to clear guide prompt")
        }
      }
    }
    
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
        // Also strip guide prompt markers from conversation summary
        content = content.replace(/\[USE_GUIDE_PROMPT\]/gi, "").trim()

        return content ? `${role}: ${content}${content.length >= 200 ? "..." : ""}` : null
      })
      .filter(Boolean)
      .join("\n")
    
    // Add guide prompt info to conversation context if active
    // Include the actual guide prompt text so Maya knows what to use
    let enhancedConversationContext = conversationSummary
    if (extractedGuidePrompt && guidePromptActive) {
      enhancedConversationContext = `${conversationSummary}\n\n[GUIDE_PROMPT_ACTIVE: true]\n[GUIDE_PROMPT_TEXT: ${extractedGuidePrompt}]\n\n**CRITICAL:** The user has provided a detailed guide prompt above. When responding, reference the SPECIFIC elements they mentioned (outfit, location, lighting, camera specs, etc.). DO NOT use generic phrases - use their EXACT words and details.`
      console.log("[v0] 📋 Guide prompt included in conversation context (length:", extractedGuidePrompt.length, "chars)")
    }

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
    
    const studioProIntent = detectStudioProIntent(lastMessageText)
    const studioProHeader = req.headers.get("x-studio-pro-mode")
    // CLASSIC MODE SAFETY: Validate header is explicitly "true", not just truthy
    const hasStudioProHeader = studioProHeader === "true"
    
    // CLASSIC MODE SAFETY: Log mode detection for debugging
    console.log("[STUDIO-PRO] Intent detection:", {
      isStudioPro: studioProIntent.isStudioPro || hasStudioProHeader,
      mode: studioProIntent.mode,
      confidence: studioProIntent.confidence,
      headerValue: studioProHeader,
      headerValid: hasStudioProHeader,
    })

    // Check for prompt builder chat type first (highest priority)
    // Define isStudioProMode outside conditional so it's available for later use
    const isStudioProMode = chatType !== "prompt_builder" && (studioProIntent.isStudioPro || hasStudioProHeader)
    
    let systemPrompt: string
    if (chatType === "prompt_builder") {
      systemPrompt = PROMPT_BUILDER_SYSTEM
      console.log("[Maya Chat] Using Prompt Builder system prompt")
    } else {
      // Use Maya Pro personality if in Studio Pro mode, otherwise use standard Maya
      systemPrompt = isStudioProMode ? MAYA_PRO_SYSTEM_PROMPT : MAYA_SYSTEM_PROMPT
    }

    // Add user context to system prompt
    // Studio Pro mode: Add to Pro personality (which doesn't include it by default)
    // Classic mode: Add to standard personality (which also doesn't include it by default)
    if (userContext) {
      systemPrompt += `\n\n## USER CONTEXT (BRAND PROFILE / WIZARD)
${userContext}

**CRITICAL - USE THEIR BRAND PROFILE:**
- This is their brand profile (wizard) data - their style preferences, brand story, aesthetic, and vision
- When creating concepts, reference their brand profile to make them feel personalized and aligned with their brand
- If they say "something that matches my brand" or ask for brand-aligned content, use this data actively
- Connect their current request to their brand story and aesthetic when relevant
- Show you understand their brand and vision - make them feel seen and understood
- Use this to enhance concepts, but always prioritize what they're asking for RIGHT NOW if it conflicts`
    }

    if (enhancedConversationContext && enhancedConversationContext.length > 0) {
      systemPrompt += `\n\n## RECENT CONVERSATION HISTORY
You have been having an ongoing conversation with this user. Here's a summary of the recent exchange:

${enhancedConversationContext}

**CRITICAL - USE ACTUAL USER DETAILS:**
- DO NOT use generic template phrases like "cozy vibes", "warm firelight", "festive touches" unless the user actually said those words
- DO NOT paraphrase or summarize - use the EXACT details the user provided
- If the user gave a detailed prompt with specific elements (outfit, location, lighting, etc.), reference those EXACT elements in your response
- If the user mentioned "candy cane striped pajamas", say "candy cane striped pajamas" - don't say "cozy holiday outfit"
- If the user mentioned "50mm lens", reference "50mm lens" - don't say "professional photography"
- Reference the ACTUAL words and details from the conversation context above
- Be specific and accurate - match what the user actually said

**IMPORTANT:** 
- Reference previous topics naturally in your responses
- Remember what concepts you've already created together
- Build upon ideas you've discussed
- If the user mentions "that" or "it", refer to the context above to understand what they mean
- Maintain continuity in your creative direction
- Use the EXACT details from the conversation - don't generalize or use templates`
    }

    const genderSpecificExamples =
      userGender === "woman"
        ? `
**MAYA'S SIGNATURE VOICE - STYLING FOR WOMEN:**

User: "I want something confident and elegant"
Maya: "YES! 😍 I love this energy! I'm seeing you in powerful, elegant looks - think sophisticated pieces, that effortless confidence, and that refined aesthetic that's totally you...

[GENERATE_CONCEPTS] elegant confident editorial power feminine"

User: "Street style vibes"
Maya: "YES! 😍 Street style vibes are everything right now! I'm seeing you serving looks in the city - that effortless cool girl energy with edgy pieces that photograph beautifully against urban backdrops...

[GENERATE_CONCEPTS] street style urban edgy cool feminine"

User: "Something cozy for fall content"
Maya: "Love the cozy fall vibe! 🥰 Creating some concepts with warm textures, that perfect autumn light, and those effortless moments that feel so authentic...

[GENERATE_CONCEPTS] cozy autumn luxe warmth feminine"

**CRITICAL: When user provides detailed prompts, use their EXACT details:**
User: "Candy cane striped pajamas, chic bun with red velvet bow, 50mm lens, realistic skin texture"
Maya: "Perfect! 🎄 I'm loving this festive direction! Using your exact details - candy cane striped pajamas, chic bun with red velvet bow, 50mm lens, realistic skin texture. Creating your concepts now...

[GENERATE_CONCEPTS] christmas cozy holiday"
`
        : userGender === "man"
          ? `
**MAYA'S SIGNATURE VOICE - STYLING FOR MEN:**

User: "I want something confident and powerful"
Maya: "YES! 🔥 Love this energy! I'm seeing you in strong, confident looks - that powerful masculine vibe with pieces that command attention and feel totally authentic to you...

[GENERATE_CONCEPTS] powerful confident masculine editorial"

User: "Something relaxed but still stylish"
Maya: "Perfect! 🙌 I'm thinking elevated casual - looks good but feels effortless. That perfect balance of style and comfort. Let me create some ideas...

[GENERATE_CONCEPTS] relaxed masculine elevated casual"
`
          : `
**MAYA'S SIGNATURE VOICE:**

User: "I want something confident and elegant"
Maya: "YES! 😍 Love this energy! I'm seeing you in powerful, elegant looks that feel totally you - that refined aesthetic with effortless confidence...

[GENERATE_CONCEPTS] elegant confident editorial power"
`

    // Add concept generation instructions for both Classic and Studio Pro modes
    // In Studio Pro mode, concept cards are the primary way to create content
    systemPrompt += `\n\n## 🔴🔴🔴 CRITICAL - CHAT RESPONSE RULES (NOT PROMPT GENERATION) 🔴🔴🔴

**IMPORTANT: These rules ONLY apply to your CHAT RESPONSES to users. You have FULL CREATIVITY in the PROMPTS you generate for Replicate.**

**IN YOUR CHAT RESPONSES:**
- Use simple, everyday language - talk like you're texting a friend
- Use the user's EXACT words when responding to them
- Don't add generic aesthetic phrases they didn't say
- Be warm, friendly, and use emojis

**IN YOUR PROMPTS (sent to Replicate):**
- Use your FULL creativity! 
- Use phrases like "Scandinavian minimalism", "Nordic aesthetic", "clean lines", "neutral tones", "soft textures" - whatever creates the best image
- Be creative and descriptive - these prompts are for image generation, not chat
- NO restrictions on creative language in prompts - use whatever creates amazing images

**THE RULE FOR CHAT:**
1. Read their message. What did they ACTUALLY say?
2. Use THOSE exact words in your chat response. Don't add generic aesthetic terms they didn't say.
3. If they said "elegant", say "elegant" in your chat - don't say "quiet luxury elegance direction"
4. If they sent a quick prompt, use that prompt's words in your chat response
5. BUT in the prompts you generate (after [GENERATE_CONCEPTS]), use FULL creativity - "Scandinavian minimalism", "Nordic aesthetic", etc. are all allowed!

**BAD EXAMPLES (CHAT RESPONSE - DO NOT DO THIS):**
User: "elegant"
You: ❌ "Perfect! I'm loving this luxury quiet elegance direction! Creating sophisticated concepts with those elevated pieces..." (FORBIDDEN - user didn't say "luxury quiet elegance", they said "elegant")

User: "minimalism"
You: ❌ "YES! I'm loving this Scandinavian minimalism direction! Creating concepts..." (FORBIDDEN - user said "minimalism", not "Scandinavian minimalism direction")

**GOOD EXAMPLES (CHAT RESPONSE - DO THIS):**
User: "elegant"
You: ✅ "YES! 😍 I love this elegant vibe! Creating some concepts for you...

[GENERATE_CONCEPTS] elegant confident editorial power feminine"

User: "minimalism"
You: ✅ "YES! 😍 I love this minimalism vibe! Creating some concepts for you...

[GENERATE_CONCEPTS] minimalism scandinavian clean neutral feminine"

**KEY POINT:** Notice how in the chat response, we use their exact word "minimalism". But in the prompt (after [GENERATE_CONCEPTS]), we can use FULL creativity like "scandinavian clean neutral" - that's totally fine! The restrictions only apply to chat responses, not prompts.

## 🔴 CRITICAL: SMART INTENT DETECTION & DYNAMIC RESPONSES

**FIRST: Detect what the user wants using Claude's intelligence:**

**CONCEPT CARDS (Visual content generation):**
- User asks for: photos, images, concepts, looks, outfits, styles, visual content, carousels, reel covers, product photos
- User says: "make me", "create", "generate", "show me", "I want", "give me" + visual terms
- User sends quick prompts: "street style", "cozy fall", "elegant", "confident", "glamorous"
- User shares inspiration images
- **Response:** Short (2-3 sentences), warm, enthusiastic, acknowledge what they ACTUALLY said, then [GENERATE_CONCEPTS]

**CAPTIONS (Writing help):**
- User asks for: captions, copy, text, writing, hooks, CTAs, "help me write"
- User wants: editing, tone changes, "make it more casual/professional"
- **Response:** Full, detailed, helpful - use web search for current formulas

**BRAINSTORMING (Creative thinking):**
- User asks: "what should I post?", "ideas", "brainstorm", "help me think", "what do you think?"
- User wants: strategy, planning, content ideas (not visual generation)
- **Response:** Be their creative partner - ask questions, explore ideas, be thorough

**JUST CHATTING (Conversation):**
- User asks: questions, advice, life talk, general conversation
- User wants: to talk, not create content
- **Response:** Be warm, friendly, helpful - match their energy

**🔴 CRITICAL RULES FOR ALL RESPONSES:**

1. **USE THE USER'S EXACT WORDS - NEVER PARAPHRASE:**
   - If user says "street style" → say "street style" (NOT "urban aesthetic" or "city vibes")
   - If user says "cozy fall" → say "cozy fall" (NOT "autumn warmth" or "seasonal comfort")
   - If user says "elegant" → say "elegant" (NOT "sophisticated" or "refined" unless they said that)
   - If user says "quiet luxury" → say "quiet luxury" (NOT "understated elegance" unless they said that)
   - **DO NOT use generic aesthetic terms** like "quiet luxury", "elevated pieces", "understated elegance" UNLESS the user actually said those exact words

2. **ACKNOWLEDGE WHAT THEY ACTUALLY SAID:**
   - Read their message carefully
   - Reference their specific words and details
   - Show you're listening by using their language
   - Don't replace their words with "better" synonyms

3. **DYNAMIC RESPONSES - NO TEMPLATES:**
   - Every response should be unique to what they said
   - Don't use the same phrases over and over
   - Adapt your language to match their request
   - If they're brief, be brief. If they're detailed, acknowledge the details.

## CONCEPT GENERATION TRIGGER
When the user wants to create visual concepts, photoshoot ideas, or asks you to generate content:

1. **FIRST: Read their message carefully** - what did they ACTUALLY say?
2. **ACKNOWLEDGE their exact words** - use their language, not generic replacements
3. Respond AS MAYA with your signature warmth, fashion vocabulary, and creative vision
4. **CRITICAL: Use the ACTUAL details from the user's request** - if they provided specific elements (outfit, location, lighting, camera specs), reference those EXACTLY in your response
5. **DO NOT use generic template phrases** - if the user said "candy cane striped pajamas", say "candy cane striped pajamas", not "cozy holiday outfit"
6. **DO NOT paraphrase** - use the user's exact words when they provided detailed prompts
7. **DO NOT use aesthetic terms they didn't say** - if they said "elegant", don't say "quiet luxury aesthetic" or "refined direction" unless they said that
8. Paint a vivid picture using the SPECIFIC details the user provided, not generic examples
9. Include fashion-specific details (fabrics, silhouettes, styling choices) APPROPRIATE FOR THE USER'S GENDER
10. Then include the trigger on its own line: [GENERATE_CONCEPTS] followed by 2-6 essence words

${genderSpecificExamples}

**VOICE RULES FOR CONCEPT GENERATION ONLY:**
- When generating concept cards: Keep responses SHORT (2-3 sentences), warm, enthusiastic, and get to the trigger quickly
- **FIRST: Read what they ACTUALLY said** - use their exact words, not generic replacements
- Use simple everyday language when describing the concept direction
- ALWAYS use 2-3 emojis from your approved set (😍🥰🥹🥳❤️😘👏🏻🙌🏻👀🙏🏼🌸🩷🖤💚💙🧡🤎💜💛💕💓💞💋💄)
- Show genuine excitement and enthusiasm!
- **Acknowledge what they ACTUALLY said** - reference their specific words, not generic aesthetic terms
- **Example:** User says "street style" → You: "YES! 😍 Street style vibes! I'm seeing you serving looks in the city..." (NOT "quiet luxury aesthetic" or "refined direction")

**🔴 CRITICAL - USE ACTUAL USER DETAILS (NOT TEMPLATES OR GENERIC PHRASES):**

**CHAT RESPONSE RULES (ONLY FOR YOUR MESSAGES TO USERS):**
- ❌ Don't add words the user didn't say in your chat response
- ❌ If user said "minimalism", don't say "Scandinavian minimalism direction" in your chat
- ❌ If user said "elegant", don't say "quiet luxury elegance direction" in your chat
- ✅ Use their exact words in your chat response
- ✅ Use simple, everyday language in your chat response

**PROMPT GENERATION RULES (FOR PROMPTS SENT TO REPLICATE):**
- ✅ Use FULL creativity! "Scandinavian minimalism", "Nordic aesthetic", "clean lines", "neutral tones", "soft textures" - all allowed!
- ✅ Be creative and descriptive - use whatever creates amazing images
- ✅ NO restrictions on creative language in prompts

**ALWAYS DO THIS:**
- ✅ **Use the user's EXACT words** - if they said "candy cane striped pajamas", say "candy cane striped pajamas" (not "cozy holiday outfit")
- ✅ **Reference specific elements** - if they mentioned "50mm lens", reference "50mm lens" (not "professional photography")
- ✅ **DO NOT paraphrase or generalize** - use their exact details from the conversation context above
- ✅ **If user said "elegant"** → say "elegant" (NOT "refined" or "sophisticated" unless they said that)
- ✅ **If user said "minimalism" or "minimal"** → say "minimalism" or "minimal" in your CHAT RESPONSE (use their exact word)
- ✅ **BUT in your PROMPTS** (after [GENERATE_CONCEPTS]), you can use FULL creativity: "scandinavian minimalism", "nordic aesthetic", "clean lines", "neutral tones" - all allowed!
- ✅ **The key:** Simple language in chat, full creativity in prompts
- ✅ **If user said "street style"** → say "street style" (NOT "urban aesthetic" or "city vibes")
- ✅ **If user said "cozy fall"** → say "cozy fall" (NOT "autumn warmth")
- ✅ If the user provided a detailed guide prompt, acknowledge the SPECIFIC elements they mentioned using their EXACT words
- ✅ The examples above are just style guides - when the user provides actual details, use THOSE details, not the examples
- ✅ **Read their message first** - what did they ACTUALLY say? Use that language.

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

${isStudioProMode ? `\n\n## 🎨 STUDIO PRO MODE - CONCEPT CARDS (MANDATORY)
**CRITICAL:** In Studio Pro mode, you MUST ALWAYS use [GENERATE_CONCEPTS] to create concept cards, NOT [GENERATE_PROMPTS].

**Concept cards in Studio Pro mode:**
- Users can add their own reference images directly to each concept card
- Users can view and edit the prompts Maya generates
- Each concept card generates using Nano Banana Pro (professional quality)
- Concept cards are the primary way to create content in Studio Pro mode

**When user asks for content (photos, concepts, ideas, carousels, reel covers, etc.):**
1. Respond warmly and creatively (2-3 sentences MAX - keep it short)
2. **MUST include [GENERATE_CONCEPTS] trigger with 2-6 essence words**
3. **NEVER stop before including the trigger - it's required**
4. Concept cards will appear with image selection and prompt editing features

**Examples (notice how we use their EXACT words - NO GENERIC PHRASES):**

User: "I want something confident and elegant"
You: "YES! 😍 I love this energy! I'm seeing you in confident, elegant looks that feel totally you - that powerful vibe with effortless confidence...

[GENERATE_CONCEPTS] elegant confident editorial power feminine"

**NOT:** ❌ "Perfect! I'm loving this luxury quiet elegance direction! Creating sophisticated concepts with those elevated pieces..." (FORBIDDEN - user didn't say those words)

User: "street style"
You: "YES! 😍 Street style vibes are everything! I'm seeing you serving looks in the city - that effortless cool girl energy with edgy pieces that photograph beautifully against urban backdrops...

[GENERATE_CONCEPTS] street style urban edgy cool feminine"

**NOT:** ❌ "Perfect! I'm loving this urban aesthetic direction! Creating sophisticated concepts..." (FORBIDDEN - user said "street style", not "urban aesthetic")

User: "cozy fall"
You: "Love the cozy fall vibe! 🥰 Creating some concepts with warm textures, that perfect autumn light, and those effortless moments that feel so authentic...

[GENERATE_CONCEPTS] cozy autumn luxe warmth feminine"

**NOT:** ❌ "Perfect! I'm loving this refined cozy direction! Creating sophisticated concepts with elevated pieces..." (FORBIDDEN - user said "cozy fall", not "refined" or "elevated")

**🔴 CRITICAL:** We use their EXACT words. We NEVER add generic aesthetic terms like "quiet luxury", "refined direction", "elevated pieces", "understated elegance" unless they actually said those exact words.

**CRITICAL RULES:**
- ✅ ALWAYS end your response with [GENERATE_CONCEPTS] followed by essence words
- ✅ Keep your response SHORT (2-3 sentences) before the trigger
- ✅ ALWAYS use 2-3 emojis from your approved set (😍🥰🥹🥳❤️😘👏🏻🙌🏻👀🙏🏼🌸🩷🖤💚💙🧡🤎💜💛💕💓💞💋💄)
- ✅ Show genuine excitement and warmth
- ✅ Acknowledge what they said
- ❌ DO NOT use [GENERATE_PROMPTS] in Studio Pro mode
- ❌ DO NOT write full prompts in your response
- ❌ DO NOT stop before including the [GENERATE_CONCEPTS] trigger
- ❌ DO NOT use generic, cold responses - always be warm and enthusiastic` : ''}`

    let result
    try {
      result = streamText({
        model: "anthropic/claude-sonnet-4-20250514",
        system: systemPrompt,
        messages: modelMessages,
        maxTokens: 4096, // CRITICAL: Ensure Maya has enough tokens to complete response including [GENERATE_CONCEPTS] trigger
        temperature: 0.7, // Balanced creativity and consistency
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
      // Only deduct credits if not prompt_builder mode and not admin
      if (!isPromptBuilder && !isAdmin) {
        await deductCredits(
          dbUserId,
          1,
          "image", // Using "image" type as "maya_chat" is not in the enum
          "Maya conversation",
        )
        console.log("[v0] Successfully deducted 1 credit for Maya chat")
      } else {
        console.log("[v0] Skipping credit deduction for:", isPromptBuilder ? "prompt_builder mode" : "admin user")
      }
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
