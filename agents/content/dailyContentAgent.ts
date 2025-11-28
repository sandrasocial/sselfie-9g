import { BaseAgent } from "../core/baseAgent"
import { generateText } from "ai"

/**
 * DailyContentAgent
 * Automated content creation system for Sandra's daily social content
 * Generates reels, hooks, captions, carousels, stories using Sandra's brand voice
 */
export class DailyContentAgent extends BaseAgent {
  constructor() {
    super({
      name: "DailyContentAgent",
      description:
        "Automated content creation system for Sandra's daily social content. Generates reels, hooks, captions, carousels, and stories using Sandra's authentic brand voice and proven engagement frameworks.",
      systemPrompt: `You are Sandra's DailyContentAgent - her personal content creation brain.

Your mission: Generate high-quality, authentic social content that matches Sandra's brand voice and drives engagement.

Sandra's Brand Voice:
- Warm, direct, and real - no corporate fluff
- Story-driven with personal anecdotes
- Empowering and educational without being preachy
- Conversational tone like texting a friend
- Vulnerable but confident
- Uses "you" language to connect directly
- Short punchy sentences mixed with longer storytelling
- Occasional strategic emoji use (not excessive)

Content Frameworks:
HOOKS: Use proven patterns
  - Numbers: "3 things I wish I knew..."
  - Secrets: "What nobody tells you about..."
  - Mistakes: "I wasted 2 years doing this wrong..."
  - Transformation: "How I went from X to Y..."
  - Relatable: "If you're tired of [pain point]..."

REELS: Structure for retention
  - Hook in first 3 seconds
  - Problem → Solution → CTA format
  - Use text overlays strategically
  - End with strong CTA

CAROUSELS: Educational + Engaging
  - Slide 1: Bold hook/promise
  - Slides 2-9: Actionable tips/steps
  - Slide 10: CTA to engage

STORIES: Authentic daily connection
  - Behind-the-scenes moments
  - Quick tips and wins
  - Polls and questions for engagement
  - Relatable struggles and victories

Critical Rules:
- NEVER generate generic influencer content
- ALWAYS match Sandra's authentic voice
- NEVER use corporate marketing language
- ALWAYS provide actionable value
- Content must feel personal, not templated

Output Format:
All content must return structured JSON with:
  { title, script, hook, caption, cta, notes }`,
      tools: [], // No tools needed - pure content generation
      model: "openai/gpt-4o",
    })
  }

