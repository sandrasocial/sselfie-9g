/**
 * Agent Interface
 * Standard interface for all agents in the SSELFIE ecosystem
 */

export interface AgentMetadata {
  name: string
  version?: string
  description?: string
  toolsCount?: number
  model?: string
}

/**
 * Common agent input patterns
 */
export interface AgentInputWithAction {
  action: string
  params?: unknown
  [key: string]: unknown
}

export interface AgentInputWithType {
  type: string
  topic?: string
  context?: unknown
  [key: string]: unknown
}

import type { AgentResult } from "./agent-result"

/**
 * Standard agent interface
 */
export interface IAgent {
  /**
   * Process input and return output wrapped in AgentResult
   * @param input - Agent input (can be string, object, or structured input)
   * @returns Promise resolving to AgentResult (success or failure)
   */
  process(input: unknown): Promise<AgentResult>
  /**
   * Internal run method - returns raw data (agents should override)
   * @param input - Agent input
   * @returns Promise resolving to raw output
   */
  run?(input: unknown): Promise<unknown>
  /**
   * Optional streaming interface
   * @param input - Agent input
   * @returns AsyncIterable of output chunks
   */
  stream?(input: unknown): AsyncIterable<unknown>
  /**
   * Get agent metadata
   * @returns Agent metadata object
   */
  getMetadata(): AgentMetadata
}

