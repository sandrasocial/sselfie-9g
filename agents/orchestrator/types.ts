import type { IAgent } from "../core/agent-interface"
import type { AgentResult } from "../core/agent-result"
import type { TraceEntry } from "../monitoring/tracer"

/**
 * Pipeline Step
 * Represents a single step in a pipeline workflow
 */
export interface PipelineStep {
  name: string
  agent: IAgent
  run(input: unknown): Promise<unknown>
}

/**
 * Pipeline Result
 * Result of running a pipeline with success/failure handling
 */
export interface PipelineResult {
  ok: boolean
  steps: AgentResult[]
  failedAt?: string
  context?: unknown
  trace: TraceEntry[]
  metrics: {
    calls: Record<string, number>
    errors: Record<string, number>
    durations: Record<string, number[]>
  }
}

/**
 * Coordinator Result
 * Result of coordinating multiple agents with success/failure handling
 */
export interface CoordinatorResult {
  ok: boolean
  results: AgentResult[]
  trace: TraceEntry[]
  metrics: {
    calls: Record<string, number>
    errors: Record<string, number>
    durations: Record<string, number[]>
  }
}

