import { generateText } from "ai"

interface CaptionWriterParams {
  postPosition: number
  shotType: string
  purpose: string
  emotionalTone: string
  brandProfile: any
  targetAudience: string
  brandVoice: string
  contentPillar?: string
}

interface BioCaptionWriterParams {
  businessType: string
  brandVibe: string
  brandVoice: string
  targetAudience: string
  businessGoals?: string
  researchInsights: string
  niche: string
}

export async function generateInstagramCaption(params: CaptionWriterParams): Promise<{ caption: string }> {
  const { postPosition, shotType, purpose, emotionalTone, brandProfile, targetAudience, brandVoice, contentPillar } =
    params

  console.log(`[v0] Caption Writer: Creating caption for post ${postPosition}`)

  const captionPrompt = `Create an Instagram caption for post position ${postPosition}.

POST CONTEXT:
- Shot Type: ${shotType}
- Purpose: ${purpose}
- Emotional Tone: ${emotionalTone}
- Content Pillar: ${contentPillar || purpose}

BRAND PROFILE:
${JSON.stringify(brandProfile, null, 2)}

TARGET AUDIENCE: ${targetAudience}
BRAND VOICE: ${brandVoice}

CRITICAL INSTRUCTIONS:
1. Research current Instagram caption best practices using your native web search
2. Determine optimal caption length for this post position and content type
3. Write ONLY the final caption - NO research notes, NO strategy explanation, NO metadata
4. Output the ready-to-post caption text ONLY

CAPTION REQUIREMENTS:
- Hook-Story-Value-CTA structure
- Simple, everyday conversational language
- Strategic line breaks (every 1-2 sentences)
- 3-5 emojis naturally placed
- 5-8 relevant hashtags at the end
- Optimal length based on research (no artificial limits)

OUTPUT FORMAT:
Return ONLY the caption text that would be pasted directly into Instagram.
Do NOT include:
- Research findings
- Strategy explanations  
- Caption length specs
- Metadata or analysis
- Formatting instructions

Just the caption itself, ready to post.`

  const { text } = await generateText({
    model: "anthropic/claude-sonnet-4.5", // Using simpler working model identifier
    system: `You are an elite Instagram Caption Writer.

CRITICAL OUTPUT RULE:
You output ONLY the final caption text - nothing else.
NO research explanations, NO strategy notes, NO metadata.
Just the caption exactly as it should appear on Instagram.

Your expertise:
- Research-backed caption length optimization
- Storytelling frameworks and engagement psychology
- Strategic formatting with line breaks
- Balanced emoji usage (3-5 per caption)
- Current trends and viral patterns
- Hashtag research for visibility

You have native web search to research current best practices.

OUTPUT: Only the caption text, ready to post.`,
    prompt: captionPrompt,
    maxOutputTokens: 2000, // Added maxOutputTokens like working examples
    temperature: 0.8,
  })

  let caption = text.trim()

  // Remove any research headers or strategy sections
  if (caption.includes("RESEARCH PHASE") || caption.includes("CAPTION SPECS") || caption.includes("WHY THIS LENGTH")) {
    // Extract the actual caption between research and specs
    const captionStart = caption.indexOf("\n\n") + 2
    const specsStart = caption.indexOf("CAPTION SPECS")
    if (specsStart > -1) {
      caption = caption.substring(captionStart, specsStart).trim()
    }
  }

  console.log(`[v0] Caption Writer: Caption created for post ${postPosition} (${caption.length} characters)`)

  return { caption }
}

export async function generateInstagramBioCaption(params: BioCaptionWriterParams): Promise<{ bio: string }> {
  const { businessType, brandVibe, brandVoice, targetAudience, businessGoals, researchInsights, niche } = params

  console.log("[v0] Caption Writer: Creating Instagram bio")

  const bioPrompt = `Create a compelling Instagram bio that attracts genuine followers.

BRAND CONTEXT:
- Business Type: ${businessType}
- Brand Vibe: ${brandVibe}
- Brand Voice: ${brandVoice}
- Target Audience: ${targetAudience}
- Business Goals: ${businessGoals || "Build engaged community"}
- Niche: ${niche}

RESEARCH INSIGHTS:
${researchInsights}

BIO REQUIREMENTS:
1. Maximum 150 characters (Instagram limit)
2. Simple, everyday language
3. Clear value proposition (what followers get)
4. 1-2 relevant emojis maximum
5. Include a call-to-action or personality hook
6. Make it memorable and scroll-stopping
7. Research current bio trends in this niche

Research the latest Instagram bio best practices and trending formats in the ${niche} niche before writing.

Write a bio that makes someone instantly want to follow.`

  const { text: bio } = await generateText({
    model: "anthropic/claude-sonnet-4.5", // Using simpler working model identifier
    system: `You are an expert Instagram Bio Writer specializing in profile optimization and follower attraction.

Your expertise:
- Writing concise, impactful bios under 150 characters
- Clear value propositions that convert visitors to followers
- Strategic emoji usage (1-2 max - professional and purposeful)
- Current Instagram bio trends and best practices
- Personality-driven copy that builds connection
- CTAs that drive engagement

You have native web search enabled to research:
- Latest Instagram bio trends and templates
- High-converting bio structures in specific niches
- Profile optimization best practices
- Follower attraction strategies

Focus ONLY on bio writing. You do NOT generate image prompts, captions, or design layouts.`,
    prompt: bioPrompt,
    maxOutputTokens: 1000, // Added maxOutputTokens like working examples
    temperature: 0.7,
  })

  console.log("[v0] Caption Writer: Bio created")

  return { bio: bio.trim() }
}
