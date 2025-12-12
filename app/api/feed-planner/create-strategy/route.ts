import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { checkCredits, deductCredits, CREDIT_COSTS } from "@/lib/credits"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"
import { generateInstagramCaption } from "@/lib/feed-planner/caption-writer"
import { getFluxPromptingPrinciples } from "@/lib/maya/flux-prompting-principles"
import { getFashionIntelligencePrinciples } from "@/lib/maya/fashion-knowledge-2025"
import INFLUENCER_POSING_KNOWLEDGE from "@/lib/maya/influencer-posing-knowledge"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] ==================== CREATE STRATEGY API CALLED ====================")

    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      console.log("[v0] No auth user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Auth user:", authUser.id)

    const neonUser = await getUserByAuthId(authUser.id)

    if (!neonUser) {
      console.log("[v0] Neon user not found for auth user:", authUser.id)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] Neon user found:", neonUser.id)

    const body = await request.json()
    const { request: userRequest, chatId, customSettings } = body
    
    console.log("[v0] Custom settings received:", customSettings)

    if (!userRequest) {
      return NextResponse.json({ error: "Request is required" }, { status: 400 })
    }

    console.log("[v0] Feed Planner API: Creating strategy for user", neonUser.id)
    console.log("[v0] User request:", userRequest.substring(0, 100) + "...")

    // Total cost: 5 credits for strategy + 9 credits for 9 images = 14 credits
    const strategyCredits = 5
    const imageCredits = 9
    const totalCreditsNeeded = strategyCredits + imageCredits
    const hasCredits = await checkCredits(neonUser.id.toString(), totalCreditsNeeded)

    if (!hasCredits) {
      console.error("[v0] Insufficient credits for auto-generation")
      return NextResponse.json(
        {
          error: `Insufficient credits. You need ${totalCreditsNeeded} credits (${strategyCredits} for strategy + ${imageCredits} for images) to create your feed.`,
        },
        { status: 402 },
      )
    }

    console.log("[v0] Credits checked: User has enough credits")
    
    // Deduct credits for strategy creation (5 credits)
    const strategyDeduction = await deductCredits(
      neonUser.id.toString(),
      strategyCredits,
      "image",
      "Feed strategy creation",
    )

    if (!strategyDeduction.success) {
      console.error("[v0] Failed to deduct credits for strategy")
      return NextResponse.json(
        {
          error: "Failed to deduct credits. Please try again.",
        },
        { status: 500 },
      )
    }

    console.log("[v0] Credits deducted for strategy. Remaining balance:", strategyDeduction.newBalance)
    console.log("[v0] Starting strategy generation...")

    const sql = neon(process.env.DATABASE_URL!)

    // Get brand profile
    const [brandProfile] = await sql`
      SELECT * FROM user_personal_brand
      WHERE user_id = ${neonUser.id}
      AND is_completed = true
      LIMIT 1
    `

    if (!brandProfile) {
      return NextResponse.json({ error: "Please complete your personal brand profile first" }, { status: 400 })
    }

    console.log("[v0] Brand profile loaded")

    // Get full user context for personalization
    console.log("[v0] Getting user context for strategy generation...")
    const userContext = await getUserContextForMaya(authUser.id)
    console.log("[v0] User context retrieved, length:", userContext.length)

    // Query knowledge base for Instagram best practices
    console.log("[v0] Querying knowledge base for Instagram best practices...")
    let knowledgeBaseInsights = ""
    try {
      const bestPractices = await sql`
        SELECT title, content, confidence_level
        FROM admin_knowledge_base
        WHERE category = 'instagram'
        AND knowledge_type IN ('best_practice', 'strategy', 'case_study')
        AND is_active = true
        ORDER BY confidence_level DESC
        LIMIT 10
      `
      
      if (bestPractices.length > 0) {
        knowledgeBaseInsights = bestPractices
          .map((kb: any) => `## ${kb.title}\n${kb.content}`)
          .join("\n\n")
        console.log("[v0] Found", bestPractices.length, "knowledge base entries")
      } else {
        console.log("[v0] No knowledge base entries found, using default best practices")
        // Fallback to embedded best practices if knowledge base is empty
        knowledgeBaseInsights = `## 2025 Instagram Algorithm Signals
Instagram's algorithm prioritizes:
- **Saves** - Highest value signal (indicates lasting value)
- **Shares via DMs** - Strong indicator of quality
- **Direct Messages** - Algorithm favors posts that generate DMs
- **Quality Comments** - Thoughtful discussions > generic comments
- **Carousel Posts** - 35% increase in reach vs single images

## Hook-Story-Value-CTA Framework
Every caption MUST follow this structure:
1. **Hook (1 line)** - Stop the scroll with bold statement, question, or curiosity gap
2. **Story (2-4 sentences)** - Personal moment that builds connection
3. **Value (1-3 sentences)** - Insight, lesson, or takeaway
4. **CTA (1 question)** - Engaging question that invites conversation

## Engagement CTAs
- "Save this post for later"
- "Share this with someone who needs it"
- "DM me 'guide' for the free checklist"
- "Comment your biggest challenge below"
- "Tag a friend who needs this tip"`
      }
    } catch (kbError) {
      console.error("[v0] Error querying knowledge base:", kbError)
      // Continue without knowledge base
    }

    const strategyResult = await generateText({
      model: "anthropic/claude-sonnet-4",
      system: `You are an elite Instagram Growth Strategist with deep expertise in:
- 2025 Instagram algorithm (saves, shares, DMs, comments are priority signals)
- Hook-Story-Value-CTA caption framework (proven engagement structure)
- Narrative storytelling across 9-post feeds (cohesive story arc)
- Content pillar strategy (3-5 foundational themes)
- Engagement psychology and proven CTAs
- Personal brand storytelling and authenticity

${userContext ? `\n=== USER CONTEXT ===\n${userContext}\n` : ""}

${knowledgeBaseInsights ? `\n=== KNOWLEDGE BASE INSIGHTS ===\n${knowledgeBaseInsights}\n` : ""}

CRITICAL JSON FORMATTING RULES:
1. Return ONLY valid JSON - no markdown, no code blocks, no backticks
2. ALL string values MUST be properly escaped:
   - Use \\n for newlines (not actual newlines in strings)
   - Use \\" for quotes inside strings
   - Escape all special characters: \\t, \\r, etc.
   - Hashtags in strings should be written as "#hashtag" (the # is fine, but ensure the string is properly quoted)
3. Do NOT include markdown formatting (like # for headers) inside JSON string values
4. All JSON must be valid and parseable - test it mentally before returning
5. If you need to include hashtags, write them as plain text inside the string: "#visibility" not as markdown`,
      prompt: `Create a comprehensive 9-post Instagram feed strategy that tells a cohesive story and drives engagement.

BRAND PROFILE:
- Brand: ${brandProfile.business_name || "Personal brand"}
- Type: ${brandProfile.business_type}
- Vibe: ${brandProfile.brand_vibe}
- Voice: ${brandProfile.brand_voice}
- Audience: ${brandProfile.target_audience}
- Values: ${JSON.stringify(brandProfile.core_values)}
- User Request: ${userRequest}

NARRATIVE ARC STRUCTURE (Critical - 9 posts must tell a story):
- Posts 1-3: Origin/Why (introduce brand, purpose, background, "who I am")
- Posts 4-6: Conflict/Process (challenges, journey, behind-the-scenes, "my journey")
- Posts 7-9: Outcome/Invitation (solutions, success, transformation, "what's next")

CONTENT PILLAR DISTRIBUTION (3-5 pillars, balanced):
- Educational: 2-3 posts (teach, inform, provide value)
- Inspirational: 2-3 posts (motivate, share stories, transformations)
- Personal/BTS: 2-3 posts (authentic moments, behind-the-scenes, real life)
- [Add 1-2 more based on brand type: Promotional, UGC, Community, etc.]

ENGAGEMENT OPTIMIZATION (2025 Algorithm):
- Include "Save this post" CTAs for valuable/educational content
- Include "Share with someone" CTAs for relatable/inspirational content
- Include "DM me" CTAs for lead generation (1-2 posts max)
- Include "Comment below" CTAs for discussion and engagement
- Optimize for saves, shares, and DMs (algorithm priority signals)

CAPTION STRUCTURE (Hook-Story-Value-CTA):
For each post, provide:
- **Hook concept**: Bold statement, question, or curiosity gap (1 line idea)
- **Story concept**: Personal moment/experience that builds connection (2-4 sentence idea)
- **Value concept**: Insight, lesson, or takeaway (1-3 sentence idea)
- **CTA concept**: Engaging question or action (1 line idea)
- **Hashtag strategy**: 5-10 strategic hashtags (mix: 2-3 large, 3-4 medium, 2-3 niche)

CAPTION VARIETY (Critical - each must be different):
- Rotate hook styles: bold statement, question, confession, observation
- Vary lengths: 80-150 words (mix short and longer)
- Mix energy: calm, excited, vulnerable, bold
- Different story types: personal moment, lesson learned, BTS, transformation

Return ONLY this JSON structure (no markdown, no backticks):

CRITICAL JSON RULES:
- ALL string values must be valid JSON strings
- Use \\n for newlines (NOT actual line breaks)
- Escape quotes with \\"
- Hashtags in strings must be inside quotes: "#hashtag" not #hashtag
- NO markdown formatting (# headers) inside JSON strings - use plain text
- If you mention hashtags in text, write them as: "hashtag" or "the hashtag #visibility" (with quotes)

{
  "strategyDocument": "Create a COMPREHENSIVE, DETAILED Instagram strategy guide (1000+ words) in markdown format. This should be a mini personalized Instagram strategy guide that tells the user exactly what to post, how to use their photos, and all current Instagram best practices.\\n\\nStructure it as follows (use markdown headers #, ##, ###, **bold**, lists, etc.):\\n\\n# [Brand Name] Instagram Strategy Guide\\n\\n## Your Brand Positioning\\n[Explain their brand positioning, unique value, and how to communicate it]\\n\\n## Content Pillars & What You Post\\n[Explain their 3-5 content pillars and how to balance them]\\n\\n## Visual Aesthetic\\n[Describe their visual style, color palette, and how to maintain consistency]\\n\\n## The 9-Post Narrative Arc\\n[Explain the complete story being told across all 9 posts - how they connect, what transformation happens, and the journey]\\n\\n## Post Type Recommendations\\nFor EACH of the 9 posts, specify:\\n- **Single Image**: Which posts work best as single images and why\\n- **Carousel**: Which posts should become carousels, with detailed slide-by-slide breakdown (use the feed image as slide 1 to maintain visual consistency)\\n- **Reel**: Which posts should become reels, including:\\n  - Reel concept and hook for first 3 seconds\\n  - Cover photo tips (using the feed image to maintain aesthetic)\\n  - Trending audio recommendations (specific songs/sounds for their niche)\\n  - Text overlay strategies\\n\\n## How to Use Your Feed Photos\\n- Which feed images should be used as reel covers (maintain aesthetic)\\n- Which feed images work best as carousel slide 1 (visual consistency)\\n- Which feed images are perfect as single posts\\n- How to maintain visual consistency across all formats\\n\\n## Storytelling Strategy\\n- How to tell your story across the 9 posts\\n- When to be vulnerable vs educational vs inspirational\\n- Story sequences for each post (Stories content ideas)\\n- How to build connection and engagement through storytelling\\n\\n## Instagram Best Practices (2025)\\n- **Posting Schedule**: Optimal posting times and frequency for maximum engagement\\n- **Hashtag Strategy**: Main hashtags (use on every post) + rotating hashtags (vary by post) + placement tips\\n- **Engagement Tactics**: How to drive saves, shares, DMs (algorithm priority signals)\\n- **Growth Tactics**: Follower growth strategies, engagement boosts, conversion tactics\\n- **Trend Utilization**: When to jump on trending audio vs use original, current trending formats in their niche, how to adapt trends while staying on-brand\\n- **Audio Tips**: Trending sounds for their niche, when to use original audio, how to choose audio that matches their brand\\n\\n## Content Mix Strategy\\n- **When to SELL**: Which posts should have soft/hard CTAs and how to do it authentically\\n- **When to EDUCATE**: Which posts provide value without asking, how to teach effectively\\n- **When to STORY-TELL**: Vulnerability moments, personal stories that build connection\\n- **When to INSPIRE**: Aspirational content, transformation stories, motivational moments\\n\\n## Engagement CTAs\\n- Specific CTA recommendations for each post type\\n- How to optimize for saves, shares, and DMs\\n- Examples of engaging questions and calls-to-action\\n\\nMake this guide actionable, specific to their brand/niche, and comprehensive. Use markdown formatting for readability.",
  "gridPattern": "Description of the 3x3 visual pattern",
  "visualRhythm": "How the posts flow together visually",
  "posts": [
    {
      "position": 1,
      "postType": "portrait" | "object" | "flatlay" | "scenery",
      "contentPillar": "educational",
      "narrativeRole": "origin",
      "hookConcept": "Unique hook idea (1 line) - MUST be different style from previous posts. Rotate: bold statement, question, confession, observation, numbered list",
      "storyConcept": "Story idea (2-4 sentences)",
      "valueConcept": "Value idea (1-3 sentences)",
      "ctaConcept": "CTA idea (1 line)",
      "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
      "prompt": "Brief visual description for image generation (1-2 sentences). For portrait: describe the scene/mood. For object/flatlay/scenery: describe items/scenery. NOTE: Actual FLUX prompts are generated separately by Maya with full technical specs - this is just a visual direction description."
    },
    ... (9 posts total - MUST include 1-2 posts with postType: "object", "flatlay", or "scenery" for the 80/20 rule)
  ]
}

Make the strategy document comprehensive (1000+ words minimum) with actionable, specific insights. This is a complete Instagram strategy guide - be thorough and detailed. Include specific recommendations for each of the 9 posts regarding post types (single image, carousel, reel), audio recommendations, cover photo tips, and storytelling guidance.
Ensure narrative arc flows logically across all 9 posts.
Distribute content pillars strategically (not all same type).
Each post must have unique hook, story, value, and CTA concepts.
Include 5-10 strategic hashtags per post (mix of sizes).

CRITICAL: You MUST create 1-2 posts with postType: "object", "flatlay", or "scenery" (NOT "portrait") to follow the 80/20 rule. These posts should not feature the user - only objects, products, flatlays, or scenery.`,
      temperature: 0.8,
    })

    console.log("[v0] Strategy generation successful!")
    console.log("[v0] Raw AI response length:", strategyResult.text.length)
    console.log("[v0] First 500 chars:", strategyResult.text.substring(0, 500))

    let cleanedText = strategyResult.text.trim()
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim()
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/```\n?/g, "").trim()
    }

    console.log("[v0] Cleaned text length:", cleanedText.length)
    console.log("[v0] Attempting JSON parse...")

    // Helper function to repair JSON with common issues
    const repairJSON = (text: string): string => {
      let repaired = text
      
      // Find JSON object boundaries
      const firstBrace = repaired.indexOf("{")
      const lastBrace = repaired.lastIndexOf("}")
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        repaired = repaired.substring(firstBrace, lastBrace + 1)
      }
      
      // Fix common JSON issues:
      // 1. Unescaped newlines, tabs, carriage returns in string values
      // 2. Unescaped quotes in string values
      // 3. Trailing commas
      // 4. Comments (remove them)
      
      // Remove comments (JSON doesn't support comments)
      repaired = repaired.replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
      repaired = repaired.replace(/\/\/.*$/gm, '') // Remove // comments
      
      // Fix trailing commas before closing braces/brackets
      repaired = repaired.replace(/,(\s*[}\]])/g, '$1')
      
      // Fix unescaped control characters in string values
      // This regex finds string values and fixes control characters
      // We need to be more careful - process strings one at a time to avoid breaking valid JSON
      let inString = false
      let escapeNext = false
      let result = ""
      
      for (let i = 0; i < repaired.length; i++) {
        const char = repaired[i]
        
        if (escapeNext) {
          result += char
          escapeNext = false
          continue
        }
        
        if (char === '\\') {
          result += char
          escapeNext = true
          continue
        }
        
        if (char === '"') {
          inString = !inString
          result += char
          continue
        }
        
        if (inString) {
          // Inside a string - escape control characters
          if (char === '\n') {
            result += '\\n'
          } else if (char === '\r') {
            result += '\\r'
          } else if (char === '\t') {
            result += '\\t'
          } else {
            result += char
          }
        } else {
          result += char
        }
      }
      
      repaired = result
      
      // Fix property names that might have issues
      // Ensure all property names are properly quoted
      repaired = repaired.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
      
      return repaired
    }

    // Try to parse JSON with better error handling
    let strategy
    try {
      strategy = JSON.parse(cleanedText)
    } catch (parseError: any) {
      console.error("[v0] Initial JSON parse failed:", parseError.message)
      console.log("[v0] Attempting to repair JSON...")
      
      // Extract error position for debugging
      const errorPosMatch = parseError.message.match(/position (\d+)/)
      const errorPos = errorPosMatch ? parseInt(errorPosMatch[1]) : 0
      
      if (errorPos > 0) {
        const start = Math.max(0, errorPos - 200)
        const end = Math.min(cleanedText.length, errorPos + 200)
        console.log("[v0] Problematic section around position", errorPos, ":", cleanedText.substring(start, end))
      }
      
      // Try to repair the JSON
      try {
        const repairedText = repairJSON(cleanedText)
        strategy = JSON.parse(repairedText)
        console.log("[v0] ✅ JSON repair successful!")
      } catch (repairError: any) {
        console.error("[v0] JSON repair failed:", repairError.message)
        
          // Try a more aggressive repair: fix hashtags breaking JSON strings
          try {
            let aggressiveRepair = cleanedText
            
            // Find JSON boundaries
            const firstBrace = aggressiveRepair.indexOf("{")
            const lastBrace = aggressiveRepair.lastIndexOf("}")
            if (firstBrace !== -1 && lastBrace !== -1) {
              aggressiveRepair = aggressiveRepair.substring(firstBrace, lastBrace + 1)
            }
            
            // Fix the specific issue: hashtags appearing after quotes that break JSON
            // Pattern: "...", #hashtag - the hashtag should be inside the previous string or in a new string
            // We'll fix: ", #word -> ", "#word" or better: ", #word -> ", " #word"
            // Actually, the issue is likely: "text", #hashtag where the string closed too early
            // Fix: ", #word -> ", "#word" (add quote before hashtag and close after)
            aggressiveRepair = aggressiveRepair.replace(/(")\s*,\s*(#\w+)/g, '$1, "$2"')
            
            // Also fix: ": #word -> ": "#word"
            aggressiveRepair = aggressiveRepair.replace(/(")\s*:\s*(#\w+)/g, '$1: "$2"')
            
            // Fix: ", #word" (hashtag at end of string value) -> ", "#word""
            aggressiveRepair = aggressiveRepair.replace(/(")\s*,\s*(#\w+)(")/g, '$1, "$2"$3')
            
            // Try parsing again
            strategy = JSON.parse(aggressiveRepair)
            console.log("[v0] ✅ Aggressive JSON repair successful!")
          } catch (aggressiveError: any) {
          console.error("[v0] Aggressive repair also failed:", aggressiveError.message)
          
          // Log the problematic section for debugging
          const aggressiveErrorPosMatch = aggressiveError.message.match(/position (\d+)/)
          const aggressiveErrorPos = aggressiveErrorPosMatch ? parseInt(aggressiveErrorPosMatch[1]) : 0
          if (aggressiveErrorPos > 0) {
            const start = Math.max(0, aggressiveErrorPos - 300)
            const end = Math.min(cleanedText.length, aggressiveErrorPos + 300)
            console.log("[v0] Final error at position", aggressiveErrorPos, ":", cleanedText.substring(start, end))
          }
          
          // Return a helpful error message
          throw new Error(
            `Failed to parse strategy JSON: ${parseError.message}. ` +
            `The AI response contains invalid characters (likely unescaped hashtags or newlines in string values). ` +
            `Please try creating the strategy again. The system will attempt to fix this automatically.`
          )
        }
      }
    }

    console.log("[v0] Strategy parsed successfully!")
    console.log("[v0] Strategy has posts array:", Array.isArray(strategy.posts))
    console.log("[v0] Posts array length:", strategy.posts?.length || 0)
    if (strategy.posts && strategy.posts.length > 0) {
      console.log("[v0] First post structure:", JSON.stringify(strategy.posts[0], null, 2))
    }

    // Validate 80/20 rule
    if (strategy.posts && strategy.posts.length === 9) {
      const userPosts = strategy.posts.filter(
        (p: any) => p.postType === "portrait" || !p.postType || p.postType === "post"
      ).length
      const objectPosts = strategy.posts.filter(
        (p: any) => p.postType === "object" || p.postType === "flatlay" || p.postType === "scenery"
      ).length

      console.log(`[v0] 80/20 Rule Check: ${userPosts} user posts, ${objectPosts} object/flatlay/scenery posts`)

      if (objectPosts < 1 || objectPosts > 2) {
        console.warn(`[v0] ⚠️ 80/20 Rule violation: Expected 1-2 object/flatlay/scenery posts, got ${objectPosts}`)
        console.warn(`[v0] Fixing: Converting some posts to object/flatlay type...`)
        
        // Fix: Convert 1-2 posts to object/flatlay/scenery
        const postsToConvert = objectPosts === 0 ? 2 : (objectPosts > 2 ? 1 : 0)
        if (postsToConvert > 0) {
          // Find posts that are NOT position 1 or 9 (keep those as user posts)
          const convertiblePosts = strategy.posts.filter(
            (p: any, idx: number) => 
              (p.postType === "portrait" || !p.postType || p.postType === "post") &&
              idx > 0 && idx < 8 // Not first or last
          )
          
          // Convert middle posts to object/flatlay
          const types = ["object", "flatlay", "scenery"]
          for (let i = 0; i < Math.min(postsToConvert, convertiblePosts.length); i++) {
            const post = convertiblePosts[i]
            post.postType = types[i % types.length]
            console.log(`[v0] ✅ Converted post ${post.position} to ${post.postType}`)
          }
        }
        
        const newUserPosts = strategy.posts.filter(
          (p: any) => p.postType === "portrait" || !p.postType || p.postType === "post"
        ).length
        const newObjectPosts = strategy.posts.filter(
          (p: any) => p.postType === "object" || p.postType === "flatlay" || p.postType === "scenery"
        ).length
        console.log(`[v0] ✅ After fix: ${newUserPosts} user posts, ${newObjectPosts} object/flatlay/scenery posts`)
      }
    }

    const truncate = (str: string, max = 50) => (str && str.length > max ? str.substring(0, max) : str)

    // Extract username from brand profile or generate one
    const username = brandProfile.business_name 
      ? brandProfile.business_name.toLowerCase().replace(/\s+/g, '') 
      : `user${neonUser.id}`
    const brandName = brandProfile.business_name || brandProfile.name || "Personal Brand"

    // Store custom settings as JSONB if provided
    const customSettingsJson = customSettings ? JSON.stringify(customSettings) : null

    const [feedLayout] = await sql`
      INSERT INTO feed_layouts (
        user_id, 
        title, 
        description, 
        business_type, 
        brand_vibe, 
        layout_type, 
        visual_rhythm, 
        feed_story,
        username,
        brand_name,
        status,
        created_at,
        updated_at
      ) VALUES (
        ${neonUser.id}, 
        'Instagram Feed Strategy', 
        ${strategy.strategyDocument},
        ${truncate(brandProfile.business_type)}, 
        ${truncate(brandProfile.brand_vibe)},
        ${truncate(strategy.gridPattern)}, 
        ${strategy.visualRhythm},
        ${userRequest.substring(0, 500)},
        ${username},
        ${brandName},
        'pending',
        NOW(),
        NOW()
      )
      RETURNING id
    `
    
    // Store custom settings separately (we'll add a column or use metadata)
    // For now, we'll pass it through to queue-images via the function call

    console.log("[v0] Feed layout created:", feedLayout.id)

    if (!strategy.posts || !Array.isArray(strategy.posts) || strategy.posts.length === 0) {
      console.error("[v0] ERROR: No posts in strategy!")
      console.error("[v0] Strategy object keys:", Object.keys(strategy))
      throw new Error("Strategy generation failed: No posts array found")
    }

    console.log("[v0] Starting to insert", strategy.posts.length, "posts...")

    // Generate actual captions using the sophisticated caption writer
    // Process in parallel batches to improve performance
    console.log("[v0] Generating captions using Hook-Story-Value-CTA framework...")
    const postsWithCaptions = []

    // Generate captions in parallel (3 at a time to avoid rate limits)
    const captionPromises = strategy.posts.map(async (post: any, index: number) => {
      try {
        console.log(`[v0] === Generating caption for post ${index + 1}/9 (position ${post.position}) ===`)
        console.log(`[v0] Post data: position=${post.position}, type=${post.postType}, pillar=${post.contentPillar}`)
        console.log(`[v0] Narrative role: ${post.narrativeRole || "not specified"}`)

        // Determine emotional tone based on narrative role
        let emotionalTone = "authentic"
        if (post.narrativeRole === "origin") {
          emotionalTone = "introducing"
        } else if (post.narrativeRole === "conflict") {
          emotionalTone = "vulnerable"
        } else if (post.narrativeRole === "outcome") {
          emotionalTone = "inspiring"
        }

        // Generate caption using the sophisticated caption writer
        let finalCaption = ""

        // Collect previous captions for uniqueness
        const previousCaptions = postsWithCaptions
          .slice(0, index)
          .map((prevPost: any) => ({
            position: prevPost.post.position,
            caption: prevPost.caption || "",
          }))

        try {
          const captionResult = await generateInstagramCaption({
            postPosition: post.position,
            shotType: post.postType || "portrait", // postType can be "portrait", "object", "flatlay", or "scenery"
            purpose: post.contentPillar || "general",
            emotionalTone: emotionalTone,
            brandProfile: brandProfile,
            targetAudience: brandProfile.target_audience,
            brandVoice: brandProfile.brand_voice,
            contentPillar: post.contentPillar,
            hookConcept: post.hookConcept,
            storyConcept: post.storyConcept,
            valueConcept: post.valueConcept,
            ctaConcept: post.ctaConcept,
            hashtags: post.hashtags,
            previousCaptions,
            narrativeRole: post.narrativeRole,
            // researchData: null, // Research data not available in this context
          })

          finalCaption = captionResult.caption
          
          // Fix any escaped newlines that might have been stored
          finalCaption = finalCaption.replace(/\\n/g, '\n')
          
          console.log(`[v0] ✓ Caption generated for post ${post.position} (${finalCaption.length} chars)`)
        } catch (captionErr: any) {
          console.error(`[v0] ⚠️ Caption generation failed for post ${post.position}:`, captionErr.message)
          
          // Fallback: Build caption from concepts if caption writer fails
          if (post.hookConcept && post.storyConcept && post.valueConcept && post.ctaConcept) {
            finalCaption = `${post.hookConcept}\n\n${post.storyConcept}\n\n${post.valueConcept}\n\n${post.ctaConcept}`
            console.log(`[v0] Using fallback caption from concepts`)
          } else if (post.caption) {
            finalCaption = post.caption
            // Fix escaped newlines in strategy-generated captions
            finalCaption = finalCaption.replace(/\\n/g, '\n')
            console.log(`[v0] Using strategy-generated caption as fallback`)
          } else {
            // Last resort: create basic caption
            finalCaption = `Post ${post.position} - ${post.contentPillar || "content"}`
            console.log(`[v0] ⚠️ Using minimal caption placeholder`)
          }
        }

        // Hashtags are now integrated in caption-writer, but ensure we have them if missing
        const hashtags = post.hashtags || []
        if (hashtags.length > 0 && !finalCaption.includes("#")) {
          // Only add if caption writer didn't include any
          finalCaption = `${finalCaption}\n\n${hashtags.map((h: string) => `#${h.replace("#", "")}`).join(" ")}`
        }

        return {
          post,
          caption: finalCaption,
          success: true,
        }
      } catch (error: any) {
        console.error(`[v0] ✗ Error processing post ${post.position}:`, error.message)
        return {
          post,
          caption: post.caption || `Post ${post.position}`,
          success: false,
          error: error.message,
        }
      }
    })

    // Process captions in batches of 3 to avoid overwhelming the API
    const batchSize = 3
    const captionResults = []
    for (let i = 0; i < captionPromises.length; i += batchSize) {
      const batch = captionPromises.slice(i, i + batchSize)
      const batchResults = await Promise.all(batch)
      captionResults.push(...batchResults)
      
      // Small delay between batches
      if (i + batchSize < captionPromises.length) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }

    console.log(`[v0] Caption generation complete: ${captionResults.filter(r => r.success).length} successful, ${captionResults.filter(r => !r.success).length} failed`)

    // Get user data for Maya concept generation (same as concept cards)
    const userDataResult = await sql`
      SELECT u.gender, u.ethnicity, um.trigger_word, upb.physical_preferences
      FROM users u
      LEFT JOIN user_models um ON u.id = um.user_id AND um.training_status = 'completed'
      LEFT JOIN user_personal_brand upb ON u.id = upb.user_id
      WHERE u.id = ${neonUser.id} 
      LIMIT 1
    `

    let userGender = "person"
    if (userDataResult[0]?.gender) {
      const dbGender = userDataResult[0].gender.toLowerCase().trim()
      if (dbGender === "woman" || dbGender === "female") {
        userGender = "woman"
      } else if (dbGender === "man" || dbGender === "male") {
        userGender = "man"
      } else {
        userGender = dbGender
      }
    }

    const userEthnicity = userDataResult[0]?.ethnicity || null
    const physicalPreferences = userDataResult[0]?.physical_preferences || null
    const triggerWord = userDataResult[0]?.trigger_word || `user${neonUser.id}`

    const fashionIntelligence = getFashionIntelligencePrinciples(userGender, userEthnicity)
    const fluxPrinciples = getFluxPromptingPrinciples()

    // Get color palette from brand profile
    let colorPalette = null
    let colorPaletteSection = ""
    try {
      colorPalette = brandProfile.color_palette
      if (colorPalette) {
        if (Array.isArray(colorPalette) && colorPalette.length > 0) {
          const colors = colorPalette.filter((c: any) => {
            if (typeof c === "string") return c.trim().length > 0
            if (typeof c === "object" && c.hex) return c.hex.trim().length > 0
            return false
          }).map((c: any) => typeof c === "string" ? c : c.hex || c.name || c)
          
          if (colors.length > 0) {
            colorPaletteSection = `
