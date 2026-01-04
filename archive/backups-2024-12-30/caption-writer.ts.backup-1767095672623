import { generateText } from "ai"
import { INSTAGRAM_STRATEGIST_SYSTEM_PROMPT } from "@/lib/instagram-strategist/personality"

interface CaptionWriterParams {
  postPosition: number
  shotType: string
  purpose: string
  emotionalTone: string
  brandProfile: any
  targetAudience: string
  brandVoice: string
  contentPillar?: string
  // Strategy concepts from the feed strategy
  hookConcept?: string
  storyConcept?: string
  valueConcept?: string
  ctaConcept?: string
  hashtags?: string[]
  // Context for uniqueness
  previousCaptions?: Array<{ position: number; hook?: string; caption?: string }>
  researchData?: any
  narrativeRole?: string
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
  const { 
    postPosition, 
    shotType, 
    purpose, 
    emotionalTone, 
    brandProfile, 
    targetAudience, 
    brandVoice, 
    contentPillar,
    hookConcept,
    storyConcept,
    valueConcept,
    ctaConcept,
    hashtags: strategyHashtags,
    previousCaptions = [],
    researchData,
    narrativeRole
  } = params

  console.log(`[v0] Caption Writer: Creating caption for post ${postPosition}`)

  // Extract hooks from previous captions to ensure variety
  const previousHooks = previousCaptions
    .map(pc => {
      if (pc.hook) return pc.hook
      // Extract first line as hook if caption exists
      if (pc.caption) {
        const firstLine = pc.caption.split('\n\n')[0]?.trim() || ''
        return firstLine.substring(0, 100) // Limit length
      }
      return null
    })
    .filter(Boolean)
    .slice(-3) // Only last 3 to avoid token bloat

  const researchContext = researchData
    ? `
## Research Insights (Use These!):
${researchData.research_summary ? `\n**Market Research:**\n${researchData.research_summary}\n` : ""}
${researchData.best_hooks && Array.isArray(researchData.best_hooks) && researchData.best_hooks.length > 0 ? `\n**Trending Hooks to Inspire You (make YOUR OWN version):**\n${researchData.best_hooks.slice(0, 5).join("\n")}\n` : ""}
${researchData.trending_hashtags && Array.isArray(researchData.trending_hashtags) && researchData.trending_hashtags.length > 0 ? `\n**Trending Hashtags:**\n${researchData.trending_hashtags.slice(0, 15).join(", ")}\n` : ""}
`
    : ""

  const strategyConcepts = (hookConcept || storyConcept || valueConcept || ctaConcept)
    ? `
## Strategy Concepts (Use as inspiration, but make it YOUR unique voice):
${hookConcept ? `Hook idea: ${hookConcept}` : ""}
${storyConcept ? `Story idea: ${storyConcept}` : ""}
${valueConcept ? `Value idea: ${valueConcept}` : ""}
${ctaConcept ? `CTA idea: ${ctaConcept}` : ""}

IMPORTANT: Don't copy these word-for-word. Use them as direction and make it sound natural and unique.
`
    : ""

  const previousContext = previousHooks.length > 0
    ? `
## Previous Caption Hooks (MUST BE DIFFERENT):
${previousHooks.map((hook, idx) => `Post ${previousCaptions.length - previousHooks.length + idx + 1}: ${hook}`).join("\n")}

CRITICAL: Your hook MUST be completely different. Rotate hook styles:
- Bold statement (not used yet if previous were questions)
- Question (not used yet if previous were statements)
- Confession/revelation
- Observation/insight
- Numbered list hook
- "Plot twist:" style
`
    : ""

