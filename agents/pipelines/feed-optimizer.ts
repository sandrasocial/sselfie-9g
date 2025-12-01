import { PipelineOrchestrator } from "@/agents/orchestrator/pipeline"
import type { PipelineStep } from "@/agents/orchestrator/types"
import { AgentRegistry } from "@/agents/core/agent-registry"

/**
 * Feed Optimizer Pipeline
 * Purpose: Analyze user feed → generate insights → return improvement actions
 * 
 * Steps:
 * 1. Analyze feed performance
 * 2. Create optimized layout
 * 3. Generate hooks
 * 
 * Input: { userId: string, feedData?: any }
 */
export function createFeedOptimizerPipeline(input: { userId: string; feedData?: any }) {
  const feedPerformanceAgent = AgentRegistry.get("FeedPerformanceAgent")
  const feedDesignerAgent = AgentRegistry.get("FeedDesignerAgent")
  const dailyContentAgent = AgentRegistry.get("DailyContentAgent")

  if (!feedPerformanceAgent) {
    throw new Error("FeedPerformanceAgent not found in registry")
  }
  if (!feedDesignerAgent) {
    throw new Error("FeedDesignerAgent not found in registry")
  }
  if (!dailyContentAgent) {
    throw new Error("DailyContentAgent not found in registry")
  }

  // Safety: Block Maya
  if (feedPerformanceAgent.getMetadata().name.toLowerCase().includes("maya")) {
    throw new Error("Maya cannot be used in pipelines")
  }

  const steps: PipelineStep[] = [
    {
      name: "analyze-feed-performance",
      agent: feedPerformanceAgent,
      run: async (context) => {
        const result = await feedPerformanceAgent.process({
          feedData: input.feedData || {},
        })
        return { ...context, performanceAnalysis: result }
      },
    },
    {
      name: "create-optimized-layout",
      agent: feedDesignerAgent,
      run: async (context) => {
        const result = await feedDesignerAgent.process({
          feedData: {
            layout: {},
            posts: input.feedData?.posts || [],
            strategy: context.performanceAnalysis,
          },
        })
        return { ...context, optimizedLayout: result }
      },
    },
    {
      name: "generate-hooks",
      agent: dailyContentAgent,
      run: async (context) => {
        const hooks = []
        const topics = ["personal branding", "content strategy", "engagement"]

        for (const topic of topics) {
          const hook = await dailyContentAgent.process({
            type: "hook",
            topic,
            framework: "pattern-interrupt",
          })
          hooks.push(hook)
        }

        return {
          ...context,
          hooks,
          insights: {
            performance: context.performanceAnalysis,
            layout: context.optimizedLayout,
            hooks,
          },
        }
      },
    },
  ]

  return new PipelineOrchestrator(steps)
}

