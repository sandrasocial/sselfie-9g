import { generateText } from "ai"
import { neon } from "@neondatabase/serverless"
import { generateFeedLayout, type FeedLayoutStrategy } from "./layout-strategist"
import { conductContentResearch } from "../content-research-strategist/research-logic"
import { generateInstagramBio } from "../instagram-bio-strategist/bio-logic"
import { generateInstagramCaption } from "./caption-writer"
import { getMayaSystemPrompt, MAYA_CLASSIC_CONFIG } from "../maya/mode-adapters"
import { getFluxPromptingPrinciples } from "../maya/flux-prompting-principles"
import { getFashionIntelligencePrinciples } from "../maya/fashion-knowledge-2025"
import INFLUENCER_POSING_KNOWLEDGE from "../maya/influencer-posing-knowledge"
import INSTAGRAM_LOCATION_INTELLIGENCE from "../maya/instagram-location-intelligence"
import { getLuxuryLifestyleSettings } from "../maya/luxury-lifestyle-settings"
import { detectRequiredMode, detectProModeType } from "./mode-detection"

const sql = neon(process.env.DATABASE_URL!)

interface FeedPlannerParams {
  userId: string
  authUserId: string // Added to pass Supabase auth ID for getUserContextForMaya
  request: string
  chatId?: number
}

export interface FeedPlan {
  feedLayoutId: number
  strategy: FeedLayoutStrategy
  posts: Array<{
    position: number
    prompt: string
    caption: string
    visualComposition: VisualComposition
    contentPillar: string
  }>
  bio: string
  hashtags: string[]
  profileImagePrompt: string
}

function truncateString(str: string | null | undefined, maxLength: number): string {
  if (!str) return ""
  return str.length > maxLength ? str.substring(0, maxLength) : str
}

