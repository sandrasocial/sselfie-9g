/**
 * Agent Metrics Collector
 * Tracks agent performance metrics in-memory
 */

export const AgentMetrics = {
  calls: {} as Record<string, number>,
  errors: {} as Record<string, number>,
  durations: {} as Record<string, number[]>,
}

/**
 * Record an agent call
 */
export function recordAgentCall(agentName: string): void {
  AgentMetrics.calls[agentName] = (AgentMetrics.calls[agentName] || 0) + 1
}

/**
 * Record an agent error
 */
export function recordAgentError(agentName: string): void {
  AgentMetrics.errors[agentName] = (AgentMetrics.errors[agentName] || 0) + 1
}

/**
 * Record agent execution duration
 */
export function recordAgentDuration(agentName: string, duration: number): void {
  if (!AgentMetrics.durations[agentName]) {
    AgentMetrics.durations[agentName] = []
  }
  AgentMetrics.durations[agentName].push(duration)
}

/**
 * Get metrics for a specific agent
 */
export function getAgentMetrics(agentName: string) {
  return {
    calls: AgentMetrics.calls[agentName] || 0,
    errors: AgentMetrics.errors[agentName] || 0,
    durations: AgentMetrics.durations[agentName] || [],
    averageDuration:
      AgentMetrics.durations[agentName] && AgentMetrics.durations[agentName].length > 0
        ? AgentMetrics.durations[agentName].reduce((a, b) => a + b, 0) /
          AgentMetrics.durations[agentName].length
        : 0,
  }
}

/**
 * Get all metrics
 */
export function getAllMetrics() {
  return {
    calls: { ...AgentMetrics.calls },
    errors: { ...AgentMetrics.errors },
    durations: { ...AgentMetrics.durations },
  }
}

/**
 * Reset all metrics
 */
export function resetMetrics(): void {
  AgentMetrics.calls = {}
  AgentMetrics.errors = {}
  AgentMetrics.durations = {}
}

