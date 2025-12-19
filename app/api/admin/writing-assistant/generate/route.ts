import { generateText } from "ai"
import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

const ADMIN_EMAIL = "ssa@ssasocial.com"

const WRITING_ASSISTANT_SYSTEM = `You are Sandra's writing assistant. Your job is to write captions, overlays, voiceovers, and hashtags in HER voice and style.

**Sandra's Voice:**
- Raw and authentic, not polished corporate
- Warm and encouraging, like a friend
- Direct and clear, no jargon
- Conversational and casual
- Empowering and action-oriented
- Uses varied greetings, emojis, signature "XoXo Sandra 💋"

**Content Pillars:**

1. **Prompts with Examples (Carousel):**
   - First slide: Strong viral HOOK + category subtitle
   - Next slides: Image with prompt overlaid
   - Caption: Story-driven, teaches value of the prompt
   - DO NOT create prompts - only write text around existing prompts

2. **My Story & Journey:**
   - Use Sandra's transformation story (in userMemories)
   - Reel voiceover OR carousel overlays
   - Focus: Storytelling, transformation, using SSELFIE Studio visuals
   - Authentic vulnerability + inspiration

3. **Visualize Your Future Self:**
   - Motivational/inspirational content
   - Sandra creating her weekly vision board
   - Cinematic storytelling, "I am the main character"
   - Captions, overlays, hashtags

4. **Brand Photoshoot Series:**
   - Weekly collab with female entrepreneur
   - Focus on THEIR story, THEIR brand
   - Showcase SSELFIE Studio in action
   - Collaborative, not self-promotional

**Format Requirements:**
- 80% teaching / 20% selling ratio
- Static post emphasis (not video-heavy)
- Clear CTAs with ManyChat integration ("DM STUDIO", "Comment SELFIE")
- Include hashtag suggestions (mix of branded + discovery)

**Output Format:**
Always provide your response as JSON with this structure:
{
  "content": "The main content (caption/overlay/voiceover text)",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", ...],
  "suggestedDate": "Suggested calendar date (e.g., 'Monday, Jan 15')",
  "pillarName": "Full name of the content pillar"
}

The content should be ready to use - formatted properly for the output type requested.`

async function checkAdminAccess() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return false
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return false
    }

    if (user.email !== ADMIN_EMAIL) {
      return false
    }

    return true
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await checkAdminAccess()
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { pillar, outputType, userInput, saveToDatabase } = await request.json()

    if (!pillar || !outputType || !userInput) {
      return NextResponse.json(
        { error: "Missing required fields: pillar, outputType, userInput" },
        { status: 400 }
      )
    }

    // Get admin user ID
    const adminUser = await sql`
      SELECT id FROM users WHERE email = ${ADMIN_EMAIL} LIMIT 1
    `
    const adminUserId = adminUser && adminUser.length > 0 ? adminUser[0].id : null

    // Get Sandra's personal story/memories for context
    let sandraStoryContext = ""
    let promptsContext = ""
    let promptsReferenced: string[] = []

    try {
      // Get Sandra's personal memory
      if (adminUserId) {
        const sandraMemory = await sql`
          SELECT * FROM maya_personal_memory 
          WHERE user_id = ${adminUserId}
          LIMIT 1
        `
        
        if (sandraMemory && sandraMemory.length > 0) {
          const memory = sandraMemory[0] as any
          const storyParts: string[] = []
          
          if (memory.personalized_styling_notes) {
            storyParts.push(`Styling notes: ${memory.personalized_styling_notes}`)
          }
          
          if (memory.personal_insights) {
            const insights = memory.personal_insights as any
            if (insights.story || insights.transformation) {
              storyParts.push(`Story: ${insights.story || insights.transformation}`)
            }
          }
          
          if (storyParts.length > 0) {
            sandraStoryContext = storyParts.join('\n')
          }
        }

        // Get existing concept cards/prompts for reference (for prompts pillar)
        if (pillar === 'prompts') {
          const existingPrompts = await sql`
            SELECT prompt, title, description
            FROM concept_cards
            WHERE user_id = ${adminUserId}
            ORDER BY created_at DESC
            LIMIT 10
          `
          
          if (existingPrompts && existingPrompts.length > 0) {
            promptsReferenced = existingPrompts.map((p: any) => p.prompt || p.title || '').filter(Boolean)
            promptsContext = existingPrompts.map((p: any, idx: number) => 
              `${idx + 1}. ${p.title || 'Untitled'}: ${p.description || ''}`
            ).join('\n')
          }
        }
      }
    } catch (error) {
      console.error("[v0] Error fetching context:", error)
      // Continue without context
    }

    const pillarData = {
      prompts: { name: 'Prompts with Examples', type: 'carousel' },
      story: { name: 'My Story & Journey', type: 'reel_or_carousel' },
      future_self: { name: 'Visualize Your Future Self', type: 'reel' },
      photoshoot: { name: 'Brand Photoshoot Series', type: 'carousel' }
    }[pillar] || { name: pillar, type: 'unknown' }

    const contentPillar = pillarData.name
    const prompt = `Content Pillar: ${contentPillar}
Output Type: ${outputType}
User Request: ${userInput}

Additional Context:
${promptsContext ? `- Existing prompts to reference:\n${promptsContext}\n` : ''}
${sandraStoryContext ? `- Sandra's story:\n${sandraStoryContext}\n` : ''}

