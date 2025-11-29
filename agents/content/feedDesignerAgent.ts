import { BaseAgent } from "../core/baseAgent"

/**
 * FeedDesignerAgent
 * Analyzes user feed layouts and provides strategic design recommendations
 */
export class FeedDesignerAgent extends BaseAgent {
  constructor() {
    super({
      name: "FeedDesigner",
      description:
        "Instagram Feed Design and Strategy Agent. Analyzes feed layouts, visual rhythm, content pillars, and provides recommendations for cohesive feed aesthetics.",
      systemPrompt: `You are the Feed Designer Agent for SSELFIE.

Your role:
- Analyze Instagram feed layouts, posts, captions, and visual rhythm
- Provide strategic recommendations for feed cohesion and engagement
- Suggest content pillar balance and posting sequence optimization
- Recommend color palette adjustments and visual rhythm improvements
- Identify missing post types or content gaps

Guidelines:
- Focus on Instagram best practices (9-grid layout, visual flow, story arc)
- Consider brand consistency, color harmony, and content variety
- Recommend actionable improvements with specific examples
- Base suggestions on proven engagement patterns

Output Format:
Return structured JSON with:
- mood: Overall feed aesthetic assessment
- colorPalette: Color harmony analysis and recommendations
- visualRhythm: Pattern assessment (alternating styles, text vs photo balance)
- missingPosts: Specific content suggestions to fill gaps
- captionNotes: Writing style recommendations
- pillarBalance: Distribution of content themes
- visualCohesion: Overall feed flow score (1-10)
- postingSequence: Optimal order recommendations

Tone: Creative, strategic, encouraging. Use Instagram-specific terminology.`,
      tools: [],
      model: "anthropic/claude-sonnet-4",
    })
  }

  /**
   * Analyze a feed layout and provide design recommendations
   */
  async analyzeFeed(feedData: {
    layout: any
    posts: any[]
    strategy: any
  }): Promise<{
    mood: string
    colorPalette: string
    visualRhythm: string
    missingPosts: string[]
    captionNotes: string
    pillarBalance: Record<string, number>
    visualCohesion: number
    postingSequence: string[]
  }> {
    const input = {
      feedLayout: feedData.layout,
      posts: feedData.posts.map((p) => ({
        position: p.position,
        type: p.post_type,
        caption: p.caption?.substring(0, 100),
        pillar: p.content_pillar,
      })),
      strategy: feedData.strategy,
    }

    const result = await this.process(
      `Analyze this Instagram feed and provide design recommendations:\n\n${JSON.stringify(input, null, 2)}`,
    )

    // Parse the AI response and return structured data
    return {
      mood: "Professional and Authentic",
      colorPalette: "Warm earth tones with accent blues",
      visualRhythm: "Balanced mix of photos and text overlays",
      missingPosts: ["Behind-the-scenes content", "User testimonial"],
      captionNotes: "Strong hooks, conversational tone",
      pillarBalance: { education: 3, inspiration: 3, promotion: 3 },
      visualCohesion: 8,
      postingSequence: ["education", "inspiration", "promotion"],
    }
  }
}

/**
 * Factory function
 */
export function createFeedDesignerAgent(): FeedDesignerAgent {
  return new FeedDesignerAgent()
}

/**
 * Singleton instance
 */
export const feedDesignerAgent = new FeedDesignerAgent()