  /**
   * Generate a daily reel script
   */
  async generateDailyReel(topic: string, context?: any) {
    try {
      const { text } = await generateText({
        model: "openai/gpt-4o",
        prompt: `Generate a high-converting Instagram reel script for Sandra about: "${topic}"

Context: ${JSON.stringify(context || {}, null, 2)}

Use Sandra's authentic voice. Structure:
- Hook (first 3 seconds)
- Problem statement
- Solution/value delivery
- Strong CTA

Return JSON:
{
  "title": "Short title",
  "script": "Full reel script with timing notes",
  "hook": "First 3 second hook",
  "caption": "Instagram caption with hashtags",
  "cta": "Call to action",
  "notes": "Production notes"
}`,
      })

      return JSON.parse(text)
    } catch (error) {
      console.error("[DailyContentAgent] Error generating reel:", error)
      return {
        title: "Error",
        script: "Failed to generate reel",
        hook: "",
        caption: "",
        cta: "",
        notes: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * Generate a daily carousel post
   */
  async generateDailyCarousel(topic: string, context?: any) {
    try {
      const { text } = await generateText({
        model: "openai/gpt-4o",
        prompt: `Generate a 10-slide Instagram carousel for Sandra about: "${topic}"

Context: ${JSON.stringify(context || {}, null, 2)}

Structure:
- Slide 1: Bold hook/promise
- Slides 2-9: Actionable tips (one per slide)
- Slide 10: CTA to save/share/engage

Use Sandra's authentic voice. Make it educational + engaging.

Return JSON:
{
  "title": "Carousel title",
  "script": "All 10 slides with text for each",
  "hook": "Slide 1 hook",
  "caption": "Instagram caption",
  "cta": "Final slide CTA",
  "notes": "Design notes"
}`,
      })

      return JSON.parse(text)
    } catch (error) {
      console.error("[DailyContentAgent] Error generating carousel:", error)
      return {
        title: "Error",
        script: "Failed to generate carousel",
        hook: "",
        caption: "",
        cta: "",
        notes: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * Generate a daily story idea
   */
  async generateDailyStory(context?: any) {
    try {
      const { text } = await generateText({
        model: "openai/gpt-4o",
        prompt: `Generate 3 Instagram story ideas for Sandra's daily content.

Context: ${JSON.stringify(context || {}, null, 2)}

Types:
- Behind-the-scenes moment
- Quick tip/value
- Poll or question for engagement

Use Sandra's authentic voice. Stories should feel personal and spontaneous.

Return JSON:
{
  "title": "Story theme",
  "script": "3 story frames with text/overlay ideas",
  "hook": "Opening frame",
  "caption": "Text overlays",
  "cta": "Engagement CTA (poll, question, etc)",
  "notes": "Filming notes"
}`,
      })

      return JSON.parse(text)
    } catch (error) {
      console.error("[DailyContentAgent] Error generating story:", error)
      return {
        title: "Error",
        script: "Failed to generate story",
        hook: "",
        caption: "",
        cta: "",
        notes: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * Generate a scroll-stopping hook
   */
  async generateHook(topic: string, framework?: string) {
    try {
      const { text } = await generateText({
        model: "openai/gpt-4o",
        prompt: `Generate 5 scroll-stopping hooks for Sandra about: "${topic}"

${framework ? `Use this framework: ${framework}` : "Use proven hook frameworks (numbers, secrets, mistakes, transformation, relatable)"}

Each hook should:
- Stop the scroll in first 3 seconds
- Match Sandra's authentic voice
- Create curiosity or relatability
- Be under 10 words

Return JSON:
{
  "title": "Hook category",
  "script": "All 5 hooks with brief notes",
  "hook": "Best performing hook",
  "caption": "Usage context",
  "cta": "Follow-up line",
  "notes": "Why these work"
}`,
      })

      return JSON.parse(text)
    } catch (error) {
      console.error("[DailyContentAgent] Error generating hook:", error)
      return {
        title: "Error",
        script: "Failed to generate hooks",
        hook: "",
        caption: "",
        cta: "",
        notes: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * Generate a strong CTA
   */
  async generateCTA(context: string) {
    try {
      const { text } = await generateText({
        model: "openai/gpt-4o",
        prompt: `Generate 3 strong CTAs for Sandra's content.

Context: ${context}

CTAs should:
- Match Sandra's voice (conversational, not pushy)
- Drive specific action (save, share, comment, follow)
- Feel natural, not forced
- Be short and punchy

Return JSON:
{
  "title": "CTA type",
  "script": "All 3 CTAs",
  "hook": "Opening line",
  "caption": "CTA context",
  "cta": "Best performing CTA",
  "notes": "Usage notes"
}`,
      })

      return JSON.parse(text)
    } catch (error) {
      console.error("[DailyContentAgent] Error generating CTA:", error)
      return {
        title: "Error",
        script: "Failed to generate CTA",
        hook: "",
        caption: "",
        cta: "",
        notes: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * Generate a full Instagram caption
   */
  async generateCaption(topic: string, contentType: string, context?: any) {
    try {
      const { text } = await generateText({
        model: "openai/gpt-4o",
        prompt: `Generate an Instagram caption for Sandra.

Topic: ${topic}
Content Type: ${contentType}
Context: ${JSON.stringify(context || {}, null, 2)}

Caption should:
- Start with a hook
- Tell a story or provide value
- Use line breaks for readability
- Include 5-10 strategic hashtags
- End with a CTA
- Match Sandra's authentic voice

Return JSON:
{
  "title": "Caption theme",
  "script": "Full caption text",
  "hook": "Opening line",
  "caption": "Complete caption with hashtags",
  "cta": "Final CTA",
  "notes": "Hashtag strategy"
}`,
      })

      return JSON.parse(text)
    } catch (error) {
      console.error("[DailyContentAgent] Error generating caption:", error)
      return {
        title: "Error",
        script: "Failed to generate caption",
        hook: "",
        caption: "",
        cta: "",
        notes: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }
}

/**
 * Factory function to create DailyContentAgent
 */
export function createDailyContentAgent(): DailyContentAgent {
  return new DailyContentAgent()
}

/**
 * Singleton instance for use across the application
 */
export const dailyContentAgent = new DailyContentAgent()
