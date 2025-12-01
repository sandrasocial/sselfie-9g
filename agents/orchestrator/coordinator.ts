import type { IAgent } from "../core/agent-interface"
import type { CoordinatorResult } from "./types"
import type { AgentResult } from "../core/agent-result"
import { isSuccess } from "../core/agent-result"
import { trace } from "../monitoring/tracer"
import { recordAgentCall, recordAgentError, recordAgentDuration } from "../monitoring/metrics"
import { getRecentTraces } from "../monitoring/tracer"
import { getAllMetrics } from "../monitoring/metrics"

/**
 * AgentCoordinator
 * Coordinates multiple agents to work together
 * Handles agent selection, context passing, fallbacks, and retries
 * Returns AgentResult for each agent
 */
export class AgentCoordinator {
  constructor(private agents: IAgent[]) {}

  /**
   * Execute all agents with the given input
   * Returns AgentResult for each agent (continues even if some fail)
   */
  async execute(input: unknown): Promise<CoordinatorResult> {
    const results: AgentResult[] = []

    for (const agent of this.agents) {
      const agentName = agent.getMetadata().name
      const startTime = Date.now()

      // Trace and record agent call
      trace(agentName, "start", { input })
      recordAgentCall(agentName)

      // Process agent (returns AgentResult)
      const result = await agent.process(input)
      const duration = Date.now() - startTime

      results.push(result)

      if (isSuccess(result)) {
        // Trace success and record duration
        trace(agentName, "complete", { output: result.data, duration })
        recordAgentDuration(agentName, duration)
      } else {
        // Trace error and record error metric
        trace(agentName, "error", { error: result.error.message, duration })
        recordAgentError(agentName)
      }
    }

    // Determine overall success (all agents succeeded)
    const ok = results.every((r) => isSuccess(r))

    // Get traces and metrics
    const recentTraces = getRecentTraces(50)
    const allMetrics = getAllMetrics()

    return {
      ok,
      results,
      trace: recentTraces,
      metrics: allMetrics,
    }
  }

  /**
   * Execute a specific agent by name
   * Returns AgentResult
   */
  async executeAgent(agentName: string, input: unknown): Promise<AgentResult> {
    const agent = this.agents.find((a) => a.getMetadata().name === agentName)

    if (!agent) {
      const { failure } = await import("../core/agent-result")
      return failure("AgentCoordinator", new Error(`Agent not found: ${agentName}`))
    }

    const startTime = Date.now()

    // Trace and record agent call
    trace(agentName, "start", { input })
    recordAgentCall(agentName)

    // Process agent (returns AgentResult)
    const result = await agent.process(input)
    const duration = Date.now() - startTime

    if (isSuccess(result)) {
      // Trace success and record duration
      trace(agentName, "complete", { output: result.data, duration })
      recordAgentDuration(agentName, duration)
    } else {
      // Trace error and record error metric
      trace(agentName, "error", { error: result.error.message, duration })
      recordAgentError(agentName)
    }

    return result
  }

  /**
   * Get coordinator metadata
   */
  getMetadata() {
    return {
      name: "AgentCoordinator",
      version: "1.0.0",
      description: "Coordinates multiple agents to work together",
      agentCount: this.agents.length,
      agents: this.agents.map((agent) => agent.getMetadata().name),
    }
  }
}

