import { PipelineOrchestrator } from "@/agents/orchestrator/pipeline"
import type { PipelineStep } from "@/agents/orchestrator/types"
import { AgentRegistry } from "@/agents/core/agent-registry"

/**
 * 7-Day Content Week Pipeline
 * Purpose: Generate a full week of content for a user
 * 
 * Steps:
 * 1. Generate reel
 * 2. Generate story
 * 3. Generate caption
 * 4. Generate feed layout
 * 5. Schedule post
 * 
 * Input: { brandProfile: any, topic?: string }
 */
export function createContentWeekPipeline(input: { brandProfile: any; topic?: string }) {
  const dailyContentAgent = AgentRegistry.get("DailyContentAgent")
  const feedDesignerAgent = AgentRegistry.get("FeedDesignerAgent")
  const autoPostingAgent = AgentRegistry.get("AutoPostingAgent")

  if (!dailyContentAgent) {
    throw new Error("DailyContentAgent not found in registry")
  }
  if (!feedDesignerAgent) {
    throw new Error("FeedDesignerAgent not found in registry")
  }
  if (!autoPostingAgent) {
    throw new Error("AutoPostingAgent not found in registry")
  }

  // Safety: Block Maya
  if (dailyContentAgent.getMetadata().name.toLowerCase().includes("maya")) {
    throw new Error("Maya cannot be used in pipelines")
  }

  const topic = input.topic || "personal branding"

  const steps: PipelineStep[] = [
    {
      name: "generate-reel",
      agent: dailyContentAgent,
      run: async (context) => {
        const result = await dailyContentAgent.process({
          type: "reel",
          topic,
          context: input.brandProfile,
        })
        return { ...context, reel: result }
      },
    },
    {
      name: "generate-story",
      agent: dailyContentAgent,
      run: async (context) => {
        const result = await dailyContentAgent.process({
          type: "story",
          context: input.brandProfile,
        })
        return { ...context, story: result }
      },
    },
    {
      name: "generate-caption",
      agent: dailyContentAgent,
      run: async (context) => {
        const result = await dailyContentAgent.process({
          type: "caption",
          topic,
          contentType: "reel",
          context: input.brandProfile,
        })
        return { ...context, caption: result }
      },
    },
    {
      name: "generate-feed-layout",
      agent: feedDesignerAgent,
      run: async (context) => {
        const result = await feedDesignerAgent.process({
          feedData: {
            layout: {},
            posts: [context.reel, context.story],
            strategy: input.brandProfile,
          },
        })
        return { ...context, feedLayout: result }
      },
    },
    {
      name: "schedule-post",
      agent: autoPostingAgent,
      run: async (context) => {
        const result = await autoPostingAgent.process({
          action: "schedule",
          post: {
            content: context.reel,
            caption: context.caption,
            scheduledFor: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24 hours from now
          },
        })
        return { ...context, scheduledPost: result }
      },
    },
  ]

  return new PipelineOrchestrator(steps)
}

