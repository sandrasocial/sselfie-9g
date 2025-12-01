/**
 * Agent Execution Tracer
 * Tracks agent execution traces for observability
 */

export interface TraceEntry {
  timestamp: number
  agent: string
  event: string
  data?: any
}

/**
 * In-memory trace log
 */
export const AgentTrace: TraceEntry[] = []

/**
 * Maximum trace entries to keep (prevent memory leaks)
 */
const MAX_TRACE_ENTRIES = 10000

/**
 * Add a trace entry
 */
export function trace(agent: string, event: string, data?: any): void {
  AgentTrace.push({
    timestamp: Date.now(),
    agent,
    event,
    data,
  })

  // Prevent memory leaks by limiting trace size
  if (AgentTrace.length > MAX_TRACE_ENTRIES) {
    AgentTrace.shift() // Remove oldest entry
  }
}

/**
 * Get traces for a specific agent
 */
export function getAgentTraces(agentName: string): TraceEntry[] {
  return AgentTrace.filter((entry) => entry.agent === agentName)
}

/**
 * Get recent traces (last N entries)
 */
export function getRecentTraces(count: number = 100): TraceEntry[] {
  return AgentTrace.slice(-count)
}

/**
 * Get traces within a time range
 */
export function getTracesInRange(startTime: number, endTime: number): TraceEntry[] {
  return AgentTrace.filter((entry) => entry.timestamp >= startTime && entry.timestamp <= endTime)
}

/**
 * Clear all traces
 */
export function clearTraces(): void {
  AgentTrace.length = 0
}