=== 🎨 BRAND COLOR PALETTE (MANDATORY FOR COHESION) ===
**EXACT COLORS TO USE:** ${colors.join(", ")}

**CRITICAL COLOR COHESION RULES:**
- You MUST use these exact brand colors in EVERY post's outfit and styling
- Do NOT default to generic warm tones, beige, or neutral colors unless they are in this palette
- Do NOT use colors that are NOT in this list
- Create VARIETY in outfit styles, but maintain COLOR CONSISTENCY across all 9 posts
- Examples:
  - If brand colors are blue and white → use blue and white clothing in different styles
  - If brand colors are black and gold → use black and gold styling with variety
  - If brand colors are beige and cream → use beige and cream tones consistently
- Color consistency is NON-NEGOTIABLE for feed cohesion
- You can vary SHADES of these colors (light blue, dark blue) but stay within the palette
===`
            console.log(`[v0] Color palette found: ${colors.join(", ")}`)
          }
        } else if (typeof colorPalette === "object") {
          // Handle object format
          const colorValues = Object.values(colorPalette).filter((c: any) => typeof c === "string" && c.trim().length > 0)
          if (colorValues.length > 0) {
            colorPaletteSection = `
=== 🎨 BRAND COLOR PALETTE (MANDATORY FOR COHESION) ===
**EXACT COLORS TO USE:** ${colorValues.join(", ")}