  const captionPrompt = `Create an Instagram caption for post position ${postPosition} of a 9-post feed.

POST CONTEXT:
- Shot Type: ${shotType}
- Purpose: ${purpose}
- Emotional Tone: ${emotionalTone}
- Content Pillar: ${contentPillar || purpose}
- Narrative Role: ${narrativeRole || "general"}
${narrativeRole === "origin" ? "- This is part of the origin/introduction phase (posts 1-3)" : ""}
${narrativeRole === "conflict" ? "- This is part of the journey/challenge phase (posts 4-6)" : ""}
${narrativeRole === "outcome" ? "- This is part of the outcome/invitation phase (posts 7-9)" : ""}

BRAND PROFILE:
${JSON.stringify(brandProfile, null, 2)}

TARGET AUDIENCE: ${targetAudience}
BRAND VOICE: ${brandVoice}

${previousContext}

${strategyConcepts}

${researchContext}

## CRITICAL REQUIREMENTS:

1. **UNIQUE HOOK**: Must be COMPLETELY different from previous hooks. Rotate styles:
   - Post 1-3: Bold statements, questions, origin story hooks
   - Post 4-6: Vulnerability, challenges, "nobody talks about" hooks
   - Post 7-9: Transformation, invitations, community hooks

2. **Hook-Story-Value-CTA structure (MANDATORY)**
   - Hook: 1 line that stops the scroll
   - Story: 2-4 sentences, personal and specific
   - Value: 1-3 sentences with actionable insight
   - CTA: 1 engaging question or action

3. **Authentic Voice**:
   - Write like texting a friend
   - Simple, conversational language
   - NO corporate buzzwords
   - NO "Let's dive in" or "Drop a comment"
   - Sound like a REAL person, not AI

4. **Formatting**:
   - Double line breaks (\\n\\n) between sections
   - 2-4 emojis TOTAL, naturally placed
   - 5-10 strategic hashtags at the end

5. **Length**: 80-150 words (optimal for engagement)

OUTPUT: Only the caption text, ready to post. NO explanations, NO research notes.`

  const { text } = await generateText({
    model: "anthropic/claude-sonnet-4", // Upgraded to Sonnet 4 for better quality and uniqueness
    system: INSTAGRAM_STRATEGIST_SYSTEM_PROMPT,
    prompt: captionPrompt,
    maxOutputTokens: 2000,
    temperature: 0.9, // Higher temperature for more creativity and uniqueness
  })

  let caption = text.trim()

  // Fix escaped newlines - convert literal \n\n to actual newlines
  caption = caption.replace(/\\n/g, '\n')
  
  // Remove any research headers or strategy sections
  if (caption.includes("RESEARCH PHASE") || caption.includes("CAPTION SPECS") || caption.includes("WHY THIS LENGTH")) {
    // Extract the actual caption between research and specs
    const captionStart = caption.indexOf("\n\n") + 2
    const specsStart = caption.indexOf("CAPTION SPECS")
    if (specsStart > -1) {
      caption = caption.substring(captionStart, specsStart).trim()
    }
  }
  
  // Ensure proper double line breaks between sections (normalize to \n\n)
  caption = caption.replace(/\n{3,}/g, '\n\n') // Replace 3+ newlines with double
  caption = caption.replace(/\n\n\n/g, '\n\n') // Replace triple with double

  // Integrate hashtags if provided and not already in caption
  if (strategyHashtags && strategyHashtags.length > 0) {
    const captionHashtags = caption.match(/#\w+/g) || []
    const newHashtags = strategyHashtags
      .map(h => h.replace("#", ""))
      .filter(h => !captionHashtags.some(ch => ch.toLowerCase() === `#${h.toLowerCase()}`))
    
    if (newHashtags.length > 0) {
      // If caption doesn't have hashtags, add them
      if (captionHashtags.length === 0) {
        caption = `${caption}\n\n${newHashtags.map(h => `#${h}`).join(" ")}`
      } else {
        // Append new hashtags
        caption = `${caption} ${newHashtags.map(h => `#${h}`).join(" ")}`
      }
    }
  }

  console.log(`[v0] Caption Writer: Caption created for post ${postPosition} (${caption.length} characters)`)
  const hook = caption.split('\n\n')[0]?.trim() || ''
  console.log(`[v0] Caption Writer: Hook: ${hook.substring(0, 80)}...`)

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
    model: "anthropic/claude-haiku-4.5", // Using claude-haiku-4.5 to avoid AI Gateway contention with Maya
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
