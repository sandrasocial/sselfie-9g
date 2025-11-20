import { generateText } from "ai"

interface InstagramStrategyParams {
  userId: string
  feedLayoutId: number
  brandProfile: any
  feedPosts: Array<{
    position: number
    shotType: string
    purpose: string
    caption: string
    prompt: string
  }>
  targetAudience: string
  businessType: string
  niche: string
}

export interface InstagramStrategy {
  overallStrategy: string
  postingStrategy: {
    optimalTimes: Array<{ day: string; time: string; reason: string }>
    frequency: string
    bestDays: string[]
  }
  contentStrategy: {
    whenToSell: string
    whenToStory: string
    whenToEducate: string
    whenToInspire: string
  }
  storyStrategy: Array<{
    postNumber: number
    storySequence: string[]
    storyTiming: string
    storyPurpose: string
  }>
  reelStrategy: Array<{
    postNumber: number
    reelConcept: string
    coverPhotoTips: string
    audioRecommendation: string
    hookSuggestion: string
  }>
  carouselStrategy: Array<{
    postNumber: number
    carouselIdea: string
    slideBreakdown: string[]
  }>
  trendStrategy: {
    whenToUseTrends: string
    trendingAudio: string[]
    trendingFormats: string[]
    personalBrandAlignment: string
  }
  textOverlayStrategy: {
    whenToUseText: string
    hookFormulas: string[]
    fontStyles: string
  }
  growthTactics: {
    followerGrowth: string[]
    engagementBoosts: string[]
    conversionTactics: string[]
  }
  hashtagStrategy: {
    mainHashtags: string[]
    rotatingHashtags: string[]
    hashtagPlacement: string
  }
}

