import { PipelineOrchestrator } from "@/agents/orchestrator/pipeline"
import type { PipelineStep } from "@/agents/orchestrator/types"
import { AgentRegistry } from "@/agents/core/agent-registry"

/**
 * Daily Visibility Pipeline
 * Purpose: Generate daily content (reel, caption, stories, layouts) for admin dashboard
 * 
 * Steps:
 * 1. Generate reel
 * 2. Generate caption
 * 3. Generate stories
 * 4. Generate layout ideas
 * 
 * Input: { date?: string, topic?: string }
 */
export function createDailyVisibilityPipeline(input: { date?: string; topic?: string } = {}) {
  const dailyContentAgent = AgentRegistry.get("DailyContentAgent")
  const feedDesignerAgent = AgentRegistry.get("FeedDesignerAgent")

  if (!dailyContentAgent) {
    throw new Error("DailyContentAgent not found in registry")
  }
  if (!feedDesignerAgent) {
    throw new Error("FeedDesignerAgent not found in registry")
  }

  // Safety: Block Maya
  if (dailyContentAgent.getMetadata().name.toLowerCase().includes("maya")) {
    throw new Error("Maya cannot be used in pipelines")
  }

  const topic = input.topic || "personal branding and visibility"

  const steps: PipelineStep[] = [
    {
      name: "generate-reel",
      agent: dailyContentAgent,
      run: async (context) => {
        const result = await dailyContentAgent.process({
          type: "reel",
          topic,
          context: {
            date: input.date || new Date().toISOString().split("T")[0],
            purpose: "daily_content",
          },
        })
        return { ...context, reel: result }
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
          context: {
            date: input.date || new Date().toISOString().split("T")[0],
            purpose: "daily_content",
          },
        })
        return { ...context, caption: result }
      },
    },
    {
      name: "generate-stories",
      agent: dailyContentAgent,
      run: async (context) => {
        const result = await dailyContentAgent.process({
          type: "story",
          context: {
            date: input.date || new Date().toISOString().split("T")[0],
            purpose: "daily_content",
          },
        })
        return { ...context, stories: result }
      },
    },
    {
      name: "generate-layout-ideas",
      agent: feedDesignerAgent,
      run: async (context) => {
        const result = await feedDesignerAgent.process({
          action: "generateLayoutIdeas",
          params: {
            count: 5,
            style: "editorial_luxury",
          },
        })
        return { ...context, layoutIdeas: result }
      },
    },
  ]

  return new PipelineOrchestrator(steps)
}

