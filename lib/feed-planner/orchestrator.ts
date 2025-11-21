import { generateText } from "ai"
import { neon } from "@neondatabase/serverless"
import { generateFeedLayout, type FeedLayoutStrategy } from "./layout-strategist"
import { generateVisualComposition, type VisualComposition } from "./visual-composition-expert"
import { conductContentResearch } from "../content-research-strategist/research-logic"
import { generateInstagramBio } from "../instagram-bio-strategist/bio-logic"
import { generateInstagramCaption } from "./caption-writer"
import { MAYA_PERSONALITY } from "../maya/personality"

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

  const [userModel] = await sql`
    SELECT trigger_word FROM user_models
    WHERE user_id = ${userId}
    AND training_status = 'succeeded'
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
  const triggerWord = userModel?.trigger_word || ""

  console.log("[v0] Feed Planner: Using trigger word:", triggerWord || "none")

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
      system: `${MAYA_PERSONALITY}

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

  // Step 7: Generate visual compositions and prompts for each post
  console.log("[v0] Feed Planner: Generating compositions for 9 posts...")
  const posts = await Promise.all(
    layoutStrategy.posts.map(async (postLayout, index) => {
      console.log(`[v0] Feed Planner: Generating post ${index + 1}/9...`)

      try {
        const composition = await generateVisualComposition({
          postPosition: postLayout.position,
          shotType: postLayout.shotType,
          purpose: postLayout.purpose,
          visualDirection: postLayout.visualDirection,
          brandVibe,
          authUserId,
          triggerWord,
        })

        const fluxPrompt =
          triggerWord && !composition.fluxPrompt.startsWith(triggerWord)
            ? `${triggerWord} ${composition.fluxPrompt}`
            : composition.fluxPrompt

        const { caption } = await generateInstagramCaption({
          postPosition: postLayout.position,
          shotType: postLayout.shotType,
          purpose: postLayout.purpose,
          emotionalTone: composition.emotionalTone,
          brandProfile,
          targetAudience,
          brandVoice: brandProfile.brand_voice || "authentic",
          contentPillar: postLayout.purpose,
        })

        console.log(`[v0] Feed Planner: Post ${index + 1} composition and caption complete`)

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
            post_status
          ) VALUES (
            ${feedLayoutId},
            ${userId},
            ${postLayout.position},
            ${"photo"},
            ${truncateString(fluxPrompt, 2000)},
            ${truncateString(caption, 5000)},
            ${postLayout.purpose},
            ${"pending"},
            ${"draft"}
          )
        `

        return {
          position: postLayout.position,
          prompt: fluxPrompt,
          caption,
          visualComposition: composition,
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

  // Step 9: Generate profile image prompt
  console.log("[v0] Feed Planner: Creating profile image prompt...")
  const profileImagePrompt = triggerWord
    ? `${triggerWord} professional headshot, clean background, confident smile, natural lighting, high quality portrait photography`
    : "professional headshot, clean background, confident smile, natural lighting, high quality portrait photography"

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