export async function generateInstagramStrategy(params: InstagramStrategyParams): Promise<InstagramStrategy> {
  const { brandProfile, feedPosts, targetAudience, businessType, niche } = params

  console.log("[v0] Instagram Strategy Agent: Starting comprehensive strategy generation...")

  const strategyPrompt = `You are an expert Instagram Growth Strategist specializing in personal brands and storytelling.

Your task is to create a COMPREHENSIVE, DETAILED Instagram strategy for a ${businessType} in the ${niche} niche.

**BRAND CONTEXT:**
- Target Audience: ${targetAudience}
- Brand Voice: ${brandProfile.brand_voice || "authentic"}
- Brand Story: ${brandProfile.origin_story || "building personal brand"}
- Content Pillars: ${brandProfile.content_pillars || "education, inspiration, connection"}

**THE 9-POST FEED LAYOUT:**
${feedPosts
  .map(
    (post) => `
Post ${post.position}: ${post.shotType}
Purpose: ${post.purpose}
Caption Preview: ${post.caption.substring(0, 100)}...
`,
  )
  .join("\n")}

**YOUR MISSION:**
Create a detailed Instagram growth strategy that covers EVERY aspect of this 9-post feed execution. Research the latest best practices (2025) and provide specific, actionable guidance.

**REQUIRED OUTPUT (NO LENGTH LIMITS - BE THOROUGH):**

1. **OVERALL STRATEGY**
   - What is the overarching narrative across these 9 posts?
   - How does this feed build their personal brand?
   - What transformation will followers experience?

2. **POSTING STRATEGY**
   - Optimal posting times for each of the 9 posts (specific days/times with reasoning)
   - Posting frequency recommendations
   - Best days for maximum engagement in this niche

3. **CONTENT MIX STRATEGY**
   - When to SELL (which posts should have soft/hard CTAs)
   - When to EDUCATE (which posts provide value without asking)
   - When to STORY-TELL (vulnerability and connection moments)
   - When to INSPIRE (aspirational content)

4. **STORIES STRATEGY FOR EACH POST**
   For EACH of the 9 feed posts, provide:
   - Story sequence to post (before, during, or after feed post)
   - Specific story ideas that complement the feed post
   - Story timing (morning stories vs evening stories)
   - Purpose of each story sequence (engagement, sales, connection)

5. **REELS STRATEGY**
   - Which posts should become Reels?
   - Reel concepts for each suitable post
   - Cover photo tips (using the feed image to maintain aesthetic)
   - Trending audio recommendations (specific songs/sounds for ${niche})
   - Hook suggestions for first 3 seconds
   - Text overlay strategies

6. **CAROUSEL STRATEGY**
   - Which posts work best as carousels?
   - Slide-by-slide breakdown for carousel posts
   - How to use the feed image as slide 1 to maintain visual consistency

7. **TREND UTILIZATION**
   - When to jump on trending audio vs use original
   - Current trending formats in ${niche} (2025)
   - How to adapt trends while staying on-brand
   - Which of the 9 posts are trend-friendly

8. **TEXT OVERLAY & HOOKS**
   - Which posts benefit from text overlays
   - Specific hook formulas for ${targetAudience}
   - Font styles that match brand aesthetic
   - When to use bold statements vs subtle text

9. **GROWTH TACTICS**
   - Follower growth strategies specific to ${businessType}
   - Engagement boosting tactics for each post type
   - Conversion tactics (followers → customers)
   - Community building through comments and DMs

10. **HASHTAG STRATEGY**
    - Main hashtag set (use for all posts)
    - Rotating hashtags (vary by post)
    - Hashtag placement strategy
    - Niche-specific vs broad hashtags

**IMPORTANT:**
- Be SPECIFIC with times, days, audio names, hashtags
- NO vague advice - actionable only
- Reference current 2025 Instagram algorithm insights
- Tailor everything to ${niche} and personal branding
- Consider their story: ${brandProfile.origin_story || "building authority"}

Return your response as structured JSON matching the InstagramStrategy interface.`

  try {
    const { text } = await generateText({
      model: "anthropic/claude-sonnet-4.5",
      system: `You are an Instagram Growth Strategist with deep expertise in:
- Personal brand storytelling
- Instagram algorithm (2025)
- Viral content patterns
- Engagement psychology
- Creator economy trends
- Story sequencing
- Reels strategy
- Carousel storytelling
- Trending audio and formats

You use Claude's native web search to stay updated on the latest Instagram best practices, trending audio, viral formats, and algorithm changes.

You provide COMPREHENSIVE strategies with NO length limits - your advice is thorough, specific, and actionable.`,
      prompt: strategyPrompt,
      temperature: 0.8,
      maxTokens: 16000,
    })

    console.log("[v0] Instagram Strategy Agent: Strategy generated, parsing JSON...")

    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("No valid JSON found in response")
    }

    const strategy: InstagramStrategy = JSON.parse(jsonMatch[0])

    console.log("[v0] Instagram Strategy Agent: Strategy complete!")
    return strategy
  } catch (error) {
    console.error("[v0] Instagram Strategy Agent: Generation failed:", error)

    // Fallback strategy
    return {
      overallStrategy: `Your 9-post Instagram feed tells a compelling story for ${targetAudience}. Each post builds on the last, creating a cohesive narrative that positions you as an authority in ${niche} while staying authentic and relatable.`,
      postingStrategy: {
        optimalTimes: [
          { day: "Monday", time: "7:00 AM", reason: "Catch morning scroll" },
          { day: "Wednesday", time: "12:00 PM", reason: "Lunch break engagement" },
          { day: "Friday", time: "6:00 PM", reason: "Weekend wind-down" },
        ],
        frequency: "Post 3 times per week, spacing posts 2-3 days apart for optimal reach",
        bestDays: ["Monday", "Wednesday", "Friday"],
      },
      contentStrategy: {
        whenToSell: "Posts 3, 6, and 9 - After providing value, introduce soft CTAs",
        whenToStory: "Posts 1, 4, and 7 - Open with vulnerability to build connection",
        whenToEducate: "Posts 2, 5, and 8 - Pure value, no ask",
        whenToInspire: "All posts should inspire, but especially posts 1, 4, and 9",
      },
      storyStrategy: feedPosts.map((post) => ({
        postNumber: post.position,
        storySequence: [
          "Behind-the-scenes story 1 hour before post",
          "Share post to story with engagement sticker",
          "Follow-up story answering questions 4 hours later",
        ],
        storyTiming: "Morning stories 8-9 AM, evening stories 7-8 PM",
        storyPurpose: `Build anticipation and community around Post ${post.position}`,
      })),
      reelStrategy: feedPosts
        .filter((post) => [1, 3, 5, 7, 9].includes(post.position))
        .map((post) => ({
          postNumber: post.position,
          reelConcept: `Transform Post ${post.position} into engaging Reel showcasing ${post.shotType}`,
          coverPhotoTips: "Use the feed image as cover to maintain aesthetic consistency",
          audioRecommendation: "Trending audio in personal branding niche",
          hookSuggestion: `Start with pattern interrupt relevant to ${post.purpose}`,
        })),
      carouselStrategy: feedPosts
        .filter((post) => [2, 4, 6, 8].includes(post.position))
        .map((post) => ({
          postNumber: post.position,
          carouselIdea: `Educational carousel expanding on ${post.purpose}`,
          slideBreakdown: ["Slide 1: Feed image as hook", "Slides 2-5: Key teaching points", "Slide 6: Call to action"],
        })),
      trendStrategy: {
        whenToUseTrends: "Use trending audio for Reels, stay authentic for feed posts",
        trendingAudio: ["Current trending sounds for personal brands"],
        trendingFormats: ["Story-time format", "Educational carousels", "Behind-the-scenes"],
        personalBrandAlignment: "Adapt trends to fit your unique voice and message",
      },
      textOverlayStrategy: {
        whenToUseText: "Use on Reels for hooks, avoid on main feed images to maintain aesthetic",
        hookFormulas: [
          "The [number] things I wish I knew about [topic]",
          "Why [common belief] is keeping you stuck",
          "How I [transformation] in [timeframe]",
        ],
        fontStyles: "Bold, modern sans-serif that matches brand aesthetic",
      },
      growthTactics: {
        followerGrowth: [
          "Consistent posting schedule",
          "Engage with target audience daily",
          "Collaborate with similar creators",
          "Share valuable lead magnets",
        ],
        engagementBoosts: [
          "Ask questions in captions",
          "Use engagement stickers in Stories",
          "Respond to all comments within 1 hour",
          "Create shareable content",
        ],
        conversionTactics: [
          "Link in bio strategy",
          "Story highlight for services",
          "Regular value-driven DM conversations",
          "Email list building through Stories",
        ],
      },
      hashtagStrategy: {
        mainHashtags: [`#${businessType}`, `#${niche}`, "#PersonalBrand", "#ContentCreator", "#Storytelling"],
        rotatingHashtags: ["Niche-specific hashtags", "Location hashtags", "Community hashtags", "Trending hashtags"],
        hashtagPlacement: "Add hashtags in first comment to keep caption clean",
      },
    }
  }
}
