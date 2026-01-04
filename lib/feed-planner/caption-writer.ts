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
  // Strategic caption type for variety
  captionType?: 'story' | 'value' | 'motivational'
  contentPillars?: any[] // All content pillars from brand profile
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
    narrativeRole,
    captionType = 'story',
    contentPillars = []
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

  // Build content pillars context
  const contentPillarsContext = contentPillars.length > 0
    ? `
## CONTENT PILLARS (Use these strategically):
${contentPillars.map((pillar, idx) => {
      const name = pillar?.name || pillar || 'General'
      const desc = pillar?.description || ''
      return `- **${name}**: ${desc || 'Content theme for this brand'}`
    }).join('\n')}

Current Post Pillar: **${contentPillar || purpose}**
`
    : ''

  // Build caption type instructions
  const captionTypeInstructions = {
    story: `
## CAPTION TYPE: STORY (Personal, Behind-the-Scenes, Journey)
This caption should:
- Share a personal story, moment, or experience
- Be authentic and vulnerable (real talk, not polished)
- Connect to the user's journey or transformation
- Use specific details and moments (not generic)
- Show the "behind the scenes" or "real life" aspect
- Examples: "Three years ago I couldn't afford...", "Took this at 6am before coffee...", "Nobody talks about how..."
- Focus on the PERSON, not the image
`,
    value: `
## CAPTION TYPE: VALUE/TIPS (Educational, Actionable, Helpful)
This caption should:
- Provide actionable tips, strategies, or insights
- Teach something valuable to the audience
- Be specific and practical (not vague advice)
- Use examples, frameworks, or step-by-step guidance
- Help the audience solve a problem or achieve a goal
- Examples: "Here's the exact framework I use...", "3 things that changed everything...", "The mistake I see most people make..."
- Focus on VALUE, not the image
`,
    motivational: `
## CAPTION TYPE: MOTIVATIONAL/INSPIRATIONAL (Uplifting, Empowering, Transformation)
This caption should:
- Inspire and uplift the audience
- Share transformation or success stories
- Empower with belief and confidence
- Use powerful, emotional language (but still human, not corporate)
- Connect to bigger purpose or vision
- Examples: "You're closer than you think...", "What if I told you...", "This is your sign to..."
- Focus on INSPIRATION and TRANSFORMATION, not the image
`,
  }[captionType] || ''

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

${captionTypeInstructions}

${contentPillarsContext}

BRAND PROFILE:
${JSON.stringify(brandProfile, null, 2)}

TARGET AUDIENCE: ${targetAudience}
BRAND VOICE: ${brandVoice}

${previousContext}

${strategyConcepts}

${researchContext}

## CRITICAL REQUIREMENTS (2025 Human-Sounding Research):

1. **THE "TEXT A FRIEND" TEST**: Read your caption out loud. If you wouldn't say it to a friend over coffee, rewrite it. That's the whole game.

2. **STRATEGIC CAPTION TYPE (CRITICAL)**: This caption MUST follow the ${captionType.toUpperCase()} type specified above. 
   - This ensures variety across the 9-post feed (not all the same type)
   - Each post serves a different purpose: Story, Value/Tips, or Motivational
   - Use the content pillar "${contentPillar || purpose}" to inform the topic, but keep the ${captionType} format
   - DO NOT mix types - stick to the assigned type for this post

3. **UNIQUE HOOK**: Must be COMPLETELY different from previous hooks. Start with something REAL and SPECIFIC:
   - Story type: Personal moments, specific details, behind-the-scenes
   - Value type: Actionable tip, framework, or insight
   - Motivational type: Empowering statement, transformation moment, or invitation
   - ❌ NEVER: "Today I'm excited to share..." or "As a [job title], I believe..."
   - ✅ ALWAYS: Specific, real, and aligned with the caption type

3. **2025 Caption Structure: Hook → Story/Context → One Ask**
   - Hook: 1-2 lines that stop the scroll (something real and specific)
   - Story/Context: 2-4 sentences, personal and specific (what happened, why it matters)
   - One Ask: Clear next step (question, CTA, or invitation)

4. **Anti-AI Formula (MANDATORY)**:
   - ✅ Mix up sentence rhythm: Short. Then long. Then something in between.
   - ✅ Use contractions: "I'm" not "I am", "you'll" not "you will", "gonna" not "going to"
   - ✅ Kill AI phrases: NO "unlock the power of", "in today's digital landscape", "dive deep into", "game-changer", "revolutionize", "embark on journey", "delve into"
   - ✅ Add tiny imperfections: Start sentences with "And" or "But", use sentence fragments, casual language
   - ✅ Be specific: "6am" not "early morning", "$5k" not "expensive", "47 minutes" not "a while"

5. **Authentic Voice (Maya's Style)**:
   - Write like texting a friend
   - Simple, everyday language
   - Use "you" and "I" - make it a conversation
   - Add emotion: "honestly," "real talk," "not gonna lie"
   - Include doubt/vulnerability: "I'm still figuring this out but..."
   - Use parentheses for conversational asides: (like this)
   - NO corporate buzzwords or jargon
   - NO "Let's dive in" or "Drop a comment"
   - Sound like a REAL person, not AI

6. **Formatting**:
   - Double line breaks (\\n\\n) between sections
   - 2-3 emojis TOTAL, naturally placed (max 3)
   - 5-10 strategic hashtags at the end

7. **Length**: 80-150 words (optimal for engagement)

8. **The Edit Checklist** (apply before finalizing):
   - Would I text this to my friend? ✓
   - Did I vary my sentence length? ✓
   - Am I using normal words? ✓
   - Does this sound like ME? ✓
   - Is there a specific detail/story? ✓
   - Did I use contractions? ✓
   - Did I kill all AI phrases? ✓

OUTPUT: Only the caption text, ready to post. NO explanations, NO research notes. Sound like you're texting a friend, not writing a professional post.`

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