export async function orchestrateFeedPlanning(params: FeedPlannerParams): Promise<FeedPlan> {
  const { userId, authUserId, request } = params // Added authUserId

  console.log("[v0] Feed Planner: Starting orchestration for user", userId)

  // Step 1: Get user's personal brand and profile
  console.log("[v0] Feed Planner: Fetching brand profile and user data...")
  const [brandProfile] = await sql`
    SELECT * FROM user_personal_brand
    WHERE user_id = ${userId}
    AND is_completed = true
    LIMIT 1
  `

  const [userProfile] = await sql`
    SELECT * FROM user_profiles
    WHERE user_id = ${userId}
    LIMIT 1
  `

  // Get user model with trigger word - use same query format as concept cards
  const userModelResult = await sql`
    SELECT trigger_word, training_status 
    FROM user_models
    WHERE user_id = ${userId}
    AND training_status = 'completed'
    ORDER BY created_at DESC
    LIMIT 1
  `

  if (!brandProfile) {
    throw new Error("Please complete your personal brand profile first")
  }

  console.log("[v0] Feed Planner: Brand profile loaded successfully")

  const businessType = brandProfile.business_type || "creator"
  const brandVibe = brandProfile.brand_vibe || "authentic"
  const targetAudience = brandProfile.target_audience || "general audience"
  const niche = brandProfile.business_type || "lifestyle"
  const colorPalette = brandProfile.color_palette || null
  
  // Use same fallback as concept cards: user${userId} if no trigger word
  const triggerWord = userModelResult[0]?.trigger_word || `user${userId}`

  console.log("[v0] Feed Planner: Using trigger word:", triggerWord)

  // Step 2: Conduct content research (parallel with Maya consultation)
  console.log("[v0] Feed Planner: Conducting content research...")
  let research
  try {
    research = await conductContentResearch({
      userId,
      niche,
      brandProfile,
    })
    console.log("[v0] Feed Planner: Content research completed successfully")
  } catch (error) {
    console.log("[v0] Feed Planner: Research failed, using fallback data")
    research = {
      researchSummary: `Instagram best practices for ${niche}: Focus on authentic content, consistent posting, engaging captions, and high-quality visuals.`,
      trendingHashtags: [
        "#PersonalBranding",
        "#ContentCreator",
        "#InstagramTips",
        "#SocialMediaMarketing",
        "#DigitalMarketing",
      ],
      contentIdeas: [],
      viralPatterns: [],
      competitorInsights: "",
    }
  }

  // Step 3: Maya analyzes the request
  console.log("[v0] Feed Planner: Maya analyzing request...")
  let mayaAnalysisText
  try {
    const mayaAnalysis = await generateText({
      model: "anthropic/claude-haiku-4.5",
      system: `${getMayaSystemPrompt(MAYA_CLASSIC_CONFIG)}

You're helping design an Instagram feed. Analyze what the user wants and extract key details.

Provide:
1. Feed goal (what they want to achieve)
2. Content themes (topics to cover)
3. Aesthetic preferences (visual style)
4. Any specific requests`,
      prompt: `User request: ${request}

Based on their personal brand:
${JSON.stringify(brandProfile, null, 2)}

What Instagram feed should we create?`,
      temperature: 0.7,
    })
    mayaAnalysisText = mayaAnalysis.text
    console.log("[v0] Feed Planner: Maya's analysis complete")
  } catch (error) {
    console.log("[v0] Feed Planner: Maya analysis failed, using fallback:", error)
    mayaAnalysisText = `Creating a strategic Instagram feed for ${brandVibe} personal brand focusing on ${niche} content. The feed will showcase authentic storytelling and high-quality visuals aligned with the brand's core values and target audience of ${targetAudience}.`
  }

  // Step 5: Generate feed layout strategy
  console.log("[v0] Feed Planner: Generating feed layout...")
  let layoutStrategy
  try {
    layoutStrategy = await generateFeedLayout({
      businessType,
      brandVibe,
      targetAudience,
      niche,
      colorPalette: colorPalette ? JSON.stringify(colorPalette) : undefined,
      researchInsights: research.researchSummary,
    })
    console.log("[v0] Feed Planner: Layout strategy generated:", layoutStrategy.gridPattern)
  } catch (error) {
    console.error("[v0] Feed Planner: Layout generation failed:", error)
    throw new Error("Failed to generate feed layout strategy. Please try again.")
  }

  // Step 6: Create feed layout in database
  console.log("[v0] Feed Planner: Saving feed layout to database...")
  const [feedLayout] = await sql`
    INSERT INTO feed_layouts (
      user_id,
      title,
      description,
      business_type,
      brand_vibe,
      layout_type,
      visual_rhythm,
      color_palette,
      feed_story,
      research_insights,
      status
    ) VALUES (
      ${userId},
      ${truncateString("Strategic Instagram Feed", 255)},
      ${truncateString(mayaAnalysisText, 500)},
      ${truncateString(businessType, 50)},
      ${truncateString(brandVibe, 50)},
      ${truncateString(layoutStrategy.gridPattern, 50)},
      ${truncateString(layoutStrategy.visualRhythm, 255)},
      ${colorPalette ? JSON.stringify(colorPalette) : null},
      ${truncateString(layoutStrategy.overallStrategy, 1000)},
      ${truncateString(research.researchSummary, 1000)},
      ${"draft"}
    )
    RETURNING id
  `

  const feedLayoutId = feedLayout.id
  console.log("[v0] Feed Planner: Feed layout saved with ID:", feedLayoutId)

  // Step 7: Generate concept cards for each post using Maya's proven concept generation
  console.log("[v0] Feed Planner: Generating concept cards for 9 posts using Maya's logic...")
  
  // Get user data for concept generation (same as concept cards)
  const userDataResult = await sql`
    SELECT u.gender, u.ethnicity, um.trigger_word, upb.physical_preferences
    FROM users u
    LEFT JOIN user_models um ON u.id = um.user_id AND um.training_status = 'completed'
    LEFT JOIN user_personal_brand upb ON u.id = upb.user_id
    WHERE u.id = ${userId} 
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
  const actualTriggerWord = userDataResult[0]?.trigger_word || triggerWord

  const fashionIntelligence = getFashionIntelligencePrinciples(userGender, userEthnicity)
  const fluxPrinciples = getFluxPromptingPrinciples()

  const posts = await Promise.all(
    layoutStrategy.posts.map(async (postLayout, index) => {
      console.log(`[v0] Feed Planner: Generating concept card for post ${index + 1}/9...`)

      try {
        // Build user request from feed post context
        const userRequest = `${postLayout.visualDirection}. ${postLayout.purpose}. Position ${postLayout.position} in a 9-post Instagram feed with ${brandVibe} aesthetic. Shot type: ${postLayout.shotType}`
        
        // Generate concept using Maya's concept generation logic
        const conceptPrompt = `You are Maya, an elite fashion photographer with 15 years of experience shooting for Vogue, Elle, and creating viral Instagram content. You have an OBSESSIVE eye for authenticity - you know that the best images feel stolen from real life, not produced.

${fashionIntelligence}

=== NATURAL POSING REFERENCE ===
Use this for inspiration on authentic, Instagram-style poses. These are REAL influencer poses that look natural and candid:

${INFLUENCER_POSING_KNOWLEDGE}

Remember: Describe poses SIMPLY and NATURALLY, like you're telling a friend what someone is doing. Avoid technical photography language.

**IMPORTANT:** This is REFERENCE MATERIAL for inspiration. Maya generates diverse poses naturally based on context - she does NOT randomly select from this list.
===

=== INSTAGRAM LOCATION INTELLIGENCE (REFERENCE) ===
Use this as inspiration for diverse, Instagram-worthy locations. These are examples to spark creativity:

${INSTAGRAM_LOCATION_INTELLIGENCE}

**IMPORTANT:** This is REFERENCE MATERIAL for inspiration. Maya generates diverse locations naturally based on context - she does NOT randomly select from this list.
===

=== LUXURY LIFESTYLE SETTINGS (REFERENCE) ===
Use this as guidance for elevating content with subtle luxury markers:

${getLuxuryLifestyleSettings()}

**IMPORTANT:** This is REFERENCE MATERIAL for inspiration. Maya integrates luxury elements naturally based on context - she does NOT randomly select from this list.
===

FEED POST CONTEXT:
- Position: ${postLayout.position} of 9
- Purpose: ${postLayout.purpose}
- Visual Direction: ${postLayout.visualDirection}
- Brand Vibe: ${brandVibe}
- Shot Type: ${postLayout.shotType}
${colorPalette ? `- Color Palette: ${typeof colorPalette === 'string' ? colorPalette : JSON.stringify(colorPalette)}` : ''}

USER REQUEST: "${userRequest}"

MODE: FEED POST - Create 1 concept that fits this specific position in the Instagram feed grid. This is part of a cohesive 9-post story.

${fluxPrinciples}

**🔴 PROMPT STRUCTURE ARCHITECTURE (FOLLOW THIS ORDER):**
1. **TRIGGER WORD** (first position - MANDATORY): ${actualTriggerWord}
2. **GENDER/ETHNICITY** (2-3 words)${userEthnicity ? `: ${userEthnicity}` : ''} ${userGender}
3. **OUTFIT** (material + color + garment type - 6-10 words)
4. **POSE + EXPRESSION** (simple, natural - 4-6 words)
5. **LOCATION** (brief, atmospheric - 3-6 words)
6. **LIGHTING** (with imperfections - 5-8 words)
7. **TECHNICAL SPECS** (iPhone + imperfections + skin texture + grain + muted colors - 8-12 words)
8. **CASUAL MOMENT** (optional - 2-4 words)

**Total target: 50-80 words for optimal quality and detail**

Return ONLY valid JSON, no markdown:
{
  "title": "Simple, catchy title (2-4 words)",
  "description": "Quick, exciting one-liner",
  "category": "Close-Up Portrait" | "Half Body Lifestyle" | "Environmental Portrait" | "Full Body" | "Object" | "Flatlay" | "Scenery",
  "prompt": "YOUR CRAFTED FLUX PROMPT - MUST start with ${actualTriggerWord}, ${userEthnicity ? userEthnicity + " " : ""}${userGender}${physicalPreferences ? `, [converted physical preferences - descriptive only]` : ""}"
}`

        const { text } = await generateText({
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

        // Parse JSON response - try to find JSON object
        let concept: any = null
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            concept = JSON.parse(jsonMatch[0])
          } catch (parseError) {
            console.error(`[v0] Feed Planner: Failed to parse concept JSON:`, parseError)
            throw new Error("Failed to parse concept JSON response")
          }
        } else {
          throw new Error("No JSON object found in concept response")
        }

        const fluxPrompt = concept?.prompt || ""
        
        if (!fluxPrompt) {
          throw new Error("Concept generated but no prompt found in response")
        }
        
        console.log(`[v0] Feed Planner: Post ${index + 1} concept generated (${fluxPrompt.split(/\s+/).length} words): ${fluxPrompt.substring(0, 100)}...`)

        // Collect previous captions for uniqueness
        const previousCaptions = posts
          .slice(0, index)
          .map((prevPost: any) => ({
            position: prevPost.position,
            caption: prevPost.caption || "",
          }))

        const { caption } = await generateInstagramCaption({
          postPosition: postLayout.position,
          shotType: postLayout.shotType,
          purpose: postLayout.purpose,
          emotionalTone: concept.category || "authentic",
          brandProfile,
          targetAudience,
          brandVoice: brandProfile.brand_voice || "authentic",
          contentPillar: postLayout.purpose,
          hookConcept: postLayout.hookConcept,
          storyConcept: postLayout.storyConcept,
          valueConcept: postLayout.valueConcept,
          ctaConcept: postLayout.ctaConcept,
          hashtags: postLayout.hashtags,
          previousCaptions,
          narrativeRole: postLayout.narrativeRole,
        })

        console.log(`[v0] Feed Planner: Post ${index + 1} concept card and caption complete`)

        // Save actual shotType as post_type (not just "photo") so queue-all-images can use it
        // Map shotType to post_type: selfie/half body/full body = "portrait", object/flatlay/scenery = shotType
        let postType = postLayout.shotType
        if (postLayout.shotType === "selfie" || postLayout.shotType === "half body" || postLayout.shotType === "full body") {
          postType = "portrait"
        } else if (postLayout.shotType === "object" || postLayout.shotType === "flatlay" || postLayout.shotType === "scenery" || postLayout.shotType === "place") {
          postType = postLayout.shotType // Keep as-is for non-user posts
        }

        // Detect Pro Mode requirements
        const generationMode = detectRequiredMode({
          post_type: postType,
          description: postLayout.purpose,
          prompt: fluxPrompt,
          content_pillar: postLayout.purpose,
        })
        const proModeType = generationMode === 'pro' 
          ? detectProModeType({
              generation_mode: generationMode,
              post_type: postType,
              description: postLayout.purpose,
              prompt: fluxPrompt,
              content_pillar: postLayout.purpose,
            })
          : null

        await sql`
          INSERT INTO feed_posts (
            feed_layout_id,
            user_id,
            position,
            post_type,
            prompt,
            caption,
            content_pillar,
            generation_status,
            post_status,
            generation_mode,
            pro_mode_type
          ) VALUES (
            ${feedLayoutId},
            ${userId},
            ${postLayout.position},
            ${postType},
            ${truncateString(fluxPrompt, 2000)},
            ${truncateString(caption, 5000)},
            ${postLayout.purpose},
            ${"pending"},
            ${"draft"},
            ${generationMode},
            ${proModeType}
          )
        `

        return {
          position: postLayout.position,
          prompt: fluxPrompt,
          caption,
          visualComposition: {
            emotionalTone: concept.category || "authentic",
            fluxPrompt: fluxPrompt,
          },
          contentPillar: postLayout.purpose,
        }
      } catch (error) {
        console.error(`[v0] Feed Planner: Failed to generate post ${index + 1}:`, error)
        throw error
      }
    }),
  )

  console.log("[v0] Feed Planner: All 9 posts generated successfully")

  // Step 8b: Generate Instagram bio
  console.log("[v0] Feed Planner: Generating Instagram bio...")
  let bioResult
  try {
    bioResult = await generateInstagramBio({
      userId,
      businessType,
      brandVibe,
      brandVoice: brandProfile.brand_voice || "authentic",
      targetAudience,
      businessGoals: brandProfile.business_goals,
      researchData: research.researchSummary,
    })
    console.log("[v0] Feed Planner: Bio generated")
  } catch (error) {
    console.log("[v0] Feed Planner: Bio generation failed, using fallback:", error)
    bioResult = {
      bio: `${businessType} | ${brandVibe} storyteller | Helping ${targetAudience} thrive`,
    }
  }

  // Save bio to database
  await sql`
    INSERT INTO instagram_bios (
      user_id,
      feed_layout_id,
      bio_text
    ) VALUES (
      ${userId},
      ${feedLayoutId},
      ${(bioResult as any).bio}
    )
  `

  // Step 9: Generate profile image prompt using Maya's expertise
  console.log("[v0] Feed Planner: Creating profile image prompt with Maya...")
  // Profile image should use the same quality standards as feed posts
  // For now, create a basic prompt that will be enhanced by generate-feed-prompt route when actually generating
  // This ensures consistency with feed post prompts
  const profileImagePrompt = triggerWord
    ? `${triggerWord} professional headshot portrait, clean neutral background, confident natural expression, shot on iPhone 15 Pro, natural skin texture with pores visible, visible film grain, muted color palette, uneven lighting, mixed color temperatures`
    : "professional headshot portrait, clean neutral background, confident natural expression, shot on iPhone 15 Pro, natural skin texture with pores visible, visible film grain, muted color palette, uneven lighting, mixed color temperatures"

  const hashtagsArray = research.trendingHashtags.slice(0, 30)

  await sql`
    UPDATE feed_layouts
    SET 
      profile_image_prompt = ${profileImagePrompt},
      hashtags = ${hashtagsArray}
    WHERE id = ${feedLayoutId}
  `

  console.log("[v0] Feed Planner: Orchestration complete! Feed created with ID", feedLayoutId)

  return {
    feedLayoutId,
    strategy: layoutStrategy,
    posts,
    bio: (bioResult as any).bio,
    hashtags: hashtagsArray,
    profileImagePrompt,
  }
}