**CRITICAL COLOR COHESION RULES:**
- You MUST use these exact brand colors in EVERY post's outfit and styling
- Do NOT default to generic warm tones, beige, or neutral colors unless they are in this palette
- Do NOT use colors that are NOT in this list
- Create VARIETY in outfit styles, but maintain COLOR CONSISTENCY across all 9 posts
- Color consistency is NON-NEGOTIABLE for feed cohesion
===`
            console.log(`[v0] Color palette found: ${colorValues.join(", ")}`)
          }
        }
      }
    } catch (colorError) {
      console.error("[v0] Error processing color palette:", colorError)
    }

    // Build physical preferences section (same as Maya's concept generation)
    const physicalPreferencesSection = physicalPreferences
      ? `
🔴 PHYSICAL PREFERENCES (MANDATORY - APPLY TO EVERY PROMPT):
"${physicalPreferences}"

CRITICAL INSTRUCTIONS:
- These are USER-REQUESTED appearance modifications that MUST be in EVERY prompt
- **IMPORTANT:** Convert instruction language to descriptive language for FLUX, but PRESERVE USER INTENT
- **REMOVE INSTRUCTION PHRASES:** "Always keep my", "dont change", "keep my", "don't change my", "preserve my", "maintain my" - these are instructions, not prompt text
- **CONVERT TO DESCRIPTIVE:** Convert to descriptive appearance features while preserving intent:
  - "natural features" → describe what they are
  - "natural hair color" → actual hair color description if known, OR keep as "natural hair color" to preserve intent
  - "keep my natural hair color" → Convert to actual color (e.g., "brown hair") OR "natural hair color" (preserves intent)