Generate ${outputType} in Sandra's voice following the pillar guidelines.`

    const { text } = await generateText({
      model: 'anthropic/claude-sonnet-4',
      system: WRITING_ASSISTANT_SYSTEM,
      prompt: prompt,
      maxOutputTokens: 1500,
      temperature: 0.8,
    })

    // Parse response and extract content, hashtags, and suggested date
    let content = text
    let hashtags: string[] = []
    let suggestedDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    })

    // Try to parse JSON from the response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.content) content = parsed.content
        if (parsed.hashtags && Array.isArray(parsed.hashtags)) {
          hashtags = parsed.hashtags
        }
        if (parsed.suggestedDate) {
          suggestedDate = parsed.suggestedDate
        }
      }
    } catch (parseError) {
      console.log("[v0] Response not in JSON format, parsing from text")
    }

    // Extract hashtags from text if not found in JSON
    if (hashtags.length === 0) {
      const hashtagsMatch = text.match(/#[\w]+/g)
      if (hashtagsMatch) {
        hashtags = hashtagsMatch.map(tag => tag.replace('#', ''))
      } else {
        // Default hashtags
        hashtags = ['sselfiestudio', 'personalbranding', 'aiphotography', 'aiphotos', 'personalbrand']
      }
    }

    // Remove hashtags from content if they're embedded
    content = content.replace(/#[\w]+\s*/g, '').trim()

    const response = {
      content: content,
      hashtags: hashtags,
      suggestedDate: suggestedDate,
      pillarName: contentPillar
    }

    // Save to database if requested
    if (saveToDatabase && adminUserId) {
      try {
        // Ensure table exists
        await sql`
          CREATE TABLE IF NOT EXISTS writing_assistant_outputs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
            content_pillar TEXT NOT NULL,
            output_type TEXT NOT NULL,
            content TEXT NOT NULL,
            context JSONB,
            created_by TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )
        `
        
        await sql`
          INSERT INTO writing_assistant_outputs (
            user_id,
            content_pillar,
            output_type,
            content,
            context,
            created_by
          ) VALUES (
            ${adminUserId},
            ${pillar},
            ${outputType},
            ${content},
            ${JSON.stringify({ userInput, promptsReferenced })},
            ${adminUserId}
          )
        `
      } catch (saveError) {
        console.error("[v0] Error saving to database:", saveError)
        // Continue even if save fails
      }
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("[v0] Error in writing assistant API:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate content" },
      { status: 500 }
    )
  }
}
