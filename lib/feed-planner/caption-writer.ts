import { generateText } from "ai"
import { INSTAGRAM_STRATEGIST_SYSTEM_PROMPT } from "@/lib/instagram-strategist/personality"
import { createMayaOpenRouterModel } from "@/lib/maya/openrouter"
import { requirePersonalStorySource } from "@/lib/feed-planner/caption-truth"

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
  captionType?: "story" | "value" | "motivational"
  contentPillars?: any[] // All content pillars from brand profile
  /** User-supplied or otherwise verified source for first-person story claims. */
  storySource?: string | null
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

const CAPTION_PLACEHOLDER_MARKERS = ["generating caption", "check out this post! #instagram #feed"]

const PROMPT_LEAK_MARKERS: RegExp[] = [
  /post context[:\s]/i,
  /brand profile[:\s]/i,
  /critical requirements[:\s]/i,
  /research phase[:\s]/i,
  /caption specs[:\s]/i,
  /output[:\s]only the caption/i,
]

// Sandra's locked banned words from the canonical voice sources. A caption containing any of
// these must never ship: it gets flagged for a rewrite pass.
const SANDRA_BANNED_WORD_PATTERNS: RegExp[] = [
  /\bleverage\b/i,
  /\bsynergy\b/i,
  /\btransform(?:s|ed|ing)?\b/i,
  /game.changer/i,
  /\bskyrocket/i,
  /unlock your potential/i,
  /\belevate(?:d)?\b/i,
]

const EM_DASH_PATTERN = /—/

const FIRST_PERSON_CAPTION_PATTERN =
  /\b(?:i|i['’](?:m|ve|d|ll)|my|mine|we|we['’](?:re|ve|d|ll)|us|our|ours)\b/i
const UNSUPPORTED_EXPERIENCE_PATTERN =
  /\b(?:my|our)\s+(?:clients|customers|followers|community)|\b(?:people|clients|customers|followers)\s+(?:always|often|constantly|keep)\s+(?:asking|telling|saying|sharing|mentioning)\b/i

/**
 * A generated caption may use first person only when the member supplied the source.
 * Conversational asks such as "tell me" are not claims and remain available.
 */
export function hasUnverifiedFirstPersonClaim(
  caption: string,
  storySource?: string | null
): boolean {
  const source = String(storySource || "").trim()
  const withoutConversationalAsks = String(caption || "").replace(
    /\b(?:tell|ask|message|dm|send|show|let)\s+me\b/gi,
    ""
  )
  if (!source && FIRST_PERSON_CAPTION_PATTERN.test(withoutConversationalAsks)) return true
  if (
    UNSUPPORTED_EXPERIENCE_PATTERN.test(withoutConversationalAsks) &&
    !UNSUPPORTED_EXPERIENCE_PATTERN.test(source)
  ) {
    return true
  }
  return false
}

/** Reject stale calendar-year filler unless that exact year came from the member's source. */
export function hasOutdatedCaptionYear(
  caption: string,
  storySource?: string | null,
  currentYear = new Date().getFullYear()
): boolean {
  const source = String(storySource || "")
  const years = String(caption || "").match(/\b20\d{2}\b/g) || []
  return years.some(year => Number(year) < currentYear && !source.includes(year))
}

/** True when a caption contains Sandra's banned words or an em-dash. */
export function hasBannedCaptionLanguage(caption: string): boolean {
  const raw = String(caption || "")
  if (EM_DASH_PATTERN.test(raw)) return true
  return SANDRA_BANNED_WORD_PATTERNS.some(pattern => pattern.test(raw))
}

/** Em-dashes never ship (locked voice rule). Normalize to a colon separator. */
function normalizeEmDashes(value: string): string {
  return String(value || "").replace(/\s*—+\s*/g, ": ")
}