- Include them RIGHT AFTER the gender/ethnicity descriptor as DESCRIPTIVE features, not instructions
- Format: "${triggerWord}, ${userEthnicity ? userEthnicity + " " : ""}${userGender}, [descriptive appearance features from user preferences], [rest of prompt]"
- Examples of CORRECT conversion:
  - "Always keep my natural features, dont change the face" → Omit instruction (face is preserved by trigger word), but keep any specific feature descriptions
  - "keep my natural hair color" → "natural hair color" OR actual color if specified (preserves intent, don't just omit)
  - "curvier body type" → "curvier body type" (descriptive, keep as-is)
  - "long blonde hair" → "long blonde hair" (descriptive, keep as-is)
  - "dont change my body" → "natural body type" OR preserve any body descriptions mentioned
- **PRESERVE USER INTENT:** Don't just remove everything - convert instructions to descriptive language that preserves what the user wants
`
      : ""

    console.log(`[v0] Generating full FLUX prompts for all posts using Maya's concept generation...`)

    // Track previous posts for variety and cohesion
    const previousPosts: Array<{ position: number; outfit?: string; location?: string; concept?: string; lighting?: string }> = []

    // Insert posts with generated captions AND full FLUX prompts
    for (let i = 0; i < strategy.posts.length; i++) {
      const post = strategy.posts[i]
      const captionResult = captionResults[i]

      try {
        console.log(`[v0] === Generating concept card and inserting post ${i + 1}/9 (position ${post.position}) ===`)

        // Build variety context from previous posts
        const varietyContext = previousPosts.length > 0
          ? `
=== CRITICAL: VARIETY + COHESION BALANCE ===
This is post ${post.position} of 9. You MUST create a DIFFERENT concept from previous posts while maintaining color and lighting cohesion:

PREVIOUS POSTS:
${previousPosts.map(pp => `- Post ${pp.position}: ${pp.outfit || "outfit"} at ${pp.location || "location"}${pp.lighting ? ` (${pp.lighting} lighting)` : ""}`).join("\n")}

**YOU MUST CREATE VARIETY IN:**
- OUTFIT STYLE (different cuts, silhouettes, garment types)
- LOCATION/SCENERY (different places, settings, environments)
- CONCEPT/MOOD (variety in poses, angles, activities)
- SHOT ANGLE/COMPOSITION (close-up, half body, full body, different perspectives)

**YOU MUST MAINTAIN COHESION IN:**
- COLOR PALETTE (use brand colors consistently across all posts)
- LIGHTING STYLE (consistent lighting mood - e.g., all soft natural, or all golden hour)
- OVERALL AESTHETIC (same brand vibe, same level of formality/casualness)

**80/20 RULE REMINDER:**
- Posts 1-8: Should feature the user (portrait shots)
- Post 9: Can be object/flatlay/scenery if needed for variety
- Current post type: ${post.postType || "portrait"}

**BALANCE:** Create variety in WHAT is shown (outfits, locations) but maintain consistency in HOW it looks (colors, lighting, aesthetic).
===`
          : `
=== VARIETY + COHESION REQUIREMENT ===
This is the FIRST post (position ${post.position} of 9). Create a strong, unique concept that sets the tone for the feed.

**ESTABLISH COHESION:**
- Use brand colors consistently (this sets the color palette for all 9 posts)
- Choose a lighting style (e.g., soft natural, golden hour, moody) that will be consistent across the feed
- Set the aesthetic tone (formal, casual, editorial, lifestyle)

**80/20 RULE:**
- Most posts (7-8) should feature the user (portrait shots)
- 1-2 posts can be object/flatlay/scenery for variety
- Current post type: ${post.postType || "portrait"}
===`

        // Generate full FLUX prompt using Maya's concept generation (same as concept cards)
        const userRequest = `${post.prompt || post.visualDirection || "Professional Instagram post"}. Position ${post.position} in a 9-post Instagram feed. Shot type: ${post.postType || "portrait"}`
        
        const conceptPrompt = `You are Maya, an elite fashion photographer with 15 years of experience shooting for Vogue, Elle, and creating viral Instagram content. You have an OBSESSIVE eye for authenticity - you know that the best images feel stolen from real life, not produced.

${fashionIntelligence}

${colorPaletteSection}

${physicalPreferencesSection}

=== LIGHTING CONSISTENCY (FOR FEED COHESION) ===
**CRITICAL:** All 9 posts in this feed must have CONSISTENT lighting style for visual cohesion.

${previousPosts.length > 0 && previousPosts[0].lighting
  ? `**ESTABLISHED LIGHTING STYLE:** ${previousPosts[0].lighting}
  
**YOU MUST USE THE SAME LIGHTING STYLE** as previous posts. Check the previous posts context above to see what lighting was used.
Maintain the same lighting mood/style across all 9 posts for feed cohesion.`
  : `**LIGHTING OPTIONS (choose ONE style and use it consistently for ALL 9 posts):**
- Soft natural lighting (warm, diffused, even)
- Golden hour lighting (warm, directional, sunset/rise)
- Moody lighting (dramatic shadows, high contrast)
- Bright natural lighting (daylight, airy, fresh)
- Soft indoor lighting (cozy, warm, intimate)

**IMPORTANT:** 
- Choose a lighting style that fits the brand vibe: ${brandProfile.brand_vibe || "authentic"}
- This lighting style will be used for ALL 9 posts in the feed
- Lighting consistency creates visual flow across the feed grid
- You can vary lighting INTENSITY and DIRECTION, but maintain the same STYLE/MOOD`}

=== NATURAL POSING REFERENCE ===
Use this for inspiration on authentic, Instagram-style poses. These are REAL influencer poses that look natural and candid:

${INFLUENCER_POSING_KNOWLEDGE}

Remember: Describe poses SIMPLY and NATURALLY, like you're telling a friend what someone is doing. Avoid technical photography language.
===

${varietyContext}

FEED POST CONTEXT:
- Position: ${post.position} of 9
- Purpose: ${post.contentPillar || "Showcase personal brand"}
- Visual Direction: ${post.prompt || post.visualDirection || "Professional and authentic"}
- Brand Vibe: ${brandProfile.brand_vibe || "authentic"}
- Shot Type: ${post.postType || "portrait"}

USER REQUEST: "${userRequest}"

MODE: FEED POST - Create 1 concept that fits this specific position in the Instagram feed grid. This is part of a cohesive 9-post story with VARIETY in outfits, locations, and concepts.

${fluxPrinciples}

**🔴 PROMPT STRUCTURE ARCHITECTURE (FOLLOW THIS ORDER):**
1. **TRIGGER WORD** (first position - MANDATORY): ${triggerWord}
2. **GENDER/ETHNICITY** (2-3 words)${userEthnicity ? `: ${userEthnicity}` : ''} ${userGender}${physicalPreferences ? `, [converted physical preferences - descriptive only, no instructions]` : ""}
3. **OUTFIT** (material + color + garment type - 6-10 words) - MUST be DIFFERENT from previous posts
4. **POSE + EXPRESSION** (simple, natural - 4-6 words) - Vary from previous posts
5. **LOCATION** (brief, atmospheric - 3-6 words) - MUST be DIFFERENT location from previous posts
6. **LIGHTING** (with imperfections - 5-8 words)
7. **TECHNICAL SPECS** (iPhone + imperfections + skin texture + grain + muted colors - 8-12 words)
8. **CASUAL MOMENT** (optional - 2-4 words)

**Total target: 50-80 words for optimal quality and detail**

**CRITICAL FOR VARIETY:**
- Choose a DIFFERENT outfit color/material/style than previous posts
- Choose a DIFFERENT location/scenery than previous posts  
- Vary the pose, angle, and composition
- Create a unique concept that stands out in the feed

Return ONLY valid JSON, no markdown:
{
  "title": "Simple, catchy title (2-4 words)",
  "description": "Quick, exciting one-liner",
  "category": "Close-Up Portrait" | "Half Body Lifestyle" | "Environmental Portrait" | "Full Body" | "Object" | "Flatlay" | "Scenery",
  "outfit": "Brief description of outfit for variety tracking",
  "location": "Brief description of location for variety tracking",
  "prompt": "YOUR CRAFTED FLUX PROMPT - MUST start with ${triggerWord}, ${userEthnicity ? userEthnicity + " " : ""}${userGender}${physicalPreferences ? `, [converted physical preferences - descriptive only]` : ""}"
}`

        const { text: conceptText } = await generateText({
          model: "anthropic/claude-sonnet-4-20250514",
          messages: [
            {
              role: "user",
              content: conceptPrompt,
            },
          ],
          maxTokens: 2000,
          temperature: 0.85,
        })

        // Parse JSON response
        let fluxPrompt = post.prompt || "" // Fallback to strategy prompt if concept generation fails
        let outfitDescription = ""
        let locationDescription = ""
        const jsonMatch = conceptText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            const concept = JSON.parse(jsonMatch[0])
            fluxPrompt = concept.prompt || post.prompt || ""
            outfitDescription = concept.outfit || ""
            locationDescription = concept.location || ""
            
            if (fluxPrompt) {
              console.log(`[v0] ✅ Generated full FLUX prompt (${fluxPrompt.split(/\s+/).length} words) for post ${post.position}`)
              if (outfitDescription) console.log(`[v0]   Outfit: ${outfitDescription}`)
              if (locationDescription) console.log(`[v0]   Location: ${locationDescription}`)
            }
          } catch (parseError) {
            console.error(`[v0] ⚠️ Failed to parse concept JSON for post ${post.position}, using strategy prompt:`, parseError)
          }
        } else {
          console.warn(`[v0] ⚠️ No JSON found in concept response for post ${post.position}, using strategy prompt`)
        }
        
        // Track this post for variety in next iterations (also track lighting for consistency)
        const lightingMatch = fluxPrompt.match(/(soft natural|golden hour|moody|bright natural|soft indoor|warm|cool|dramatic|diffused)\s+lighting/i)
        const lightingStyle = lightingMatch ? lightingMatch[0] : ""
        
        previousPosts.push({
          position: post.position,
          outfit: outfitDescription,
          location: locationDescription,
          concept: post.contentPillar || "",
          lighting: lightingStyle,
        })

        await sql`
          INSERT INTO feed_posts (
            feed_layout_id,
            user_id,
            position,
            post_type,
            content_pillar,
            caption,
            prompt,
            post_status,
            generation_status,
            created_at,
            updated_at
          ) VALUES (
            ${feedLayout.id},
            ${neonUser.id},
            ${post.position},
            ${post.postType || "post"},
            ${post.contentPillar || "general"},
            ${captionResult.caption},
            ${fluxPrompt},
            'draft',
            'pending',
            NOW(),
            NOW()
          )
        `

        if (fluxPrompt && fluxPrompt.length > 50) {
          console.log(`[v0] ✓ Successfully inserted post ${post.position} with full FLUX prompt (${fluxPrompt.split(/\s+/).length} words)`)
        } else {
          console.warn(`[v0] ⚠️ Post ${post.position} prompt is too short (${fluxPrompt.length} chars), may need enhancement later`)
        }
        postsWithCaptions.push({ ...post, caption: captionResult.caption })
      } catch (error) {
        console.error(`[v0] ✗ Error inserting post ${post.position}:`, error)
        throw error
      }
    }

    console.log("[v0] All posts inserted successfully!")
    console.log(`[v0] Caption generation summary: ${captionResults.filter(r => r.success).length} successful, ${captionResults.filter(r => !r.success).length} failed`)

    // Log strategy quality metrics
    const narrativeArcPosts = strategy.posts.filter((p: any) => p.narrativeRole).length
    const contentPillars = new Set(strategy.posts.map((p: any) => p.contentPillar)).size
    console.log("[v0] Strategy quality metrics:")
    console.log(`[v0]  - Posts with narrative role: ${narrativeArcPosts}/9`)
    console.log(`[v0]  - Unique content pillars: ${contentPillars}`)
    console.log(`[v0]  - Posts with hook concepts: ${strategy.posts.filter((p: any) => p.hookConcept).length}/9`)
    console.log(`[v0]  - Posts with CTA concepts: ${strategy.posts.filter((p: any) => p.ctaConcept).length}/9`)

    // Automatically queue all images for generation (fire and forget)
    // Call queue-all-images logic directly instead of HTTP to avoid auth issues
    console.log("[v0] ==================== QUEUEING IMAGES FOR GENERATION ====================")
    console.log("[v0] Feed layout ID:", feedLayout.id)
    
    // Call queue function directly (non-blocking, fire and forget)
    const { queueAllImagesForFeed } = await import("@/lib/feed-planner/queue-images")
    const origin = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "http://localhost:3000"
    
    // Map customSettings to the format expected by queue-images
    const queueSettings = customSettings ? {
      styleStrength: customSettings.styleStrength,
      promptAccuracy: customSettings.promptAccuracy,
      aspectRatio: customSettings.aspectRatio,
      realismStrength: customSettings.realismStrength,
      extraLoraScale: customSettings.realismStrength, // Map realismStrength to extraLoraScale
    } : undefined
    
    queueAllImagesForFeed(feedLayout.id, authUser.id, origin, queueSettings)
      .then((result) => {
        console.log("[v0] ✅ Queue-all-images success:", result)
      })
      .catch((error: any) => {
        console.error("[v0] ❌ Error queueing images (non-blocking):", error)
        console.error("[v0] Error details:", {
          message: error.message,
          stack: error.stack,
        })
        // Non-blocking - strategy is created, images can be generated manually if needed
      })

    console.log("[v0] ==================== CREATE STRATEGY API COMPLETE ====================")
    console.log("[v0] Feed layout ID type:", typeof feedLayout.id)
    console.log("[v0] Returning feedLayoutId:", feedLayout.id)

    // Ensure feedLayoutId is a number
    const feedLayoutId = Number(feedLayout.id)
    if (isNaN(feedLayoutId)) {
      console.error("[v0] ERROR: feedLayout.id is not a valid number:", feedLayout.id)
      throw new Error("Failed to create feed - invalid feed ID")
    }

    return NextResponse.json({
      success: true,
      feedLayoutId: feedLayoutId,
      message: "Strategy created! Images are being generated automatically.",
    })
  } catch (error) {
    console.error("[v0] Feed Planner API error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create feed strategy",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