function formatBrandContext(brandProfile: any): string {
  if (!brandProfile) return "Personal Brand"
  const lines: string[] = []
  if (brandProfile.business_name || brandProfile.name)
    lines.push(`Brand: ${brandProfile.business_name || brandProfile.name}`)
  if (brandProfile.business_type) lines.push(`Business Type: ${brandProfile.business_type}`)
  if (brandProfile.brand_vibe) lines.push(`Brand Vibe: ${brandProfile.brand_vibe}`)
  if (brandProfile.brand_voice) lines.push(`Brand Voice: ${brandProfile.brand_voice}`)
  if (brandProfile.target_audience) lines.push(`Target Audience: ${brandProfile.target_audience}`)
  if (brandProfile.niche) lines.push(`Niche: ${brandProfile.niche}`)
  if (brandProfile.business_description) lines.push(`About: ${brandProfile.business_description}`)
  if (brandProfile.unique_value_proposition || brandProfile.uvp)
    lines.push(`Unique Value: ${brandProfile.unique_value_proposition || brandProfile.uvp}`)
  return lines.length > 0 ? lines.join("\n") : "Personal Brand"
}

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length
}

function normalizeHashtag(tag: string): string {
  const cleaned = String(tag || "")
    .trim()
    .replace(/^#+/, "")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toLowerCase()
  return cleaned
}

function normalizeSpacing(value: string): string {
  return value
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
}

export function extractHashtagsFromCaption(caption: string): string[] {
  const matches = String(caption || "").match(/#[a-zA-Z0-9_]+/g) || []
  const deduped: string[] = []
  const seen = new Set<string>()

  for (const match of matches) {
    const normalized = normalizeHashtag(match)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    deduped.push(normalized)
  }

  return deduped
}

export function limitHashtags(hashtags: string[], max = 5): string[] {
  const deduped: string[] = []
  const seen = new Set<string>()

  for (const hashtag of hashtags) {
    const normalized = normalizeHashtag(hashtag)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    deduped.push(normalized)
    if (deduped.length >= max) break
  }

  return deduped
}

function stripHashtags(value: string): string {
  return normalizeSpacing(
    String(value || "")
      .replace(/#[a-zA-Z0-9_]+/g, "")
      .replace(/[ \t]+\./g, ".")
  )
}

function removePromptLeakLines(value: string): string {
  return String(value || "")
    .split("\n")
    .filter(line => !PROMPT_LEAK_MARKERS.some(marker => marker.test(line)))
    .join("\n")
}

export function enforceCaptionPublishingRules(input: {
  caption: string
  strategyHashtags?: string[]
}): string {
  const noLeakText = normalizeEmDashes(
    removePromptLeakLines(input.caption || "")
      .replace(/\\n/g, "\n")
      .replace(/\r/g, "")
  )

  const cleanedBody = stripHashtags(noLeakText)
  const strategyTags = Array.isArray(input.strategyHashtags) ? input.strategyHashtags : []
  const combinedTags = limitHashtags(
    [...extractHashtagsFromCaption(noLeakText), ...strategyTags],
    5
  )
  const hashtagLine = combinedTags.map(tag => `#${tag}`).join(" ")

  if (!cleanedBody) {
    return hashtagLine
      ? `Start with one real moment your audience will feel.\n\n${hashtagLine}`
      : "Start with one real moment your audience will feel."
  }

  return hashtagLine ? `${cleanedBody}\n\n${hashtagLine}` : cleanedBody
}

export function shouldRegenerateCaption(caption: string | null | undefined): boolean {
  const raw = String(caption || "").trim()
  if (!raw) return true

  const lowered = raw.toLowerCase()
  if (CAPTION_PLACEHOLDER_MARKERS.some(marker => lowered.includes(marker))) return true
  if (PROMPT_LEAK_MARKERS.some(pattern => pattern.test(raw))) return true
  if (hasBannedCaptionLanguage(raw)) return true

  const hashtags = extractHashtagsFromCaption(raw)
  if (hashtags.length > 5) return true

  const bodyWordCount = countWords(stripHashtags(raw))
  return bodyWordCount < 65
}

export async function generateInstagramCaption(
  params: CaptionWriterParams
): Promise<{ caption: string }> {
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
    captionType = "story",
    contentPillars = [],
    storySource,
  } = params

  const verifiedStorySource = requirePersonalStorySource(captionType, storySource)

  console.log(`[v0] Caption Writer: Creating caption for post ${postPosition}`)

  // Extract hooks from previous captions to ensure variety
  const previousHooks = previousCaptions
    .map(pc => {
      if (pc.hook) return pc.hook
      // Extract first line as hook if caption exists
      if (pc.caption) {
        const firstLine = pc.caption.split("\n\n")[0]?.trim() || ""
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

  const strategyConcepts =
    hookConcept || storyConcept || valueConcept || ctaConcept
      ? `
## Strategy Concepts (Use as inspiration, but make it YOUR unique voice):
${hookConcept ? `Hook idea: ${hookConcept}` : ""}
${storyConcept ? `Story idea: ${storyConcept}` : ""}
${valueConcept ? `Value idea: ${valueConcept}` : ""}
${ctaConcept ? `CTA idea: ${ctaConcept}` : ""}

IMPORTANT: These are creative directions, not factual sources. Never turn them into a personal
story, result, number, customer claim, or event unless the verified story source below supports it.
`
      : ""

  const previousContext =
    previousHooks.length > 0
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
  const contentPillarsContext =
    contentPillars.length > 0
      ? `
## CONTENT PILLARS (Use these strategically):
${contentPillars
  .map(pillar => {
    const name = pillar?.name || pillar || "General"
    const desc = pillar?.description || ""
    return `- **${name}**: ${desc || "Content theme for this brand"}`
  })
  .join("\n")}

Current Post Pillar: **${contentPillar || purpose}**
`
      : ""

  // Build caption type instructions
  const captionTypeInstructions =
    {
      story: `
## CAPTION TYPE: STORY (Personal, Behind-the-Scenes, Journey)
This caption should:
- Retell only the real moment supplied in VERIFIED STORY SOURCE
- Be authentic and vulnerable (real talk, not polished)
- Never add a detail, timeline, quote, result, feeling, or event that is not in that source
- Connect the verified moment to the user's audience without exaggerating it
- Show the "behind the scenes" or "real life" aspect
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
- When no verified personal source exists, teach in neutral or second-person language. Never claim "I use", "I tell clients", or "I see this all the time"
- Examples: "Try this three-step reset...", "3 ways to make this easier...", "One mistake that can make this harder..."
- Focus on VALUE, not the image
`,
      motivational: `
## CAPTION TYPE: MOTIVATIONAL/INSPIRATIONAL (Uplifting, Empowering, Transformation)
This caption should:
- Inspire and uplift the audience
- Share a transformation or success story only when VERIFIED STORY SOURCE contains it
- Without a verified story, use a grounded invitation, observation, or second-person reminder
- Empower with belief and confidence
- Use powerful, emotional language (but still human, not corporate)
- Connect to bigger purpose or vision
- Examples: "You're closer than you think...", "What if I told you...", "This is your sign to..."
- Focus on INSPIRATION and TRANSFORMATION, not the image
`,
    }[captionType] || ""

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
${formatBrandContext(brandProfile)}

TARGET AUDIENCE: ${targetAudience}
BRAND VOICE: ${brandVoice}

${previousContext}

${strategyConcepts}

${researchContext}

## VERIFIED STORY SOURCE
${verifiedStorySource ? verifiedStorySource : "None. Do not write first-person autobiography or imply a personal event happened."}

## CRITICAL REQUIREMENTS (2026 Human-Sounding Research):

0. **TRUTH BEFORE POLISH**:
   - Use only facts present in the brand profile or VERIFIED STORY SOURCE.
   - Never invent personal history, client stories, testimonials, pricing, income, dates, timelines, metrics, quotes, or results.
   - When no story source is supplied, use useful teaching, observation, or second-person guidance. Do not pretend the member experienced something.
   - Do not invent audience circumstances either. Never assume her audience has children, lost sleep, argued at breakfast, bought something, failed at something, or had a specific life event. If an example is not verified, frame it as a possibility with "if" or "maybe".

1. **THE "TEXT A FRIEND" TEST**: Read your caption out loud. If you wouldn't say it to a friend over coffee, rewrite it. That's the whole game.

2. **STRATEGIC CAPTION TYPE (CRITICAL)**: This caption MUST follow the ${captionType.toUpperCase()} type specified above. 
   - This ensures variety across the 9-post feed (not all the same type)
   - Each post serves a different purpose: Story, Value/Tips, or Motivational
   - Use the content pillar "${contentPillar || purpose}" to inform the topic, but keep the ${captionType} format
   - DO NOT mix types - stick to the assigned type for this post

3. **UNIQUE HOOK**: Must be COMPLETELY different from previous hooks. Start with something REAL and SPECIFIC:
   - Story type: A real detail from VERIFIED STORY SOURCE only
   - Value type: Actionable tip, framework, or insight
   - Motivational type: Empowering statement, transformation moment, or invitation
   - ❌ NEVER: "Today I'm excited to share..." or "As a [job title], I believe..."
   - ✅ ALWAYS: Specific, real, and aligned with the caption type

4. **2026 Caption Structure: Hook -> Story/Context -> One Ask**
   - Hook: 1-2 lines that stop the scroll (something real and specific)
   - Story/Context: 2-4 sentences. Use personal specifics only from VERIFIED STORY SOURCE. Otherwise use grounded guidance or context from the brand profile.
   - One Ask: Clear next step (question, CTA, or invitation)

5. **Anti-AI Formula (MANDATORY)**:
   - ✅ Mix up sentence rhythm: Short. Then long. Then something in between.
   - ✅ Use contractions: "I'm" not "I am", "you'll" not "you will", "gonna" not "going to"
   - ✅ Kill AI phrases: NO "unlock the power of", "in today's digital landscape", "dive deep into", "game-changer", "revolutionize", "embark on journey", "delve into"
   - ✅ Sandra's banned words (NEVER use any of these): "leverage", "synergy", "transform", "game-changer", "skyrocket", "unlock your potential", "elevate"
   - ✅ NEVER use the em dash character. Use a period, a colon, or a middle dot instead.
   - ✅ Add tiny imperfections: Start sentences with "And" or "But", use sentence fragments, casual language
   - ✅ Be specific only when the verified source contains that exact specificity

6. **Authentic Voice (Maya's Style)**:
   - Write like texting a friend
   - Simple, everyday language
   - Use "you" to make it a conversation. Use "I", "my", "we", or "our" only when VERIFIED STORY SOURCE supports that exact claim
   - Add emotion only when it fits the verified source
   - Never manufacture doubt, vulnerability, or a confession
   - Use parentheses for conversational asides: (like this)
   - NO corporate buzzwords or jargon
   - NO "Let's dive in" or "Drop a comment"
   - Sound like a REAL person, not AI

7. **Formatting**:
   - Double line breaks (\\n\\n) between sections
   - 0-2 emojis TOTAL, only if they feel natural (never forced, none is fine)
   - Include up to 5 strategic hashtags at the end (MAX 5)

8. **Length**: 90-170 words (optimal for engagement)

9. **The Edit Checklist** (apply before finalizing):
   - Would I text this to my friend? ✓
   - Did I vary my sentence length? ✓
   - Am I using normal words? ✓
   - Does this sound like ME? ✓
   - Is every specific detail either verified or clearly framed as guidance? ✓
   - Did I use contractions? ✓
   - Did I kill all AI phrases? ✓

OUTPUT: Only the caption text, ready to post. NO explanations, NO research notes. Sound like you're texting a friend, not writing a professional post.`

  const { text } = await generateText({
    model: createMayaOpenRouterModel("instagram_caption"),
    system: INSTAGRAM_STRATEGIST_SYSTEM_PROMPT,
    prompt: captionPrompt,
    maxOutputTokens: 2000,
    temperature: 0.6,
  })

  let caption = text.trim()

  // Remove any research headers or strategy sections
  if (
    caption.includes("RESEARCH PHASE") ||
    caption.includes("CAPTION SPECS") ||
    caption.includes("WHY THIS LENGTH")
  ) {
    // Extract the actual caption between research and specs
    const captionStart = caption.indexOf("\n\n") + 2
    const specsStart = caption.indexOf("CAPTION SPECS")
    if (specsStart > -1) {
      caption = caption.substring(captionStart, specsStart).trim()
    }
  }

  caption = enforceCaptionPublishingRules({
    caption,
    strategyHashtags,
  })

  // If output is still too short or unsafe after cleanup, ask for one grounded rewrite pass.
  const bodyWordCount = countWords(stripHashtags(caption))
  if (
    bodyWordCount < 70 ||
    hasBannedCaptionLanguage(caption) ||
    hasUnverifiedFirstPersonClaim(caption, verifiedStorySource) ||
    hasOutdatedCaptionYear(caption, verifiedStorySource)
  ) {
    const { text: revised } = await generateText({
      model: createMayaOpenRouterModel("instagram_caption"),
      system: INSTAGRAM_STRATEGIST_SYSTEM_PROMPT,
      prompt: `Rewrite this caption so it sounds human, story-led, and naturally detailed.

Rules:
- Keep Maya voice (warm, direct, conversational).
- 90-170 words.
- Hook -> story/context -> one ask.
- No prompt notes, no sections, no meta text.
- Maximum 5 hashtags.
- Preserve the factual meaning exactly. Do not add a personal event, number, result, quote, timeline, or detail.
${verifiedStorySource ? `- The only verified personal source is: ${verifiedStorySource}` : "- There is no verified personal story source. Do not write first-person autobiography."}
- Without a verified personal source, do not use I, my, we, or our, and do not claim repeated experience with clients, customers, followers, or an audience.
- Do not invent a child, family detail, sleep problem, breakfast scene, customer conversation, or other plausible life circumstance. Use "if" or "maybe" for an unverified example.
- Do not insert an old calendar year as motivational filler.
- Never use these words: leverage, synergy, transform, game-changer, skyrocket, unlock your potential, elevate.
- Never use the em dash character. Use a period, a colon, or a middle dot instead.

Caption to rewrite:
${caption}`,
      maxOutputTokens: 1200,
      temperature: 0.8,
    })

    caption = enforceCaptionPublishingRules({
      caption: revised,
      strategyHashtags,
    })
  }

  const finalBodyWordCount = countWords(stripHashtags(caption))
  if (
    finalBodyWordCount < 70 ||
    hasBannedCaptionLanguage(caption) ||
    hasUnverifiedFirstPersonClaim(caption, verifiedStorySource) ||
    hasOutdatedCaptionYear(caption, verifiedStorySource)
  ) {
    throw new Error("Caption could not be grounded in the member's verified context")
  }

  console.log(
    `[v0] Caption Writer: Caption created for post ${postPosition} (${caption.length} characters)`
  )
  const hook = caption.split("\n\n")[0]?.trim() || ""
  console.log(`[v0] Caption Writer: Hook: ${hook.substring(0, 80)}...`)

  return { caption }
}

export async function generateInstagramBioCaption(
  params: BioCaptionWriterParams
): Promise<{ bio: string }> {
  const {
    businessType,
    brandVibe,
    brandVoice,
    targetAudience,
    businessGoals,
    researchInsights,
    niche,
  } = params

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
    model: createMayaOpenRouterModel("instagram_bio"),
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
